import { NAKSHATRAS, RASHIS, calculateHoroscope } from '../horoscope/horoscopeCalculator';

const bi = (te, en) => ({ te, en });
const circularCount = (from, to, size) => ((to - from + size) % size) + 1;
const roundHalf = (value) => Math.round(value * 2) / 2;

const GANA = [
  'deva', 'manushya', 'rakshasa', 'manushya', 'deva', 'manushya', 'deva', 'deva', 'rakshasa',
  'rakshasa', 'manushya', 'manushya', 'deva', 'rakshasa', 'deva', 'rakshasa', 'deva', 'rakshasa',
  'rakshasa', 'manushya', 'manushya', 'deva', 'rakshasa', 'rakshasa', 'manushya', 'manushya', 'deva',
];

const NADI = [
  'adi', 'madhya', 'antya', 'antya', 'madhya', 'adi', 'adi', 'madhya', 'antya',
  'antya', 'madhya', 'adi', 'adi', 'madhya', 'antya', 'antya', 'madhya', 'adi',
  'adi', 'madhya', 'antya', 'antya', 'madhya', 'adi', 'adi', 'madhya', 'antya',
];

const YONI = [
  'horse', 'elephant', 'sheep', 'serpent', 'serpent', 'dog', 'cat', 'sheep', 'cat',
  'rat', 'rat', 'cow', 'buffalo', 'tiger', 'buffalo', 'tiger', 'hare', 'hare',
  'dog', 'monkey', 'mongoose', 'monkey', 'lion', 'horse', 'lion', 'cow', 'elephant',
];

const YONI_ENEMIES = new Set([
  'horse:buffalo', 'elephant:lion', 'sheep:monkey', 'serpent:mongoose',
  'dog:hare', 'cat:rat', 'cow:tiger',
].flatMap((pair) => {
  const [first, second] = pair.split(':');
  return [`${first}:${second}`, `${second}:${first}`];
}));

const RAJJU = [
  'pada-a', 'kati', 'udara', 'kantha', 'siro', 'siro', 'kantha', 'udara', 'pada-b',
  'pada-a', 'kati', 'udara', 'kantha', 'siro', 'siro', 'kantha', 'udara', 'pada-b',
  'pada-a', 'kati', 'udara', 'kantha', 'siro', 'siro', 'kantha', 'udara', 'pada-b',
];

