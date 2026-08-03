import { RASHIS } from './horoscopeCalculator';

const SIGN_LORDS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];

const HOUSE_THEMES = [
  { te: 'శరీరం, స్వభావం, వ్యక్తిత్వం మరియు జీవన దిశ', en: 'body, temperament, identity and life direction' },
  { te: 'కుటుంబం, వాక్కు, విలువలు మరియు కూడబెట్టిన సంపద', en: 'family, speech, values and accumulated wealth' },
  { te: 'ధైర్యం, స్వప్రయత్నం, నైపుణ్యాలు మరియు సహోదరులు', en: 'courage, self-effort, skills and siblings' },
  { te: 'ఇల్లు, తల్లి, ఆస్తి, విద్యా పునాది మరియు అంతర్గత సుఖం', en: 'home, mother, property, foundations of learning and inner security' },
  { te: 'బుద్ధి, సృజనాత్మకత, సంతానం, మంత్రం మరియు పూర్వ పుణ్యం', en: 'intelligence, creativity, children, mantra and accumulated merit' },
  { te: 'సేవ, దినచర్య, ఆరోగ్య అలవాట్లు, అప్పులు మరియు పోటీ', en: 'service, routines, health habits, debts and competition' },
  { te: 'వివాహం, భాగస్వామ్యం, ఒప్పందాలు మరియు ప్రజా సంబంధాలు', en: 'marriage, partnership, agreements and public dealings' },
  { te: 'మార్పు, దీర్ఘాయుష్య సూచనలు, పరిశోధన మరియు ఉమ్మడి వనరులు', en: 'change, longevity factors, research and shared resources' },
  { te: 'ధర్మం, తండ్రి, గురువులు, ఉన్నత విద్య మరియు దీర్ఘ ప్రయాణం', en: 'dharma, father, mentors, higher learning and long journeys' },
  { te: 'వృత్తి, బాధ్యత, పేరు, అధికారం మరియు సామాజిక స్థానం', en: 'career, responsibility, reputation, authority and public standing' },
  { te: 'లాభాలు, మిత్రులు, సమూహాలు, పెద్ద లక్ష్యాలు మరియు ఆశల ఫలితం', en: 'gains, friends, communities, major goals and fulfilment of aims' },
  { te: 'వ్యయం, విదేశం, నిద్ర, విరక్తి మరియు ఏకాంతం', en: 'expenses, foreign places, sleep, release and retreat' },
];

const PLANET_THEMES = {
  sun: { te: 'ఆత్మవిశ్వాసం, నాయకత్వం, తండ్రి మరియు అధికారం', en: 'identity, leadership, father figures and authority' },
  moon: { te: 'మనస్సు, భావోద్వేగ భద్రత, తల్లి మరియు ప్రజాసంబంధం', en: 'mind, emotional security, mother and public response' },
  mars: { te: 'ధైర్యం, చర్య, సాంకేతిక నైపుణ్యం మరియు ఆస్తి', en: 'courage, action, technical ability and property' },
  mercury: { te: 'విద్య, విశ్లేషణ, సంభాషణ మరియు వ్యాపారం', en: 'learning, analysis, communication and commerce' },
  jupiter: { te: 'జ్ఞానం, ధర్మం, సంతానం, మార్గదర్శకత్వం మరియు విస్తరణ', en: 'wisdom, dharma, children, guidance and growth' },
  venus: { te: 'సంబంధాలు, కళ, సౌకర్యం, వాహనాలు మరియు ఒప్పందం', en: 'relationships, art, comfort, vehicles and agreement' },
  saturn: { te: 'బాధ్యత, సహనం, శ్రమ, ఆలస్యం మరియు దీర్ఘకాల ఫలితం', en: 'responsibility, endurance, work, delay and long-term results' },
  rahu: { te: 'తీవ్ర కోరిక, విదేశీ ప్రభావం, అసాధారణ మార్గం మరియు విస్తరణ', en: 'strong ambition, foreign influence, unconventional paths and amplification' },
  ketu: { te: 'విరక్తి, పరిశోధన, అంతర్దృష్టి మరియు ఆధ్యాత్మిక దృష్టి', en: 'detachment, research, insight and inward development' },
};

