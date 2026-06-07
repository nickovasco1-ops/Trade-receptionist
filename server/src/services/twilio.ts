import { isE2ETestMode } from '../config/e2e';

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

export async function sendSms(to: string, body: string, from: string): Promise<string> {
  if (isE2ETestMode()) {
    return `SM_e2e_${Buffer.from(`${from}:${to}:${body}`).toString('hex').slice(0, 24)}`;
  }

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
  if (isE2ETestMode()) {
    return Array.from({ length: count }, (_, index) => ({
      phoneNumber: `+4420457190${String(index).padStart(2, '0')}`,
      friendlyName: `E2E Test Number ${index + 1}`,
      locality: 'London',
      region: 'GB',
    }));
  }

  // UK Local numbers require a separate regulatory bundle (not yet approved).
  // Mobile numbers work with the existing twilio-approved bundle — prefer them.
  for (const type of ['Mobile', 'Local']) {
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
  if (isE2ETestMode()) {
    return {
      sid: `PN_e2e_${phoneNumber.replace(/\D/g, '').slice(-10)}`,
      phoneNumber,
      friendlyName: 'E2E Test Number',
    };
  }

  const params = new URLSearchParams({ PhoneNumber: phoneNumber });

  // UK numbers require a registered address + regulatory bundle (Ofcom / Twilio policy).
  // Address: Trade Receptionist Ltd, 3 Dorothea Close, KT15 2GR.
  // Bundle: twilio-approved UK Mobile bundle (BU173d57f5aa2ce576e6d9b480a05bc95b).
  const addressSid = process.env.TWILIO_ADDRESS_SID;
  const bundleSid  = process.env.TWILIO_BUNDLE_SID;
  if (addressSid) params.set('AddressSid', addressSid);
  if (bundleSid)  params.set('BundleSid',  bundleSid);

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

/**
 * Attach a purchased number to the Elastic SIP Trunk.
 *
 * This is what routes INBOUND PSTN calls into Retell: the trunk's origination
 * points at Retell, so any number on the trunk reaches the agent bound to it in
 * Retell. Without this step a freshly-bought number has no inbound route and
 * callers hear "you have dialled an incorrect number".
 *
 * Requires TWILIO_SIP_TRUNK_SID (the `trade-receptionist-production` trunk).
 */
export async function attachNumberToTrunk(phoneNumberSid: string): Promise<void> {
  if (isE2ETestMode()) {
    return;
  }

  const trunkSid = process.env.TWILIO_SIP_TRUNK_SID;
  if (!trunkSid) throw new Error('TWILIO_SIP_TRUNK_SID must be set');

  const params = new URLSearchParams({ PhoneNumberSid: phoneNumberSid });
  const res = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}/PhoneNumbers`, {
    method:  'POST',
    headers: formHeader(),
    body:    params.toString(),
  });
  // 201 = attached, 409 = already on the trunk — both acceptable.
  if (!res.ok && res.status !== 409) {
    throw new Error(`Twilio trunk attach failed: ${await res.text()}`);
  }
}

/**
 * Look up a purchased number's SID by its E.164 address.
 * Used by the backfill route to repair numbers provisioned before the trunk
 * attach existed (we only have the E.164 string stored on the client).
 */
export async function findNumberSid(phoneNumber: string): Promise<string | null> {
  if (isE2ETestMode()) {
    return `PN_e2e_${phoneNumber.replace(/\D/g, '').slice(-10)}`;
  }

  const params = new URLSearchParams({ PhoneNumber: phoneNumber });
  const res = await fetch(`${baseUrl()}/IncomingPhoneNumbers.json?${params}`, {
    headers: authHeader(),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { incoming_phone_numbers?: Array<{ sid: string }> };
  return data.incoming_phone_numbers?.[0]?.sid ?? null;
}

/** Release a purchased number by its SID. Used during provisioning rollback. */
export async function releaseNumber(phoneNumberSid: string): Promise<void> {
  if (isE2ETestMode()) {
    return;
  }

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
  leadUrl?:     string | null; // deep-link to the lead in the dashboard
}): Promise<string> {
  const isMissed = opts.outcome === 'no_answer' || opts.outcome === 'voicemail';

  let body: string;

  if (isMissed) {
    // Actionable missed-call format: caller number prominent, callback link first
    const callerDisplay = opts.callerNumber !== 'Unknown number' ? opts.callerNumber : 'withheld number';
    const lines = [
      `⚠️ Missed call from ${callerDisplay}`,
    ];
    if (opts.outcome === 'voicemail') lines.push('They left a voicemail — follow up when you can.');
    if (opts.callerNumber !== 'Unknown number') lines.push(`Call back: ${opts.callerNumber}`);
    if (opts.leadUrl) lines.push(`View lead: ${opts.leadUrl}`);
    lines.push(`— ${opts.businessName}`);
    body = lines.join('\n');
  } else {
    const lines = [
      `Trade Receptionist: ${OUTCOME_SHORT[opts.outcome] ?? opts.outcome}`,
      `From: ${opts.callerNumber}`,
    ];
    if (opts.callerName) lines.push(`Name: ${opts.callerName}`);
    if (opts.jobType)    lines.push(`Job: ${opts.jobType}${opts.postcode ? `, ${opts.postcode}` : ''}`);
    if (opts.urgency && opts.urgency !== 'routine') lines.push(`Urgency: ${opts.urgency.toUpperCase()}`);
    if (opts.leadUrl) lines.push(`View lead: ${opts.leadUrl}`);
    lines.push(`— ${opts.businessName}`);
    body = lines.join('\n');
  }

  return sendSms(opts.to, body, opts.from);
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
  scheduledAt?: string | null;
}): Promise<string> {
  const body = opts.booked
    ? `Hi, thanks for calling ${opts.businessName}! Your booking is confirmed${opts.scheduledAt ? ` for ${new Date(opts.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''} — ${opts.ownerName} will be in touch if anything changes.`
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
  if (isE2ETestMode()) {
    return;
  }

  const twiml = `<Response><Dial><Number>${transferTo}</Number></Dial></Response>`;
  const params = new URLSearchParams({ Twiml: twiml });

  const res = await fetch(`${baseUrl()}/Calls/${callSid}.json`, {
    method:  'POST',
    headers: formHeader(),
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio warm transfer failed: ${await res.text()}`);
}
