import type {
  Booking,
  BookingRules,
  BusinessConfig,
  Client,
  JobSize,
  Lead,
} from '../../../shared/types';
import { supabase } from './supabase';
import {
  CalendarAuthError,
  calendarConnection,
  createCalendarEvent,
  deleteCalendarEvent,
  getAvailableSlots,
  getBusy,
  isSlotAvailable,
  providerLabel,
} from './calendar';
import { sendCallerSms } from './twilio';
import { sendBookingConfirmationEmail } from './resend';
import { logEvent, errorMessage } from '../lib/observability';
import {
  bookingRulesError,
  busyRangeFor,
  parseBookingRules,
  planSlots,
  slotFor,
  slotProblem,
  type WorkingHours,
} from '../lib/booking-rules';
import { normaliseHour } from '../lib/time';
import { localDateTimeToUtc } from '../lib/tz';

export interface BookingContext {
  client: Client;
  config: BusinessConfig;
}

export type ConfirmationChannel = 'auto' | 'sms' | 'email' | 'both' | 'none';
export type AvailabilityPeriod = 'morning' | 'afternoon' | 'any';

export interface AvailabilityRequest {
  durationMins?: number;
  days?: number;
  maxSlots?: number;
  requestedDate?: string | null;
  period?: AvailabilityPeriod;
  /** Required when the tenant has booking rules; ignored otherwise. */
  jobSize?: JobSize;
}

export interface CreateBookingRequest {
  scheduledAt: string;
  durationMins?: number;
  address?: string | null;
  notes?: string | null;
  lead?: Lead | null;
  callId?: string | null;
  customerName?: string | null;
  callerNumber?: string | null;
  callerEmail?: string | null;
  jobType?: string | null;
  confirmationChannel?: ConfirmationChannel;
  /** Required when the tenant has booking rules; decides the length and which days are allowed. */
  jobSize?: JobSize;
}

export interface BookingResult {
  booking: Booking;
  confirmationSummary: string;
}

function bookingTitle(jobType: string | null | undefined, customerName: string | null | undefined): string {
  const label = customerName?.trim() || 'Caller';
  return jobType?.trim()
    ? `${jobType.trim()} - ${label}`
    : `Job visit - ${label}`;
}

const SIZE_TITLE_PREFIX: Partial<Record<JobSize, string>> = {
  emergency: 'EMERGENCY - ',
  large: 'BIG JOB (confirm details) - ',
};

/** The tenant's booking rules, or null. Malformed rules are logged, not half-applied. */
export function rulesFor(config: BusinessConfig): BookingRules | null {
  const raw = config.booking_rules ?? null;
  const rules = parseBookingRules(raw);
  if (!rules && raw) {
    logEvent('error', 'booking.rules_invalid', { clientId: config.client_id, error: bookingRulesError(raw) });
  }
  return rules;
}

function workingHours(config: BusinessConfig): WorkingHours {
  const toMins = (value: string | null, fallback: string): number => {
    const [h, m] = (normaliseHour(value) ?? fallback).split(':').map(Number);
    return (h * 60) + m;
  };
  const openMins = toMins(config.business_hours_start, '08:00');
  let closeMins = toMins(config.business_hours_end, '18:00');
  if (closeMins <= openMins) closeMins = 24 * 60;
  return { openMins, closeMins };
}

/**
 * Where a search starts: the caller's requested day, or now.
 *
 * The search used to always start now and run seven days, then filter to the
 * requested date — so any date more than a week out came back empty and the
 * agent told callers the diary was full.
 */
function searchStart(requestedDate: string | null | undefined, timeZone: string, now: Date): Date {
  const date = requestedDate?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return now;
  const startOfDay = localDateTimeToUtc(date, 0, timeZone);
  return startOfDay.getTime() > now.getTime() ? startOfDay : now;
}

function dateStringInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

function hourInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
}

