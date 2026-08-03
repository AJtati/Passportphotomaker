import { jsPDF } from 'jspdf';
import { savePdf } from '../../utils/fileDownload';
import { bilingual } from '../panchangam/helpers';
import { RASHIS, formatZodiacDegree } from '../horoscope/horoscopeCalculator';

const W = 1240; const H = 1754; const M = 76;
const C = { paper: '#fffaf1', ink: '#281d17', muted: '#755f52', border: '#d9c8b3', soft: '#f4e8d9', accent: '#b74d27', gold: '#bd8e32', green: '#33735d', warning: '#a95535' };
const CELLS = { 11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3], 10: [1, 0], 3: [1, 3], 9: [2, 0], 4: [2, 3], 8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3] };
const cp = (language, te, en) => language === 'te' ? te : language === 'en' ? en : `${te} · ${en}`;
const value = (item, language) => bilingual(item, language);
const font = (ctx, size, weight = 400, family = '"Noto Sans Telugu", "Segoe UI", sans-serif') => { ctx.font = `${weight} ${size}px ${family}`; };
const wrap = (ctx, input, width) => {
  const words = String(input || '').split(/\s+/); const lines = []; let line = '';
  words.forEach((word) => { const next = line ? `${line} ${word}` : word; if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next; });
  if (line) lines.push(line); return lines;
};
const textBlock = (ctx, input, x, y, width, options = {}) => {
  const { size = 21, weight = 400, color = C.ink, lineHeight = Math.round(size * 1.45), maxLines } = options;
  font(ctx, size, weight); ctx.fillStyle = color; const lines = wrap(ctx, input, width).slice(0, maxLines || Infinity);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight)); return y + lines.length * lineHeight;
};
const fittedTitle = (ctx, input, x, y, width) => {
  let size = 39;
  font(ctx, size, 700, 'Georgia, "Noto Serif Telugu", serif');
  while (size > 24 && ctx.measureText(String(input)).width > width) {
    size -= 1;
    font(ctx, size, 700, 'Georgia, "Noto Serif Telugu", serif');
  }
  ctx.fillText(input, x, y);
};
const fit = (ctx, input, x, y, width, size = 18, minSize = 10, weight = 600) => {
  let fitted = size; font(ctx, fitted, weight);
  while (fitted > minSize && ctx.measureText(String(input || '')).width > width) { fitted -= 1; font(ctx, fitted, weight); }
  ctx.fillText(String(input || ''), x, y);
};
const page = (title, subtitle, number) => {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.fillStyle = C.accent; ctx.fillRect(0, 0, 12, H);
  font(ctx, 17, 700, 'Arial, sans-serif'); ctx.fillStyle = C.accent; ctx.fillText('PHOTO MAKER · TELUGU PANCHANGAM', M, 58);
  ctx.fillStyle = C.ink; fittedTitle(ctx, title, M, 116, W - M * 2);
  textBlock(ctx, subtitle, M, 151, W - M * 2, { size: 18, color: C.muted, maxLines: 1 });
  ctx.strokeStyle = C.border; ctx.beginPath(); ctx.moveTo(M, 181); ctx.lineTo(W - M, 181); ctx.stroke();
  font(ctx, 15, 700); ctx.fillStyle = C.muted; ctx.fillText(String(number), W - M, H - 45); return { canvas, ctx };
};
const section = (ctx, title, y) => { font(ctx, 18, 700); ctx.fillStyle = C.accent; ctx.fillText(title.toUpperCase(), M, y); return y + 34; };
const card = (ctx, x, y, width, height, title, body, tone = 'soft') => {
  ctx.fillStyle = tone === 'dark' ? C.ink : C.soft; ctx.strokeStyle = C.border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 18); ctx.fill(); ctx.stroke();
  textBlock(ctx, title, x + 22, y + 34, width - 44, { size: 16, weight: 700, color: tone === 'dark' ? C.gold : C.muted, maxLines: 1 });
  textBlock(ctx, body, x + 22, y + 72, width - 44, { size: 23, weight: 700, color: tone === 'dark' ? '#fff7ea' : C.ink, lineHeight: 31, maxLines: 3 });
};
const birthLine = (report, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', { timeZone: report.person.city.tz, year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(report.instant));

const drawChart = (ctx, report, type, language, x, y, size) => {
  const cell = size / 4; const signKey = type === 'd9' ? 'navamsaSign' : 'sign'; const lagna = type === 'd9' ? report.ascendant.navamsaSign : report.ascendant.sign;
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(x, y, size, size); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, size);
  RASHIS.forEach((rashi) => { const [row, col] = CELLS[rashi.index]; const cx = x + col * cell; const cy = y + row * cell; ctx.strokeRect(cx, cy, cell, cell);
    font(ctx, 11, 700); ctx.fillStyle = C.muted; ctx.fillText(value(rashi.name, language), cx + 7, cy + 17);
    const items = []; if (lagna === rashi.index) items.push('Lg'); report.planets.filter((planet) => planet[signKey] === rashi.index).forEach((planet) => items.push(`${planet.symbol}${planet.name.en.slice(0, 2)}${planet.retrograde ? '℞' : ''}`));
    font(ctx, 14, 700); ctx.fillStyle = lagna === rashi.index ? C.accent : C.ink; wrap(ctx, items.join('  '), cell - 14).slice(0, 4).forEach((line, index) => ctx.fillText(line, cx + 7, cy + 43 + index * 19));
  });
  ctx.fillStyle = C.soft; ctx.fillRect(x + cell, y + cell, cell * 2, cell * 2); ctx.textAlign = 'center'; font(ctx, 26, 700, 'Georgia, serif'); ctx.fillStyle = C.accent; ctx.fillText(type.toUpperCase(), x + size / 2, y + size / 2 - 6); font(ctx, 15, 700); ctx.fillStyle = C.ink; ctx.fillText(report.person.name, x + size / 2, y + size / 2 + 25); ctx.textAlign = 'left';
};

