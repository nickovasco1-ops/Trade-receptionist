import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOutcome,
  extractLeadData,
  hasStructuredAnalysis,
  isLeadEmpty,
  resolveOutcome,
} from './lead-extraction';

/**
 * These exist because the production numbers were indefensible: of the first 20
 * leads, 3 had a name, 3 had a job type and 2 had notes — while the transcripts
 * plainly contained "Tito", "oil boiler, no heat or hot water" and a postcode.
 * Two copies of this logic had drifted apart with no test on either.
 */

describe('hasStructuredAnalysis', () => {
  test('an absent or empty payload is not structured analysis', () => {
    assert.equal(hasStructuredAnalysis(undefined), false);
    assert.equal(hasStructuredAnalysis({}), false);
  });

  test('Retell answering every field with "" does not count as analysis', () => {
    // The old guard was `Object.keys(customData).length > 0`, so a payload of
    // all-empty strings counted as structured and suppressed the summary
    // fallback entirely — producing a lead with nothing in it.
    assert.equal(hasStructuredAnalysis({ caller_name: '', job_type: '   ' }), false);
  });

  test('one real value is enough', () => {
    assert.equal(hasStructuredAnalysis({ caller_name: '', job_type: 'boiler repair' }), true);
  });
});

describe('extractLeadData — structured analysis', () => {
  test('takes the structured fields when Retell provides them', () => {
    const lead = extractLeadData('', {
      caller_name: 'Tito', job_type: 'Oil boiler not firing',
      postcode: 'DE4 3AB', urgency: 'emergency', property_type: 'residential',
      notes: 'No heating or hot water', caller_number: '07380123456',
    });
    assert.equal(lead.caller_name, 'Tito');
    assert.equal(lead.job_type, 'Oil boiler not firing');
    assert.equal(lead.postcode, 'DE4 3AB');
    assert.equal(lead.urgency, 'emergency');
    assert.equal(lead.property_type, 'residential');
  });

  test('falls back to the summary field-by-field, not all-or-nothing', () => {
    // Retell returning a job type but no name must not cost us the name.
    const lead = extractLeadData('Caller: Tito. Job: oil boiler not firing.', {
      job_type: 'Oil boiler', caller_name: '',
    });
    assert.equal(lead.job_type, 'Oil boiler');
    assert.equal(lead.caller_name, 'Tito');
  });

  test('does not store filler words as real values', () => {
    const lead = extractLeadData('', {
      caller_name: 'unknown', postcode: 'N/A', job_type: 'not provided',
    });
    assert.equal(lead.caller_name, undefined);
    assert.equal(lead.postcode, undefined);
    assert.equal(lead.job_type, undefined);
  });

  test('rejects an urgency or property type outside the allowed set', () => {
    const lead = extractLeadData('', { urgency: 'very urgent', property_type: 'boat' });
    assert.equal(lead.urgency, undefined);
    assert.equal(lead.property_type, undefined);
  });
});

describe('extractLeadData — summary fallback', () => {
  test('captures a single-word first name', () => {
    // The old pattern required two capitalised words, so every caller who gave
    // one name was dropped. Both real callers in production gave one name.
    assert.equal(extractLeadData('Caller: Tito. Reports no heating.').caller_name, 'Tito');
    assert.equal(extractLeadData('Customer: Nick, kitchen leak.').caller_name, 'Nick');
  });

  test('still captures a full name', () => {
    assert.equal(extractLeadData('Caller: Steven Brown rang about a leak.').caller_name, 'Steven Brown');
  });

  test('picks up a UK postcode anywhere in the summary', () => {
    assert.equal(extractLeadData('Job is at DE4 3AB, kitchen tap.').postcode, 'DE4 3AB');
  });

  test('picks up a phone number and an email', () => {
    const lead = extractLeadData('Number: 07712 212212. Email: tito@example.co.uk');
    assert.equal(lead.caller_number, '07712 212212');
    assert.equal(lead.caller_email, 'tito@example.co.uk');
  });

  test('grades urgency from the words used', () => {
    assert.equal(extractLeadData('This is an emergency, gas smell.').urgency, 'emergency');
    assert.equal(extractLeadData('Needs someone same day.').urgency, 'urgent');
    assert.equal(extractLeadData('Wants a quote next month.').urgency, 'routine');
  });

  test('keeps the summary as notes once it says something', () => {
    const long = 'The caller reported a slow leak under the kitchen sink and asked for a visit.';
    assert.equal(extractLeadData(long).notes, long);
    assert.equal(extractLeadData('Short.').notes, undefined);
  });

  test('an empty summary yields an empty lead rather than throwing', () => {
    const lead = extractLeadData('');
    assert.equal(lead.caller_name, undefined);
    assert.equal(lead.notes, undefined);
  });
});

