import { Body, Ecliptic, GeoVector, Observer } from 'astronomy-engine';
import { DateTime } from 'luxon';
import { lahiriAyanamsa, LAGNA_RASHIS, siderealAscendant } from '../panchangam/lagnaCalculator';

const NAKSHATRA_WIDTH = 360 / 27;
const PADA_WIDTH = NAKSHATRA_WIDTH / 4;
const CIVIL_YEAR_DAYS = 365.2425;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RASHIS = LAGNA_RASHIS.map((rashi, index) => ({ ...rashi, index }));

export const NAKSHATRAS = [
  ['అశ్విని', 'Ashwini', 'ketu'], ['భరణి', 'Bharani', 'venus'], ['కృత్తిక', 'Krittika', 'sun'],
  ['రోహిణి', 'Rohini', 'moon'], ['మృగశిర', 'Mrigashira', 'mars'], ['ఆర్ద్ర', 'Ardra', 'rahu'],
  ['పునర్వసు', 'Punarvasu', 'jupiter'], ['పుష్యమి', 'Pushya', 'saturn'], ['ఆశ్లేష', 'Ashlesha', 'mercury'],
  ['మఖ', 'Magha', 'ketu'], ['పూర్వ ఫల్గుణి', 'Purva Phalguni', 'venus'], ['ఉత్తర ఫల్గుణి', 'Uttara Phalguni', 'sun'],
  ['హస్త', 'Hasta', 'moon'], ['చిత్త', 'Chitra', 'mars'], ['స్వాతి', 'Swati', 'rahu'],
  ['విశాఖ', 'Vishakha', 'jupiter'], ['అనురాధ', 'Anuradha', 'saturn'], ['జ్యేష్ఠ', 'Jyeshtha', 'mercury'],
  ['మూల', 'Mula', 'ketu'], ['పూర్వాషాఢ', 'Purva Ashadha', 'venus'], ['ఉత్తరాషాఢ', 'Uttara Ashadha', 'sun'],
  ['శ్రవణం', 'Shravana', 'moon'], ['ధనిష్ఠ', 'Dhanishta', 'mars'], ['శతభిషం', 'Shatabhisha', 'rahu'],
  ['పూర్వాభాద్ర', 'Purva Bhadrapada', 'jupiter'], ['ఉత్తరాభాద్ర', 'Uttara Bhadrapada', 'saturn'], ['రేవతి', 'Revati', 'mercury'],
].map(([te, en, lord], index) => ({ index, name: { te, en }, lord }));

export const DASHA_LORDS = [
  { key: 'ketu', years: 7, symbol: '☳', name: { te: 'కేతు', en: 'Ketu' } },
  { key: 'venus', years: 20, symbol: '♀', name: { te: 'శుక్ర', en: 'Venus' } },
  { key: 'sun', years: 6, symbol: '☉', name: { te: 'సూర్య', en: 'Sun' } },
  { key: 'moon', years: 10, symbol: '☽', name: { te: 'చంద్ర', en: 'Moon' } },
  { key: 'mars', years: 7, symbol: '♂', name: { te: 'కుజ', en: 'Mars' } },
  { key: 'rahu', years: 18, symbol: '☊', name: { te: 'రాహు', en: 'Rahu' } },
  { key: 'jupiter', years: 16, symbol: '♃', name: { te: 'గురు', en: 'Jupiter' } },
  { key: 'saturn', years: 19, symbol: '♄', name: { te: 'శని', en: 'Saturn' } },
  { key: 'mercury', years: 17, symbol: '☿', name: { te: 'బుధ', en: 'Mercury' } },
];

const PLANET_DEFINITIONS = [
  { key: 'sun', body: Body.Sun, symbol: '☉', name: { te: 'సూర్యుడు', en: 'Sun' } },
  { key: 'moon', body: Body.Moon, symbol: '☽', name: { te: 'చంద్రుడు', en: 'Moon' } },
  { key: 'mars', body: Body.Mars, symbol: '♂', name: { te: 'కుజుడు', en: 'Mars' } },
  { key: 'mercury', body: Body.Mercury, symbol: '☿', name: { te: 'బుధుడు', en: 'Mercury' } },
  { key: 'jupiter', body: Body.Jupiter, symbol: '♃', name: { te: 'గురువు', en: 'Jupiter' } },
  { key: 'venus', body: Body.Venus, symbol: '♀', name: { te: 'శుక్రుడు', en: 'Venus' } },
  { key: 'saturn', body: Body.Saturn, symbol: '♄', name: { te: 'శని', en: 'Saturn' } },
];

