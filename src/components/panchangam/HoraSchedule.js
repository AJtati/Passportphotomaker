import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { HORA_PLANETS } from './calendarDetails';
import {
  bilingual,
  formatCivilHoraRange,
  formatLongDate,
  getTimeZoneDetails,
  horasForCivilDate,
  isoDateInTimezone,
} from './helpers';

const qualityText = (tone, language) => {
  const text = tone === 'favorable'
    ? { te: 'సాధారణంగా శుభప్రదం', en: 'Generally favourable' }
    : { te: 'కార్యానుసారం జాగ్రత్త', en: 'Use according to activity' };
  return language === 'te' ? text.te : language === 'en' ? text.en : `${text.te} · ${text.en}`;
};

const phrase = (language, te, en) => bilingual({ te, en }, language);
const remainingText = (end, now, language) => {
  const minutes = Math.max(1, Math.ceil((new Date(end).getTime() - now) / 60000));
  if (minutes < 60) return phrase(language, `${minutes} నిమిషాలు మిగిలాయి`, `${minutes} min remaining`);
  return phrase(language, `${Math.floor(minutes / 60)} గంటలు ${minutes % 60} నిమిషాలు మిగిలాయి`, `${Math.floor(minutes / 60)} hr ${minutes % 60} min remaining`);
};

const HoraRow = ({ hora, city, language, referenceDate, active }) => {
  const planet = HORA_PLANETS[hora.planetKey];
  const range = formatCivilHoraRange(hora, city.tz, referenceDate);
  return (
    <div className={`panchangam-hora-row is-${planet.tone}${active ? ' is-active' : ''}`}>
      <span className="panchangam-hora-symbol" aria-hidden="true">{planet.symbol}</span>
      <span className="panchangam-hora-name">
        <strong>{bilingual(planet.name, language)}</strong>
        <small>{bilingual(planet.guidance, language)}</small>
      </span>
      <time className="panchangam-hora-range">
        <span><small>{phrase(language, 'నుండి', 'From')}{range.fromDate && ` · ${range.fromDate}`}</small><strong>{range.from}</strong></span>
        <span aria-hidden="true">→</span>
        <span><small>{phrase(language, 'వరకు', 'To')}{range.toDate && ` · ${range.toDate}`}</small><strong>{range.to}</strong></span>
      </time>
    </div>
  );
};

function HoraSchedule({ data, city, language }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const isToday = data.date === isoDateInTimezone(city.tz);
  const civilHoras = useMemo(
    () => horasForCivilDate(data.previousHoras, data.horas, data.date, city.tz),
    [city.tz, data.date, data.horas, data.previousHoras]
  );

  useEffect(() => {
    if (!isToday) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [isToday]);

  const currentHora = useMemo(() => {
    if (!isToday) return null;
    return civilHoras.find((hora) => {
      const start = new Date(hora.start).getTime();
      const end = new Date(hora.end).getTime();
      return now >= start && now < end;
    }) || null;
  }, [civilHoras, isToday, now]);

  if (!data.horas?.length) {
    return <p className="panchangam-empty-copy">{phrase(language, 'ఈ స్థానానికి పూర్తి సూర్య సమయాలు అందకపోవడంతో హోరా సమయాలు లభించలేదు.', 'Hora timings are unavailable because complete solar times were not returned for this location.')}</p>;
  }

  const featured = currentHora || civilHoras[0];
  const featuredPlanet = HORA_PLANETS[featured.planetKey];
  const featuredRange = formatCivilHoraRange(featured, city.tz, data.date);
  const timeZoneDetails = getTimeZoneDetails(city.tz, data.sunrise || featured.start);
  const horaLabel = language === 'en' ? 'Hora' : language === 'te' ? 'హోరా' : 'హోరా · Hora';

  return (
    <div className="panchangam-hora">
      <div className="panchangam-hora-date">
        <div>
          <strong>హోరా సమయాలు · Hora Timings</strong>
          <small>{phrase(language, 'ఈ క్యాలెండర్ తేదీని తాకే పూర్తి హోరా సమయాలు', 'Horas touching this calendar date · Complete times')}</small>
          <small>{phrase(language, 'అధికారిక స్థానిక సమయం', 'Official local time')} · {timeZoneDetails.label}</small>
        </div>
        <time dateTime={data.date}>{formatLongDate(data.date)}</time>
      </div>
      <div className={`panchangam-current-hora is-${featuredPlanet.tone}`}>
        <span className="panchangam-current-hora-symbol" aria-hidden="true">{featuredPlanet.symbol}</span>
        <div>
          <span className="panchangam-kicker">
            {currentHora ? phrase(language, 'ప్రస్తుత హోరా', 'Current Hora') : phrase(language, 'ఎంచుకున్న తేదీ మొదటి హోరా', 'First Hora of selected date')}
          </span>
          <h4>{bilingual(featuredPlanet.name, language)} · {horaLabel}</h4>
          <p>{bilingual(featuredPlanet.guidance, language)}</p>
        </div>
        <div className="panchangam-current-hora-time">
          <strong>
            <span className="panchangam-current-boundary"><small>{phrase(language, 'నుండి', 'From')}{featuredRange.fromDate && ` · ${featuredRange.fromDate}`}</small>{featuredRange.from}</span>
            <span aria-hidden="true">→</span>
            <span className="panchangam-current-boundary"><small>{phrase(language, 'వరకు', 'To')}{featuredRange.toDate && ` · ${featuredRange.toDate}`}</small>{featuredRange.to}</span>
          </strong>
          <small>{currentHora ? remainingText(featured.end, now, language) : qualityText(featuredPlanet.tone, language)}</small>
        </div>
      </div>

      <div className="panchangam-hora-actions">
        <p>{phrase(language, `${city.name} తేదీవారీ దృశ్యం. గణనలు స్థానిక సూర్యోదయం, సూర్యాస్తమయంపైనే ఆధారపడతాయి.`, `Date-wise view for ${city.name}. Calculations remain based on local sunrise and sunset.`)}</p>
        <Button size="sm" variant="outline-secondary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? phrase(language, 'తేదీవారీ సమయాలు దాచండి', 'Hide date-wise timings') : phrase(language, 'తేదీవారీ సమయాలు చూడండి', 'View date-wise timings')}
        </Button>
      </div>

      {expanded && (
        <div className="panchangam-hora-columns is-civil-day">
          <section>
            <header><strong>{phrase(language, 'అర్ధరాత్రి నుండి అర్ధరాత్రి వరకు', 'Full calendar day')}</strong><small>{phrase(language, 'సరిహద్దు హోరాల పూర్తి సమయాలు చూపబడతాయి', 'Boundary Horas include their complete times')}</small></header>
            {civilHoras.map((hora) => <HoraRow key={`${hora.start}-${hora.planetKey}`} hora={hora} city={city} language={language} referenceDate={data.date} active={hora === currentHora} />)}
          </section>
        </div>
      )}

      <p className="panchangam-hora-note">{phrase(language, 'హోరా అనుకూలత సంప్రదాయ సాధారణ మార్గదర్శకం. ముఖ్య నిర్ణయాలకు తిథి, నక్షత్రం, కార్య స్వభావాన్ని కూడా పరిశీలించండి.', 'Hora suitability is a traditional general guide. Consider Tithi, Nakshatra and the nature of the activity for important decisions.')}</p>
    </div>
  );
}

export default HoraSchedule;
