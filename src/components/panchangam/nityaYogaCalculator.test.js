import { calculateNityaYogasForCivilDate } from './nityaYogaCalculator';

describe('Nitya Yoga calculations', () => {
  test('matches the published Lahiri Yoga transition for 2 August 2026', () => {
    const yogas = calculateNityaYogasForCivilDate('2026-08-02', { tz: 'Europe/London' });
    const atiganda = yogas.find((yoga) => yoga.name.en === 'Atiganda');

    expect(atiganda).toBeDefined();
    expect(atiganda.number).toBe(6);
    expect(Math.abs(new Date(atiganda.end).getTime() - new Date('2026-08-02T16:59:20Z').getTime()))
      .toBeLessThan(60000);
  });

  test('keeps complete boundaries outside the selected calendar date', () => {
    const yogas = calculateNityaYogasForCivilDate('2026-08-02', { tz: 'Europe/London' });
    const startOfDate = new Date('2026-08-01T23:00:00Z').getTime();
    const endOfDate = new Date('2026-08-02T23:00:00Z').getTime();

    expect(new Date(yogas[0].start).getTime()).toBeLessThan(startOfDate);
    expect(new Date(yogas[yogas.length - 1].end).getTime()).toBeGreaterThan(endOfDate);
  });
});
