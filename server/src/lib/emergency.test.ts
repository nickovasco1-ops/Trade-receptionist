import { describe, test, expect } from 'bun:test';
import {
  BASE_EMERGENCY_KEYWORDS,
  detectEmergency,
  getEmergencyLevel,
  type EmergencyLevel,
} from './emergency';

// ── BASE_EMERGENCY_KEYWORDS ───────────────────────────────────────────────────

describe('BASE_EMERGENCY_KEYWORDS', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(BASE_EMERGENCY_KEYWORDS)).toBe(true);
    expect(BASE_EMERGENCY_KEYWORDS.length).toBeGreaterThan(0);
  });

  test('contains canonical life-safety phrases', () => {
    expect(BASE_EMERGENCY_KEYWORDS).toContain('gas leak');
    expect(BASE_EMERGENCY_KEYWORDS).toContain('carbon monoxide');
    expect(BASE_EMERGENCY_KEYWORDS).toContain('flooding');
    expect(BASE_EMERGENCY_KEYWORDS).toContain('burst pipe');
    expect(BASE_EMERGENCY_KEYWORDS).toContain('no heating');
  });
});

// ── detectEmergency ───────────────────────────────────────────────────────────

describe('detectEmergency', () => {
  // Positive matches — base keywords
  test('detects gas leak', () => {
    expect(detectEmergency('There is a gas leak in my kitchen')).toBe(true);
  });

  test('detects gas smell', () => {
    expect(detectEmergency('There is a gas smell coming from under the boiler')).toBe(true);
  });

  test('detects carbon monoxide alarm', () => {
    expect(detectEmergency('My CO alarm has been going off all night')).toBe(true);
  });

  test('detects flooding', () => {
    expect(detectEmergency('My bathroom is flooding and water is everywhere')).toBe(true);
  });

  test('detects burst pipe', () => {
    expect(detectEmergency('I have a burst pipe in my hallway')).toBe(true);
  });

  test('detects no heating', () => {
    expect(detectEmergency('The boiler stopped and we have no heating at all')).toBe(true);
  });

  test('detects electric shock', () => {
    expect(detectEmergency('My son got a shock from the socket')).toBe(true);
  });

  test('detects electrocution mention', () => {
    expect(detectEmergency('There was electrocution in the garage')).toBe(true);
  });

  test('detects no power', () => {
    expect(detectEmergency('We have no power anywhere in the house')).toBe(true);
  });

  // Negative matches — routine enquiries
  test('returns false for a routine boiler service enquiry', () => {
    expect(detectEmergency('I would like to book an annual boiler service')).toBe(false);
  });

  test('returns false for a general quote request', () => {
    expect(detectEmergency('Can I get a quote for a new bathroom tap please')).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(detectEmergency('')).toBe(false);
  });

  // Case insensitivity
  test('matches regardless of case', () => {
    expect(detectEmergency('GAS LEAK IN THE UTILITY ROOM')).toBe(true);
    expect(detectEmergency('Flooding In My Kitchen')).toBe(true);
  });

  // Custom keywords
  test('detects custom keyword when provided', () => {
    expect(detectEmergency('The condensate pipe is frozen solid', ['condensate pipe'])).toBe(true);
  });

  test('does not detect custom keyword when not provided', () => {
    expect(detectEmergency('The condensate pipe is frozen solid')).toBe(false);
  });

  test('custom keywords are case-insensitive', () => {
    expect(detectEmergency('CONDENSATE PIPE IS FROZEN', ['condensate pipe'])).toBe(true);
  });

  test('merges custom keywords with base set', () => {
    // Base keyword still works when custom keywords are provided
    expect(detectEmergency('Gas leak and condensate pipe frozen', ['condensate pipe'])).toBe(true);
    // Custom keyword also works
    expect(detectEmergency('The condensate pipe is frozen', ['condensate pipe'])).toBe(true);
  });
});

// ── getEmergencyLevel ─────────────────────────────────────────────────────────

