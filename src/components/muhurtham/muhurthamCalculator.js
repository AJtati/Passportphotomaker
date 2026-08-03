import { Body, Ecliptic, GeoVector } from 'astronomy-engine';
import { DateTime } from 'luxon';
import { calculateHoroscope, NAKSHATRAS, RASHIS } from '../horoscope/horoscopeCalculator';
import { HORA_PLANETS } from '../panchangam/calendarDetails';
import { horasForCivilDate } from '../panchangam/helpers';
import { lahiriAyanamsa } from '../panchangam/lagnaCalculator';

const MINUTE = 60 * 1000;
const NAKSHATRA_WIDTH = 360 / 27;
const SIGN_LORDS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
const ROLE_WEIGHTS = { owner: 1.25, spouse: 1.1, family: 1, child: 0.75 };
const FAVORABLE_TITHIS = new Set([2, 3, 5, 7, 10, 11, 12, 13]);
const FAVORABLE_NAKSHATRAS = new Set([3, 4, 11, 12, 13, 16, 20, 21, 22, 23, 25, 26]);
const FAVORABLE_WEEKDAYS = new Set([1, 3, 4, 5, 6]);
const HORA_BASE = { jupiter: 10, venus: 8, moon: 7, mercury: 6, sun: 4, mars: 2, saturn: 0 };

export const MUHURTHAM_METHOD = {
  name: { te: 'తెలుగు / దక్షిణ భారత ప్రాథమిక నియమావళి v1', en: 'Telugu / South Indian baseline rules v1' },
  sources: ['Kalaprakasika', 'B. V. Raman · Muhurtha (Electional Astrology)', 'Traditional Nava Tara and Chandra Bala rules'],
  notice: {
    te: 'ఖగోళ సమయాలు గణితపరమైనవి. శుభాశుభ నిర్ణయం సంప్రదాయ వ్యాఖ్యానం; ప్రాంతీయ కుటుంబ ఆచారం భిన్నంగా ఉండవచ్చు.',
    en: 'Astronomical timings are calculated. Suitability is a traditional interpretation; regional and family practice can differ.',
  },
};

export const TARAS = [
  { key: 'janma', name: { te: 'జన్మ తార', en: 'Janma Tara' }, tone: 'caution', score: -3 },
  { key: 'sampat', name: { te: 'సంపత్ తార', en: 'Sampat Tara' }, tone: 'strong', score: 12 },
  { key: 'vipat', name: { te: 'విపత్ తార', en: 'Vipat Tara' }, tone: 'avoid', score: -10 },
  { key: 'kshema', name: { te: 'క్షేమ తార', en: 'Kshema Tara' }, tone: 'good', score: 9 },
  { key: 'pratyari', name: { te: 'ప్రత్యరి తార', en: 'Pratyari Tara' }, tone: 'avoid', score: -8 },
  { key: 'sadhana', name: { te: 'సాధన తార', en: 'Sadhana Tara' }, tone: 'strong', score: 11 },
  { key: 'naidhana', name: { te: 'నైధన తార', en: 'Naidhana Tara' }, tone: 'avoid', score: -12 },
  { key: 'mitra', name: { te: 'మిత్ర తార', en: 'Mitra Tara' }, tone: 'good', score: 8 },
  { key: 'parama-mitra', name: { te: 'పరమ మిత్ర తార', en: 'Parama Mitra Tara' }, tone: 'good', score: 9 },
];

export const calculateTarabala = (janmaNakshatraIndex, eventNakshatraIndex) => {
  const count = ((Number(eventNakshatraIndex) - Number(janmaNakshatraIndex) + 27) % 27) + 1;
  const cyclePosition = ((count - 1) % 9) + 1;
  return {
    ...TARAS[cyclePosition - 1], count, cyclePosition,
    janmaNakshatraNumber: Number(janmaNakshatraIndex) + 1,
    eventNakshatraNumber: Number(eventNakshatraIndex) + 1,
  };
};

