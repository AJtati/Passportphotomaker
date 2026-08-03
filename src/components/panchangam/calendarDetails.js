import { calculateSpecialYogas } from './specialYogaCalculator';

const DURMUHURTHAM_OFFSETS = [
  [10.4],
  [6.4, 8.8],
  [2.4, 4.8],
  [5.6],
  [4, 8.8],
  [2.4, 6.4],
  [1.6],
];

// Traditional ghati offsets for Ashwini through Revati. Moola has two
// Varjyam periods. Durations scale with the actual Nakshatra length.
const NAKSHATRA_PERIODS = [
  [16.8, 20], [19.2, 9.6], [21.6, 12], [20.8, 16], [15.2, 5.6], [14, 8.4],
  [21.6, 12], [17.6, 8], [22.4, 12.8], [21.6, 12], [17.6, 8], [16.8, 7.2],
  [18, 8.4], [17.6, 8], [15.2, 5.6], [15.2, 5.6], [13.6, 4], [15.2, 5.6],
  [17.6, [8, 22.4]], [19.2, 9.6], [17.6, 8], [13.6, 4], [13.6, 4], [16.8, 7.2],
  [16, 6.4], [19.2, 9.6], [21.6, 12],
];

export const HORA_PLANETS = {
  sun: {
    name: { te: 'సూర్య', en: 'Sun' }, symbol: '☉', tone: 'caution',
    guidance: { te: 'నాయకత్వం, ప్రభుత్వ పనులు, ఆరోగ్యం', en: 'Leadership, government work and health' },
  },
  moon: {
    name: { te: 'చంద్ర', en: 'Moon' }, symbol: '☽', tone: 'favorable',
    guidance: { te: 'ప్రయాణం, గృహం, సంరక్షణ', en: 'Travel, home and caring activities' },
  },
  mars: {
    name: { te: 'కుజ', en: 'Mars' }, symbol: '♂', tone: 'caution',
    guidance: { te: 'స్థిరాస్తి, యంత్రాలు, ధైర్య కార్యాలు', en: 'Property, machinery and decisive action' },
  },
  mercury: {
    name: { te: 'బుధ', en: 'Mercury' }, symbol: '☿', tone: 'favorable',
    guidance: { te: 'విద్య, వ్యాపారం, సంభాషణ', en: 'Study, trade and communication' },
  },
  jupiter: {
    name: { te: 'గురు', en: 'Jupiter' }, symbol: '♃', tone: 'favorable',
    guidance: { te: 'పూజ, విద్య, ఆర్థిక కార్యాలు', en: 'Worship, learning and financial matters' },
  },
  venus: {
    name: { te: 'శుక్ర', en: 'Venus' }, symbol: '♀', tone: 'favorable',
    guidance: { te: 'వివాహం, కళలు, సౌఖ్యం', en: 'Marriage, arts and comforts' },
  },
  saturn: {
    name: { te: 'శని', en: 'Saturn' }, symbol: '♄', tone: 'caution',
    guidance: { te: 'శ్రమ, భూమి, దీర్ఘకాల పనులు', en: 'Labour, land and long-term work' },
  },
};

const HORA_SEQUENCE = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
const WEEKDAY_RULERS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

const toMs = (value) => {
  const result = new Date(value).getTime();
  return Number.isNaN(result) ? null : result;
};

const toRange = (start, end) => ({
  start: new Date(start).toISOString(),
  end: new Date(end).toISOString(),
});

