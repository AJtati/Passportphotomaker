import { NAKSHATRAS, RASHIS } from './horoscopeCalculator';

const bi = (te, en) => ({ te, en });
const normalize = (value) => ((value % 360) + 360) % 360;
const signOf = (longitude) => Math.floor(normalize(longitude) / 30);
const degreeOf = (longitude) => normalize(longitude) % 30;
const partOf = (longitude, division) => Math.min(division - 1, Math.floor(degreeOf(longitude) / (30 / division)));

export const DIVISIONAL_CHARTS = [
  { division: 1, key: 'd1', name: bi('రాశి', 'Rashi'), purpose: bi('శరీరం, స్వభావం, సంపూర్ణ జన్మ జాతక పునాది', 'Body, identity and the foundation of the full natal chart') },
  { division: 2, key: 'd2', name: bi('హోరా', 'Hora'), purpose: bi('ధనం, వనరులు, పోషణ', 'Wealth, resources and sustenance') },
  { division: 3, key: 'd3', name: bi('ద్రెక్కాణ', 'Drekkana'), purpose: bi('సహోదరులు, ధైర్యం, స్వప్రయత్నం', 'Siblings, courage and self-effort') },
  { division: 4, key: 'd4', name: bi('చతుర్థాంశ', 'Chaturthamsha'), purpose: bi('ఆస్తి, నివాసం, భాగ్యం', 'Property, residence and fortune') },
  { division: 7, key: 'd7', name: bi('సప్తాంశ', 'Saptamsha'), purpose: bi('సంతానం, సృజనాత్మక కొనసాగింపు', 'Children and creative continuity') },
  { division: 9, key: 'd9', name: bi('నవాంశ', 'Navamsa'), purpose: bi('ధర్మం, వివాహ బలం, గ్రహ పరిపక్వత', 'Dharma, marriage strength and planetary maturity') },
  { division: 10, key: 'd10', name: bi('దశాంశ', 'Dashamsha'), purpose: bi('వృత్తి, బాధ్యత, ప్రజా పాత్ర', 'Profession, responsibility and public role') },
  { division: 12, key: 'd12', name: bi('ద్వాదశాంశ', 'Dwadashamsha'), purpose: bi('తల్లిదండ్రులు, వంశ పరంపర', 'Parents and inherited lineage patterns') },
  { division: 16, key: 'd16', name: bi('షోడశాంశ', 'Shodashamsha'), purpose: bi('వాహనాలు, సౌకర్యం, జీవన సుఖం', 'Vehicles, comforts and quality of life') },
  { division: 20, key: 'd20', name: bi('వింశాంశ', 'Vimshamsha'), purpose: bi('ఆధ్యాత్మిక సాధన, ఉపాసన', 'Spiritual practice and devotion') },
  { division: 24, key: 'd24', name: bi('చతుర్వింశాంశ', 'Chaturvimshamsha'), purpose: bi('విద్య, శాస్త్ర అధ్యయనం, నైపుణ్యం', 'Education, scholarship and mastery') },
  { division: 27, key: 'd27', name: bi('సప్తవింశాంశ', 'Saptavimshamsha'), purpose: bi('అంతర్గత బలం, బలహీనతల పరిశీలన', 'Inner strengths and vulnerabilities') },
  { division: 30, key: 'd30', name: bi('త్రింశాంశ', 'Trimshamsha'), purpose: bi('సవాళ్లు, ప్రతికూల నమూనాలు', 'Challenges and difficult patterns') },
  { division: 40, key: 'd40', name: bi('ఖవేదాంశ', 'Khavedamsha'), purpose: bi('మాతృ వంశ శుభ సూచనలు', 'Maternal-line auspicious support') },
  { division: 45, key: 'd45', name: bi('అక్షవేదాంశ', 'Akshavedamsha'), purpose: bi('పితృ వంశం, సాధారణ శ్రేయస్సు', 'Paternal lineage and general wellbeing') },
  { division: 60, key: 'd60', name: bi('షష్ట్యాంశ', 'Shashtiamsha'), purpose: bi('సూక్ష్మ కర్మ నమూనాలు; ఖచ్చిత సమయం తప్పనిసరి', 'Fine karmic patterns; requires a highly accurate birth time') },
];

