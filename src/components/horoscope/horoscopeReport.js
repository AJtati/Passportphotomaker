import { jsPDF } from 'jspdf';
import { savePdf } from '../../utils/fileDownload';
import { bilingual } from '../panchangam/helpers';
import { dashaInterpretation, dashaPlainSummary, formatZodiacDegree, RASHIS } from './horoscopeCalculator';
import { buildHoroscopeInsights, interpretationMethod } from './horoscopeInterpretations';
import { buildAdvancedHoroscope } from './horoscopeAdvanced';

const WIDTH = 1240;
const HEIGHT = 1754;
const MARGIN = 82;
const COLORS = {
  paper: '#fffaf1', ink: '#261c17', muted: '#745f53', border: '#dbcbb7',
  soft: '#f5eadc', accent: '#b74d27', accentDark: '#873519', gold: '#c39135', green: '#33735d',
};
const CELL_POSITIONS = {
  11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3],
  10: [1, 0], 3: [1, 3], 9: [2, 0], 4: [2, 3],
  8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3],
};

const copy = (language, te, en) => language === 'te' ? te : language === 'en' ? en : `${te} · ${en}`;
const localName = (value, language) => bilingual(value, language);
const localNames = (items, languageKey) => items.map((item) => item.name?.[languageKey] || item.key).join(', ');
const PLANET_THEMES_FOR_REPORT = {
  sun: { te: 'నాయకత్వం, అధికారం', en: 'leadership and authority' },
  moon: { te: 'మనస్సు, కుటుంబ స్పందన', en: 'mind and emotional response' },
  mars: { te: 'చర్య, ధైర్యం, ఆస్తి', en: 'action, courage and property' },
  mercury: { te: 'విద్య, సంభాషణ, వ్యాపారం', en: 'learning, communication and commerce' },
  jupiter: { te: 'జ్ఞానం, విస్తరణ, ధర్మం', en: 'wisdom, growth and dharma' },
  venus: { te: 'సంబంధాలు, కళ, సౌకర్యం', en: 'relationships, art and comfort' },
  saturn: { te: 'బాధ్యత, శ్రమ, దీర్ఘకాల ఫలితం', en: 'responsibility, work and long-term results' },
};
const SETTING_TRANSLATIONS = {
  zodiac: ['రాశి పద్ధతి', 'నిరయణ'],
  ayanamsa: ['అయనాంశం', 'లహిరి / చిత్రపక్ష'],
  chart: ['చక్రం', 'దక్షిణ భారత స్థిర-రాశి'],
  houses: ['భావాలు', 'సంపూర్ణ రాశి భావాలు'],
  nodes: ['రాహు/కేతు', 'మధ్యమ చంద్ర నోడ్లు'],
  dasha: ['దశ', 'వింశోత్తరి · 365.2425-రోజుల సివిల్ సంవత్సరం'],
  ephemeris: ['ఖగోళ గణన', 'Astronomy Engine భూకేంద్ర దృశ్య స్థితులు'],
};
const settingLabel = (language, key) => copy(language, SETTING_TRANSLATIONS[key]?.[0] || key, key);
const settingValue = (language, key, value) => copy(language, SETTING_TRANSLATIONS[key]?.[1] || value, value);
const DIGNITY_LABELS = {
  exalted: { te: 'ఉచ్చ', en: 'exalted' }, own: { te: 'స్వక్షేత్ర', en: 'own' },
  debilitated: { te: 'నీచ', en: 'debilitated' }, neutral: { te: '', en: '' },
};

const roundedRect = (ctx, x, y, width, height, radius = 18) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const setFont = (ctx, size, weight = 400, family = '"Noto Sans Telugu", "Segoe UI", sans-serif') => {
  ctx.font = `${weight} ${size}px ${family}`;
};

const wrap = (ctx, text, maxWidth) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
};

const drawWrapped = (ctx, text, x, y, maxWidth, options = {}) => {
  const { size = 24, weight = 400, color = COLORS.ink, lineHeight = Math.round(size * 1.4), maxLines } = options;
  setFont(ctx, size, weight);
  ctx.fillStyle = color;
  const lines = wrap(ctx, text, maxWidth).slice(0, maxLines || Infinity);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
};

const drawFittedText = (ctx, text, x, y, maxWidth, options = {}) => {
  const { size = 42, minSize = 18, weight = 700, family = 'Georgia, "Noto Serif Telugu", serif', color = COLORS.ink } = options;
  let fittedSize = size;
  setFont(ctx, fittedSize, weight, family);
  while (fittedSize > minSize && ctx.measureText(String(text || '')).width > maxWidth) {
    fittedSize -= 1;
    setFont(ctx, fittedSize, weight, family);
  }
  ctx.fillStyle = color;
  ctx.fillText(String(text || ''), x, y);
};

const makePage = (title, subtitle, pageNumber) => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(0, 0, 12, HEIGHT);
  setFont(ctx, 18, 700);
  ctx.fillStyle = COLORS.accent;
  ctx.fillText('PHOTO MAKER · TELUGU PANCHANGAM', MARGIN, 65);
  drawFittedText(ctx, title, MARGIN, 122, WIDTH - MARGIN * 2, { size: 42, minSize: 24 });
  drawFittedText(ctx, subtitle, MARGIN, 157, WIDTH - MARGIN * 2, { size: 18, minSize: 13, weight: 400, family: '"Noto Sans Telugu", "Segoe UI", sans-serif', color: COLORS.muted });
  ctx.strokeStyle = COLORS.border;
  ctx.beginPath();
  ctx.moveTo(MARGIN, 182);
  ctx.lineTo(WIDTH - MARGIN, 182);
  ctx.stroke();
  setFont(ctx, 16, 600);
  ctx.fillText(String(pageNumber), WIDTH - MARGIN, HEIGHT - 54);
  return { canvas, ctx };
};

const formatBirthDate = (report, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  timeZone: report.person.city.tz,
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(report.instant));

const formatPeriod = (value, timezone, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric',
}).format(new Date(value));

const infoBox = (ctx, x, y, width, label, value) => {
  roundedRect(ctx, x, y, width, 116, 16);
  ctx.fillStyle = COLORS.soft;
  ctx.fill();
  setFont(ctx, 16, 700);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(label.toUpperCase(), x + 20, y + 32);
  drawWrapped(ctx, value, x + 20, y + 68, width - 40, { size: 25, weight: 700, maxLines: 2, lineHeight: 29 });
};

const drawChart = (ctx, report, type, language, x, y, size, chartData) => {
  const cell = size / 4;
  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = COLORS.accentDark;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, size, size, 8);
  ctx.fill();
  ctx.stroke();
  RASHIS.forEach((rashi) => {
    const [row, col] = CELL_POSITIONS[rashi.index];
    const cellX = x + col * cell;
    const cellY = y + row * cell;
    ctx.strokeRect(cellX, cellY, cell, cell);
    setFont(ctx, 12, 700);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(localName(rashi.name, language), cellX + 8, cellY + 19);
    const signKey = type === 'd9' ? 'navamsaSign' : 'sign';
    const ascSign = chartData?.ascendantSign ?? (type === 'd9' ? report.ascendant.navamsaSign : report.ascendant.sign);
    const chartPlanets = chartData?.planets || report.planets;
    const items = [];
    if (ascSign === rashi.index) items.push('Lg');
    chartPlanets.filter((planet) => (chartData ? planet.sign : planet[signKey]) === rashi.index).forEach((planet) => {
      items.push(`${planet.symbol}${planet.name.en.slice(0, 2)}${planet.retrograde ? '℞' : ''}`);
    });
    setFont(ctx, 15, 700);
    ctx.fillStyle = ascSign === rashi.index ? COLORS.accent : COLORS.ink;
    wrap(ctx, items.join('  '), cell - 16).slice(0, 4).forEach((line, index) => {
      ctx.fillText(line, cellX + 8, cellY + 48 + index * 21);
    });
  });
  ctx.fillStyle = COLORS.soft;
  ctx.fillRect(x + cell, y + cell, cell * 2, cell * 2);
  setFont(ctx, 30, 700, 'Georgia, "Noto Serif Telugu", serif');
  ctx.fillStyle = COLORS.accent;
  ctx.textAlign = 'center';
  ctx.fillText(chartData?.key?.toUpperCase() || type.toUpperCase(), x + size / 2, y + size / 2 - 8);
  setFont(ctx, 18, 700);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(chartData ? localName(chartData.name || chartData.title, language) : type === 'd9' ? copy(language, 'నవాంశం', 'Navamsa') : copy(language, 'రాశి', 'Rashi'), x + size / 2, y + size / 2 + 28);
  ctx.textAlign = 'left';
};