const dateInTimezone = (value, timezone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const calculateSolarTimings = (day, nextDay) => {
  const sunrise = toMs(day.sunrise);
  const sunset = toMs(day.sunset);
  const nextSunrise = toMs(nextDay?.sunrise);
  if (sunrise === null || sunset === null || sunset <= sunrise) {
    return { durmuhurtham: [], abhijitMuhurtam: null };
  }

  const dayDuration = sunset - sunrise;
  const nightDuration = nextSunrise && nextSunrise > sunset ? nextSunrise - sunset : 24 * 60 * 60 * 1000 - dayDuration;
  const weekday = Number(day.vara?.number ?? new Date(day.date).getUTCDay());
  const durmuhurtham = DURMUHURTHAM_OFFSETS[weekday].map((offset, index) => {
    const isTuesdayNight = weekday === 2 && index === 1;
    const base = isTuesdayNight ? sunset : sunrise;
    const duration = isTuesdayNight ? nightDuration : dayDuration;
    const start = base + duration * offset / 12;
    return toRange(start, start + dayDuration * 0.8 / 12);
  });

  return {
    durmuhurtham,
    abhijitMuhurtam: toRange(sunrise + dayDuration * 7 / 15, sunrise + dayDuration * 8 / 15),
  };
};

export const calculateHoras = (day, nextDay) => {
  const sunrise = toMs(day.sunrise);
  const sunset = toMs(day.sunset);
  const nextSunrise = toMs(nextDay?.sunrise);
  if (sunrise === null || sunset === null || nextSunrise === null || sunset <= sunrise || nextSunrise <= sunset) {
    return [];
  }

  const weekday = Number(day.vara?.number ?? new Date(day.date).getUTCDay());
  const dayRuler = WEEKDAY_RULERS[weekday];
  const sequenceStart = HORA_SEQUENCE.indexOf(dayRuler);
  const periods = [
    { period: 'day', start: sunrise, end: sunset },
    { period: 'night', start: sunset, end: nextSunrise },
  ];

  return periods.flatMap(({ period, start, end }, periodIndex) => {
    const duration = end - start;
    return Array.from({ length: 12 }, (_, index) => {
      const number = periodIndex * 12 + index + 1;
      const planetKey = HORA_SEQUENCE[(sequenceStart + number - 1) % HORA_SEQUENCE.length];
      return {
        number,
        period,
        planetKey,
        start: new Date(start + duration * index / 12).toISOString(),
        end: new Date(start + duration * (index + 1) / 12).toISOString(),
      };
    });
  });
};

const findNakshatraPeriods = (days, index) => {
  const day = days[index];
  const number = Number(day.nakshatra?.number);
  const end = toMs(day.nakshatra?.endsAt);
  if (!number || end === null) return [];

  let start;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = days[cursor];
    if (Number(candidate.nakshatra?.number) !== number) {
      start = toMs(candidate.nakshatra?.endsAt);
      break;
    }
  }
  if (start === null || start === undefined || start >= end) start = end - 24 * 60 * 60 * 1000;

  const periods = [{ number, start, end }];
  const nextNumber = number === 27 ? 1 : number + 1;
  for (let cursor = index + 1; cursor < days.length; cursor += 1) {
    const candidate = days[cursor];
    const candidateEnd = toMs(candidate.nakshatra?.endsAt);
    if (Number(candidate.nakshatra?.number) === nextNumber && candidateEnd > end) {
      periods.push({ number: nextNumber, start: end, end: candidateEnd });
      break;
    }
  }
  return periods;
};

const calculateNakshatraRanges = (period, offsetIndex) => {
  const offsets = NAKSHATRA_PERIODS[period.number - 1]?.[offsetIndex];
  if (offsets === undefined) return [];
  const duration = period.end - period.start;
  const rangeDuration = duration * 1.6 / 24;
  return (Array.isArray(offsets) ? offsets : [offsets]).map((offset) => {
    const start = period.start + duration * offset / 24;
    return toRange(start, start + rangeDuration);
  });
};

export const calculateNakshatraTimings = (days, index, timezone) => {
  const date = days[index].date;
  const periods = findNakshatraPeriods(days, index);
  const onSelectedDate = (range) =>
    dateInTimezone(range.start, timezone) === date || dateInTimezone(range.end, timezone) === date;
  return {
    amritaGadiya: periods.flatMap((period) => calculateNakshatraRanges(period, 0)).filter(onSelectedDate),
    varjyam: periods.flatMap((period) => calculateNakshatraRanges(period, 1)).filter(onSelectedDate),
  };
};

export const moonEmoji = (phase) => {
  if (phase < 0.03 || phase >= 0.97) return '🌑';
  if (phase < 0.22) return '🌒';
  if (phase < 0.28) return '🌓';
  if (phase < 0.47) return '🌔';
  if (phase < 0.53) return '🌕';
  if (phase < 0.72) return '🌖';
  if (phase < 0.78) return '🌗';
  return '🌘';
};

export const enrichPanchangamDays = (days, targetDates, timezone, { includeHoras = false } = {}) => {
  const wanted = new Set(targetDates);
  return days.flatMap((day, index) => {
    if (!wanted.has(day.date)) return [];
    const solar = calculateSolarTimings(day, days[index + 1]);
    const nakshatra = calculateNakshatraTimings(days, index, timezone);
    const specialYogas = calculateSpecialYogas(day, days[index + 1]);
    const horas = includeHoras ? calculateHoras(day, days[index + 1]) : undefined;
    return [{
      ...day,
      gregorianDay: Number(day.date.slice(-2)),
      moonPhaseEmoji: moonEmoji(day.moonPhase?.phase),
      durmuhurtham: solar.durmuhurtham,
      abhijitMuhurtam: solar.abhijitMuhurtam,
      varjyam: nakshatra.varjyam,
      amritaGadiya: nakshatra.amritaGadiya,
      specialYogas,
      ...(includeHoras ? { horas } : {}),
      isEkadashi: day.tithi?.number === 11 || day.tithi?.number === 26,
      isAmavasya: day.tithi?.number === 30,
      isPurnima: day.tithi?.number === 15,
    }];
  });
};
