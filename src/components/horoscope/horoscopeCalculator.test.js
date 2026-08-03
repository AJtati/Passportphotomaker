import {
  calculateHoroscope,
  calculateVimshottari,
  detectYogas,
  navamsaSignFor,
  resolveBirthInstant,
} from './horoscopeCalculator';
import { buildHoroscopeInsights } from './horoscopeInterpretations';

const london = {
  name: 'London, England, United Kingdom',
  lat: 51.5074,
  lng: -0.1278,
  tz: 'Europe/London',
};

describe('South Indian horoscope calculations', () => {
  test('uses the historical civil offset and matches the verified Lahiri Lagna boundary', () => {
    const report = calculateHoroscope({
      name: 'Reference chart',
      birthDate: '2026-07-27',
      birthTime: '04:30',
      city: london,
    });

    expect(report.instant).toBe('2026-07-27T03:30:00.000Z');
    expect(report.timezone.offset).toBe('+01:00');
    expect(report.timezone.isDst).toBe(true);
    expect(report.ascendant.rashi.key).toBe('karkataka');
    expect(report.planets).toHaveLength(9);
  });

  test('surfaces both offsets when a DST clock time occurs twice', () => {
    const resolved = resolveBirthInstant({
      birthDate: '2026-10-25',
      birthTime: '01:30',
      timezone: 'Europe/London',
    });

    expect(resolved.possibleOffsets).toHaveLength(2);
    expect(new Set(resolved.possibleOffsets.map((item) => item.offset))).toEqual(new Set([0, 60]));
  });

  test('maps movable, fixed and dual signs to the correct Navamsa starts', () => {
    expect(navamsaSignFor(1)).toBe(0);
    expect(navamsaSignFor(31)).toBe(9);
    expect(navamsaSignFor(61)).toBe(6);
  });

  test('builds a continuous Vimshottari life sequence from the birth balance', () => {
    const birth = new Date('2000-01-01T00:00:00Z');
    const schedule = calculateVimshottari(birth, 0);

    expect(schedule.periods[0].lord.key).toBe('ketu');
    schedule.periods.slice(1).forEach((period, index) => {
      expect(period.start).toBe(schedule.periods[index].end);
    });
    expect(new Date(schedule.periods.at(-1).end).getTime()).toBeGreaterThanOrEqual(
      birth.getTime() + 119.9 * 365.2425 * 86400000
    );
    schedule.periods.forEach((period) => period.antardashas.forEach((antardasha) => {
      expect(antardasha.pratyantardashas).toHaveLength(9);
      expect(antardasha.pratyantardashas[0].start).toBe(antardasha.start);
      expect(antardasha.pratyantardashas.at(-1).end).toBe(antardasha.end);
      antardasha.pratyantardashas.slice(1).forEach((subperiod, index) => {
        expect(subperiod.start).toBe(antardasha.pratyantardashas[index].end);
      });
    }));
  });

  test('builds evidence-linked readings for every house, planet and life area', () => {
    const report = calculateHoroscope({
      name: 'Interpretation reference', birthDate: '1994-06-04', birthTime: '19:30', city: london,
    });
    const insights = buildHoroscopeInsights(report);

    expect(insights.houseReadings).toHaveLength(12);
    expect(insights.planetReadings).toHaveLength(9);
    expect(insights.lifeAreas).toHaveLength(8);
    expect(insights.houseReadings.every((reading) => reading.evidence.en && reading.reading.te && reading.plain.en && reading.plain.te)).toBe(true);
    expect(insights.planetReadings.every((reading) => reading.plain.en && reading.plain.te)).toBe(true);
    expect(insights.lifeAreas.every((reading) => reading.plain.en && reading.plain.te)).toBe(true);
    expect(insights.activePeriods.mahadasha).toBeTruthy();
    expect(insights.activePeriods.antardasha).toBeTruthy();
    expect(insights.activePeriods.pratyantara).toBeTruthy();
  });

  test('detects only the explicitly implemented classical yoga rules', () => {
    const base = (key, sign, house, dignity = 'neutral') => ({
      key,
      sign,
      house,
      dignity,
      name: { te: key, en: key },
      rashi: { name: { te: String(sign), en: String(sign) } },
    });
    const yogas = detectYogas([
      base('sun', 4, 1), base('moon', 0, 9), base('mars', 0, 9),
      base('mercury', 4, 1), base('jupiter', 3, 12), base('venus', 6, 3),
      base('saturn', 9, 6), base('rahu', 2, 11), base('ketu', 8, 5),
    ]);
    expect(yogas.every((yoga) => yoga.summary.en && yoga.summary.te)).toBe(true);

    expect(yogas.map((yoga) => yoga.key)).toEqual(expect.arrayContaining([
      'gaja-kesari', 'budha-aditya', 'chandra-mangala',
    ]));
  });
});