export const divisionalSignFor = (longitude, division) => {
  const sign = signOf(longitude);
  const degree = degreeOf(longitude);
  const part = partOf(longitude, division);
  const movable = sign % 3 === 0;
  const fixed = sign % 3 === 1;
  switch (division) {
    case 1: return sign;
    case 2:
      if (sign % 2 === 0) return degree < 15 ? 4 : 3;
      return degree < 15 ? 3 : 4;
    case 3: return (sign + part * 4) % 12;
    case 4: return (sign + part * 3) % 12;
    case 7: return ((sign % 2 === 0 ? sign : sign + 6) + part) % 12;
    case 9: {
      const start = movable ? sign : fixed ? sign + 8 : sign + 4;
      return (start + part) % 12;
    }
    case 10: return ((sign % 2 === 0 ? sign : sign + 8) + part) % 12;
    case 12: return (sign + part) % 12;
    case 16: return ((movable ? 0 : fixed ? 4 : 8) + part) % 12;
    case 20: return ((movable ? 0 : fixed ? 8 : 4) + part) % 12;
    case 24: return ((sign % 2 === 0 ? 4 : 3) + part) % 12;
    case 27: return (([0, 4, 8].includes(sign) ? 0 : [1, 5, 9].includes(sign) ? 3 : [2, 6, 10].includes(sign) ? 6 : 9) + part) % 12;
    case 30:
      if (sign % 2 === 0) {
        if (degree < 5) return 0; if (degree < 10) return 10; if (degree < 18) return 8; if (degree < 25) return 2; return 6;
      }
      if (degree < 5) return 1; if (degree < 12) return 5; if (degree < 20) return 11; if (degree < 25) return 9; return 7;
    case 40: return ((sign % 2 === 0 ? 0 : 6) + part) % 12;
    case 45: return ((movable ? 0 : fixed ? 4 : 8) + part) % 12;
    case 60: return (sign + part) % 12;
    default: return (sign * division + part) % 12;
  }
};

const chartFor = (report, definition) => ({
  ...definition,
  title: bi(`${definition.key.toUpperCase()} ${definition.name.te}`, `${definition.key.toUpperCase()} ${definition.name.en}`),
  ascendantSign: divisionalSignFor(report.ascendant.longitude, definition.division),
  planets: report.planets.map((planet) => ({ ...planet, sign: divisionalSignFor(planet.longitude, definition.division) })),
});

const TITHIS = [
  ['పాడ్యమి', 'Pratipada'], ['విదియ', 'Dwitiya'], ['తదియ', 'Tritiya'], ['చవితి', 'Chaturthi'], ['పంచమి', 'Panchami'],
  ['షష్ఠి', 'Shashthi'], ['సప్తమి', 'Saptami'], ['అష్టమి', 'Ashtami'], ['నవమి', 'Navami'], ['దశమి', 'Dashami'],
  ['ఏకాదశి', 'Ekadashi'], ['ద్వాదశి', 'Dwadashi'], ['త్రయోదశి', 'Trayodashi'], ['చతుర్దశి', 'Chaturdashi'], ['పౌర్ణమి / అమావాస్య', 'Purnima / Amavasya'],
].map(([te, en]) => bi(te, en));
const NITYA_YOGAS = [
  ['విష్కంభ', 'Vishkambha'], ['ప్రీతి', 'Priti'], ['ఆయుష్మాన్', 'Ayushman'], ['సౌభాగ్య', 'Saubhagya'], ['శోభన', 'Shobhana'], ['అతిగండ', 'Atiganda'],
  ['సుకర్మ', 'Sukarma'], ['ధృతి', 'Dhriti'], ['శూల', 'Shula'], ['గండ', 'Ganda'], ['వృద్ధి', 'Vriddhi'], ['ధ్రువ', 'Dhruva'], ['వ్యాఘాత', 'Vyaghata'],
  ['హర్షణ', 'Harshana'], ['వజ్ర', 'Vajra'], ['సిద్ధి', 'Siddhi'], ['వ్యతీపాత', 'Vyatipata'], ['వరీయాన్', 'Variyana'], ['పరిఘ', 'Parigha'],
  ['శివ', 'Shiva'], ['సిద్ధ', 'Siddha'], ['సాధ్య', 'Sadhya'], ['శుభ', 'Shubha'], ['శుక్ల', 'Shukla'], ['బ్రహ్మ', 'Brahma'], ['ఐంద్ర', 'Indra'], ['వైధృతి', 'Vaidhriti'],
].map(([te, en]) => bi(te, en));
const REPEATING_KARANAS = [bi('బవ', 'Bava'), bi('బాలవ', 'Balava'), bi('కౌలవ', 'Kaulava'), bi('తైతిల', 'Taitila'), bi('గరజ', 'Garaja'), bi('వణిజ', 'Vanija'), bi('విష్టి', 'Vishti')];