const OWN_SIGNS = {
  sun: [4], moon: [3], mars: [0, 7], mercury: [2, 5],
  jupiter: [8, 11], venus: [1, 6], saturn: [9, 10],
};
const EXALTATION_SIGNS = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
const COMBUSTION_LIMITS = { mars: 17, mercury: 14, jupiter: 11, venus: 10, saturn: 15 };

const PLANET_THEMES = {
  sun: { te: 'ఆత్మవిశ్వాసం, నాయకత్వం, అధికారం', en: 'identity, leadership and authority' },
  moon: { te: 'మనస్సు, కుటుంబ స్పందన, అనుకూలత', en: 'mind, family connection and adaptability' },
  mars: { te: 'ధైర్యం, చర్య, ఆస్తి', en: 'courage, action and property' },
  mercury: { te: 'విద్య, సంభాషణ, వ్యాపారం', en: 'learning, communication and commerce' },
  jupiter: { te: 'జ్ఞానం, విస్తరణ, గురువులు', en: 'wisdom, growth and mentors' },
  venus: { te: 'సంబంధాలు, కళ, సౌకర్యం', en: 'relationships, art and comfort' },
  saturn: { te: 'బాధ్యత, శ్రమ, దీర్ఘకాల ఫలితాలు', en: 'responsibility, work and long-term results' },
  rahu: { te: 'కోరిక, విదేశీ అనుభవాలు, అసాధారణ మార్గాలు', en: 'ambition, foreign influences and unconventional paths' },
  ketu: { te: 'విరక్తి, పరిశోధన, ఆధ్యాత్మికత', en: 'detachment, research and inward development' },
};

const HOUSE_THEMES = [
  { te: 'శరీరం, స్వభావం, జీవన దిశ', en: 'body, identity and life direction' },
  { te: 'కుటుంబం, వాక్కు, సంపద', en: 'family, speech and accumulated wealth' },
  { te: 'ధైర్యం, నైపుణ్యాలు, సహోదరులు', en: 'courage, skills and siblings' },
  { te: 'గృహం, ఆస్తి, అంతర్గత సుఖం', en: 'home, property and inner security' },
  { te: 'విద్య, సృజన, సంతానం', en: 'learning, creativity and children' },
  { te: 'సేవ, ఆరోగ్య అలవాట్లు, పోటీ', en: 'service, health routines and competition' },
  { te: 'వివాహం, భాగస్వామ్యం, బహిరంగ సంబంధాలు', en: 'marriage, partnership and public dealings' },
  { te: 'మార్పు, రహస్యాలు, ఉమ్మడి వనరులు', en: 'transformation, research and shared resources' },
  { te: 'ధర్మం, గురువులు, దీర్ఘ ప్రయాణం', en: 'dharma, mentors and long journeys' },
  { te: 'వృత్తి, స్థానం, బాధ్యత', en: 'career, status and responsibility' },
  { te: 'లాభాలు, మిత్రులు, లక్ష్యాలు', en: 'gains, networks and goals' },
  { te: 'వ్యయం, విదేశం, విశ్రాంతి', en: 'expenses, foreign places and retreat' },
];

const normalize = (value) => ((value % 360) + 360) % 360;
const signedDelta = (from, to) => ((to - from + 540) % 360) - 180;
const angularDistance = (first, second) => Math.abs(signedDelta(first, second));
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const geocentricLongitude = (body, date) => normalize(Ecliptic(GeoVector(body, date, true)).elon);

const meanNodeLongitude = (date) => {
  const julianDay = date.getTime() / DAY_MS + 2440587.5;
  const centuries = (julianDay - 2451545) / 36525;
  const tropical = 125.04452 - 1934.136261 * centuries
    + 0.0020708 * centuries * centuries + centuries * centuries * centuries / 450000;
  return normalize(tropical - lahiriAyanamsa(date));
};