export const calculateChandrabala = (janmaRashiIndex, eventRashiIndex) => {
  const house = ((Number(eventRashiIndex) - Number(janmaRashiIndex) + 12) % 12) + 1;
  if ([1, 3, 6, 7, 10, 11].includes(house)) {
    return { house, janmaRashiNumber: Number(janmaRashiIndex) + 1, eventRashiNumber: Number(eventRashiIndex) + 1, tone: 'good', score: 8, name: { te: `${house}వ స్థానం · అనుకూలం`, en: `${house}${ordinal(house)} from Moon · Supportive` } };
  }
  if (house === 8) {
    return { house, janmaRashiNumber: Number(janmaRashiIndex) + 1, eventRashiNumber: Number(eventRashiIndex) + 1, tone: 'avoid', score: -10, name: { te: 'అష్టమ చంద్రుడు · నివారించాలి', en: 'Chandrashtama · Avoid' } };
  }
  return { house, janmaRashiNumber: Number(janmaRashiIndex) + 1, eventRashiNumber: Number(eventRashiIndex) + 1, tone: 'caution', score: 0, name: { te: `${house}వ స్థానం · మిశ్రమం`, en: `${house}${ordinal(house)} from Moon · Mixed` } };
};

const ordinal = (number) => {
  if (number % 10 === 1 && number !== 11) return 'st';
  if (number % 10 === 2 && number !== 12) return 'nd';
  if (number % 10 === 3 && number !== 13) return 'rd';
  return 'th';
};

const normalize = (value) => ((value % 360) + 360) % 360;
const siderealMoonLongitude = (date) => normalize(Ecliptic(GeoVector(Body.Moon, date, true)).elon - lahiriAyanamsa(date));
const eventSkyAt = (date) => {
  const longitude = siderealMoonLongitude(date);
  const nakshatraIndex = Math.floor(longitude / NAKSHATRA_WIDTH) % 27;
  return { longitude, nakshatraIndex, rashiIndex: Math.floor(longitude / 30) % 12 };
};

const asRange = (range) => range?.start && range?.end ? {
  start: new Date(range.start).getTime(), end: new Date(range.end).getTime(),
} : null;

export const intersectRanges = (...ranges) => {
  const normalized = ranges.map(asRange).filter(Boolean);
  if (!normalized.length) return null;
  const start = Math.max(...normalized.map((range) => range.start));
  const end = Math.min(...normalized.map((range) => range.end));
  return end > start ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : null;
};

const subtractRange = (segments, exclusion) => {
  const cut = asRange(exclusion);
  if (!cut) return segments;
  return segments.flatMap((segment) => {
    const source = asRange(segment);
    if (cut.end <= source.start || cut.start >= source.end) return [segment];
    const parts = [];
    if (cut.start > source.start) parts.push({ start: new Date(source.start).toISOString(), end: new Date(cut.start).toISOString() });
    if (cut.end < source.end) parts.push({ start: new Date(cut.end).toISOString(), end: new Date(source.end).toISOString() });
    return parts;
  });
};

export const subtractForbiddenRanges = (range, exclusions) => exclusions
  .filter(Boolean)
  .reduce(subtractRange, [range]);

const overlaps = (first, second) => Boolean(intersectRanges(first, second));
const containsInstant = (range, instant) => {
  const value = new Date(instant).getTime();
  return new Date(range?.start || 0).getTime() <= value && new Date(range?.end || 0).getTime() > value;
};
const tithiNumberAt = (day, instant) => {
  const end = new Date(day.tithi?.endsAt || 0).getTime();
  if (end && instant >= end && day.tithi?.nextTithi?.number) return Number(day.tithi.nextTithi.number);
  return Number(day.tithi?.number || 0);
};
const tithiLabelAt = (day, instant) => {
  const end = new Date(day.tithi?.endsAt || 0).getTime();
  return end && instant >= end && day.tithi?.nextTithi ? day.tithi.nextTithi : day.tithi;
};
const pakshaTithi = (number) => ((number - 1) % 15) + 1;

