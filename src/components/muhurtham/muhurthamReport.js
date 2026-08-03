import { jsPDF } from 'jspdf';
import { savePdf } from '../../utils/fileDownload';
import { HORA_PLANETS } from '../panchangam/calendarDetails';
import { bilingual, getTimeZoneDetails } from '../panchangam/helpers';
import { formatZodiacDegree } from '../horoscope/horoscopeCalculator';
import { MUHURTHAM_METHOD } from './muhurthamCalculator';

const WIDTH = 1240;
const HEIGHT = 1754;
const MARGIN = 82;
const COLORS = {
  paper: '#fffaf1', ink: '#281d17', muted: '#735f53', border: '#ddcfbd',
  soft: '#f6ebdd', accent: '#b64d27', gold: '#c49435', green: '#33735d', amber: '#9a651f', red: '#9e3b2b',
};

const copy = (language, te, en) => language === 'te' ? te : language === 'en' ? en : `${te} · ${en}`;
const local = (value, language) => bilingual(value, language);
const setFont = (ctx, size, weight = 400, family = '"Noto Sans Telugu", "Source Sans 3", sans-serif') => {
  ctx.font = `${weight} ${size}px ${family}`;
};
const roundedRect = (ctx, x, y, width, height, radius = 18) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
};
const wrap = (ctx, value, maxWidth) => {
  const words = String(value || '').split(/\s+/); const lines = []; let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = word; } else line = candidate;
  });
  if (line) lines.push(line); return lines;
};
const drawWrapped = (ctx, value, x, y, maxWidth, options = {}) => {
  const { size = 22, weight = 400, color = COLORS.ink, lineHeight = Math.round(size * 1.4), maxLines } = options;
  setFont(ctx, size, weight); ctx.fillStyle = color;
  const lines = wrap(ctx, value, maxWidth).slice(0, maxLines || Infinity);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
};
const drawFittedText = (ctx, value, x, y, maxWidth, options = {}) => {
  const { size = 40, minSize = 24, weight = 700, family = 'Georgia, "Noto Serif Telugu", serif', color = COLORS.ink } = options;
  let fittedSize = size;
  setFont(ctx, fittedSize, weight, family);
  while (fittedSize > minSize && ctx.measureText(value).width > maxWidth) {
    fittedSize -= 1;
    setFont(ctx, fittedSize, weight, family);
  }
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
};
const makePage = (title, subtitle, pageNumber) => {
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = COLORS.paper; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLORS.accent; ctx.fillRect(0, 0, 12, HEIGHT);
  setFont(ctx, 18, 700); ctx.fillStyle = COLORS.accent; ctx.fillText('PHOTO MAKER · TELUGU PANCHANGAM', MARGIN, 65);
  drawFittedText(ctx, title, MARGIN, 120, WIDTH - MARGIN * 2);
  drawWrapped(ctx, subtitle, MARGIN, 158, WIDTH - MARGIN * 2, { size: 17, color: COLORS.muted, maxLines: 1 });
  ctx.strokeStyle = COLORS.border; ctx.beginPath(); ctx.moveTo(MARGIN, 184); ctx.lineTo(WIDTH - MARGIN, 184); ctx.stroke();
  setFont(ctx, 16, 700); ctx.fillStyle = COLORS.muted; ctx.fillText(String(pageNumber), WIDTH - MARGIN, HEIGHT - 50);
  return { canvas, ctx };
};

const formatDate = (value, timezone, language, withTime = false) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
}).format(new Date(value));
const formatTime = (value, timezone, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  timeZone: timezone, hour: 'numeric', minute: '2-digit',
}).format(new Date(value));
const points = (value) => `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1)}`;
const dignity = (value, language) => ({
  exalted: copy(language, 'ఉచ్చ', 'exalted'), own: copy(language, 'స్వక్షేత్ర', 'own sign'),
  debilitated: copy(language, 'నీచ', 'debilitated'), neutral: copy(language, 'సాధారణ', 'neutral'),
}[value] || value || '—');
const planetPlacement = (planet, language) => planet
  ? `${local(planet.name, language)} · ${local(planet.rashi.name, language)} · ${copy(language, `${planet.house}వ భావం`, `house ${planet.house}`)} · ${dignity(planet.dignity, language)}`
  : '—';

