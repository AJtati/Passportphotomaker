const festivalKey = (festival) => `${festival.date || ''}:${festival.en || festival.te || ''}`;

export const normalizeFestivals = (festivals = []) => {
  const seen = new Set();
  return festivals
    .filter((festival) => festival?.date && (festival.en || festival.te))
    .filter((festival) => {
      const key = festivalKey(festival);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.date.localeCompare(right.date));
};

export const festivalsFromMonth = (monthData) => normalizeFestivals(
  (monthData?.days || []).flatMap((day) =>
    (day.festivals || []).map((festival) => ({ ...festival, date: festival.date || day.date })))
);

export const groupFestivalsByMonth = (festivals = []) => normalizeFestivals(festivals).reduce((groups, festival) => {
  const month = Number(festival.date.slice(5, 7));
  if (!groups[month]) groups[month] = [];
  groups[month].push(festival);
  return groups;
}, {});
