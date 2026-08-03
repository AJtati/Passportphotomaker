import { e_tilt, MakeTime, Observer, SiderealTime } from 'astronomy-engine';
import { DateTime } from 'luxon';

const MINUTE = 60 * 1000;
const SCAN_STEP = 5 * MINUTE;
const MAX_BOUNDARY_SEARCH = 48 * 60 * MINUTE;
const JD_UNIX_EPOCH = 2440587.5;
const JD_J2000 = 2451545;
const DAYS_PER_CENTURY = 36525;
const LAHIRI_J2000_ARCSECONDS = 85885.532;
const NEWCOMB_PRECESSION_RATE = 5029.0966;
const NEWCOMB_QUADRATIC = 1.11161;

export const LAGNA_RASHIS = [
  { key: 'mesha', symbol: '♈', name: { te: 'మేషం', en: 'Mesha' }, lord: { te: 'కుజుడు', en: 'Mars' }, nature: { te: 'చర', en: 'Chara (Movable)' } },
  { key: 'vrishabha', symbol: '♉', name: { te: 'వృషభం', en: 'Vrishabha' }, lord: { te: 'శుక్రుడు', en: 'Venus' }, nature: { te: 'స్థిర', en: 'Sthira (Fixed)' } },
  { key: 'mithuna', symbol: '♊', name: { te: 'మిథునం', en: 'Mithuna' }, lord: { te: 'బుధుడు', en: 'Mercury' }, nature: { te: 'ద్విస్వభావ', en: 'Dwisvabhava (Dual)' } },
  { key: 'karkataka', symbol: '♋', name: { te: 'కర్కాటకం', en: 'Karkataka' }, lord: { te: 'చంద్రుడు', en: 'Moon' }, nature: { te: 'చర', en: 'Chara (Movable)' } },
  { key: 'simha', symbol: '♌', name: { te: 'సింహం', en: 'Simha' }, lord: { te: 'సూర్యుడు', en: 'Sun' }, nature: { te: 'స్థిర', en: 'Sthira (Fixed)' } },
  { key: 'kanya', symbol: '♍', name: { te: 'కన్య', en: 'Kanya' }, lord: { te: 'బుధుడు', en: 'Mercury' }, nature: { te: 'ద్విస్వభావ', en: 'Dwisvabhava (Dual)' } },
  { key: 'tula', symbol: '♎', name: { te: 'తుల', en: 'Tula' }, lord: { te: 'శుక్రుడు', en: 'Venus' }, nature: { te: 'చర', en: 'Chara (Movable)' } },
  { key: 'vrischika', symbol: '♏', name: { te: 'వృశ్చికం', en: 'Vrischika' }, lord: { te: 'కుజుడు', en: 'Mars' }, nature: { te: 'స్థిర', en: 'Sthira (Fixed)' } },
  { key: 'dhanu', symbol: '♐', name: { te: 'ధనుస్సు', en: 'Dhanu' }, lord: { te: 'గురువు', en: 'Jupiter' }, nature: { te: 'ద్విస్వభావ', en: 'Dwisvabhava (Dual)' } },
  { key: 'makara', symbol: '♑', name: { te: 'మకరం', en: 'Makara' }, lord: { te: 'శని', en: 'Saturn' }, nature: { te: 'చర', en: 'Chara (Movable)' } },
  { key: 'kumbha', symbol: '♒', name: { te: 'కుంభం', en: 'Kumbha' }, lord: { te: 'శని', en: 'Saturn' }, nature: { te: 'స్థిర', en: 'Sthira (Fixed)' } },
  { key: 'meena', symbol: '♓', name: { te: 'మీనం', en: 'Meena' }, lord: { te: 'గురువు', en: 'Jupiter' }, nature: { te: 'ద్విస్వభావ', en: 'Dwisvabhava (Dual)' } },
];

export const civilDateBounds = (date, timezone) => {
  const start = DateTime.fromISO(date, { zone: timezone }).startOf('day');
  if (!start.isValid) throw new Error('The selected date or timezone is invalid.');
  const end = start.plus({ days: 1 });
  return { start: start.toMillis(), end: end.toMillis() };
};