describe('getEmergencyLevel', () => {
  // Critical
  test('returns critical for gas leak', () => {
    expect(getEmergencyLevel('There is a gas leak in the kitchen')).toBe<EmergencyLevel>('critical');
  });

  test('returns critical for gas smell', () => {
    expect(getEmergencyLevel('There is a strong gas smell near the meter')).toBe<EmergencyLevel>('critical');
  });

  test('returns critical for carbon monoxide', () => {
    expect(getEmergencyLevel('My co alarm is sounding')).toBe<EmergencyLevel>('critical');
  });

  test('returns critical for electrical fire', () => {
    expect(getEmergencyLevel('There is an electrical fire in the fuse box')).toBe<EmergencyLevel>('critical');
  });

  test('returns critical for house fire', () => {
    expect(getEmergencyLevel('There is a house fire — started from the wiring')).toBe<EmergencyLevel>('critical');
  });

  test('returns critical for structural collapse', () => {
    expect(getEmergencyLevel('The ceiling collapsed on the top floor')).toBe<EmergencyLevel>('critical');
  });

  // High
  test('returns high for flooding', () => {
    expect(getEmergencyLevel('The bathroom is flooding')).toBe<EmergencyLevel>('high');
  });

  test('returns high for burst pipe', () => {
    expect(getEmergencyLevel('A pipe burst and water is gushing out')).toBe<EmergencyLevel>('high');
  });

  test('returns high for no power', () => {
    expect(getEmergencyLevel('We have no power — total blackout')).toBe<EmergencyLevel>('high');
  });

  test('returns high for power cut', () => {
    expect(getEmergencyLevel('The power cut out an hour ago')).toBe<EmergencyLevel>('high');
  });

  test('returns high for sparking outlet', () => {
    expect(getEmergencyLevel('There are sparks flying from the socket')).toBe<EmergencyLevel>('high');
  });

  test('returns high for electric shock', () => {
    expect(getEmergencyLevel('My partner got an electric shock from the switch')).toBe<EmergencyLevel>('high');
  });

  test('returns high for no heating', () => {
    expect(getEmergencyLevel('We have no heating and it is freezing')).toBe<EmergencyLevel>('high');
  });

  // Urgent
  test('returns urgent for broken boiler', () => {
    expect(getEmergencyLevel('The boiler broken down this morning')).toBe<EmergencyLevel>('urgent');
  });

  test('returns urgent for boiler not working', () => {
    expect(getEmergencyLevel('My boiler not working since yesterday')).toBe<EmergencyLevel>('urgent');
  });

  test('returns urgent for no hot water', () => {
    expect(getEmergencyLevel('We have no hot water coming through')).toBe<EmergencyLevel>('urgent');
  });

  test('returns urgent for blocked drain', () => {
    expect(getEmergencyLevel('The drain blocked and the sink is full')).toBe<EmergencyLevel>('urgent');
  });

  test('returns urgent for toilet blocked', () => {
    expect(getEmergencyLevel('Our toilet blocked and is overflowing')).toBe<EmergencyLevel>('urgent');
  });

  test('returns urgent for water leak', () => {
    expect(getEmergencyLevel('There is a water leak under the kitchen units')).toBe<EmergencyLevel>('urgent');
  });

  // None
  test('returns none for routine boiler service', () => {
    expect(getEmergencyLevel('I would like to book an annual boiler service')).toBe<EmergencyLevel>('none');
  });

  test('returns none for general quote', () => {
    expect(getEmergencyLevel('Can you give me a quote for a new radiator')).toBe<EmergencyLevel>('none');
  });

  test('returns none for empty string', () => {
    expect(getEmergencyLevel('')).toBe<EmergencyLevel>('none');
  });

  // Priority ordering
  test('critical takes priority over high when both keywords present', () => {
    expect(getEmergencyLevel('There is a gas leak and also flooding throughout the house')).toBe<EmergencyLevel>('critical');
  });

  test('high takes priority over urgent when both keywords present', () => {
    expect(getEmergencyLevel('We have burst pipe and also no hot water')).toBe<EmergencyLevel>('high');
  });

  // Case insensitivity
  test('is case-insensitive for all levels', () => {
    expect(getEmergencyLevel('GAS LEAK UPSTAIRS')).toBe<EmergencyLevel>('critical');
    expect(getEmergencyLevel('BURST PIPE IN THE LOFT')).toBe<EmergencyLevel>('high');
    expect(getEmergencyLevel('BOILER NOT WORKING')).toBe<EmergencyLevel>('urgent');
  });
});
