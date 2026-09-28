/**
 * The "put me through to the owner" tool, in the shape Retell actually runs.
 *
 * It was sent as `type: 'bridge_transfer'` with a hand-made
 * `transfer_option: { type: 'external', number }`. Retell's SDK documents
 * bridge_transfer as "only available to transfer agents … in agentic warm
 * transfer mode", with no number at all — on an ordinary receptionist it
 * cannot ring anyone. So no transfer had ever worked for any tenant; the first
 * caller to ask (2026-09-28) heard "let me put you through" and then "I can't
 * connect you". Nobody had asked before, so nothing had ever failed loudly.
 *
 * Typed against the installed SDK's own definition, so a shape Retell does not
 * accept fails `tsc` instead of failing a caller. Same lesson as the Retell
 * paths in CLAUDE.md §10: never hand-write a vendor shape the SDK can check.
 */
import type { Retell } from 'retell-sdk';

export type TransferTool = Retell.LlmUpdateParams.TransferCallTool;

export const TRANSFER_TOOL_NAME = 'TransferToOwner';

/** A cold transfer to a fixed number, which must already be E.164. */
export function buildTransferTool(number: string): TransferTool {
  return {
    type: 'transfer_call',
    name: TRANSFER_TOOL_NAME,
    description: [
      'Put the caller through to the business owner. Use it only when the',
      'instructions allow it (for example when the caller insists on speaking',
      'to them, or an emergency needs a person right now).',
    ].join(' '),
    transfer_destination: { type: 'predefined', number },
    // sip_invite: Retell dials the owner as a new leg over the tenant's own
    // number and bridges the caller in. SIP REFER instead hands the call back
    // to Twilio, which the elastic SIP trunk does not accept unless call
    // transfer is separately enabled on it.
    transfer_option: { type: 'cold_transfer', cold_transfer_mode: 'sip_invite' },
  };
}
