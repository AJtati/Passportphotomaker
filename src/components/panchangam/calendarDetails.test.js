import { calculateHoras, calculateSolarTimings, enrichPanchangamDays } from './calendarDetails';

const name = (en, number) => ({ te: en, en, number });

describe('detailed calendar timing calculations', () => {
  test('derives Saturday Durmuhurtham and Abhijit from location-based sunrise and sunset', () => {
    const result = calculateSolarTimings({
      date: '2026-08-01',
      sunrise: '2026-08-01T06:00:00Z',
      sunset: '2026-08-01T18:00:00Z',
      vara: name('Saturday', 6),
    }, { sunrise: '2026-08-02T06:00:00Z' });

    expect(result.durmuhurtham).toEqual([{
      start: '2026-08-01T07:36:00.000Z',
      end: '2026-08-01T08:24:00.000Z',
    }]);
    expect(result.abhijitMuhurtam).toEqual({
      start: '2026-08-01T11:36:00.000Z',
      end: '2026-08-01T12:24:00.000Z',
    });
  });

  test('derives Varjyam and Amrita Gadiya from the actual Nakshatra duration', () => {
    const base = {
      sunrise: '2026-08-01T06:00:00Z',
      sunset: '2026-08-01T18:00:00Z',
      vara: name('Saturday', 6),
      tithi: name('Tritiya', 18),
      moonPhase: { phase: 0.5 },
    };
    const days = [
      { ...base, date: '2026-07-31', nakshatra: { ...name('Revati', 27), endsAt: '2026-08-01T00:00:00Z' } },
      { ...base, date: '2026-08-01', nakshatra: { ...name('Ashwini', 1), endsAt: '2026-08-02T00:00:00Z' } },
      { ...base, date: '2026-08-02', nakshatra: { ...name('Bharani', 2), endsAt: '2026-08-03T00:00:00Z' } },
    ];

    const [result] = enrichPanchangamDays(days, ['2026-08-01'], 'UTC');

    expect(result.varjyam).toContainEqual({
      start: '2026-08-01T20:00:00.000Z',
      end: '2026-08-01T21:36:00.000Z',
    });
    expect(result.amritaGadiya).toContainEqual({
      start: '2026-08-01T16:48:00.000Z',
      end: '2026-08-01T18:24:00.000Z',
    });
  });

  test('creates 12 day and 12 night Horas from local solar boundaries', () => {
    const saturday = {
      date: '2026-08-01',
      sunrise: '2026-08-01T06:00:00.000Z',
      sunset: '2026-08-01T18:00:00.000Z',
      vara: { number: 6 },
    };
    const sunday = { sunrise: '2026-08-02T06:00:00.000Z' };

    const horas = calculateHoras(saturday, sunday);

    expect(horas).toHaveLength(24);
    expect(horas[0]).toMatchObject({ number: 1, period: 'day', planetKey: 'saturn', start: saturday.sunrise, end: '2026-08-01T07:00:00.000Z' });
    expect(horas[11]).toMatchObject({ number: 12, period: 'day', planetKey: 'venus', end: saturday.sunset });
    expect(horas[12]).toMatchObject({ number: 13, period: 'night', planetKey: 'mercury', start: saturday.sunset });
    expect(horas[23].end).toBe(sunday.sunrise);
  });

  test('returns no Horas when the next sunrise is unavailable', () => {
    expect(calculateHoras({ sunrise: '2026-08-01T06:00:00Z', sunset: '2026-08-01T18:00:00Z' })).toEqual([]);
  });
});
