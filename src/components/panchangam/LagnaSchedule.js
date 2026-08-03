import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import {
  bilingual,
  formatCivilLagnaRange,
  formatLongDate,
  getTimeZoneDetails,
  isoDateInTimezone,
} from './helpers';

const phrase = (language, te, en) => bilingual({ te, en }, language);
const remainingText = (end, now, language) => {
  const minutes = Math.max(1, Math.ceil((new Date(end).getTime() - now) / 60000));
  if (minutes < 60) return phrase(language, `${minutes} నిమిషాలు మిగిలాయి`, `${minutes} min remaining`);
  return phrase(language, `${Math.floor(minutes / 60)} గంటలు ${minutes % 60} నిమిషాలు మిగిలాయి`, `${Math.floor(minutes / 60)} hr ${minutes % 60} min remaining`);
};

const zoneText = (details) => `${details.abbreviation}${details.offset ? ` · ${details.offset}` : ''}`;

const natureLabel = (nature, language) => `${language === 'te' ? 'రాశి స్వభావం' : 'Rashi nature'}: ${bilingual(nature, language)}`;

const LagnaRow = ({ lagna, city, language, referenceDate, active, showZones }) => {
  const range = formatCivilLagnaRange(lagna, city.tz, referenceDate);
  return (
    <div className={`panchangam-hora-row panchangam-lagna-row${active ? ' is-active' : ''}`}>
      <span className="panchangam-hora-symbol" aria-hidden="true">{lagna.symbol}</span>
      <span className="panchangam-hora-name">
        <strong>{bilingual(lagna.name, language)}</strong>
        <small>{natureLabel(lagna.nature, language)}</small>
        <small>{language === 'te' ? 'లగ్నాధిపతి' : 'Lagna lord'}: {bilingual(lagna.lord, language)}</small>
      </span>
      <time className="panchangam-hora-range">
        <span>
          <small>{phrase(language, 'నుండి', 'From')}{range.fromDate && ` · ${range.fromDate}`}</small>
          <strong>{range.from}</strong>
          {showZones && <small>{zoneText(range.fromZone)}</small>}
        </span>
        <span aria-hidden="true">→</span>
        <span>
          <small>{phrase(language, 'వరకు', 'To')}{range.toDate && ` · ${range.toDate}`}</small>
          <strong>{range.to}</strong>
          {showZones && <small>{zoneText(range.toZone)}</small>}
        </span>
      </time>
    </div>
  );
};