const birthPanchanga = (report) => {
  const sun = report.planets.find((planet) => planet.key === 'sun');
  const elongation = normalize(report.moon.longitude - sun.longitude);
  const tithiIndex = Math.floor(elongation / 12);
  const karanaIndex = Math.floor(elongation / 6);
  let karana;
  if (karanaIndex === 0) karana = bi('కింస్తుఘ్న', 'Kimstughna');
  else if (karanaIndex >= 57) karana = [bi('శకుని', 'Shakuni'), bi('చతుష్పాద', 'Chatushpada'), bi('నాగవ', 'Naga')][karanaIndex - 57];
  else karana = REPEATING_KARANAS[(karanaIndex - 1) % 7];
  const yogaIndex = Math.floor(normalize(sun.longitude + report.moon.longitude) / (360 / 27));
  return {
    paksha: tithiIndex < 15 ? bi('శుక్ల పక్షం', 'Shukla Paksha') : bi('కృష్ణ పక్షం', 'Krishna Paksha'),
    tithi: TITHIS[tithiIndex % 15], tithiNumber: tithiIndex + 1,
    yoga: NITYA_YOGAS[yogaIndex], yogaIndex,
    karana,
    weekday: new Intl.DateTimeFormat('en-GB', { timeZone: report.person.city.tz, weekday: 'long' }).format(new Date(report.instant)),
  };
};

const NATURAL = {
  sun: { moon: 1, mars: 1, jupiter: 1, mercury: 0, venus: -1, saturn: -1 },
  moon: { sun: 1, mercury: 1, mars: 0, jupiter: 0, venus: 0, saturn: 0 },
  mars: { sun: 1, moon: 1, jupiter: 1, venus: 0, saturn: 0, mercury: -1 },
  mercury: { sun: 1, venus: 1, mars: 0, jupiter: 0, saturn: 0, moon: -1 },
  jupiter: { sun: 1, moon: 1, mars: 1, saturn: 0, mercury: -1, venus: -1 },
  venus: { mercury: 1, saturn: 1, mars: 0, jupiter: 0, sun: -1, moon: -1 },
  saturn: { mercury: 1, venus: 1, jupiter: 0, sun: -1, moon: -1, mars: -1 },
};
const RELATION = {
  2: bi('అధిమిత్ర', 'Great friend'), 1: bi('మిత్ర', 'Friend'), 0: bi('సమ', 'Neutral'), '-1': bi('శత్రు', 'Enemy'), '-2': bi('అధిశత్రు', 'Great enemy'),
};
const GRAHA_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const friendshipTables = (report) => {
  const planets = Object.fromEntries(report.planets.map((planet) => [planet.key, planet]));
  return GRAHA_KEYS.map((first) => ({
    key: first, planet: planets[first],
    relations: GRAHA_KEYS.filter((second) => second !== first).map((second) => {
      const natural = NATURAL[first]?.[second] || 0;
      const distance = ((planets[second].sign - planets[first].sign + 12) % 12) + 1;
      const temporal = [2, 3, 4, 10, 11, 12].includes(distance) ? 1 : -1;
      return { key: second, planet: planets[second], natural, temporal, compound: natural + temporal, label: RELATION[natural + temporal] };
    }),
  }));
};

const NAV_TARA = [
  bi('జన్మ', 'Janma'), bi('సంపత్', 'Sampat'), bi('విపత్', 'Vipat'), bi('క్షేమ', 'Kshema'), bi('ప్రత్యరి', 'Pratyari'),
  bi('సాధన', 'Sadhana'), bi('నైధన', 'Naidhana'), bi('మిత్ర', 'Mitra'), bi('పరమ మిత్ర', 'Parama Mitra'),
];
const navTara = (report) => NAV_TARA.map((name, index) => ({
  name,
  tone: [1, 3, 5, 7, 8].includes(index) ? 'supportive' : [2, 4, 6].includes(index) ? 'caution' : 'neutral',
  stars: [0, 9, 18].map((offset) => NAKSHATRAS[(report.moon.nakshatra.index + index + offset) % 27]),
}));

const strengthTable = (report) => report.planets.filter((planet) => GRAHA_KEYS.includes(planet.key)).map((planet) => {
  const dignity = { exalted: 40, own: 32, neutral: 18, debilitated: 6 }[planet.dignity];
  const house = [1, 4, 7, 10].includes(planet.house) ? 30 : [5, 9].includes(planet.house) ? 27 : [3, 6, 10, 11].includes(planet.house) ? 22 : [6, 8, 12].includes(planet.house) ? 10 : 16;
  const condition = Math.max(0, Math.min(30, 20 + (planet.retrograde ? 6 : 0) - (planet.combust ? 12 : 0)));
  return { planet, dignity, house, condition, total: dignity + house + condition, max: 100 };
}).sort((first, second) => second.total - first.total);