const cover = (report, language) => {
  const p = page(cp(language, 'వివాహ జాతక సరిపోలిక', 'Marriage Horoscope Match'), cp(language, 'దక్షిణ భారత దశకూట · అష్టకూట · జాతక పరిశీలన', 'South Indian Dashakoota · Ashtakoota · Chart review'), 1); const { ctx } = p;
  textBlock(ctx, `${report.groom.person.name}  +  ${report.bride.person.name}`, M, 310, W - M * 2, { size: 58, weight: 700, color: C.accent, lineHeight: 72 });
  card(ctx, M, 450, 340, 145, cp(language, 'దశకూటం', 'SOUTH INDIAN'), `${report.southScore} / 10`, 'dark');
  card(ctx, M + 365, 450, 340, 145, cp(language, 'అష్టకూటం', 'ASHTAKOOTA'), `${report.ashtakoota.total} / 36`, 'dark');
  card(ctx, M + 730, 450, 340, 145, cp(language, 'సమగ్ర పఠనం', 'LAYERED READING'), report.grade.toUpperCase(), 'dark');
  let y = 700; y = section(ctx, cp(language, 'ఈ నివేదికలో', 'Inside this report'), y);
  y = textBlock(ctx, cp(language, 'రెండు జనన వివరాలు మరియు D1/D9 చక్రాలు · 10 దక్షిణ భారత పొరుత్తాలు · 36 గుణాల అష్టకూటం · కుజ మరియు పాప సామ్యం · దశా సంధి · 7వ భావ సూచనలు · ప్రతి ఫలితానికి నియమం మరియు ఆధారం.', 'Paired birth facts and D1/D9 charts · 10 South Indian Poruthams · 36-point Ashtakoota · Kuja and Papa Samyam balance · Dasha Sandhi · seventh-house indicators · rule and evidence for every result.'), M, y, W - M * 2, { size: 27, lineHeight: 42 });
  y += 80; card(ctx, M, y, W - M * 2, 235, cp(language, 'ముఖ్యమైన పద్ధతి', 'IMPORTANT METHOD NOTE'), value(report.method.note, language));
  textBlock(ctx, cp(language, 'జ్యోతిష ఫలితాలు సంప్రదాయ మార్గదర్శకాలు మాత్రమే. వివాహ నిర్ణయం, సమ్మతి, ఆరోగ్యం, ఆర్థిక లేదా న్యాయ నిర్ణయాలకు ఇవి ప్రత్యామ్నాయం కావు.', 'Astrological results are traditional guidance only. They do not replace consent, relationship judgement, medical, financial or legal advice.'), M, 1470, W - M * 2, { size: 20, color: C.muted, lineHeight: 31 }); return p.canvas;
};