const nakshatraAt = (longitude) => {
  const index = Math.floor(normalize(longitude) / NAKSHATRA_WIDTH) % 27;
  const within = normalize(longitude) - index * NAKSHATRA_WIDTH;
  return { ...NAKSHATRAS[index], pada: Math.floor(within / PADA_WIDTH) + 1, progress: within / NAKSHATRA_WIDTH };
};

export const navamsaSignFor = (longitude) => {
  const normalized = normalize(longitude);
  const sign = Math.floor(normalized / 30);
  const part = Math.min(8, Math.floor((normalized % 30) / (30 / 9)));
  const start = sign % 3 === 0 ? sign : sign % 3 === 1 ? sign + 8 : sign + 4;
  return (start + part) % 12;
};

const dignityFor = (planet, sign) => {
  if (EXALTATION_SIGNS[planet] === sign) return 'exalted';
  if ((EXALTATION_SIGNS[planet] + 6) % 12 === sign) return 'debilitated';
  if (OWN_SIGNS[planet]?.includes(sign)) return 'own';
  return 'neutral';
};

const planetPosition = (definition, date, ascendantSign, sunLongitude) => {
  const tropical = geocentricLongitude(definition.body, date);
  const longitude = normalize(tropical - lahiriAyanamsa(date));
  const earlier = normalize(geocentricLongitude(definition.body, addDays(date, -0.5)) - lahiriAyanamsa(addDays(date, -0.5)));
  const later = normalize(geocentricLongitude(definition.body, addDays(date, 0.5)) - lahiriAyanamsa(addDays(date, 0.5)));
  const sign = Math.floor(longitude / 30);
  return {
    ...definition,
    longitude,
    degreeInSign: longitude % 30,
    rashi: RASHIS[sign],
    sign,
    house: (sign - ascendantSign + 12) % 12 + 1,
    navamsaSign: navamsaSignFor(longitude),
    nakshatra: nakshatraAt(longitude),
    retrograde: !['sun', 'moon'].includes(definition.key) && signedDelta(earlier, later) < 0,
    combust: Boolean(COMBUSTION_LIMITS[definition.key])
      && angularDistance(longitude, sunLongitude) <= COMBUSTION_LIMITS[definition.key],
    dignity: dignityFor(definition.key, sign),
  };
};

const nodePosition = (key, longitude, ascendantSign) => {
  const definition = DASHA_LORDS.find((lord) => lord.key === key);
  const sign = Math.floor(longitude / 30);
  return {
    key,
    name: definition.name,
    symbol: definition.symbol,
    longitude,
    degreeInSign: longitude % 30,
    rashi: RASHIS[sign],
    sign,
    house: (sign - ascendantSign + 12) % 12 + 1,
    navamsaSign: navamsaSignFor(longitude),
    nakshatra: nakshatraAt(longitude),
    retrograde: true,
    combust: false,
    dignity: 'neutral',
  };
};

const dashaDefinition = (key) => DASHA_LORDS.find((lord) => lord.key === key);

const pratyantardashasFor = (mahadashaLord, antardasha) => {
  const lordIndex = DASHA_LORDS.findIndex((lord) => lord.key === antardasha.lord.key);
  let cursor = new Date(antardasha.start);
  return Array.from({ length: 9 }, (_, index) => {
    const lord = DASHA_LORDS[(lordIndex + index) % DASHA_LORDS.length];
    const durationDays = mahadashaLord.years * antardasha.lord.years * lord.years
      / (120 * 120) * CIVIL_YEAR_DAYS;
    const start = cursor;
    const calculatedEnd = addDays(start, durationDays);
    const end = index === 8 ? new Date(antardasha.end) : calculatedEnd;
    cursor = end;
    return { lord, start: start.toISOString(), end: end.toISOString() };
  });
};

