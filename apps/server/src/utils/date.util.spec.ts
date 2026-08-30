import { getNextDate } from './date.util.js';

describe('date util', () => {
  it('returns the next yyyy-mm-dd date', () => {
    expect(getNextDate('2026-08-21')).toBe('2026-08-22');
  });
});
