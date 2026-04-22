// ── Credentials ───────────────────────────────────────────────────────────────

function creds() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  return { sid, token };
}

function authHeader() {
  const { sid, token } = creds();
  const encoded = Buffer.from(`${sid}:${token}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

function formHeader() {
  return { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' };
}

function baseUrl() {
  const { sid } = creds();
  return `https://api.twilio.com/2010-04-01/Accounts/${sid}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

export interface PurchasedNumber {
  sid:         string;
  phoneNumber: string;
  friendlyName: string;
}

// ── Messaging ─────────────────────────────────────────────────────────────────

const FROM_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER ?? 'whatsapp:+14155238886';

export async function sendWhatsApp(to: string, body: string): Promise<string> {
  const params = new URLSearchParams({
    From: FROM_WHATSAPP,
    To:   to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: body,
  });

  const res = await fetch(`${baseUrl()}/Messages.json`, {
    method: 'POST',
    headers: formHeader(),
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio WhatsApp failed: ${await res.text()}`);
  return ((await res.json()) as { sid: string }).sid;
}

export async function sendSms(to: string, body: string, from: string): Promise<string> {
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const res = await fetch(`${baseUrl()}/Messages.json`, {
    method: 'POST',
    headers: formHeader(),
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio SMS failed: ${await res.text()}`);
  return ((await res.json()) as { sid: string }).sid;
}

// ── UK Number Management ──────────────────────────────────────────────────────

/**
 * Search for available UK geographic (local) voice numbers.
 * Results are random — call once and pick the first available.
 */
export async function searchUkNumbers(count = 5): Promise<AvailableNumber[]> {
  // Try Local first, fall back to Mobile (which supports SMS natively in UK)
  for (const type of ['Local', 'Mobile']) {
    const params = new URLSearchParams({
      VoiceEnabled: 'true',
      Limit:        String(count),
    });

    const res = await fetch(
      `${baseUrl()}/AvailablePhoneNumbers/GB/${type}.json?${params}`,
      { headers: authHeader() }
    );
    if (!res.ok) continue;

    const json = (await res.json()) as {
      available_phone_numbers: Array<{
        phone_number: string;
        friendly_name: string;
        locality: string | null;
        region: string | null;
      }>;
    };

    const numbers = json.available_phone_numbers.map((n) => ({
      phoneNumber:  n.phone_number,
      friendlyName: n.friendly_name,
      locality:     n.locality,
      region:       n.region,
    }));

    if (numbers.length > 0) return numbers;
  }

  return [];
}

/** Purchase a UK phone number. Returns the SID needed for later release. */
export async function buyUkNumber(phoneNumber: string): Promise<PurchasedNumber> {
  const params = new URLSearchParams({ PhoneNumber: phoneNumber });
  const res = await fetch(`${baseUrl()}/IncomingPhoneNumbers.json`, {
    method:  'POST',
    headers: formHeader(),
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio number purchase failed: ${await res.text()}`);

  const data = (await res.json()) as {
    sid: string;
    phone_number: string;
    friendly_name: string;
  };

  return {
    sid:          data.sid,
    phoneNumber:  data.phone_number,
    friendlyName: data.friendly_name,
  };
}

/** Release a purchased number by its SID. Used during provisioning rollback. */
export async function releaseNumber(phoneNumberSid: string): Promise<void> {
  const res = await fetch(`${baseUrl()}/IncomingPhoneNumbers/${phoneNumberSid}.json`, {
    method:  'DELETE',
    headers: authHeader(),
  });
  // 204 = deleted, 404 = already gone — both are acceptable
  if (!res.ok && res.status !== 404) {
    throw new Error(`Twilio number release failed: ${await res.text()}`);
  }
}

// ── SMS helpers ───────────────────────────────────────────────────────────────

const OUTCOME_SHORT: Record<string, string> = {
  booked:        'Job booked ✓',
  lead_captured: 'Lead captured',
  enquiry:       'Enquiry received',
  spam:          'Spam call blocked',
  voicemail:     'Voicemail left',
  transferred:   'Call transferred',
  emergency:     'EMERGENCY',
  no_answer:     'Missed call',
};

/**
 * Send the business owner a concise SMS after a call ends.
 * `from` should be the client's Twilio number so replies come back to it.
 */
export async function sendOwnerSms(opts: {
  to:           string;   // owner mobile E.164
  from:         string;   // client's Twilio number E.164
  outcome:      string;
  callerNumber: string;
  callerName?:  string | null;
  jobType?:     string | null;
  postcode?:    string | null;
  urgency?:     string | null;
  businessName: string;
}): Promise<string> {
  const lines = [
    `Trade Receptionist: ${OUTCOME_SHORT[opts.outcome] ?? opts.outcome}`,
    `From: ${opts.callerNumber}`,
  ];
  if (opts.callerName) lines.push(`Name: ${opts.callerName}`);
  if (opts.jobType)    lines.push(`Job: ${opts.jobType}${opts.postcode ? `, ${opts.postcode}` : ''}`);
  if (opts.urgency && opts.urgency !== 'routine') lines.push(`Urgency: ${opts.urgency.toUpperCase()}`);
  lines.push(`— ${opts.businessName}`);

  return sendSms(opts.to, lines.join('\n'), opts.from);
}

/**
 * Send the caller an SMS confirmation after their call.
 * `from` is the client's Twilio number so it looks like a message from the business.
 */
export async function sendCallerSms(opts: {
  to:           string;   // caller E.164
  from:         string;   // client's Twilio number E.164
  businessName: string;
  ownerName:    string;
  booked?:      boolean;
}): Promise<string> {
  const body = opts.booked
    ? `Hi, thanks for calling ${opts.businessName}! Your booking is confirmed — ${opts.ownerName} will be in touch to confirm the details.`
    : `Hi, thanks for calling ${opts.businessName}! We've taken a note of your enquiry and ${opts.ownerName} will be in touch shortly.`;

  return sendSms(opts.to, body, opts.from);
}

// ── Call Control ──────────────────────────────────────────────────────────────

/**
 * Warm transfer: redirects an active call to a new destination via TwiML.
 * Retell's built-in transfer_call tool handles this automatically for most
 * cases — use this only for out-of-band transfer from a webhook handler.
 */
export async function warmTransferCall(
  callSid: string,
  transferTo: string
): Promise<void> {
  const twiml = `<Response><Dial><Number>${transferTo}</Number></Dial></Response>`;
  const params = new URLSearchParams({ Twiml: twiml });

  const res = await fetch(`${baseUrl()}/Calls/${callSid}.json`, {
    method:  'POST',
    headers: formHeader(),
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio warm transfer failed: ${await res.text()}`);
}
