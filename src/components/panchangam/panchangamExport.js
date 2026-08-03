import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { changeDpiBlob } from 'changedpi';
import { saveBlob, saveCanvasImage, savePdf } from '../../utils/fileDownload';
import { HORA_PLANETS } from './calendarDetails';
import { calculateLagnasForCivilDates, LAGNA_RASHIS } from './lagnaCalculator';
import { festivalsFromMonth, groupFestivalsByMonth, normalizeFestivals } from './festivalHelpers';
import {
  bilingual,
  formatCivilLagnaRange,
  formatCivilSpecialYogaRange,
  formatLongDate,
  formatCivilHoraRange,
  formatMonth,
  formatRange,
  formatRanges,
  formatShortRange,
  formatShortTime,
  formatTime,
  getTimeZoneDetails,
  horasForCivilDate,
  specialYogasForCivilDate,
} from './helpers';

const COLORS = {
  ink: '#241b16',
  muted: '#745f53',
  saffron: '#b74d27',
  gold: '#c5912f',
  cream: '#fffaf0',
  paper: '#ffffff',
  border: '#dfd2bf',
  pale: '#f8efe2',
};
const copy = (language, te, en) => language === 'te' ? te : language === 'en' ? en : `${te} · ${en}`;

const makeCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const prepareFonts = async () => {
  if (!document.fonts) return;
  await Promise.allSettled([
    document.fonts.load('700 28px "Noto Sans Telugu"'),
    document.fonts.load('400 24px "Noto Sans Telugu"'),
  ]);
};

const canvasToBlob = (canvas, format, quality = 1) =>
  new Promise((resolve, reject) => {
    const mimeType = format === 'JPG' ? 'image/jpeg' : 'image/png';
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed to render image.')), mimeType, quality);
  });

const drawText = (ctx, text, x, y, options = {}) => {
  const { size = 24, weight = 400, color = COLORS.ink, align = 'left', family = '"Noto Sans Telugu", "Segoe UI", sans-serif' } = options;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(text || '—'), x, y);
};

const drawFittedText = (ctx, text, x, y, maxWidth, options = {}) => {
  const { size = 24, minSize = 10, weight = 400, family = '"Noto Sans Telugu", "Segoe UI", sans-serif' } = options;
  let fittedSize = size;
  ctx.font = `${weight} ${fittedSize}px ${family}`;
  while (fittedSize > minSize && ctx.measureText(String(text || '—')).width > maxWidth) {
    fittedSize -= 1;
    ctx.font = `${weight} ${fittedSize}px ${family}`;
  }
  drawText(ctx, text, x, y, { ...options, size: fittedSize, family });
};

const wrappedLines = (ctx, text, maxWidth) => {
  const words = String(text || '—').split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
};

const panel = (ctx, x, y, width, height, fill = COLORS.paper) => {
  ctx.fillStyle = fill;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, 16);
  else ctx.rect(x, y, width, height);
  ctx.fill();
  ctx.stroke();
};

const localTimeText = (city, reference) => {
  const details = getTimeZoneDetails(city.tz, reference);
  return `${details.label} · ${city.tz}`;
};

const header = (ctx, width, title, subtitle, city, reference, language = 'both') => {
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, width, 190);
  ctx.fillStyle = COLORS.saffron;
  ctx.fillRect(0, 0, width, 12);
  drawText(ctx, title, 70, 80, { size: 42, weight: 700, color: COLORS.saffron });
  drawText(ctx, subtitle, 70, 125, { size: 25, color: COLORS.muted });
  drawFittedText(ctx, `${copy(language, 'గణించిన స్థానం', 'Calculated for')} ${city.name} · ${localTimeText(city, reference)}`, 70, 160, width - 140, { size: 20, minSize: 13, color: COLORS.muted });
};