const SIGN_STYLES = [
  { te: 'నేరుగా, ఆరంభశక్తితో', en: 'directly and with initiative' }, { te: 'స్థిరంగా, ప్రాయోగికంగా', en: 'steadily and practically' },
  { te: 'చురుకుగా, అనుకూలంగా', en: 'quickly and adaptably' }, { te: 'రక్షణాత్మకంగా, భావోద్వేగంగా', en: 'protectively and emotionally' },
  { te: 'గౌరవం, సృజనాత్మక నాయకత్వంతో', en: 'with dignity and creative leadership' }, { te: 'విశ్లేషణాత్మకంగా, సేవాభావంతో', en: 'analytically and through service' },
  { te: 'సమతుల్యత, సహకారంతో', en: 'through balance and cooperation' }, { te: 'తీవ్రత, లోతైన పరిశీలనతో', en: 'intensely and with depth' },
  { te: 'విశ్వాసం, అన్వేషణతో', en: 'with conviction and exploration' }, { te: 'క్రమశిక్షణ, నిర్మాణంతో', en: 'with discipline and structure' },
  { te: 'స్వతంత్ర ఆలోచన, సమూహ దృష్టితో', en: 'independently and with a community view' }, { te: 'సహానుభూతి, ఊహాశక్తితో', en: 'with empathy and imagination' },
];

const NAKSHATRA_TRAITS = [
  ['త్వరిత ఆరంభం, స్వస్థత, స్వతంత్ర చర్య', 'quick beginnings, healing and independent action'],
  ['బాధ్యత, సహనం, మార్పును భరించే శక్తి', 'responsibility, endurance and the power to carry change'],
  ['పరిశుద్ధి, నిర్ణయాత్మకత, లక్ష్యంపై పదును', 'purification, decisiveness and sharp focus'],
  ['పోషణ, సౌందర్యం, స్థిరమైన అభివృద్ధి', 'nourishment, beauty and steady development'],
  ['అన్వేషణ, ఆసక్తి, కొత్త మార్గాల వెతుకులాట', 'curiosity, searching and exploration'],
  ['తీవ్ర పరిశోధన, పాత రూపాన్ని మార్చే శక్తి', 'intense inquiry and transformation of old patterns'],
  ['పునరుద్ధరణ, ఆశ, సరైన స్థలానికి తిరిగివెళ్లడం', 'renewal, hope and return to alignment'],
  ['పోషణ, గురుభక్తి, సమాజాన్ని నిలబెట్టడం', 'nourishment, respect for guidance and sustaining community'],
  ['లోతైన గ్రహణశక్తి, వ్యూహం, గోప్యత', 'perception, strategy and privacy'],
  ['వంశ గౌరవం, నాయకత్వం, సంప్రదాయ బాధ్యత', 'lineage, leadership and ancestral responsibility'],
  ['సృజన, ఆనందం, సంబంధాలు మరియు ప్రదర్శన', 'creativity, enjoyment, relationships and presentation'],
  ['ఒప్పందం, సేవ, స్థిరమైన విజయ నిర్మాణం', 'agreements, service and building durable success'],
  ['నైపుణ్యం, చేతిపని, క్రమబద్ధమైన సృష్టి', 'skill, craftsmanship and organised creation'],
  ['రూపకల్పన, అందం, సాంకేతిక ఖచ్చితత్వం', 'design, beauty and technical precision'],
  ['స్వాతంత్ర్యం, చలనం, వ్యాపార అనుకూలత', 'independence, movement and commercial adaptability'],
  ['లక్ష్యసాధన, భాగస్వామ్య శక్తి, విస్తరణ', 'goal fulfilment, alliances and expansion'],
  ['నిబద్ధత, స్నేహం, కష్టంలో నిలిచే శక్తి', 'devotion, friendship and resilience'],
  ['పెద్దల బాధ్యత, రక్షణ, వ్యూహాత్మక అధికారం', 'seniority, protection and strategic authority'],
  ['మూల కారణాన్ని వెతకడం, విడిచిపెట్టడం, పునర్నిర్మాణం', 'root-cause inquiry, release and rebuilding'],
  ['ప్రేరణ, విలువల రక్షణ, భావోద్వేగ స్వాతంత్ర్యం', 'inspiration, preservation of values and emotional independence'],
  ['దీర్ఘకాల విజయం, నైతిక బాధ్యత, స్థిర నాయకత్వం', 'lasting achievement, ethical duty and steady leadership'],
  ['వినడం, నేర్చుకోవడం, సంబంధాల ద్వారా పురోగతి', 'listening, learning and progress through connection'],
  ['లయ, వనరుల నిర్వహణ, సమూహ విజయం', 'rhythm, resource management and collective success'],
  ['పరిశోధన, స్వస్థత, సరిహద్దులు దాటే ఆలోచన', 'research, healing and boundary-crossing thought'],
  ['ఆదర్శం, ఉపదేశం, లోతైన దృష్టి', 'idealism, teaching and penetrating vision'],
  ['స్థిరత్వం, సహనం, అంతర్గత లోతు', 'stability, patience and inner depth'],
  ['పూర్తి చేయడం, రక్షణ, సురక్షిత ప్రయాణం', 'completion, protection and safe transition'],
].map(([te, en]) => ({ te, en }));