function LagnaSchedule({ data, city, language }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lagnas = data.lagnas || [];
  const isToday = data.date === isoDateInTimezone(city.tz);

  useEffect(() => {
    if (!isToday) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [isToday]);

  const currentLagna = useMemo(() => {
    if (!isToday) return null;
    return lagnas.find((lagna) => now >= new Date(lagna.start).getTime() && now < new Date(lagna.end).getTime()) || null;
  }, [isToday, lagnas, now]);

  if (!lagnas.length) {
    return <p className="panchangam-empty-copy">{phrase(language, 'ఈ తేదీ లేదా స్థానానికి లగ్న సమయాలు లభించలేదు.', 'Lagna timings are unavailable for this date or location.')}</p>;
  }

  const featured = currentLagna || lagnas[0];
  const featuredIndex = lagnas.indexOf(featured);
  const nextLagna = lagnas[featuredIndex + 1];
  const featuredRange = formatCivilLagnaRange(featured, city.tz, data.date);
  const timeZoneDetails = getTimeZoneDetails(city.tz, data.sunrise || featured.start);
  const showBoundaryZones = lagnas.some((lagna) => formatCivilLagnaRange(lagna, city.tz, data.date).zoneChanged);

  return (
    <div className="panchangam-hora panchangam-lagna">
      <div className="panchangam-hora-date">
        <div>
          <strong>ఉదయ లగ్నం · Udaya Lagna</strong>
          <small>{phrase(language, 'ఈ క్యాలెండర్ తేదీని తాకే పూర్తి లగ్న సమయాలు', 'Lagnas touching this calendar date · Complete times')}</small>
          <small>Lahiri / Chitra Paksha · {timeZoneDetails.label}</small>
        </div>
        <time dateTime={data.date}>{formatLongDate(data.date)}</time>
      </div>

      <div className="panchangam-current-hora panchangam-current-lagna">
        <span className="panchangam-current-hora-symbol" aria-hidden="true">{featured.symbol}</span>
        <div>
          <span className="panchangam-kicker">{currentLagna ? phrase(language, 'ప్రస్తుత లగ్నం', 'Current Lagna') : phrase(language, 'ఎంచుకున్న తేదీని తాకే మొదటి లగ్నం', 'First Lagna touching selected date')}</span>
          <h4>{bilingual(featured.name, language)} · {language === 'te' ? 'లగ్నం' : 'Lagna'}</h4>
          <span className="panchangam-lagna-nature">{natureLabel(featured.nature, language)}</span>
          <p>{language === 'te' ? 'లగ్నాధిపతి' : 'Lagna lord'}: {bilingual(featured.lord, language)}</p>
          {nextLagna && <p>{phrase(language, 'తదుపరి', 'Next')}: {bilingual(nextLagna.name, language)} · {formatCivilLagnaRange(nextLagna, city.tz, data.date).from}</p>}
        </div>
        <div className="panchangam-current-hora-time">
          <strong>
            <span className="panchangam-current-boundary"><small>{phrase(language, 'నుండి', 'From')}{featuredRange.fromDate && ` · ${featuredRange.fromDate}`}</small>{featuredRange.from}</span>
            <span aria-hidden="true">→</span>
            <span className="panchangam-current-boundary"><small>{phrase(language, 'వరకు', 'To')}{featuredRange.toDate && ` · ${featuredRange.toDate}`}</small>{featuredRange.to}</span>
          </strong>
          <small>{currentLagna ? remainingText(featured.end, now, language) : `${phrase(language, 'అధికారిక స్థానిక సమయం', 'Official local time')} · ${timeZoneDetails.abbreviation}`}</small>
        </div>
      </div>

      <div className="panchangam-hora-actions">
        <p>{phrase(language, `${city.name} క్యాలెండర్-రోజు దృశ్యం. సరిహద్దు లగ్నాల పూర్తి ప్రారంభ, ముగింపు సమయాలు ఉంటాయి.`, `Calendar-day view for ${city.name}. Boundary Lagnas retain their complete start and end times.`)}</p>
        <Button size="sm" variant="outline-secondary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? phrase(language, 'తేదీవారీ సమయాలు దాచండి', 'Hide date-wise timings') : phrase(language, 'పూర్తి తేదీవారీ సమయాలు చూడండి', 'View complete date-wise timings')}
        </Button>
      </div>

      {expanded && (
        <div className="panchangam-hora-columns is-civil-day">
          <section>
            <header>
              <strong>{phrase(language, 'అర్ధరాత్రి నుండి అర్ధరాత్రి వరకు', 'Full calendar day')}</strong>
              <small>{showBoundaryZones ? phrase(language, 'DST సరిహద్దు · ప్రతి సమయానికి ఆఫ్‌సెట్ చూపబడింది', 'DST boundary · Offsets shown per time') : phrase(language, 'పూర్తి సరిహద్దు సమయాలు', 'Complete boundary times')}</small>
            </header>
            {lagnas.map((lagna) => (
              <LagnaRow
                key={`${lagna.start}-${lagna.key}`}
                lagna={lagna}
                city={city}
                language={language}
                referenceDate={data.date}
                active={lagna === currentLagna}
                showZones={showBoundaryZones}
              />
            ))}
          </section>
        </div>
      )}

      <p className="panchangam-hora-note">{phrase(language, 'లగ్నం సంప్రదాయ ఖగోళ సమయం. ముఖ్య ముహూర్త నిర్ణయాలకు లగ్న శుద్ధి, పూర్తి పంచాంగాన్ని ఉపయోగించండి.', 'Lagna is a traditional astronomical timing. Use Lagna Shuddhi and the complete Panchangam for important Muhurtam decisions.')}</p>
    </div>
  );
}

export default LagnaSchedule;
