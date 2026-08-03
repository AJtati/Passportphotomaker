import React, { useEffect, useMemo, useState } from 'react';
import { calculateNityaYogasForCivilDate } from './nityaYogaCalculator';
import {
  bilingual,
  formatCivilSpecialYogaRange,
  formatLongDate,
  getTimeZoneDetails,
  isoDateInTimezone,
} from './helpers';

const zoneText = (details) => `${details.abbreviation}${details.offset ? ` · ${details.offset}` : ''}`;
const phrase = (language, te, en) => bilingual({ te, en }, language);

function NityaYogaSchedule({ data, city, language }) {
  const [now, setNow] = useState(Date.now());
  const yogas = useMemo(
    () => calculateNityaYogasForCivilDate(data.date, city),
    [city, data.date]
  );
  const isToday = data.date === isoDateInTimezone(city.tz);

  useEffect(() => {
    if (!isToday) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [isToday]);

  const activeYoga = isToday
    ? yogas.find((yoga) => now >= new Date(yoga.start).getTime() && now < new Date(yoga.end).getTime())
    : null;
  const featured = activeYoga || yogas[0];
  if (!featured) return <p className="panchangam-empty-copy">{phrase(language, 'ఈ తేదీకి నిత్య యోగ సమయం లభించలేదు.', 'Nitya Yoga timing is unavailable for this date.')}</p>;

  const featuredRange = formatCivilSpecialYogaRange(featured, city.tz, data.date);
  const timeZone = getTimeZoneDetails(city.tz, featured.start);
  const showZones = yogas.some((yoga) => formatCivilSpecialYogaRange(yoga, city.tz, data.date).zoneChanged);

  return (
    <div className="panchangam-hora panchangam-nitya-yoga">
      <div className="panchangam-hora-date">
        <div>
          <strong>నిత్య యోగం · Nitya Yoga</strong>
          <small>{phrase(language, 'నిరయణ సూర్య–చంద్ర దీర్ఘాంశాల మొత్తంతో లెక్కించే 27 నిత్య యోగాలలో ఒకటి', 'One of 27 daily Yogas from the sidereal Sun–Moon longitude sum')}</small>
          <small>Lahiri / Chitra Paksha · {timeZone.label}</small>
        </div>
        <time dateTime={data.date}>{formatLongDate(data.date)}</time>
      </div>

      <div className="panchangam-current-hora panchangam-current-nitya-yoga">
        <span className="panchangam-current-hora-symbol" aria-hidden="true">☉+</span>
        <div>
          <span className="panchangam-kicker">{activeYoga ? phrase(language, 'ప్రస్తుత నిత్య యోగం', 'Current Nitya Yoga') : phrase(language, 'ఎంచుకున్న తేదీని తాకే మొదటి నిత్య యోగం', 'First Nitya Yoga touching selected date')}</span>
          <h4>{bilingual(featured.name, language)}</h4>
          <p>{phrase(language, `27లో ${featured.number}వ యోగం · నిరంతర ఖగోళ పంచాంగ అంగం`, `Yoga ${featured.number} of 27 · Continuous astronomical Panchanga limb`)}</p>
        </div>
        <time className="panchangam-current-hora-time">
          <strong>
            <span className="panchangam-current-boundary"><small>{phrase(language, 'నుండి', 'From')}{featuredRange.fromDate && ` · ${featuredRange.fromDate}`}</small>{featuredRange.from}</span>
            <span aria-hidden="true">→</span>
            <span className="panchangam-current-boundary"><small>{phrase(language, 'వరకు', 'To')}{featuredRange.toDate && ` · ${featuredRange.toDate}`}</small>{featuredRange.to}</span>
          </strong>
          <small>{phrase(language, 'అధికారిక స్థానిక సమయం', 'Official local time')} · {timeZone.abbreviation}</small>
        </time>
      </div>

      <div className="panchangam-hora-columns is-civil-day panchangam-nitya-yoga-list">
        <section>
          <header>
            <strong>{phrase(language, 'అర్ధరాత్రి నుండి అర్ధరాత్రి వరకు', 'Full calendar day')}</strong>
            <small>{phrase(language, 'ఈ తేదీని తాకే ప్రతి నిత్య యోగం పూర్తి సరిహద్దులు', 'Complete boundaries for every Nitya Yoga touching this date')}</small>
          </header>
          {yogas.map((yoga) => {
            const range = formatCivilSpecialYogaRange(yoga, city.tz, data.date);
            return (
              <div className={`panchangam-special-yoga-row${yoga === activeYoga ? ' is-active' : ''}`} key={`${yoga.key}-${yoga.start}`}>
                <span className="panchangam-special-yoga-row-copy">
                  <strong>{bilingual(yoga.name, language)}</strong>
                  <small>{phrase(language, `27లో ${yoga.number}వ నిత్య యోగం`, `Nitya Yoga ${yoga.number} of 27`)}</small>
                </span>
                <time className="panchangam-hora-range">
                  <span><small>{phrase(language, 'నుండి', 'From')}{range.fromDate && ` · ${range.fromDate}`}</small><strong>{range.from}</strong>{showZones && <small>{zoneText(range.fromZone)}</small>}</span>
                  <span aria-hidden="true">→</span>
                  <span><small>{phrase(language, 'వరకు', 'To')}{range.toDate && ` · ${range.toDate}`}</small><strong>{range.to}</strong>{showZones && <small>{zoneText(range.toZone)}</small>}</span>
                </time>
              </div>
            );
          })}
        </section>
      </div>

      <p className="panchangam-hora-note">{phrase(language, 'నిత్య యోగం సూర్య చంద్రుల నుండి నిరంతరంగా లెక్కించబడుతుంది. శుభాశుభ వ్యాఖ్యానం సంప్రదాయానుసారం మారవచ్చు; తిథి, నక్షత్రం, ఉద్దేశించిన కార్యంతో కలిపి పరిశీలించాలి.', 'Nitya Yoga is calculated continuously from the Sun and Moon. Auspicious interpretation can vary by tradition and should be considered with Tithi, Nakshatra and the intended activity.')}</p>
    </div>
  );
}

export default NityaYogaSchedule;