const antardashasFor = (mahadasha) => {
  const lordIndex = DASHA_LORDS.findIndex((lord) => lord.key === mahadasha.lord.key);
  let cursor = new Date(mahadasha.fullStart);
  return Array.from({ length: 9 }, (_, index) => {
    const lord = DASHA_LORDS[(lordIndex + index) % DASHA_LORDS.length];
    const durationDays = mahadasha.lord.years * lord.years / 120 * CIVIL_YEAR_DAYS;
    const start = cursor;
    const end = addDays(start, durationDays);
    cursor = end;
    const antardasha = { lord, start: start.toISOString(), end: end.toISOString() };
    antardasha.pratyantardashas = pratyantardashasFor(mahadasha.lord, antardasha);
    return antardasha;
  });
};

export const calculateVimshottari = (birthInstant, moonLongitude) => {
  const moonNakshatra = nakshatraAt(moonLongitude);
  const firstLordIndex = DASHA_LORDS.findIndex((lord) => lord.key === moonNakshatra.lord);
  const firstLord = DASHA_LORDS[firstLordIndex];
  const fullStart = addDays(birthInstant, -firstLord.years * moonNakshatra.progress * CIVIL_YEAR_DAYS);
  const horizon = addDays(birthInstant, 120 * CIVIL_YEAR_DAYS);
  const periods = [];
  let cursor = fullStart;
  let index = firstLordIndex;
  let guard = 0;

  while (cursor < horizon && guard < 11) {
    const lord = DASHA_LORDS[index % DASHA_LORDS.length];
    const end = addDays(cursor, lord.years * CIVIL_YEAR_DAYS);
    const period = {
      lord,
      fullStart: cursor.toISOString(),
      start: new Date(Math.max(cursor.getTime(), birthInstant.getTime())).toISOString(),
      end: new Date(Math.min(end.getTime(), horizon.getTime())).toISOString(),
      isPartialAtBirth: cursor < birthInstant,
    };
    period.antardashas = antardashasFor(period).filter((item) =>
      new Date(item.end) > birthInstant && new Date(item.start) < horizon
    );
    periods.push(period);
    cursor = end;
    index += 1;
    guard += 1;
  }

  return { system: 'Vimshottari', yearLengthDays: CIVIL_YEAR_DAYS, periods };
};

const yogaName = (te, en) => ({ te, en });
const yogaReason = (te, en) => ({ te, en });
const yogaSummary = (te, en) => ({ te, en });

