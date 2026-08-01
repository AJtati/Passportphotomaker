import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { changeDpiBlob } from 'changedpi';
import { saveBlob, saveCanvasImage, savePdf } from '../../utils/fileDownload';
import { HORA_PLANETS } from './calendarDetails';
import {
  bilingual,
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

const header = (ctx, width, title, subtitle, city, reference) => {
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, width, 190);
  ctx.fillStyle = COLORS.saffron;
  ctx.fillRect(0, 0, width, 12);
  drawText(ctx, title, 70, 80, { size: 42, weight: 700, color: COLORS.saffron });
  drawText(ctx, subtitle, 70, 125, { size: 25, color: COLORS.muted });
  drawFittedText(ctx, `Calculated for ${city.name} · ${localTimeText(city, reference)}`, 70, 160, width - 140, { size: 20, minSize: 13, color: COLORS.muted });
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
    day.sunrise
  );

  panel(ctx, 55, 225, 1130, 195, COLORS.pale);
  drawText(ctx, bilingual(day.tithi, language), 90, 295, { size: 38, weight: 700, color: COLORS.saffron });
  drawText(ctx, `${bilingual(day.masa, language)}  •  ${bilingual(day.paksha, language)}`, 90, 345, { size: 25 });
  drawText(ctx, `${bilingual(day.samvatsaram, language)}  •  ${bilingual(day.vara, language)}`, 90, 390, { size: 23, color: COLORS.muted });

  const limbs = [
    ['Tithi', day.tithi],
    ['Nakshatra', day.nakshatra],
    ['Yoga', day.yoga],
    ['Karana', day.karana],
    ['Vara', day.vara],
  ];
  drawText(ctx, 'Panchanga', 65, 485, { size: 28, weight: 700 });
  limbs.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 55 + column * 575;
    const y = 520 + row * 150;
    panel(ctx, x, y, column === 0 ? 550 : 555, 125);
    drawText(ctx, label, x + 25, y + 38, { size: 19, color: COLORS.muted });
    drawText(ctx, bilingual(value, language), x + 25, y + 86, { size: 25, weight: 700 });
    if (value?.endsAt) drawText(ctx, `Until ${formatTime(value.endsAt, city.tz, day.date)}`, x + 25, y + 113, { size: 16, color: COLORS.muted });
  });

  drawText(ctx, 'Sun & Moon', 65, 1015, { size: 28, weight: 700 });
  panel(ctx, 55, 1050, 1130, 130);
  const sky = [
    ['Sunrise', day.sunrise], ['Sunset', day.sunset], ['Moonrise', day.moonrise], ['Moonset', day.moonset],
  ];
  sky.forEach(([label, value], index) => {
    const x = 95 + index * 275;
    drawText(ctx, label, x, 1095, { size: 18, color: COLORS.muted });
    drawText(ctx, formatTime(value, city.tz), x, 1145, { size: 24, weight: 700 });
  });

  drawText(ctx, 'Complete Day Timings', 65, 1235, { size: 28, weight: 700 });
  const timings = [
    ['Rahukalam', formatRange(day.rahukalam, city.tz, day.date)],
    ['Gulika Kalam', formatRange(day.gulikaKalam, city.tz, day.date)],
    ['Yamagandam', formatRange(day.yamagandam, city.tz, day.date)],
    ['Durmuhurtham', formatRanges(day.durmuhurtham, city.tz, false, day.date)],
    ['Varjyam', formatRanges(day.varjyam, city.tz, false, day.date)],
    ['Abhijit Muhurtam', formatRange(day.abhijitMuhurtam, city.tz, day.date)],
    ['Amrita Gadiya', formatRanges(day.amritaGadiya, city.tz, false, day.date)],
  ];
  timings.forEach(([label, value], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 55 + column * 282.5;
    const y = 1270 + row * 116;
    panel(ctx, x, y, 263, 100, index === 0 || label === 'Varjyam' ? '#fff2ec' : COLORS.paper);
    drawText(ctx, label, x + 18, y + 32, { size: 15, color: COLORS.muted });
    drawFittedText(ctx, value, x + 18, y + 72, 227, { size: 18, minSize: 10, weight: 700 });
  });

  drawText(ctx, 'Festivals', 65, 1515, { size: 28, weight: 700 });
  const festivals = day.festivals?.length
    ? day.festivals.map((festival) => bilingual(festival, language)).join('  •  ')
    : 'No festivals listed';
  panel(ctx, 55, 1540, 1130, 95, COLORS.pale);
  ctx.font = '700 23px "Noto Sans Telugu", "Segoe UI", sans-serif';
  drawFittedText(ctx, festivals, 85, 1599, 1065, { size: 23, minSize: 12, weight: 700, color: COLORS.saffron });
  drawFittedText(ctx, `Official local time: ${localTimeText(city, day.sunrise)} · DST/summer-time applied automatically.`, 620, 1690, 1100, { size: 17, minSize: 12, color: COLORS.muted, align: 'center' });
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
  header(ctx, canvas.width, title, formatLongDate(day.date), city, day.sunrise);

  const firstHora = civilHoras[0];
  const firstPlanet = HORA_PLANETS[firstHora.planetKey];
  panel(ctx, 55, 220, 1130, 130, COLORS.pale);
  drawText(ctx, `${firstPlanet.symbol} ${bilingual(firstPlanet.name, language)} ${language === 'en' ? 'at the start of this date' : 'ఈ తేదీ ప్రారంభ హోరా'}`, 85, 270, { size: 27, weight: 700, color: COLORS.saffron });
  drawText(ctx, 'Every Hora touching this calendar date  •  Complete start and end times shown', 85, 318, { size: 21, color: COLORS.muted });

  const splitAt = Math.ceil(civilHoras.length / 2);
  drawText(ctx, 'Beginning of selected date', 65, 412, { size: 25, weight: 700 });
  drawText(ctx, 'Continued through date end', 655, 412, { size: 25, weight: 700 });
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
      drawText(ctx, `From ${range.fromDate ? `${range.fromDate} · ` : ''}${range.from}`, x + 522, y + 25, { size: 14, weight: 700, align: 'right' });
      drawText(ctx, `To ${range.toDate ? `${range.toDate} · ` : ''}${range.to}`, x + 522, y + 43, { size: 14, weight: 700, align: 'right' });
      const quality = planet.tone === 'favorable'
        ? { te: 'శుభప్రదం', en: 'Favourable' }
        : { te: 'కార్యానుసారం', en: 'Activity-specific' };
      drawText(ctx, bilingual(quality, language), x + 522, y + 61, { size: 11, color: planet.tone === 'favorable' ? '#33735d' : COLORS.muted, align: 'right' });
    });
  });

  drawText(ctx, 'Traditional method: daytime and nighttime are each divided into 12 unequal seasonal hours.', canvas.width / 2, 1595, { size: 17, color: COLORS.muted, align: 'center' });
  drawText(ctx, 'Hora is a general traditional guide. Consider Tithi, Nakshatra and the activity for important decisions.', canvas.width / 2, 1630, { size: 16, color: COLORS.muted, align: 'center' });
  drawFittedText(ctx, `Official local time: ${localTimeText(city, day.sunrise)} · DST/summer-time applied automatically.`, canvas.width / 2, 1695, 1100, { size: 17, minSize: 12, color: COLORS.muted, align: 'center' });
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
  const cellHeight = (canvas.height - top - headerHeight - 75) / rows;

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
    ctx.fillStyle = day.isAmavasya ? '#f1ece8' : day.isPurnima ? '#fff6d9' : day.festivals?.length ? '#fff5ee' : COLORS.paper;
    ctx.fillRect(x, y, cellWidth, cellHeight);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
    drawText(ctx, day.gregorianDay, x + 18, y + 41, { size: 31, weight: 700 });
    drawText(ctx, day.moonPhaseEmoji || '', x + cellWidth - 18, y + 39, { size: 25, align: 'right' });
    drawFittedText(ctx, `${bilingual(day.masa, language)} · ${bilingual(day.paksha, language)}`, x + 18, y + 67, cellWidth - 36, { size: 16, minSize: 10, weight: 600, color: COLORS.muted });

    const line = (label, value, lineIndex, color = COLORS.ink, weight = 400) => {
      drawFittedText(ctx, `${label} ${value}`, x + 18, y + 88 + lineIndex * 17, cellWidth - 36, {
        size: 15,
        minSize: 9,
        weight,
        color,
      });
    };
    line(language === 'en' ? 'Tithi' : 'తి', `${bilingual(day.tithi, language)} ${formatShortTime(day.tithi?.endsAt, city.tz, day.date)}`, 0, COLORS.saffron, 700);
    line(language === 'en' ? 'Nakshatra' : 'న', `${bilingual(day.nakshatra, language)} ${formatShortTime(day.nakshatra?.endsAt, city.tz, day.date)}`, 1);
    line(language === 'en' ? 'Yoga' : 'యో', `${bilingual(day.yoga, language)} ${formatShortTime(day.yoga?.endsAt, city.tz, day.date)}`, 2);
    line(language === 'en' ? 'Karana' : 'క', `${bilingual(day.karana, language)} ${formatShortTime(day.karana?.endsAt, city.tz, day.date)}`, 3);
    line(language === 'en' ? 'Varjyam' : 'వ', formatRanges(day.varjyam, city.tz, true, day.date), 4, '#c45124', 600);
    line(language === 'en' ? 'Durmuhurtham' : 'దు', formatRanges(day.durmuhurtham, city.tz, true, day.date), 5, '#c45124', 600);
    line(language === 'en' ? 'Rahukalam' : 'రా', formatShortRange(day.rahukalam, city.tz, day.date), 6);
    line(language === 'en' ? 'Gulika' : 'గు', formatShortRange(day.gulikaKalam, city.tz, day.date), 7);
    line(language === 'en' ? 'Yamagandam' : 'య', formatShortRange(day.yamagandam, city.tz, day.date), 8);
    line(language === 'en' ? 'Abhijit' : 'అ', formatShortRange(day.abhijitMuhurtam, city.tz, day.date), 9, '#33735d', 600);
    line(language === 'en' ? 'Amrita Gadiya' : 'అమృ', formatRanges(day.amritaGadiya, city.tz, true, day.date), 10, '#33735d', 600);
    line(language === 'en' ? 'Sun' : 'సూ', `${formatShortTime(day.sunrise, city.tz)}–${formatShortTime(day.sunset, city.tz)}`, 11);

    if (day.festivals?.length) {
      const festivalText = `✦ ${day.festivals.map((festival) => bilingual(festival, language)).join(' · ')}`;
      ctx.font = '700 13px "Noto Sans Telugu", "Segoe UI", sans-serif';
      wrappedLines(ctx, festivalText, cellWidth - 36).slice(0, 2).forEach((festivalLine, lineIndex) => {
        drawText(ctx, festivalLine, x + 18, y + cellHeight - 30 + lineIndex * 15, { size: 13, weight: 700, color: COLORS.saffron });
      });
    }
  });

  drawFittedText(ctx, `Official local time: ${monthTime} · DST/summer-time applied per date. Tithi, Nakshatra, Yoga and Karana show ending times.`, canvas.width / 2, 2445, canvas.width - 160, { size: 19, minSize: 13, color: COLORS.muted, align: 'center' });
  return canvas;
};

export const downloadPanchangam = async ({ content, format, language, day, monthData, yearMonths, year, city, onProgress }) => {
  await prepareFonts();
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

  const canvas = content === 'month'
    ? drawMonthExport(monthData, city, language)
    : content === 'hora' ? drawHoraExport(day, city, language) : drawDayExport(day, city, language);
  const datePart = content === 'month'
    ? `${monthData.year}-${String(monthData.month).padStart(2, '0')}`
    : day.date;
  const filename = `${content === 'hora' ? 'telugu-hora' : 'telugu-panchangam'}-${datePart}.${format.toLowerCase()}`;

  if (format === 'PDF') {
    const orientation = content === 'month' ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'mm', format: content === 'month' ? 'a3' : 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    await savePdf(pdf, filename);
    return;
  }

  await saveCanvasImage(canvas, format, filename, format === 'JPG' ? 0.94 : 1, 300);
};
