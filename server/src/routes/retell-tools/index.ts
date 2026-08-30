import { Router, Request, Response } from 'express';
import { verify as retellVerify } from 'retell-sdk';
import { z } from 'zod';
import { supabase } from '../../services/supabase';
import { logEvent, requestId } from '../../lib/observability';
import {
  bookingErrorDetails,
  createBookingForClient,
  getClientAvailability,
  loadBookingContextByAgentId,
} from '../../services/booking';

const router = Router();

interface RetellToolEnvelope<TArgs> {
  name?: string;
  call?: {
    agent_id?: string;
    call_id?: string;
    from_number?: string;
  };
  args?: TArgs;
}

/**
 * Verify a Retell custom-function call.
 *
 * Retell signs these exactly as it signs webhooks: the `X-Retell-Signature`
 * header is `v={unix_ms},d={HMAC-SHA256(rawBody + timestamp, apiKey)}`, with a
 * five-minute replay window enforced inside the SDK's verify().
 *
 * This used to compute a plain `HMAC-SHA256(rawBody)` and compare it to the raw
 * header — the same mistake BUG-002a fixed in the webhook route on 2026-06-10
 * (`4233cf1`). The webhook route was corrected; this one was never touched, so
 * the bug survived here. A real header is 82 characters and our digest is 64, so
 * the length guard rejected every request before comparing anything: **every
 * mid-call check_calendar_availability and create_calendar_booking returned 401
 * from 2026-05-21 until 2026-08-30.** The agent could never read the diary or
 * book a job. Confirmed against production by signing a probe with the SDK.
 *
 * Never hand-roll this. Use the SDK so the two stay in agreement across
 * upgrades.
 */
async function verifySignature(rawBody: Buffer, signature: string): Promise<boolean> {
  const secret = (process.env.RETELL_API_KEY ?? '').trim();
  if (!secret) return false;

  try {
    return await retellVerify(rawBody.toString('utf8'), secret, signature.trim());
  } catch {
    return false;
  }
}

async function readEnvelope<TArgs>(
  req: Request,
  res: Response,
): Promise<RetellToolEnvelope<TArgs> | null> {
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-retell-signature'];

  if (!(rawBody instanceof Buffer)
      || typeof signature !== 'string'
      || !(await verifySignature(rawBody, signature))) {
    // Error-level: a rejection here is the agent being unable to use the diary
    // mid-call, which is silent to us and looks to the caller like the
    // receptionist simply cannot book.
    logEvent('error', 'retell_tools.invalid_signature', {
      requestId: requestId(req),
      path: req.path,
      hasSignature: typeof signature === 'string',
    });
    res.status(401).json({ success: false, error: 'Invalid Retell signature' });
    return null;
  }

  try {
    return JSON.parse(rawBody.toString('utf8')) as RetellToolEnvelope<TArgs>;
  } catch {
    res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    return null;
  }
}

function spokenTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const availabilityArgsSchema = z.object({
  requested_date: z.string().trim().optional(),
  time_preference: z.enum(['any', 'morning', 'afternoon']).optional(),
  duration_mins: z.number().int().min(15).max(240).optional(),
});

const createBookingArgsSchema = z.object({
  start_time_iso: z.string().datetime(),
  customer_name: z.string().trim().min(1),
  caller_number: z.string().trim().optional(),
  caller_email: z.string().email().optional(),
  job_type: z.string().trim().min(1),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  confirmation_channel: z.enum(['sms', 'email', 'both', 'none']).optional(),
  duration_mins: z.number().int().min(15).max(240).optional(),
});

router.post('/check-availability', async (req: Request, res: Response) => {
  const envelope = await readEnvelope<unknown>(req, res);
  if (!envelope) return;

  const parsed = availabilityArgsSchema.safeParse(envelope.args ?? {});
  if (!parsed.success) {
    res.json({
      success: false,
      error: 'I could not understand the requested date or time preference for that availability check.',
    });
    return;
  }

  const agentId = envelope.call?.agent_id;
  if (!agentId) {
    res.json({ success: false, error: 'The call context was missing an agent ID.' });
    return;
  }

  const context = await loadBookingContextByAgentId(agentId);
  if (!context) {
    res.json({ success: false, error: 'I could not find the business diary for this call.' });
    return;
  }

  try {
    const slots = await getClientAvailability(context, {
      requestedDate: parsed.data.requested_date ?? null,
      period: parsed.data.time_preference ?? 'any',
      durationMins: parsed.data.duration_mins ?? 60,
      days: 7,
      maxSlots: 5,
    });

    if (slots.length === 0) {
      res.json({
        success: false,
        message: 'No suitable diary slots were available in the requested window.',
        slots: [],
      });
      return;
    }

    res.json({
      success: true,
      timezone: context.config.timezone,
      slots: slots.map((slot) => ({
        slot_iso: slot.toISOString(),
        spoken_time: spokenTime(slot.toISOString(), context.config.timezone),
      })),
      message: `I found ${slots.length} available slot${slots.length === 1 ? '' : 's'} in the diary.`,
    });
  } catch (error: unknown) {
    const details = bookingErrorDetails(error);
    res.json({ success: false, error: details.message });
  }
});

router.post('/create-booking', async (req: Request, res: Response) => {
  const envelope = await readEnvelope<unknown>(req, res);
  if (!envelope) return;

  const parsed = createBookingArgsSchema.safeParse(envelope.args ?? {});
  if (!parsed.success) {
    res.json({
      success: false,
      error: 'I could not create the booking because some key details were missing.',
    });
    return;
  }

  const agentId = envelope.call?.agent_id;
  if (!agentId) {
    res.json({ success: false, error: 'The call context was missing an agent ID.' });
    return;
  }

  const context = await loadBookingContextByAgentId(agentId);
  if (!context) {
    res.json({ success: false, error: 'I could not find the business diary for this call.' });
    return;
  }

  const { data: callRow } = envelope.call?.call_id
    ? await supabase
        .from('calls')
        .select('id')
        .eq('retell_call_id', envelope.call.call_id)
        .maybeSingle()
    : { data: null };

  try {
    const result = await createBookingForClient(context, {
      scheduledAt: parsed.data.start_time_iso,
      durationMins: parsed.data.duration_mins ?? 60,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      callId: callRow?.id ?? null,
      customerName: parsed.data.customer_name,
      callerNumber: parsed.data.caller_number ?? envelope.call?.from_number ?? null,
      callerEmail: parsed.data.caller_email ?? null,
      jobType: parsed.data.job_type,
      confirmationChannel: parsed.data.confirmation_channel ?? 'auto',
    });

    res.json({
      success: true,
      booking: {
        scheduled_at: result.booking.scheduled_at,
        spoken_time: spokenTime(result.booking.scheduled_at, context.config.timezone),
      },
      confirmation_summary: result.confirmationSummary,
      message: `Booking saved for ${spokenTime(result.booking.scheduled_at, context.config.timezone)}. ${result.confirmationSummary}`,
    });
  } catch (error: unknown) {
    const details = bookingErrorDetails(error);
    const message = error instanceof Error ? error.message : details.message;
    res.json({ success: false, error: message });
  }
});

export default router;