const VEDHA_PAIRS = [
  [0, 17], [1, 16], [2, 15], [3, 14], [4, 22], [5, 21], [6, 20],
  [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [13, 13],
];

const SIGN_LORDS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
const VARNA_RANK = [1, 1, 3, 4, 2, 3, 1, 4, 2, 1, 1, 4];
const NATURAL_FRIENDS = {
  sun: ['moon', 'mars', 'jupiter'], moon: ['sun', 'mercury'], mars: ['sun', 'moon', 'jupiter'],
  mercury: ['sun', 'venus'], jupiter: ['sun', 'moon', 'mars'], venus: ['mercury', 'saturn'],
  saturn: ['mercury', 'venus'],
};
const NATURAL_ENEMIES = {
  sun: ['venus', 'saturn'], moon: [], mars: ['mercury'], mercury: ['moon'],
  jupiter: ['mercury', 'venus'], venus: ['sun', 'moon'], saturn: ['sun', 'moon', 'mars'],
};

const label = {
  deva: bi('దేవ', 'Deva'), manushya: bi('మనుష్య', 'Manushya'), rakshasa: bi('రాక్షస', 'Rakshasa'),
  adi: bi('ఆది / వాత', 'Adi / Vata'), madhya: bi('మధ్య / పిత్త', 'Madhya / Pitta'), antya: bi('అంత్య / కఫ', 'Antya / Kapha'),
  horse: bi('అశ్వ', 'Horse'), elephant: bi('గజ', 'Elephant'), sheep: bi('మేష', 'Sheep'), serpent: bi('సర్ప', 'Serpent'),
  dog: bi('శ్వాన', 'Dog'), cat: bi('మార్జాల', 'Cat'), rat: bi('మూషిక', 'Rat'), cow: bi('గో', 'Cow'),
  buffalo: bi('మహిష', 'Buffalo'), tiger: bi('వ్యాఘ్ర', 'Tiger'), hare: bi('శశ', 'Hare'), monkey: bi('వానర', 'Monkey'),
  mongoose: bi('నకుల', 'Mongoose'), lion: bi('సింహ', 'Lion'),
  brahmin: bi('బ్రాహ్మణ', 'Brahmin'), kshatriya: bi('క్షత్రియ', 'Kshatriya'), vaishya: bi('వైశ్య', 'Vaishya'), shudra: bi('శూద్ర', 'Shudra'),
  human: bi('మానవ', 'Human'), quadruped: bi('చతుష్పాద', 'Quadruped'), water: bi('జలచర', 'Water'), forest: bi('వనచర', 'Forest'), insect: bi('కీట', 'Insect'),
};
const VARNA_KEYS = ['', 'shudra', 'kshatriya', 'vaishya', 'brahmin'];
const TARA_NAMES = [bi('జన్మ', 'Janma'), bi('సంపత్', 'Sampat'), bi('విపత్', 'Vipat'), bi('క్షేమ', 'Kshema'), bi('ప్రత్యరి', 'Pratyari'), bi('సాధన', 'Sadhana'), bi('నైధన', 'Naidhana'), bi('మిత్ర', 'Mitra'), bi('పరమ మిత్ర', 'Parama Mitra')];

const rajjuName = (value) => ({
  'pada-a': bi('పాద రజ్జు A', 'Pada Rajju A'), 'pada-b': bi('పాద రజ్జు B', 'Pada Rajju B'),
  kati: bi('కటి రజ్జు', 'Kati Rajju'), udara: bi('ఉదర రజ్జు', 'Udara Rajju'),
  kantha: bi('కంఠ రజ్జు', 'Kantha Rajju'), siro: bi('శిరో రజ్జు', 'Siro Rajju'),
}[value]);

const naturalRelation = (first, second) => {
  if (first === second) return 'same';
  const firstFriend = NATURAL_FRIENDS[first]?.includes(second);
  const secondFriend = NATURAL_FRIENDS[second]?.includes(first);
  if (firstFriend && secondFriend) return 'friend';
  const firstEnemy = NATURAL_ENEMIES[first]?.includes(second);
  const secondEnemy = NATURAL_ENEMIES[second]?.includes(first);
  if (firstEnemy && secondEnemy) return 'enemy';
  if (firstFriend || secondFriend) return 'mixed-friend';
  if (firstEnemy || secondEnemy) return 'mixed-enemy';
  return 'neutral';
};

const vashyaFor = (moon) => {
  const { sign, degreeInSign } = moon;
  if ([2, 5, 6, 10].includes(sign) || (sign === 8 && degreeInSign < 15)) return 'human';
  if ([0, 1].includes(sign) || (sign === 8 && degreeInSign >= 15) || (sign === 9 && degreeInSign < 15)) return 'quadruped';
  if ([3, 11].includes(sign) || (sign === 9 && degreeInSign >= 15)) return 'water';
  if (sign === 4) return 'forest';
  return 'insect';
};

const vashyaScore = (first, second) => {
  if (first === second) return 2;
  const partial = new Set(['human:quadruped', 'quadruped:human', 'human:water', 'water:human', 'water:quadruped', 'quadruped:water']);
  if (partial.has(`${first}:${second}`)) return 1;
  const hostile = new Set(['forest:quadruped', 'quadruped:forest', 'forest:insect', 'insect:forest']);
  return hostile.has(`${first}:${second}`) ? 0 : 0.5;
};

const PORUTHAM_PLAIN = {
  dina: ['రోజువారీ అలవాట్లు, సమయం మరియు పరస్పర సహకారం', 'daily habits, schedules and mutual support'],
  gana: ['స్వభావం, స్పందించే విధానం మరియు గొడవలో సంభాషణ', 'temperament, reactions and communication during conflict'],
  mahendra: ['కుటుంబ లక్ష్యాలు, పరస్పర పోషణ మరియు భవిష్యత్ ప్రణాళిక', 'family goals, mutual care and future planning'],
  'stree-deergha': ['భావోద్వేగ సౌకర్యం, గౌరవం మరియు భాగస్వామ్య భద్రత', 'emotional comfort, respect and security in partnership'],
  yoni: ['ఆకర్షణ, సన్నిహిత సౌకర్యం, హద్దులు మరియు సమ్మతి', 'attraction, intimate comfort, boundaries and consent'],
  rasi: ['ఇంటి జీవితం, ప్రాధాన్యాలు మరియు దీర్ఘకాల దిశ', 'home life, priorities and long-term direction'],
  'rasi-lord': ['ఆలోచనా శైలి, నిర్ణయాలు మరియు పరస్పర గౌరవం', 'thinking style, decisions and mutual respect'],
  vasya: ['ఒకరిపై ఒకరి ప్రభావం, రాజీ మరియు వ్యక్తిగత స్వేచ్ఛ', 'mutual influence, accommodation and personal freedom'],
  rajju: ['దాంపత్య స్థిరత్వంపై కుటుంబ సంప్రదాయం చేసే ప్రధాన పరిశీలన', 'a major lineage-based screen for marital stability'],
  vedha: ['నక్షత్రాల మధ్య సంప్రదాయ అడ్డంకి పరిశీలన', 'the traditional obstruction check between the two birth stars'],
};

const factor = (key, name, passed, evidence, rule, reading, importance = 'supporting') => {
  const [teTopic, enTopic] = PORUTHAM_PLAIN[key];
  return {
    key, name, passed, status: passed ? 'pass' : 'review', evidence, rule, reading, importance,
    summary: passed
      ? bi(`ఈ జంటకు ${teTopic} విషయంలో సంప్రదాయ మద్దతు కనిపిస్తుంది. అయినా వాస్తవ అంచనాలను మాట్లాడుకుని కలిసి నిర్మించాలి.`, `For this couple, the traditional check supports ${enTopic}. Real expectations still need to be discussed and built together.`)
      : bi(`ఈ జంట ${teTopic} గురించి పెళ్లికి ముందు స్పష్టంగా మాట్లాడుకోవాలి. ఇది వివాహాన్ని స్వయంగా తిరస్కరించదు; మిగతా జాతక స్థాయులు మరియు వాస్తవ సంబంధాన్ని కలిపి చూడాలి.`, `This couple should discuss ${enTopic} clearly before marriage. It does not reject the marriage by itself; read it with the other chart layers and the real relationship.`),
  };
};

const southIndianPoruthams = (groom, bride) => {
  const g = groom.moon.nakshatra.index;
  const b = bride.moon.nakshatra.index;
  const brideToGroom = circularCount(b, g, 27);
  const taraRemainder = brideToGroom % 9;
  const dinaPass = [0, 2, 4, 6, 8].includes(taraRemainder);
  const ganaPass = GANA[g] === GANA[b] || new Set([GANA[g], GANA[b]]).size === 2 && [GANA[g], GANA[b]].includes('deva') && [GANA[g], GANA[b]].includes('manushya');
  const mahendraPass = [4, 7, 10, 13, 16, 19, 22, 25].includes(brideToGroom);
  const streePass = brideToGroom >= 13;
  const yoniEnemy = YONI_ENEMIES.has(`${YONI[g]}:${YONI[b]}`);
  const signDistance = circularCount(bride.moon.sign, groom.moon.sign, 12);
  const reverseSignDistance = circularCount(groom.moon.sign, bride.moon.sign, 12);
  const rasiPass = ![2, 6, 8, 12].includes(signDistance) && ![2, 6, 8, 12].includes(reverseSignDistance);
  const lordRelation = naturalRelation(SIGN_LORDS[groom.moon.sign], SIGN_LORDS[bride.moon.sign]);
  const lordPass = !['enemy', 'mixed-enemy'].includes(lordRelation);
  const groomVashya = vashyaFor(groom.moon);
  const brideVashya = vashyaFor(bride.moon);
  const vasyaPass = vashyaScore(groomVashya, brideVashya) >= 1;
  const sameRajju = RAJJU[g] === RAJJU[b];
  const vedha = VEDHA_PAIRS.some(([first, second]) => (first === g && second === b) || (first === b && second === g));

  return [
    factor('dina', bi('దిన / తారా', 'Dina / Tara'), dinaPass,
      bi(`వధువు నుండి వరునికి ${brideToGroom}వ నక్షత్రం; నవతారా శేషం ${taraRemainder || 9}.`, `Groom is star ${brideToGroom} counted from bride; Navatara remainder ${taraRemainder || 9}.`),
      bi('వధువు నక్షత్రం నుండి కలుపుకొని లెక్కించి 2, 4, 6, 8 లేదా 9 శేషాలు అనుకూలం.', 'Inclusive bride-to-groom count; remainders 2, 4, 6, 8 or 9 are treated as favourable.'),
      bi('రోజువారీ సమన్వయం, ఆరోగ్య సహకారం కోసం ప్రాథమిక తారా పరీక్ష.', 'A primary lunar-star screen for day-to-day rhythm and mutual support.')),
    factor('gana', bi('గణం', 'Gana'), ganaPass,
      bi(`${label[GANA[g]].te} + ${label[GANA[b]].te}`, `${label[GANA[g]].en} + ${label[GANA[b]].en}`),
      bi('దేవ, మనుష్య, రాక్షస గణాల స్వభావ కలయికను పోలుస్తుంది.', 'Compares the temperament grouping: Deva, Manushya and Rakshasa.'),
      bi('భావోద్వేగ ప్రతిస్పందన, జీవన శైలి తేడాలను సూచించే సంప్రదాయ వర్గీకరణ.', 'Traditional temperament grouping; it does not define anyone’s character or worth.')),
    factor('mahendra', bi('మహేంద్రం', 'Mahendra'), mahendraPass,
      bi(`వధువు నుండి వరునికి నక్షత్ర సంఖ్య ${brideToGroom}.`, `Bride-to-groom star count is ${brideToGroom}.`),
      bi('4, 7, 10, 13, 16, 19, 22, 25 స్థానాలు అనుకూలంగా పరిగణించబడతాయి.', 'Positions 4, 7, 10, 13, 16, 19, 22 and 25 are treated as favourable.'),
      bi('కుటుంబ వృద్ధి, పరస్పర పోషణకు సహాయక సూచికగా చదువుతారు.', 'Read traditionally as a supporting indicator for care and family growth.')),
    factor('stree-deergha', bi('స్త్రీ దీర్ఘం', 'Stree Deergha'), streePass,
      bi(`నక్షత్ర దూరం ${brideToGroom}; కావలసిన కనిష్ఠం 13.`, `Star distance ${brideToGroom}; preferred minimum 13.`),
      bi('వధువు నక్షత్రం నుండి వరుని నక్షత్రం కనీసం 13వ స్థానంలో ఉండాలి.', 'The groom’s star should be at least the 13th from the bride’s star.'),
      bi('సంప్రదాయంగా దాంపత్య సౌఖ్యం, భద్రతకు సంబంధించిన దిశాత్మక పరీక్ష.', 'A directional traditional check associated with marital comfort and security.')),
    factor('yoni', bi('యోని', 'Yoni'), !yoniEnemy,
      bi(`${label[YONI[g]].te} + ${label[YONI[b]].te}`, `${label[YONI[g]].en} + ${label[YONI[b]].en}`),
      bi('జన్మ నక్షత్ర యోని జంతువులు శత్రు జంటగా ఉన్నాయా అని చూస్తుంది.', 'Checks whether the Nakshatra Yoni animals form a traditional hostile pair.'),
      bi('ఆకర్షణ, సహజ సౌకర్యానికి సంకేతాత్మక పరీక్ష; వ్యక్తిగత సమ్మతి, సంభాషణకు ప్రత్యామ్నాయం కాదు.', 'Symbolic intimacy and comfort screen; never a substitute for consent or communication.')),
    factor('rasi', bi('రాశి', 'Rasi'), rasiPass,
      bi(`చంద్ర రాశుల పరస్పర దూరాలు ${signDistance}/${reverseSignDistance}.`, `Mutual Moon-sign distances are ${signDistance}/${reverseSignDistance}.`),
      bi('ఈ ప్రాథమిక నియమంలో 2/12 మరియు 6/8 సంబంధాలు సమీక్షకు గుర్తించబడతాయి.', 'This base rule flags 2/12 and 6/8 Moon-sign relationships for review.'),
      bi('ఇంటి జీవితం, భావోద్వేగ దిశపై చంద్ర రాశుల సంబంధాన్ని పరిశీలిస్తుంది.', 'Reviews Moon-sign relationship for emotional and domestic orientation.')),
    factor('rasi-lord', bi('రాశ్యాధిపతి', 'Rasi Lord'), lordPass,
      bi(`${SIGN_LORDS[groom.moon.sign]} + ${SIGN_LORDS[bride.moon.sign]} · ${lordRelation}`, `${SIGN_LORDS[groom.moon.sign]} + ${SIGN_LORDS[bride.moon.sign]} · ${lordRelation}`),
      bi('రెండు చంద్ర రాశుల అధిపతుల సహజ మైత్రిని పోలుస్తుంది.', 'Compares the natural friendship of the two Moon-sign lords.'),
      bi('ఆలోచన, నిర్ణయ పద్ధతులు కలిసి పనిచేసే విధానానికి ఒక సంప్రదాయ సూచన.', 'Traditional indication of how decision-making styles may cooperate.')),
    factor('vasya', bi('వశ్యం', 'Vasya'), vasyaPass,
      bi(`${groomVashya} + ${brideVashya}`, `${groomVashya} + ${brideVashya}`),
      bi('చంద్ర రాశి, దాని అర్ధభాగం ఆధారంగా ఐదు వశ్య వర్గాలను పోలుస్తుంది.', 'Compares five Vashya categories from the Moon sign and its half-sign division.'),
      bi('పరస్పర ప్రభావం, సర్దుబాటును సూచిస్తుంది; ఆధిపత్యానికి అనుమతి కాదు.', 'A symbolic screen for mutual influence and accommodation, not permission for control.')),
    factor('rajju', bi('రజ్జు', 'Rajju'), !sameRajju,
      bi(`${rajjuName(RAJJU[g]).te} + ${rajjuName(RAJJU[b]).te}`, `${rajjuName(RAJJU[g]).en} + ${rajjuName(RAJJU[b]).en}`),
      bi('ఒకే రజ్జు వర్గం అయితే సంప్రదాయ జాగ్రత్త; పాద రజ్జులో A/B ఉపవర్గాలు వేరు.', 'Same Rajju group is flagged; Pada Rajju A/B sub-groups are kept distinct.'),
      bi('దక్షిణ భారత సంప్రదాయంలో ప్రధాన ద్వార పరీక్ష. కుటుంబ పద్ధతి ప్రకారం నిపుణుల సమీక్ష అవసరం.', 'A major South Indian gate; a lineage-specific expert review is appropriate when flagged.'), 'critical'),
    factor('vedha', bi('వేధ', 'Vedha'), !vedha,
      bi(vedha ? 'పరస్పర వేధ నక్షత్ర జంట.' : 'పరస్పర వేధ జంట కాదు.', vedha ? 'The stars form a mutual Vedha pair.' : 'The stars do not form a mutual Vedha pair.'),
      bi('సంప్రదాయంగా పరస్పర అవరోధంగా గుర్తించిన నక్షత్ర జంటలను పరిశీలిస్తుంది.', 'Checks the traditional table of mutually obstructing Nakshatra pairs.'),
      bi('దక్షిణ భారత సరిపోలికలో ప్రధాన ద్వార పరీక్ష; ఇతర మొత్తం స్కోరు దీన్ని దాచదు.', 'A major South Indian gate; the total score does not override this result.'), 'critical'),
  ];
};

const ashtakoota = (groom, bride) => {
  const g = groom.moon.nakshatra.index;
  const b = bride.moon.nakshatra.index;
  const factors = [];
  const gunaTopics = {
    varna: ['విలువలు మరియు ఆధ్యాత్మిక దృక్పథం', 'values and spiritual outlook'],
    vashya: ['రాజీ, ప్రభావం మరియు వ్యక్తిగత స్వేచ్ఛ', 'accommodation, influence and personal freedom'],
    tara: ['రోజువారీ లయ మరియు పరస్పర మద్దతు', 'daily rhythm and mutual support'],
    yoni: ['ఆకర్షణ, సన్నిహిత సౌకర్యం మరియు హద్దులు', 'attraction, intimate comfort and boundaries'],
    maitri: ['ఆలోచనా శైలి, స్నేహం మరియు సంభాషణ', 'thinking style, friendship and communication'],
    gana: ['స్వభావం మరియు భావోద్వేగ స్పందన', 'temperament and emotional response'],
    bhakoot: ['ఇంటి లక్ష్యాలు, కుటుంబ దిశ మరియు వనరులు', 'home goals, family direction and resources'],
    nadi: ['జీవన లయ మరియు పరస్పర సంరక్షణపై సంప్రదాయ పరీక్ష', 'the traditional screen for vitality and mutual care'],
  };
  const add = (key, name, score, max, groomValue, brideValue, basis, explanation) => {
    const roundedScore = roundHalf(score);
    const [teTopic, enTopic] = gunaTopics[key];
    const supportive = roundedScore >= max * 0.5;
    factors.push({
      key, name, score: roundedScore, max, groomValue, brideValue, basis, explanation,
      summary: supportive
        ? bi(`ఈ కూటంలో ${roundedScore}/${max} వచ్చింది. ${teTopic} విషయంలో ఉపయోగకరమైన సంప్రదాయ మద్దతు ఉంది; దాన్ని రోజువారీ సంభాషణ, గౌరవంతో బలపరచాలి.`, `This Koota scores ${roundedScore}/${max}. It gives useful traditional support for ${enTopic}; strengthen it through everyday communication and respect.`)
        : bi(`ఈ కూటంలో ${roundedScore}/${max} వచ్చింది. ${teTopic} విషయంలో అంచనాలు వేర్వేరుగా ఉండవచ్చు కాబట్టి ముందుగానే స్పష్టమైన సంభాషణ అవసరం. ఈ ఒక్క స్కోరు వివాహ నిర్ణయం కాదు.`, `This Koota scores ${roundedScore}/${max}. Expectations around ${enTopic} may differ, so an explicit conversation is useful. This score alone is not a marriage verdict.`),
    });
  };

  const varnaScore = VARNA_RANK[groom.moon.sign] >= VARNA_RANK[bride.moon.sign] ? 1 : 0;
  add('varna', bi('వర్ణ', 'Varna'), varnaScore, 1,
    label[VARNA_KEYS[VARNA_RANK[groom.moon.sign]]], label[VARNA_KEYS[VARNA_RANK[bride.moon.sign]]],
    bi(`రాశి స్థాయులు ${VARNA_RANK[groom.moon.sign]} / ${VARNA_RANK[bride.moon.sign]}`, `Moon-sign ranks ${VARNA_RANK[groom.moon.sign]} / ${VARNA_RANK[bride.moon.sign]}`),
    bi('చిన్న బరువు గల సంప్రదాయ ఆధ్యాత్మిక-స్వభావ సూచిక.', 'A low-weight traditional spiritual-disposition indicator.'));
  const gv = vashyaFor(groom.moon); const bv = vashyaFor(bride.moon);
  add('vashya', bi('వశ్య', 'Vashya'), vashyaScore(gv, bv), 2, label[gv], label[bv], bi(`${gv} + ${bv}`, `${gv} + ${bv}`), bi('పరస్పర ప్రభావం, అనుకూలత.', 'Mutual influence and accommodation.'));
  const favourable = [1, 3, 5, 7, 8];
  const taraAIndex = (circularCount(b, g, 27) - 1) % 9; const taraBIndex = (circularCount(g, b, 27) - 1) % 9;
  const taraA = favourable.includes(taraAIndex) ? 1.5 : 0;
  const taraB = favourable.includes(taraBIndex) ? 1.5 : 0;
  add('tara', bi('తారా', 'Tara'), taraA + taraB, 3,
    TARA_NAMES[taraBIndex], TARA_NAMES[taraAIndex],
    bi(`రెండు దిశల నవతారా: ${taraA}/${taraB}`, `Two-way Navatara: ${taraA}/${taraB}`), bi('రెండు దిశల జన్మ నక్షత్ర లెక్క.', 'Two-way birth-star count.'));
  const yoniScore = YONI[g] === YONI[b] ? 4 : YONI_ENEMIES.has(`${YONI[g]}:${YONI[b]}`) ? 0 : 2;
  add('yoni', bi('యోని', 'Yoni'), yoniScore, 4, label[YONI[g]], label[YONI[b]], bi(`${label[YONI[g]].te} + ${label[YONI[b]].te}`, `${label[YONI[g]].en} + ${label[YONI[b]].en}`), bi('ఒకే జాతికి పూర్తి; శత్రు జంటకు శూన్యం; మిగతావి తటస్థం.', 'Same animal gets full points, hostile pairs zero, others neutral.'));
  const relation = naturalRelation(SIGN_LORDS[groom.moon.sign], SIGN_LORDS[bride.moon.sign]);
  const maitri = { same: 5, friend: 5, 'mixed-friend': 4, neutral: 3, 'mixed-enemy': 1, enemy: 0 }[relation];
  add('maitri', bi('గ్రహ మైత్రి', 'Graha Maitri'), maitri, 5, bi(SIGN_LORDS[groom.moon.sign], SIGN_LORDS[groom.moon.sign]), bi(SIGN_LORDS[bride.moon.sign], SIGN_LORDS[bride.moon.sign]), bi(relation, relation), bi('చంద్ర రాశ్యాధిపతుల సహజ మైత్రి.', 'Natural friendship of Moon-sign lords.'));
  const ganaPair = `${GANA[g]}:${GANA[b]}`;
  const ganaScore = GANA[g] === GANA[b] ? 6 : ['deva:manushya', 'manushya:deva'].includes(ganaPair) ? 6 : ganaPair.includes('deva') ? 1 : 0;
  add('gana', bi('గణ', 'Gana'), ganaScore, 6, label[GANA[g]], label[GANA[b]], bi(`${label[GANA[g]].te} + ${label[GANA[b]].te}`, `${label[GANA[g]].en} + ${label[GANA[b]].en}`), bi('స్వభావ వర్గ సమన్వయం.', 'Temperament-group compatibility.'));
  const firstDistance = circularCount(groom.moon.sign, bride.moon.sign, 12);
  const secondDistance = circularCount(bride.moon.sign, groom.moon.sign, 12);
  const bhakoot = [2, 5, 6, 8, 9, 12].some((value) => value === firstDistance || value === secondDistance) ? 0 : 7;
  add('bhakoot', bi('భకూట / రాశి', 'Bhakoot / Rashi'), bhakoot, 7, groom.moon.rashi.name, bride.moon.rashi.name, bi(`${firstDistance}/${secondDistance} రాశి సంబంధం`, `${firstDistance}/${secondDistance} sign relationship`), bi('2/12, 6/8 సంబంధాలను ప్రాథమిక దోషంగా గుర్తిస్తుంది.', 'Base rule flags 2/12 and 6/8 relationships.'));
  add('nadi', bi('నాడి', 'Nadi'), NADI[g] === NADI[b] ? 0 : 8, 8,
    label[NADI[g]], label[NADI[b]],
    bi(`${label[NADI[g]].te} + ${label[NADI[b]].te}`, `${label[NADI[g]].en} + ${label[NADI[b]].en}`), bi('వేరు నాడులకు పూర్తి; ఒకే నాడికి సమీక్ష.', 'Different Nadis receive full points; same Nadi is flagged.'));
  const total = roundHalf(factors.reduce((sum, item) => sum + item.score, 0));
  return { factors, total, max: 36 };
};

const kujaFromReference = (report, referenceSign) => {
  const mars = report.planets.find((planet) => planet.key === 'mars');
  return ((mars.sign - referenceSign + 12) % 12) + 1;
};

const kujaAnalysis = (report) => {
  const venus = report.planets.find((planet) => planet.key === 'venus');
  const houses = {
    lagna: kujaFromReference(report, report.ascendant.sign),
    moon: kujaFromReference(report, report.moon.sign),
    venus: kujaFromReference(report, venus.sign),
  };
  const flagged = [1, 2, 4, 7, 8, 12];
  const hits = Object.entries(houses).filter(([, house]) => flagged.includes(house)).map(([reference]) => reference);
  return { houses, hits, intensity: hits.length, convention: '1, 2, 4, 7, 8, 12 from Lagna, Moon and Venus' };
};

const papaProfile = (report) => {
  const referenceSigns = {
    lagna: report.ascendant.sign,
    moon: report.moon.sign,
    venus: report.planets.find((planet) => planet.key === 'venus').sign,
  };
  const planetWeights = { mars: 1, saturn: 1, rahu: 1, sun: 0.5 };
  const referenceWeights = { lagna: 1, moon: 0.75, venus: 0.5 };
  const sensitiveHouses = [1, 2, 4, 7, 8, 12];
  const placements = Object.entries(referenceSigns).flatMap(([reference, sign]) => Object.entries(planetWeights).map(([planetKey, planetWeight]) => {
    const planet = report.planets.find((item) => item.key === planetKey);
    const house = ((planet.sign - sign + 12) % 12) + 1;
    const points = sensitiveHouses.includes(house) ? planetWeight * referenceWeights[reference] : 0;
    return { reference, planet: planetKey, house, points: roundHalf(points) };
  }));
  return {
    placements,
    score: roundHalf(placements.reduce((sum, item) => sum + item.points, 0)),
    convention: 'Mars, Saturn, Rahu and Sun from Lagna, Moon and Venus; sensitive houses 1, 2, 4, 7, 8, 12',
  };
};

const dashaSandhi = (groom, bride) => {
  const start = new Date();
  const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear() + 50);
  const boundaries = (report) => report.dashas.periods.slice(1)
    .map((period) => ({ date: period.start, lord: period.lord }))
    .filter((item) => new Date(item.date) >= start && new Date(item.date) <= end);
  let closest = null;
  boundaries(groom).forEach((first) => boundaries(bride).forEach((second) => {
    const days = Math.abs(new Date(first.date) - new Date(second.date)) / 86400000;
    if (!closest || days < closest.days) closest = { days, first, second };
  }));
  return {
    closest,
    status: !closest || closest.days >= 365 ? 'clear' : closest.days < 180 ? 'strong-review' : 'review',
    horizon: { start: start.toISOString(), end: end.toISOString() },
    rule: bi('తదుపరి 50 సంవత్సరాల్లో ఇద్దరి మహాదశ మార్పులు 365 రోజుల్లో ఉంటే సమీక్ష; 180 రోజుల్లో ఉంటే బలమైన సమీక్ష.', 'Within the next 50 years, Mahadasha changes within 365 days are flagged; within 180 days receive a stronger flag.'),
  };
};

