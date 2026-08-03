import React from 'react';
import { bilingual } from './helpers';
import { festivalsFromMonth } from './festivalHelpers';

const dateLabel = (date, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  day: 'numeric',
  month: 'short',
  weekday: 'short',
}).format(new Date(`${date}T12:00:00`));

function MonthFestivalSummary({ monthData, city, language, onSelectDate }) {
  const festivals = festivalsFromMonth(monthData);
  const phrase = (te, en) => bilingual({ te, en }, language);

  return (
    <section className="panchangam-month-festivals" aria-labelledby="month-festivals-heading">
      <div className="panchangam-month-festivals-heading">
        <div>
          <span className="panchangam-kicker">{phrase('స్థాన ఆధారిత తేదీలు', 'Location-aware dates')}</span>
          <h3 id="month-festivals-heading">✦ {phrase('ఈ నెల పండుగలు', 'Festivals this month')}</h3>
        </div>
        <p>{phrase(`${city.name} కోసం గణించబడింది. స్థానం మారితే తేదీలు స్వయంచాలకంగా మారుతాయి.`, `Calculated for ${city.name}. Dates update automatically when the location changes.`)}</p>
      </div>
      {festivals.length ? (
        <div className="panchangam-month-festival-grid">
          {festivals.map((festival) => (
            <button type="button" key={`${festival.date}-${festival.en || festival.te}`} onClick={() => onSelectDate(festival.date)}>
              <time dateTime={festival.date}>{dateLabel(festival.date, language)}</time>
              <span>
                <strong>{bilingual(festival, language)}</strong>
                {festival.description && <small>{bilingual(festival.description, language)}</small>}
              </span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
      ) : <p className="panchangam-festival-empty">{phrase('ఈ నెలకు పండుగలు నమోదు కాలేదు.', 'No festivals are listed for this month.')}</p>}
    </section>
  );
}

export default MonthFestivalSummary;
