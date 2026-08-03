import { calculateHoroscope } from '../horoscope/horoscopeCalculator';
import { calculateMarriageMatch, calculateMarriageMatchFromCharts } from './marriageCalculator';

const london = { name: 'London, United Kingdom', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' };
const nakrekal = { name: 'Nakrekal, Telangana, India', lat: 17.1647, lng: 79.4275, tz: 'Asia/Kolkata' };

const person = (name, birthDate, birthTime, city) => ({ name, birthDate, birthTime, city, timeAccuracy: 'exact' });

describe('marriage horoscope matching', () => {
  test('keeps South Indian Porutham and Ashtakoota as independent systems', () => {
    const report = calculateMarriageMatch({
      groom: person('Person A', '1994-06-04', '19:30', nakrekal),
      bride: person('Person B', '1997-08-14', '10:20', london),
    });

    expect(report.poruthams).toHaveLength(10);
    expect(report.southMax).toBe(10);
    expect(report.ashtakoota.factors).toHaveLength(8);
    expect(report.ashtakoota.max).toBe(36);
    expect(report.ashtakoota.total).toBeGreaterThanOrEqual(0);
    expect(report.ashtakoota.total).toBeLessThanOrEqual(36);
    report.ashtakoota.factors.forEach((factor) => {
      expect(factor.groomValue.en).toBeTruthy();
      expect(factor.brideValue.en).toBeTruthy();
      expect(factor.summary.en).toBeTruthy();
      expect(factor.summary.te).toBeTruthy();
    });
    expect(report.recommendation.title.en).toBeTruthy();
    expect(report.diagnosticsSummary.en).toBeTruthy();
    expect(report.outlook).toHaveLength(6);
    report.outlook.forEach((chapter) => {
      expect(chapter.evidence.en).toBeTruthy();
      expect(chapter.reading.en).toBeTruthy();
    });
  });

  test('shows evidence and the exact rule for every Porutham', () => {
    const groom = calculateHoroscope(person('A', '1994-06-04', '19:30', nakrekal));
    const bride = calculateHoroscope(person('B', '1996-12-22', '06:45', london));
    const report = calculateMarriageMatchFromCharts(groom, bride);

    report.poruthams.forEach((item) => {
      expect(item.name.te).toBeTruthy();
      expect(item.name.en).toBeTruthy();
      expect(item.evidence.te).toBeTruthy();
      expect(item.rule.en).toBeTruthy();
      expect(item.summary.en).toBeTruthy();
      expect(item.summary.te).toBeTruthy();
      expect(typeof item.passed).toBe('boolean');
    });
    expect(report.poruthams.filter((item) => item.importance === 'critical').map((item) => item.key)).toEqual(['rajju', 'vedha']);
  });

  test('compares Kuja placements from Lagna, Moon and Venus without hiding the convention', () => {
    const report = calculateMarriageMatch({
      groom: person('A', '1994-06-04', '19:30', nakrekal),
      bride: person('B', '1996-12-22', '06:45', london),
    });
    expect(report.papaSamyam.groom.placements).toHaveLength(12);
    expect(report.papaSamyam.bride.placements).toHaveLength(12);
    expect(report.papaSamyam.groom.convention).toContain('Mars, Saturn, Rahu and Sun');

    ['groom', 'bride'].forEach((side) => {
      expect(Object.keys(report.kuja[side].houses)).toEqual(['lagna', 'moon', 'venus']);
      expect(report.kuja[side].convention).toContain('1, 2, 4, 7, 8, 12');
      expect(report.kuja[side].intensity).toBeGreaterThanOrEqual(0);
      expect(report.kuja[side].intensity).toBeLessThanOrEqual(3);
    });
  });

  test('uses each historical timezone independently', () => {
    const report = calculateMarriageMatch({
      groom: person('A', '1994-06-04', '19:30', nakrekal),
      bride: person('B', '1996-07-22', '19:30', london),
    });

    expect(report.groom.timezone.offset).toBe('+05:30');
    expect(report.bride.timezone.offset).toBe('+01:00');
    expect(report.bride.timezone.isDst).toBe(true);
  });

  test('retains chart-level seventh-house and Dasha Sandhi evidence', () => {
    const report = calculateMarriageMatch({
      groom: person('A', '1994-06-04', '19:30', nakrekal),
      bride: person('B', '1996-12-22', '06:45', london),
    });

    expect(report.indicators.groom.seventhLord).toBeTruthy();
    expect(report.indicators.bride.venusHouse).toBeGreaterThanOrEqual(1);
    expect(report.dashaSandhi.closest.days).toBeGreaterThanOrEqual(0);
    expect(report.dashaSandhi.rule.en).toContain('365 days');
  });
});
