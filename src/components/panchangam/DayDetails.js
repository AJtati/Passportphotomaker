import React from 'react';
import HoraSchedule from './HoraSchedule';
import LagnaSchedule from './LagnaSchedule';
import YogaSection from './YogaSection';
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
  const phrase = (te, en) => bilingual({ te, en }, language);
  const panchanga = [
    [phrase('తిథి', 'Tithi'), data.tithi],
    [phrase('నక్షత్రం', 'Nakshatra'), data.nakshatra],
    [phrase('యోగం', 'Yoga'), data.yoga],
    [phrase('కరణం', 'Karana'), data.karana],
    [phrase('వారం', 'Vara'), data.vara],
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
              meta={value?.endsAt ? `${phrase('ముగింపు', 'Until')} ${formatTime(value.endsAt, tz, data.date)}` : undefined}
              highlight={value === data.tithi}
            />
          ))}
        </div>
      </section>

      <section>
        <h3>{phrase('సూర్య చంద్రులు', 'Sun & Moon')}</h3>
        <div className="panchangam-sky-grid">
          <DetailCard label={phrase('సూర్యోదయం', 'Sunrise')} value={formatTime(data.sunrise, tz)} />
          <DetailCard label={phrase('సూర్యాస్తమయం', 'Sunset')} value={formatTime(data.sunset, tz)} />
          <DetailCard label={phrase('చంద్రోదయం', 'Moonrise')} value={formatTime(data.moonrise, tz)} />
          <DetailCard label={phrase('చంద్రాస్తమయం', 'Moonset')} value={formatTime(data.moonset, tz)} />
        </div>
      </section>

      <section>
        <h3>{phrase('దిన సమయాలు', 'Day timings')}</h3>
        <div className="panchangam-timing-grid">
          <DetailCard label={phrase('రాహుకాలం', 'Rahukalam')} value={formatRange(data.rahukalam, tz, data.date)} highlight />
          <DetailCard label={phrase('గుళిక కాలం', 'Gulika Kalam')} value={formatRange(data.gulikaKalam, tz, data.date)} />
          <DetailCard label={phrase('యమగండం', 'Yamagandam')} value={formatRange(data.yamagandam, tz, data.date)} />
          <DetailCard label={phrase('దుర్ముహూర్తం', 'Durmuhurtham')} value={formatRanges(data.durmuhurtham, tz, false, data.date)} highlight />
          <DetailCard label={phrase('వర్జ్యం', 'Varjyam')} value={formatRanges(data.varjyam, tz, false, data.date)} highlight />
          <DetailCard label={phrase('అభిజిత్ ముహూర్తం', 'Abhijit Muhurtam')} value={formatRange(data.abhijitMuhurtam, tz, data.date)} />
          <DetailCard label={phrase('అమృత ఘడియలు', 'Amrita Gadiya')} value={formatRanges(data.amritaGadiya, tz, false, data.date)} />
        </div>
      </section>

      <YogaSection data={data} city={city} language={language} />

      {!compact && (
        <section>
          <h3>శుభ హోరా <small>South Indian Kala Hora</small></h3>
          <HoraSchedule data={data} city={city} language={language} />
        </section>
      )}

      {!compact && (
        <section>
          <h3>ఉదయ లగ్నం <small>Sidereal Rising Sign</small></h3>
          <LagnaSchedule data={data} city={city} language={language} />
        </section>
      )}

      <section>
        <h3>{phrase('పండుగలు', 'Festivals')}</h3>
        {data.festivals?.length ? (
          <div className="panchangam-festival-list">
            {data.festivals.map((festival, index) => (
              <div key={`${festival.en}-${index}`} className="panchangam-festival-card">
                <span aria-hidden="true">✦</span>
                <strong>{bilingual(festival, language)}</strong>
              </div>
            ))}
          </div>
        ) : <p className="panchangam-empty-copy">{phrase('ఈ తేదీకి ప్రధాన పండుగలు నమోదు కాలేదు.', 'No major festivals are listed for this date.')}</p>}
      </section>
    </article>
  );
}

export default DayDetails;
