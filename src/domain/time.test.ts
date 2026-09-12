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

describe('invalid operational times', () => {
  it.each(['12:60', '48:00', '-1:20', '12.30', '', 'abc'])('rejects %s', value => expect(() => normalizeOperationalTime(value)).toThrow());
  it('accepts midnight and preserves next-day offset', () => expect(normalizeOperationalTime('24:00').display).toBe('00:00 (+1)'));
});