const pairedFacts = (report, language) => {
  const p = page(cp(language, 'జనన వివరాలు', 'Paired Birth Data'), cp(language, 'ప్రతి వ్యక్తికి చారిత్రక స్థానిక సమయం, DST వేర్వేరుగా గణించబడింది', 'Historical local time and DST are resolved independently for each person'), 2); const { ctx } = p; const width = (W - M * 2 - 24) / 2;
  [report.groom, report.bride].forEach((person, index) => { const x = M + index * (width + 24); card(ctx, x, 235, width, 150, index ? cp(language, 'వధువు', 'BRIDE') : cp(language, 'వరుడు', 'GROOM'), person.person.name, 'dark');
    const rows = [
      [cp(language, 'జననం', 'Birth'), birthLine(person, language)], [cp(language, 'స్థలం', 'Place'), person.person.city.name],
      [cp(language, 'స్థానిక సమయం', 'Civil time'), `${person.timezone.name} · UTC${person.timezone.offset}`],
      [cp(language, 'లగ్నం', 'Lagna'), `${value(person.ascendant.rashi.name, language)} · ${formatZodiacDegree(person.ascendant.longitude)}`],
      [cp(language, 'రాశి', 'Moon sign'), value(person.moon.rashi.name, language)],
      [cp(language, 'నక్షత్రం', 'Nakshatra'), `${value(person.moon.nakshatra.name, language)} · Pada ${person.moon.nakshatra.pada}`],
      [cp(language, 'అయనాంశం', 'Ayanamsa'), `${person.ayanamsaDegrees.toFixed(6)}°`],
    ];
    let y = 430; rows.forEach(([name, rowValue]) => { font(ctx, 15, 700); ctx.fillStyle = C.muted; ctx.fillText(name.toUpperCase(), x + 16, y); y = textBlock(ctx, rowValue, x + 16, y + 34, width - 32, { size: 21, weight: 600, lineHeight: 29, maxLines: 3 }) + 32; ctx.strokeStyle = C.border; ctx.beginPath(); ctx.moveTo(x + 16, y - 15); ctx.lineTo(x + width - 16, y - 15); ctx.stroke(); });
  }); return p.canvas;
};

const charts = (report, language, type, number) => { const p = page(type === 'd1' ? cp(language, 'రాశి చక్రాలు', 'D1 Rashi Charts') : cp(language, 'నవాంశ చక్రాలు', 'D9 Navamsa Charts'), cp(language, 'దక్షిణ భారత స్థిర-రాశి ఆకృతి', 'South Indian fixed-sign format'), number); drawChart(p.ctx, report.groom, type, language, M, 260, 520); drawChart(p.ctx, report.bride, type, language, W - M - 520, 260, 520); card(p.ctx, M, 870, W - M * 2, 220, cp(language, 'చదవడం ఎలా', 'HOW TO READ'), type === 'd1' ? cp(language, 'D1 లగ్నం, భావాలు, గ్రహ స్థితుల ప్రాథమిక చక్రం. సరిపోలికలో 7వ భావం, అధిపతి, శుక్రుడు, గురువు మరియు చంద్రుని సంబంధాలు విడిగా చూడాలి.', 'D1 is the primary chart of Lagna, houses and planets. Matching reviews the seventh house and lord, Venus, Jupiter and Moon relationships separately.') : cp(language, 'D9 వివాహం, ధర్మ భాగస్వామ్యానికి సంప్రదాయ సహాయక చక్రం. ఇది D1ను రద్దు చేయదు; జనన సమయం తప్పితే వేగంగా మారవచ్చు.', 'D9 is a traditional supporting chart for marriage and shared dharma. It does not override D1 and can change quickly when birth time is uncertain.')); return p.canvas; };