const DIGNITY_EFFECT = {
  exalted: { te: 'ఉచ్చ స్థితి ఈ గ్రహ విషయాలను స్పష్టంగా, బలంగా వ్యక్తం చేయగలదు.', en: 'Exaltation can express this planet\'s themes clearly and strongly.' },
  own: { te: 'స్వక్షేత్ర స్థితి స్థిరత్వం, స్వతంత్ర నిర్ణయశక్తిని పెంచుతుంది.', en: 'Own-sign placement supports stability and independent functioning.' },
  debilitated: { te: 'నీచ స్థితి ఫలితాన్ని రద్దు చేయదు; పరిపక్వత, సహాయం, సమయం అవసరమయ్యే ప్రాంతాన్ని చూపుతుంది.', en: 'Debilitation does not cancel results; it marks an area needing maturity, support and timing.' },
  neutral: { te: 'ఫలితం భావం, దృష్టులు, దశల సహకారంపై ఎక్కువగా ఆధారపడుతుంది.', en: 'Results depend more strongly on house context, aspects and operating periods.' },
};

const lifeAreaDefinitions = [
  { key: 'self', title: { te: 'స్వభావం మరియు జీవన దిశ', en: 'Identity and life direction' }, houses: [1, 5, 9], planets: ['sun', 'jupiter'] },
  { key: 'career', title: { te: 'వృత్తి మరియు ప్రజా స్థానం', en: 'Career and public standing' }, houses: [2, 6, 10, 11], planets: ['sun', 'mercury', 'saturn'] },
  { key: 'finance', title: { te: 'సంపద మరియు ఆర్థిక స్థిరత్వం', en: 'Wealth and financial stability' }, houses: [2, 5, 9, 11], planets: ['jupiter', 'venus', 'mercury'] },
  { key: 'relationships', title: { te: 'వివాహం మరియు సంబంధాలు', en: 'Marriage and relationships' }, houses: [2, 7, 8, 11], planets: ['venus', 'jupiter', 'moon'] },
  { key: 'home', title: { te: 'ఇల్లు, ఆస్తి మరియు కుటుంబ సుఖం', en: 'Home, property and family security' }, houses: [4, 8, 12], planets: ['moon', 'mars', 'venus'] },
  { key: 'wellbeing', title: { te: 'ఆరోగ్య దినచర్య మరియు శక్తి నిర్వహణ', en: 'Wellbeing routines and energy management' }, houses: [1, 6, 8, 12], planets: ['sun', 'moon', 'saturn'] },
  { key: 'learning', title: { te: 'విద్య, జ్ఞానం మరియు సంతానం', en: 'Learning, wisdom and children' }, houses: [4, 5, 9], planets: ['mercury', 'jupiter'] },
  { key: 'travel', title: { te: 'ప్రయాణం మరియు విదేశీ సంబంధం', en: 'Travel and foreign connections' }, houses: [3, 7, 9, 12], planets: ['rahu', 'jupiter', 'moon'] },
];