function filterSlotsByRequest(slots: Date[], timeZone: string, request: AvailabilityRequest): Date[] {
  const requestedDate = request.requestedDate?.trim() || null;
  const period = request.period ?? 'any';

  return slots.filter((slot) => {
    if (requestedDate && dateStringInTimeZone(slot, timeZone) !== requestedDate) {
      return false;
    }

    if (period === 'morning') {
      return hourInTimeZone(slot, timeZone) < 12;
    }

    if (period === 'afternoon') {
      return hourInTimeZone(slot, timeZone) >= 12;
    }

    return true;
  });
}

function normalizeConfirmationChannel(channel: ConfirmationChannel | undefined): ConfirmationChannel {
  return channel ?? 'auto';
}

function confirmationSummary(sentSms: boolean, sentEmail: boolean): string {
  if (sentSms && sentEmail) return 'Confirmation sent by text and email.';
  if (sentSms) return 'Confirmation sent by text.';
  if (sentEmail) return 'Confirmation sent by email.';
  return 'Booking saved, but no caller confirmation was sent.';
}

export function bookingErrorDetails(error: unknown): { status: number; message: string } {
  // A dead credential is now its own error type, so this no longer has to guess
  // from substrings — and it names the provider the tenant actually connected
  // rather than saying "Google" to an Outlook customer.
  if (error instanceof CalendarAuthError) {
    return {
      status: 409,
      message: `${providerLabel(error.provider)} access needs to be reconnected before bookings can be used.`,
    };
  }

  const message = error instanceof Error ? error.message : 'Calendar request failed';

  // Retained for any path that still surfaces a raw provider string.
  if (/invalid_grant|invalid_client|token refresh failed/i.test(message)) {
    return {
      status: 409,
      message: 'Calendar access needs to be reconnected before bookings can be used.',
    };
  }

  return { status: 502, message };
}

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505';
}

export async function loadBookingContextByOwnerEmail(ownerEmail: string): Promise<BookingContext | null> {
  const [{ data: clientRow }, { data: configRow }] = await Promise.all([
    supabase.from('clients').select('*').eq('owner_email', ownerEmail).maybeSingle(),
    supabase
      .from('business_config')
      .select('*, clients!inner(owner_email)')
      .eq('clients.owner_email', ownerEmail)
      .maybeSingle(),
  ]);

  if (!clientRow || !configRow) return null;

  return {
    client: clientRow as Client,
    config: configRow as BusinessConfig,
  };
}

export async function loadBookingContextByAgentId(agentId: string): Promise<BookingContext | null> {
  const [{ data: clientRow }, { data: configRow }] = await Promise.all([
    supabase.from('clients').select('*').eq('retell_agent_id', agentId).maybeSingle(),
    supabase
      .from('business_config')
      .select('*, clients!inner(retell_agent_id)')
      .eq('clients.retell_agent_id', agentId)
      .maybeSingle(),
  ]);

  if (!clientRow || !configRow) return null;

  return {
    client: clientRow as Client,
    config: configRow as BusinessConfig,
  };
}

export async function loadLead(leadId: string, clientId: string): Promise<Lead | null> {
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('client_id', clientId)
    .maybeSingle();

  return (data as Lead | null) ?? null;
}

export async function getClientAvailability(
  context: BookingContext,
  request: AvailabilityRequest
): Promise<Date[]> {
  const { client, config } = context;

  const connection = calendarConnection(client);
  if (!connection) {
    throw new Error('No diary is connected for this business yet.');
  }

  const now = new Date();
  const fromDate = searchStart(request.requestedDate, config.timezone, now);
  const rules = rulesFor(config);

  // Rules apply when a size is given. The agent's tools always give one for a
  // rules tenant (routes/retell-tools refuses without it); the owner booking
  // from their own dashboard does not, and is not bound by rules meant for callers.
  if (rules && request.jobSize) {
    const emergency = request.jobSize === 'emergency';
    const from = emergency ? now : fromDate;
    const days = emergency ? 2 : (request.days ?? 14);
    const range = busyRangeFor(from, new Date(from.getTime() + (days + 1) * 86_400_000), rules);
    // A lead time moves the search later than `from`, so fetch far enough ahead to cover it.
    const lead = rules.sizes[request.jobSize]?.minLeadDays ?? 0;
    const busy = await getBusy(connection, range.from, new Date(range.to.getTime() + lead * 86_400_000));
    const planned = planSlots({
      rules,
      size: request.jobSize,
      busy,
      now,
      from,
      days,
      hours: workingHours(config),
      timezone: config.timezone,
      maxSlots: 50,
    }).map((slot) => slot.start);

    const maxSlots = request.maxSlots ?? 10;
    if (emergency) return planned.slice(0, maxSlots);
    // Honour the caller's day and time of day where the rules allow it; if they
    // do not, offer the nearest alternatives rather than nothing.
    const wanted = filterSlotsByRequest(planned, config.timezone, request);
    return (wanted.length ? wanted : filterSlotsByRequest(planned, config.timezone, { ...request, requestedDate: null }))
      .slice(0, maxSlots);
  }

  const slots = await getAvailableSlots({
    connection,
    fromDate,
    durationMins: request.durationMins ?? 60,
    days: request.days ?? 7,
    maxSlots: request.maxSlots ?? 10,
    startHour: config.business_hours_start ?? '08:00',
    endHour: config.business_hours_end ?? '18:00',
    workingDays: config.working_days,
    timezone: config.timezone,
  });

  return filterSlotsByRequest(slots, config.timezone, request).slice(0, request.maxSlots ?? 10);
}