export const detectYogas = (positions) => {
  const byKey = Object.fromEntries(positions.map((planet) => [planet.key, planet]));
  const yogas = [];
  const moon = byKey.moon;
  const jupiter = byKey.jupiter;
  const moonToJupiter = (jupiter.sign - moon.sign + 12) % 12 + 1;

  if ([1, 4, 7, 10].includes(moonToJupiter)) {
    yogas.push({
      key: 'gaja-kesari', tone: 'supportive',
      name: yogaName('గజకేసరి యోగం', 'Gaja Kesari Yoga'),
      reason: yogaReason('చంద్రుని నుండి గురువు కేంద్ర స్థానంలో ఉన్నాడు.', `Jupiter occupies house ${moonToJupiter} from the Moon, a lunar Kendra.`),
      summary: yogaSummary('సులభంగా చెప్పాలంటే, భావోద్వేగ స్పందనకు జ్ఞానం, పెద్ద దృక్పథం తోడయ్యే అవకాశం ఉంది. సరైన దశలు, గ్రహబలం సహకరిస్తే నేర్చుకోవడం, సలహా ఇవ్వడం మరియు గౌరవంగా వ్యవహరించడం బలంగా కనిపించవచ్చు.', 'Simply put, judgement and a wider perspective may support emotional responses. When strength and timing cooperate, learning, advising and earning respect can become more visible.'),
      source: 'Brihat Parashara Hora Shastra · traditional Kendra rule',
    });
  }

  if (byKey.sun.sign === byKey.mercury.sign) {
    yogas.push({
      key: 'budha-aditya', tone: 'supportive',
      name: yogaName('బుధాదిత్య యోగం', 'Budha Aditya Yoga'),
      reason: yogaReason('సూర్యుడు, బుధుడు ఒకే రాశిలో ఉన్నారు.', `Sun and Mercury occupy ${byKey.sun.rashi.name.en}.`),
      summary: yogaSummary('ఆలోచన, మాట మరియు నిర్ణయశక్తి కలిసి పనిచేసే ధోరణి ఇది. గ్రహాలు బలంగా ఉంటే చదువు, నిర్వహణ, వ్యాపారం లేదా ప్రజలతో మాట్లాడే పనుల్లో స్పష్టత కనిపించవచ్చు; సూర్యునికి చాలా దగ్గరగా ఉన్న బుధుడైతే తొందరపాటు మాటలను నియంత్రించడం ఉపయోగకరం.', 'This links thinking, speech and decision-making. With adequate strength it may help study, management, commerce or public communication; if Mercury is very close to the Sun, slowing down before speaking can help.'),
      source: 'Traditional Parashari conjunction rule',
    });
  }

  if (byKey.moon.sign === byKey.mars.sign) {
    yogas.push({
      key: 'chandra-mangala', tone: 'mixed',
      name: yogaName('చంద్ర మంగళ యోగం', 'Chandra Mangala Yoga'),
      reason: yogaReason('చంద్రుడు, కుజుడు ఒకే రాశిలో ఉన్నారు.', `Moon and Mars occupy ${byKey.moon.rashi.name.en}.`),
      summary: yogaSummary('మనస్సు మరియు చర్య వేగంగా కలిసే మిశ్రమ యోగం. లక్ష్యసాధన, వ్యాపార చురుకుదనానికి సహాయపడవచ్చు; అదే సమయంలో కోపం లేదా తొందరపాటు ఖర్చులను తగ్గించడానికి విరామం తీసుకుని స్పందించడం మంచిది.', 'This mixed Yoga joins emotion with quick action. It may support initiative and commercial drive, while a pause before reacting can reduce impatience or impulsive spending.'),
      source: 'Traditional conjunction form · Phaladeepika tradition',
    });
  }

  const mahapurusha = [
    ['mars', 'రుచక', 'Ruchaka'], ['mercury', 'భద్ర', 'Bhadra'], ['jupiter', 'హంస', 'Hamsa'],
    ['venus', 'మాలవ్య', 'Malavya'], ['saturn', 'శశ', 'Shasha'],
  ];
  mahapurusha.forEach(([key, teName, enName]) => {
    const planet = byKey[key];
    if ([1, 4, 7, 10].includes(planet.house) && ['own', 'exalted'].includes(planet.dignity)) {
      yogas.push({
        key: `${key}-mahapurusha`, tone: 'supportive',
        name: yogaName(`${teName} మహాపురుష యోగం`, `${enName} Mahapurusha Yoga`),
        reason: yogaReason(`${planet.name.te} కేంద్రంలో స్వ/ఉచ్చ రాశిలో ఉన్నాడు.`, `${planet.name.en} is ${planet.dignity} in Kendra house ${planet.house}.`),
        summary: yogaSummary(`${planet.name.te} సూచించే లక్షణాలు వ్యక్తిత్వం మరియు జీవిత నిర్ణయాల్లో బలంగా కనిపించే అవకాశం ఉంది. ఈ యోగం మంచి సామర్థ్యాన్ని సూచిస్తుంది; దాని నిజమైన వ్యక్తీకరణకు సంబంధిత దశలు, దృష్టులు మరియు వ్యక్తిగత ప్రయత్నం కూడా అవసరం.`, `${planet.name.en} themes may become prominent in personality and major choices. The Yoga indicates capacity, while its visible expression still depends on periods, aspects and personal effort.`),
        source: 'Brihat Parashara Hora Shastra · Pancha Mahapurusha rules',
      });
    }
  });

  return yogas;
};

export const resolveBirthInstant = ({ birthDate, birthTime, timezone, selectedOffset }) => {
  const requested = `${birthDate} ${birthTime}`;
  const local = DateTime.fromISO(`${birthDate}T${birthTime}`, { zone: timezone });
  if (!local.isValid) throw new Error('The birth date, time or timezone is invalid.');
  if (local.toFormat('yyyy-MM-dd HH:mm') !== requested) {
    throw new Error('This local time did not exist because the clocks changed. Choose a valid birth time.');
  }
  const possibilities = local.getPossibleOffsets().sort((first, second) => first.toMillis() - second.toMillis());
  const chosen = possibilities.find((item) => String(item.offset) === String(selectedOffset)) || possibilities[0];
  return {
    instant: chosen.toJSDate(),
    local: chosen,
    possibleOffsets: possibilities.map((item) => ({
      offset: item.offset,
      label: `${item.offsetNameLong || item.offsetNameShort} (UTC${item.toFormat('ZZ')})`,
      iso: item.toISO(),
    })),
  };
};