const tablePage = (report, language, kind, number) => {
  const isSouth = kind === 'south'; const items = isSouth ? report.poruthams : report.ashtakoota.factors;
  const p = page(isSouth ? cp(language, '10 దక్షిణ భారత పొరుత్తాలు', '10 South Indian Poruthams') : cp(language, '36 గుణాల అష్టకూటం', '36-point Ashtakoota'), isSouth ? `${report.southScore}/10 · ${cp(language, 'రజ్జు, వేధ ఫలితాలు మొత్తం స్కోరులో దాచబడవు', 'Rajju and Vedha are never hidden by the total')}` : `${report.ashtakoota.total}/36 · ${cp(language, 'ప్రతి కూటానికి వేరు బరువు', 'Each Koota has its own weight')}`, number); const { ctx } = p;
  if (!isSouth) {
    const columns = [M, M + 250, M + 500, M + 790, M + 930];
    ctx.fillStyle = C.ink; ctx.fillRect(M, 225, W - M * 2, 62);
    [cp(language, 'కూటం', 'GROUP'), report.groom.person.name, report.bride.person.name, cp(language, 'గుణాలు', 'POINTS'), cp(language, 'గరిష్ఠం', 'MAX')].forEach((label, index) => { font(ctx, 14, 700); ctx.fillStyle = '#f4e5d5'; fit(ctx, label, columns[index] + 10, 263, index < 3 ? 225 : 120, 14, 9, 700); });
    let rowY = 287;
    items.forEach((item, index) => {
      ctx.fillStyle = index % 2 ? '#fffdf8' : C.soft; ctx.fillRect(M, rowY, W - M * 2, 124); ctx.strokeStyle = C.border; ctx.strokeRect(M, rowY, W - M * 2, 124);
      font(ctx, 18, 700); ctx.fillStyle = C.ink; fit(ctx, value(item.name, language), columns[0] + 10, rowY + 35, 225, 18, 11, 700);
      fit(ctx, value(item.groomValue, language), columns[1] + 10, rowY + 35, 225, 17, 10, 600);
      fit(ctx, value(item.brideValue, language), columns[2] + 10, rowY + 35, 260, 17, 10, 600);
      font(ctx, 19, 700); ctx.fillStyle = C.accent; ctx.fillText(String(item.score), columns[3] + 18, rowY + 35); ctx.fillText(String(item.max), columns[4] + 18, rowY + 35);
      textBlock(ctx, value(item.explanation, language), columns[0] + 10, rowY + 70, W - M * 2 - 20, { size: 14, color: C.muted, lineHeight: 20, maxLines: 2 }); rowY += 124;
    });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(M, 1310, W - M * 2, 230, 18); ctx.fill();
    font(ctx, 14, 700); ctx.fillStyle = C.gold; ctx.fillText(cp(language, 'స్కోరు అర్థం', 'WHAT THE SCORE MEANS'), M + 22, 1345);
    textBlock(ctx, value(report.recommendation.title, language), M + 22, 1384, W - M * 2 - 44, { size: 23, weight: 700, color: '#fff7ea', lineHeight: 30, maxLines: 2 });
    textBlock(ctx, value(report.recommendation.text, language), M + 22, 1460, W - M * 2 - 44, { size: 15, color: '#ead8c8', lineHeight: 22, maxLines: 4 });
    return p.canvas;
  }
  let y = 235; items.forEach((item, index) => { const height = isSouth ? 124 : 139; ctx.fillStyle = index % 2 ? '#fffdf8' : C.soft; ctx.strokeStyle = C.border; ctx.beginPath(); ctx.roundRect(M, y, W - M * 2, height, 12); ctx.fill(); ctx.stroke();
    font(ctx, 20, 700); ctx.fillStyle = C.ink; ctx.fillText(value(item.name, language), M + 22, y + 37);
    const result = isSouth ? (item.passed ? cp(language, 'అనుకూలం', 'MATCH') : cp(language, 'సమీక్ష', 'REVIEW')) : `${item.score} / ${item.max}`;
    font(ctx, 19, 700); ctx.fillStyle = isSouth && !item.passed ? C.warning : C.green; ctx.textAlign = 'right'; ctx.fillText(result, W - M - 22, y + 37); ctx.textAlign = 'left';
    textBlock(ctx, value(isSouth ? item.evidence : item.basis, language), M + 22, y + 72, W - M * 2 - 44, { size: 17, color: C.muted, maxLines: 2, lineHeight: 24 }); y += height + 12;
  }); return p.canvas;
};

const poruthamDetails = (report, language, items, number) => { const p = page(cp(language, 'పొరుత్తాల వివరణ', 'Porutham Explanations'), cp(language, 'ఫలితం · గణన నియమం · సంప్రదాయ పఠనం · సులభమైన అర్థం', 'Result · rule · traditional reading · plain meaning'), number); const { ctx } = p; let y = 225;
  items.forEach((item) => { font(ctx, 23, 700); ctx.fillStyle = item.passed ? C.green : C.warning; ctx.fillText(`${item.passed ? '✓' : '!'}  ${value(item.name, language)}`, M, y); y += 38;
    y = textBlock(ctx, value(item.evidence, language), M, y, W - M * 2, { size: 18, weight: 600, lineHeight: 27 }) + 12;
    y = textBlock(ctx, `${cp(language, 'నియమం', 'Rule')}: ${value(item.rule, language)}`, M, y, W - M * 2, { size: 17, color: C.muted, lineHeight: 26 }) + 10;
    y = textBlock(ctx, `${cp(language, 'సంప్రదాయ పఠనం', 'Traditional reading')}: ${value(item.reading, language)}`, M, y, W - M * 2, { size: 17, lineHeight: 26 }) + 10;
    y = textBlock(ctx, `${cp(language, 'ఈ జంటకు సులభంగా', 'For this couple')}: ${value(item.summary, language)}`, M, y, W - M * 2, { size: 18, weight: 700, color: C.green, lineHeight: 27 }) + 28;
    ctx.strokeStyle = C.border; ctx.beginPath(); ctx.moveTo(M, y - 12); ctx.lineTo(W - M, y - 12); ctx.stroke();
  }); return p.canvas; };