const LIFE_PLAIN = {
  self: { te: 'సాధారణంగా మీరు మీ నిర్ణయాలు మీ విలువలకు సరిపోవాలని కోరుకుంటారు. ఆత్మవిశ్వాసం పెరిగే కొద్దీ నాయకత్వం, నేర్చుకోవడం మరియు ఇతరులకు దారి చూపడం సహజంగా ముందుకు రావచ్చు.', en: 'In everyday terms, you prefer decisions that match your values. As confidence grows, leadership, learning and guiding others can become more visible.' },
  career: { te: 'పని జీవితంలో క్రమం, ఉపయోగకరమైన నైపుణ్యం మరియు బాధ్యత తీసుకోవడం ముఖ్యంగా పనిచేస్తాయి. త్వరిత ఫలితం కంటే స్పష్టమైన ప్రణాళిక, నిరంతర శ్రమ మీకు ఎక్కువ మద్దతు ఇవ్వవచ్చు.', en: 'At work, useful skills, structure and taking responsibility matter most. A clear plan and consistent effort may help more than chasing quick results.' },
  finance: { te: 'డబ్బు విషయంలో సంపాదనతో పాటు నిల్వ, బడ్జెట్ మరియు దీర్ఘకాల లక్ష్యం అవసరం. అవకాశాలు వచ్చినప్పుడు కూడా ప్రమాదం, అప్పు మరియు నగదు ప్రవాహాన్ని విడిగా చూసి నిర్ణయం తీసుకోవడం మంచిది.', en: 'For money, earning needs to be paired with saving, budgeting and a long-term goal. Even when opportunities appear, review risk, debt and cash flow separately.' },
  relationships: { te: 'సంబంధాల్లో గౌరవం, భావాలను స్పష్టంగా చెప్పడం మరియు బాధ్యతలను పంచుకోవడం ప్రధానంగా కనిపిస్తుంది. ఆకర్షణతో పాటు రోజువారీ అనుకూలతను నిర్మించడానికి ఓపికగా మాట్లాడటం అవసరం.', en: 'In relationships, respect, clear emotional communication and shared responsibility stand out. Attraction still needs patient conversation to become everyday compatibility.' },
  home: { te: 'ఇల్లు మీకు విశ్రాంతి, భద్రత మరియు కుటుంబ అనుబంధం కలిసే స్థలంగా ఉండాలి. ఆస్తి లేదా నివాస నిర్ణయాల్లో భావోద్వేగంతో పాటు పత్రాలు, ఖర్చు మరియు దీర్ఘకాల అవసరాలను కూడా చూడండి.', en: 'Home needs to feel like a place of rest, security and family connection. For property or relocation decisions, balance emotion with paperwork, cost and long-term needs.' },
  wellbeing: { te: 'శక్తి ఒకేలా ఉండకపోవచ్చు కాబట్టి నిద్ర, ఆహారం, కదలిక మరియు పని విరామాలను క్రమంగా ఉంచడం సహాయపడుతుంది. ఇది వైద్య నిర్ధారణ కాదు; లక్షణాలు ఉంటే అర్హుడైన వైద్యుడిని సంప్రదించాలి.', en: 'Energy may not feel identical every day, so regular sleep, food, movement and work breaks can help. This is not a medical diagnosis; consult a qualified clinician for symptoms.' },
  learning: { te: 'మీకు నేర్చుకున్నది ఆచరణలో పెట్టినప్పుడు జ్ఞానం బాగా నిలుస్తుంది. చదువు, సృజనాత్మక పని లేదా పిల్లల మార్గదర్శకత్వంలో ఓపికతో పునాది నిర్మించడం ఉపయోగకరం.', en: 'Knowledge tends to settle when you apply what you learn. Patiently building foundations helps with study, creative work or guiding children.' },
  travel: { te: 'ప్రయాణం లేదా విదేశీ సంబంధాలు కొత్త ఆలోచనలు, వ్యక్తులు మరియు అవకాశాలను తెచ్చే అవకాశం ఉంది. పత్రాలు, సమయం, ఖర్చు మరియు కుటుంబ బాధ్యతలు ముందుగానే సర్దుబాటు చేస్తే మార్పు సులభమవుతుంది.', en: 'Travel or foreign connections may introduce new ideas, people and opportunities. Planning documents, timing, cost and family duties early can make change easier.' },
};

