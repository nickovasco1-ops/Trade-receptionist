import type {
  Booking,
  BusinessConfig,
  Client,
  Lead,
} from '../../../shared/types';
import { supabase } from './supabase';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getAvailableSlots,
  isSlotAvailable,
} from './calendar';
import { sendCallerSms } from './twilio';
import { sendBookingConfirmationEmail } from './resend';

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
  const message = error instanceof Error ? error.message : 'Google Calendar request failed';

  if (
    message.includes('Google token refresh failed')
    || message.includes('invalid_grant')
    || message.includes('invalid_client')
  ) {
    return {
      status: 409,
      message: 'Google Calendar access needs to be reconnected before bookings can be used.',
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

  if (!client.google_cal_id || !client.google_refresh_token) {
    throw new Error('Google Calendar is not connected for this business yet.');
  }

  const slots = await getAvailableSlots({
    calendarId: client.google_cal_id,
    refreshToken: client.google_refresh_token,
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

  if (!client.google_cal_id || !client.google_refresh_token) {
    throw new Error('Google Calendar is not connected for this business yet.');
  }

  const durationMins = request.durationMins ?? 60;
  const scheduledAt = new Date(request.scheduledAt);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error('scheduledAt must be a valid ISO datetime');
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

  const slotStillAvailable = await isSlotAvailable({
    calendarId: client.google_cal_id,
    refreshToken: client.google_refresh_token,
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

  const googleEventId = await createCalendarEvent(
    client.google_cal_id,
    client.google_refresh_token,
    {
      title: bookingTitle(jobType, customerName),
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
    await deleteCalendarEvent(client.google_cal_id, client.google_refresh_token, googleEventId).catch((error: unknown) =>
      console.error('[booking] calendar rollback failed after booking insert error', error)
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
      await deleteCalendarEvent(client.google_cal_id, client.google_refresh_token, googleEventId).catch((error: unknown) =>
        console.error('[booking] calendar rollback failed after lead status error', error)
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
    console.error('[booking] confirmation failed', error);
    confirmationNote = 'Booking saved, but the confirmation could not be sent.';
  }

  return {
    booking: bookingRow as Booking,
    confirmationSummary: confirmationNote,
  };
}
