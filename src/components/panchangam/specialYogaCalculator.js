import { Body, Ecliptic, GeoVector } from 'astronomy-engine';
import { lahiriAyanamsa } from './lagnaCalculator';

const MINUTE = 60 * 1000;
const SCAN_STEP = 10 * MINUTE;
const NAKSHATRA_WIDTH = 360 / 27;

export const NAKSHATRAS = [
  { te: 'అశ్విని', en: 'Ashwini' }, { te: 'భరణి', en: 'Bharani' },
  { te: 'కృత్తిక', en: 'Krittika' }, { te: 'రోహిణి', en: 'Rohini' },
  { te: 'మృగశిర', en: 'Mrigashira' }, { te: 'ఆరుద్ర', en: 'Ardra' },
  { te: 'పునర్వసు', en: 'Punarvasu' }, { te: 'పుష్యమి', en: 'Pushya' },
  { te: 'ఆశ్లేష', en: 'Ashlesha' }, { te: 'మఖ', en: 'Magha' },
  { te: 'పూర్వ ఫల్గుణి', en: 'Purva Phalguni' }, { te: 'ఉత్తర ఫల్గుణి', en: 'Uttara Phalguni' },
  { te: 'హస్త', en: 'Hasta' }, { te: 'చిత్త', en: 'Chitra' },
  { te: 'స్వాతి', en: 'Swati' }, { te: 'విశాఖ', en: 'Vishakha' },
  { te: 'అనూరాధ', en: 'Anuradha' }, { te: 'జ్యేష్ఠ', en: 'Jyeshtha' },
  { te: 'మూల', en: 'Mula' }, { te: 'పూర్వాషాఢ', en: 'Purva Ashadha' },
  { te: 'ఉత్తరాషాఢ', en: 'Uttara Ashadha' }, { te: 'శ్రవణం', en: 'Shravana' },
  { te: 'ధనిష్ఠ', en: 'Dhanishtha' }, { te: 'శతభిషం', en: 'Shatabhisha' },
  { te: 'పూర్వాభాద్ర', en: 'Purva Bhadrapada' }, { te: 'ఉత్తరాభాద్ర', en: 'Uttara Bhadrapada' },
  { te: 'రేవతి', en: 'Revati' },
];

const DEFINITIONS = {
  amritaSiddhi: {
    key: 'amrita-siddhi',
    name: { te: 'అమృత సిద్ధి యోగం', en: 'Amrita Siddhi Yoga' },
    description: { te: 'చాలా శుభకార్యాలకు అనుకూలమైన సిద్ధి యోగం.', en: 'A highly favourable Siddhi Yoga for most auspicious activities.' },
    warning: { te: 'గురు–పుష్యమిలో వివాహం, శని–రోహిణిలో ప్రయాణం నివారించాలని సంప్రదాయం.', en: 'Traditionally avoid marriage during Thursday–Pushya and journeys during Saturday–Rohini.' },
  },
  sarvarthaSiddhi: {
    key: 'sarvartha-siddhi',
    name: { te: 'సర్వార్థ సిద్ధి యోగం', en: 'Sarvartha Siddhi Yoga' },
    description: { te: 'ప్రారంభించిన కార్యాల విజయానికి శుభప్రదమైన యోగం.', en: 'A favourable Yoga traditionally associated with success in undertakings.' },
  },
  guruPushya: {
    key: 'guru-pushya',
    name: { te: 'గురు పుష్య యోగం', en: 'Guru Pushya Yoga' },
    description: { te: 'విద్య, ఆధ్యాత్మిక కార్యాలు మరియు పెట్టుబడులకు విశేష శుభప్రదం.', en: 'Especially favourable for education, spiritual activities and investments.' },
  },
  raviPushya: {
    key: 'ravi-pushya',
    name: { te: 'రవి పుష్య యోగం', en: 'Ravi Pushya Yoga' },
    description: { te: 'కొత్త కార్యాలు, బంగారం మరియు ఆస్తుల కొనుగోలుకు విశేష శుభప్రదం.', en: 'Especially favourable for new ventures and buying gold or assets.' },
  },
};