const gunaDetails = (report, language, items, number) => { const p = page(cp(language, 'గుణాల సులభమైన వివరణ', 'Guna Plain-Language Guide'), cp(language, 'ప్రతి కూటం స్కోరు మీ జంటకు ఏమి సూచిస్తుంది', 'What every Koota score means for this couple'), number); const { ctx } = p; let y = 225;
  items.forEach((item) => {
    ctx.fillStyle = C.soft; ctx.strokeStyle = C.border; ctx.beginPath(); ctx.roundRect(M, y, W - M * 2, 295, 15); ctx.fill(); ctx.stroke();
    font(ctx, 22, 700); ctx.fillStyle = C.accent; ctx.fillText(value(item.name, language), M + 24, y + 42);
    font(ctx, 22, 700); ctx.fillStyle = C.green; ctx.textAlign = 'right'; ctx.fillText(`${item.score} / ${item.max}`, W - M - 24, y + 42); ctx.textAlign = 'left';
    let next = textBlock(ctx, `${cp(language, 'గణన ఆధారం', 'Calculation basis')}: ${value(item.basis, language)}`, M + 24, y + 82, W - M * 2 - 48, { size: 16, color: C.muted, lineHeight: 24, maxLines: 2 });
    next = textBlock(ctx, `${cp(language, 'ఈ కూటం చూస్తుంది', 'What this Koota checks')}: ${value(item.explanation, language)}`, M + 24, next + 13, W - M * 2 - 48, { size: 17, lineHeight: 25, maxLines: 2 });
    textBlock(ctx, `${cp(language, 'సులభమైన అర్థం', 'Plain meaning')}: ${value(item.summary, language)}`, M + 24, next + 20, W - M * 2 - 48, { size: 18, weight: 700, color: C.green, lineHeight: 27, maxLines: 4 });
    y += 318;
  }); return p.canvas; };

const diagnosticPage = (report, language, number) => { const p = page(cp(language, 'కుజ, పాప సామ్యం, దశా మరియు జాతక స్థాయిలు', 'Kuja, Papa Samyam, Dasha and Chart Layers'), cp(language, 'స్కోరు బయట ఉన్న ముఖ్యమైన పరిశీలనలు', 'Important checks outside the headline scores'), number); const { ctx } = p; const { groom, bride } = report.kuja;
  card(ctx, M, 240, 520, 220, report.groom.person.name, `${cp(language, 'కుజ స్థానాలు లగ్న/చంద్ర/శుక్ర నుండి', 'Mars houses from Lagna/Moon/Venus')}: ${groom.houses.lagna} / ${groom.houses.moon} / ${groom.houses.venus}\n${cp(language, 'గుర్తించిన సూచనలు', 'Flags')}: ${groom.intensity}/3`);
  card(ctx, W - M - 520, 240, 520, 220, report.bride.person.name, `${cp(language, 'కుజ స్థానాలు లగ్న/చంద్ర/శుక్ర నుండి', 'Mars houses from Lagna/Moon/Venus')}: ${bride.houses.lagna} / ${bride.houses.moon} / ${bride.houses.venus}\n${cp(language, 'గుర్తించిన సూచనలు', 'Flags')}: ${bride.intensity}/3`);
  let y = 530; y = section(ctx, cp(language, 'కుజ సమతుల్యం', 'Kuja balance'), y); y = textBlock(ctx, cp(language, `తీవ్రత తేడా ${report.kuja.balance}. ఉపయోగించిన నియమం: ${groom.convention}. 2వ భావాన్ని చేర్చడం కుటుంబ సంప్రదాయం ప్రకారం మారవచ్చు; రద్దు నియమాలు ఆటోమేటిక్‌గా ఊహించలేదు.`, `Intensity difference ${report.kuja.balance}. Convention used: ${groom.convention}. Second-house inclusion varies by lineage; no cancellation is assumed automatically.`), M, y, W - M * 2, { size: 21, lineHeight: 32 }) + 50;
  y = section(ctx, cp(language, 'పాప సామ్యం', 'Papa Samyam'), y);
  y = textBlock(ctx, cp(language,
    `${report.groom.person.name}: ${report.papaSamyam.groom.score}; ${report.bride.person.name}: ${report.papaSamyam.bride.score}; తేడా ${report.papaSamyam.balance}. లగ్నం, చంద్రుడు, శుక్రుడు నుండి కుజ, శని, రాహు, సూర్య స్థానాల పారదర్శక బరువు పోలిక.`,
    `${report.groom.person.name}: ${report.papaSamyam.groom.score}; ${report.bride.person.name}: ${report.papaSamyam.bride.score}; difference ${report.papaSamyam.balance}. Transparent weighted comparison of Mars, Saturn, Rahu and Sun from Lagna, Moon and Venus.`
  ), M, y, W - M * 2, { size: 20, lineHeight: 31 }) + 18;
  y = textBlock(ctx, `${report.papaSamyam.groom.convention}. ${cp(language, 'దృష్టులు లేదా ప్రాంతీయ రద్దులు ఊహించలేదు.', 'Aspects and regional cancellations are not guessed.')}`, M, y, W - M * 2, { size: 17, color: C.muted, lineHeight: 26 }) + 38;
  y = section(ctx, cp(language, 'దశా సంధి', 'Dasha Sandhi'), y); const closest = report.dashaSandhi.closest;
  y = textBlock(ctx, closest ? cp(language, `సమీప మహాదశ మార్పుల మధ్య ${Math.round(closest.days)} రోజులు. స్థితి: ${report.dashaSandhi.status}.`, `Closest Mahadasha changes are ${Math.round(closest.days)} days apart. Status: ${report.dashaSandhi.status}.`) : cp(language, 'పోల్చగల మహాదశ సరిహద్దు లేదు.', 'No comparable Mahadasha boundary found.'), M, y, W - M * 2, { size: 24, weight: 700, lineHeight: 35 }) + 18;
  y = textBlock(ctx, value(report.dashaSandhi.rule, language), M, y, W - M * 2, { size: 19, color: C.muted, lineHeight: 29 }) + 45;
  y = section(ctx, cp(language, '7వ భావ ఆధారాలు', 'Seventh-house evidence'), y);
  [['groom', report.groom], ['bride', report.bride]].forEach(([key, person]) => { const item = report.indicators[key]; y = textBlock(ctx, `${person.person.name}: ${cp(language, '7వ రాశ్యాధిపతి', '7th lord')} ${item.seventhLord}, ${cp(language, 'భావం', 'house')} ${item.seventhLordHouse}; Venus H${item.venusHouse} (${item.venusDignity}); Jupiter H${item.jupiterHouse} (${item.jupiterDignity}); ${cp(language, '7వ భావ గ్రహాలు', '7th-house planets')}: ${item.seventhHousePlanets.join(', ') || cp(language, 'లేవు', 'none')}.`, M, y, W - M * 2, { size: 19, lineHeight: 30 }) + 22; }); return p.canvas; };