const chartIndicators = (groom, bride) => {
  const forPerson = (report) => {
    const seventhSign = (report.ascendant.sign + 6) % 12;
    const seventhLord = SIGN_LORDS[seventhSign];
    const lordPlanet = report.planets.find((planet) => planet.key === seventhLord);
    const venus = report.planets.find((planet) => planet.key === 'venus');
    const jupiter = report.planets.find((planet) => planet.key === 'jupiter');
    return {
      seventhSign, seventhLord, seventhLordHouse: lordPlanet?.house,
      seventhHousePlanets: report.planets.filter((planet) => planet.house === 7).map((planet) => planet.key),
      venusHouse: venus?.house, venusDignity: venus?.dignity,
      jupiterHouse: jupiter?.house, jupiterDignity: jupiter?.dignity,
    };
  };
  return { groom: forPerson(groom), bride: forPerson(bride) };
};

const marriageRecommendation = (grade, guna, gates) => {
  if (grade === 'strong') return {
    title: bi('సంప్రదాయంగా అనుకూలమైన ప్రాథమిక సరిపోలిక', 'Traditionally favourable initial match'),
    text: bi(`36లో ${guna.total} గుణాలు మరియు ప్రధాన రజ్జు/వేధ ద్వారాలు అనుకూలంగా ఉన్నాయి. వివాహాన్ని నిర్ణయించే ముందు కుజ, దశా, కుటుంబ పరిస్థితులు మరియు ఇద్దరి స్వేచ్ఛా సమ్మతిని కూడా పరిశీలించాలి.`, `${guna.total} of 36 Gunas and the critical Rajju/Vedha gates are favourable. Review Kuja, Dashas, family circumstances and both partners’ free consent before deciding.`),
  };
  if (grade === 'workable') return {
    title: bi('చర్చ మరియు పూర్తి జాతక సమీక్షతో పని చేయగల సరిపోలిక', 'Workable match with discussion and full-chart review'),
    text: bi(`గుణాలు ${guna.total}/36. కొన్ని స్థాయిలు సహకరిస్తాయి, మరికొన్ని జీవనశైలి సంభాషణ కోరుతాయి. ఇది స్వయంచాలక ఆమోదం లేదా తిరస్కారం కాదు.`, `The Guna score is ${guna.total}/36. Some layers support the match while others call for practical conversation. This is neither automatic approval nor rejection.`),
  };
  return {
    title: bi('వివాహ నిర్ణయానికి ముందు సీనియర్ సమీక్ష అవసరం', 'Senior review advised before a marriage decision'),
    text: bi(`గుణాలు ${guna.total}/36${gates.length ? `; ప్రధాన ద్వారాలు ${gates.join(', ')} సమీక్షకు వచ్చాయి` : ''}. ప్రాంతీయ మినహాయింపులు, కుజ/పాప సామ్యం, D1/D9 మరియు దశలను కుటుంబ పద్ధతి తెలిసిన అర్హుడైన జ్యోతిష్కుడు పరిశీలించాలి.`, `The score is ${guna.total}/36${gates.length ? ` and critical gates ${gates.join(', ')} are flagged` : ''}. A qualified astrologer familiar with the family lineage should review regional exceptions, Kuja/Papa balance, D1/D9 and Dashas.`),
  };
};

