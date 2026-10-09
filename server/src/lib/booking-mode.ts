import type { BusinessConfig } from '../../../shared/types';

/**
 * Whether the receptionist books straight into the diary on a call.
 *
 * A connected diary is necessary but not sufficient: a tenant may want every
 * booking confirmed by a person (business_config.callback_only, migration 024),
 * in which case the agent gets no booking tools and takes the caller's preferred
 * days and times instead. One answer for the prompt and the tools, so the
 * prompt never describes a tool the agent does not have.
 */
export function takesLiveBookings(
  calendarConnected: boolean,
  config: Pick<BusinessConfig, 'callback_only'>,
): boolean {
  return calendarConnected && config.callback_only !== true;
}