const localNames = (items, languageKey) => items.map((item) => item.name?.[languageKey] || item.key).join(', ');
const houseSign = (report, house) => (report.ascendant.sign + house - 1) % 12;
const houseLord = (report, house) => report.planets.find((planet) => planet.key === SIGN_LORDS[houseSign(report, house)]);

export const parashariAspects = (report) => {
  const special = { mars: [4, 7, 8], jupiter: [5, 7, 9], saturn: [3, 7, 10] };
  return report.planets
    .filter((planet) => !['rahu', 'ketu'].includes(planet.key))
    .flatMap((planet) => (special[planet.key] || [7]).map((distance) => {
      const targetHouse = ((planet.house + distance - 2) % 12) + 1;
      const targetSign = (planet.sign + distance - 1) % 12;
      const targets = report.planets.filter((item) => item.key !== planet.key && item.sign === targetSign);
      return { planet, distance, targetHouse, targetSign, targets };
    }));
};

const buildHouseReadings = (report) => HOUSE_THEMES.map((theme, index) => {
  const house = index + 1;
  const occupants = report.planets.filter((planet) => planet.house === house);
  const lord = houseLord(report, house);
  const linkedTheme = HOUSE_THEMES[(lord?.house || 1) - 1];
  return {
    house,
    signIndex: houseSign(report, house),
    sign: RASHIS[houseSign(report, house)],
    theme,
    occupants,
    lord,
    evidence: {
      te: `${house}వ భావాధిపతి ${lord?.name.te || '—'} ${lord?.house || '—'}వ భావంలో ఉన్నాడు${occupants.length ? `; ఈ భావంలో ${localNames(occupants, 'te')} ఉన్నారు` : '; ఈ భావంలో గ్రహం లేదు'}.`,
      en: `The ${house}${house === 1 ? 'st' : house === 2 ? 'nd' : house === 3 ? 'rd' : 'th'} lord ${lord?.name.en || '—'} occupies house ${lord?.house || '—'}${occupants.length ? `; occupants are ${localNames(occupants, 'en')}` : '; the house is unoccupied'}.`,
    },
    reading: {
      te: `${theme.te} విషయాలు ${linkedTheme?.te || 'జీవన దిశ'}తో కలుస్తాయి. ${lord ? DIGNITY_EFFECT[lord.dignity].te : ''} ${occupants.length ? `ఇక్కడి గ్రహాలు తమ ${occupants.map((planet) => PLANET_THEMES[planet.key].te).join(', ')} అంశాలను ఈ భావంలో క్రియాశీలం చేస్తాయి.` : 'గ్రహం లేకపోవడం ఫలితంలేదని కాదు; భావాధిపతి స్థితి ప్రధాన ఆధారం.'}`,
      en: `${theme.en} connect with ${linkedTheme?.en || 'life direction'} through the house lord. ${lord ? DIGNITY_EFFECT[lord.dignity].en : ''} ${occupants.length ? `The occupants bring ${occupants.map((planet) => PLANET_THEMES[planet.key].en).join(', ')} into this area.` : 'An empty house does not mean no result; the lord and its periods remain the main indicators.'}`,
    },
    plain: {
      te: `సులభంగా చెప్పాలంటే, ఈ భావం ${theme.te} గురించి చెబుతుంది. దీని అధిపతి ${lord?.house || '—'}వ భావంలో ఉండటం వల్ల ఈ విషయం ${linkedTheme?.te || 'మీ మొత్తం జీవన దిశ'}తో కలుస్తుంది${occupants.length ? `; ${localNames(occupants, 'te')} ఈ అంశాన్ని మరింత స్పష్టంగా ముందుకు తెస్తారు` : ''}.`,
      en: `Simply put, this house describes ${theme.en}. Because its lord is in house ${lord?.house || '—'}, this area connects with ${linkedTheme?.en || 'your wider life direction'}${occupants.length ? `; ${localNames(occupants, 'en')} make the theme more visible` : ''}.`,
    },
  };
});