const personalHora = (participant, planetKey) => {
  const natal = participant.chart;
  const ascendantLord = SIGN_LORDS[natal.ascendant.sign];
  const moonLord = SIGN_LORDS[natal.moon.sign];
  const natalPlanet = natal.planets.find((planet) => planet.key === planetKey);
  const reasons = [];
  const baseScore = HORA_BASE[planetKey] || 0;
  const lagnaLordBonus = planetKey === ascendantLord ? 4 : 0;
  const rashiLordBonus = planetKey === moonLord ? 4 : 0;
  const dignityBonus = ['own', 'exalted'].includes(natalPlanet?.dignity) ? 2 : 0;
  const score = baseScore + lagnaLordBonus + rashiLordBonus + dignityBonus;
  if (lagnaLordBonus) reasons.push({ te: 'జన్మ లగ్నాధిపతి హోరా', en: 'Hora of the natal Lagna lord' });
  if (rashiLordBonus) reasons.push({ te: 'జన్మ రాశ్యాధిపతి హోరా', en: 'Hora of the Janma Rashi lord' });
  if (dignityBonus) reasons.push({ te: 'జాతకంలో గ్రహబలం ఉంది', en: 'Planet is strong in the natal chart' });
  if (!reasons.length) reasons.push(HORA_PLANETS[planetKey]?.guidance || { te: 'సాధారణ హోరా అనుకూలత', en: 'General Hora suitability' });
  return { score, baseScore, lagnaLordBonus, rashiLordBonus, dignityBonus, reasons, ascendantLord, moonLord, natalPlanet };
};

const natalProfileFor = (participant) => {
  const chart = participant.chart;
  const lagnaLordKey = SIGN_LORDS[chart.ascendant.sign];
  const rashiLordKey = SIGN_LORDS[chart.moon.sign];
  return {
    lagna: chart.ascendant,
    rashi: chart.moon.rashi,
    moonLongitude: chart.moon.longitude,
    nakshatra: chart.moon.nakshatra,
    lagnaLordKey,
    rashiLordKey,
    nakshatraLord: chart.planets.find((planet) => planet.key === chart.moon.nakshatra.lord),
    lagnaLord: chart.planets.find((planet) => planet.key === lagnaLordKey),
    rashiLord: chart.planets.find((planet) => planet.key === rashiLordKey),
  };
};

const participantFit = (participant, sky, planetKey) => {
  const tara = calculateTarabala(participant.chart.moon.nakshatra.index, sky.nakshatraIndex);
  const chandra = calculateChandrabala(participant.chart.moon.sign, sky.rashiIndex);
  const hora = personalHora(participant, planetKey);
  return {
    id: participant.id,
    name: participant.name,
    role: participant.role,
    tara,
    chandra,
    hora,
    natal: natalProfileFor(participant),
    roleWeight: ROLE_WEIGHTS[participant.role] || 1,
    score: tara.score + chandra.score + hora.score,
  };
};

export const calculatePersonalShubhaYoga = (fit, namedYogas = [], nityaYogaPass = null) => {
  const severe = ['vipat', 'pratyari', 'naidhana'].includes(fit.tara.key) || fit.chandra.house === 8;
  const personalSupports = [
    ['tara', ['strong', 'good'].includes(fit.tara.tone)],
    ['chandra', fit.chandra.tone === 'good'],
    ['hora', fit.hora.score >= 8],
  ];
  const supportCount = personalSupports.filter(([, supported]) => supported).length;
  let tone = 'mixed';
  if (severe) tone = 'unsuitable';
  else if (namedYogas.length && supportCount >= 2 && nityaYogaPass !== false) tone = 'excellent';
  else if (supportCount >= 2 && nityaYogaPass !== false) tone = 'suitable';
  const labels = {
    excellent: { te: 'అత్యంత అనుకూలమైన వ్యక్తిగత శుభ సమయం', en: 'Highly supportive personal Shubha window' },
    suitable: { te: 'అనుకూలమైన వ్యక్తిగత శుభ సమయం', en: 'Supportive personal Shubha window' },
    mixed: { te: 'మిశ్రమ వ్యక్తిగత అనుకూలత', en: 'Mixed personal suitability' },
    unsuitable: { te: 'ఈ వ్యక్తికి నివారించడం మంచిది', en: 'Better avoided for this person' },
  };
  const explanation = {
    te: `ఇది వేరొక నిత్య యోగం కాదు. కార్యదిన శుభ యోగాలు, ${fit.tara.name.te}, ${fit.chandra.name.te}, ఎంచుకున్న హోరా బలాన్ని కలిపిన వ్యక్తిగత నిర్ణయం.`,
    en: `This is not another Nitya Yoga. It is a personal verdict combining the event-day Yogas, ${fit.tara.name.en}, ${fit.chandra.name.en} and the selected Hora strength.`,
  };
  return {
    tone, name: labels[tone], explanation, namedYogas,
    factors: {
      tara: fit.tara, chandra: fit.chandra, hora: fit.hora,
      nityaYogaPass, supportCount, severe,
    },
  };
};

