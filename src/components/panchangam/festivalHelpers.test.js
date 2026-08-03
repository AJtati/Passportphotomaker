import { festivalsFromMonth, groupFestivalsByMonth, normalizeFestivals } from './festivalHelpers';

describe('festival helpers', () => {
  test('flattens month festivals, removes duplicates and sorts by date', () => {
    const result = festivalsFromMonth({ days: [
      { date: '2026-08-15', festivals: [{ en: 'Festival B', te: 'బి' }] },
      { date: '2026-08-02', festivals: [{ en: 'Festival A', te: 'ఎ' }, { en: 'Festival A', te: 'ఎ' }] },
    ] });

    expect(result.map((festival) => `${festival.date}:${festival.en}`)).toEqual([
      '2026-08-02:Festival A',
      '2026-08-15:Festival B',
    ]);
  });

  test('groups normalized annual festivals by month', () => {
    const groups = groupFestivalsByMonth(normalizeFestivals([
      { date: '2026-09-01', en: 'September festival' },
      { date: '2026-08-01', en: 'August festival' },
    ]));

    expect(groups[8][0].en).toBe('August festival');
    expect(groups[9][0].en).toBe('September festival');
  });
});