const coverPage = (report, language, selectedOnly = false) => {
  const window = report.windows[0];
  const zone = getTimeZoneDetails(report.city.tz, window.start);
  const page = makePage(copy(language, 'వ్యక్తిగత గృహప్రవేశ ముహూర్తం', 'Personal Griha Pravesham Muhurtham'), report.city.name, 1);
  const { ctx } = page;
  const recommendationLabel = selectedOnly
    ? copy(language, 'ఎంచుకున్న ముహూర్తం', 'SELECTED MUHURTHAM')
    : window.grade === 'best'
    ? copy(language, 'మొదటి సిఫార్సు', 'TOP RECOMMENDATION')
    : window.grade === 'review'
      ? copy(language, 'అందుబాటులోని ఉత్తమ సమయం · సమీక్ష అవసరం', 'BEST AVAILABLE · REVIEW REQUIRED')
      : copy(language, 'జాగ్రత్త · పురోహితుని సమీక్ష అవసరం', 'CAUTION · PRIEST REVIEW REQUIRED');
  drawFittedText(ctx, recommendationLabel, MARGIN, 270, WIDTH - MARGIN * 2, { size: 22, minSize: 17, family: '"Noto Sans Telugu", "Source Sans 3", sans-serif', color: window.grade === 'best' ? COLORS.gold : COLORS.amber });
  setFont(ctx, 58, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent;
  ctx.fillText(`${formatTime(window.start, report.city.tz, language)} – ${formatTime(window.end, report.city.tz, language)}`, MARGIN, 346);
  drawWrapped(ctx, formatDate(window.start, report.city.tz, language), MARGIN, 396, WIDTH - MARGIN * 2, { size: 29, weight: 700 });
  drawWrapped(ctx, `${zone.label} · ${report.city.tz}`, MARGIN, 442, WIDTH - MARGIN * 2, { size: 19, color: COLORS.muted });

  roundedRect(ctx, MARGIN, 535, WIDTH - MARGIN * 2, 250, 22); ctx.fillStyle = COLORS.ink; ctx.fill();
  setFont(ctx, 18, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'ఎందుకు ఎంపికైంది', 'WHY THIS WINDOW'), MARGIN + 28, 580);
  setFont(ctx, 32, 700); ctx.fillStyle = '#fff5e8';
  ctx.fillText(`${local(HORA_PLANETS[window.hora.planetKey].name, language)} ${copy(language, 'హోరా', 'Hora')} · ${local(window.lagna.name, language)} ${copy(language, 'లగ్నం', 'Lagna')}`, MARGIN + 28, 635);
  drawWrapped(ctx, `${local(window.panchanga.tithi, language)} · ${local(window.panchanga.nakshatra.name, language)} · ${local(window.panchanga.moonRashi.name, language)}`, MARGIN + 28, 688, WIDTH - MARGIN * 2 - 56, { size: 22, color: '#d9c8b9' });
  drawWrapped(ctx, `${copy(language, 'స్కోరు', 'Score')}: ${window.score}/100 · ${copy(language, 'కుటుంబ సభ్యులు', 'People evaluated')}: ${report.participants.length}`, MARGIN + 28, 736, WIDTH - MARGIN * 2 - 56, { size: 19, weight: 700, color: '#d9c8b9' });

  let y = 900;
  setFont(ctx, 28, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent;
  ctx.fillText(copy(language, 'కార్య క్రమం', 'CEREMONY TIMELINE'), MARGIN, y);
  y += 62;
  [
    [formatTime(window.hora.start, report.city.tz, language), copy(language, 'అనుకూల హోరా ప్రారంభం', 'Supportive Hora begins')],
    [formatTime(window.start, report.city.tz, language), copy(language, 'గృహ ప్రవేశం చేసి పూజ ప్రారంభించండి', 'Enter the home and begin Puja')],
    [formatTime(window.end, report.city.tz, language), copy(language, 'ఎంపిక చేసిన సంయుక్త సమయం ముగింపు', 'Selected overlap ends')],
  ].forEach(([time, label]) => {
    ctx.strokeStyle = COLORS.border; ctx.beginPath(); ctx.moveTo(MARGIN + 105, y + 10); ctx.lineTo(WIDTH - MARGIN, y + 10); ctx.stroke();
    setFont(ctx, 25, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(time, MARGIN, y + 18);
    drawWrapped(ctx, label, MARGIN + 160, y + 17, WIDTH - MARGIN * 2 - 160, { size: 22, weight: 600, maxLines: 2 });
    y += 105;
  });
  drawWrapped(ctx, local(MUHURTHAM_METHOD.notice, language), MARGIN, 1395, WIDTH - MARGIN * 2, { size: 20, color: COLORS.muted, lineHeight: 31 });
  return page.canvas;
};

const scoreLedgerPages = (report, language, firstPageNumber) => {
  const pages = []; let pageNumber = firstPageNumber; const window = report.windows[0];
  const components = [...window.scoreLedger.components, {
    key: 'final-adjustment', label: { te: '100 పరిమితి / నిరోధ సర్దుబాటు', en: '100-point / blocking adjustment' }, value: window.scoreLedger.finalAdjustment,
  }];
  for (let offset = 0; offset < components.length; offset += 10) {
    const page = makePage(copy(language, 'పూర్తి స్కోరు లెక్క', 'Complete Score Ledger'), `${formatDate(window.start, report.city.tz, language)} · ${formatTime(window.start, report.city.tz, language)} - ${formatTime(window.end, report.city.tz, language)}`, pageNumber);
    const { ctx } = page;
    const boxWidth = (WIDTH - MARGIN * 2 - 20) / 3;
    [
      [copy(language, 'ముడి స్కోరు', 'RAW SCORE'), window.scoreLedger.rawScore],
      [copy(language, 'నిరోధ పరిమితి', 'BLOCKING CAP'), window.scoreLedger.blockingCap],
      [copy(language, 'తుది స్కోరు', 'FINAL SCORE'), window.scoreLedger.finalScore],
    ].forEach(([label, value], index) => {
      roundedRect(ctx, MARGIN + index * (boxWidth + 10), 225, boxWidth, 150, 18); ctx.fillStyle = index === 2 ? COLORS.ink : COLORS.soft; ctx.fill();
      setFont(ctx, 14, 700); ctx.fillStyle = index === 2 ? COLORS.gold : COLORS.muted; ctx.fillText(label, MARGIN + index * (boxWidth + 10) + 20, 264);
      setFont(ctx, 46, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = index === 2 ? '#fff4e3' : COLORS.accent; ctx.fillText(String(value), MARGIN + index * (boxWidth + 10) + 20, 330);
    });
    let y = 420;
    components.slice(offset, offset + 10).forEach((component) => {
      roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 92, 12); ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.strokeStyle = COLORS.border; ctx.stroke();
      drawWrapped(ctx, local(component.label, language), MARGIN + 20, y + 36, WIDTH - MARGIN * 2 - 150, { size: 19, weight: 600, maxLines: 2, lineHeight: 27 });
      setFont(ctx, 24, 700); ctx.fillStyle = Number(component.value) < 0 ? COLORS.red : Number(component.value) > 0 ? COLORS.green : COLORS.muted; ctx.textAlign = 'right'; ctx.fillText(points(component.value), WIDTH - MARGIN - 22, y + 48); ctx.textAlign = 'left';
      y += 101;
    });
    drawWrapped(ctx, copy(language,
      `ముడి స్కోరు ${window.scoreLedger.rawScore}. ${window.scoreLedger.blockingCount} నిరోధాల వల్ల గరిష్ఠం ${window.scoreLedger.blockingCap}; తుది స్కోరు ${window.scoreLedger.finalScore}.`,
      `Raw score ${window.scoreLedger.rawScore}. ${window.scoreLedger.blockingCount} blocking checks set the maximum at ${window.scoreLedger.blockingCap}; final score ${window.scoreLedger.finalScore}.`
    ), MARGIN, 1490, WIDTH - MARGIN * 2, { size: 19, color: COLORS.muted, lineHeight: 29, maxLines: 3 });
    pages.push(page.canvas); pageNumber += 1;
  }
  return { pages, nextPageNumber: pageNumber };
};

const familyPages = (report, language, firstPageNumber) => {
  const pages = []; let pageNumber = firstPageNumber; const window = report.windows[0];
  window.fits.forEach((fit) => {
    const page = makePage(copy(language, 'వ్యక్తిగత జాతక ఆధారం', 'Personal Birth-Chart Proof'), `${fit.name} · ${fit.role} · ${copy(language, 'వ్యక్తిగత స్కోరు', 'personal score')} ${Math.round(fit.score)}`, pageNumber);
    const { ctx } = page;
    setFont(ctx, 42, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent; ctx.fillText(fit.name, MARGIN, 255);
    drawWrapped(ctx, `${copy(language, 'పాత్ర బరువు', 'Role weight')} ×${fit.roleWeight} · ${copy(language, 'జనన స్థలం', 'Birth place')}: ${report.participants.find((person) => person.id === fit.id)?.city?.name || ''}`, MARGIN, 293, WIDTH - MARGIN * 2, { size: 17, color: COLORS.muted, maxLines: 2 });

    const facts = [
      [copy(language, 'జన్మ రాశి', 'JANMA RASHI'), local(fit.natal.rashi.name, language)],
      [copy(language, 'జన్మ నక్షత్రం', 'JANMA NAKSHATRA'), `${local(fit.natal.nakshatra.name, language)} · ${copy(language, `${fit.natal.nakshatra.pada}వ పాదం`, `Pada ${fit.natal.nakshatra.pada}`)}`],
      [copy(language, 'జన్మ లగ్నం', 'NATAL LAGNA'), `${local(fit.natal.lagna.rashi.name, language)} · ${formatZodiacDegree(fit.natal.lagna.longitude)}`],
      [copy(language, 'నక్షత్రాధిపతి', 'STAR LORD'), local(fit.natal.nakshatraLord?.name || fit.natal.nakshatra.lord, language)],
    ];
    facts.forEach(([label, value], index) => {
      const x = MARGIN + (index % 2) * 548; const y = 350 + Math.floor(index / 2) * 130;
      roundedRect(ctx, x, y, 528, 112, 14); ctx.fillStyle = COLORS.soft; ctx.fill();
      setFont(ctx, 13, 700); ctx.fillStyle = COLORS.muted; ctx.fillText(label, x + 18, y + 31);
      drawWrapped(ctx, value, x + 18, y + 68, 492, { size: 21, weight: 700, maxLines: 2, lineHeight: 27 });
    });

    roundedRect(ctx, MARGIN, 625, WIDTH - MARGIN * 2, 142, 16); ctx.fillStyle = COLORS.ink; ctx.fill();
    drawWrapped(ctx, `${copy(language, 'లగ్నాధిపతి', 'Lagna lord')}: ${planetPlacement(fit.natal.lagnaLord, language)}`, MARGIN + 22, 669, WIDTH - MARGIN * 2 - 44, { size: 19, weight: 700, color: '#fff4e3', maxLines: 2, lineHeight: 27 });
    drawWrapped(ctx, `${copy(language, 'రాశ్యాధిపతి', 'Moon-sign lord')}: ${planetPlacement(fit.natal.rashiLord, language)}`, MARGIN + 22, 724, WIDTH - MARGIN * 2 - 44, { size: 18, color: '#d9c8b9', maxLines: 2, lineHeight: 26 });

    const proofCards = [
      {
        title: local(fit.tara.name, language), score: fit.tara.score,
        body: copy(language,
          `జన్మ నక్షత్రం #${fit.tara.janmaNakshatraNumber} నుండి కార్య నక్షత్రం #${fit.tara.eventNakshatraNumber} వరకు కలుపుకొని లెక్క ${fit.tara.count}. 9 తారల చక్రంలో స్థానం ${fit.tara.cyclePosition}; అందుకే ${fit.tara.name.te}.`,
          `Inclusive count from birth star #${fit.tara.janmaNakshatraNumber} to event star #${fit.tara.eventNakshatraNumber} is ${fit.tara.count}. Position ${fit.tara.cyclePosition} in the repeating nine-Tara cycle is ${fit.tara.name.en}.`
        ),
      },
      {
        title: copy(language, 'చంద్రబలం', 'Chandrabala'), score: fit.chandra.score,
        body: copy(language,
          `జన్మ చంద్ర రాశి #${fit.chandra.janmaRashiNumber} నుండి కార్య చంద్ర రాశి #${fit.chandra.eventRashiNumber} వరకు ${fit.chandra.house}వ స్థానం. ఫలితం: ${fit.chandra.name.te}.`,
          `From natal Moon sign #${fit.chandra.janmaRashiNumber}, event Moon sign #${fit.chandra.eventRashiNumber} is the ${fit.chandra.house}th position: ${fit.chandra.name.en}.`
        ),
      },
      {
        title: `${local(HORA_PLANETS[window.hora.planetKey].name, language)} ${copy(language, 'హోరా', 'Hora')}`, score: fit.hora.score,
        body: copy(language,
          `ప్రాథమికం ${points(fit.hora.baseScore)} + లగ్నాధిపతి సరిపోలిక ${points(fit.hora.lagnaLordBonus)} + రాశ్యాధిపతి సరిపోలిక ${points(fit.hora.rashiLordBonus)} + జన్మ గ్రహబలం ${points(fit.hora.dignityBonus)} = ${points(fit.hora.score)}.`,
          `Base ${points(fit.hora.baseScore)} + Lagna-lord match ${points(fit.hora.lagnaLordBonus)} + Moon-sign-lord match ${points(fit.hora.rashiLordBonus)} + natal dignity ${points(fit.hora.dignityBonus)} = ${points(fit.hora.score)}.`
        ),
      },
    ];
    proofCards.forEach((proof, index) => {
      const y = 805 + index * 220;
      roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 194, 16); ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.strokeStyle = COLORS.border; ctx.stroke();
      setFont(ctx, 24, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(proof.title, MARGIN + 22, y + 43);
      setFont(ctx, 25, 700); ctx.fillStyle = Number(proof.score) < 0 ? COLORS.red : COLORS.green; ctx.textAlign = 'right'; ctx.fillText(points(proof.score), WIDTH - MARGIN - 22, y + 43); ctx.textAlign = 'left';
      drawWrapped(ctx, proof.body, MARGIN + 22, y + 85, WIDTH - MARGIN * 2 - 44, { size: 18, lineHeight: 28, maxLines: 4, color: COLORS.muted });
    });
    roundedRect(ctx, MARGIN, 1490, WIDTH - MARGIN * 2, 94, 14); ctx.fillStyle = COLORS.ink; ctx.fill();
    setFont(ctx, 18, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'వ్యక్తిగత మొత్తం', 'PERSONAL TOTAL'), MARGIN + 22, 1526);
    setFont(ctx, 25, 700); ctx.fillStyle = '#fff4e3'; ctx.textAlign = 'right'; ctx.fillText(`${points(fit.tara.score)} + ${points(fit.chandra.score)} + ${points(fit.hora.score)} = ${Math.round(fit.score)}`, WIDTH - MARGIN - 22, 1544); ctx.textAlign = 'left';
    pages.push(page.canvas); pageNumber += 1;
  });
  return { pages, nextPageNumber: pageNumber };
};

const personalShubhaPages = (report, language, firstPageNumber) => {
  const pages = []; let pageNumber = firstPageNumber; const window = report.windows[0];
  for (let offset = 0; offset < window.fits.length; offset += 4) {
    const page = makePage(copy(language, 'వ్యక్తిగత శుభ యోగ అనుకూలత', 'Personal Shubha Suitability'), `${formatDate(window.start, report.city.tz, language)} · ${formatTime(window.start, report.city.tz, language)} – ${formatTime(window.end, report.city.tz, language)}`, pageNumber);
    const { ctx } = page;
    roundedRect(ctx, MARGIN, 220, WIDTH - MARGIN * 2, 142, 16); ctx.fillStyle = COLORS.ink; ctx.fill();
    setFont(ctx, 15, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'కార్యదినంలో ఉన్న పేరుగల శుభ యోగాలు', 'NAMED EVENT-DAY YOGAS'), MARGIN + 24, 258);
    drawWrapped(ctx, window.panchanga.specialYogas?.length
      ? window.panchanga.specialYogas.map((yoga) => `${local(yoga.name, language)} · ${local(yoga.basis, language)}`).join('  |  ')
      : copy(language, 'ఈ సమయానికి ప్రత్యేక వార–నక్షత్ర సిద్ధి యోగం లేదు.', 'No named Vara–Nakshatra Siddhi Yoga is active at this time.'), MARGIN + 24, 302, WIDTH - MARGIN * 2 - 48, { size: 20, color: '#fff4e3', lineHeight: 29, maxLines: 2 });
    let y = 400;
    window.fits.slice(offset, offset + 4).forEach((fit) => {
      const verdict = fit.shubhaYoga;
      roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 250, 16); ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.strokeStyle = COLORS.border; ctx.stroke();
      setFont(ctx, 26, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent; ctx.fillText(fit.name, MARGIN + 24, y + 48);
      drawWrapped(ctx, local(verdict.name, language), MARGIN + 360, y + 46, WIDTH - MARGIN * 2 - 390, { size: 21, weight: 700, color: verdict.tone === 'unsuitable' ? COLORS.red : verdict.tone === 'mixed' ? COLORS.amber : COLORS.green, maxLines: 2 });
      drawWrapped(ctx, `${local(fit.tara.name, language)} · ${local(fit.chandra.name, language)} · ${local(HORA_PLANETS[window.hora.planetKey].name, language)} ${copy(language, 'హోరా', 'Hora')}`, MARGIN + 24, y + 100, WIDTH - MARGIN * 2 - 48, { size: 18, weight: 700, color: COLORS.muted, maxLines: 2 });
      drawWrapped(ctx, local(verdict.explanation, language), MARGIN + 24, y + 158, WIDTH - MARGIN * 2 - 48, { size: 18, lineHeight: 28, color: COLORS.muted, maxLines: 3 });
      y += 270;
    });
    drawWrapped(ctx, copy(language,
      'ఇది కొత్త నిత్య యోగం పేరు కాదు. కార్యదిన యోగం మరియు వ్యక్తిగత తారాబలం, చంద్రబలం, హోరా బలాన్ని కలిపిన పారదర్శక అనుకూలత నిర్ణయం.',
      'This is not a newly invented Nitya Yoga. It is a transparent verdict combining the event-day Yoga with personal Tarabala, Chandrabala and Hora strength.'
    ), MARGIN, 1515, WIDTH - MARGIN * 2, { size: 18, color: COLORS.muted, lineHeight: 27, maxLines: 3 });
    pages.push(page.canvas); pageNumber += 1;
  }
  return { pages, nextPageNumber: pageNumber };
};

const alternativesPages = (report, language, firstPageNumber) => {
  const pages = [];
  let pageNumber = firstPageNumber;
  for (let offset = 0; offset < report.windows.length; offset += 8) {
    const page = makePage(copy(language, 'అన్ని అర్హత పొందిన సమయాలు', 'All Qualified Windows'), `${report.search.startDate} · ${report.search.days} ${copy(language, 'రోజులు', 'days')} · ${report.windows.length} ${copy(language, 'సమయాలు · స్కోరు 50+', 'windows · score 50+')}`, pageNumber);
    const { ctx } = page; let y = 230;
    report.windows.slice(offset, offset + 8).forEach((window, itemIndex) => {
      const index = offset + itemIndex;
      const height = 150; roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, height - 12, 15);
      ctx.fillStyle = index === 0 ? '#efe5d4' : COLORS.soft; ctx.fill();
      setFont(ctx, 30, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(String(index + 1).padStart(2, '0'), MARGIN + 22, y + 48);
      setFont(ctx, 23, 700); ctx.fillStyle = COLORS.ink;
      ctx.fillText(`${formatDate(window.start, report.city.tz, language)} · ${formatTime(window.start, report.city.tz, language)} – ${formatTime(window.end, report.city.tz, language)}`, MARGIN + 90, y + 43);
      drawWrapped(ctx, `${local(HORA_PLANETS[window.hora.planetKey].name, language)} ${copy(language, 'హోరా', 'Hora')} · ${local(window.lagna.name, language)} ${copy(language, 'లగ్నం', 'Lagna')} · ${local(window.panchanga.nakshatra.name, language)}`, MARGIN + 90, y + 82, 820, { size: 19, color: COLORS.muted, maxLines: 2 });
      setFont(ctx, 27, 700); ctx.fillStyle = window.grade === 'best' ? COLORS.green : COLORS.amber; ctx.fillText(`${window.score}`, WIDTH - MARGIN - 70, y + 55);
      y += height;
    });
    pages.push(page.canvas); pageNumber += 1;
  }
  return { pages, nextPageNumber: pageNumber };
};

const methodPage = (report, language, pageNumber) => {
  const page = makePage(copy(language, 'పద్ధతి మరియు ఆడిట్', 'Method & Audit'), local(MUHURTHAM_METHOD.name, language), pageNumber);
  const { ctx } = page; let y = 240;
  const lines = [
    [copy(language, 'ఖగోళ పద్ధతి', 'Astronomical basis'), 'Astronomy Engine · Nirayana · Lahiri / Chitrapaksha · local sunrise/sunset · IANA timezone'],
    [copy(language, 'వ్యక్తిగత పరీక్షలు', 'Personal checks'), copy(language, 'నవతార తారాబలం · చంద్రబలం · జన్మ లగ్న/రాశి అధిపతి హోరా · వ్యక్తిగత శుభ అనుకూలత', 'Nava Tara Tarabala · Chandra Bala · natal Lagna/Moon-lord Hora · personal Shubha suitability')],
    [copy(language, 'కార్య పరీక్షలు', 'Event checks'), copy(language, 'తిథి · వారం · నక్షత్రం · హోరా · లగ్న స్వభావం · లగ్నాధిపతి · చతుర్థాధిపతి', 'Tithi · weekday · Nakshatra · Hora · Lagna nature · Lagna lord · fourth lord')],
    [copy(language, 'తొలగించిన సమయాలు', 'Excluded periods'), copy(language, 'రాహుకాలం · యమగండం · గులిక · దుర్ముహూర్తం · వర్జ్యం', 'Rahu Kalam · Yamagandam · Gulika · Durmuhurtham · Varjyam')],
    [copy(language, 'నవతార లెక్క', 'Nava Tara formula'), copy(language, 'జన్మ నక్షత్రం నుండి కార్య నక్షత్రం వరకు కలుపుకొని లెక్క · 9 స్థానాల పునరావృత చక్రం', 'Inclusive count from birth star to event star · repeating nine-position cycle')],
    [copy(language, 'తుది స్కోరు', 'Final-score formula'), copy(language, 'అన్ని పాయింట్ల ముడి మొత్తం · ప్రతి నిరోధానికి 18 పాయింట్ల గరిష్ఠ పరిమితి · 0-100 పరిధి', 'Raw sum of every component · maximum reduced by 18 per blocking check · clamped to 0-100')],
  ];
  lines.forEach(([label, value]) => {
    setFont(ctx, 17, 700); ctx.fillStyle = COLORS.accent; ctx.fillText(label.toUpperCase(), MARGIN, y);
    y = drawWrapped(ctx, value, MARGIN, y + 42, WIDTH - MARGIN * 2, { size: 23, weight: 600, lineHeight: 34 }) + 52;
  });
  setFont(ctx, 28, 700, 'Georgia, "Noto Serif Telugu", serif'); ctx.fillStyle = COLORS.accent;
  ctx.fillText(copy(language, 'మూలాలు', 'RULE SOURCES'), MARGIN, y); y += 52;
  MUHURTHAM_METHOD.sources.forEach((source) => { setFont(ctx, 22, 600); ctx.fillStyle = COLORS.ink; ctx.fillText(`• ${source}`, MARGIN, y); y += 42; });
  y += 35;
  roundedRect(ctx, MARGIN, y, WIDTH - MARGIN * 2, 285, 20); ctx.fillStyle = COLORS.ink; ctx.fill();
  setFont(ctx, 19, 700); ctx.fillStyle = COLORS.gold; ctx.fillText(copy(language, 'ముఖ్య పరిమితి', 'IMPORTANT LIMIT'), MARGIN + 26, y + 46);
  drawWrapped(ctx, copy(language,
    'ఈ నివేదిక పారదర్శక ప్రాథమిక నియమాలతో సమయాలను పోలుస్తుంది. గృహ రకం, ద్వార దిశ, ప్రాంతీయ ఆచారం లేదా పురోహితుని నియమాలు తుది నిర్ణయాన్ని మార్చవచ్చు. ముఖ్య కర్మకు ముందు కుటుంబ పురోహితునితో ధృవీకరించండి.',
    'This report compares timings with a transparent baseline rule set. House type, entrance direction, regional practice or a priest’s rules can change the final choice. Confirm an important ceremony with the family priest.'
  ), MARGIN + 26, y + 92, WIDTH - MARGIN * 2 - 52, { size: 22, color: '#f2e5d7', lineHeight: 34 });
  return page.canvas;
};

export const downloadMuhurtamReport = async (report, language = 'en') => {
  if (!report?.windows?.length) throw new Error('Calculate Muhurtham windows before downloading.');
  await Promise.all([
    document.fonts?.load?.('700 28px "Noto Sans Telugu"'),
    document.fonts?.load?.('400 22px "Noto Sans Telugu"'),
  ].filter(Boolean));
  const pages = [coverPage(report, language)];
  const scoreLedger = scoreLedgerPages(report, language, 2); pages.push(...scoreLedger.pages);
  const family = familyPages(report, language, scoreLedger.nextPageNumber); pages.push(...family.pages);
  const shubha = personalShubhaPages(report, language, family.nextPageNumber); pages.push(...shubha.pages);
  const alternatives = alternativesPages(report, language, shubha.nextPageNumber); pages.push(...alternatives.pages);
  pages.push(methodPage(report, language, alternatives.nextPageNumber));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((canvas, index) => { if (index > 0) pdf.addPage('a4', 'portrait'); pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); });
  const familyName = report.participants.map((person) => person.name).join('_').replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'family';
  await savePdf(pdf, `${familyName}_griha_pravesham_muhurtham_${language}.pdf`);
};