const marriageOutlook = (guna, poruthams, gates, dasha, kuja, papaSamyam) => {
  const factor = (key) => guna.factors.find((item) => item.key === key);
  const porutham = (key) => poruthams.find((item) => item.key === key);
  const chapter = (key, te, en, evidence, supportive, supportTe, supportEn, cautionTe, cautionEn) => ({
    key, title: bi(te, en), evidence, tone: supportive ? 'supportive' : 'review',
    reading: supportive ? bi(supportTe, supportEn) : bi(cautionTe, cautionEn),
  });
  return [
    chapter('daily', 'రోజువారీ జీవన సరళి', 'Daily life rhythm', bi(`తారా ${factor('tara').score}/3; దిన పొరుత్తం ${porutham('dina').passed ? 'అనుకూలం' : 'సమీక్ష'}.`, `Tara ${factor('tara').score}/3; Dina Porutham ${porutham('dina').passed ? 'passes' : 'needs review'}.`), factor('tara').score >= 1.5 && porutham('dina').passed, 'రోజువారీ అలవాట్లు, పరస్పర సహకారానికి సంప్రదాయ మద్దతు ఉంది.', 'Traditional support appears for daily rhythm and mutual help.', 'రోజువారీ సమయం, పనిభారం, విశ్రాంతి అంచనాలను ముందే స్పష్టంగా మాట్లాడుకోవాలి.', 'Discuss schedules, workload and rest expectations explicitly.'),
    chapter('temperament', 'స్వభావం మరియు సంభాషణ', 'Temperament and communication', bi(`గణ ${factor('gana').score}/6; గ్రహ మైత్రి ${factor('maitri').score}/5.`, `Gana ${factor('gana').score}/6; Graha Maitri ${factor('maitri').score}/5.`), factor('gana').score >= 4 && factor('maitri').score >= 3, 'ప్రతిస్పందన, నిర్ణయ పద్ధతులు కలిసి పనిచేయడానికి మద్దతు కనిపిస్తుంది.', 'Temperament and decision styles have useful support.', 'వివాదంలో మాట్లాడే విధానం, నిర్ణయాధికారం, వ్యక్తిగత స్థలంపై నియమాలు అవసరం.', 'Agree on conflict language, decision-making and personal space.'),
    chapter('intimacy', 'ఆకర్షణ మరియు సన్నిహితత్వం', 'Attraction and intimacy', bi(`యోని ${factor('yoni').score}/4; వశ్య ${factor('vashya').score}/2.`, `Yoni ${factor('yoni').score}/4; Vashya ${factor('vashya').score}/2.`), factor('yoni').score >= 2 && factor('vashya').score >= 1, 'సహజ సౌకర్యం, పరస్పర ఆకర్షణకు సంప్రదాయ మద్దతు ఉంది.', 'Traditional indicators support comfort and mutual attraction.', 'సన్నిహిత అవసరాలు, హద్దులు, సమ్మతిపై నేరుగా మరియు గౌరవంగా మాట్లాడాలి.', 'Discuss intimacy needs, boundaries and consent directly and respectfully.'),
    chapter('home', 'ఇల్లు, కుటుంబం, ఆర్థిక దిశ', 'Home, family and financial direction', bi(`భకూట ${factor('bhakoot').score}/7; మహేంద్రం ${porutham('mahendra').passed ? 'అనుకూలం' : 'సమీక్ష'}.`, `Bhakoot ${factor('bhakoot').score}/7; Mahendra ${porutham('mahendra').passed ? 'passes' : 'needs review'}.`), factor('bhakoot').score >= 4 && porutham('mahendra').passed, 'ఇంటి లక్ష్యాలు, కుటుంబ వృద్ధి దిశకు మద్దతు కనిపిస్తుంది.', 'There is traditional support for shared home goals and family growth.', 'డబ్బు, నివాసం, పిల్లలు, రెండు కుటుంబాల బాధ్యతలపై ఒకే ప్రణాళిక కావాలి.', 'Build one clear plan for money, location, children and duties to both families.'),
    chapter('vitality', 'జీవన శక్తి మరియు పరస్పర సంరక్షణ', 'Vitality and mutual care', bi(`నాడి ${factor('nadi').score}/8; పాప సామ్య తేడా ${papaSamyam.balance}.`, `Nadi ${factor('nadi').score}/8; Papa Samyam difference ${papaSamyam.balance}.`), factor('nadi').score > 0 && papaSamyam.balance <= 2, 'పరస్పర సంరక్షణ, ఒత్తిడి సమతుల్యానికి ప్రాథమిక మద్దతు ఉంది.', 'The traditional screen supports mutual care and stress balance.', 'నాడి లేదా పాప అసమతుల్యాన్ని వైద్య తీర్పుగా చదవకండి; జీవనశైలి, ఆరోగ్య చరిత్రను వాస్తవంగా చర్చించండి.', 'Do not treat Nadi or malefic balance as a medical verdict; discuss real health history and lifestyle.'),
    chapter('gates', 'ప్రధాన జాగ్రత్తలు మరియు కాల సమన్వయం', 'Critical gates and timing', bi(`రజ్జు/వేధ: ${gates.length ? gates.join(', ') : 'clear'}; కుజ తేడా ${kuja.balance}; దశా సంధి ${dasha.status}.`, `Rajju/Vedha: ${gates.length ? gates.join(', ') : 'clear'}; Kuja difference ${kuja.balance}; Dasha Sandhi ${dasha.status}.`), !gates.length && kuja.balance <= 1 && dasha.status === 'clear', 'ప్రధాన ద్వారాలు, కుజ సమతుల్యం, సమీప దశా మార్పుల్లో పెద్ద హెచ్చరిక కనిపించలేదు.', 'No major warning appears in the critical gates, Kuja balance or nearby Dasha changes.', 'మొత్తం స్కోరు ఈ జాగ్రత్తలను రద్దు చేయదు; ముహూర్తం లేదా నిర్ణయం ముందు నిపుణుల సమీక్ష మంచిది.', 'The total cannot override these cautions; expert review is sensible before a Muhurta or final decision.'),
  ];
};