const eventChartStrength = (instant, city, lagna) => {
  const local = DateTime.fromJSDate(new Date(instant), { zone: city.tz });
  const chart = calculateHoroscope({
    name: 'Muhurtham', birthDate: local.toISODate(), birthTime: local.toFormat('HH:mm'), city,
    selectedOffset: local.offset, timeAccuracy: 'exact',
  });
  const lagnaLordKey = SIGN_LORDS[lagna.rashiIndex];
  const fourthSign = (lagna.rashiIndex + 3) % 12;
  const fourthLordKey = SIGN_LORDS[fourthSign];
  const lagnaLord = chart.planets.find((planet) => planet.key === lagnaLordKey);
  const fourthLord = chart.planets.find((planet) => planet.key === fourthLordKey);
  const eighthMalefics = chart.planets.filter((planet) => ['mars', 'saturn', 'rahu', 'ketu'].includes(planet.key) && planet.house === 8);
  const components = [
    { key: 'lagna-lord-dignity', label: { te: 'ముహూర్త లగ్నాధిపతి స్వ/ఉచ్చ బలం', en: 'Event Lagna-lord own/exalted strength' }, value: ['own', 'exalted'].includes(lagnaLord?.dignity) ? 6 : 0 },
    { key: 'lagna-lord-house-support', label: { te: 'ముహూర్త లగ్నాధిపతి అనుకూల భావం', en: 'Event Lagna-lord supportive house' }, value: [1, 4, 5, 7, 9, 10].includes(lagnaLord?.house) ? 3 : 0 },
    { key: 'lagna-lord-dusthana', label: { te: 'ముహూర్త లగ్నాధిపతి 6/8/12 భావం', en: 'Event Lagna-lord in house 6/8/12' }, value: [6, 8, 12].includes(lagnaLord?.house) ? -5 : 0 },
    { key: 'fourth-lord-dignity', label: { te: 'చతుర్థాధిపతి స్వ/ఉచ్చ బలం', en: 'Fourth-lord own/exalted strength' }, value: ['own', 'exalted'].includes(fourthLord?.dignity) ? 5 : 0 },
    { key: 'fourth-lord-house-support', label: { te: 'చతుర్థాధిపతి అనుకూల భావం', en: 'Fourth-lord supportive house' }, value: [1, 4, 5, 7, 9, 10, 11].includes(fourthLord?.house) ? 3 : 0 },
    { key: 'eighth-house-malefics', label: { te: 'అష్టమ భావ పాపగ్రహ తగ్గింపు', en: 'Eighth-house malefic deduction' }, value: eighthMalefics.length * -4 },
  ];
  const score = components.reduce((sum, component) => sum + component.value, 0);
  return { score, components, lagnaLord, fourthLord, eighthMalefics };
};

const lagnaNatureScore = (lagna) => {
  const nature = lagna.nature?.en || '';
  if (nature.includes('Fixed')) return 12;
  if (nature.includes('Dual')) return 5;
  return 0;
};

const forbiddenRanges = (day) => [
  day.rahukalam, day.yamagandam, day.gulikaKalam,
  ...(day.durmuhurtham || []), ...(day.varjyam || []),
].filter(Boolean);

const civilBounds = (day, timezone) => {
  const start = DateTime.fromISO(day.date, { zone: timezone }).startOf('day');
  return { start: start.toUTC().toISO(), end: start.plus({ days: 1 }).toUTC().toISO() };
};

