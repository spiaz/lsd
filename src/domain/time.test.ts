import { describe, expect, it } from 'vitest';
import { normalizeOperationalTime } from './time';

describe('normalizeOperationalTime', () => {
  it('keeps a same-day time unchanged', () => {
    expect(normalizeOperationalTime('06:45')).toEqual({
      dayOffset: 0,
      hours: 6,
      minutes: 45,
      display: '06:45',
    });
  });

  it('normalizes an operational time after midnight', () => {
    expect(normalizeOperationalTime('25:31')).toEqual({
      dayOffset: 1,
      hours: 1,
      minutes: 31,
      display: '01:31 (+1)',
    });
  });
});
