import {
  bilingual,
  formatCivilHoraRange,
  formatRanges,
  formatShortRange,
  getTimeZoneDetails,
  horasForCivilDate,
  monthFromDate,
  replaceYear,
  shiftMonth,
  specialYogasForCivilDate,
} from './helpers';

describe('Panchangam helpers', () => {
  test('selects Telugu, English, or bilingual names', () => {
    const value = { te: 'విదియ', en: 'Dwitiya' };
    expect(bilingual(value, 'te')).toBe('విదియ');
    expect(bilingual(value, 'en')).toBe('Dwitiya');
    expect(bilingual(value, 'both')).toBe('విదియ · Dwitiya');
  });

  test('moves between years while navigating months', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  test('extracts the visible calendar month without UTC drift', () => {
    expect(monthFromDate('2026-07-31')).toEqual({ year: 2026, month: 7 });
  });

  test('preserves the selected month and clamps leap day when changing years', () => {
    expect(replaceYear('2026-07-31', 2030)).toBe('2030-07-31');
    expect(replaceYear('2028-02-29', 2029)).toBe('2029-02-28');
  });

  test('formats dense calendar timing ranges in the selected timezone', () => {
    const range = { start: '2026-08-01T04:30:00.000Z', end: '2026-08-01T05:45:00.000Z' };
    expect(formatShortRange(range, 'Asia/Kolkata')).toBe('10:00–11:15');
    expect(formatRanges([range, range], 'Asia/Kolkata', true)).toBe('10:00–11:15 · 10:00–11:15');
    expect(formatShortRange(range, 'Asia/Kolkata', '2026-07-31')).toBe('10:00+–11:15+');
  });

  test('uses the official local timezone and date-specific daylight-saving offset', () => {
    expect(getTimeZoneDetails('Europe/London', '2026-08-01T12:00:00Z')).toEqual({
      abbreviation: 'BST', offset: 'UTC+1', label: 'British Summer Time (BST) · UTC+1',
    });
    expect(getTimeZoneDetails('Europe/London', '2026-01-01T12:00:00Z')).toEqual({
      abbreviation: 'GMT', offset: 'UTC', label: 'Greenwich Mean Time (GMT) · UTC',
    });
    expect(getTimeZoneDetails('Asia/Kolkata', '2026-08-01T12:00:00Z')).toEqual({
      abbreviation: 'IST', offset: 'UTC+5:30', label: 'India Standard Time (IST) · UTC+5:30',
    });
  });

  test('shows only Horas within the selected midnight-to-midnight calendar date', () => {
    const previousHoras = [
      { planetKey: 'moon', start: '2026-07-31T23:30:00Z', end: '2026-08-01T00:30:00Z' },
      { planetKey: 'mars', start: '2026-07-31T22:00:00Z', end: '2026-07-31T23:00:00Z' },
    ];
    const horas = [
      { planetKey: 'sun', start: '2026-08-01T05:00:00Z', end: '2026-08-01T06:00:00Z' },
      { planetKey: 'venus', start: '2026-08-01T23:30:00Z', end: '2026-08-02T00:30:00Z' },
      { planetKey: 'saturn', start: '2026-08-02T00:30:00Z', end: '2026-08-02T01:30:00Z' },
    ];
    const result = horasForCivilDate(previousHoras, horas, '2026-08-01', 'UTC');

    expect(result.map((hora) => hora.planetKey)).toEqual(['moon', 'sun', 'venus']);
    expect(formatCivilHoraRange(result[0], 'UTC', '2026-08-01')).toEqual({
      from: '11:30 PM', to: '12:30 AM', fromDate: '31 Jul', toDate: '',
    });
    expect(formatCivilHoraRange(result[2], 'UTC', '2026-08-01')).toEqual({
      from: '11:30 PM', to: '12:30 AM', fromDate: '', toDate: '2 Aug',
    });
  });

  test('includes Special Yogas from both Panchang days that touch a civil date', () => {
    const previousYogas = [
      { key: 'amrita-siddhi', start: '2026-07-31T23:30:00Z', end: '2026-08-01T05:00:00Z' },
      { key: 'outside', start: '2026-07-31T10:00:00Z', end: '2026-07-31T11:00:00Z' },
    ];
    const yogas = [
      { key: 'sarvartha-siddhi', start: '2026-08-01T18:00:00Z', end: '2026-08-02T05:00:00Z' },
    ];

    expect(specialYogasForCivilDate(previousYogas, yogas, '2026-08-01', 'UTC').map((yoga) => yoga.key))
      .toEqual(['amrita-siddhi', 'sarvartha-siddhi']);
  });
});