async function sendBookingConfirmations(
  context: BookingContext,
  request: CreateBookingRequest,
  scheduledAt: Date
): Promise<string> {
  const { client, config } = context;
  const channel = normalizeConfirmationChannel(request.confirmationChannel);
  const canSms = !!request.callerNumber && !!client.twilio_number;
  const canEmail = !!request.callerEmail;
  const startIso = scheduledAt.toISOString();

  let sentSms = false;
  let sentEmail = false;

  const sendSmsAllowed = channel === 'sms' || channel === 'both' || (channel === 'auto' && canSms);
  const sendEmailAllowed = channel === 'email' || channel === 'both' || (channel === 'auto' && !canSms && canEmail);

  if (sendSmsAllowed && canSms) {
    await sendCallerSms({
      to: request.callerNumber as string,
      from: client.twilio_number as string,
      businessName: client.business_name,
      ownerName: client.owner_name,
      booked: true,
      scheduledAt: startIso,
    });
    sentSms = true;
  }

  if (sendEmailAllowed && canEmail) {
    await sendBookingConfirmationEmail(request.callerEmail as string, {
      businessName: client.business_name,
      ownerName: client.owner_name,
      scheduledAt: startIso,
      customerName: request.customerName ?? null,
      jobType: request.jobType ?? null,
      address: request.address ?? null,
      timezone: config.timezone,
    });
    sentEmail = true;
  }

  return confirmationSummary(sentSms, sentEmail);
}

