import { fetchAnniversaries, fetchFestivals, fetchMuhurtam, resolveCoordinates } from './panchangamApi';

const response = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => data === undefined ? 'error code: 1102' : JSON.stringify({ data }),
});

const city = {
  name: 'Hyderabad, Telangana, India',
  lat: 17.360589,
  lng: 78.4740613,
  tz: 'Asia/Kolkata',
};

describe('Panchangam API fallbacks', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('rebuilds Muhurtam results from stable one-day requests after a range failure', async () => {
    global.fetch.mockImplementation(async (input) => {
      const url = new URL(input);
      const days = Number(url.searchParams.get('days'));
      if (days > 1) return response(503);
      const date = url.searchParams.get('from');
      return response(200, [{ date, start: `${date}T04:00:00.000Z`, end: `${date}T05:00:00.000Z` }]);
    });

    const result = await fetchMuhurtam('2026-07-31', 3, city);

    expect(result.data.map((window) => window.date)).toEqual([
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test('resolves a GPS timezone from coordinates instead of the browser timezone', async () => {
    global.fetch.mockResolvedValue(response(200, [{
      displayName: 'London, England, United Kingdom',
      lat: 51.5074062,
      lng: -0.1276915,
      timezone: 'Europe/London',
    }]));

    const result = await resolveCoordinates(51.5074, -0.1278);

    expect(result).toEqual({
      name: 'London, England, United Kingdom',
      lat: 51.5074062,
      lng: -0.1276915,
      tz: 'Europe/London',
      source: 'gps',
      timezoneSource: 'coordinates',
    });
    expect(global.fetch.mock.calls[0][0]).toContain('/geocode?q=51.5074%2C-0.1278');
  });

  test('requests annual festival dates with the selected coordinates and timezone', async () => {
    global.fetch.mockResolvedValue(response(200, { year: 2026, festivals: [] }));

    await fetchFestivals(2026, city);

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.pathname).toMatch(/\/festivals$/);
    expect(url.searchParams.get('lat')).toBe(String(city.lat));
    expect(url.searchParams.get('lng')).toBe(String(city.lng));
    expect(url.searchParams.get('tz')).toBe(city.tz);
  });

  test('retries each single-year Tithi anniversary request before giving up', async () => {
    const attempts = new Map();
    global.fetch.mockImplementation(async (input) => {
      const url = new URL(input);
      const year = Number(url.searchParams.get('from_year'));
      const attempt = (attempts.get(year) || 0) + 1;
      attempts.set(year, attempt);
      if (attempt === 1) return response(503);
      return response(200, {
        tithiIdentity: { masa: { en: 'Ashadha' }, tithi: { en: 'Dwitiya' } },
        occurrences: [{ year, date: `${year}-08-01` }],
      });
    });

    const result = await fetchAnniversaries('1990-01-01', 2, city);

    expect(result.data.occurrences).toHaveLength(2);
    expect([...attempts.values()]).toEqual([2, 2]);
  });

  test('reconstructs a Tithi anniversary from daily data when one year keeps failing', async () => {
    const currentYear = new Date().getFullYear();
    global.fetch.mockImplementation(async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/reminders/anniversary')) {
        const year = Number(url.searchParams.get('from_year'));
        if (year !== currentYear) return response(503);
        return response(200, {
          tithiIdentity: {
            masaNumber: 10,
            masa: { te: 'పుష్యం', en: 'Pushya' },
            paksha: 'shukla',
            tithiNumber: 4,
            tithi: { te: 'చవితి', en: 'Chaturthi' },
          },
          occurrences: [{ year, date: `${year + 1}-01-12` }],
        });
      }

      const candidate = url.searchParams.get('date');
      const isMatch = candidate === `${currentYear + 2}-01-01`;
      return response(200, {
        date: candidate,
        masa: { te: isMatch ? 'పుష్యం' : 'మార్గశిరం', en: isMatch ? 'Pushya' : 'Margashirsha', number: isMatch ? 10 : 9 },
        paksha: { te: 'శుక్ల పక్షం', en: 'Shukla Paksha', value: 'shukla' },
        tithi: { te: isMatch ? 'చవితి' : 'తదియ', en: isMatch ? 'Chaturthi' : 'Tritiya', number: isMatch ? 4 : 3 },
        samvatsaram: { te: 'ప్లవంగ', en: 'Plavanga' },
      });
    });

    const result = await fetchAnniversaries('1990-01-01', 2, city);

    expect(result.data.occurrences).toHaveLength(2);
    expect(result.data.occurrences[1]).toMatchObject({
      year: currentYear + 1,
      date: `${currentYear + 2}-01-01`,
    });
  });
});