const preliminaryCandidates = (day, city, participants) => {
  const civil = civilBounds(day, city.tz);
  const horas = horasForCivilDate(day.previousHoras, day.horas, day.date, city.tz);
  const exclusions = forbiddenRanges(day);
  return horas.flatMap((hora) => (day.lagnas || []).flatMap((lagna) => {
    const overlap = intersectRanges(hora, lagna, civil);
    if (!overlap) return [];
    return subtractForbiddenRanges(overlap, exclusions).flatMap((segment) => {
      const durationMinutes = (new Date(segment.end) - new Date(segment.start)) / MINUTE;
      if (durationMinutes < 8) return [];
      const midpoint = new Date((new Date(segment.start).getTime() + new Date(segment.end).getTime()) / 2);
      const sky = eventSkyAt(midpoint);
      const tithiNumber = tithiNumberAt(day, midpoint.getTime());
      const tithiPhaseNumber = pakshaTithi(tithiNumber);
      const weekdayPass = FAVORABLE_WEEKDAYS.has(Number(day.vara?.number));
      const tithiPass = FAVORABLE_TITHIS.has(tithiPhaseNumber);
      const nakshatraPass = FAVORABLE_NAKSHATRAS.has(sky.nakshatraIndex);
      const yogaExact = midpoint.getTime() < new Date(day.yoga?.endsAt || 0).getTime();
      const yogaPass = yogaExact ? day.yoga?.isAuspicious !== false : null;
      const namedYogas = [...(day.previousSpecialYogas || []), ...(day.specialYogas || [])]
        .filter((yoga) => containsInstant(yoga, midpoint));
      const fits = participants.map((participant) => {
        const fit = participantFit(participant, sky, hora.planetKey);
        return { ...fit, shubhaYoga: calculatePersonalShubhaYoga(fit, namedYogas, yogaPass) };
      });
      const weightedFit = fits.reduce((sum, fit) => sum + fit.score * fit.roleWeight, 0)
        / fits.reduce((sum, fit) => sum + fit.roleWeight, 0);
      const karanaExact = midpoint.getTime() < new Date(day.karana?.endsAt || 0).getTime();
      const karanaPass = karanaExact ? Number(day.karana?.number) !== 7 : null;
      const amrita = (day.amritaGadiya || []).some((range) => overlaps(segment, range));
      const abhijit = day.abhijitMuhurtam && overlaps(segment, day.abhijitMuhurtam);
      const scoreComponents = [
        { key: 'baseline', label: { te: 'ప్రాథమిక ముహూర్త స్కోరు', en: 'Baseline Muhurtham score' }, value: 38 },
        { key: 'personal-fit', label: { te: 'పాత్ర బరువుతో కుటుంబ అనుకూలత', en: 'Role-weighted family suitability' }, value: weightedFit },
        { key: 'event-hora', label: { te: 'కార్య హోరా అనుకూలత', en: 'Event Hora suitability' }, value: HORA_BASE[hora.planetKey] || 0 },
        { key: 'lagna-nature', label: { te: 'లగ్న స్వభావం', en: 'Lagna nature' }, value: lagnaNatureScore(lagna) },
        { key: 'weekday', label: { te: 'వార బలం', en: 'Weekday suitability' }, value: weekdayPass ? 8 : -8 },
        { key: 'tithi', label: { te: 'తిథి బలం', en: 'Tithi suitability' }, value: tithiPass ? 12 : -10 },
        { key: 'nakshatra', label: { te: 'కార్య నక్షత్ర బలం', en: 'Event Nakshatra suitability' }, value: nakshatraPass ? 14 : -12 },
        { key: 'nitya-yoga', label: { te: 'నిత్య యోగ బలం', en: 'Nitya Yoga suitability' }, value: yogaPass === true ? 4 : yogaPass === false ? -4 : 0 },
        { key: 'karana', label: { te: 'కరణ బలం', en: 'Karana suitability' }, value: karanaPass === true ? 3 : karanaPass === false ? -8 : 0 },
        { key: 'amrita', label: { te: 'అమృత ఘడియ బోనస్', en: 'Amrita Gadiya bonus' }, value: amrita ? 6 : 0 },
        { key: 'abhijit', label: { te: 'అభిజిత్ ముహూర్త బోనస్', en: 'Abhijit Muhurtham bonus' }, value: abhijit ? 3 : 0 },
      ];
      const baseScore = scoreComponents.reduce((sum, component) => sum + component.value, 0);
      return [{
        id: `${day.date}-${segment.start}-${hora.planetKey}-${lagna.key}`,
        date: day.date, start: segment.start, end: segment.end, durationMinutes,
        midpoint: midpoint.toISOString(), hora, lagna, sky, fits, weightedFit, baseScore, scoreComponents,
        panchanga: {
          vara: day.vara, tithi: tithiLabelAt(day, midpoint.getTime()), tithiNumber,
          nakshatra: NAKSHATRAS[sky.nakshatraIndex], moonRashi: RASHIS[sky.rashiIndex],
          yoga: day.yoga, karana: day.karana, masa: day.masa, paksha: day.paksha,
          specialYogas: namedYogas,
        },
        checks: { weekdayPass, tithiPass, nakshatraPass, yogaPass, karanaPass, amrita, abhijit },
        excluded: exclusions,
      }];
    });
  }));
};

