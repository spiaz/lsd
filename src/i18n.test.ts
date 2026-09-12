import { describe, expect, it } from 'vitest';
import { statusLabel, translate, translator } from './i18n';
import { formatDate } from './domain/time';

describe('internationalisation', () => {
  it('interpolates translated values', () => expect(translate('de', 'calendar.coverage', { start: 'A', end: 'B' })).toBe('Dienstplan vom A bis B'));
  it('localises dates and statuses', () => {
    expect(formatDate('2026-10-01', { month: 'long', year: 'numeric' }, 'en')).toBe('October 2026');
    expect(statusLabel('compensatory-rest', 'it')).toBe('Riposo compensativo');
  });
  it('keeps French as the translation API default at call sites', () => expect(translator('fr')('calendar.today')).toBe('Aujourd’hui'));
});