const AMRITA_SIDDHI = [12, 4, 0, 16, 7, 26, 3];
const SARVARTHA_SIDDHI = [
  [0, 7, 11, 12, 18, 20, 25],
  [3, 4, 7, 16, 21],
  [0, 2, 8, 20],
  [2, 3, 4, 12, 16],
  [0, 6, 7, 16, 26],
  [0, 16, 26],
  [3, 14],
];

export const getSpecialYogasForCombination = (weekday, nakshatraIndex) => {
  const matches = [];
  if (AMRITA_SIDDHI[weekday] === nakshatraIndex) matches.push(DEFINITIONS.amritaSiddhi);
  if (weekday === 0 && nakshatraIndex === 7) matches.push(DEFINITIONS.raviPushya);
  if (weekday === 4 && nakshatraIndex === 7) matches.push(DEFINITIONS.guruPushya);
  if (SARVARTHA_SIDDHI[weekday]?.includes(nakshatraIndex)) matches.push(DEFINITIONS.sarvarthaSiddhi);
  return matches;
};

const nakshatraAt = (timestamp) => {
  const date = new Date(timestamp);
  const tropicalLongitude = Ecliptic(GeoVector(Body.Moon, date, true)).elon;
  const siderealLongitude = (tropicalLongitude - lahiriAyanamsa(date) + 360) % 360;
  return Math.floor(siderealLongitude / NAKSHATRA_WIDTH) % 27;
};

const refineTransition = (lowValue, highValue, lowNakshatra) => {
  let low = lowValue;
  let high = highValue;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (nakshatraAt(middle) === lowNakshatra) low = middle;
    else high = middle;
  }
  return high;
};

const nakshatraIntervals = (start, end) => {
  const intervals = [];
  let intervalStart = start;
  let previousTime = start;
  let previousNakshatra = nakshatraAt(start);

  for (let cursor = start + SCAN_STEP; cursor <= end + SCAN_STEP; cursor += SCAN_STEP) {
    const currentTime = Math.min(cursor, end);
    const currentNakshatra = nakshatraAt(currentTime);
    if (currentNakshatra !== previousNakshatra) {
      const boundary = refineTransition(previousTime, currentTime, previousNakshatra);
      intervals.push({ nakshatraIndex: previousNakshatra, start: intervalStart, end: boundary });
      intervalStart = boundary;
      previousNakshatra = currentNakshatra;
    }
    previousTime = currentTime;
    if (currentTime === end) break;
  }
  if (intervalStart < end) intervals.push({ nakshatraIndex: previousNakshatra, start: intervalStart, end });
  return intervals;
};

export const calculateSpecialYogas = (day, nextDay) => {
  const sunrise = new Date(day?.sunrise).getTime();
  const nextSunrise = new Date(nextDay?.sunrise).getTime();
  const weekday = Number(day?.vara?.number);
  if (!Number.isFinite(sunrise) || !Number.isFinite(nextSunrise) || nextSunrise <= sunrise
    || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return [];

  return nakshatraIntervals(sunrise, nextSunrise).flatMap((interval) => {
    const nakshatra = NAKSHATRAS[interval.nakshatraIndex];
    return getSpecialYogasForCombination(weekday, interval.nakshatraIndex).map((definition) => ({
      ...definition,
      basis: {
        te: `${day.vara?.te || day.vara?.en || ''} + ${nakshatra.te}`,
        en: `${day.vara?.en || day.vara?.te || ''} + ${nakshatra.en}`,
      },
      nakshatra,
      start: new Date(interval.start).toISOString(),
      end: new Date(interval.end).toISOString(),
      isAuspicious: true,
    }));
  });
};