const diagnosticPlainPage = (report, language, number) => { const p = page(cp(language, 'జంటకు సులభమైన సమగ్ర అర్థం', 'Plain-Language Couple Summary'), cp(language, 'కుజ · పాప సామ్యం · దశా సంధి · మొత్తం నిర్ణయం', 'Kuja · Papa Samyam · Dasha Sandhi · overall decision'), number); const { ctx } = p;
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(M, 235, W - M * 2, 330, 18); ctx.fill();
  font(ctx, 16, 700); ctx.fillStyle = C.gold; ctx.fillText(cp(language, 'ఈ జంటకు దీని అర్థం', 'WHAT THIS MEANS FOR THIS COUPLE'), M + 24, 278);
  textBlock(ctx, value(report.diagnosticsSummary, language), M + 24, 325, W - M * 2 - 48, { size: 22, weight: 700, color: '#fff7ea', lineHeight: 33, maxLines: 7 });
  let y = 660; y = section(ctx, cp(language, 'మొత్తం సరిపోలిక సారాంశం', 'Overall match summary'), y);
  y = textBlock(ctx, value(report.recommendation.title, language), M, y, W - M * 2, { size: 30, weight: 700, color: C.accent, lineHeight: 42 }) + 20;
  y = textBlock(ctx, value(report.recommendation.text, language), M, y, W - M * 2, { size: 22, lineHeight: 34 }) + 55;
  y = section(ctx, cp(language, 'రోజువారీ నిర్ణయానికి ఎలా ఉపయోగించాలి', 'How to use this practically'), y);
  const points = [
    cp(language, 'కుజ లేదా పాప సామ్య తేడాను భయపెట్టే తీర్పుగా చదవకండి; కోపం, పని ఒత్తిడి, కుటుంబ బాధ్యతలను ఎలా పంచుకుంటారో మాట్లాడండి.', 'Do not read Kuja or Papa Samyam as a frightening verdict; discuss anger, work stress and how family duties will be shared.'),
    cp(language, 'దశా సంధి దగ్గరగా ఉంటే ఆ కాలంలో ఉద్యోగం, నివాసం, కుటుంబ సంరక్షణ వంటి పెద్ద మార్పులకు పరస్పర మద్దతు ప్రణాళిక పెట్టండి.', 'When Dasha changes are close, make a mutual-support plan for major shifts such as work, relocation or family care.'),
    cp(language, 'ఈ స్క్రీన్ సంప్రదాయ మార్గదర్శకం మాత్రమే. గౌరవం, సమ్మతి, భద్రత, సంభాషణ మరియు వాస్తవ జీవన అనుకూలత ప్రధాన నిర్ణయ ఆధారాలు.', 'This screen is traditional guidance only. Respect, consent, safety, communication and real-life compatibility remain the main decision factors.'),
  ];
  points.forEach((point, index) => { y = textBlock(ctx, `${index + 1}. ${point}`, M, y, W - M * 2, { size: 21, lineHeight: 33, maxLines: 4 }) + 25; });
  return p.canvas;
};