const buildPlanetReadings = (report) => report.planets.map((planet) => ({
  planet,
  evidence: {
    te: `${planet.name.te} ${planet.rashi.name.te} రాశిలో, ${planet.house}వ భావంలో, ${planet.nakshatra.name.te} ${planet.nakshatra.pada}వ పాదంలో ఉన్నాడు.`,
    en: `${planet.name.en} is in ${planet.rashi.name.en}, house ${planet.house}, ${planet.nakshatra.name.en} pada ${planet.nakshatra.pada}.`,
  },
  reading: {
    te: `${PLANET_THEMES[planet.key].te} అంశాలు ${SIGN_STYLES[planet.sign].te} వ్యక్తమై, ${HOUSE_THEMES[planet.house - 1].te}పై దృష్టి పెడతాయి. ${DIGNITY_EFFECT[planet.dignity].te}${planet.retrograde ? ' వక్రగతి ఈ విషయాలను అంతర్గతంగా పునఃపరిశీలించే ధోరణిని పెంచవచ్చు.' : ''}${planet.combust ? ' సూర్య సామీప్యం వల్ల ఈ గ్రహ విషయాలకు ఒత్తిడి లేదా అధిక తీవ్రత ఉండవచ్చు.' : ''}`,
    en: `${PLANET_THEMES[planet.key].en} are expressed ${SIGN_STYLES[planet.sign].en}, focusing on ${HOUSE_THEMES[planet.house - 1].en}. ${DIGNITY_EFFECT[planet.dignity].en}${planet.retrograde ? ' Retrograde motion can make these themes more internal, reflective or iterative.' : ''}${planet.combust ? ' Proximity to the Sun can add pressure or intensity to the planet\'s expression.' : ''}`,
  },
  plain: {
    te: `రోజువారీ జీవితంలో ${planet.name.te} మీ ${PLANET_THEMES[planet.key].te} విషయాలను ${SIGN_STYLES[planet.sign].te} నిర్వహించే ధోరణిని చూపుతుంది. ఈ గ్రహ దశల్లో ${HOUSE_THEMES[planet.house - 1].te}పై ఎక్కువ దృష్టి పడవచ్చు.`,
    en: `In daily life, ${planet.name.en} shows a tendency to handle ${PLANET_THEMES[planet.key].en} ${SIGN_STYLES[planet.sign].en}. During its periods, ${HOUSE_THEMES[planet.house - 1].en} may need more attention.`,
  },
}));