export const lahiriAyanamsa = (date) => {
  const julianDay = date.getTime() / 86400000 + JD_UNIX_EPOCH;
  const centuries = (julianDay - JD_J2000) / DAYS_PER_CENTURY;
  return (LAHIRI_J2000_ARCSECONDS
    + NEWCOMB_PRECESSION_RATE * centuries
    + NEWCOMB_QUADRATIC * centuries * centuries) / 3600;
};

export const siderealAscendant = (date, observer) => {
  const localSiderealHours = SiderealTime(date) + observer.longitude / 15;
  const ramc = (((localSiderealHours % 24) + 24) % 24) * 15;
  const obliquity = e_tilt(MakeTime(date)).tobl;
  const radians = (degrees) => degrees * Math.PI / 180;
  const theta = radians(ramc);
  const epsilon = radians(obliquity);
  const latitude = radians(observer.latitude);
  const numerator = Math.cos(theta);
  const denominator = -(Math.sin(epsilon) * Math.tan(latitude) + Math.cos(epsilon) * Math.sin(theta));
  const tropical = (Math.atan2(numerator, denominator) * 180 / Math.PI + 360) % 360;
  return (tropical - lahiriAyanamsa(date) + 360) % 360;
};

const rashiAt = (timestamp, observer) => {
  const instant = new Date(timestamp);
  const longitude = siderealAscendant(instant, observer);
  return Math.floor(longitude / 30) % 12;
};

const refineTransition = (lowValue, highValue, lowRashi, observer) => {
  let low = lowValue;
  let high = highValue;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (rashiAt(middle, observer) === lowRashi) low = middle;
    else high = middle;
  }
  return high;
};

const findPreviousBoundary = (start, rashi, observer) => {
  let later = start;
  for (let earlier = start - SCAN_STEP; start - earlier <= MAX_BOUNDARY_SEARCH; earlier -= SCAN_STEP) {
    const earlierRashi = rashiAt(earlier, observer);
    if (earlierRashi !== rashi) return refineTransition(earlier, later, earlierRashi, observer);
    later = earlier;
  }
  return start - MAX_BOUNDARY_SEARCH;
};

const calculateIntervals = (start, end, city) => {
  const observer = new Observer(Number(city.lat), Number(city.lng), 0);
  const firstRashi = rashiAt(start, observer);
  let intervalStart = findPreviousBoundary(start, firstRashi, observer);
  let previousTime = start;
  let previousRashi = firstRashi;
  const intervals = [];
  const scanEnd = end + MAX_BOUNDARY_SEARCH;

  for (let cursor = start + SCAN_STEP; cursor <= scanEnd; cursor += SCAN_STEP) {
    const cursorRashi = rashiAt(cursor, observer);
    if (cursorRashi !== previousRashi) {
      const boundary = refineTransition(previousTime, cursor, previousRashi, observer);
      const rashi = LAGNA_RASHIS[previousRashi];
      intervals.push({
        rashiIndex: previousRashi,
        ...rashi,
        start: new Date(intervalStart).toISOString(),
        end: new Date(boundary).toISOString(),
      });
      intervalStart = boundary;
      previousRashi = cursorRashi;
      if (boundary >= end) return intervals;
    }
    previousTime = cursor;
  }

  return intervals;
};

export const calculateLagnasForCivilDates = (dates, city) => {
  const orderedDates = [...new Set(dates)].sort();
  if (!orderedDates.length) return {};
  const firstBounds = civilDateBounds(orderedDates[0], city.tz);
  const lastBounds = civilDateBounds(orderedDates[orderedDates.length - 1], city.tz);
  const intervals = calculateIntervals(firstBounds.start, lastBounds.end, city);

  return Object.fromEntries(orderedDates.map((date) => {
    const bounds = civilDateBounds(date, city.tz);
    return [date, intervals.filter((interval) => {
      const start = new Date(interval.start).getTime();
      const end = new Date(interval.end).getTime();
      return start < bounds.end && end > bounds.start;
    })];
  }));
};

export const calculateLagnasForCivilDate = (date, city) =>
  calculateLagnasForCivilDates([date], city)[date] || [];