const outlookPages = (report, language, firstPageNumber) => {
  const pages = [];
  for (let start = 0; start < report.outlook.length; start += 3) {
    const p = page(cp(language, 'వివాహ జీవితం — విస్తృత పఠనం', 'Married-Life Outlook'), cp(language, 'ప్రతి అంశానికి గణన ఆధారం మరియు సాధారణ వివరణ', 'Calculation evidence and plain explanation for every area'), firstPageNumber + pages.length); const { ctx } = p; let y = 225;
    report.outlook.slice(start, start + 3).forEach((item, index) => {
      ctx.fillStyle = item.tone === 'supportive' ? C.green : C.warning; ctx.fillRect(M, y, 7, 410);
      ctx.fillStyle = index % 2 ? '#fffdf8' : C.soft; ctx.fillRect(M + 7, y, W - M * 2 - 7, 410);
      font(ctx, 15, 700); ctx.fillStyle = C.gold; ctx.fillText(`${String(start + index + 1).padStart(2, '0')} · ${cp(language, 'దాంపత్య అంశం', 'MARRIED-LIFE AREA')}`, M + 28, y + 40);
      fit(ctx, value(item.title, language), M + 28, y + 84, W - M * 2 - 56, 28, 18, 700);
      font(ctx, 14, 700); ctx.fillStyle = C.green; ctx.fillText(cp(language, 'గణన ఆధారం', 'CALCULATION EVIDENCE'), M + 28, y + 132);
      let next = textBlock(ctx, value(item.evidence, language), M + 28, y + 170, W - M * 2 - 56, { size: 18, lineHeight: 28, maxLines: 3 });
      font(ctx, 14, 700); ctx.fillStyle = C.accent; ctx.fillText(cp(language, 'సాధారణ భాషలో అర్థం', 'PLAIN-LANGUAGE MEANING'), M + 28, next + 25);
      textBlock(ctx, value(item.reading, language), M + 28, next + 63, W - M * 2 - 56, { size: 21, lineHeight: 32, maxLines: 5 });
      y += 435;
    });
    pages.push(p.canvas);
  }
  return pages;
};

const relationshipPage = (report, language, number) => {
  const p = page(cp(language, 'సంబంధ పఠనం', 'Relationship Reading'), cp(language, 'బలాలు · జాగ్రత్తలు · మాట్లాడాల్సిన విషయాలు', 'Strengths · cautions · conversations'), number); const { ctx } = p;
  const passed = report.poruthams.filter((item) => item.passed);
  const review = report.poruthams.filter((item) => !item.passed);
  let y = 235;
  y = section(ctx, cp(language, 'సంప్రదాయ బలాలు', 'Traditional strengths'), y);
  passed.slice(0, 5).forEach((item) => {
    font(ctx, 20, 700); ctx.fillStyle = C.green; ctx.fillText(`✓ ${value(item.name, language)}`, M, y);
    y = textBlock(ctx, value(item.reading, language), M + 28, y + 31, W - M * 2 - 28, { size: 17, color: C.muted, lineHeight: 25, maxLines: 2 }) + 13;
  });
  y += 18; y = section(ctx, cp(language, 'సమీక్షించాల్సినవి', 'Points to review'), y);
  if (!review.length) y = textBlock(ctx, cp(language, '10 పొరుత్తాల్లో సమీక్ష సూచన లేదు; కుజ, దశా మరియు వాస్తవ సంబంధ అంశాలు ఇంకా చూడాలి.', 'No Porutham is flagged; Kuja, Dasha and real-world relationship factors still matter.'), M, y, W - M * 2, { size: 18, lineHeight: 27 }) + 18;
  review.slice(0, 5).forEach((item) => {
    font(ctx, 20, 700); ctx.fillStyle = C.warning; ctx.fillText(`! ${value(item.name, language)}`, M, y);
    y = textBlock(ctx, `${value(item.evidence, language)} ${value(item.reading, language)}`, M + 28, y + 31, W - M * 2 - 28, { size: 17, color: C.muted, lineHeight: 25, maxLines: 3 }) + 13;
  });
  y += 18; y = section(ctx, cp(language, 'వివాహానికి ముందు సంభాషణ', 'Before-marriage conversation'), y);
  const conversations = [
    ['సంఘర్షణలో ఎలా మాట్లాడతాం?', 'How do we communicate during conflict?'],
    ['డబ్బు, పొదుపు, అప్పులపై అంచనాలు ఏమిటి?', 'What are our expectations around money, saving and debt?'],
    ['కుటుంబ సరిహద్దులు, సంరక్షణ బాధ్యతలు ఎలా?', 'How will we handle family boundaries and care duties?'],
    ['పిల్లలు, వృత్తి, నివాసంపై లక్ష్యాలు సరిపోతున్నాయా?', 'Do our goals for children, career and location align?'],
    ['ఆరోగ్యం, విశ్వాసం, వ్యక్తిగత స్వేచ్ఛపై అవసరాలు?', 'What do we need around health, faith and personal space?'],
    ['సమ్మతి, గౌరవం, భద్రత ఎల్లప్పుడూ ఉన్నాయా?', 'Are consent, respect and safety consistently present?'],
  ];
  conversations.forEach(([te, en], index) => { y = textBlock(ctx, `${index + 1}. ${cp(language, te, en)}`, M, y, W - M * 2, { size: 18, weight: 600, lineHeight: 27, maxLines: 2 }) + 9; });
  return p.canvas;
};