const coverPage = (report, language) => {
  const page = makePage(copy(language, 'జన్మ జాతకం', 'Birth Horoscope'), copy(language, 'లహిరి అయనాంశ దక్షిణ భారత జాతక పద్ధతి', 'South Indian chart · Lahiri / Chitrapaksha'), 1);
  const { ctx } = page;
  drawFittedText(ctx, report.person.name, MARGIN, 320, WIDTH - MARGIN * 2, { size: 72, minSize: 34, color: COLORS.accent });
  drawWrapped(ctx, formatBirthDate(report, language), MARGIN, 375, WIDTH - MARGIN * 2, { size: 28, color: COLORS.muted });
  drawWrapped(ctx, report.person.city.name, MARGIN, 430, WIDTH - MARGIN * 2, { size: 25, weight: 600 });
  drawWrapped(ctx, `${report.timezone.name} · UTC${report.timezone.offset} · ${report.person.city.tz}`, MARGIN, 475, WIDTH - MARGIN * 2, { size: 19, color: COLORS.muted });

  const gap = 20;
  const boxWidth = (WIDTH - MARGIN * 2 - gap) / 2;
  infoBox(ctx, MARGIN, 570, boxWidth, copy(language, 'లగ్నం', 'Lagna'), `${localName(report.ascendant.rashi.name, language)} · ${formatZodiacDegree(report.ascendant.longitude)}`);
  infoBox(ctx, MARGIN + boxWidth + gap, 570, boxWidth, copy(language, 'జన్మ రాశి', 'Janma Rashi'), localName(report.moon.rashi.name, language));
  infoBox(ctx, MARGIN, 706, boxWidth, copy(language, 'జన్మ నక్షత్రం', 'Janma Nakshatra'), `${localName(report.moon.nakshatra.name, language)} · Pada ${report.moon.nakshatra.pada}`);
  infoBox(ctx, MARGIN + boxWidth + gap, 706, boxWidth, copy(language, 'యోగాలు', 'Detected Yogas'), `${report.yogas.length} ${copy(language, 'శాస్త్రీయ నియమాలు', 'implemented classical rules')}`);

  roundedRect(ctx, MARGIN, 890, WIDTH - MARGIN * 2, 300, 22);
  ctx.fillStyle = COLORS.ink;
  ctx.fill();
  setFont(ctx, 17, 700);
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(copy(language, 'గణన పద్ధతి', 'CALCULATION METHOD'), MARGIN + 28, 936);
  drawWrapped(ctx, `${settingValue(language, 'zodiac', report.settings.zodiac)} · ${settingValue(language, 'ayanamsa', report.settings.ayanamsa)} · ${settingValue(language, 'chart', report.settings.chart)}`, MARGIN + 28, 986, WIDTH - MARGIN * 2 - 56, { size: 27, weight: 700, color: '#fff4e3' });
  drawWrapped(ctx, `${settingValue(language, 'houses', report.settings.houses)} · ${settingValue(language, 'nodes', report.settings.nodes)} · ${settingValue(language, 'dasha', report.settings.dasha)}`, MARGIN + 28, 1055, WIDTH - MARGIN * 2 - 56, { size: 20, color: '#d8c7b8' });
  drawWrapped(ctx, `${copy(language, 'అయనాంశం', 'Ayanamsa')}: ${report.ayanamsaDegrees.toFixed(6)}°`, MARGIN + 28, 1120, WIDTH - MARGIN * 2 - 56, { size: 18, color: '#d8c7b8' });

  drawWrapped(ctx, copy(language,
    'ఈ నివేదిక పారంపరిక జ్యోతిష సూచనలను విద్యా, స్వయం-పరిశీలన కోసం అందిస్తుంది. నిర్దిష్ట జీవిత సంఘటనలకు హామీ కాదు.',
    'This report presents traditional astrological indications for education and reflection. It does not guarantee specific life events.'
  ), MARGIN, 1300, WIDTH - MARGIN * 2, { size: 22, color: COLORS.muted, lineHeight: 34 });
  return page.canvas;
};

const chartsPage = (report, language, pageNumber = 2) => {
  const page = makePage(copy(language, 'జాతక చక్రాలు', 'Horoscope Charts'), report.person.name, pageNumber);
  drawChart(page.ctx, report, 'd1', language, MARGIN, 260, 500);
  drawChart(page.ctx, report, 'd9', language, WIDTH - MARGIN - 500, 260, 500);
  drawWrapped(page.ctx, copy(language,
    'రాశి చక్రం మూర్తి, జీవన దిశ మరియు భావాలను చూపుతుంది. నవాంశం గ్రహబలం, ధర్మం, వివాహ పరిపక్వతను విశ్లేషించడానికి ఉపయోగిస్తారు.',
    'D1 shows the natal sign and whole-sign house framework. D9 is used to examine planetary strength, dharma and relationship maturity.'
  ), MARGIN, 850, WIDTH - MARGIN * 2, { size: 23, color: COLORS.muted, lineHeight: 35 });

  const current = report.dashas.periods.find((period) => new Date(period.start) <= new Date() && new Date(period.end) > new Date()) || report.dashas.periods[0];
  roundedRect(page.ctx, MARGIN, 1030, WIDTH - MARGIN * 2, 300, 20);
  page.ctx.fillStyle = COLORS.soft;
  page.ctx.fill();
  setFont(page.ctx, 17, 700);
  page.ctx.fillStyle = COLORS.accent;
  page.ctx.fillText(copy(language, 'ప్రస్తుత/జన్మ మహాదశ', 'CURRENT / BIRTH MAHADASHA'), MARGIN + 28, 1074);
  setFont(page.ctx, 36, 700);
  page.ctx.fillStyle = COLORS.ink;
  page.ctx.fillText(`${current.lord.symbol} ${localName(current.lord.name, language)}`, MARGIN + 28, 1128);
  drawWrapped(page.ctx, `${formatPeriod(current.start, report.person.city.tz, language)} → ${formatPeriod(current.end, report.person.city.tz, language)}`, MARGIN + 28, 1172, 800, { size: 21, weight: 600, color: COLORS.muted });
  drawWrapped(page.ctx, localName(dashaInterpretation(report, current.lord.key), language), MARGIN + 28, 1225, WIDTH - MARGIN * 2 - 56, { size: 20, lineHeight: 30, maxLines: 2 });
  drawWrapped(page.ctx, `${copy(language, 'సులభంగా', 'IN SIMPLE WORDS')}: ${localName(dashaPlainSummary(report, current.lord.key), language)}`, MARGIN + 28, 1295, WIDTH - MARGIN * 2 - 56, { size: 17, weight: 700, lineHeight: 26, maxLines: 2, color: COLORS.green });
  return page.canvas;
};

