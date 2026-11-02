import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'scheduling-tests-only-secret-at-least-32-characters';
const { generateSlots } = await import('../src/services/scheduling.service.js');

describe('clinic slot generation', () => {
  it('uses the clinic local date rather than the server timezone, across DST seasons', () => {
    const hours = [{ dayOfWeek: 0, start: '08:00', end: '09:00' }];
    const winter = generateSlots('2027-01-03', hours, 20);
    const summer = generateSlots('2027-07-04', hours, 20);
    expect(winter).toHaveLength(3);
    expect(summer).toHaveLength(3);
    expect(winter[0].startAt).toBe('2027-01-03T06:00:00.000Z');
    expect(summer[0].startAt).toBe('2027-07-04T05:00:00.000Z');
    for (const slot of [...winter, ...summer]) {
      expect(DateTime.fromISO(slot.startAt).setZone('Asia/Jerusalem').hour).toBe(8);
      expect(
        DateTime.fromISO(slot.endAt).toMillis() - DateTime.fromISO(slot.startAt).toMillis(),
      ).toBe(20 * 60_000);
    }
  });
  it('respects breaks, closed weekdays and incomplete final slots', () => {
    const hours = [
      { dayOfWeek: 0, start: '08:00', end: '08:50' },
      { dayOfWeek: 0, start: '10:00', end: '10:20' },
    ];
    const slots = generateSlots('2027-01-03', hours, 20);
    expect(slots).toHaveLength(3);
    expect(
      slots.map((slot) =>
        DateTime.fromISO(slot.startAt).setZone('Asia/Jerusalem').toFormat('HH:mm'),
      ),
    ).toEqual(['08:00', '08:20', '10:00']);
    expect(generateSlots('2027-01-04', hours, 20)).toEqual([]);
  });
});
