import { calculateHoras, enrichPanchangamDays, moonEmoji } from './calendarDetails';

const API_BASE = 'https://telugupanchangam.app/api';
const CACHE_PREFIX = 'passport-utility-panchangam-cache:';
const DETAIL_CACHE_DAYS = 30;

const readCache = (url) => {
  try {
    const value = localStorage.getItem(`${CACHE_PREFIX}${url}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeCache = (url, data) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${url}`, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Cache failures should never prevent calendar use.
  }
};

const request = async (path, params, { cache = true, maxAge = 0 } = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).reduce((result, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') result[key] = String(value);
      return result;
    }, {})
  );
  const url = `${API_BASE}${path}?${query}`;
  const stored = cache ? readCache(url) : null;
  if (stored && maxAge > 0 && Date.now() - stored.savedAt < maxAge) {
    return { data: stored.data, cached: true, computedAt: new Date(stored.savedAt).toISOString() };
  }

  try {
    const response = await fetch(url);
    const responseText = await response.text();
    let body;
    try {
      body = JSON.parse(responseText);
    } catch {
      throw new Error(response.ok ? 'The Panchangam service returned an invalid response.' : `Panchangam service unavailable (${response.status}).`);
    }
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    if (cache) writeCache(url, body.data);
    return { data: body.data, cached: false, computedAt: body.computedAt };
  } catch (error) {
    if (stored) return { data: stored.data, cached: true, computedAt: new Date(stored.savedAt).toISOString() };
    throw error;
  }
};

const locationParams = (city) => ({ lat: city.lat, lng: city.lng, tz: city.tz });
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const withRetries = async (loader, attempts = 3, baseDelay = 250) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await pause(baseDelay * (attempt + 1));
    }
  }
  throw lastError;
};

const addIsoDays = (date, amount) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
};

const lunarIdentityFromDay = (day) => ({
  masaNumber: day.masa.number,
  masa: day.masa,
  paksha: day.paksha.value,
  tithiNumber: day.tithi.number,
  tithi: day.tithi,
  samvatsaram: day.samvatsaram,
  description: `${day.masa.en} ${day.paksha.en} ${day.tithi.en}`,
});

const matchesLunarIdentity = (day, identity) =>
  day.masa?.number === identity.masaNumber
  && day.paksha?.value === identity.paksha
  && day.tithi?.number === identity.tithiNumber;

const searchAnniversaryDates = async (dates, identity, city) => {
  for (let start = 0; start < dates.length; start += 4) {
    const batch = dates.slice(start, start + 4);
    const responses = await Promise.all(batch.map((candidate) => withRetries(() => fetchDay(candidate, city))));
    const match = responses.map((response) => response.data).find((day) => matchesLunarIdentity(day, identity));
    if (match) return match;
  }
  return null;
};

const anniversarySearchRanges = (originalDate, targetYear, previousOccurrence) => {
  if (previousOccurrence?.date) {
    const start = addIsoDays(previousOccurrence.date, 339);
    return [Array.from({ length: 61 }, (_, index) => addIsoDays(start, index))];
  }
  const monthDay = originalDate.slice(4);
  return [targetYear, targetYear + 1].map((year) => {
    const start = addIsoDays(`${year}${monthDay}`, -50);
    return Array.from({ length: 101 }, (_, index) => addIsoDays(start, index));
  });
};

const fallbackAnniversary = async (originalDate, targetYear, previousOccurrence, identity, city) => {
  const ranges = anniversarySearchRanges(originalDate, targetYear, previousOccurrence);
  for (const dates of ranges) {
    const day = await searchAnniversaryDates(dates, identity, city);
    if (day) {
      return {
        year: targetYear,
        date: day.date,
        teluguFormatted: `${day.masa.te} ${day.paksha.te} ${day.tithi.te}`,
        samvatsaram: day.samvatsaram,
        isCurrentYear: targetYear === new Date().getFullYear(),
      };
    }
  }
  return null;
};

export const fetchDay = (date, city) =>
  request('/panchangam', { date, ...locationParams(city) }, { maxAge: DETAIL_CACHE_DAYS * 24 * 60 * 60 * 1000 });

