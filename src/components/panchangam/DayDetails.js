import React from 'react';
import HoraSchedule from './HoraSchedule';
import { bilingual, formatLongDate, formatRange, formatRanges, formatTime } from './helpers';

const DetailCard = ({ label, value, meta, highlight }) => (
  <div className={`panchangam-detail-card${highlight ? ' is-highlight' : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {meta && <small>{meta}</small>}
  </div>
);

function DayDetails({ data, city, language, compact = false }) {
  if (!data) return null;
  const tz = city.tz;
  const panchanga = [
    ['Tithi', data.tithi],
    ['Nakshatra', data.nakshatra],
    ['Yoga', data.yoga],
    ['Karana', data.karana],
    ['Vara', data.vara],
  ];

  return (
    <article className={`panchangam-day-details${compact ? ' is-compact' : ''}`}>
      <header className="panchangam-day-hero">
        <div>
          <span className="panchangam-kicker">{formatLongDate(data.date)}</span>
          <h2>{bilingual(data.tithi, language)}</h2>
          <p>{bilingual(data.masa, language)} · {bilingual(data.paksha, language)}</p>
        </div>
        <div className="panchangam-moon" aria-label={bilingual(data.moonPhase, language)}>
          <span aria-hidden="true">◐</span>
          <strong>{Math.round(data.moonPhase?.illuminationPercent || 0)}%</strong>
          <small>{bilingual(data.moonPhase, language)}</small>
        </div>
      </header>

      <div className="panchangam-year-line">
        <span>{bilingual(data.samvatsaram, language)}</span>
        <span>{bilingual(data.ritu, language)}</span>
        <span>{bilingual(data.ayana, language)}</span>
      </div>

      <section>
        <h3>పంచాంగం <small>Panchanga</small></h3>
        <div className="panchangam-detail-grid">
          {panchanga.map(([label, value]) => (
            <DetailCard
              key={label}
              label={label}
              value={bilingual(value, language)}
              meta={value?.endsAt ? `Until ${formatTime(value.endsAt, tz, data.date)}` : undefined}
              highlight={label === 'Tithi'}
            />
          ))}
        </div>
      </section>

      <section>
        <h3>Sun & Moon</h3>
        <div className="panchangam-sky-grid">
          <DetailCard label="Sunrise" value={formatTime(data.sunrise, tz)} />
          <DetailCard label="Sunset" value={formatTime(data.sunset, tz)} />
          <DetailCard label="Moonrise" value={formatTime(data.moonrise, tz)} />
          <DetailCard label="Moonset" value={formatTime(data.moonset, tz)} />
        </div>
      </section>

      <section>
        <h3>Day timings</h3>
        <div className="panchangam-timing-grid">
          <DetailCard label="Rahukalam" value={formatRange(data.rahukalam, tz, data.date)} highlight />
          <DetailCard label="Gulika Kalam" value={formatRange(data.gulikaKalam, tz, data.date)} />
          <DetailCard label="Yamagandam" value={formatRange(data.yamagandam, tz, data.date)} />
          <DetailCard label="Durmuhurtham" value={formatRanges(data.durmuhurtham, tz, false, data.date)} highlight />
          <DetailCard label="Varjyam" value={formatRanges(data.varjyam, tz, false, data.date)} highlight />
          <DetailCard label="Abhijit Muhurtam" value={formatRange(data.abhijitMuhurtam, tz, data.date)} />
          <DetailCard label="Amrita Gadiya" value={formatRanges(data.amritaGadiya, tz, false, data.date)} />
        </div>
      </section>

      {!compact && (
        <section>
          <h3>శుభ హోరా <small>South Indian Kala Hora</small></h3>
          <HoraSchedule data={data} city={city} language={language} />
        </section>
      )}

      <section>
        <h3>Festivals</h3>
        {data.festivals?.length ? (
          <div className="panchangam-festival-list">
            {data.festivals.map((festival, index) => (
              <div key={`${festival.en}-${index}`} className="panchangam-festival-card">
                <span aria-hidden="true">✦</span>
                <strong>{bilingual(festival, language)}</strong>
              </div>
            ))}
          </div>
        ) : <p className="panchangam-empty-copy">No major festivals listed for this date.</p>}
      </section>
    </article>
  );
}

export default DayDetails;
