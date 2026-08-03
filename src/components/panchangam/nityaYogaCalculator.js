import { Body, Ecliptic, GeoVector } from 'astronomy-engine';
import { civilDateBounds, lahiriAyanamsa } from './lagnaCalculator';

const MINUTE = 60 * 1000;
const SCAN_STEP = 10 * MINUTE;
const MAX_BOUNDARY_SEARCH = 36 * 60 * MINUTE;
const YOGA_WIDTH = 360 / 27;

export const NITYA_YOGAS = [
  { te: 'విష్కంభ', en: 'Vishkambha' }, { te: 'ప్రీతి', en: 'Priti' },
  { te: 'ఆయుష్మాన్', en: 'Ayushman' }, { te: 'సౌభాగ్య', en: 'Saubhagya' },
  { te: 'శోభన', en: 'Shobhana' }, { te: 'అతిగండ', en: 'Atiganda' },
  { te: 'సుకర్మ', en: 'Sukarman' }, { te: 'ధృతి', en: 'Dhriti' },
  { te: 'శూల', en: 'Shula' }, { te: 'గండ', en: 'Ganda' },
  { te: 'వృద్ధి', en: 'Vriddhi' }, { te: 'ధ్రువ', en: 'Dhruva' },
  { te: 'వ్యాఘాత', en: 'Vyaghata' }, { te: 'హర్షణ', en: 'Harshana' },
  { te: 'వజ్ర', en: 'Vajra' }, { te: 'సిద్ధి', en: 'Siddhi' },
  { te: 'వ్యతీపాత', en: 'Vyatipata' }, { te: 'వరీయాన్', en: 'Variyana' },
  { te: 'పరిఘ', en: 'Parigha' }, { te: 'శివ', en: 'Shiva' },
  { te: 'సిద్ధ', en: 'Siddha' }, { te: 'సాధ్య', en: 'Sadhya' },
  { te: 'శుభ', en: 'Shubha' }, { te: 'శుక్ల', en: 'Shukla' },
  { te: 'బ్రహ్మ', en: 'Brahma' }, { te: 'ఇంద్ర', en: 'Indra' },
  { te: 'వైధృతి', en: 'Vaidhriti' },
];

const siderealLongitude = (body, date) =>
  (Ecliptic(GeoVector(body, date, true)).elon - lahiriAyanamsa(date) + 360) % 360;

const yogaAt = (timestamp) => {
  const date = new Date(timestamp);
  const longitudeSum = (siderealLongitude(Body.Sun, date) + siderealLongitude(Body.Moon, date)) % 360;
  return Math.floor(longitudeSum / YOGA_WIDTH) % 27;
};

const refineTransition = (lowValue, highValue, lowYoga) => {
  let low = lowValue;
  let high = highValue;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (yogaAt(middle) === lowYoga) low = middle;
    else high = middle;
  }
  return high;
};

const findPreviousBoundary = (start, yoga) => {
  let later = start;
  for (let earlier = start - SCAN_STEP; start - earlier <= MAX_BOUNDARY_SEARCH; earlier -= SCAN_STEP) {
    const earlierYoga = yogaAt(earlier);
    if (earlierYoga !== yoga) return refineTransition(earlier, later, earlierYoga);
    later = earlier;
  }
  return start - MAX_BOUNDARY_SEARCH;
};

const calculateIntervals = (start, end) => {
  const firstYoga = yogaAt(start);
  let intervalStart = findPreviousBoundary(start, firstYoga);
  let previousTime = start;
  let previousYoga = firstYoga;
  const intervals = [];

  for (let cursor = start + SCAN_STEP; cursor <= end + MAX_BOUNDARY_SEARCH; cursor += SCAN_STEP) {
    const currentYoga = yogaAt(cursor);
    if (currentYoga !== previousYoga) {
      const boundary = refineTransition(previousTime, cursor, previousYoga);
      intervals.push({
        key: `nitya-yoga-${previousYoga + 1}`,
        number: previousYoga + 1,
        name: NITYA_YOGAS[previousYoga],
        start: new Date(intervalStart).toISOString(),
        end: new Date(boundary).toISOString(),
      });
      intervalStart = boundary;
      previousYoga = currentYoga;
      if (boundary >= end) return intervals;
    }
    previousTime = cursor;
  }
  return intervals;
};

export const calculateNityaYogasForCivilDate = (date, city) => {
  const bounds = civilDateBounds(date, city.tz);
  return calculateIntervals(bounds.start, bounds.end).filter((yoga) =>
    new Date(yoga.start).getTime() < bounds.end && new Date(yoga.end).getTime() > bounds.start);
};