const drawDayExport = (day, city, language) => {
  const canvas = makeCanvas(1240, 1754);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  header(
    ctx,
    canvas.width,
    language === 'en' ? 'Telugu Panchangam' : 'తెలుగు పంచాంగం',
    formatLongDate(day.date),
    city,
    day.sunrise,
    language
  );

  panel(ctx, 55, 225, 1130, 195, COLORS.pale);
  drawText(ctx, bilingual(day.tithi, language), 90, 295, { size: 38, weight: 700, color: COLORS.saffron });
  drawText(ctx, `${bilingual(day.masa, language)}  •  ${bilingual(day.paksha, language)}`, 90, 345, { size: 25 });
  drawText(ctx, `${bilingual(day.samvatsaram, language)}  •  ${bilingual(day.vara, language)}`, 90, 390, { size: 23, color: COLORS.muted });

  const limbs = [
    [copy(language, 'తిథి', 'Tithi'), day.tithi],
    [copy(language, 'నక్షత్రం', 'Nakshatra'), day.nakshatra],
    [copy(language, 'యోగం', 'Yoga'), day.yoga],
    [copy(language, 'కరణం', 'Karana'), day.karana],
    [copy(language, 'వారం', 'Vara'), day.vara],
  ];
  drawText(ctx, copy(language, 'పంచాంగం', 'Panchanga'), 65, 485, { size: 28, weight: 700 });
  limbs.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 55 + column * 575;
    const y = 520 + row * 150;
    panel(ctx, x, y, column === 0 ? 550 : 555, 125);
    drawText(ctx, label, x + 25, y + 38, { size: 19, color: COLORS.muted });
    drawText(ctx, bilingual(value, language), x + 25, y + 86, { size: 25, weight: 700 });
    if (value?.endsAt) drawText(ctx, `${copy(language, 'ముగింపు', 'Until')} ${formatTime(value.endsAt, city.tz, day.date)}`, x + 25, y + 113, { size: 16, color: COLORS.muted });
  });

  drawText(ctx, copy(language, 'సూర్య చంద్రులు', 'Sun & Moon'), 65, 1015, { size: 28, weight: 700 });
  panel(ctx, 55, 1050, 1130, 130);
  const sky = [
    [copy(language, 'సూర్యోదయం', 'Sunrise'), day.sunrise], [copy(language, 'సూర్యాస్తమయం', 'Sunset'), day.sunset], [copy(language, 'చంద్రోదయం', 'Moonrise'), day.moonrise], [copy(language, 'చంద్రాస్తమయం', 'Moonset'), day.moonset],
  ];
  sky.forEach(([label, value], index) => {
    const x = 95 + index * 275;
    drawText(ctx, label, x, 1095, { size: 18, color: COLORS.muted });
    drawText(ctx, formatTime(value, city.tz), x, 1145, { size: 24, weight: 700 });
  });

  drawText(ctx, copy(language, 'పూర్తి దిన సమయాలు', 'Complete Day Timings'), 65, 1215, { size: 28, weight: 700 });
  const timings = [
    [copy(language, 'రాహుకాలం', 'Rahukalam'), formatRange(day.rahukalam, city.tz, day.date)],
    [copy(language, 'గుళిక కాలం', 'Gulika Kalam'), formatRange(day.gulikaKalam, city.tz, day.date)],
    [copy(language, 'యమగండం', 'Yamagandam'), formatRange(day.yamagandam, city.tz, day.date)],
    [copy(language, 'దుర్ముహూర్తం', 'Durmuhurtham'), formatRanges(day.durmuhurtham, city.tz, false, day.date)],
    [copy(language, 'వర్జ్యం', 'Varjyam'), formatRanges(day.varjyam, city.tz, false, day.date)],
    [copy(language, 'అభిజిత్ ముహూర్తం', 'Abhijit Muhurtam'), formatRange(day.abhijitMuhurtam, city.tz, day.date)],
    [copy(language, 'అమృత ఘడియలు', 'Amrita Gadiya'), formatRanges(day.amritaGadiya, city.tz, false, day.date)],
  ];
  timings.forEach(([label, value], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 55 + column * 282.5;
    const y = 1240 + row * 96;
    panel(ctx, x, y, 263, 82, index === 0 || index === 4 ? '#fff2ec' : COLORS.paper);
    drawText(ctx, label, x + 18, y + 32, { size: 15, color: COLORS.muted });
    drawFittedText(ctx, value, x + 18, y + 64, 227, { size: 17, minSize: 9, weight: 700 });
  });

  drawText(ctx, language === 'en' ? 'Special Yogas' : 'విశేష యోగాలు · Special Yogas', 65, 1458, { size: 25, weight: 700 });
  panel(ctx, 55, 1475, 1130, 150, COLORS.pale);
  const specialYogas = specialYogasForCivilDate(day.previousSpecialYogas, day.specialYogas, day.date, city.tz);
  if (specialYogas.length) {
    const columnWidth = 1090 / specialYogas.length;
    specialYogas.forEach((yoga, index) => {
      const x = 75 + columnWidth * index;
      const range = formatCivilSpecialYogaRange(yoga, city.tz, day.date);
      const rangeText = `${range.fromDate ? `${range.fromDate} · ` : ''}${range.from} – ${range.toDate ? `${range.toDate} · ` : ''}${range.to}`;
      drawFittedText(ctx, bilingual(yoga.name, language), x, 1510, columnWidth - 28, { size: 20, minSize: 11, weight: 700, color: COLORS.saffron });
      drawFittedText(ctx, bilingual(yoga.basis, language), x, 1537, columnWidth - 28, { size: 14, minSize: 9, weight: 700 });
      drawFittedText(ctx, rangeText, x, 1564, columnWidth - 28, { size: 15, minSize: 9, weight: 700, color: '#33735d' });
      drawFittedText(ctx, bilingual(yoga.description, language), x, 1590, columnWidth - 28, { size: 11, minSize: 8, color: COLORS.muted });
      if (yoga.warning) drawFittedText(ctx, `⚠ ${bilingual(yoga.warning, language)}`, x, 1613, columnWidth - 28, { size: 9, minSize: 7, weight: 600, color: COLORS.saffron });
    });
  } else {
    drawText(ctx, copy(language, 'ఈ పంచాంగ దినంలో అమృత సిద్ధి, సర్వార్థ సిద్ధి, గురు పుష్య లేదా రవి పుష్య యోగం లేదు.', 'No Amrita Siddhi, Sarvartha Siddhi, Guru Pushya or Ravi Pushya Yoga during this Panchang day.'), 85, 1555, { size: 20, color: COLORS.muted });
    drawText(ctx, copy(language, 'వార–నక్షత్ర ఆధారం · స్థానిక సూర్యోదయం నుండి తదుపరి సూర్యోదయం', 'Vara–Nakshatra basis · Local sunrise to next sunrise'), 85, 1590, { size: 16, color: COLORS.muted });
  }

  drawText(ctx, copy(language, 'పండుగలు', 'Festivals'), 65, 1660, { size: 22, weight: 700 });
  const festivals = day.festivals?.length
    ? day.festivals.map((festival) => bilingual(festival, language)).join('  •  ')
    : copy(language, 'పండుగలు నమోదు కాలేదు', 'No festivals listed');
  panel(ctx, 55, 1670, 1130, 48, COLORS.pale);
  drawFittedText(ctx, festivals, 85, 1702, 1065, { size: 17, minSize: 10, weight: 700, color: COLORS.saffron });
  drawFittedText(ctx, `${copy(language, 'అధికారిక స్థానిక సమయం', 'Official local time')}: ${localTimeText(city, day.sunrise)} · ${copy(language, 'DST/వేసవి సమయం స్వయంచాలకంగా వర్తిస్తుంది.', 'DST/summer-time applied automatically.')}`, 620, 1743, 1100, { size: 13, minSize: 10, color: COLORS.muted, align: 'center' });
  return canvas;
};

