import { getNextDate, isDateBeforeOrEqual } from './date.util.js';

describe('date util', () => {
  it('returns the next yyyy-mm-dd date', () => {
    expect(getNextDate('2026-08-21')).toBe('2026-08-22');
  });

  it('allows dates when the left date is before or equal to the right date', () => {
    expect(isDateBeforeOrEqual('2026-08-27', '2026-08-27')).toBe(true);
    expect(isDateBeforeOrEqual('2026-08-26', '2026-08-27')).toBe(true);
    expect(isDateBeforeOrEqual('2026-08-28', '2026-08-27')).toBe(false);
  });
});
