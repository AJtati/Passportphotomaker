import { calculateLagnasForCivilDate, calculateLagnasForCivilDates, civilDateBounds, LAGNA_RASHIS } from './lagnaCalculator';
import { formatCivilLagnaRange } from './helpers';

const london = {
  name: 'London, England, United Kingdom',
  lat: 51.5074,
  lng: -0.1278,
  tz: 'Europe/London',
};

describe('Udaya Lagna calculations', () => {
  test('assigns every Rashi its traditional Chara, Sthira, or Dwisvabhava nature', () => {
    expect(Object.fromEntries(LAGNA_RASHIS.map(({ key, nature }) => [key, nature.en]))).toEqual({
      mesha: 'Chara (Movable)',
      vrishabha: 'Sthira (Fixed)',
      mithuna: 'Dwisvabhava (Dual)',
      karkataka: 'Chara (Movable)',
      simha: 'Sthira (Fixed)',
      kanya: 'Dwisvabhava (Dual)',
      tula: 'Chara (Movable)',
      vrischika: 'Sthira (Fixed)',
      dhanu: 'Dwisvabhava (Dual)',
      makara: 'Chara (Movable)',
      kumbha: 'Sthira (Fixed)',
      meena: 'Dwisvabhava (Dual)',
    });
  });

  test('matches Lahiri/Chitra Paksha reference timings for London', () => {
    const lagnas = calculateLagnasForCivilDate('2026-07-27', london);
    const karkataka = lagnas.find((lagna) => lagna.key === 'karkataka');
    const makara = lagnas.find((lagna) => lagna.key === 'makara');

    expect(Math.abs(new Date(karkataka.start).getTime() - Date.parse('2026-07-27T03:29:00Z'))).toBeLessThan(60000);
    expect(Math.abs(new Date(karkataka.end).getTime() - Date.parse('2026-07-27T06:17:00Z'))).toBeLessThan(60000);
    expect(Math.abs(new Date(makara.start).getTime() - Date.parse('2026-07-27T19:20:00Z'))).toBeLessThan(60000);
    expect(Math.abs(new Date(makara.end).getTime() - Date.parse('2026-07-27T20:34:00Z'))).toBeLessThan(60000);
  });

  test.each([
    {
      label: 'Hyderabad (UTC+5:30)',
      city: { name: 'Hyderabad, India', lat: 17.385, lng: 78.4867, tz: 'Asia/Kolkata' },
      expected: {
        karkatakaEnd: '2026-07-27T01:55:00Z',
        makaraStart: '2026-07-27T12:37:00Z',
        makaraEnd: '2026-07-27T14:28:00Z',
      },
    },
    {
      label: 'New York (EDT)',
      city: { name: 'New York, United States', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
      expected: {
        karkatakaEnd: '2026-07-27T11:35:00Z',
        makaraStart: '2026-07-27T23:37:00Z',
        makaraEnd: '2026-07-28T01:08:00Z',
      },
    },
    {
      label: 'Cranbourne (AEST)',
      city: { name: 'Cranbourne, Australia', lat: -38.0996, lng: 145.2834, tz: 'Australia/Melbourne' },
      expected: {
        karkatakaEnd: '2026-07-26T22:28:00Z',
        makaraStart: '2026-07-27T06:31:00Z',
        makaraEnd: '2026-07-27T09:00:00Z',
      },
    },
  ])('matches published local-time references for $label', ({ city, expected }) => {
    const lagnas = calculateLagnasForCivilDate('2026-07-27', city);
    const karkataka = lagnas.find((lagna) => lagna.key === 'karkataka');
    const makara = lagnas.find((lagna) => lagna.key === 'makara');
    const toleranceMs = 2 * 60 * 1000;

    expect(Math.abs(new Date(karkataka.end).getTime() - Date.parse(expected.karkatakaEnd))).toBeLessThan(toleranceMs);
    expect(Math.abs(new Date(makara.start).getTime() - Date.parse(expected.makaraStart))).toBeLessThan(toleranceMs);
    expect(Math.abs(new Date(makara.end).getTime() - Date.parse(expected.makaraEnd))).toBeLessThan(toleranceMs);
  });

  test('supports quarter-hour civil offsets without rounding them', () => {
    const kathmandu = { name: 'Kathmandu, Nepal', lat: 27.7172, lng: 85.324, tz: 'Asia/Kathmandu' };
    const bounds = civilDateBounds('2026-07-27', kathmandu.tz);

    expect(new Date(bounds.start).toISOString()).toBe('2026-07-26T18:15:00.000Z');
    expect(bounds.end - bounds.start).toBe(24 * 60 * 60 * 1000);
    expect(calculateLagnasForCivilDate('2026-07-27', kathmandu).length).toBeGreaterThanOrEqual(12);
  });

  test('uses a 25-hour civil date when British Summer Time ends', () => {
    const bounds = civilDateBounds('2026-10-25', london.tz);
    expect(bounds.end - bounds.start).toBe(25 * 60 * 60 * 1000);

    const lagnas = calculateLagnasForCivilDate('2026-10-25', london);
    expect(lagnas.length).toBeGreaterThanOrEqual(12);
    expect(lagnas.some((lagna) => formatCivilLagnaRange(lagna, london.tz, '2026-10-25').zoneChanged)).toBe(true);
  });

  test('keeps complete intervals that cross the selected midnight boundary', () => {
    const lagnas = calculateLagnasForCivilDate('2026-07-27', london);
    const first = lagnas[0];
    const last = lagnas[lagnas.length - 1];

    expect(new Date(first.start).getTime()).toBeLessThan(civilDateBounds('2026-07-27', london.tz).start);
    expect(new Date(last.end).getTime()).toBeGreaterThan(civilDateBounds('2026-07-27', london.tz).end);
  });

  test('prepares a complete year timetable without missing dates', () => {
    const dates = Array.from({ length: 365 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, index + 1));
      return date.toISOString().slice(0, 10);
    });
    const result = calculateLagnasForCivilDates(dates, london);

    expect(Object.keys(result)).toHaveLength(365);
    expect(Object.values(result).every((lagnas) => lagnas.length >= 12)).toBe(true);
  });
});
