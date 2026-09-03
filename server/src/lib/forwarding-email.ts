/**
 * The call-forwarding instructions block, shared by every email that has to
 * tell a tradesperson how to send calls to their receptionist.
 *
 * It lives here rather than inside one email because two emails need it: the
 * welcome email at signup, and the "your number is ready" email sent when a
 * number is assigned after the fact. Those two drifting apart is how a customer
 * ends up with instructions that do not match their account.
 *
 * The dial code is built from shared/phone.ts, which renders it in national
 * dialling format. Interpolating the stored E.164 number produced
 * `**004*+4473...#`, which never registers on any UK network — the defect that
 * cost three customers before it was found.
 */
import { divertActivationCode, toNationalDialling, DIVERT_CANCEL_ALL, DIVERT_CHECK } from '../../../shared/phone';

const MN = "'Manrope','Helvetica Neue',Arial,sans-serif";

/**
 * Renders the green "Send your calls over" panel, or an empty string when we
 * have no number to give them — an instruction block with a blank number is
 * worse than none.
 */
export function forwardingInstructionsHtml(phoneNumber: string | null): string {
const dialCode = divertActivationCode(phoneNumber);

// One number format throughout. Settings fields accept either, but the dial
// code only accepts national — a single format removes any chance of a
// customer typing +44 into the keypad.
const national = toNationalDialling(phoneNumber);
const enterNumber = national
  ? national.replace(/^(\d{5})(\d{6})$/, '$1 $2')
  : (phoneNumber ?? '');

// ── Call-forwarding instructions ────────────────────────────────────────
// Two Settings-based routes (recommended, because they are visual and the
// customer can see the state afterwards), plus the dial code as a shortcut.
const numberChip = (n: string) =>
  `<span style="display:inline-block;background:#020D18;border:1px solid rgba(255,255,255,0.14);border-radius:7px;padding:3px 9px;font-family:'SF Mono','Courier New',monospace;font-size:14px;font-weight:700;color:#ffffff;white-space:nowrap;">${n}</span>`;

const miniStep = (n: number, text: string) =>
  `<tr>
    <td valign="top" width="26" style="padding:0 0 9px;">
      <div style="width:19px;height:19px;border-radius:50%;background:rgba(110,231,183,0.16);color:#6ee7b7;font-size:11px;font-weight:700;text-align:center;line-height:19px;font-family:${MN};">${n}</div>
    </td>
    <td valign="top" style="padding:0 0 9px;font-size:14px;line-height:1.45;color:rgba(240,244,248,0.80);font-family:${MN};">${text}</td>
  </tr>`;

const deviceCard = (label: string, steps: string[], note: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020D18;border:1px solid rgba(255,255,255,0.09);border-radius:14px;margin:0 0 12px;">
    <tr><td style="padding:18px 20px;">
      <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;color:#6ee7b7;font-family:${MN};">${label}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${steps.map((t, i) => miniStep(i + 1, t)).join('')}
      </table>
      <p style="margin:10px 0 0;font-size:12.5px;line-height:1.5;color:rgba(240,244,248,0.50);font-family:${MN};">${note}</p>
    </td></tr>
  </table>`;

return phoneNumber
  ? `<tr><td style="padding:18px 44px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F2C24;background-image:linear-gradient(180deg,#10322A,#0C2620);border:1px solid rgba(110,231,183,0.22);border-radius:18px;">
        <tr><td style="padding:22px 26px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6ee7b7;font-family:${MN};">Send your calls over</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:rgba(240,244,248,0.66);font-family:${MN};">Use one of the methods below on the mobile you want covered.</p>

          ${deviceCard(
            'iPhone (Settings method &ndash; recommended)',
            [
              'Open <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Settings</strong>',
              'Tap <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Phone</strong>',
              'Tap <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Call Forwarding</strong>',
              'Turn <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Call Forwarding</strong> on',
              `Tap <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Forward To</strong> and enter: ${numberChip(enterNumber)}`,
            ],
            'This forwards all incoming calls to your Trade Receptionist number.',
          )}

          ${deviceCard(
            'Android (Settings method &ndash; recommended)',
            [
              'Open the <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Phone</strong> app',
              'Tap the <strong style="color:rgba(240,244,248,0.95);font-weight:600;">three dots</strong> or <strong style="color:rgba(240,244,248,0.95);font-weight:600;">More</strong>, then <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Settings</strong>',
              'Tap <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Calling accounts</strong> (or <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Calls</strong>)',
              'Choose your <strong style="color:rgba(240,244,248,0.95);font-weight:600;">O2 SIM</strong> (or main mobile line)',
              'Tap <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Call forwarding</strong>',
              'Choose <strong style="color:rgba(240,244,248,0.95);font-weight:600;">Always forward</strong> (or <strong style="color:rgba(240,244,248,0.95);font-weight:600;">When busy</strong> / <strong style="color:rgba(240,244,248,0.95);font-weight:600;">When unanswered</strong> if you prefer)',
              `Enter your Trade Receptionist number: ${numberChip(enterNumber)}`,
            ],
            'Menu names can vary slightly by phone. If you don&rsquo;t see these options, search &lsquo;call forwarding&rsquo; in Settings.',
          )}

          ${dialCode ? `<p style="margin:16px 0 8px;font-size:11px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;color:rgba(240,244,248,0.42);font-family:${MN};">Or use the shortcut code</p>` : ''}
          <p style="margin:0 0 10px;font-size:13.5px;line-height:1.55;color:rgba(240,244,248,0.62);font-family:${MN};">Open the keypad, dial this exactly, then press call. This forwards only the calls you don&rsquo;t pick up.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020D18;border:1px solid rgba(255,255,255,0.10);border-radius:12px;">
            <tr><td align="center" style="padding:15px 14px;font-family:'SF Mono','Courier New',monospace;font-size:21px;font-weight:700;letter-spacing:0.02em;color:#ffffff;">${dialCode ?? ''}</td></tr>
          </table>
          <p style="margin:12px 0 0;font-size:12.5px;line-height:1.55;color:rgba(240,244,248,0.50);font-family:${MN};">Works on EE, O2, Vodafone &amp; Three. Dial it from your phone&rsquo;s own keypad, not a third-party app, and turn Wi&#8209;Fi calling off first &mdash; with it on, some networks show a success message without actually setting the divert.</p>
          <p style="margin:8px 0 0;font-size:12.5px;line-height:1.55;color:rgba(240,244,248,0.50);font-family:${MN};">Check it worked by dialling <span style="color:rgba(240,244,248,0.80);font-weight:600;">${DIVERT_CHECK}</span>. To switch forwarding off at any time, dial <span style="color:rgba(240,244,248,0.80);font-weight:600;">${DIVERT_CANCEL_ALL}</span>.</p>
        </td></tr>
      </table>
    </td></tr>`
  : '';
}
