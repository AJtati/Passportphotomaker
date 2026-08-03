import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Spinner } from 'react-bootstrap';
import { fetchFestivals } from './panchangamApi';
import { bilingual, formatMonth } from './helpers';
import { groupFestivalsByMonth, normalizeFestivals } from './festivalHelpers';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const dateLabel = (date, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  day: 'numeric',
  month: 'short',
  weekday: 'short',
}).format(new Date(`${date}T12:00:00`));

function FestivalCalendar({ year, city, language, onOpenDate }) {
  const phrase = (te, en) => bilingual({ te, en }, language);
  const [festivals, setFestivals] = useState([]);
  const [monthFilter, setMonthFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setFestivals([]);
    fetchFestivals(year, city)
      .then((response) => {
        if (!cancelled) setFestivals(normalizeFestivals(response.data?.festivals || []));
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Unable to load festivals.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, city.lat, city.lng, city.tz]);

  const groups = useMemo(() => groupFestivalsByMonth(festivals), [festivals]);
  const visibleMonths = monthFilter === 'all' ? MONTHS : [Number(monthFilter)];

  return (
    <section className="panchangam-festival-calendar" aria-labelledby="festival-calendar-heading">
      <header className="panchangam-festival-hero">
        <div>
          <span className="panchangam-kicker">{phrase('వార్షిక పండుగల క్యాలెండర్', 'Annual festival calendar')}</span>
          <h2 id="festival-calendar-heading">✦ {phrase(`${year} పండుగలు`, `${year} Festivals`)}</h2>
          <p>{phrase(`${city.name} స్థానిక పంచాంగం ప్రకారం తేదీలు గణించబడతాయి.`, `Dates are calculated from the local Panchangam for ${city.name}.`)}</p>
        </div>
        <Form.Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} aria-label="Filter festivals by month">
          <option value="all">{phrase('అన్ని నెలలు', 'All months')}</option>
          {MONTHS.map((month) => <option key={month} value={month}>{formatMonth(year, month)}</option>)}
        </Form.Select>
      </header>
      <div className="panchangam-festival-location-note">
        <span aria-hidden="true">⌖</span>
        <p><strong>{city.name}</strong><small>{city.tz} · {phrase('స్థానం మారితే పండుగ తేదీలు స్వయంచాలకంగా నవీకరించబడతాయి.', 'Festival dates refresh automatically when the location changes.')}</small></p>
      </div>
      {loading && <div className="panchangam-loading" role="status"><Spinner animation="border" /><span>{phrase('పండుగలు గణిస్తోంది…', 'Calculating festivals…')}</span></div>}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && (
        <div className="panchangam-festival-months">
          {visibleMonths.map((month) => (
            <section key={month} className="panchangam-festival-month-card">
              <header><span>{String(month).padStart(2, '0')}</span><h3>{formatMonth(year, month)}</h3><small>{groups[month]?.length || 0} {phrase('పండుగలు', 'festivals')}</small></header>
              {groups[month]?.length ? groups[month].map((festival) => (
                <button type="button" key={`${festival.date}-${festival.en || festival.te}`} onClick={() => onOpenDate(festival.date)}>
                  <time dateTime={festival.date}>{dateLabel(festival.date, language)}</time>
                  <span><strong>{bilingual(festival, language)}</strong>{festival.description && <small>{bilingual(festival.description, language)}</small>}</span>
                  <b aria-hidden="true">›</b>
                </button>
              )) : <p>{phrase('ఈ నెలకు పండుగలు నమోదు కాలేదు.', 'No festivals are listed for this month.')}</p>}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export default FestivalCalendar;