describe('deriveOutcome', () => {
  test('prefers the structured outcome', () => {
    assert.equal(deriveOutcome('anything at all', { call_outcome: 'booked' }), 'booked');
    assert.equal(deriveOutcome('', { call_outcome: 'EMERGENCY' }), 'emergency');
  });

  test('ignores a structured outcome that is not a known value', () => {
    assert.equal(deriveOutcome('', { call_outcome: 'maybe' }), 'enquiry');
  });

  test('reads the leading status token the agent is prompted to emit', () => {
    // Retell's summaries open with the outcome — "LEAD_CAPTURED: Jane needs a
    // boiler repair". e2e covers this shape; losing it filed every such call
    // as an enquiry, which is how it broke CI the first time.
    assert.equal(deriveOutcome('LEAD_CAPTURED: Jane Caller needs a boiler repair at SW1A 1AA.'), 'lead_captured');
    assert.equal(deriveOutcome('BOOKED | Tuesday 9am'), 'booked');
    assert.equal(deriveOutcome('no_answer'), 'no_answer');
  });

  test('the structured outcome still beats the leading token', () => {
    assert.equal(deriveOutcome('LEAD_CAPTURED: ...', { call_outcome: 'booked' }), 'booked');
  });

  test('a leading word that is not an outcome does not become one', () => {
    assert.equal(deriveOutcome('Booking enquiry about a new bathroom.'), 'enquiry');
  });

  test('reads the summary rather than only its first word', () => {
    // The backfill used to uppercase the first word and look it up, so every
    // summary written as prose was filed as an enquiry.
    assert.equal(deriveOutcome('The caller reported a gas leak in the kitchen.'), 'emergency');
    assert.equal(deriveOutcome('The appointment is confirmed for Tuesday.'), 'booked');
    assert.equal(deriveOutcome('The caller was put through to the owner.'), 'transferred');
    assert.equal(deriveOutcome('Sales call from a marketing agency.'), 'spam');
  });

  test('defaults to enquiry when the summary says nothing decisive', () => {
    assert.equal(deriveOutcome('The caller asked about pricing.'), 'enquiry');
  });
});

describe('isLeadEmpty', () => {
  test('a lead holding only a phone number is empty', () => {
    assert.equal(isLeadEmpty({ caller_name: null, job_type: null, notes: null, postcode: null }), true);
    assert.equal(isLeadEmpty({ caller_name: null, job_type: null, notes: '', postcode: null }), true);
  });

  test('any real detail makes it non-empty, so the backfill leaves it alone', () => {
    assert.equal(isLeadEmpty({ caller_name: 'Tito', job_type: null, notes: null, postcode: null }), false);
    assert.equal(isLeadEmpty({ caller_name: null, job_type: null, notes: 'rang twice', postcode: null }), false);
  });
});

describe('resolveOutcome', () => {
  // 2026-09-25: a call that put a job in the customer's diary was stored as
  // `enquiry`, so the dashboard showed none of the jobs the agent had won.
  test('a booking made on the call outranks whatever the analysis said', () => {
    assert.equal(resolveOutcome('enquiry', true), 'booked');
    assert.equal(resolveOutcome('lead_captured', true), 'booked');
  });

  test('without a booking the analysed outcome stands', () => {
    assert.equal(resolveOutcome('no_answer', false), 'no_answer');
    assert.equal(resolveOutcome('booked', false), 'booked');
  });
});