const drawHoraExport = (day, city, language) => {
  if (!day.horas?.length) throw new Error('Hora timings are unavailable for this date.');
  const civilHoras = horasForCivilDate(day.previousHoras, day.horas, day.date, city.tz);
  const canvas = makeCanvas(1240, 1754);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const title = language === 'en' ? 'South Indian Kala Hora' : language === 'te' ? 'శుభ హోరా' : 'శుభ హోరా · Kala Hora';
  header(ctx, canvas.width, title, formatLongDate(day.date), city, day.sunrise, language);

  const firstHora = civilHoras[0];
  const firstPlanet = HORA_PLANETS[firstHora.planetKey];
  panel(ctx, 55, 220, 1130, 130, COLORS.pale);
  drawText(ctx, `${firstPlanet.symbol} ${bilingual(firstPlanet.name, language)} ${language === 'en' ? 'at the start of this date' : 'ఈ తేదీ ప్రారంభ హోరా'}`, 85, 270, { size: 27, weight: 700, color: COLORS.saffron });
  drawText(ctx, copy(language, 'ఈ తేదీని తాకే ప్రతి హోరా · పూర్తి ప్రారంభ, ముగింపు సమయాలు', 'Every Hora touching this calendar date · Complete start and end times shown'), 85, 318, { size: 21, color: COLORS.muted });

  const splitAt = Math.ceil(civilHoras.length / 2);
  drawText(ctx, copy(language, 'ఎంచుకున్న తేదీ ప్రారంభం', 'Beginning of selected date'), 65, 412, { size: 25, weight: 700 });
  drawText(ctx, copy(language, 'తేదీ ముగింపు వరకు', 'Continued through date end'), 655, 412, { size: 25, weight: 700 });
  const columns = [civilHoras.slice(0, splitAt), civilHoras.slice(splitAt)];
  columns.forEach((horas, column) => {
    const x = 55 + column * 600;
    horas.forEach((hora, index) => {
      const planet = HORA_PLANETS[hora.planetKey];
      const y = 435 + index * 86;
      const fill = planet.tone === 'favorable' ? '#f1f8f3' : index % 2 === 0 ? COLORS.paper : '#fffaf6';
      panel(ctx, x, y, 550, 74, fill);
      drawText(ctx, planet.symbol, x + 22, y + 38, { size: 27, weight: 700, color: planet.tone === 'favorable' ? '#33735d' : COLORS.saffron });
      drawFittedText(ctx, bilingual(planet.name, language), x + 62, y + 29, 190, { size: 19, minSize: 12, weight: 700 });
      ctx.font = '400 10px "Noto Sans Telugu", "Segoe UI", sans-serif';
      wrappedLines(ctx, bilingual(planet.guidance, language), 285).slice(0, 2).forEach((guidanceLine, lineIndex) => {
        drawText(ctx, guidanceLine, x + 62, y + 47 + lineIndex * 12, { size: 10, color: COLORS.muted });
      });
      const range = formatCivilHoraRange(hora, city.tz, day.date);
      drawText(ctx, `${copy(language, 'నుండి', 'From')} ${range.fromDate ? `${range.fromDate} · ` : ''}${range.from}`, x + 522, y + 25, { size: 14, weight: 700, align: 'right' });
      drawText(ctx, `${copy(language, 'వరకు', 'To')} ${range.toDate ? `${range.toDate} · ` : ''}${range.to}`, x + 522, y + 43, { size: 14, weight: 700, align: 'right' });
      const quality = planet.tone === 'favorable'
        ? { te: 'శుభప్రదం', en: 'Favourable' }
        : { te: 'కార్యానుసారం', en: 'Activity-specific' };
      drawText(ctx, bilingual(quality, language), x + 522, y + 61, { size: 11, color: planet.tone === 'favorable' ? '#33735d' : COLORS.muted, align: 'right' });
    });
  });

  drawText(ctx, copy(language, 'సంప్రదాయ పద్ధతి: పగలు, రాత్రిని విడివిడిగా 12 అసమాన ఋతు గంటలుగా విభజిస్తారు.', 'Traditional method: daytime and nighttime are each divided into 12 unequal seasonal hours.'), canvas.width / 2, 1595, { size: 17, color: COLORS.muted, align: 'center' });
  drawText(ctx, copy(language, 'హోరా సాధారణ సంప్రదాయ మార్గదర్శకం. ముఖ్య నిర్ణయాలకు తిథి, నక్షత్రం, కార్యాన్ని పరిశీలించండి.', 'Hora is a general traditional guide. Consider Tithi, Nakshatra and the activity for important decisions.'), canvas.width / 2, 1630, { size: 16, color: COLORS.muted, align: 'center' });
  drawFittedText(ctx, `Official local time: ${localTimeText(city, day.sunrise)} · DST/summer-time applied automatically.`, canvas.width / 2, 1695, 1100, { size: 17, minSize: 12, color: COLORS.muted, align: 'center' });
  return canvas;
};