const dedupeCandidates = (candidates, limit = Infinity) => {
  const selected = [];
  for (const candidate of candidates) {
    const closeMatch = selected.some((item) => item.date === candidate.date
      && item.lagna.key === candidate.lagna.key
      && Math.abs(new Date(item.start) - new Date(candidate.start)) < 20 * MINUTE);
    if (!closeMatch) selected.push(candidate);
    if (selected.length >= limit) break;
  }
  return selected;
};

export const selectQualifiedCandidates = (candidates, minScore = 0, maxResults = Infinity) => dedupeCandidates(
  [...candidates]
    .filter((candidate) => candidate.score >= minScore)
    .sort((first, second) => first.blockingCount - second.blockingCount || second.score - first.score),
  maxResults
);

export const buildPersonalWarnings = (fits = []) => fits.flatMap((fit) => {
  const personName = fit.name || fit.role || 'Person';
  const warnings = [];
  if (['vipat', 'pratyari', 'naidhana'].includes(fit.tara.key)) {
    warnings.push({
      key: `${fit.id}-tara`, personId: fit.id, personName, role: fit.role, kind: 'tara', factor: fit.tara.name,
      message: {
        te: `${personName}కు ${fit.tara.name.te} ఉంది. మరొకరి అనుకూల ఫలితం ఈ వ్యక్తిగత తారా హెచ్చరికను రద్దు చేయదు.`,
        en: `${personName} has ${fit.tara.name.en}. Another person's favourable result does not cancel this individual Tara caution.`,
      },
    });
  }
  if (fit.chandra.house === 8) {
    warnings.push({
      key: `${fit.id}-chandra`, personId: fit.id, personName, role: fit.role, kind: 'chandra', factor: fit.chandra.name,
      message: {
        te: `${personName}కు అష్టమ చంద్రుడు ఉంది. కుటుంబ మొత్తం స్కోరు అనుకూలంగా ఉన్నా ఈ వ్యక్తిగత హెచ్చరిక అలాగే ఉంటుంది.`,
        en: `${personName} has Chandrashtama. This individual caution remains even when the combined family score is favourable.`,
      },
    });
  }
  return warnings;
});

export const buildScoreLedger = (components, blockingCount = 0) => {
  const rawScore = Math.round(components.reduce((sum, component) => sum + Number(component.value || 0), 0));
  const blockingCap = Math.max(0, 100 - Number(blockingCount || 0) * 18);
  const finalScore = Math.max(0, Math.min(blockingCap, rawScore));
  return {
    components, rawScore, blockingCount: Number(blockingCount || 0), blockingCap,
    finalAdjustment: finalScore - rawScore, finalScore,
  };
};

export const evaluateMuhurtamDays = (days, city, participants, options = {}) => {
  if (!days?.length) throw new Error('No Panchangam days were supplied.');
  if (!participants?.length) throw new Error('Add at least one person.');
  const normalizedOptions = typeof options === 'number'
    ? { maxResults: options, minScore: 0 }
    : { minScore: 0, maxResults: Infinity, ...options };
  const minScore = Math.max(0, Number(normalizedOptions.minScore) || 0);
  const maxResults = Number.isFinite(Number(normalizedOptions.maxResults))
    ? Math.max(1, Number(normalizedOptions.maxResults))
    : Infinity;
  const preliminary = days.flatMap((day) => preliminaryCandidates(day, city, participants))
    .sort((first, second) => second.baseScore - first.baseScore);
  const enriched = preliminary.map((candidate) => {
    const chartStrength = eventChartStrength(candidate.midpoint, city, candidate.lagna);
    const personalWarnings = buildPersonalWarnings(candidate.fits);
    const blockingCount = [candidate.checks.weekdayPass, candidate.checks.tithiPass, candidate.checks.nakshatraPass,
      candidate.checks.yogaPass, candidate.checks.karanaPass]
      .filter((value) => value === false).length + personalWarnings.length;
    const scoreLedger = buildScoreLedger([...candidate.scoreComponents, ...chartStrength.components], blockingCount);
    const score = scoreLedger.finalScore;
    return {
      ...candidate, chartStrength, score, blockingCount, personalWarnings,
      scoreLedger,
      grade: personalWarnings.length ? 'caution' : blockingCount === 0 && score >= 75 ? 'best' : blockingCount <= 1 && score >= 58 ? 'review' : 'caution',
    };
  });
  return selectQualifiedCandidates(enriched, minScore, maxResults);
};
