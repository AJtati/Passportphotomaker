import { calculateHoroscope } from './horoscopeCalculator';
import { buildAdvancedHoroscope, divisionalSignFor } from './horoscopeAdvanced';

const city = { name: 'Nakrekal, Telangana, India', lat: 17.1647, lng: 79.4275, tz: 'Asia/Kolkata' };

describe('advanced Parashara horoscope tables', () => {
  test('uses traditional Hora and Trimsamsha boundaries', () => {
    expect(divisionalSignFor(4.99, 2)).toBe(4);
    expect(divisionalSignFor(15, 2)).toBe(3);
    expect(divisionalSignFor(30.1, 2)).toBe(3);
    expect(divisionalSignFor(45, 2)).toBe(4);
    expect(divisionalSignFor(4.99, 30)).toBe(0);
    expect(divisionalSignFor(5.01, 30)).toBe(10);
    expect(divisionalSignFor(35.01, 30)).toBe(5);
  });

  test('anchors traditional D60 parts to the occupied Rashi', () => {
    expect(divisionalSignFor(0.1, 60)).toBe(0);
    expect(divisionalSignFor(30.1, 60)).toBe(1);
    expect(divisionalSignFor(30.6, 60)).toBe(2);
  });

  test('builds the complete visible advanced report without unvalidated classical scores', () => {
    const report = calculateHoroscope({ name: 'Test Person', birthDate: '1994-06-04', birthTime: '19:30', city, timeAccuracy: 'exact' });
    const advanced = buildAdvancedHoroscope(report);
    expect(advanced.vargas.map((item) => item.division)).toEqual([1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]);
    expect(advanced.bhavaTable).toHaveLength(12);
    expect(advanced.navTara).toHaveLength(9);
    expect(advanced.friendships).toHaveLength(7);
    expect(advanced.predictions).toHaveLength(11);
    expect(advanced.disclaimer.en).toContain('not classical Shadbala');
  });
});