const methodPage = (report, language, number) => { const p = page(cp(language, 'పద్ధతి, పరిమితులు మరియు తదుపరి దశ', 'Method, Limits and Next Step'), value(report.method.title, language), number); const { ctx } = p; let y = 245;
  const blocks = [
    [cp(language, 'ఖగోళ గణన', 'Astronomical calculation'), cp(language, 'Astronomy Engine భూకేంద్ర దృశ్య గ్రహ స్థితులు; లహిరి / చిత్రపక్ష అయనాంశం; సంపూర్ణ రాశి భావాలు; మధ్యమ చంద్ర నోడ్లు; ప్రతి జన్మస్థలానికి IANA చారిత్రక సమయ మండలి మరియు DST.', 'Astronomy Engine geocentric apparent positions; Lahiri / Chitrapaksha ayanamsa; whole-sign houses; mean lunar nodes; IANA historical timezone and DST for each birthplace.')],
    [cp(language, 'రెండు సరిపోలిక వ్యవస్థలు', 'Two matching systems'), value(report.method.note, language)],
    [cp(language, 'పారదర్శకత', 'Transparency'), cp(language, 'ప్రతి పొరుత్తం పేజీలో ఫలితం, ఉపయోగించిన డేటా, నియమం, అర్థం ఉన్నాయి. కుజంలో 2వ భావం చేర్చినట్టు స్పష్టంగా చూపించాం. రద్దు నియమాలు లేదా గోత్ర/కుటుంబ మినహాయింపులు ఊహించలేదు.', 'Every Porutham shows result, evidence, rule and meaning. The Kuja convention explicitly includes the second house. Cancellation rules and lineage-specific exceptions are not guessed.')],
    [cp(language, 'నిపుణుల సమీక్ష ఎప్పుడు', 'When expert review matters'), cp(language, 'రజ్జు లేదా వేధ సమీక్ష, ఒకే నాడి, తీవ్రమైన కుజ అసమతుల్యం, దశా సంధి, లేదా సుమారు జనన సమయం ఉన్నప్పుడు కుటుంబ సంప్రదాయం తెలిసిన అనుభవజ్ఞుడైన జ్యోతిష్కుడితో మానవ సమీక్ష చేయండి.', 'Use a qualified human astrologer familiar with the family tradition when Rajju or Vedha is flagged, Nadi is the same, Kuja is strongly imbalanced, Dasha Sandhi is close, or either birth time is approximate.')],
    [cp(language, 'మానవ నిర్ణయం', 'Human decision'), cp(language, 'గౌరవం, సమ్మతి, భద్రత, సంభాషణ, ఆరోగ్యం, జీవన లక్ష్యాలు మరియు కుటుంబ పరిస్థితులు ఏ జ్యోతిష స్కోరుకన్నా ముఖ్యమైనవి.', 'Respect, consent, safety, communication, health, life goals and family circumstances matter more than any astrological score.')],
  ];
  blocks.forEach(([title, body]) => { y = section(ctx, title, y); y = textBlock(ctx, body, M, y, W - M * 2, { size: 21, lineHeight: 33 }) + 52; }); return p.canvas; };

export const buildMarriageReportPages = (report, language = 'both') => [
  cover(report, language), pairedFacts(report, language), charts(report, language, 'd1', 3), charts(report, language, 'd9', 4),
  tablePage(report, language, 'south', 5), poruthamDetails(report, language, report.poruthams.slice(0, 4), 6),
  poruthamDetails(report, language, report.poruthams.slice(4, 8), 7), poruthamDetails(report, language, report.poruthams.slice(8), 8),
  tablePage(report, language, 'guna', 9), gunaDetails(report, language, report.ashtakoota.factors.slice(0, 4), 10),
  gunaDetails(report, language, report.ashtakoota.factors.slice(4), 11), diagnosticPage(report, language, 12), diagnosticPlainPage(report, language, 13),
  ...outlookPages(report, language, 14), relationshipPage(report, language, 16), methodPage(report, language, 17),
];

export const downloadMarriageReport = async (report, language = 'both') => {
  await document.fonts?.ready;
  const canvases = buildMarriageReportPages(report, language); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  canvases.forEach((canvas, index) => { if (index) pdf.addPage('a4', 'portrait'); pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); });
  const safe = `${report.groom.person.name}-${report.bride.person.name}`.replace(/[^a-z0-9\u0C00-\u0C7F]+/gi, '-').replace(/^-|-$/g, '');
  await savePdf(pdf, `${safe || 'marriage'}-horoscope-match.pdf`);
};
