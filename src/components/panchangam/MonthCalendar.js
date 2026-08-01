import React from 'react';
import { bilingual, formatRanges, formatShortRange, formatShortTime } from './helpers';

const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  te: ['ఆది', 'సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని'],
};

const LABELS = {
  tithi: ['తి', 'Tithi'],
  nakshatra: ['న', 'Nakshatra'],
  yoga: ['యో', 'Yoga'],
  karana: ['క', 'Karana'],
  varjyam: ['వ', 'Varjyam'],
  durmuhurtham: ['దు', 'Durmuhurtham'],
  rahukalam: ['రా', 'Rahukalam'],
  gulika: ['గు', 'Gulika'],
  yamagandam: ['య', 'Yamagandam'],
  abhijit: ['అ', 'Abhijit'],
  amrita: ['అమృ', 'Amrita Gadiya'],
  sun: ['సూ', 'Sun'],
};

const labelFor = (key, language) => language === 'en' ? LABELS[key][1] : LABELS[key][0];

const CalendarLine = ({ label, value, tone = '' }) => (
  <span className={`panchangam-calendar-line ${tone}`.trim()}>
    <b>{label}</b><span>{value}</span>
  </span>
);

function MonthCalendar({ data, selectedDate, language, city, onSelectDate }) {
  if (!data) return null;
  const offset = new Date(data.year, data.month - 1, 1).getDay();
  const headers = language === 'en' ? WEEKDAYS.en : WEEKDAYS.te;

  return (
    <div className="panchangam-calendar-scroll" tabIndex="0" aria-label="Scrollable detailed monthly calendar">
      <div className="panchangam-calendar" role="grid" aria-label="Monthly Telugu Panchangam">
        <div className="panchangam-calendar-head" role="row">
          {headers.map((header, index) => (
            <div key={header} role="columnheader" className={index === 0 ? 'is-sunday' : ''}>
              <span>{header}</span>
              {language === 'both' && <small>{WEEKDAYS.en[index]}</small>}
            </div>
          ))}
        </div>
        <div className="panchangam-calendar-grid">
          {Array.from({ length: offset }).map((_, index) => (
            <div key={`empty-${index}`} className="panchangam-day is-empty" aria-hidden="true" />
          ))}
          {data.days.map((day) => {
          const classes = ['panchangam-day'];
          if (day.date === selectedDate) classes.push('is-selected');
          if (day.isAmavasya) classes.push('is-amavasya');
          if (day.isPurnima) classes.push('is-purnima');
          if (day.isEkadashi) classes.push('is-ekadashi');
          if (day.festivals?.length) classes.push('has-festival');
            return (
            <button
              type="button"
              role="gridcell"
              key={day.date}
              className={classes.join(' ')}
              onClick={() => onSelectDate(day.date)}
              aria-label={`${day.date}, ${bilingual(day.tithi, language)}`}
            >
              <span className="panchangam-day-top">
                <strong>{day.gregorianDay}</strong>
                <span aria-hidden="true">{day.moonPhaseEmoji}</span>
              </span>
              <span className="panchangam-day-lunar">{bilingual(day.masa, language)} · {bilingual(day.paksha, language)}</span>
              <CalendarLine label={labelFor('tithi', language)} value={`${bilingual(day.tithi, language)} ${formatShortTime(day.tithi?.endsAt, city.tz, day.date)}`} tone="is-primary" />
              <CalendarLine label={labelFor('nakshatra', language)} value={`${bilingual(day.nakshatra, language)} ${formatShortTime(day.nakshatra?.endsAt, city.tz, day.date)}`} />
              <CalendarLine label={labelFor('yoga', language)} value={`${bilingual(day.yoga, language)} ${formatShortTime(day.yoga?.endsAt, city.tz, day.date)}`} />
              <CalendarLine label={labelFor('karana', language)} value={`${bilingual(day.karana, language)} ${formatShortTime(day.karana?.endsAt, city.tz, day.date)}`} />
              <CalendarLine label={labelFor('varjyam', language)} value={formatRanges(day.varjyam, city.tz, true, day.date)} tone="is-warning" />
              <CalendarLine label={labelFor('durmuhurtham', language)} value={formatRanges(day.durmuhurtham, city.tz, true, day.date)} tone="is-warning" />
              <CalendarLine label={labelFor('rahukalam', language)} value={formatShortRange(day.rahukalam, city.tz, day.date)} />
              <CalendarLine label={labelFor('gulika', language)} value={formatShortRange(day.gulikaKalam, city.tz, day.date)} />
              <CalendarLine label={labelFor('yamagandam', language)} value={formatShortRange(day.yamagandam, city.tz, day.date)} />
              <CalendarLine label={labelFor('abhijit', language)} value={formatShortRange(day.abhijitMuhurtam, city.tz, day.date)} tone="is-auspicious" />
              <CalendarLine label={labelFor('amrita', language)} value={formatRanges(day.amritaGadiya, city.tz, true, day.date)} tone="is-auspicious" />
              <CalendarLine label={labelFor('sun', language)} value={`${formatShortTime(day.sunrise, city.tz)}–${formatShortTime(day.sunset, city.tz)}`} />
              {day.festivals?.length > 0 && (
                <span className="panchangam-day-festival">✦ {day.festivals.map((festival) => bilingual(festival, language)).join(' · ')}</span>
              )}
            </button>
          );
          })}
        </div>
      </div>
    </div>
  );
}

export default MonthCalendar;
