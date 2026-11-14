import { describe, it, expect } from 'vitest';
import { makeIcs } from './reminder';
describe('rappel quotidien (.ics)', () => {
  it('événement récurrent quotidien à l’heure choisie, avec alarme', () => {
    const ics = makeIcs('07:45', 20, new Date(2026, 10, 14));
    expect(ics).toContain('DTSTART:20261114T074500'); expect(ics).toContain('RRULE:FREQ=DAILY'); expect(ics).toContain('DURATION:PT20M'); expect(ics).toContain('BEGIN:VALARM');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR'); expect(ics.endsWith('END:VCALENDAR')).toBe(true);
  });
});