const SIGN_STYLE = [
  bi('త్వరగా ప్రారంభించి నేరుగా స్పందించే', 'starts quickly and responds directly'), bi('స్థిరంగా, ఆచరణాత్మకంగా నిర్మించే', 'builds steadily and practically'),
  bi('ఆసక్తిగా, మాటల ద్వారా అనుకూలించే', 'adapts through curiosity and communication'), bi('రక్షణ, అనుబంధాన్ని ముందుంచే', 'prioritises protection and belonging'),
  bi('గౌరవం, సృజనాత్మక నాయకత్వాన్ని కోరే', 'seeks dignity and creative leadership'), bi('వివరాలు, సేవ, మెరుగుదలపై దృష్టి పెట్టే', 'focuses on detail, service and improvement'),
  bi('సమతుల్యత, భాగస్వామ్యాన్ని కోరే', 'seeks balance and partnership'), bi('లోతు, గోప్యత, మార్పుతో పనిచేసే', 'works through depth, privacy and transformation'),
  bi('అర్థం, విశ్వాసం, అన్వేషణను కోరే', 'seeks meaning, conviction and exploration'), bi('క్రమం, బాధ్యత, దీర్ఘకాల ఫలితాన్ని కోరే', 'values structure, duty and long-term results'),
  bi('స్వతంత్ర ఆలోచన, సమూహ ప్రయోజనాన్ని కలిపే', 'combines independent thought with collective purpose'), bi('సహానుభూతి, ఊహ, ఆధ్యాత్మిక దృష్టిని కలిగించే', 'brings empathy, imagination and spiritual sensitivity'),
];
const PREDICTION_AREAS = [
  { key: 'personality', title: bi('స్వభావం మరియు ప్రత్యేక లక్షణాలు', 'Personality and distinctive traits'), houses: [1, 5, 9], planets: ['sun', 'moon', 'mercury'] },
  { key: 'mind', title: bi('మనస్సు, భావోద్వేగాలు, సంభాషణ', 'Mind, emotions and communication'), houses: [1, 3, 4, 5], planets: ['moon', 'mercury'] },
  { key: 'education', title: bi('విద్య మరియు నైపుణ్యాలు', 'Education and skills'), houses: [2, 4, 5, 9], planets: ['mercury', 'jupiter'] },
  { key: 'career', title: bi('వృత్తి మరియు ప్రజా స్థానం', 'Career and public standing'), houses: [2, 6, 10, 11], planets: ['sun', 'mercury', 'saturn'] },
  { key: 'wealth', title: bi('ధనం, ఆదాయం, వారసత్వం', 'Wealth, income and inheritance'), houses: [2, 5, 8, 9, 11], planets: ['jupiter', 'venus', 'mercury'] },
  { key: 'marriage', title: bi('వివాహం మరియు భాగస్వామ్యం', 'Marriage and partnership'), houses: [2, 7, 8, 11], planets: ['venus', 'jupiter', 'moon'] },
  { key: 'family', title: bi('కుటుంబం, ఇల్లు, ఆస్తి', 'Family, home and property'), houses: [2, 4, 8], planets: ['moon', 'mars', 'venus'] },
  { key: 'children', title: bi('సంతానం మరియు సృజన', 'Children and creativity'), houses: [5, 9], planets: ['jupiter', 'moon'] },
  { key: 'travel', title: bi('ప్రయాణం మరియు విదేశీ సంబంధం', 'Travel and foreign connections'), houses: [3, 7, 9, 12], planets: ['rahu', 'jupiter', 'moon'] },
  { key: 'wellbeing', title: bi('ఆరోగ్య దినచర్య మరియు శక్తి', 'Wellbeing routines and vitality'), houses: [1, 6, 8, 12], planets: ['sun', 'moon', 'saturn'] },
  { key: 'spirituality', title: bi('ధర్మం మరియు ఆధ్యాత్మిక దిశ', 'Dharma and spiritual direction'), houses: [5, 9, 12], planets: ['jupiter', 'ketu'] },
];
const SIGN_LORDS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];