export const calculateMarriageMatchFromCharts = (groom, bride) => {
  if (!groom?.moon || !bride?.moon) throw new Error('Both complete birth charts are required.');
  const poruthams = southIndianPoruthams(groom, bride);
  const southScore = poruthams.filter((item) => item.passed).length;
  const gates = poruthams.filter((item) => item.importance === 'critical' && !item.passed).map((item) => item.key);
  const guna = ashtakoota(groom, bride);
  const kuja = { groom: kujaAnalysis(groom), bride: kujaAnalysis(bride) };
  kuja.balance = Math.abs(kuja.groom.intensity - kuja.bride.intensity);
  const papaSamyam = { groom: papaProfile(groom), bride: papaProfile(bride) };
  papaSamyam.balance = roundHalf(Math.abs(papaSamyam.groom.score - papaSamyam.bride.score));
  const dashas = dashaSandhi(groom, bride);
  const grade = gates.length || guna.total < 18 ? 'review' : southScore >= 8 && guna.total >= 25 ? 'strong' : 'workable';
  const recommendation = marriageRecommendation(grade, guna, gates);
  const outlook = marriageOutlook(guna, poruthams, gates, dashas, kuja, papaSamyam);
  const diagnosticsSummary = bi(
    `${kuja.balance <= 1 ? 'ఇద్దరి కుజ సూచనలు దగ్గరగా ఉన్నాయి' : `కుజ సూచనల తేడా ${kuja.balance} కావడంతో కుటుంబ పద్ధతి ప్రకారం సమీక్ష మంచిది`}. ${papaSamyam.balance <= 2 ? 'పాప సామ్య భారంలో పెద్ద తేడా కనిపించలేదు' : `పాప సామ్య తేడా ${papaSamyam.balance}; దృష్టులు, బలాలు కలిపి పరిశీలించాలి`}. ${dashas.status === 'clear' ? 'సమీప మహాదశ మార్పులు ఒకే సంవత్సరంలో రావడం కనిపించలేదు.' : 'సమీప దశా మార్పులు దగ్గరగా ఉన్నాయి; ఆ కాలంలో ఇద్దరి బాధ్యతలు, మద్దతు ప్రణాళికను చర్చించాలి.'}`,
    `${kuja.balance <= 1 ? 'The Kuja indicators are closely balanced' : `The Kuja difference is ${kuja.balance}, so a lineage-aware review is sensible`}. ${papaSamyam.balance <= 2 ? 'No large Papa Samyam load difference appears' : `The Papa Samyam difference is ${papaSamyam.balance}; review it together with aspects and strength`}. ${dashas.status === 'clear' ? 'No Mahadasha changes fall unusually close within the working one-year screen.' : 'Major-period changes fall close together; discuss how both partners will handle duties and support during that time.'}`
  );
  return {
    id: `${groom.id}--${bride.id}`,
    createdAt: new Date().toISOString(), groom, bride,
    poruthams, southScore, southMax: 10, gates,
    ashtakoota: guna, kuja, papaSamyam, dashaSandhi: dashas,
    indicators: chartIndicators(groom, bride), grade, recommendation, outlook, diagnosticsSummary,
    method: {
      title: bi('దక్షిణ భారత దశకూట + అష్టకూట సమగ్ర పరిశీలన', 'South Indian Dashakoota + Ashtakoota layered review'),
      note: bi('10 పొరుత్తాలు, 36 గుణాలు వేర్వేరు పద్ధతులు; మొత్తం సంఖ్య ఒక్కటే నిర్ణయం కాదు.', 'The 10 Poruthams and 36 Gunas are separate systems; no single total is treated as the verdict.'),
      astronomy: groom.settings,
    },
  };
};

export const calculateMarriageMatch = ({ groom, bride }) => calculateMarriageMatchFromCharts(
  calculateHoroscope(groom), calculateHoroscope(bride)
);

export const marriageLabels = { gana: GANA, nadi: NADI, yoni: YONI, rajju: RAJJU, label, rajjuName };
export const marriageReferenceData = { NAKSHATRAS, RASHIS };
