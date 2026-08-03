import { calculateSpecialYogas, getSpecialYogasForCombination } from './specialYogaCalculator';

const keys = (weekday, nakshatra) =>
  getSpecialYogasForCombination(weekday, nakshatra).map((yoga) => yoga.key);

describe('traditional Vara–Nakshatra special yogas', () => {
  test.each([
    [0, 12], [1, 4], [2, 0], [3, 16], [4, 7], [5, 26], [6, 3],
  ])('recognises the seven Amrita Siddhi combinations', (weekday, nakshatra) => {
    expect(keys(weekday, nakshatra)).toContain('amrita-siddhi');
  });

  test('returns every Yoga active during Thursday Pushya', () => {
    expect(keys(4, 7)).toEqual(['amrita-siddhi', 'guru-pushya', 'sarvartha-siddhi']);
  });

  test('keeps Ravi Pushya separate from Guru Pushya', () => {
    expect(keys(0, 7)).toEqual(['ravi-pushya', 'sarvartha-siddhi']);
    expect(keys(4, 7)).not.toContain('ravi-pushya');
  });

  test('clips a matching Nakshatra to the local sunrise day', () => {
    const day = {
      date: '2026-08-16',
      sunrise: '2026-08-16T00:49:00.000Z',
      vara: { number: 0, te: 'ఆదివారం', en: 'Sunday' },
    };
    const yogas = calculateSpecialYogas(day, { sunrise: '2026-08-17T00:49:00.000Z' });
    const amrita = yogas.find((yoga) => yoga.key === 'amrita-siddhi');

    expect(amrita).toBeDefined();
    expect(amrita.nakshatra.en).toBe('Hasta');
    expect(new Date(amrita.start).getTime()).toBeGreaterThanOrEqual(new Date(day.sunrise).getTime());
    expect(new Date(amrita.end).getTime()).toBeLessThanOrEqual(new Date('2026-08-17T00:49:00.000Z').getTime());
    expect(Math.abs(new Date(amrita.end).getTime() - new Date('2026-08-16T22:20:00.000Z').getTime())).toBeLessThan(60000);
    expect(amrita.basis.en).toBe('Sunday + Hasta');
  });

  test('returns no result when the next sunrise is unavailable', () => {
    expect(calculateSpecialYogas({ sunrise: '2026-08-16T00:49:00Z', vara: { number: 0 } })).toEqual([]);
  });
});