const monthDates = (year, month) => {
  const count = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: count }, (_, index) =>
    `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  );
};

const loadDetailedDates = async (dates, city, onProgress) => {
  const responses = [];
  for (let start = 0; start < dates.length; start += 4) {
    const batch = dates.slice(start, start + 4);
    const results = await Promise.all(batch.map((date) => withRetries(() => fetchDay(date, city))));
    responses.push(...results);
    onProgress?.(Math.min(start + batch.length, dates.length), dates.length);
  }
  return responses;
};

export const fetchDetailedDay = async (date, city) => {
  const dates = Array.from({ length: 5 }, (_, index) => addIsoDays(date, index - 2));
  const responses = await loadDetailedDates(dates, city);
  const days = responses.map((response) => response.data);
  const selectedIndex = days.findIndex((day) => day.date === date);
  const selectedDay = enrichPanchangamDays(days, [date], city.tz, { includeHoras: true })[0] || responses[2].data;
  return {
    data: {
      ...selectedDay,
      previousHoras: selectedIndex > 0 ? calculateHoras(days[selectedIndex - 1], days[selectedIndex]) : [],
    },
    cached: responses.every((response) => response.cached),
    computedAt: responses[2].computedAt,
  };
};

export const fetchDetailedMonth = async (year, month, city, onProgress) => {
  const cacheKey = `detailed-month-v1:${year}:${month}:${city.lat}:${city.lng}:${city.tz}`;
  const saved = readCache(cacheKey);
  const maxAge = DETAIL_CACHE_DAYS * 24 * 60 * 60 * 1000;
  if (saved && Date.now() - saved.savedAt < maxAge) {
    onProgress?.(1, 1);
    return { data: saved.data, cached: true, computedAt: new Date(saved.savedAt).toISOString() };
  }

  const targetDates = monthDates(year, month);
  const dates = [addIsoDays(targetDates[0], -2), addIsoDays(targetDates[0], -1), ...targetDates,
    addIsoDays(targetDates[targetDates.length - 1], 1), addIsoDays(targetDates[targetDates.length - 1], 2)];
  const responses = await loadDetailedDates(dates, city, onProgress);
  const fullDays = responses.map((response) => response.data);
  const days = enrichPanchangamDays(fullDays, targetDates, city.tz);
  const firstDay = days[0];
  const data = {
    year: Number(year),
    month: Number(month),
    samvatsaram: firstDay.samvatsaram,
    masa: firstDay.masa,
    days,
  };
  writeCache(cacheKey, data);
  return {
    data,
    cached: responses.every((response) => response.cached),
    computedAt: responses[0]?.computedAt,
  };
};

export const fetchMonth = async (year, month, city) => {
  const fallbackKey = `month-fallback:${year}:${month}:${city.lat}:${city.lng}:${city.tz}`;
  const saved = readCache(fallbackKey);
  if (saved && Date.now() - saved.savedAt < 30 * 24 * 60 * 60 * 1000) {
    return { data: saved.data, cached: true, computedAt: new Date(saved.savedAt).toISOString() };
  }

  try {
    return await request('/panchangam/month', { year, month, ...locationParams(city) });
  } catch {
    // Some large months can exceed the upstream edge CPU budget. Individual
    // days are inexpensive, so rebuild the month from those stable endpoints.
    const dates = monthDates(year, month);
    const dayResponses = [];
    for (let start = 0; start < dates.length; start += 4) {
      const batch = dates.slice(start, start + 4);
      const results = await Promise.all(batch.map((date) => withRetries(() => fetchDay(date, city))));
      dayResponses.push(...results);
    }
    const dayValues = dayResponses.map((response) => response.data);
    const firstDay = dayValues[0];
    const data = {
      year: Number(year),
      month: Number(month),
      samvatsaram: firstDay.samvatsaram,
      masa: firstDay.masa,
      days: dayValues.map((day, index) => ({
        date: day.date,
        gregorianDay: index + 1,
        vara: day.vara,
        tithi: day.tithi,
        nakshatra: day.nakshatra,
        paksha: day.paksha.value,
        moonPhaseEmoji: moonEmoji(day.moonPhase.phase),
        moonPhase: day.moonPhase,
        festivals: day.festivals,
        isEkadashi: day.tithi.number === 11 || day.tithi.number === 26,
        isAmavasya: day.tithi.number === 30,
        isPurnima: day.tithi.number === 15,
      })),
    };
    writeCache(fallbackKey, data);
    return { data, cached: false, computedAt: new Date().toISOString() };
  }
};

export const fetchYear = async (year, city, onProgress) => {
  const responses = [];
  for (let month = 1; month <= 12; month += 1) {
    responses.push(await fetchDetailedMonth(year, month, city, (completed, total) =>
      onProgress?.(month, completed, total)
    ));
  }
  return {
    data: responses.map((response) => response.data),
    cached: responses.every((response) => response.cached),
    computedAt: responses[0]?.computedAt,
  };
};

export const searchCities = (query) => request('/geocode', { q: query }, { cache: false });

export const fetchFestivals = async (year, city) => {
  try {
    return await request('/festivals', { year, ...locationParams(city) });
  } catch {
    // The upstream annual endpoint can exceed its edge CPU limit. Month requests
    // are smaller and provide the same festival records, so use them as fallback.
    const months = [];
    for (let month = 1; month <= 12; month += 1) {
      months.push(await fetchMonth(year, month, city));
    }
    const seen = new Set();
    const festivals = months.flatMap(({ data }) =>
      data.days.flatMap((day) => (day.festivals || []).map((festival) => ({ ...festival, date: day.date })))
    ).filter((festival) => {
      const key = `${festival.date}:${festival.en || festival.te}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { data: { year: Number(year), count: festivals.length, festivals }, cached: months.every((month) => month.cached) };
  }
};