export async function createBookingForClient(
  context: BookingContext,
  request: CreateBookingRequest
): Promise<BookingResult> {
  const { client, config } = context;

  const connection = calendarConnection(client);
  if (!connection) {
    throw new Error('No diary is connected for this business yet.');
  }

  const requestedStart = new Date(request.scheduledAt);

  if (Number.isNaN(requestedStart.getTime())) {
    throw new Error('scheduledAt must be a valid ISO datetime');
  }

  // With booking rules the size decides the length and the allowed days, and the
  // slot is re-checked against them here — the agent cannot talk its way past a
  // rule the availability tool enforced.
  const rules = request.jobSize ? rulesFor(config) : null;
  let scheduledAt = requestedStart;
  let durationMins = request.durationMins ?? 60;
  if (rules && request.jobSize) {
    const hours = workingHours(config);
    const slot = slotFor(rules, request.jobSize, requestedStart, hours, config.timezone);
    if (!slot) throw new Error(`This business does not take ${request.jobSize} jobs through the diary.`);
    const range = busyRangeFor(slot.start, slot.end, rules);
    const busy = await getBusy(connection, range.from, range.to);
    const problem = slotProblem({
      rules, size: request.jobSize, busy, now: new Date(), hours, timezone: config.timezone, start: requestedStart,
    });
    if (problem) throw new Error(problem);
    scheduledAt = slot.start;
    durationMins = Math.round((slot.end.getTime() - slot.start.getTime()) / 60_000);
  }

  if (request.lead) {
    const { data: existingLeadBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('lead_id', request.lead.id)
      .eq('status', 'scheduled')
      .maybeSingle();

    if (existingLeadBooking) {
      throw new Error('This lead already has a scheduled booking.');
    }
  }

  const { data: sameSlotBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', client.id)
    .eq('scheduled_at', scheduledAt.toISOString())
    .eq('status', 'scheduled')
    .maybeSingle();

  if (sameSlotBooking) {
    throw new Error('That slot has already been taken. Please choose another one.');
  }

  const slotStillAvailable = rules ? true : await isSlotAvailable({
    connection,
    startTime: scheduledAt,
    durationMins,
    startHour: config.business_hours_start ?? '08:00',
    endHour: config.business_hours_end ?? '18:00',
    workingDays: config.working_days,
    timezone: config.timezone,
  });

  if (!slotStillAvailable) {
    throw new Error('That slot is no longer available. Please refresh the diary slots and pick another time.');
  }

  const endTime = new Date(scheduledAt.getTime() + durationMins * 60_000).toISOString();
  const address = request.address?.trim()
    || request.lead?.postcode
    || null;
  const extraNotes = request.notes?.trim() || null;
  const combinedNotes = [request.lead?.notes, extraNotes].filter(Boolean).join('\n\n') || null;
  const customerName = request.customerName?.trim() || request.lead?.caller_name || request.callerNumber || 'Caller';
  const callerNumber = request.callerNumber?.trim() || request.lead?.caller_number || null;
  const callerEmail = request.callerEmail?.trim() || request.lead?.caller_email || null;
  const jobType = request.jobType?.trim() || request.lead?.job_type || null;

  // Named for the column it lands in (bookings.google_event_id), which keeps its
  // name for compatibility but now holds an id from whichever provider booked it.
  const googleEventId = await createCalendarEvent(
    connection,
    {
      title: `${request.jobSize ? SIZE_TITLE_PREFIX[request.jobSize] ?? '' : ''}${bookingTitle(jobType, customerName)}`,
      startTime: scheduledAt.toISOString(),
      endTime,
      customerName,
      callerNumber: callerNumber ?? undefined,
      address: address ?? undefined,
      notes: combinedNotes ?? undefined,
      timezone: config.timezone,
    }
  );

  const bookingInsert = {
    client_id: client.id,
    lead_id: request.lead?.id ?? null,
    call_id: request.callId ?? null,
    google_event_id: googleEventId,
    scheduled_at: scheduledAt.toISOString(),
    job_type: jobType,
    address,
    status: 'scheduled' as const,
  };

  const { data: bookingRow, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingInsert)
    .select('*')
    .single();

  if (bookingError || !bookingRow) {
    await deleteCalendarEvent(connection, googleEventId).catch((error: unknown) =>
      logEvent('error', 'booking.calendar_rollback_failed', { clientId: client.id, stage: 'booking_insert', error: errorMessage(error) })
    );

    if (isUniqueViolation(bookingError)) {
      throw new Error('That slot has already been taken. Please choose another one.');
    }

    throw bookingError ?? new Error('Could not save the booking.');
  }

  if (request.lead) {
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'booked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.lead.id);

    if (leadUpdateError) {
      await supabase.from('bookings').delete().eq('id', bookingRow.id);
      await deleteCalendarEvent(connection, googleEventId).catch((error: unknown) =>
        logEvent('error', 'booking.calendar_rollback_failed', { clientId: client.id, stage: 'lead_status', error: errorMessage(error) })
      );
      throw new Error('The booking could not be finalised. No changes were applied.');
    }
  }

  let confirmationNote = 'No confirmation requested.';
  try {
    confirmationNote = await sendBookingConfirmations(context, {
      ...request,
      callerNumber,
      callerEmail,
      customerName,
      jobType,
      address,
    }, scheduledAt);
  } catch (error: unknown) {
    logEvent('error', 'booking.confirmation_failed', { clientId: client.id, error: errorMessage(error) });
    confirmationNote = 'Booking saved, but the confirmation could not be sent.';
  }

  return {
    booking: bookingRow as Booking,
    confirmationSummary: confirmationNote,
  };
}
