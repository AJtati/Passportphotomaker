import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ButtonGroup, Form, Spinner } from 'react-bootstrap';
import DayDetails from './DayDetails';
import DownloadDialog from './DownloadDialog';
import FestivalCalendar from './FestivalCalendar';
import LocationPicker from './LocationPicker';
import MonthCalendar from './MonthCalendar';
import MonthFestivalSummary from './MonthFestivalSummary';
import PanchangamTools from './PanchangamTools';
import { fetchDetailedDay, fetchDetailedMonth, resolveCoordinates } from './panchangamApi';
import {
  bilingual,
  formatMonth,
  getTimeZoneDetails,
  isoDateInTimezone,
  monthFromDate,
  readStoredCity,
  replaceYear,
  shiftMonth,
  storeCity,
} from './helpers';
import './Panchangam.css';

const YEAR_OPTIONS = Array.from({ length: 301 }, (_, index) => 1900 + index);

const addDays = (date, amount) => {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LoadingState = ({ message }) => (
  <div className="panchangam-loading" role="status">
    <Spinner animation="border" />
    <span>{message}</span>
  </div>
);

function Panchangam() {
  const [city, setCity] = useState(readStoredCity);
  const [selectedDate, setSelectedDate] = useState(() => isoDateInTimezone(readStoredCity().tz));
  const [view, setView] = useState('day');
  const [language, setLanguage] = useState('both');
  const [dayData, setDayData] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthProgress, setMonthProgress] = useState('');
  const [dayError, setDayError] = useState('');
  const [monthError, setMonthError] = useState('');
  const [cachedAt, setCachedAt] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const selectedMonth = useMemo(() => monthFromDate(selectedDate), [selectedDate]);
  const phrase = (te, en) => bilingual({ te, en }, language);

  useEffect(() => {
    if (city.name !== 'Current location' || city.timezoneSource) return undefined;
    let cancelled = false;
    resolveCoordinates(city.lat, city.lng).then((resolved) => {
      if (cancelled) return;
      setCity(resolved);
      storeCity(resolved);
      setSelectedDate((date) => date === isoDateInTimezone(city.tz)
        ? isoDateInTimezone(resolved.tz)
        : date);
    }).catch(() => {
      // Legacy GPS locations continue with their browser timezone if lookup fails.
    });
    return () => { cancelled = true; };
  }, [city]);

  useEffect(() => {
    let cancelled = false;
    setDayLoading(true);
    setDayError('');
    setDayData(null);
    fetchDetailedDay(selectedDate, city)
      .then((response) => {
        if (cancelled) return;
        setDayData(response.data);
        setCachedAt(response.cached ? response.computedAt : '');
      })
      .catch((error) => {
        if (!cancelled) setDayError(error.message || 'Unable to load this date.');
      })
      .finally(() => {
        if (!cancelled) setDayLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedDate, city]);

  useEffect(() => {
    if (view !== 'month') return undefined;
    let cancelled = false;
    setMonthLoading(true);
    setMonthProgress('');
    setMonthError('');
    setMonthData(null);
    fetchDetailedMonth(selectedMonth.year, selectedMonth.month, city, (completed, total) => {
      if (!cancelled) setMonthProgress(`${completed} of ${total} days`);
    })
      .then((response) => {
        if (!cancelled) setMonthData(response.data);
      })
      .catch((error) => {
        if (!cancelled) setMonthError(error.message || 'Unable to load this month.');
      })
      .finally(() => {
        if (!cancelled) {
          setMonthLoading(false);
          setMonthProgress('');
        }
      });
    return () => { cancelled = true; };
  }, [view, selectedMonth.year, selectedMonth.month, city]);

  const chooseCity = (nextCity) => {
    setCity(nextCity);
    storeCity(nextCity);
    setSelectedDate(isoDateInTimezone(nextCity.tz));
    setShowLocation(false);
  };

  const goToday = () => setSelectedDate(isoDateInTimezone(city.tz));

  const navigateMonth = (amount) => {
    const next = shiftMonth(selectedMonth.year, selectedMonth.month, amount);
    setSelectedDate(`${next.year}-${String(next.month).padStart(2, '0')}-01`);
  };

  const handleMonthInput = (value) => {
    if (/^\d{4}-\d{2}$/.test(value)) setSelectedDate(`${value}-01`);
  };

  const navigateView = (amount) => {
    if (view === 'month') navigateMonth(amount);
    else if (view === 'festivals') setSelectedDate(replaceYear(selectedDate, selectedMonth.year + amount));
    else setSelectedDate(addDays(selectedDate, amount));
  };

  const openFestivalDate = (date) => {
    setSelectedDate(date);
    setView('day');
  };

  const isToday = selectedDate === isoDateInTimezone(city.tz);
  const timeZoneDetails = getTimeZoneDetails(
    city.tz,
    dayData?.sunrise || `${selectedDate}T12:00:00Z`
  );

  return (
    <main className="panchangam-page">
      <section className="panchangam-command-bar">
        <div className="panchangam-title-block">
          <span className="panchangam-kicker">{phrase('స్థాన ఆధారిత తెలుగు క్యాలెండర్', 'Location-based Telugu calendar')}</span>
          <h1>తెలుగు పంచాంగం</h1>
          <p>Telugu Panchangam</p>
        </div>
        <div className="panchangam-primary-actions">
          <Button variant="outline-secondary" className="panchangam-location-button" onClick={() => setShowLocation(true)}>
            <span aria-hidden="true">⌖</span>
            <span><strong>{city.name.split(',')[0]}</strong><small>{timeZoneDetails.abbreviation}{timeZoneDetails.offset ? ` · ${timeZoneDetails.offset}` : ''}</small></span>
          </Button>
          <Form.Select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Panchangam language">
            <option value="both">తెలుగు + English</option>
            <option value="te">తెలుగు</option>
            <option value="en">English</option>
          </Form.Select>
          <Button onClick={() => setShowDownload(true)} className="panchangam-download-button">
            ⇩ {phrase('డౌన్‌లోడ్', 'Download')}
          </Button>
        </div>
      </section>

      <section className="panchangam-navigation" aria-label="Calendar navigation">
        <ButtonGroup className="panchangam-view-toggle" aria-label="Calendar view">
          <Button variant={view === 'day' ? 'primary' : 'outline-secondary'} onClick={() => setView('day')}>{phrase('రోజు', 'Day')}</Button>
          <Button variant={view === 'month' ? 'primary' : 'outline-secondary'} onClick={() => setView('month')}>{phrase('నెల', 'Month')}</Button>
          <Button variant={view === 'festivals' ? 'primary' : 'outline-secondary'} onClick={() => setView('festivals')}>{phrase('పండుగలు', 'Festivals')}</Button>
        </ButtonGroup>
        <div className="panchangam-date-nav">
          <Button variant="outline-secondary" aria-label={`Previous ${view}`} onClick={() => navigateView(-1)}>‹</Button>
          {view === 'day' ? (
            <Form.Control type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Select date" />
          ) : view === 'month' ? (
            <Form.Control type="month" value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`} onChange={(event) => handleMonthInput(event.target.value)} aria-label="Select month" />
          ) : (
            <output className="panchangam-year-readout" aria-label="Selected festival year">{selectedMonth.year} · {phrase('పండుగల క్యాలెండర్', 'Festival calendar')}</output>
          )}
          <Button variant="outline-secondary" aria-label={`Next ${view}`} onClick={() => navigateView(1)}>›</Button>
        </div>
        <Form.Select
          className="panchangam-year-select"
          value={selectedMonth.year}
          onChange={(event) => setSelectedDate(replaceYear(selectedDate, Number(event.target.value)))}
          aria-label="Select year"
        >
          {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
        </Form.Select>
        <Button variant={isToday ? 'secondary' : 'outline-secondary'} onClick={goToday}>{phrase('ఈ రోజు', 'Today')}</Button>
      </section>

      {cachedAt && (
        <Alert variant="info" className="panchangam-offline-note">
          {phrase(`${new Date(cachedAt).toLocaleString()} నాటి సేవ్ చేసిన క్యాలెండర్ డేటాను చూస్తున్నారు.`, `You are viewing saved calendar data from ${new Date(cachedAt).toLocaleString()}.`)}
        </Alert>
      )}

      {view === 'day' ? (
        <section className="panchangam-day-view">
          {dayLoading && <LoadingState message={phrase('పంచాంగం గణిస్తోంది…', 'Calculating Panchangam…')} />}
          {dayError && <Alert variant="danger">{dayError} {phrase('ఇంటర్నెట్ కనెక్షన్‌ను పరిశీలించండి లేదా మరో తేదీ ఎంచుకోండి.', 'Check your internet connection or choose another date.')}</Alert>}
          {!dayLoading && !dayError && dayData && <DayDetails data={dayData} city={city} language={language} />}
        </section>
      ) : view === 'month' ? (
        <section className="panchangam-month-view">
          <div className="panchangam-calendar-panel">
            <div className="panchangam-month-heading">
              <div>
                <span className="panchangam-kicker">{phrase('నెలవారీ క్యాలెండర్', 'Monthly calendar')}</span>
                <h2>{formatMonth(selectedMonth.year, selectedMonth.month)}</h2>
              </div>
              {monthData && <p>{language === 'en' ? monthData.masa.en : monthData.masa.te} · {language === 'te' ? monthData.samvatsaram.te : monthData.samvatsaram.en}</p>}
            </div>
            {monthLoading && <LoadingState message={`Calculating every day for ${city.name.split(',')[0]}${monthProgress ? ` · ${monthProgress}` : '…'}`} />}
            {monthError && <Alert variant="danger">{monthError}</Alert>}
            {!monthLoading && !monthError && <MonthCalendar data={monthData} selectedDate={selectedDate} language={language} city={city} onSelectDate={setSelectedDate} />}
            {!monthLoading && !monthError && monthData && <MonthFestivalSummary monthData={monthData} city={city} language={language} onSelectDate={setSelectedDate} />}
            <div className="panchangam-legend" aria-label="Calendar legend">
              <span><i className="is-festival" /> {phrase('పండుగ', 'Festival')}</span>
              <span><i className="is-ekadashi" /> {phrase('ఏకాదశి', 'Ekadashi')}</span>
              <span><i className="is-purnima" /> {phrase('పౌర్ణమి', 'Purnima')}</span>
              <span><i className="is-amavasya" /> {phrase('అమావాస్య', 'Amavasya')}</span>
            </div>
          </div>
          <aside className="panchangam-selected-panel">
            {dayLoading && <LoadingState message="Loading selected day…" />}
            {dayError && <Alert variant="danger">{dayError}</Alert>}
            {!dayLoading && !dayError && dayData && <DayDetails data={dayData} city={city} language={language} compact />}
          </aside>
        </section>
      ) : (
        <FestivalCalendar year={selectedMonth.year} city={city} language={language} onOpenDate={openFestivalDate} />
      )}

      <div className="panchangam-location-disclaimer">
        <span aria-hidden="true">ⓘ</span>
        <p><strong>{phrase(`${city.name} కోసం గణించబడింది.`, `Calculated for ${city.name}.`)}</strong> {phrase(`ఎంచుకున్న తేదీకి అధికారిక స్థానిక సమయం: ${timeZoneDetails.label} · ${city.tz}. DST మరియు వేసవి సమయ మార్పులు స్వయంచాలకంగా వర్తిస్తాయి.`, `Official local time for the selected date: ${timeZoneDetails.label} · ${city.tz}. DST and summer-time changes are applied automatically.`)}</p>
      </div>

      <PanchangamTools city={city} selectedDate={selectedDate} language={language} />

      <LocationPicker show={showLocation} onHide={() => setShowLocation(false)} onSelect={chooseCity} />
      <DownloadDialog
        show={showDownload}
        onHide={() => setShowDownload(false)}
        view={view}
        language={language}
        day={dayData}
        monthData={monthData}
        city={city}
        year={selectedMonth.year}
      />
    </main>
  );
}

export default Panchangam;
