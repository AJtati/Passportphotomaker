import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import {
  bilingual,
  formatCivilSpecialYogaRange,
  formatLongDate,
  getTimeZoneDetails,
  isoDateInTimezone,
  specialYogasForCivilDate,
} from './helpers';

const phrase = (language, te, en) => bilingual({ te, en }, language);
const statusFor = (yoga, now, language) => {
  const start = new Date(yoga.start).getTime();
  const end = new Date(yoga.end).getTime();
  if (now >= start && now < end) return { key: 'active', label: phrase(language, 'ప్రస్తుతం', 'Active now') };
  if (now < start) return { key: 'upcoming', label: phrase(language, 'రాబోయేది', 'Upcoming') };
  return { key: 'complete', label: phrase(language, 'ముగిసింది', 'Completed') };
};

const zoneText = (details) => `${details.abbreviation}${details.offset ? ` · ${details.offset}` : ''}`;

function SpecialYogaSchedule({ data, city, language }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const yogas = data.specialYogas || [];
  const civilYogas = useMemo(
    () => specialYogasForCivilDate(data.previousSpecialYogas, yogas, data.date, city.tz),
    [city.tz, data.date, data.previousSpecialYogas, yogas]
  );
  const isToday = data.date === isoDateInTimezone(city.tz);

  useEffect(() => {
    if (!isToday || !yogas.length) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [isToday, yogas.length]);

  const timeZone = useMemo(
    () => getTimeZoneDetails(city.tz, data.sunrise || `${data.date}T12:00:00Z`),
    [city.tz, data.date, data.sunrise]
  );

  return (
    <div className="panchangam-special-yogas">
      <div className="panchangam-hora-date">
        <div>
          <strong>వార–నక్షత్ర సిద్ధి యోగాలు · Vara–Nakshatra Siddhi Yogas</strong>
          <small>{phrase(language, 'స్థానిక సూర్యోదయం నుండి తదుపరి సూర్యోదయం వరకు లెక్కించబడింది', 'Calculated from local sunrise to the next local sunrise')}</small>
          <small>Lahiri / Chitra Paksha · {timeZone.label}</small>
        </div>
        <time dateTime={data.date}>{formatLongDate(data.date)}</time>
      </div>

      {yogas.length ? (
        <div className="panchangam-special-yoga-list">
          {yogas.map((yoga) => {
            const status = statusFor(yoga, now, language);
            const range = formatCivilSpecialYogaRange(yoga, city.tz, data.date);
            return (
              <article className={`panchangam-special-yoga-card is-${status.key}`} key={`${yoga.key}-${yoga.start}`}>
                <div className="panchangam-special-yoga-copy">
                  <span className="panchangam-special-yoga-status">{status.label}</span>
                  <h4>{bilingual(yoga.name, language)}</h4>
                  <strong className="panchangam-special-yoga-basis">{bilingual(yoga.basis, language)}</strong>
                  <p>{bilingual(yoga.description, language)}</p>
                  {yoga.warning && <p className="panchangam-special-yoga-warning">⚠ {bilingual(yoga.warning, language)}</p>}
                </div>
                <time className="panchangam-special-yoga-time">
                  <span>
                    <small>{phrase(language, 'నుండి', 'From')}{range.fromDate && ` · ${range.fromDate}`}</small>
                    <strong>{range.from}</strong>
                    {range.zoneChanged && <small>{zoneText(range.fromZone)}</small>}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span>
                    <small>{phrase(language, 'వరకు', 'To')}{range.toDate && ` · ${range.toDate}`}</small>
                    <strong>{range.to}</strong>
                    {range.zoneChanged && <small>{zoneText(range.toZone)}</small>}
                  </span>
                </time>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panchangam-special-yoga-empty">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>ఈ పంచాంగ దినానికి విశేష సిద్ధి యోగం లేదు</strong>
            <p>{phrase(language, 'ఈ సూర్యోదయం నుండి తదుపరి సూర్యోదయం వరకు అమృత సిద్ధి, సర్వార్థ సిద్ధి, గురు పుష్య లేదా రవి పుష్య యోగం లేదు.', 'No Amrita Siddhi, Sarvartha Siddhi, Guru Pushya or Ravi Pushya Yoga occurs between this sunrise and the next.')}</p>
          </div>
        </div>
      )}

      <div className="panchangam-hora-actions">
        <p>{phrase(language, `${city.name} తేదీవారీ దృశ్యం. అర్ధరాత్రిని దాటే యోగాల పూర్తి ప్రారంభ, ముగింపు సమయాలు చూపబడతాయి.`, `Date-wise view for ${city.name}. Yogas crossing midnight retain their complete start and end times.`)}</p>
        <Button size="sm" variant="outline-secondary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? phrase(language, 'తేదీవారీ సమయాలు దాచండి', 'Hide date-wise timings') : phrase(language, 'తేదీవారీ సమయాలు చూడండి', 'View date-wise timings')}
        </Button>
      </div>

      {expanded && (
        <div className="panchangam-hora-columns is-civil-day panchangam-special-yoga-day-list">
          <section>
            <header>
              <strong>{phrase(language, 'అర్ధరాత్రి నుండి అర్ధరాత్రి వరకు', 'Full calendar day')}</strong>
              <small>{phrase(language, `${formatLongDate(data.date)} తేదీని తాకే ప్రతి విశేష యోగం`, `Every Special Yoga touching ${formatLongDate(data.date)}`)}</small>
            </header>
            {civilYogas.length ? civilYogas.map((yoga) => {
              const range = formatCivilSpecialYogaRange(yoga, city.tz, data.date);
              return (
                <div className="panchangam-special-yoga-row" key={`date-wise-${yoga.key}-${yoga.start}`}>
                  <span className="panchangam-special-yoga-row-copy">
                    <strong>{bilingual(yoga.name, language)}</strong>
                    <small>{bilingual(yoga.basis, language)}</small>
                  </span>
                  <time className="panchangam-hora-range">
                    <span>
                      <small>{phrase(language, 'నుండి', 'From')}{range.fromDate && ` · ${range.fromDate}`}</small>
                      <strong>{range.from}</strong>
                      {range.zoneChanged && <small>{zoneText(range.fromZone)}</small>}
                    </span>
                    <span aria-hidden="true">→</span>
                    <span>
                      <small>{phrase(language, 'వరకు', 'To')}{range.toDate && ` · ${range.toDate}`}</small>
                      <strong>{range.to}</strong>
                      {range.zoneChanged && <small>{zoneText(range.toZone)}</small>}
                    </span>
                  </time>
                </div>
              );
            }) : (
              <p className="panchangam-special-yoga-day-empty">{phrase(language, 'ఈ క్యాలెండర్ తేదీని మద్దతు ఉన్న విశేష యోగం తాకదు.', 'No supported Special Yoga touches this calendar date.')}</p>
            )}
          </section>
        </div>
      )}

      <p className="panchangam-hora-note">{phrase(language, 'ఇవి నిత్య యోగానికి వేరైన సంప్రదాయ వార–నక్షత్ర సంయోగాలు. ముఖ్య ముహూర్త నిర్ణయాలకు పూర్తి పంచాంగం, ప్రాంతీయ కుటుంబ సంప్రదాయాన్ని పరిశీలించండి.', 'These are traditional Vara–Nakshatra combinations, separate from the daily Nitya Yoga. For important Muhurtam decisions, consider the complete Panchangam and regional family tradition.')}</p>
    </div>
  );
}

export default SpecialYogaSchedule;