const lagnaTitle = (language) => language === 'en'
  ? 'Udaya Lagna'
  : language === 'te' ? 'ఉదయ లగ్నం' : 'ఉదయ లగ్నం · Udaya Lagna';

const drawLagnaExport = (day, city, language) => {
  if (!day.lagnas?.length) throw new Error('Lagna timings are unavailable for this date.');
  const canvas = makeCanvas(1240, 1754);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  header(ctx, canvas.width, lagnaTitle(language), formatLongDate(day.date), city, day.sunrise || day.lagnas[0].start, language);

  const firstLagna = day.lagnas[0];
  panel(ctx, 55, 220, 1130, 130, COLORS.pale);
  drawText(ctx, `${firstLagna.symbol} ${bilingual(firstLagna.name, language)} ${language === 'en' ? 'at the start of this date' : 'ఈ తేదీ ప్రారంభ లగ్నం'}`, 85, 270, { size: 27, weight: 700, color: COLORS.saffron });
  drawFittedText(ctx, `${bilingual(firstLagna.nature, language)}  •  Lahiri / Chitra Paksha  •  Complete start and end times  •  Calendar-day view`, 85, 318, 1060, { size: 21, minSize: 15, color: COLORS.muted });

  const splitAt = Math.ceil(day.lagnas.length / 2);
  drawText(ctx, copy(language, 'ఎంచుకున్న తేదీ ప్రారంభం', 'Beginning of selected date'), 65, 412, { size: 25, weight: 700 });
  drawText(ctx, copy(language, 'తేదీ ముగింపు వరకు', 'Continued through date end'), 655, 412, { size: 25, weight: 700 });
  const columns = [day.lagnas.slice(0, splitAt), day.lagnas.slice(splitAt)];
  columns.forEach((lagnas, column) => {
    const x = 55 + column * 600;
    lagnas.forEach((lagna, index) => {
      const y = 435 + index * 105;
      panel(ctx, x, y, 550, 92, index % 2 === 0 ? COLORS.paper : '#fffaf6');
      drawText(ctx, lagna.symbol, x + 22, y + 48, { size: 30, weight: 700, color: COLORS.gold });
      drawFittedText(ctx, bilingual(lagna.name, language), x + 66, y + 27, 205, { size: 20, minSize: 12, weight: 700 });
      drawFittedText(ctx, bilingual(lagna.nature, language), x + 66, y + 49, 205, { size: 12, minSize: 8, weight: 700, color: COLORS.saffron });
      drawFittedText(ctx, `${language === 'te' ? 'లగ్నాధిపతి' : 'Lord'}: ${bilingual(lagna.lord, language)}`, x + 66, y + 70, 205, { size: 12, minSize: 8, color: COLORS.muted });
      const range = formatCivilLagnaRange(lagna, city.tz, day.date);
      drawText(ctx, `${copy(language, 'నుండి', 'From')} ${range.fromDate ? `${range.fromDate} · ` : ''}${range.from}`, x + 522, y + 31, { size: 14, weight: 700, align: 'right' });
      drawText(ctx, `${copy(language, 'వరకు', 'To')} ${range.toDate ? `${range.toDate} · ` : ''}${range.to}`, x + 522, y + 55, { size: 14, weight: 700, align: 'right' });
      if (range.zoneChanged) drawText(ctx, `${range.fromZone.abbreviation} ${range.fromZone.offset} → ${range.toZone.abbreviation} ${range.toZone.offset}`, x + 522, y + 77, { size: 11, color: COLORS.saffron, align: 'right' });
    });
  });

  drawText(ctx, copy(language, 'ఎంచుకున్న అక్షాంశ, రేఖాంశాలకు సంప్రదాయ నిరయణ ఉదయ రాశులు గణించబడ్డాయి.', 'Traditional sidereal rising signs calculated for the selected latitude and longitude.'), canvas.width / 2, 1595, { size: 17, color: COLORS.muted, align: 'center' });
  drawText(ctx, copy(language, 'లగ్నం ఒక్కటే ముహూర్త సిఫార్సు కాదు. లగ్న శుద్ధి, పూర్తి పంచాంగాన్ని పరిశీలించండి.', 'Lagna alone is not a Muhurtam recommendation. Consider Lagna Shuddhi and the complete Panchangam.'), canvas.width / 2, 1630, { size: 16, color: COLORS.muted, align: 'center' });
  drawFittedText(ctx, `Official local time: ${localTimeText(city, day.sunrise || firstLagna.start)} · DST/summer-time applied automatically.`, canvas.width / 2, 1695, 1100, { size: 17, minSize: 12, color: COLORS.muted, align: 'center' });
  return canvas;
};