export const downloadSelectedMuhurtamReport = async (report, selectedWindow, language = 'en') => {
  if (!report || !selectedWindow) throw new Error('Select a Muhurtham before downloading.');
  await Promise.all([
    document.fonts?.load?.('700 28px "Noto Sans Telugu"'),
    document.fonts?.load?.('400 22px "Noto Sans Telugu"'),
  ].filter(Boolean));
  const selectedReport = { ...report, windows: [selectedWindow] };
  const pages = [coverPage(selectedReport, language, true)];
  const scoreLedger = scoreLedgerPages(selectedReport, language, 2); pages.push(...scoreLedger.pages);
  const family = familyPages(selectedReport, language, scoreLedger.nextPageNumber); pages.push(...family.pages);
  const shubha = personalShubhaPages(selectedReport, language, family.nextPageNumber); pages.push(...shubha.pages);
  pages.push(methodPage(selectedReport, language, shubha.nextPageNumber));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((canvas, index) => { if (index > 0) pdf.addPage('a4', 'portrait'); pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); });
  const familyName = report.participants.map((person) => person.name).join('_').replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'family';
  const localTime = formatTime(selectedWindow.start, report.city.tz, 'en').replace(/[^0-9]+/g, '-').replace(/^-|-$/g, '');
  await savePdf(pdf, `${familyName}_${selectedWindow.date}_${localTime}_selected_muhurtham_${language}.pdf`);
};