export const calculateHoroscope = ({ name, birthDate, birthTime, city, selectedOffset, timeAccuracy = 'exact' }) => {
  if (!name?.trim()) throw new Error('Enter the person\'s name.');
  if (!birthDate || !birthTime) throw new Error('Enter the complete birth date and exact time.');
  if (!city?.tz || !Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lng))) {
    throw new Error('Choose a valid birth place.');
  }

  const resolved = resolveBirthInstant({ birthDate, birthTime, timezone: city.tz, selectedOffset });
  const date = resolved.instant;
  const observer = new Observer(Number(city.lat), Number(city.lng), 0);
  const ascendantLongitude = siderealAscendant(date, observer);
  const ascendantSign = Math.floor(ascendantLongitude / 30);
  const sunTropical = geocentricLongitude(Body.Sun, date);
  const sunLongitude = normalize(sunTropical - lahiriAyanamsa(date));
  const planets = PLANET_DEFINITIONS.map((definition) =>
    planetPosition(definition, date, ascendantSign, sunLongitude)
  );
  const rahuLongitude = meanNodeLongitude(date);
  planets.push(nodePosition('rahu', rahuLongitude, ascendantSign));
  planets.push(nodePosition('ketu', normalize(rahuLongitude + 180), ascendantSign));
  const moon = planets.find((planet) => planet.key === 'moon');
  const ascendant = {
    longitude: ascendantLongitude,
    degreeInSign: ascendantLongitude % 30,
    sign: ascendantSign,
    rashi: RASHIS[ascendantSign],
    navamsaSign: navamsaSignFor(ascendantLongitude),
    nakshatra: nakshatraAt(ascendantLongitude),
  };

  const report = {
    id: `${birthDate}-${birthTime}-${Number(city.lat).toFixed(4)}-${Number(city.lng).toFixed(4)}`,
    person: { name: name.trim(), birthDate, birthTime, city, timeAccuracy },
    instant: date.toISOString(),
    localDateTime: resolved.local.toISO(),
    timezone: {
      id: city.tz,
      offset: resolved.local.toFormat('ZZ'),
      name: resolved.local.offsetNameLong || resolved.local.offsetNameShort,
      isDst: resolved.local.isInDST,
      possibleOffsets: resolved.possibleOffsets,
    },
    settings: {
      zodiac: 'Sidereal', ayanamsa: 'Lahiri / Chitrapaksha',
      chart: 'South Indian fixed-sign', houses: 'Whole-sign Rashi houses',
      nodes: 'Mean lunar nodes', dasha: 'Vimshottari · 365.2425-day civil year',
      ephemeris: 'Astronomy Engine geocentric apparent positions',
    },
    ayanamsaDegrees: lahiriAyanamsa(date),
    ascendant,
    moon,
    planets,
  };
  report.yogas = detectYogas(planets);
  report.dashas = calculateVimshottari(date, moon.longitude);
  return report;
};

export const formatZodiacDegree = (longitude) => {
  const degree = normalize(longitude) % 30;
  const whole = Math.floor(degree);
  const minutes = Math.floor((degree - whole) * 60);
  const seconds = Math.round((((degree - whole) * 60) - minutes) * 60);
  return `${String(whole).padStart(2, '0')}° ${String(minutes).padStart(2, '0')}′ ${String(seconds).padStart(2, '0')}″`;
};

export const dashaLordFor = (key) => dashaDefinition(key);

