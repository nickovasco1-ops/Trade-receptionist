/**
 * The "domestic or commercial?" step of the receptionist's checklist.
 *
 * Every agent asked it. A tradesperson who only works on homes (Orrell Park
 * Heating Solutions, 2026-10-09) asked for it to stop, because the question
 * made it sound as if he took commercial work. A line of custom instructions
 * saying "don't ask" would contradict the built-in checklist, and the model may
 * keep either, so the step itself changes.
 */
export function propertyStep(domesticOnly: boolean, businessName: string, ownerName: string): string {
  if (!domesticOnly) {
    return '6. Property type — is it a house/flat or a commercial premises (office, shop, site)? Ask naturally: "Is that a domestic property or a commercial one?" Only ask if it\'s not obvious from context.';
  }
  return `6. Property type — do NOT ask. ${businessName} only works on homes, so never ask whether a property is domestic or commercial. If the caller says it's a business or commercial premises, explain politely that ${ownerName} only does domestic work, and offer to pass on their details anyway.`;
}