const detailsPages = (report, language, firstPageNumber = 3) => {
  const pages = [];
  let pageNumber = firstPageNumber;
  let page = makePage(copy(language, 'గ్రహ స్థితులు', 'Planetary Positions'), report.person.name, pageNumber);
  let { ctx } = page;
  let y = 230;
  const columns = [MARGIN, 270, 440, 610, 710, 980];
  const columnWidths = [170, 150, 150, 80, 250, WIDTH - MARGIN - 980];
  [
    copy(language, 'గ్రహం', 'Planet'), copy(language, 'రాశి', 'Rashi'), copy(language, 'డిగ్రీ', 'Degree'),
    copy(language, 'భావం', 'House'), copy(language, 'నక్షత్రం', 'Nakshatra'), copy(language, 'స్థితి', 'State'),
  ].forEach((label, index) => {
    setFont(ctx, 15, 700);
    ctx.fillStyle = COLORS.muted;
    drawFittedText(ctx, label.toUpperCase(), columns[index], y, columnWidths[index] - 8, { size: 15, minSize: 10, family: '"Noto Sans Telugu", "Segoe UI", sans-serif', color: COLORS.muted });
  });
  y += 32;
  report.planets.forEach((planet) => {
    ctx.strokeStyle = COLORS.border;
    ctx.beginPath(); ctx.moveTo(MARGIN, y + 58); ctx.lineTo(WIDTH - MARGIN, y + 58); ctx.stroke();
    setFont(ctx, 20, 700); ctx.fillStyle = COLORS.ink;
    drawFittedText(ctx, `${planet.symbol} ${localName(planet.name, language)}`, columns[0], y + 30, columnWidths[0] - 8, { size: 20, minSize: 12, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    drawFittedText(ctx, localName(planet.rashi.name, language), columns[1], y + 30, columnWidths[1] - 8, { size: 17, minSize: 11, weight: 600, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    drawFittedText(ctx, formatZodiacDegree(planet.longitude).replace(/\s\d{2}″$/, ''), columns[2], y + 30, columnWidths[2] - 8, { size: 17, minSize: 11, weight: 600, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    drawFittedText(ctx, String(planet.house), columns[3], y + 30, columnWidths[3] - 8, { size: 17, minSize: 11, weight: 600, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    drawFittedText(ctx, `${localName(planet.nakshatra.name, language)} ${planet.nakshatra.pada}`, columns[4], y + 30, columnWidths[4] - 8, { size: 17, minSize: 11, weight: 600, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    drawFittedText(ctx, [localName(DIGNITY_LABELS[planet.dignity], language), planet.retrograde ? '℞' : '', planet.combust ? 'C' : ''].filter(Boolean).join(' · ') || '—', columns[5], y + 30, columnWidths[5] - 8, { size: 17, minSize: 10, weight: 600, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    y += 68;
  });
  if (!report.yogas.length) {
    y += 55;
    setFont(ctx, 28, 700, 'Georgia, "Noto Serif Telugu", serif');
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(copy(language, 'యోగాలు', 'Verified Yogas'), MARGIN, y);
    drawWrapped(ctx, copy(language,
      'అమలు చేసిన శాస్త్రీయ నియమాలలో యోగం కనుగొనబడలేదు.',
      'No Yoga was found among the classical rules implemented in this release.'
    ), MARGIN, y + 48, WIDTH - MARGIN * 2, { size: 23, color: COLORS.muted, lineHeight: 34 });
    pages.push(page.canvas);
    return { pages, nextPageNumber: pageNumber + 1 };
  }
  pages.push(page.canvas);

  pageNumber += 1;
  page = makePage(copy(language, 'యోగాలు', 'Verified Yogas'), copy(language, 'మూలం మరియు వర్తింపజేసిన నియమం మాత్రమే', 'Only explicitly implemented, source-labelled rules are shown'), pageNumber);
  ctx = page.ctx;
  y = 230;
  if (!report.yogas.length) {
    drawWrapped(ctx, copy(language, 'అమలు చేసిన శాస్త్రీయ నియమాలలో యోగం కనుగొనబడలేదు.', 'No Yoga was found among the classical rules implemented in this release.'), MARGIN, y, WIDTH - MARGIN * 2, { size: 26 });
  }
  report.yogas.forEach((yoga) => {
    const height = 300;
    if (y + height > 1570) {
      pages.push(page.canvas);
      pageNumber += 1;
      page = makePage(copy(language, 'యోగాలు', 'Verified Yogas'), report.person.name, pageNumber);
      ctx = page.ctx;
      y = 230;
    }
    roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, height - 18, 18);
    ctx.fillStyle = yoga.tone === 'supportive' ? '#f3eee0' : COLORS.soft;
    ctx.fill();
    setFont(ctx, 26, 700); ctx.fillStyle = COLORS.accent;
    ctx.fillText(localName(yoga.name, language), MARGIN + 24, y + 43);
    let nextY = drawWrapped(ctx, localName(yoga.reason, language), MARGIN + 24, y + 84, WIDTH - MARGIN * 2 - 48, { size: 20, lineHeight: 30, maxLines: 2 });
    setFont(ctx, 14, 700); ctx.fillStyle = COLORS.green; ctx.fillText(copy(language, 'సులభంగా అర్థం', 'WHAT THIS MEANS FOR YOU'), MARGIN + 24, nextY + 22);
    nextY = drawWrapped(ctx, localName(yoga.summary, language), MARGIN + 24, nextY + 56, WIDTH - MARGIN * 2 - 48, { size: 18, lineHeight: 27, maxLines: 4 });
    drawWrapped(ctx, yoga.source, MARGIN + 24, nextY + 10, WIDTH - MARGIN * 2 - 48, { size: 15, weight: 700, color: COLORS.muted, maxLines: 1 });
    y += height;
  });
  pages.push(page.canvas);
  return { pages, nextPageNumber: pageNumber + 1 };
};

const contentsPage = (report, language, sections) => {
  const page = makePage(copy(language, 'నివేదిక మార్గదర్శి', 'Report Guide'), copy(language, 'గణన నుండి వ్యాఖ్యానం వరకు', 'From calculation to interpretation'), 2);
  const { ctx } = page;
  let y = 235;
  sections.forEach((section, index) => {
    roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 105, 15);
    ctx.fillStyle = index % 2 === 0 ? COLORS.soft : '#fffdf8';
    ctx.fill();
    setFont(ctx, 17, 700); ctx.fillStyle = COLORS.accent;
    ctx.fillText(String(index + 1).padStart(2, '0'), MARGIN + 22, y + 40);
    setFont(ctx, 24, 700); ctx.fillStyle = COLORS.ink;
    ctx.fillText(localName(section.title, language), MARGIN + 88, y + 42);
    setFont(ctx, 17, 700); ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right'; ctx.fillText(`${copy(language, 'పేజీ', 'PAGE')} ${section.page}`, WIDTH - MARGIN - 22, y + 42); ctx.textAlign = 'left';
    drawWrapped(ctx, localName(section.note, language), MARGIN + 88, y + 75, WIDTH - MARGIN * 2 - 220, { size: 16, color: COLORS.muted, maxLines: 1 });
    y += 119;
  });
  drawWrapped(ctx, copy(language,
    'ప్రతి ఫలితంలో ముందుగా గణన ఆధారం, తరువాత సంప్రదాయ వ్యాఖ్యానం ఉంటుంది. దశ తేదీలు ఖచ్చిత కాలక్రమం; ఫలిత వాక్యాలు సంభావ్యతను మాత్రమే సూచిస్తాయి.',
    'Every reading shows its calculation basis before the traditional interpretation. Dasha dates form a calculated timeline; interpretive statements describe tendencies, not guaranteed events.'
  ), MARGIN, 1500, WIDTH - MARGIN * 2, { size: 19, color: COLORS.muted, lineHeight: 30 });
  return page.canvas;
};

const twoCardPages = ({ report, language, items, firstPageNumber, title, subtitle, drawCard }) => {
  const pages = [];
  let pageNumber = firstPageNumber;
  for (let index = 0; index < items.length; index += 2) {
    const page = makePage(localName(title, language), localName(subtitle, language), pageNumber);
    items.slice(index, index + 2).forEach((item, cardIndex) => drawCard(page.ctx, item, MARGIN, 230 + cardIndex * 660, WIDTH - MARGIN * 2));
    pages.push(page.canvas);
    pageNumber += 1;
  }
  return { pages, nextPageNumber: pageNumber };
};

const insightPages = (report, language, insights, firstPageNumber) => {
  const pages = [];
  let pageNumber = firstPageNumber;

  let page = makePage(copy(language, 'జన్మ నక్షత్ర సారాంశం', 'Birth Star Profile'), report.person.name, pageNumber);
  let { ctx } = page;
  roundedRect(ctx, MARGIN, 245, WIDTH - MARGIN * 2, 330, 22); ctx.fillStyle = COLORS.ink; ctx.fill();
  setFont(ctx, 16, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'చంద్ర నక్షత్రం', 'MOON NAKSHATRA'), MARGIN + 28, 292);
  setFont(ctx, 44, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = '#fff4e3';
  ctx.fillText(`${localName(insights.nakshatra.name, language)} · ${copy(language, `${insights.nakshatra.pada}వ పాదం`, `Pada ${insights.nakshatra.pada}`)}`, MARGIN + 28, 355);
  drawWrapped(ctx, localName(insights.nakshatra.trait, language), MARGIN + 28, 414, WIDTH - MARGIN * 2 - 56, { size: 26, weight: 700, color: '#e5d2bd', lineHeight: 38 });
  drawWrapped(ctx, localName(insights.nakshatra.padaNote, language), MARGIN + 28, 500, WIDTH - MARGIN * 2 - 56, { size: 19, color: '#cdb9a9', lineHeight: 29 });
  const summaryItems = [
    [copy(language, 'లగ్నం', 'Lagna'), `${localName(report.ascendant.rashi.name, language)} · ${localName(report.ascendant.nakshatra.name, language)}`],
    [copy(language, 'జన్మ రాశి', 'Moon sign'), `${localName(report.moon.rashi.name, language)} · ${formatZodiacDegree(report.moon.longitude)}`],
    [copy(language, 'నక్షత్రాధిపతి', 'Star lord'), localName(report.planets.find((planet) => planet.key === report.moon.nakshatra.lord)?.name || report.moon.nakshatra.lord, language)],
    [copy(language, 'నవాంశ చంద్ర రాశి', 'Moon Navamsa'), localName(RASHIS[report.moon.navamsaSign].name, language)],
  ];
  summaryItems.forEach(([label, value], index) => infoBox(ctx, MARGIN + (index % 2) * 548, 655 + Math.floor(index / 2) * 142, 528, label, value));
  drawWrapped(ctx, localName(interpretationMethod, language), MARGIN, 1030, WIDTH - MARGIN * 2, { size: 23, lineHeight: 36, color: COLORS.ink });
  drawWrapped(ctx, copy(language,
    'ఈ నివేదికలో సాధారణ వాక్యానికి బదులు ప్రతి వ్యాఖ్యానానికి భావాధిపతి, గ్రహస్థితి, దృష్టి లేదా దశ ఆధారం చూపబడుతుంది.',
    'Instead of isolated generic statements, this report ties every interpretation to a house lord, planetary placement, aspect or operating period.'
  ), MARGIN, 1235, WIDTH - MARGIN * 2, { size: 21, weight: 700, color: COLORS.accent, lineHeight: 33 });
  pages.push(page.canvas); pageNumber += 1;

  const houseResult = twoCardPages({
    report, language, items: insights.houseReadings, firstPageNumber: pageNumber,
    title: { te: 'పన్నెండు భావాల ఫలితాలు', en: 'Twelve-House Reading' },
    subtitle: { te: 'భావం · రాశి · అధిపతి · గ్రహాలు · వ్యాఖ్యానం', en: 'House · sign · lord · occupants · interpretation' },
    drawCard: (cardCtx, item, x, y, width) => {
      roundedRect(cardCtx, x, y, width, 610, 20); cardCtx.fillStyle = '#fffdf8'; cardCtx.fill(); cardCtx.strokeStyle = COLORS.border; cardCtx.stroke();
      setFont(cardCtx, 17, 700); cardCtx.fillStyle = COLORS.accent; cardCtx.fillText(`${String(item.house).padStart(2, '0')} · ${copy(language, 'భావం', 'HOUSE')}`, x + 26, y + 44);
      setFont(cardCtx, 26, 700, 'Georgia, "Noto Serif Telugu", serif');
      drawWrapped(cardCtx, `${localName(item.sign.name, language)} · ${localName(item.theme, language)}`, x + 26, y + 84, width - 52, { size: 26, weight: 700, lineHeight: 35, maxLines: 2 });
      setFont(cardCtx, 15, 700); cardCtx.fillStyle = COLORS.green; cardCtx.fillText(copy(language, 'గణన ఆధారం', 'CALCULATION BASIS'), x + 26, y + 168);
      let nextY = drawWrapped(cardCtx, localName(item.evidence, language), x + 26, y + 204, width - 52, { size: 20, lineHeight: 31, maxLines: 3 });
      setFont(cardCtx, 15, 700); cardCtx.fillStyle = COLORS.accent; cardCtx.fillText(copy(language, 'సంప్రదాయ ఫలితం', 'TRADITIONAL READING'), x + 26, nextY + 28);
      const readingEnd = drawWrapped(cardCtx, localName(item.reading, language), x + 26, nextY + 66, width - 52, { size: 20, lineHeight: 30, maxLines: 5 });
      setFont(cardCtx, 14, 700); cardCtx.fillStyle = COLORS.green; cardCtx.fillText(copy(language, 'సులభంగా అర్థం', 'WHAT THIS MEANS FOR YOU'), x + 26, readingEnd + 18);
      drawWrapped(cardCtx, localName(item.plain, language), x + 26, readingEnd + 52, width - 52, { size: 19, lineHeight: 29, maxLines: 4, color: COLORS.ink });
    },
  });
  pages.push(...houseResult.pages); pageNumber = houseResult.nextPageNumber;

  const planetResult = twoCardPages({
    report, language, items: insights.planetReadings, firstPageNumber: pageNumber,
    title: { te: 'గ్రహాల వ్యక్తిగత ఫలితాలు', en: 'Planet-by-Planet Reading' },
    subtitle: { te: 'స్థానం, బలం, భావ ప్రభావం మరియు షరతులు', en: 'Placement, strength, house focus and conditions' },
    drawCard: (cardCtx, item, x, y, width) => {
      roundedRect(cardCtx, x, y, width, 610, 20); cardCtx.fillStyle = COLORS.soft; cardCtx.fill();
      setFont(cardCtx, 37, 700, 'Georgia, "Noto Serif Telugu", serif'); cardCtx.fillStyle = COLORS.accent;
      cardCtx.fillText(`${item.planet.symbol} ${localName(item.planet.name, language)}`, x + 26, y + 63);
      setFont(cardCtx, 17, 700); cardCtx.fillStyle = COLORS.green; cardCtx.fillText(copy(language, 'గణన ఆధారం', 'CALCULATION BASIS'), x + 26, y + 120);
      let nextY = drawWrapped(cardCtx, localName(item.evidence, language), x + 26, y + 158, width - 52, { size: 21, weight: 700, lineHeight: 32, maxLines: 3 });
      drawWrapped(cardCtx, `${copy(language, 'స్థితి', 'State')}: ${localName(DIGNITY_LABELS[item.planet.dignity], language) || copy(language, 'సాధారణ', 'neutral')}${item.planet.retrograde ? ' · ℞' : ''}${item.planet.combust ? ` · ${copy(language, 'దగ్ధ', 'combust')}` : ''}`, x + 26, nextY + 15, width - 52, { size: 18, color: COLORS.muted });
      setFont(cardCtx, 15, 700); cardCtx.fillStyle = COLORS.accent; cardCtx.fillText(copy(language, 'సంప్రదాయ ఫలితం', 'TRADITIONAL READING'), x + 26, nextY + 76);
      const readingEnd = drawWrapped(cardCtx, localName(item.reading, language), x + 26, nextY + 114, width - 52, { size: 20, lineHeight: 30, maxLines: 5 });
      setFont(cardCtx, 14, 700); cardCtx.fillStyle = COLORS.green; cardCtx.fillText(copy(language, 'సులభంగా అర్థం', 'WHAT THIS MEANS FOR YOU'), x + 26, readingEnd + 18);
      drawWrapped(cardCtx, localName(item.plain, language), x + 26, readingEnd + 52, width - 52, { size: 19, lineHeight: 29, maxLines: 4, color: COLORS.ink });
    },
  });
  pages.push(...planetResult.pages); pageNumber = planetResult.nextPageNumber;

  const meaningfulAspects = insights.aspects.filter((aspect) => aspect.targets.length);
  const aspectItems = meaningfulAspects.length ? meaningfulAspects : insights.aspects;
  for (let index = 0; index < aspectItems.length; index += 7) {
    page = makePage(copy(language, 'పరాశరి గ్రహ దృష్టులు', 'Classical Parashari Aspects'), copy(language, 'దృష్టి ఉన్న భావం మరియు గ్రహ సంబంధం', 'Aspected houses and planetary contacts'), pageNumber);
    ctx = page.ctx; let y = 230;
    aspectItems.slice(index, index + 7).forEach((aspect) => {
      roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 170, 14); ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.strokeStyle = COLORS.border; ctx.stroke();
      setFont(ctx, 23, 700); ctx.fillStyle = COLORS.accent;
      ctx.fillText(`${aspect.planet.symbol} ${localName(aspect.planet.name, language)} → ${aspect.targetHouse}${copy(language, 'వ భావం', ' house')}`, MARGIN + 22, y + 43);
      drawWrapped(ctx, copy(language,
        `${aspect.distance}వ దృష్టి ${aspect.targetHouse}వ భావంపై ఉంది${aspect.targets.length ? `; అక్కడ ${localNames(aspect.targets, 'te')} ఉన్నారు` : ''}.`,
        `${aspect.distance}th aspect falls on house ${aspect.targetHouse}${aspect.targets.length ? ` and contacts ${localNames(aspect.targets, 'en')}` : ''}.`
      ), MARGIN + 22, y + 82, WIDTH - MARGIN * 2 - 44, { size: 19, weight: 700, maxLines: 2, lineHeight: 28 });
      drawWrapped(ctx, copy(language,
        `${localName(PLANET_THEMES_FOR_REPORT[aspect.planet.key], 'te')} అంశాలు ఈ భావ విషయాలను ప్రభావితం చేస్తాయి; బలం, దశ ఆధారంగా ఫలితం మారుతుంది.`,
        `${localName(PLANET_THEMES_FOR_REPORT[aspect.planet.key], 'en')} influence this house; strength and operating periods determine how visibly the result develops.`
      ), MARGIN + 22, y + 126, WIDTH - MARGIN * 2 - 44, { size: 17, color: COLORS.muted, maxLines: 2, lineHeight: 25 });
      y += 186;
    });
    pages.push(page.canvas); pageNumber += 1;
  }

  const lifeResult = twoCardPages({
    report, language, items: insights.lifeAreas, firstPageNumber: pageNumber,
    title: { te: 'జీవిత విభాగాల విశ్లేషణ', en: 'Life-Area Analysis' },
    subtitle: { te: 'ఒక వాక్యం కాదు · సంబంధిత భావాలు, కారకులు, దశల సమన్వయం', en: 'Relevant houses, significators and timing lords combined' },
    drawCard: (cardCtx, item, x, y, width) => {
      roundedRect(cardCtx, x, y, width, 610, 20); cardCtx.fillStyle = item.key === 'wellbeing' ? '#f7eee7' : COLORS.soft; cardCtx.fill();
      setFont(cardCtx, 30, 700, 'Georgia, "Noto Serif Telugu", serif'); cardCtx.fillStyle = COLORS.accent; cardCtx.fillText(localName(item.title, language), x + 26, y + 58);
      setFont(cardCtx, 15, 700); cardCtx.fillStyle = COLORS.green; cardCtx.fillText(copy(language, 'గణన ఆధారం', 'CALCULATION BASIS'), x + 26, y + 116);
      let nextY = drawWrapped(cardCtx, localName(item.evidence, language), x + 26, y + 153, width - 52, { size: 19, lineHeight: 30, maxLines: 4 });
      setFont(cardCtx, 15, 700); cardCtx.fillStyle = COLORS.accent; cardCtx.fillText(copy(language, 'సంప్రదాయ విశ్లేషణ', 'TRADITIONAL ANALYSIS'), x + 26, nextY + 32);
      const readingEnd = drawWrapped(cardCtx, localName(item.reading, language), x + 26, nextY + 70, width - 52, { size: 20, lineHeight: 30, maxLines: 5 });
      setFont(cardCtx, 14, 700); cardCtx.fillStyle = COLORS.green; cardCtx.fillText(copy(language, 'సాధారణ భాషలో సారాంశం', 'PLAIN-LANGUAGE SUMMARY'), x + 26, readingEnd + 20);
      drawWrapped(cardCtx, localName(item.plain, language), x + 26, readingEnd + 55, width - 52, { size: 20, lineHeight: 30, maxLines: 5, color: COLORS.ink });
    },
  });
  pages.push(...lifeResult.pages); pageNumber = lifeResult.nextPageNumber;
  return { pages, nextPageNumber: pageNumber };
};

const vargaPages = (report, language, advanced, firstPageNumber) => {
  const pages = [];
  let pageNumber = firstPageNumber;
  for (let start = 0; start < advanced.vargas.length; start += 4) {
    const page = makePage(copy(language, 'షోడశ వర్గ చక్రాలు', 'Shodasha Varga Charts'), copy(language, 'ప్రతి చక్రం ఉపయోగించే అంశం క్రింద చూపబడింది', 'Each chart is labelled with its traditional area of use'), pageNumber);
    advanced.vargas.slice(start, start + 4).forEach((chart, index) => {
      const column = index % 2; const row = Math.floor(index / 2);
      const x = column ? WIDTH - MARGIN - 470 : MARGIN; const y = 230 + row * 710;
      drawChart(page.ctx, report, chart.key, language, x, y, 470, chart);
      drawWrapped(page.ctx, localName(chart.purpose, language), x, y + 500, 470, { size: 17, color: COLORS.muted, lineHeight: 25, maxLines: 3 });
    });
    drawWrapped(page.ctx, copy(language, 'D16–D60 చక్రాలు జనన సమయానికి అత్యంత సున్నితమైనవి; D60కు ఖచ్చిత/శుద్ధి చేసిన సమయం అవసరం.', 'D16–D60 are highly birth-time sensitive; D60 needs an exact or rectified time.'), MARGIN, 1640, WIDTH - MARGIN * 2, { size: 15, color: COLORS.muted, maxLines: 2, lineHeight: 22 });
    pages.push(page.canvas); pageNumber += 1;
  }
  return { pages, nextPageNumber: pageNumber };
};

const panchangaBhavaPage = (report, language, advanced, pageNumber) => {
  const page = makePage(copy(language, 'జనన పంచాంగం మరియు భావ చక్రం', 'Birth Panchanga & Bhava Framework'), report.person.name, pageNumber);
  const items = [
    [copy(language, 'పక్షం', 'Paksha'), localName(advanced.panchanga.paksha, language)],
    [copy(language, 'తిథి', 'Tithi'), `${localName(advanced.panchanga.tithi, language)} · #${advanced.panchanga.tithiNumber}`],
    [copy(language, 'నిత్య యోగం', 'Nitya Yoga'), localName(advanced.panchanga.yoga, language)],
    [copy(language, 'కరణం', 'Karana'), localName(advanced.panchanga.karana, language)],
  ];
  const width = (WIDTH - MARGIN * 2 - 30) / 2;
  items.forEach(([label, value], index) => infoBox(page.ctx, MARGIN + (index % 2) * (width + 30), 225 + Math.floor(index / 2) * 135, width, label, value));
  drawChart(page.ctx, report, 'moon', language, MARGIN, 535, 460, advanced.chandraChart);
  drawWrapped(page.ctx, localName(advanced.chandraChart.purpose, language), MARGIN, 1020, 460, { size: 17, color: COLORS.muted, lineHeight: 25, maxLines: 3 });
  setFont(page.ctx, 25, 700, 'Georgia, "Noto Serif Telugu", serif'); page.ctx.fillStyle = COLORS.accent;
  page.ctx.fillText(copy(language, 'సంపూర్ణ రాశి భావ పట్టిక', 'Whole-sign Bhava Table'), 610, 535);
  const columns = [610, 680, 835, 990];
  [copy(language, 'భావం', 'House'), copy(language, 'రాశి', 'Sign'), copy(language, 'అధిపతి', 'Lord'), copy(language, 'గ్రహాలు', 'Occupants')].forEach((label, index) => { setFont(page.ctx, 13, 700); page.ctx.fillStyle = COLORS.muted; page.ctx.fillText(label.toUpperCase(), columns[index], 575); });
  let y = 602;
  advanced.bhavaTable.forEach((item, index) => {
    page.ctx.fillStyle = index % 2 ? '#fffdf8' : COLORS.soft; page.ctx.fillRect(600, y - 21, 558, 52);
    setFont(page.ctx, 16, 600); page.ctx.fillStyle = COLORS.ink;
    page.ctx.fillText(String(item.house), columns[0], y + 8);
    page.ctx.fillText(localName(item.sign.name, language), columns[1], y + 8);
    page.ctx.fillText(localName(item.lord.name, language), columns[2], y + 8);
    drawFittedText(page.ctx, item.occupants.map((planet) => localName(planet.name, language)).join(', ') || '—', columns[3], y + 8, 155, { size: 15, minSize: 9, weight: 500, family: '"Noto Sans Telugu", "Segoe UI", sans-serif' });
    y += 55;
  });
  return page.canvas;
};

const strengthNavTaraPage = (report, language, advanced, pageNumber) => {
  const page = makePage(copy(language, 'గ్రహ బలం మరియు నవతార చక్రం', 'Graha Support & Nav Tara Chakra'), report.person.name, pageNumber); const { ctx } = page;
  setFont(ctx, 26, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent; ctx.fillText(copy(language, 'గ్రహ సహాయక బల సూచిక', 'Graha Support Index'), MARGIN, 235);
  drawWrapped(ctx, localName(advanced.disclaimer, language), MARGIN, 274, WIDTH - MARGIN * 2, { size: 16, color: COLORS.muted, lineHeight: 23, maxLines: 3 });
  let y = 350;
  advanced.strengths.forEach((item) => {
    setFont(ctx, 19, 700); ctx.fillStyle = COLORS.ink; ctx.fillText(`${item.planet.symbol} ${localName(item.planet.name, language)}`, MARGIN, y);
    ctx.fillStyle = COLORS.soft; roundedRect(ctx, 330, y - 19, 560, 22, 11); ctx.fill();
    ctx.fillStyle = COLORS.accent; roundedRect(ctx, 330, y - 19, 560 * item.total / 100, 22, 11); ctx.fill();
    setFont(ctx, 18, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(`${item.total}/100`, 920, y);
    setFont(ctx, 14, 500); ctx.fillStyle = COLORS.muted; ctx.fillText(`${copy(language, 'రాశి', 'sign')} ${item.dignity} · ${copy(language, 'భావం', 'house')} ${item.house} · ${copy(language, 'స్థితి', 'condition')} ${item.condition}`, 330, y + 28);
    y += 75;
  });
  y += 25; setFont(ctx, 26, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent; ctx.fillText(copy(language, 'నవతార చక్రం', 'Nav Tara Chakra'), MARGIN, y); y += 35;
  advanced.navTara.forEach((tara, index) => {
    const column = index % 3; const row = Math.floor(index / 3); const x = MARGIN + column * 365; const top = y + row * 145;
    roundedRect(ctx, x, top, 340, 120, 12); ctx.fillStyle = COLORS.soft; ctx.fill();
    ctx.fillStyle = tara.tone === 'supportive' ? COLORS.green : tara.tone === 'caution' ? COLORS.accent : COLORS.gold; ctx.fillRect(x, top, 5, 120);
    setFont(ctx, 18, 700); ctx.fillText(localName(tara.name, language), x + 18, top + 32);
    drawWrapped(ctx, tara.stars.map((star) => localName(star.name, language)).join(' · '), x + 18, top + 67, 300, { size: 14, color: COLORS.muted, lineHeight: 20, maxLines: 3 });
  });
  return page.canvas;
};

const friendshipPage = (report, language, advanced, pageNumber) => {
  const page = makePage(copy(language, 'గ్రహ మైత్రి పట్టిక', 'Graha Maitri Table'), copy(language, 'సహజ + తాత్కాలిక = పంచధా సంబంధం', 'Natural + temporal = compound relationship'), pageNumber); const { ctx } = page; let y = 225;
  advanced.friendships.forEach((row) => {
    roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 170, 13); ctx.fillStyle = COLORS.soft; ctx.fill();
    setFont(ctx, 22, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(`${row.planet.symbol} ${localName(row.planet.name, language)}`, MARGIN + 18, y + 38);
    row.relations.forEach((relation, index) => {
      const x = MARGIN + 205 + (index % 3) * 300; const top = y + 18 + Math.floor(index / 3) * 68;
      setFont(ctx, 15, 700); ctx.fillStyle = COLORS.ink; ctx.fillText(`${relation.planet.symbol} ${localName(relation.planet.name, language)}`, x, top + 18);
      drawFittedText(ctx, `${localName(relation.label, language)} · ${relation.natural > 0 ? '+' : ''}${relation.natural}/${relation.temporal > 0 ? '+' : ''}${relation.temporal}`, x, top + 42, 270, { size: 14, minSize: 10, weight: 500, family: '"Noto Sans Telugu", "Segoe UI", sans-serif', color: COLORS.muted });
    });
    y += 188;
  });
  drawWrapped(ctx, copy(language, 'పంచధా మైత్రి సందర్భ సూచిక మాత్రమే. గ్రహ ఫలితానికి రాశి, భావం, దృష్టి, యుతి మరియు నడుస్తున్న దశను కలిపి చూడాలి.', 'Compound friendship is contextual. Sign, house, aspect, conjunction and operating Dasha must still be combined for interpretation.'), MARGIN, 1585, WIDTH - MARGIN * 2, { size: 17, color: COLORS.muted, lineHeight: 25, maxLines: 3 });
  return page.canvas;
};

const advancedPredictionPages = (report, language, advanced, firstPageNumber) => {
  const pages = []; let pageNumber = firstPageNumber;
  for (let start = 0; start < advanced.predictions.length; start += 2) {
    const page = makePage(copy(language, 'విస్తృత వ్యక్తిగత ఫలితాలు', 'Detailed Personal Predictions'), copy(language, 'గణన ఆధారం · సాధారణ భాష · కాల సూచన', 'Calculation evidence · plain language · timing'), pageNumber); const { ctx } = page;
    advanced.predictions.slice(start, start + 2).forEach((item, index) => {
      const y = 225 + index * 690;
      roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 650, 20); ctx.fillStyle = index % 2 ? '#fffdf8' : COLORS.soft; ctx.fill(); ctx.strokeStyle = COLORS.border; ctx.stroke();
      setFont(ctx, 16, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(`${String(start + index + 1).padStart(2, '0')} · ${copy(language, 'జీవిత అధ్యాయం', 'LIFE CHAPTER')}`, MARGIN + 25, y + 42);
      drawFittedText(ctx, localName(item.title, language), MARGIN + 25, y + 91, WIDTH - MARGIN * 2 - 50, { size: 31, minSize: 20, color: COLORS.accent });
      setFont(ctx, 14, 700); ctx.fillStyle = COLORS.green; ctx.fillText(copy(language, 'గణన ఆధారం', 'CALCULATION BASIS'), MARGIN + 25, y + 139);
      let next = drawWrapped(ctx, localName(item.evidence, language), MARGIN + 25, y + 175, WIDTH - MARGIN * 2 - 50, { size: 19, lineHeight: 29, maxLines: 4 });
      setFont(ctx, 14, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(copy(language, 'సాధారణ భాషలో పఠనం', 'PLAIN-LANGUAGE READING'), MARGIN + 25, next + 28);
      next = drawWrapped(ctx, localName(item.plain, language), MARGIN + 25, next + 66, WIDTH - MARGIN * 2 - 50, { size: 22, lineHeight: 34, maxLines: 7 });
      roundedRect(ctx, MARGIN + 25, Math.min(next + 30, y + 520), WIDTH - MARGIN * 2 - 50, 92, 12); ctx.fillStyle = COLORS.paper; ctx.fill();
      setFont(ctx, 14, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'కాల సూచన', 'TIMING'), MARGIN + 43, Math.min(next + 61, y + 551));
      drawWrapped(ctx, localName(item.timing, language), MARGIN + 190, Math.min(next + 61, y + 551), WIDTH - MARGIN * 2 - 230, { size: 17, lineHeight: 25, maxLines: 2 });
    });
    pages.push(page.canvas); pageNumber += 1;
  }
  return { pages, nextPageNumber: pageNumber };
};

const dashaPages = (report, language, firstPageNumber) => {
  const pages = [];
  let pageNumber = firstPageNumber;
  let page = makePage(copy(language, 'వింశోత్తరి దశలు', 'Vimshottari Dasha Timeline'), `${settingValue(language, 'dasha', report.settings.dasha)} · ${report.person.name}`, pageNumber);
  let ctx = page.ctx;
  let y = 225;
  report.dashas.periods.forEach((period) => {
    const blockHeight = 174;
    if (y + blockHeight > 1580) {
      pages.push(page.canvas);
      pageNumber += 1;
      page = makePage(copy(language, 'వింశోత్తరి దశలు', 'Vimshottari Dasha Timeline'), report.person.name, pageNumber);
      ctx = page.ctx;
      y = 225;
    }
    roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, blockHeight - 10, 15);
    ctx.fillStyle = COLORS.soft;
    ctx.fill();
    setFont(ctx, 25, 700); ctx.fillStyle = COLORS.accent;
    ctx.fillText(`${period.lord.symbol} ${localName(period.lord.name, language)}`, MARGIN + 22, y + 39);
    setFont(ctx, 18, 700); ctx.fillStyle = COLORS.ink;
    ctx.fillText(`${formatPeriod(period.start, report.person.city.tz, language)} → ${formatPeriod(period.end, report.person.city.tz, language)}`, MARGIN + 300, y + 38);
    drawWrapped(ctx, localName(dashaInterpretation(report, period.lord.key), language), MARGIN + 22, y + 72, WIDTH - MARGIN * 2 - 44, { size: 15, lineHeight: 21, maxLines: 2, color: COLORS.muted });
    drawWrapped(ctx, `${copy(language, 'సులభంగా', 'IN SIMPLE WORDS')}: ${localName(dashaPlainSummary(report, period.lord.key), language)}`, MARGIN + 22, y + 122, WIDTH - MARGIN * 2 - 44, { size: 14, lineHeight: 20, maxLines: 2, weight: 700, color: COLORS.green });
    y += blockHeight;
  });
  pages.push(page.canvas);
  return { pages, nextPageNumber: pageNumber + 1 };
};

const currentPeriodPage = (report, language, insights, pageNumber) => {
  const page = makePage(copy(language, 'ప్రస్తుత దశా దృష్టి', 'Current Dasha Focus'), copy(language, 'మహాదశ · అంతర్దశ · ప్రత్యంతర దశ', 'Mahadasha · Antardasha · Pratyantara'), pageNumber);
  const { ctx } = page;
  const levels = [
    [copy(language, 'ప్రధాన జీవన అధ్యాయం', 'MAIN LIFE CHAPTER'), insights.activePeriods.mahadasha, COLORS.accent],
    [copy(language, 'ప్రస్తుత ఉప అధ్యాయం', 'CURRENT SUB-PERIOD'), insights.activePeriods.antardasha, COLORS.green],
    [copy(language, 'సమీప క్రియాశీల దశ', 'IMMEDIATE ACTIVATION'), insights.activePeriods.pratyantara, COLORS.gold],
  ];
  let y = 235;
  levels.forEach(([label, period, color], index) => {
    if (!period) return;
    roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 355, 20); ctx.fillStyle = index === 0 ? COLORS.ink : COLORS.soft; ctx.fill();
    setFont(ctx, 15, 700); ctx.fillStyle = index === 0 ? COLORS.gold : color; ctx.fillText(label, MARGIN + 26, y + 43);
    setFont(ctx, 37, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = index === 0 ? '#fff4e3' : COLORS.ink;
    ctx.fillText(`${period.lord.symbol} ${localName(period.lord.name, language)}`, MARGIN + 26, y + 98);
    drawWrapped(ctx, `${formatPeriod(period.start, report.person.city.tz, language)} → ${formatPeriod(period.end, report.person.city.tz, language)}`, MARGIN + 430, y + 78, 620, { size: 20, weight: 700, color: index === 0 ? '#d8c7b8' : COLORS.muted });
    drawWrapped(ctx, localName(dashaInterpretation(report, period.lord.key), language), MARGIN + 26, y + 150, WIDTH - MARGIN * 2 - 52, { size: 20, lineHeight: 30, maxLines: 3, color: index === 0 ? '#e5d2bd' : COLORS.ink });
    drawWrapped(ctx, `${copy(language, 'సులభంగా', 'IN SIMPLE WORDS')}: ${localName(dashaPlainSummary(report, period.lord.key), language)}`, MARGIN + 26, y + 270, WIDTH - MARGIN * 2 - 52, { size: 17, lineHeight: 25, maxLines: 3, weight: 700, color: index === 0 ? '#8fc3ad' : COLORS.green });
    y += 382;
  });
  drawWrapped(ctx, copy(language,
    'మూడు స్థాయులు ఒకేసారి పని చేస్తాయి: మహాదశ నేపథ్యాన్ని, అంతర్దశ సంఘటనల రంగాన్ని, ప్రత్యంతర దశ తక్కువకాల క్రియాశీలతను సూచిస్తుంది. ఫలితాన్ని ఒక్క దశాధిపతి ఆధారంగా నిర్ణయించకూడదు.',
    'All three levels operate together: Mahadasha sets the background, Antardasha narrows the field of events, and Pratyantara describes shorter activation. No outcome should be judged from one period lord alone.'
  ), MARGIN, 1435, WIDTH - MARGIN * 2, { size: 18, lineHeight: 28, color: COLORS.muted });
  return page.canvas;
};

const dashaDetailPages = (report, language, firstPageNumber) => {
  const pages = [];
  let pageNumber = firstPageNumber;
  report.dashas.periods.forEach((period) => {
    const page = makePage(`${period.lord.symbol} ${localName(period.lord.name, language)} ${copy(language, 'మహాదశ', 'Mahadasha')}`, `${formatPeriod(period.start, report.person.city.tz, language)} → ${formatPeriod(period.end, report.person.city.tz, language)}`, pageNumber);
    const { ctx } = page;
    roundedRect(ctx, MARGIN, 220, WIDTH - MARGIN * 2, 255, 18); ctx.fillStyle = COLORS.ink; ctx.fill();
    setFont(ctx, 15, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'ఈ అధ్యాయం యొక్క ప్రధాన ఫలితం', 'MAIN PERIOD READING'), MARGIN + 24, 261);
    drawWrapped(ctx, localName(dashaInterpretation(report, period.lord.key), language), MARGIN + 24, 306, WIDTH - MARGIN * 2 - 48, { size: 19, lineHeight: 28, maxLines: 3, color: '#fff4e3' });
    drawWrapped(ctx, `${copy(language, 'సులభంగా', 'IN SIMPLE WORDS')}: ${localName(dashaPlainSummary(report, period.lord.key), language)}`, MARGIN + 24, 404, WIDTH - MARGIN * 2 - 48, { size: 16, lineHeight: 23, maxLines: 2, weight: 700, color: '#8fc3ad' });
    setFont(ctx, 15, 700); ctx.fillStyle = COLORS.muted; ctx.fillText(copy(language, 'అంతర్దశ', 'SUB-PERIOD'), MARGIN, 520);
    ctx.fillText(copy(language, 'ఖచ్చిత తేదీలు', 'EXACT DATES'), MARGIN + 310, 520);
    ctx.fillText(copy(language, 'వివరణ + సులభమైన అర్థం', 'ANALYSIS + PLAIN MEANING'), MARGIN + 645, 520);
    let y = 545;
    period.antardashas.forEach((subperiod) => {
      roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 112, 12); ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.strokeStyle = COLORS.border; ctx.stroke();
      setFont(ctx, 20, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(`${subperiod.lord.symbol} ${localName(subperiod.lord.name, language)}`, MARGIN + 18, y + 36);
      drawWrapped(ctx, `${formatPeriod(subperiod.start, report.person.city.tz, language)} → ${formatPeriod(subperiod.end, report.person.city.tz, language)}`, MARGIN + 310, y + 30, 300, { size: 15, weight: 700, color: COLORS.ink, maxLines: 2, lineHeight: 23 });
      drawWrapped(ctx, `${localName(dashaInterpretation(report, subperiod.lord.key), language)} ${localName(dashaPlainSummary(report, subperiod.lord.key), language)}`, MARGIN + 645, y + 27, WIDTH - MARGIN - (MARGIN + 645), { size: 13, color: COLORS.muted, lineHeight: 18, maxLines: 5 });
      y += 120;
    });
    pages.push(page.canvas); pageNumber += 1;
  });
  return { pages, nextPageNumber: pageNumber };
};

const methodPage = (report, language, pageNumber) => {
  const page = makePage(copy(language, 'పద్ధతి మరియు పరిమితులు', 'Methodology & Limits'), report.person.name, pageNumber);
  const { ctx } = page;
  let y = 240;
  Object.entries(report.settings).forEach(([key, value]) => {
    setFont(ctx, 16, 700); ctx.fillStyle = COLORS.muted;
    ctx.fillText(settingLabel(language, key).toUpperCase(), MARGIN, y);
    drawWrapped(ctx, settingValue(language, key, value), MARGIN + 280, y, WIDTH - MARGIN * 2 - 280, { size: 21, weight: 600, lineHeight: 30 });
    y += 72;
  });
  y += 30;
  setFont(ctx, 28, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent;
  ctx.fillText(copy(language, 'మూల సంప్రదాయాలు', 'Interpretive sources'), MARGIN, y);
  y += 52;
  y = drawWrapped(ctx, 'Brihat Parashara Hora Shastra · Phaladeepika · traditional South Indian fixed-sign presentation', MARGIN, y, WIDTH - MARGIN * 2, { size: 22, lineHeight: 34 });
  y += 45;
  setFont(ctx, 28, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent;
  ctx.fillText(copy(language, 'వ్యాఖ్యాన సరిహద్దు', 'Interpretation boundary'), MARGIN, y);
  y += 52;
  y = drawWrapped(ctx, localName(interpretationMethod, language), MARGIN, y, WIDTH - MARGIN * 2, { size: 20, lineHeight: 31 });
  y += 36;
  drawWrapped(ctx, copy(language,
    'షడ్బలం, అష్టకవర్గం, KP సబ్‌లార్డులు, జైమిని కారకాలు ఈ సంచికలో గణించబడవు; ధృవీకరించని సంఖ్యలను చూపించకుండా ఉద్దేశపూర్వకంగా వదిలాం.',
    'Shadbala, Ashtakavarga, KP sub-lords and Jaimini karakas are not calculated in this release. They are intentionally omitted instead of presenting unvalidated numbers.'
  ), MARGIN, y, WIDTH - MARGIN * 2, { size: 19, lineHeight: 29, color: COLORS.muted });
  y += 135;
  setFont(ctx, 28, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent;
  ctx.fillText(copy(language, 'ముఖ్య గమనిక', 'Important notice'), MARGIN, y);
  y += 54;
  drawWrapped(ctx, copy(language,
    'గ్రహస్థితులు, లగ్నం, దశ తేదీలు ఇచ్చిన జనన సమయం, స్థలంపై ఆధారపడతాయి. జనన సమయం తప్పుగా ఉంటే విభాగ చక్రాలు మారవచ్చు. ఫలితాలు జ్యోతిష సంప్రదాయ వ్యాఖ్యానాలు; శాస్త్రీయ హామీలు కావు.',
    'Planetary positions, Lagna and Dasha dates depend on the supplied birth time and place. An inaccurate birth time can change divisional charts. Interpretations are traditional astrological readings, not scientific guarantees.'
  ), MARGIN, y, WIDTH - MARGIN * 2, { size: 23, lineHeight: 36, color: COLORS.ink });
  return page.canvas;
};

export const downloadHoroscopeReport = async (report, language = 'en') => {
  if (!report) throw new Error('Calculate a horoscope before downloading.');
  await Promise.all([
    document.fonts?.load?.('700 28px "Noto Sans Telugu"'),
    document.fonts?.load?.('400 22px "Noto Sans Telugu"'),
  ].filter(Boolean));

  const insights = buildHoroscopeInsights(report);
  const advanced = buildAdvancedHoroscope(report);
  const pages = [coverPage(report, language), null];
  const sections = [];
  let pageNumber = 3;

  sections.push({ title: { te: 'జాతక చక్రాలు', en: 'Horoscope charts' }, note: { te: 'D1 రాశి మరియు D9 నవాంశం', en: 'D1 Rashi and D9 Navamsa' }, page: pageNumber });
  pages.push(chartsPage(report, language, pageNumber)); pageNumber += 1;

  sections.push({ title: { te: 'షోడశ వర్గ చక్రాలు', en: 'Shodasha Varga charts' }, note: { te: 'D1 నుండి D60 వరకు 16 విభాగ చక్రాలు', en: '16 divisional charts from D1 through D60' }, page: pageNumber });
  const vargaResult = vargaPages(report, language, advanced, pageNumber);
  pages.push(...vargaResult.pages); pageNumber = vargaResult.nextPageNumber;

  sections.push({ title: { te: 'పంచాంగం, భావాలు మరియు చక్రాలు', en: 'Panchanga, Bhavas and Chakras' }, note: { te: 'జనన పంచాంగం, చంద్ర కుండలి, నవతార, మైత్రి, బల సూచిక', en: 'Birth Panchanga, Chandra Kundli, Navatara, Maitri and support index' }, page: pageNumber });
  pages.push(panchangaBhavaPage(report, language, advanced, pageNumber)); pageNumber += 1;
  pages.push(strengthNavTaraPage(report, language, advanced, pageNumber)); pageNumber += 1;
  pages.push(friendshipPage(report, language, advanced, pageNumber)); pageNumber += 1;

  sections.push({ title: { te: 'గణన పట్టికలు మరియు యోగాలు', en: 'Calculation tables and Yogas' }, note: { te: 'గ్రహస్థితులు, నక్షత్రం, భావం, బలం', en: 'Planet positions, Nakshatra, house and dignity' }, page: pageNumber });
  const detailResult = detailsPages(report, language, pageNumber);
  pages.push(...detailResult.pages);
  pageNumber = detailResult.nextPageNumber;

  sections.push({ title: { te: 'వ్యక్తిగత ఫలితాలు', en: 'Personalised interpretation' }, note: { te: 'నక్షత్రం, 12 భావాలు, 9 గ్రహాలు, దృష్టులు', en: 'Birth star, 12 houses, 9 planets and aspects' }, page: pageNumber });
  const insightResult = insightPages(report, language, insights, pageNumber);
  pages.push(...insightResult.pages); pageNumber = insightResult.nextPageNumber;

  sections.push({ title: { te: 'జీవిత విభాగాలు', en: 'Life-area chapters' }, note: { te: 'వృత్తి, ధనం, వివాహం, ఇల్లు, విద్య మరియు ఇతర అంశాలు', en: 'Career, finance, relationships, home, learning and more' }, page: pageNumber - Math.ceil(insights.lifeAreas.length / 2) });
  sections.push({ title: { te: 'విస్తృత వ్యక్తిగత ఫలితాలు', en: 'Detailed personal predictions' }, note: { te: '11 అంశాలు · ఆధారం, సాధారణ భాష, కాల సూచన', en: '11 areas · evidence, plain language and timing' }, page: pageNumber });
  const predictionResult = advancedPredictionPages(report, language, advanced, pageNumber);
  pages.push(...predictionResult.pages); pageNumber = predictionResult.nextPageNumber;
  sections.push({ title: { te: 'దశా కాలక్రమం', en: 'Dasha timeline' }, note: { te: 'ప్రస్తుత మూడు స్థాయులు మరియు పూర్తి మహాదశ-అంతర్దశలు', en: 'Current three levels and full Mahadasha-Antardasha schedule' }, page: pageNumber });
  pages.push(currentPeriodPage(report, language, insights, pageNumber)); pageNumber += 1;
  const dashaResult = dashaPages(report, language, pageNumber);
  pages.push(...dashaResult.pages);
  pageNumber = dashaResult.nextPageNumber;
  const dashaDetailResult = dashaDetailPages(report, language, pageNumber);
  pages.push(...dashaDetailResult.pages); pageNumber = dashaDetailResult.nextPageNumber;

  sections.push({ title: { te: 'పద్ధతి మరియు పరిమితులు', en: 'Methodology and limits' }, note: { te: 'ఉపయోగించిన పద్ధతి, మూలాలు, లెక్కించని వ్యవస్థలు', en: 'Method, source tradition and intentionally excluded systems' }, page: pageNumber });
  pages.push(methodPage(report, language, pageNumber));
  pages[1] = contentsPage(report, language, sections);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((canvas, index) => {
    if (index > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });
  const safeName = report.person.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'horoscope';
  await savePdf(pdf, `${safeName}_horoscope_${language}.pdf`);
};