const datesForMonth = (year, month) => {
  const count = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: count }, (_, index) =>
    `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  );
};

const drawLagnaMonthExport = (year, month, city, language, lagnasByDate) => {
  const dates = datesForMonth(year, month);
  const maxLagnas = Math.max(...dates.map((date) => lagnasByDate[date]?.length || 0));
  if (!maxLagnas) throw new Error('Lagna timings are unavailable for this month.');

  const canvas = makeCanvas(3508, 2480);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  header(ctx, canvas.width, lagnaTitle(language), `${formatMonth(Number(year), Number(month))} · ${copy(language, 'పూర్తి సమయ పట్టిక', 'Complete timetable')}`, city, lagnasByDate[dates[0]]?.[0]?.start, language);
  drawText(ctx, 'Lahiri / Chitra Paksha  •  Calendar-day view  •  Boundary Lagnas retain complete times', 70, 235, { size: 22, color: COLORS.muted });

  const margin = 45;
  const top = 275;
  const footer = 75;
  const headerHeight = 70;
  const dateWidth = 175;
  const lagnaWidth = (canvas.width - margin * 2 - dateWidth) / maxLagnas;
  const rowHeight = (canvas.height - top - headerHeight - footer) / dates.length;

  ctx.fillStyle = COLORS.pale;
  ctx.fillRect(margin, top, canvas.width - margin * 2, headerHeight);
  ctx.strokeStyle = COLORS.border;
  ctx.strokeRect(margin, top, canvas.width - margin * 2, headerHeight);
  drawText(ctx, 'Date', margin + 18, top + 43, { size: 22, weight: 700 });
  for (let index = 0; index < maxLagnas; index += 1) {
    const x = margin + dateWidth + index * lagnaWidth;
    ctx.strokeRect(x, top, lagnaWidth, headerHeight);
    drawText(ctx, `Lagna ${index + 1}`, x + lagnaWidth / 2, top + 42, { size: 16, weight: 700, align: 'center', color: COLORS.muted });
  }

  dates.forEach((date, row) => {
    const y = top + headerHeight + row * rowHeight;
    const lagnas = lagnasByDate[date] || [];
    ctx.fillStyle = row % 2 === 0 ? COLORS.paper : '#fffaf6';
    ctx.fillRect(margin, y, canvas.width - margin * 2, rowHeight);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(margin, y, dateWidth, rowHeight);
    drawText(ctx, new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit' }).format(new Date(`${date}T12:00:00`)), margin + 18, y + rowHeight / 2 + 7, { size: 18, weight: 700 });

    lagnas.forEach((lagna, column) => {
      const x = margin + dateWidth + column * lagnaWidth;
      const range = formatCivilLagnaRange(lagna, city.tz, date);
      ctx.strokeRect(x, y, lagnaWidth, rowHeight);
      drawFittedText(ctx, `${lagna.symbol} ${bilingual(lagna.name, language)}`, x + lagnaWidth / 2, y + rowHeight * 0.27, lagnaWidth - 12, { size: 14, minSize: 8, weight: 700, color: COLORS.saffron, align: 'center' });
      drawFittedText(ctx, bilingual(lagna.nature, language), x + lagnaWidth / 2, y + rowHeight * 0.49, lagnaWidth - 10, { size: 9, minSize: 6, weight: 700, color: COLORS.muted, align: 'center' });
      const rangeText = `${range.fromDate ? `${range.fromDate} ` : ''}${range.from}–${range.toDate ? `${range.toDate} ` : ''}${range.to}`;
      drawFittedText(ctx, rangeText, x + lagnaWidth / 2, y + rowHeight * 0.75, lagnaWidth - 10, { size: 12, minSize: 7, weight: 600, align: 'center' });
      if (range.zoneChanged) drawFittedText(ctx, `${range.fromZone.abbreviation}→${range.toZone.abbreviation}`, x + lagnaWidth / 2, y + rowHeight * 0.91, lagnaWidth - 10, { size: 8, minSize: 6, color: COLORS.saffron, align: 'center' });
    });
  });

  drawFittedText(ctx, `Official local time for ${city.name} · ${city.tz} · DST/summer-time applied per date. Times are rounded to the nearest minute.`, canvas.width / 2, 2445, canvas.width - 160, { size: 18, minSize: 12, color: COLORS.muted, align: 'center' });
  return canvas;
};

const drawMonthExport = (monthData, city, language) => {
  const canvas = makeCanvas(3508, 2480);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, canvas.width, 265);
  ctx.fillStyle = COLORS.saffron;
  ctx.fillRect(0, 0, canvas.width, 18);
  drawText(ctx, language === 'en' ? 'Telugu Panchangam' : 'తెలుగు పంచాంగం', 80, 105, { size: 58, weight: 700, color: COLORS.saffron });
  drawText(ctx, `${formatMonth(monthData.year, monthData.month)}  •  ${bilingual(monthData.masa, language)}  •  ${bilingual(monthData.samvatsaram, language)}`, 80, 175, { size: 35, weight: 600 });
  const monthTime = localTimeText(city, monthData.days[0]?.sunrise);
  drawFittedText(ctx, `Calculated for ${city.name} · ${monthTime} · DST/summer-time applied per date`, 80, 225, canvas.width - 160, { size: 25, minSize: 16, color: COLORS.muted });

  const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdaysTe = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];
  const margin = 45;
  const top = 300;
  const cellWidth = (canvas.width - margin * 2) / 7;
  const headerHeight = 92;
  const rows = Math.ceil((new Date(monthData.year, monthData.month - 1, 1).getDay() + monthData.days.length) / 7);
  const monthFestivals = festivalsFromMonth(monthData);
  const festivalColumns = 4;
  const festivalRows = Math.max(1, Math.ceil(monthFestivals.length / festivalColumns));
  const festivalBandHeight = Math.min(460, Math.max(120, 62 + festivalRows * 40));
  const cellHeight = (canvas.height - top - headerHeight - festivalBandHeight - 75) / rows;

  weekdaysEn.forEach((weekday, index) => {
    const x = margin + index * cellWidth;
    ctx.fillStyle = index === 0 ? '#f9e7dc' : COLORS.pale;
    ctx.fillRect(x, top, cellWidth, headerHeight);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(x, top, cellWidth, headerHeight);
    const title = language === 'en' ? weekday : weekdaysTe[index];
    drawText(ctx, title, x + cellWidth / 2, top + 42, { size: 27, weight: 700, align: 'center', color: index === 0 ? COLORS.saffron : COLORS.ink });
    if (language === 'both') drawText(ctx, weekday, x + cellWidth / 2, top + 75, { size: 19, align: 'center', color: COLORS.muted });
  });

  const offset = new Date(monthData.year, monthData.month - 1, 1).getDay();
  monthData.days.forEach((day, index) => {
    const position = offset + index;
    const column = position % 7;
    const row = Math.floor(position / 7);
    const x = margin + column * cellWidth;
    const y = top + headerHeight + row * cellHeight;
    ctx.fillStyle = day.isAmavasya ? '#f1ece8' : day.isPurnima ? '#fff6d9' : day.specialYogas?.length ? '#fff9e8' : day.festivals?.length ? '#fff5ee' : COLORS.paper;
    ctx.fillRect(x, y, cellWidth, cellHeight);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
    drawText(ctx, day.gregorianDay, x + 18, y + 41, { size: 31, weight: 700 });
    drawText(ctx, day.moonPhaseEmoji || '', x + cellWidth - 18, y + 39, { size: 25, align: 'right' });
    drawFittedText(ctx, `${bilingual(day.masa, language)} · ${bilingual(day.paksha, language)}`, x + 18, y + 67, cellWidth - 36, { size: 16, minSize: 10, weight: 600, color: COLORS.muted });

    const lineStep = Math.min(17, Math.max(12, (cellHeight - 115) / 13));
    const line = (label, value, lineIndex, color = COLORS.ink, weight = 400) => {
      drawFittedText(ctx, `${label} ${value}`, x + 18, y + 88 + lineIndex * lineStep, cellWidth - 36, {
        size: Math.min(15, lineStep - 1),
        minSize: 9,
        weight,
        color,
      });
    };
    line(language === 'en' ? 'Tithi' : 'తిథి', `${bilingual(day.tithi, language)} ${formatShortTime(day.tithi?.endsAt, city.tz, day.date)}`, 0, COLORS.saffron, 700);
    line(language === 'en' ? 'Nakshatra' : 'నక్షత్రం', `${bilingual(day.nakshatra, language)} ${formatShortTime(day.nakshatra?.endsAt, city.tz, day.date)}`, 1);
    line(language === 'en' ? 'Yoga' : 'యోగం', `${bilingual(day.yoga, language)} ${formatShortTime(day.yoga?.endsAt, city.tz, day.date)}`, 2);
    line(language === 'en' ? 'Karana' : 'కరణం', `${bilingual(day.karana, language)} ${formatShortTime(day.karana?.endsAt, city.tz, day.date)}`, 3);
    line(language === 'en' ? 'Varjyam' : 'వర్జ్యం', formatRanges(day.varjyam, city.tz, true, day.date), 4, '#c45124', 600);
    line(language === 'en' ? 'Durmuhurtham' : 'దుర్ముహూర్తం', formatRanges(day.durmuhurtham, city.tz, true, day.date), 5, '#c45124', 600);
    line(language === 'en' ? 'Rahukalam' : 'రాహుకాలం', formatShortRange(day.rahukalam, city.tz, day.date), 6);
    line(language === 'en' ? 'Gulika Kalam' : 'గుళిక కాలం', formatShortRange(day.gulikaKalam, city.tz, day.date), 7);
    line(language === 'en' ? 'Yamagandam' : 'యమగండం', formatShortRange(day.yamagandam, city.tz, day.date), 8);
    line(language === 'en' ? 'Abhijit' : 'అభిజిత్', formatShortRange(day.abhijitMuhurtam, city.tz, day.date), 9, '#33735d', 600);
    line(language === 'en' ? 'Amrita Gadiya' : 'అమృత ఘడియలు', formatRanges(day.amritaGadiya, city.tz, true, day.date), 10, '#33735d', 600);
    line(language === 'en' ? 'Sunrise–sunset' : 'సూర్యోదయం–అస్తమయం', `${formatShortTime(day.sunrise, city.tz)}–${formatShortTime(day.sunset, city.tz)}`, 11);
    if (day.specialYogas?.length) {
      const yogaText = day.specialYogas.map((yoga) =>
        `${bilingual(yoga.name, language)} ${formatShortRange(yoga, city.tz, day.date)}`).join(' · ');
      line(language === 'en' ? 'Special Yoga' : 'విశేష యోగం', yogaText, 12, '#33735d', 700);
    }

    if (day.festivals?.length) {
      const festivalText = `✦ ${day.festivals.map((festival) => bilingual(festival, language)).join(' · ')}`;
      ctx.font = '700 13px "Noto Sans Telugu", "Segoe UI", sans-serif';
      wrappedLines(ctx, festivalText, cellWidth - 36).slice(0, 2).forEach((festivalLine, lineIndex) => {
        drawText(ctx, festivalLine, x + 18, y + cellHeight - 30 + lineIndex * 15, { size: 13, weight: 700, color: COLORS.saffron });
      });
    }
  });

  const festivalTop = top + headerHeight + rows * cellHeight + 14;
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(margin, festivalTop, canvas.width - margin * 2, festivalBandHeight - 14);
  ctx.strokeStyle = COLORS.border;
  ctx.strokeRect(margin, festivalTop, canvas.width - margin * 2, festivalBandHeight - 14);
  drawText(ctx, copy(language, 'ఈ నెల పండుగలు', 'Festivals this month'), margin + 24, festivalTop + 36, { size: 24, weight: 700, color: COLORS.saffron });
  drawFittedText(ctx, `Calculated for ${city.name} · ${city.tz}`, canvas.width - margin - 24, festivalTop + 35, canvas.width * 0.5, { size: 16, minSize: 11, color: COLORS.muted, align: 'right' });

  if (!monthFestivals.length) {
    drawText(ctx, copy(language, 'ఈ నెలకు పండుగలు నమోదు కాలేదు.', 'No festivals are listed for this month.'), margin + 24, festivalTop + 82, { size: 18, color: COLORS.muted });
  } else {
    const itemWidth = (canvas.width - margin * 2 - 48) / festivalColumns;
    const availableHeight = festivalBandHeight - 76;
    const rowHeight = availableHeight / festivalRows;
    monthFestivals.forEach((festival, index) => {
      const column = index % festivalColumns;
      const row = Math.floor(index / festivalColumns);
      const x = margin + 24 + column * itemWidth;
      const y = festivalTop + 66 + row * rowHeight;
      const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${festival.date}T12:00:00`));
      drawFittedText(ctx, `${day}  ✦  ${bilingual(festival, language)}`, x, y + Math.min(24, rowHeight * 0.7), itemWidth - 18, { size: Math.min(18, rowHeight * 0.52), minSize: 9, weight: 600, color: COLORS.ink });
    });
  }

  drawFittedText(ctx, `Official local time: ${monthTime} · DST/summer-time applied per date. Tithi, Nakshatra, Yoga and Karana show ending times.`, canvas.width / 2, 2445, canvas.width - 160, { size: 19, minSize: 13, color: COLORS.muted, align: 'center' });
  return canvas;
};