const buildLifeAreas = (report) => lifeAreaDefinitions.map((area) => {
  const lords = area.houses.map((house) => houseLord(report, house)).filter(Boolean);
  const karakas = area.planets.map((key) => report.planets.find((planet) => planet.key === key)).filter(Boolean);
  const strong = [...new Map([...lords, ...karakas].filter((planet) => ['own', 'exalted'].includes(planet.dignity)).map((planet) => [planet.key, planet])).values()];
  const attention = [...new Map([...lords, ...karakas].filter((planet) => planet.dignity === 'debilitated' || planet.combust).map((planet) => [planet.key, planet])).values()];
  const timingLords = [...new Set(lords.map((planet) => planet.key))].map((key) => report.planets.find((planet) => planet.key === key)).filter(Boolean);
  return {
    ...area,
    evidence: {
      te: `పరిశీలించిన భావాలు: ${area.houses.join(', ')}. ప్రధాన కారకులు: ${localNames(karakas, 'te')}. భావాధిపతులు: ${localNames(lords, 'te')}.`,
      en: `Houses examined: ${area.houses.join(', ')}. Natural significators: ${localNames(karakas, 'en')}. House lords: ${localNames(lords, 'en')}.`,
    },
    reading: {
      te: `${strong.length ? `${localNames(strong, 'te')} బలం సహాయక ఆధారం.` : 'ఫలితం ఒక్క గ్రహబలం కంటే భావాధిపతుల పరస్పర సంబంధంపై ఆధారపడుతుంది.'} ${attention.length ? `${localNames(attention, 'te')} విషయాలకు ప్రణాళిక, సహనం అవసరం.` : 'స్పష్టమైన నీచ/దగ్ధ ఒత్తిడి ప్రధాన కారకుల్లో కనిపించలేదు.'} ${localNames(timingLords, 'te')} దశా-భుక్తుల్లో ఈ అంశాలు ఎక్కువగా క్రియాశీలం కావచ్చు.`,
      en: `${strong.length ? `${localNames(strong, 'en')} provide clear supporting strength.` : 'The result depends more on links between the relevant house lords than on one dominant planet.'} ${attention.length ? `${localNames(attention, 'en')} show where planning, patience or support may be needed.` : 'No major debilitation or combustion is present among the primary indicators.'} These themes are more likely to become active in the periods of ${localNames(timingLords, 'en')}.`,
    },
    plain: {
      te: `${LIFE_PLAIN[area.key].te} ${strong.length ? `${localNames(strong, 'te')} ఈ విభాగానికి సహాయక బలం చూపుతున్నారు.` : ''}${attention.length ? ` ${localNames(attention, 'te')} కారణంగా తొందరపడకుండా ప్రణాళికతో ముందుకు వెళ్లడం మంచిది.` : ''}`,
      en: `${LIFE_PLAIN[area.key].en} ${strong.length ? `${localNames(strong, 'en')} provide supporting strength in this area.` : ''}${attention.length ? ` With ${localNames(attention, 'en')} under pressure, planning is better than rushing.` : ''}`,
    },
  };
});

const activePeriods = (report, instant = new Date()) => {
  const contains = (period) => new Date(period.start) <= instant && new Date(period.end) > instant;
  const mahadasha = report.dashas.periods.find(contains) || report.dashas.periods[0];
  const antardasha = mahadasha?.antardashas?.find(contains) || mahadasha?.antardashas?.[0];
  const pratyantara = antardasha?.pratyantardashas?.find(contains) || antardasha?.pratyantardashas?.[0];
  return { mahadasha, antardasha, pratyantara };
};

export const buildHoroscopeInsights = (report) => {
  const houseReadings = buildHouseReadings(report);
  const planetReadings = buildPlanetReadings(report);
  const aspects = parashariAspects(report);
  const lifeAreas = buildLifeAreas(report);
  const nakshatra = {
    ...report.moon.nakshatra,
    trait: NAKSHATRA_TRAITS[report.moon.nakshatra.index],
    padaNote: {
      te: `${report.moon.nakshatra.pada}వ పాదం నక్షత్ర లక్షణాలను ${SIGN_STYLES[report.moon.navamsaSign].te} వ్యక్తం చేస్తుంది.`,
      en: `Pada ${report.moon.nakshatra.pada} expresses the Nakshatra pattern ${SIGN_STYLES[report.moon.navamsaSign].en}.`,
    },
  };
  return { houseReadings, planetReadings, aspects, lifeAreas, nakshatra, activePeriods: activePeriods(report) };
};

export const interpretationMethod = {
  te: 'ప్రధాన నివేదిక పరాశరి పద్ధతి, నిరయణ లహిరి అయనాంశం, సంపూర్ణ రాశి భావాలు, గ్రహస్థితి, భావాధిపత్యం, సాంప్రదాయ దృష్టులు మరియు వింశోత్తరి దశలను విడివిడిగా పరిశీలిస్తుంది. KP లేదా జైమిని నియమాలను ప్రధాన ఫలితాల్లో కలపలేదు.',
  en: 'The main report uses a Parashari framework with the sidereal Lahiri ayanamsa, whole-sign houses, planetary placement, house lordship, classical aspects and Vimshottari periods. KP and Jaimini rules are not mixed into the main interpretation.',
};