export const dashaInterpretation = (report, lordKey) => {
  const planet = report.planets.find((item) => item.key === lordKey);
  const house = planet?.house || 1;
  const planetTheme = PLANET_THEMES[lordKey] || { te: 'జీవన మార్పులు', en: 'life developments' };
  const houseTheme = HOUSE_THEMES[house - 1];
  return {
    te: `సాంప్రదాయ సూచన: ${planetTheme.te}. ${house}వ భావంలో స్థితి వల్ల ${houseTheme.te} అంశాలు ప్రాధాన్యం పొందవచ్చు. భుక్తి, అంతర్దశలు, దృష్టులు ఫలితాన్ని మారుస్తాయి.`,
    en: `Traditional focus: ${planetTheme.en}. Its placement in house ${house} highlights ${houseTheme.en}. Sign strength, sub-periods, aspects and transits modify the result.`,
  };
};

export const dashaPlainSummary = (report, lordKey) => {
  const planet = report.planets.find((item) => item.key === lordKey);
  const house = planet?.house || 1;
  const name = planet?.name || { te: 'ఈ గ్రహం', en: 'This planet' };
  const houseTheme = HOUSE_THEMES[house - 1];
  const practical = {
    sun: { te: 'బాధ్యత తీసుకోవడం, ఆత్మవిశ్వాసాన్ని సమతుల్యం చేయడం మరియు అధికారులతో స్పష్టంగా వ్యవహరించడం ఉపయోగకరం.', en: 'Take responsibility, balance confidence and handle authority clearly.' },
    moon: { te: 'మనశ్శాంతి, కుటుంబ సమయం మరియు స్థిరమైన దినచర్యకు ప్రాధాన్యం ఇవ్వడం ఉపయోగకరం.', en: 'Prioritise emotional steadiness, family time and a reliable routine.' },
    mars: { te: 'చర్యకు ముందు ప్రణాళిక పెట్టి, శక్తిని పని, వ్యాయామం లేదా నిర్మాణాత్మక లక్ష్యానికి మళ్లించడం ఉపయోగకరం.', en: 'Plan before acting and direct energy into work, movement or a constructive goal.' },
    mercury: { te: 'నేర్చుకోవడం, పత్రాలు, సంభాషణ మరియు లెక్కలను రెండుసార్లు తనిఖీ చేయడం ఉపయోగకరం.', en: 'Focus on learning, documents and communication, and double-check the details.' },
    jupiter: { te: 'గురువుల సలహా, దీర్ఘకాల దృష్టి మరియు నైతిక నిర్ణయాలు మంచి ఆధారం అవుతాయి.', en: 'Mentorship, long-term perspective and principled decisions can provide support.' },
    venus: { te: 'సంబంధాలు, ఒప్పందాలు, సౌకర్యం మరియు ఖర్చుల మధ్య సమతుల్యం పెట్టడం ఉపయోగకరం.', en: 'Balance relationships, agreements, comfort and spending.' },
    saturn: { te: 'నెమ్మదిగా వచ్చినా క్రమశిక్షణ, హద్దులు మరియు నిరంతర శ్రమపై ఆధారపడటం మంచిది.', en: 'Even if progress feels slow, rely on discipline, boundaries and consistent effort.' },
    rahu: { te: 'కొత్త అవకాశాలను పరిశీలించండి, కానీ అతిగా ఆశపడకుండా వాస్తవాలు, ప్రమాదం మరియు పత్రాలను తనిఖీ చేయండి.', en: 'Explore unusual opportunities, but verify facts, risk and paperwork before committing.' },
    ketu: { te: 'అవసరం లేని విషయాలను వదిలి, పరిశోధన, నైపుణ్యం మరియు అంతర్గత స్పష్టతపై దృష్టి పెట్టడం ఉపయోగకరం.', en: 'Release distractions and focus on research, skill and inner clarity.' },
  }[lordKey];
  return {
    te: `సులభంగా చెప్పాలంటే, ${name.te} దశలో ${houseTheme.te}కు సంబంధించిన నిర్ణయాలు ముందుకు రావచ్చు. ${practical?.te || 'స్పష్టమైన ప్రణాళికతో ముందుకు వెళ్లండి.'}`,
    en: `Simply put, a ${name.en} period may bring decisions around ${houseTheme.en} to the foreground. ${practical?.en || 'Move forward with a clear plan.'}`,
  };
};