export const fetchMuhurtam = async (from, days, city) => {
  const dayCount = Number(days);
  const load = (date, count) => request('/muhurtam', { from: date, days: count, ...locationParams(city) });
  if (dayCount === 1) return withRetries(() => load(from, 1));

  try {
    return await load(from, dayCount);
  } catch {
    // Multi-day calculations can exceed the upstream edge CPU budget. Smaller
    // one-day calculations are stable and can be merged into the same response.
    const responses = [];
    for (let offset = 0; offset < dayCount; offset += 1) {
      responses.push(await withRetries(() => load(addIsoDays(from, offset), 1)));
    }
    return {
      data: responses.flatMap((response) => Array.isArray(response.data) ? response.data : response.data?.windows || []),
      cached: responses.every((response) => response.cached),
      computedAt: responses[0]?.computedAt,
    };
  }
};

export const fetchNakshatra = (date, time, city) =>
  request('/nakshatra', {
    date,
    time,
    ...locationParams(city),
    today_lat: city.lat,
    today_lng: city.lng,
    today_tz: city.tz,
  });

export const fetchAnniversaries = async (date, years, city) => {
  const currentYear = new Date().getFullYear();
  const occurrences = [];
  let identity;
  let cached = true;
  for (let offset = 0; offset < years; offset += 1) {
    const targetYear = currentYear + offset;
    try {
      const response = await withRetries(() => request('/reminders/anniversary', {
        date,
        origin_lat: city.lat,
        origin_lng: city.lng,
        origin_tz: city.tz,
        ...locationParams(city),
        from_year: targetYear,
        to_year: targetYear,
      }));
      identity = identity || response.data.tithiIdentity;
      occurrences.push(...(response.data.occurrences || []));
      cached = cached && response.cached;
    } catch (error) {
      if (!identity) {
        const originalDay = await withRetries(() => fetchDay(date, city));
        identity = lunarIdentityFromDay(originalDay.data);
      }
      const occurrence = await fallbackAnniversary(date, targetYear, occurrences[occurrences.length - 1], identity, city);
      if (!occurrence) throw error;
      occurrences.push(occurrence);
      cached = false;
    }
  }
  return {
    data: {
      originalDate: date,
      tithiIdentity: identity,
      occurrences,
    },
    cached,
  };
};
