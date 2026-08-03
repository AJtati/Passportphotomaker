import {
  buildScoreLedger,
  calculateChandrabala,
  calculatePersonalShubhaYoga,
  calculateTarabala,
  intersectRanges,
  selectQualifiedCandidates,
  subtractForbiddenRanges,
} from './muhurthamCalculator';
import { DateTime } from 'luxon';
import { calculateHoras } from '../panchangam/calendarDetails';
import { calculateLagnasForCivilDate } from '../panchangam/lagnaCalculator';

describe('Personal Muhurtham calculations', () => {
  test('classifies the inclusive Nava Tara cycle', () => {
    expect(calculateTarabala(0, 0)).toMatchObject({ key: 'janma', count: 1, cyclePosition: 1, janmaNakshatraNumber: 1, eventNakshatraNumber: 1 });
    expect(calculateTarabala(0, 1)).toMatchObject({ key: 'sampat', count: 2, tone: 'strong' });
    expect(calculateTarabala(0, 2)).toMatchObject({ key: 'vipat', count: 3, tone: 'avoid' });
    expect(calculateTarabala(0, 10)).toMatchObject({ key: 'sampat', count: 11 });
    expect(calculateTarabala(25, 0)).toMatchObject({ key: 'vipat', count: 3, cyclePosition: 3, janmaNakshatraNumber: 26, eventNakshatraNumber: 1 });
    expect(calculateTarabala(26, 25)).toMatchObject({ key: 'parama-mitra', count: 27, cyclePosition: 9 });
  });

  test('calculates Chandra Bala from the natal Moon sign', () => {
    expect(calculateChandrabala(0, 2)).toMatchObject({ house: 3, tone: 'good', janmaRashiNumber: 1, eventRashiNumber: 3 });
    expect(calculateChandrabala(0, 7)).toMatchObject({ house: 8, tone: 'avoid' });
    expect(calculateChandrabala(10, 8)).toMatchObject({ house: 11, tone: 'good' });
  });

  test('preserves every score component and applies the transparent blocking cap', () => {
    const components = [
      { key: 'baseline', value: 38 }, { key: 'personal', value: 35 },
      { key: 'panchanga', value: 41 }, { key: 'event-chart', value: 7 },
    ];
    expect(buildScoreLedger(components, 0)).toMatchObject({
      components, rawScore: 121, blockingCap: 100, finalAdjustment: -21, finalScore: 100,
    });
    expect(buildScoreLedger(components, 2)).toMatchObject({
      rawScore: 121, blockingCount: 2, blockingCap: 64, finalAdjustment: -57, finalScore: 64,
    });
  });

  test('finds the exact Hora and Lagna overlap from the astrologer example', () => {
    const range = intersectRanges(
      { start: '2026-08-30T03:28:00Z', end: '2026-08-30T04:19:00Z' },
      { start: '2026-08-30T04:03:00Z', end: '2026-08-30T06:45:00Z' },
    );
    expect(range).toEqual({
      start: '2026-08-30T04:03:00.000Z',
      end: '2026-08-30T04:19:00.000Z',
    });
  });

  test('removes prohibited periods without losing safe boundary windows', () => {
    const safe = subtractForbiddenRanges(
      { start: '2026-08-30T04:00:00Z', end: '2026-08-30T05:00:00Z' },
      [{ start: '2026-08-30T04:20:00Z', end: '2026-08-30T04:35:00Z' }],
    );
    expect(safe).toEqual([
      { start: '2026-08-30T04:00:00.000Z', end: '2026-08-30T04:20:00.000Z' },
      { start: '2026-08-30T04:35:00.000Z', end: '2026-08-30T05:00:00.000Z' },
    ]);
  });

  test('returns every distinct window scoring 50 or above without a twelve-result cap', () => {
    const candidates = Array.from({ length: 18 }, (_, index) => ({
      id: `window-${index}`,
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      start: `2026-08-${String(index + 1).padStart(2, '0')}T04:00:00Z`,
      lagna: { key: index % 2 ? 'simha' : 'vrishabha' },
      score: 67 - index,
      blockingCount: index % 3,
    }));

    const selected = selectQualifiedCandidates(candidates, 50);
    expect(selected).toHaveLength(18);
    expect(Math.min(...selected.map((candidate) => candidate.score))).toBe(50);
    expect(selectQualifiedCandidates([...candidates, { ...candidates[0], id: 'below', score: 49 }], 50)).toHaveLength(18);
  });

  test('keeps every qualified window when the search is limited to one day', () => {
    const candidates = Array.from({ length: 16 }, (_, index) => ({
      id: `one-day-window-${index}`,
      date: '2026-08-30',
      start: `2026-08-30T${String(Math.floor(index / 2) + 4).padStart(2, '0')}:${index % 2 ? '30' : '00'}:00Z`,
      lagna: { key: index % 2 ? 'simha' : 'vrishabha' },
      score: 80 - index,
      blockingCount: 0,
    }));

    expect(selectQualifiedCandidates(candidates, 50)).toHaveLength(16);
  });

  test('audits the cited Middlesbrough Guru Hora and Simha Lagna with explicit engine timings', () => {
    const city = { lat: 54.5742, lng: -1.235, tz: 'Europe/London' };
    const previousDay = {
      date: '2026-08-29', vara: { number: 6 },
      sunrise: '2026-08-29T06:07:34+01:00', sunset: '2026-08-29T20:07:24+01:00',
    };
    const selectedDay = { date: '2026-08-30', sunrise: '2026-08-30T06:09:23+01:00' };
    const guruHora = calculateHoras(previousDay, selectedDay).find((hora) =>
      hora.planetKey === 'jupiter'
      && DateTime.fromISO(hora.start, { zone: city.tz }).toISODate() === selectedDay.date
    );
    const simha = calculateLagnasForCivilDate('2026-08-30', city).find((lagna) => lagna.key === 'simha');
    const overlap = intersectRanges(guruHora, simha);
    const local = (value) => DateTime.fromISO(value, { zone: city.tz }).toFormat('HH:mm');

    expect(local(guruHora.start)).toBe('04:29');
    expect(local(guruHora.end)).toBe('05:19');
    expect(local(simha.start)).toBe('04:59');
    expect(local(overlap.start)).toBe('04:59');
    expect(local(overlap.end)).toBe('05:19');
  });
});

describe('personal Shubha suitability', () => {
  const fit = {
    tara: { key: 'sampat', tone: 'strong', name: { te: 'సంపత్ తార', en: 'Sampat Tara' } },
    chandra: { house: 3, tone: 'good', name: { te: 'అనుకూలం', en: 'Supportive' } },
    hora: { score: 10 },
  };

  test('marks a named auspicious Yoga plus strong personal factors as excellent', () => {
    expect(calculatePersonalShubhaYoga(fit, [{ key: 'amrita-siddhi' }], true).tone).toBe('excellent');
  });

  test('does not override a classical personal blocker', () => {
    const blocked = { ...fit, tara: { ...fit.tara, key: 'vipat', tone: 'avoid' } };
    expect(calculatePersonalShubhaYoga(blocked, [{ key: 'amrita-siddhi' }], true).tone).toBe('unsuitable');
  });
});