const drawFestivalYearExport = (festivalData, year, city, language) => {
  const canvas = makeCanvas(3508, 2480);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, canvas.width, 245);
  ctx.fillStyle = COLORS.saffron;
  ctx.fillRect(0, 0, canvas.width, 18);
  drawText(ctx, copy(language, `${year} పండుగల క్యాలెండర్`, `${year} Festival Calendar`), 70, 105, { size: 56, weight: 700, color: COLORS.saffron });
  drawFittedText(ctx, copy(language, `${city.name} స్థానిక పంచాంగం ప్రకారం`, `Calculated from the local Panchangam for ${city.name}`), 70, 170, canvas.width - 140, { size: 30, minSize: 18, weight: 600 });
  drawFittedText(ctx, `${city.tz} · Location-aware dates · DST/summer-time applied per date`, 70, 215, canvas.width - 140, { size: 21, minSize: 14, color: COLORS.muted });

  const groups = groupFestivalsByMonth(normalizeFestivals(festivalData?.festivals || []));
  const margin = 45;
  const gap = 18;
  const top = 275;
  const footer = 65;
  const columns = 3;
  const panelWidth = (canvas.width - margin * 2 - gap * (columns - 1)) / columns;
  const panelHeight = (canvas.height - top - footer - gap * 3) / 4;

  Array.from({ length: 12 }, (_, index) => index + 1).forEach((month) => {
    const column = (month - 1) % columns;
    const row = Math.floor((month - 1) / columns);
    const x = margin + column * (panelWidth + gap);
    const y = top + row * (panelHeight + gap);
    const festivals = groups[month] || [];
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(x, y, panelWidth, panelHeight);
    ctx.fillStyle = COLORS.pale;
    ctx.fillRect(x, y, panelWidth, 66);
    drawText(ctx, String(month).padStart(2, '0'), x + 22, y + 43, { size: 28, weight: 700, color: COLORS.gold });
    drawText(ctx, formatMonth(year, month), x + 78, y + 42, { size: 25, weight: 700 });
    drawText(ctx, `${festivals.length}`, x + panelWidth - 24, y + 42, { size: 20, weight: 700, color: COLORS.muted, align: 'right' });

    if (!festivals.length) {
      drawText(ctx, copy(language, 'పండుగలు నమోదు కాలేదు', 'No festivals listed'), x + 22, y + 112, { size: 18, color: COLORS.muted });
      return;
    }
    const availableHeight = panelHeight - 82;
    const rowHeight = availableHeight / festivals.length;
    festivals.forEach((festival, festivalIndex) => {
      const itemY = y + 78 + festivalIndex * rowHeight;
      const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${festival.date}T12:00:00`));
      drawFittedText(ctx, date, x + 22, itemY + Math.min(25, rowHeight * 0.7), 92, { size: Math.min(18, rowHeight * 0.48), minSize: 9, weight: 700, color: COLORS.saffron });
      drawFittedText(ctx, bilingual(festival, language), x + 122, itemY + Math.min(25, rowHeight * 0.7), panelWidth - 145, { size: Math.min(19, rowHeight * 0.5), minSize: 9, weight: 600 });
    });
  });

  drawFittedText(ctx, `Festival dates are location-aware and may differ by place or regional tradition · ${city.name}`, canvas.width / 2, 2445, canvas.width - 160, { size: 18, minSize: 12, color: COLORS.muted, align: 'center' });
  return canvas;
};

export const downloadPanchangam = async ({ content, format, language, day, monthData, yearMonths, festivalData, year, city, onProgress }) => {
  await prepareFonts();

  if (content === 'festivals') {
    if (!festivalData) throw new Error('The festival calendar could not be prepared. Please try again.');
    const canvas = drawFestivalYearExport(festivalData, year, city, language);
    const filename = `festival-calendar-${year}.${format.toLowerCase()}`;
    if (format === 'PDF') {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
      await savePdf(pdf, filename);
      return;
    }
    await saveCanvasImage(canvas, format, filename, format === 'JPG' ? 0.94 : 1, 300);
    return;
  }
  if (content === 'lagna-year') {
    const filenameBase = `udaya-lagna-${year}`;
    const dates = Array.from({ length: 12 }, (_, index) => datesForMonth(year, index + 1)).flat();
    const lagnasByDate = calculateLagnasForCivilDates(dates, city);

    if (format === 'PDF') {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
      for (let month = 1; month <= 12; month += 1) {
        onProgress?.(month);
        if (month > 1) pdf.addPage('a3', 'landscape');
        const canvas = drawLagnaMonthExport(year, month, city, language, lagnasByDate);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }
      await savePdf(pdf, `${filenameBase}.pdf`);
      return;
    }

    const zip = new JSZip();
    for (let month = 1; month <= 12; month += 1) {
      onProgress?.(month);
      const canvas = drawLagnaMonthExport(year, month, city, language, lagnasByDate);
      const blob = await canvasToBlob(canvas, format, format === 'JPG' ? 0.94 : 1);
      const dpiBlob = await changeDpiBlob(blob, 300);
      zip.file(`${filenameBase}-${String(month).padStart(2, '0')}.${format.toLowerCase()}`, dpiBlob);
    }
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    await saveBlob(archive, `${filenameBase}-${format.toLowerCase()}.zip`, 'application/zip');
    return;
  }

  if (content === 'year') {
    if (!yearMonths || yearMonths.length !== 12) throw new Error('The complete year could not be prepared. Please try again.');
    const filenameBase = `telugu-panchangam-${year}`;

    if (format === 'PDF') {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
      for (let index = 0; index < yearMonths.length; index += 1) {
        onProgress?.(index + 1);
        if (index > 0) pdf.addPage('a3', 'landscape');
        const canvas = drawMonthExport(yearMonths[index], city, language);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }
      await savePdf(pdf, `${filenameBase}.pdf`);
      return;
    }

    const zip = new JSZip();
    for (let index = 0; index < yearMonths.length; index += 1) {
      onProgress?.(index + 1);
      const canvas = drawMonthExport(yearMonths[index], city, language);
      const blob = await canvasToBlob(canvas, format, format === 'JPG' ? 0.94 : 1);
      const dpiBlob = await changeDpiBlob(blob, 300);
      const month = String(index + 1).padStart(2, '0');
      zip.file(`${filenameBase}-${month}.${format.toLowerCase()}`, dpiBlob);
    }
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    await saveBlob(archive, `${filenameBase}-${format.toLowerCase()}.zip`, 'application/zip');
    return;
  }

  let canvas;
  let datePart;
  if (content === 'lagna-month') {
    const [selectedYear, selectedMonth] = day.date.split('-').map(Number);
    const dates = datesForMonth(selectedYear, selectedMonth);
    const lagnasByDate = calculateLagnasForCivilDates(dates, city);
    canvas = drawLagnaMonthExport(selectedYear, selectedMonth, city, language, lagnasByDate);
    datePart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  } else if (content === 'month') {
    canvas = drawMonthExport(monthData, city, language);
    datePart = `${monthData.year}-${String(monthData.month).padStart(2, '0')}`;
  } else {
    canvas = content === 'hora' ? drawHoraExport(day, city, language)
      : content === 'lagna' ? drawLagnaExport(day, city, language) : drawDayExport(day, city, language);
    datePart = day.date;
  }
  const prefix = content === 'hora' ? 'telugu-hora' : content.startsWith('lagna') ? 'udaya-lagna' : 'telugu-panchangam';
  const filename = `${prefix}-${datePart}.${format.toLowerCase()}`;

  if (format === 'PDF') {
    const isMonth = content === 'month' || content === 'lagna-month';
    const pdf = new jsPDF({ orientation: isMonth ? 'landscape' : 'portrait', unit: 'mm', format: isMonth ? 'a3' : 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    await savePdf(pdf, filename);
    return;
  }

  await saveCanvasImage(canvas, format, filename, format === 'JPG' ? 0.94 : 1, 300);
};
