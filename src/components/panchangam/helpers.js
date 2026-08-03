export const DEFAULT_CITY = {
  name: 'Hyderabad, Telangana, India',
  lat: 17.360589,
  lng: 78.4740613,
  tz: 'Asia/Kolkata',
};

export const CITY_STORAGE_KEY = 'panchangam-selected-city';
export const RECENT_CITIES_KEY = 'panchangam-recent-cities';

export const isoDateInTimezone = (timezone, date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

export const parseIsoDate = (date) => new Date(`${date}T12:00:00`);

export const monthFromDate = (date) => {
  const parsed = parseIsoDate(date);
  return { year: parsed.getFullYear(), month: parsed.getMonth() + 1 };
};

export const shiftMonth = (year, month, amount) => {
  const date = new Date(year, month - 1 + amount, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

export const replaceYear = (date, year) => {
  const [, , month, day] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  if (!month || !day) return date;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${year}-${month}-${String(Math.min(Number(day), lastDay)).padStart(2, '0')}`;
};

export const formatLongDate = (date, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseIsoDate(date));

export const formatMonth = (year, month) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  );

const timeZoneName = (timezone, value, style, locale = 'en-US') =>
  new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: style })
    .formatToParts(new Date(value))
    .find((part) => part.type === 'timeZoneName')?.value || '';

export const getTimeZoneDetails = (timezone, value = new Date()) => {
  try {
    const longName = timeZoneName(timezone, value, 'long');
    const shortUS = timeZoneName(timezone, value, 'short');
    const shortGB = timeZoneName(timezone, value, 'short', 'en-GB');
    let rawOffset = shortUS;
    try {
      rawOffset = timeZoneName(timezone, value, 'shortOffset') || shortUS;
    } catch {
      // Older browsers still show the official timezone name and abbreviation.
    }
    const offset = rawOffset.replace(/^GMT/, 'UTC');
    const namedShort = [shortUS, shortGB].find((name) => name && !/^(GMT|UTC)[+-]/.test(name));
    const initials = longName.split(/\s+/).map((word) => word[0]).join('').toUpperCase();
    const abbreviation = namedShort || (/Time$/.test(longName) && initials.length <= 5 ? initials : '');
    const nameWithAbbreviation = abbreviation && abbreviation !== longName
      ? `${longName} (${abbreviation})`
      : longName;
    return {
      abbreviation: abbreviation || offset,
      offset,
      label: `${nameWithAbbreviation || 'Official local time'} · ${offset}`,
    };
  } catch {
    return { abbreviation: timezone, offset: '', label: `Official local time · ${timezone}` };
  }
};

export const bilingual = (value, language = 'both') => {
  if (!value) return '—';
  if (language === 'te') return value.te || value.en || '—';
  if (language === 'en') return value.en || value.te || '—';
  if (value.te && value.en && value.te !== value.en) return `${value.te} · ${value.en}`;
  return value.te || value.en || '—';
};

const dateSuffix = (value, timezone, referenceDate) => {
  if (!referenceDate) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = `${values.year}-${values.month}-${values.day}`;
  if (localDate > referenceDate) return '+';
  if (localDate < referenceDate) return '−';
  return '';
};

export const formatTime = (value, timezone, referenceDate) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${time}${dateSuffix(value, timezone, referenceDate)}`;
};

export const formatRange = (range, timezone, referenceDate) =>
  range ? `${formatTime(range.start, timezone, referenceDate)} – ${formatTime(range.end, timezone, referenceDate)}` : '—';

export const formatShortTime = (value, timezone, referenceDate) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${time}${dateSuffix(value, timezone, referenceDate)}`;
};

export const formatShortRange = (range, timezone, referenceDate) =>
  range ? `${formatShortTime(range.start, timezone, referenceDate)}–${formatShortTime(range.end, timezone, referenceDate)}` : '—';

const dateForInstant = (value, timezone) => isoDateInTimezone(timezone, new Date(value));

export const horasForCivilDate = (previousHoras = [], horas = [], date, timezone) =>
  [...previousHoras, ...horas]
    .filter((hora) => {
      const start = new Date(hora.start).getTime();
      const end = new Date(hora.end).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return false;
      return dateForInstant(start, timezone) <= date && dateForInstant(end - 1, timezone) >= date;
    })
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());

export const specialYogasForCivilDate = (previousYogas = [], yogas = [], date, timezone) => {
  const seen = new Set();
  return [...previousYogas, ...yogas]
    .filter((yoga) => {
      const start = new Date(yoga.start).getTime();
      const end = new Date(yoga.end).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return false;
      return dateForInstant(start, timezone) <= date && dateForInstant(end - 1, timezone) >= date;
    })
    .filter((yoga) => {
      const identity = `${yoga.key}:${yoga.start}:${yoga.end}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
};

const formatHoraClock = (value, timezone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));

const formatHoraDate = (value, timezone) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));

const roundedMinute = (value) => new Date(Math.round(new Date(value).getTime() / 60000) * 60000);

const formatCivilRange = (range, timezone, date, roundToMinute = false) => {
  const start = roundToMinute ? roundedMinute(range.start) : new Date(range.start);
  const end = roundToMinute ? roundedMinute(range.end) : new Date(range.end);
  return {
    from: formatHoraClock(start, timezone),
    to: formatHoraClock(end, timezone),
    fromDate: dateForInstant(start, timezone) === date ? '' : formatHoraDate(start, timezone),
    toDate: dateForInstant(end, timezone) === date ? '' : formatHoraDate(end, timezone),
  };
};

export const formatCivilHoraRange = (hora, timezone, date) =>
  formatCivilRange(hora, timezone, date);

export const formatCivilLagnaRange = (lagna, timezone, date) => {
  const range = formatCivilRange(lagna, timezone, date, true);
  const fromZone = getTimeZoneDetails(timezone, lagna.start);
  const toZone = getTimeZoneDetails(timezone, lagna.end);
  return {
    ...range,
    fromZone,
    toZone,
    zoneChanged: fromZone.offset !== toZone.offset,
  };
};

export const formatCivilSpecialYogaRange = (yoga, timezone, date) => {
  const range = formatCivilRange(yoga, timezone, date, true);
  const fromZone = getTimeZoneDetails(timezone, yoga.start);
  const toZone = getTimeZoneDetails(timezone, yoga.end);
  return {
    ...range,
    fromZone,
    toZone,
    zoneChanged: fromZone.offset !== toZone.offset,
  };
};

export const formatRanges = (ranges, timezone, short = false, referenceDate) => {
  if (!Array.isArray(ranges) || ranges.length === 0) return '—';
  const formatter = short ? formatShortRange : formatRange;
  return ranges.map((range) => formatter(range, timezone, referenceDate)).join(' · ');
};

export const readStoredCity = () => {
  try {
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
};

export const storeCity = (city) => {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
    const recent = JSON.parse(localStorage.getItem(RECENT_CITIES_KEY) || '[]');
    const next = [city, ...recent.filter((item) => item.name !== city.name)].slice(0, 4);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(next));
  } catch {
    // The selected city still works for the current session.
  }
};

export const readRecentCities = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_CITIES_KEY) || '[]');
  } catch {
    return [];
  }
};
