import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type {
  ApiResponse,
  Booking,
} from '../../../../shared/types';
import { supabase } from '../../services/supabase';
import {
  bookingErrorDetails,
  createBookingForClient,
  getClientAvailability,
  loadBookingContextByOwnerEmail,
  loadLead,
} from '../../services/booking';

const router = Router();

function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

async function getOwnerEmail(req: Request, res: Response): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return null;
  }

  const { data: authData, error } = await supabase.auth.getUser(token);
  const ownerEmail = authData.user?.email;

  if (error || !ownerEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return null;
  }

  return ownerEmail;
}

const availabilityQuerySchema = z.object({
  leadId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(14).optional(),
  durationMins: z.coerce.number().int().min(15).max(240).optional(),
  maxSlots: z.coerce.number().int().min(1).max(16).optional(),
});

const createBookingSchema = z.object({
  leadId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMins: z.number().int().min(15).max(240).optional(),
  address: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const ownerEmail = await getOwnerEmail(req, res);
  if (!ownerEmail) return;

  const context = await loadBookingContextByOwnerEmail(ownerEmail);
  if (!context) {
    res.status(404).json({ success: false, error: 'Client setup not found' } satisfies ApiResponse);
    return;
  }

  const leadId = typeof req.query.leadId === 'string' ? req.query.leadId : null;

  let query = supabase
    .from('bookings')
    .select('*')
    .eq('client_id', context.client.id)
    .order('scheduled_at', { ascending: true })
    .limit(200);

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ success: false, error: error.message } satisfies ApiResponse);
    return;
  }

  res.json({ success: true, data: (data ?? []) as Booking[] } satisfies ApiResponse<Booking[]>);
});

router.get('/availability', async (req: Request, res: Response) => {
  const parsed = availabilityQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const ownerEmail = await getOwnerEmail(req, res);
  if (!ownerEmail) return;

  const context = await loadBookingContextByOwnerEmail(ownerEmail);
  if (!context) {
    res.status(404).json({ success: false, error: 'Client setup not found' } satisfies ApiResponse);
    return;
  }

  const { client, config } = context;
  const lead = await loadLead(parsed.data.leadId, client.id);
  if (!lead) {
    res.status(404).json({ success: false, error: 'Lead not found' } satisfies ApiResponse);
    return;
  }

  try {
    const slots = await getClientAvailability(context, {
      durationMins: parsed.data.durationMins ?? 60,
      days: parsed.data.days ?? 7,
      maxSlots: parsed.data.maxSlots ?? 10,
      requestedDate: null,
      period: 'any',
    });

    res.json({
      success: true,
      data: {
        lead,
        durationMins: parsed.data.durationMins ?? 60,
        timezone: config.timezone,
        slots: slots.map((slot) => slot.toISOString()),
      },
    } satisfies ApiResponse);
  } catch (error: unknown) {
    const calendarError = bookingErrorDetails(error);
    res.status(calendarError.status).json({
      success: false,
      error: calendarError.message,
    } satisfies ApiResponse);
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const ownerEmail = await getOwnerEmail(req, res);
  if (!ownerEmail) return;

  const context = await loadBookingContextByOwnerEmail(ownerEmail);
  if (!context) {
    res.status(404).json({ success: false, error: 'Client setup not found' } satisfies ApiResponse);
    return;
  }

  const { client } = context;
  const lead = await loadLead(parsed.data.leadId, client.id);
  if (!lead) {
    res.status(404).json({ success: false, error: 'Lead not found' } satisfies ApiResponse);
    return;
  }

  try {
    const result = await createBookingForClient(context, {
      scheduledAt: parsed.data.scheduledAt,
      durationMins: parsed.data.durationMins ?? 60,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      lead,
      confirmationChannel: 'auto',
    });

    res.status(201).json({
      success: true,
      data: result.booking,
      meta: {
        total: 1,
        page: 1,
        limit: 1,
      },
    } satisfies ApiResponse<Booking>);
  } catch (error: unknown) {
    const calendarError = bookingErrorDetails(error);
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage === 'scheduledAt must be a valid ISO datetime') {
      res.status(400).json({ success: false, error: errorMessage } satisfies ApiResponse);
      return;
    }

    if (
      errorMessage === 'This lead already has a scheduled booking.'
      || errorMessage === 'That slot has already been taken. Please choose another one.'
      || errorMessage === 'That slot is no longer available. Please refresh the diary slots and pick another time.'
    ) {
      res.status(409).json({ success: false, error: errorMessage } satisfies ApiResponse);
      return;
    }

    res.status(calendarError.status).json({
      success: false,
      error: calendarError.message,
    } satisfies ApiResponse);
  }
});

export default router;