const predictionChapters = (report) => PREDICTION_AREAS.map((area) => {
  const planets = area.planets.map((key) => report.planets.find((planet) => planet.key === key)).filter(Boolean);
  const lords = area.houses.map((house) => report.planets.find((planet) => planet.key === SIGN_LORDS[(report.ascendant.sign + house - 1) % 12])).filter(Boolean);
  const unique = [...new Map([...planets, ...lords].map((planet) => [planet.key, planet])).values()];
  const supportive = unique.filter((planet) => ['own', 'exalted'].includes(planet.dignity) && !planet.combust);
  const attention = unique.filter((planet) => planet.dignity === 'debilitated' || planet.combust);
  const timing = [...new Map(lords.map((planet) => [planet.key, planet])).values()];
  const lead = planets[0] || lords[0];
  return {
    ...area,
    evidence: bi(
      `భావాలు ${area.houses.join(', ')}; కారక గ్రహాలు ${planets.map((planet) => planet.name.te).join(', ')}; భావాధిపతులు ${lords.map((planet) => planet.name.te).join(', ')}.`,
      `Houses ${area.houses.join(', ')}; natural significators ${planets.map((planet) => planet.name.en).join(', ')}; house lords ${lords.map((planet) => planet.name.en).join(', ')}.`
    ),
    plain: bi(
      `${lead?.name.te || 'ప్రధాన గ్రహం'} ${lead ? SIGN_STYLE[lead.sign].te : 'సందర్భానుసారం వ్యక్తమయ్యే'} విధానం ఈ అంశానికి ప్రధాన స్వరం. ${supportive.length ? `${supportive.map((planet) => planet.name.te).join(', ')} బలం సహకరిస్తుంది.` : 'ఒకే బలమైన గ్రహం కంటే సంబంధిత భావాల సమన్వయం ముఖ్యం.'} ${attention.length ? `${attention.map((planet) => planet.name.te).join(', ')} అంశాల్లో తొందరపడకుండా ప్రణాళిక అవసరం.` : 'ప్రధాన కారకుల్లో స్పష్టమైన నీచ/దగ్ధ ఒత్తిడి లేదు.'}`,
      `${lead?.name.en || 'The leading planet'} ${lead ? SIGN_STYLE[lead.sign].en : 'works according to context'}, setting the main tone for this area. ${supportive.length ? `${supportive.map((planet) => planet.name.en).join(', ')} provide support.` : 'Coordination between the relevant houses matters more than one dominant planet.'} ${attention.length ? `${attention.map((planet) => planet.name.en).join(', ')} indicate where patience, planning or support is useful.` : 'No major debilitation or combustion appears among the primary indicators.'}`
    ),
    timing: bi(
      `${timing.map((planet) => planet.name.te).join(', ') || 'సంబంధిత'} దశా-భుక్తుల్లో ఈ అంశం ఎక్కువగా క్రియాశీలం కావచ్చు.`,
      `This area can become more active in the periods of ${timing.map((planet) => planet.name.en).join(', ') || 'the related lords'}.`
    ),
  };
});

export const buildAdvancedHoroscope = (report) => ({
  vargas: DIVISIONAL_CHARTS.map((definition) => chartFor(report, definition)),
  chandraChart: {
    key: 'moon-chart', title: bi('చంద్ర కుండలి', 'Chandra Kundli'),
    purpose: bi('చంద్ర రాశిని మొదటి భావంగా తీసుకున్న మనస్సు, అనుభవ దృష్టి', 'Mind and lived-experience view with the Moon sign as the first house'),
    ascendantSign: report.moon.sign, planets: report.planets.map((planet) => ({ ...planet, sign: planet.sign })),
  },
  bhavaTable: RASHIS.map((_, index) => {
    const house = index + 1; const sign = (report.ascendant.sign + index) % 12;
    return { house, sign: RASHIS[sign], lord: report.planets.find((planet) => planet.key === SIGN_LORDS[sign]), occupants: report.planets.filter((planet) => planet.house === house) };
  }),
  panchanga: birthPanchanga(report),
  friendships: friendshipTables(report),
  navTara: navTara(report),
  strengths: strengthTable(report),
  predictions: predictionChapters(report),
  disclaimer: bi(
    'వర్గ చక్రాలు సంప్రదాయ పరాశర క్రమంతో గణించబడ్డాయి. గ్రహ బల సూచిక పారదర్శక సహాయక సూచిక మాత్రమే; ఇది శాస్త్రీయ షడ్బలం కాదు. KP, జైమిని, అష్టకవర్గ సంఖ్యలు ధృవీకరించకుండా చూపబడవు.',
    'Vargas use the documented traditional Parashara sequence. The support index is a transparent reading aid, not classical Shadbala. KP, Jaimini and Ashtakavarga numbers are not shown without a validated implementation.'
  ),
});
