import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, ProgressBar, Spinner } from 'react-bootstrap';
import { layout, prepare, setLocale } from '@chenglou/pretext';
import { calculateHoroscope, formatZodiacDegree, resolveBirthInstant } from '../horoscope/horoscopeCalculator';
import { HORA_PLANETS } from '../panchangam/calendarDetails';
import { fetchDetailedRange } from '../panchangam/panchangamApi';
import { bilingual, getTimeZoneDetails, isoDateInTimezone, readStoredCity } from '../panchangam/helpers';
import {
  evaluateMuhurtamDays,
  MUHURTHAM_METHOD,
} from './muhurthamCalculator';
import MuhurthamLocationPicker from './MuhurthamLocationPicker';
import { downloadMuhurtamReport, downloadSelectedMuhurtamReport } from './muhurthamReport';
import './Muhurtham.css';

const UI = {
  back: { te: 'పంచాంగానికి', en: 'Back to Panchangam' },
  title: { te: 'వ్యక్తిగత ముహూర్తం', en: 'Personal Muhurtham' },
  subtitle: { te: 'ఒక్కరు, దంపతులు లేదా కుటుంబానికి గృహప్రవేశ సమయ విశ్లేషణ', en: 'Griha Pravesham timing for one person, a couple or the whole family' },
  event: { te: 'కార్య వివరాలు', en: 'Ceremony details' },
  household: { te: 'ఎవరి కోసం?', en: 'Who is this for?' },
  family: { te: 'కుటుంబ జనన వివరాలు', en: 'Family birth details' },
  calculate: { te: 'ఉత్తమ సమయాలు కనుగొనండి', en: 'Find Best Muhurtham' },
  download: { te: 'పూర్తి నివేదిక', en: 'Download Full Report' },
  selectedDownload: { te: 'ఈ ముహూర్తం', en: 'Download This Muhurtham' },
  reset: { te: 'కొత్త శోధన', en: 'New search' },
};
const text = (language, key) => bilingual(UI[key], language);
const phrase = (language, te, en) => bilingual({ te, en }, language);
const roleName = (language, role) => ({
  owner: phrase(language, 'గృహ యజమాని', 'Primary owner'),
  spouse: phrase(language, 'జీవిత భాగస్వామి', 'Spouse'),
  family: phrase(language, 'కుటుంబ సభ్యుడు', 'Family member'),
  child: phrase(language, 'పిల్లలు', 'Child'),
}[role] || role);
const dignityName = (language, dignity) => ({
  exalted: phrase(language, 'ఉచ్చ', 'exalted'), own: phrase(language, 'స్వక్షేత్ర', 'own sign'),
  debilitated: phrase(language, 'నీచ', 'debilitated'), neutral: phrase(language, 'సాధారణ', 'neutral'),
}[dignity] || dignity || '—');
const points = (value) => `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1)}`;
const planetPlacement = (planet, language) => planet
  ? `${bilingual(planet.name, language)} · ${bilingual(planet.rashi.name, language)} · ${phrase(language, `${planet.house}వ భావం`, `house ${planet.house}`)} · ${dignityName(language, planet.dignity)}`
  : '—';
let personSequence = 0;
const newPerson = (city, role = 'family') => ({
  id: `person-${Date.now()}-${personSequence += 1}`, name: '', role,
  birthDate: '', birthTime: '', city, selectedOffset: '', timeAccuracy: 'exact',
});
const initialLanguage = () => {
  try { const value = sessionStorage.getItem('muhurtham-language'); return ['te', 'en', 'both'].includes(value) ? value : 'both'; }
  catch { return 'both'; }
};
const formatDate = (value, timezone, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(value));
const formatTime = (value, timezone, language) => new Intl.DateTimeFormat(language === 'te' ? 'te-IN' : 'en-GB', {
  timeZone: timezone, hour: 'numeric', minute: '2-digit',
}).format(new Date(value));
const offsetOptionsFor = (person) => {
  if (!person.birthDate || !person.birthTime || !person.city?.tz) return [];
  try { return resolveBirthInstant({ birthDate: person.birthDate, birthTime: person.birthTime, timezone: person.city.tz, selectedOffset: person.selectedOffset }).possibleOffsets; }
  catch { return []; }
};

const usePretextLayout = (language, report, selectedId) => {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current; if (!root) return undefined;
    let disposed = false; let observer; let frame; let measuredWidth = 0;
    const run = async () => {
      await document.fonts?.ready; if (disposed) return;
      setLocale(language === 'te' ? 'te' : 'en');
      const prepared = [...root.querySelectorAll('[data-pretext]')].map((element) => {
        element.style.height = 'auto'; const styles = getComputedStyle(element); const fontSize = parseFloat(styles.fontSize) || 16;
        return { element, handle: prepare(element.textContent, styles.font), lineHeight: parseFloat(styles.lineHeight) || fontSize * 1.35 };
      });
      const relayout = () => {
        const nextWidth = root.clientWidth;
        if (Math.abs(nextWidth - measuredWidth) < 1) return;
        measuredWidth = nextWidth;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => prepared.forEach(({ element, handle, lineHeight }) => {
          if (!element.isConnected || element.clientWidth <= 0) return;
          if (element.clientWidth <= 560) {
            if (element.style.height !== 'auto') element.style.height = 'auto';
            return;
          }
          const nextHeight = Math.ceil(layout(handle, element.clientWidth, lineHeight).height);
          if (Math.abs(element.getBoundingClientRect().height - nextHeight) > 1) element.style.height = `${nextHeight}px`;
        }));
      };
      relayout(); observer = new ResizeObserver(relayout); observer.observe(root);
    };
    run(); return () => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [language, report, selectedId]);
  return rootRef;
};

const LocationButton = ({ city, onClick, language }) => (
  <button type="button" className="muhurtham-place-button" onClick={onClick}>
    <span aria-hidden="true">⌖</span>
    <span><strong>{city.name}</strong><small>{city.tz} · {Number(city.lat).toFixed(4)}, {Number(city.lng).toFixed(4)}</small></span>
    <b>{phrase(language, 'మార్చండి', 'Change')}</b>
  </button>
);

const Check = ({ pass, label, value }) => (
  <div className={`muhurtham-check ${pass === null ? 'is-neutral' : pass ? 'is-pass' : 'is-review'}`}>
    <span aria-hidden="true">{pass === null ? '•' : pass ? '✓' : '!'}</span><div><strong>{label}</strong><small>{value}</small></div>
  </div>
);

const ScoreRow = ({ label, value }) => (
  <div className={`muhurtham-score-row ${Number(value) < 0 ? 'is-negative' : Number(value) > 0 ? 'is-positive' : ''}`}>
    <span>{label}</span><b>{points(value)}</b>
  </div>
);

function Muhurtham() {
  const storedCity = useMemo(readStoredCity, []);
  const [language, setLanguage] = useState(initialLanguage);
  const [mode, setMode] = useState('single');
  const [eventCity, setEventCity] = useState(storedCity);
  const [startDate, setStartDate] = useState(() => isoDateInTimezone(storedCity.tz));
  const [searchDays, setSearchDays] = useState(7);
  const [participants, setParticipants] = useState(() => [newPerson(storedCity, 'owner')]);
  const [locationTarget, setLocationTarget] = useState(null);
  const [report, setReport] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const rootRef = usePretextLayout(language, report, selectedId);

  useEffect(() => { try { sessionStorage.setItem('muhurtham-language', language); } catch { /* no-op */ } }, [language]);

  const updatePerson = (id, patch) => setParticipants((items) => items.map((person) => person.id === id ? { ...person, ...patch } : person));
  const setHouseholdMode = (nextMode) => {
    setMode(nextMode); setReport(null); setError('');
    setParticipants((current) => {
      if (nextMode === 'single') return [current[0] || newPerson(eventCity, 'owner')];
      if (nextMode === 'couple') {
        const next = current.slice(0, 2); while (next.length < 2) next.push(newPerson(eventCity, next.length === 0 ? 'owner' : 'spouse'));
        return next.map((person, index) => ({ ...person, role: index === 0 ? 'owner' : 'spouse' }));
      }
      const next = [...current]; while (next.length < 3) next.push(newPerson(eventCity, next.length === 0 ? 'owner' : 'family'));
      return next;
    });
  };
  const addPerson = () => setParticipants((items) => [...items, newPerson(eventCity, 'family')]);
  const removePerson = (id) => setParticipants((items) => items.length > 1 ? items.filter((person) => person.id !== id) : items);
  const chooseLocation = (city) => {
    if (locationTarget?.type === 'event') setEventCity(city);
    if (locationTarget?.type === 'birth') updatePerson(locationTarget.id, { city, selectedOffset: '' });
    setLocationTarget(null); setError('');
  };

  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setProgress({ done: 0, total: 0 });
    try {
      const preparedPeople = participants.map((person) => {
        const options = offsetOptionsFor(person);
        if (options.length > 1 && person.selectedOffset === '') throw new Error(`${person.name || 'A family member'} has an ambiguous clock-change birth time. Select the correct UTC offset.`);
        const chart = calculateHoroscope(person);
        return { ...person, name: person.name.trim(), chart };
      });
      const response = await fetchDetailedRange(startDate, searchDays, eventCity, (done, total) => setProgress({ done, total }));
      const windows = evaluateMuhurtamDays(response.data, eventCity, preparedPeople, { minScore: 50 });
      if (!windows.length) throw new Error('No Hora–Lagna overlap scored 50 or above in this range. Try 14 or 30 days.');
      const nextReport = {
        createdAt: new Date().toISOString(), ceremony: 'griha-pravesham', city: eventCity,
        search: { startDate, days: Number(searchDays) }, participants: preparedPeople, windows,
        method: MUHURTHAM_METHOD, computedAt: response.computedAt, cached: response.cached,
      };
      setReport(nextReport); setSelectedId(windows[0].id); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (calculationError) {
      setError(calculationError.message || 'The Muhurtham analysis could not be completed.');
    } finally { setLoading(false); }
  };

  const download = async () => {
    setDownloading(true); setError('');
    try { await downloadMuhurtamReport(report, language); }
    catch (downloadError) { setError(downloadError.message || 'The report could not be downloaded.'); }
    finally { setDownloading(false); }
  };
  const downloadSelected = async () => {
    setDownloadingSelected(true); setError('');
    try { await downloadSelectedMuhurtamReport(report, selected, language); }
    catch (downloadError) { setError(downloadError.message || 'The selected Muhurtham could not be downloaded.'); }
    finally { setDownloadingSelected(false); }
  };
  const reset = () => { setReport(null); setSelectedId(''); setError(''); };
  const selected = report?.windows.find((window) => window.id === selectedId) || report?.windows[0];
  const zone = selected ? getTimeZoneDetails(report.city.tz, selected.start) : null;

  return (
    <main className="muhurtham-page" ref={rootRef}>
      <header className="muhurtham-command-bar">
        <div>
          <button className="muhurtham-back" type="button" onClick={() => { window.location.hash = '/panchangam'; }}>← {text(language, 'back')}</button>
          <span className="muhurtham-kicker">{phrase(language, 'దక్షిణ భారత · లహిరి / చిత్రపక్ష', 'SOUTH INDIAN · LAHIRI / CHITRAPAKSHA')}</span>
          <h1 data-pretext>{text(language, 'title')}</h1>
          <p data-pretext>{text(language, 'subtitle')}</p>
        </div>
        <div className="muhurtham-header-actions">
          <Form.Select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Muhurtham language">
            <option value="both">తెలుగు + English</option><option value="te">తెలుగు</option><option value="en">English</option>
          </Form.Select>
          {report && <Button variant="outline-secondary" onClick={reset}>{text(language, 'reset')}</Button>}
          {report && <Button className="muhurtham-download" onClick={download} disabled={downloading}>{downloading ? <Spinner size="sm" /> : '⇩'} {text(language, 'download')}</Button>}
        </div>
      </header>

      {error && <Alert variant="warning" className="muhurtham-alert" dismissible onClose={() => setError('')}>{error}</Alert>}

      {!report ? (
        <Form className="muhurtham-intake" onSubmit={submit}>
          <section className="muhurtham-event-panel">
            <div className="muhurtham-panel-heading"><span>01</span><div><small>{phrase(language, 'గృహప్రవేశం', 'GRIHA PRAVESHAM')}</small><h2 data-pretext>{text(language, 'event')}</h2></div></div>
            <div className="muhurtham-ceremony-lock"><span aria-hidden="true">⌂</span><div><strong>{phrase(language, 'గృహప్రవేశం · ఇంటి వేడుక', 'Griha Pravesham · Housewarming')}</strong><small>{phrase(language, 'ప్రవేశం మరియు పూజ ప్రారంభానికి సమయం', 'Timing the threshold entry and beginning of Puja')}</small></div></div>
            <Form.Group><Form.Label>{phrase(language, 'కొత్త ఇంటి స్థలం', 'New-house location')}</Form.Label><LocationButton city={eventCity} language={language} onClick={() => setLocationTarget({ type: 'event' })} /></Form.Group>
            <div className="muhurtham-date-grid">
              <Form.Group><Form.Label>{phrase(language, 'శోధన ప్రారంభ తేదీ', 'Search from')}</Form.Label><Form.Control type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></Form.Group>
              <Form.Group><Form.Label>{phrase(language, 'ఎన్ని రోజులు', 'Search range')}</Form.Label><Form.Select value={searchDays} onChange={(event) => setSearchDays(Number(event.target.value))}><option value="1">{phrase(language, 'ఒక రోజు', '1 day')}</option><option value="7">{phrase(language, '7 రోజులు', '7 days')}</option><option value="14">{phrase(language, '14 రోజులు', '14 days')}</option><option value="30">{phrase(language, '30 రోజులు', '30 days')}</option></Form.Select></Form.Group>
            </div>
            <div className="muhurtham-zone-proof"><span aria-hidden="true">◷</span><div><strong>{eventCity.tz}</strong><small>{phrase(language, 'ఈ తేదీలకు స్థానిక DST / సమ్మర్ టైమ్ స్వయంచాలకంగా వర్తిస్తుంది.', 'Local DST or summer-time rules are applied separately for every searched date.')}</small></div></div>
          </section>

          <section className="muhurtham-family-panel">
            <div className="muhurtham-panel-heading"><span>02</span><div><small>{phrase(language, 'వ్యక్తిగత అనుకూలత', 'PERSONAL SUITABILITY')}</small><h2 data-pretext>{text(language, 'household')}</h2></div></div>
            <div className="muhurtham-mode-switch" role="group" aria-label="Household type">
              {[['single', 'ఒక్కరు', 'Single'], ['couple', 'దంపతులు', 'Couple'], ['family', 'కుటుంబం', 'Family']].map(([key, te, en]) => (
                <button type="button" key={key} className={mode === key ? 'is-active' : ''} onClick={() => setHouseholdMode(key)}>{phrase(language, te, en)}</button>
              ))}
            </div>
            <div className="muhurtham-people">
              {participants.map((person, index) => {
                const offsets = offsetOptionsFor(person);
                return (
                  <article className="muhurtham-person-card" key={person.id}>
                    <header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{person.name || phrase(language, 'కుటుంబ సభ్యుడు', 'Family member')}</strong><small>{roleName(language, person.role)}</small></div>{participants.length > 1 && <button type="button" onClick={() => removePerson(person.id)} aria-label="Remove family member">×</button>}</header>
                    <div className="muhurtham-person-grid">
                      <Form.Group className="muhurtham-name-field"><Form.Label>{phrase(language, 'పూర్తి పేరు', 'Full name')}</Form.Label><Form.Control value={person.name} onChange={(event) => updatePerson(person.id, { name: event.target.value })} required /></Form.Group>
                      <Form.Group><Form.Label>{phrase(language, 'పాత్ర', 'Role')}</Form.Label><Form.Select value={person.role} onChange={(event) => updatePerson(person.id, { role: event.target.value })}><option value="owner">{roleName(language, 'owner')}</option><option value="spouse">{roleName(language, 'spouse')}</option><option value="family">{roleName(language, 'family')}</option><option value="child">{roleName(language, 'child')}</option></Form.Select></Form.Group>
                      <Form.Group><Form.Label>{phrase(language, 'జనన తేదీ', 'Birth date')}</Form.Label><Form.Control type="date" value={person.birthDate} onChange={(event) => updatePerson(person.id, { birthDate: event.target.value, selectedOffset: '' })} required /></Form.Group>
                      <Form.Group><Form.Label>{phrase(language, 'జనన సమయం', 'Birth time')}</Form.Label><Form.Control type="time" value={person.birthTime} onChange={(event) => updatePerson(person.id, { birthTime: event.target.value, selectedOffset: '' })} required step="60" /></Form.Group>
                    </div>
                    <Form.Group><Form.Label>{phrase(language, 'జన్మస్థలం', 'Birth place')}</Form.Label><LocationButton city={person.city} language={language} onClick={() => setLocationTarget({ type: 'birth', id: person.id })} /></Form.Group>
                    <div className="muhurtham-accuracy-row">
                      <Form.Check type="radio" name={`accuracy-${person.id}`} id={`exact-${person.id}`} label={phrase(language, 'సమయం ఖచ్చితం', 'Exact time')} checked={person.timeAccuracy === 'exact'} onChange={() => updatePerson(person.id, { timeAccuracy: 'exact' })} />
                      <Form.Check type="radio" name={`accuracy-${person.id}`} id={`approx-${person.id}`} label={phrase(language, 'సుమారు సమయం', 'Approximate')} checked={person.timeAccuracy === 'approximate'} onChange={() => updatePerson(person.id, { timeAccuracy: 'approximate' })} />
                    </div>
                    {offsets.length > 1 && <Form.Group className="muhurtham-offset"><Form.Label>{phrase(language, 'గడియార మార్పు UTC భేదం', 'Clock-change UTC offset')}</Form.Label><Form.Select value={person.selectedOffset} onChange={(event) => updatePerson(person.id, { selectedOffset: event.target.value })} required><option value="">Select the recorded offset</option>{offsets.map((option) => <option key={option.offset} value={option.offset}>{option.label}</option>)}</Form.Select></Form.Group>}
                  </article>
                );
              })}
            </div>
            {mode === 'family' && participants.length < 8 && <Button type="button" variant="outline-secondary" className="muhurtham-add-person" onClick={addPerson}>＋ {phrase(language, 'మరొక కుటుంబ సభ్యుని చేర్చండి', 'Add another family member')}</Button>}
          </section>

          <aside className="muhurtham-method-panel">
            <span className="muhurtham-kicker">{phrase(language, 'పారదర్శక నియమాలు', 'TRANSPARENT RULES')}</span>
            <h2 data-pretext>{bilingual(MUHURTHAM_METHOD.name, language)}</h2>
            <div className="muhurtham-method-list">
              <div><b>1</b><span><strong>{phrase(language, 'పంచాంగ శుద్ధి', 'Panchanga Shuddhi')}</strong><small>{phrase(language, 'తిథి, వారం, నక్షత్రం, యోగం, కరణం', 'Tithi, weekday, Nakshatra, Yoga and Karana')}</small></span></div>
              <div><b>2</b><span><strong>{phrase(language, 'ప్రతి వ్యక్తి బలం', 'Each person')}</strong><small>{phrase(language, 'తారాబలం, చంద్రబలం, జన్మ రాశి/లగ్నాధిపతి', 'Tarabala, Chandrabala and natal lords')}</small></span></div>
              <div><b>3</b><span><strong>{phrase(language, 'ఖచ్చిత సమయ సంగమం', 'Exact time intersection')}</strong><small>{phrase(language, 'హోరా × లగ్నం, నిషిద్ధ కాలాలు తొలగించిన తర్వాత', 'Hora × Lagna after prohibited periods are removed')}</small></span></div>
              <div><b>4</b><span><strong>{phrase(language, 'ముహూర్త జాతక బలం', 'Muhurtham-chart strength')}</strong><small>{phrase(language, 'లగ్నాధిపతి, చతుర్థాధిపతి, అష్టమ దోష పరిశీలన', 'Lagna lord, fourth lord and eighth-house checks')}</small></span></div>
            </div>
            <p>{bilingual(MUHURTHAM_METHOD.notice, language)}</p>
          </aside>

          <div className="muhurtham-submit-bar">
            <div><strong>{phrase(language, 'జనన వివరాలు ఈ బ్రౌజర్‌లోనే ఉంటాయి', 'Birth details remain in this browser')}</strong><small>{phrase(language, 'స్థల శోధన మరియు పంచాంగ తేదీలు మాత్రమే సేవకు పంపబడతాయి.', 'Only place searches and Panchangam dates are requested from the service.')}</small></div>
            <Button type="submit" className="muhurtham-calculate" disabled={loading}>{loading ? <><Spinner size="sm" /> {phrase(language, 'విశ్లేషిస్తోంది…', 'Analysing…')}</> : text(language, 'calculate')}</Button>
            {loading && progress.total > 0 && <ProgressBar now={(progress.done / progress.total) * 100} aria-label="Muhurtham calculation progress" />}
          </div>
        </Form>
      ) : (
        <section className="muhurtham-results">
          <div className="muhurtham-mobile-window-picker">
            <Form.Label htmlFor="muhurtham-window-select">{phrase(language, `అన్ని ${report.windows.length} సమయాలు · స్కోరు 50 లేదా ఎక్కువ`, `All ${report.windows.length} windows · score 50 or above`)}</Form.Label>
            <Form.Select id="muhurtham-window-select" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {report.windows.map((window, index) => (
                <option key={window.id} value={window.id}>{String(index + 1).padStart(2, '0')} · {formatDate(window.start, report.city.tz, language)} · {formatTime(window.start, report.city.tz, language)}–{formatTime(window.end, report.city.tz, language)} · {window.score}/100</option>
              ))}
            </Form.Select>
          </div>
          <div className="muhurtham-result-rail" aria-label="Ranked Muhurtham windows">
            <header><span><span className="muhurtham-kicker">{phrase(language, 'ర్యాంక్ చేసిన సమయాలు', 'RANKED WINDOWS')}</span><small>{phrase(language, 'స్కోరు 50+', 'Score 50+')}</small></span><strong>{report.windows.length}</strong></header>
            {report.windows.map((window, index) => (
              <button key={window.id} type="button" className={`${window.id === selected.id ? 'is-active' : ''} is-${window.grade}`} onClick={() => setSelectedId(window.id)}>
                <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{formatDate(window.start, report.city.tz, language)}</strong><small>{formatTime(window.start, report.city.tz, language)} – {formatTime(window.end, report.city.tz, language)}</small></div><b>{window.score}</b>
              </button>
            ))}
          </div>

          <article className="muhurtham-result-main">
            <header className="muhurtham-result-hero">
              <div><span className={`muhurtham-grade is-${selected.grade}`}>{selected.grade === 'best' ? phrase(language, 'ఉత్తమ ఎంపిక', 'BEST MATCH') : selected.grade === 'review' ? phrase(language, 'సమీక్షతో అనుకూలం', 'GOOD WITH REVIEW') : phrase(language, 'జాగ్రత్తగా పరిశీలించండి', 'CAUTION')}</span><h2 data-pretext>{formatTime(selected.start, report.city.tz, language)} – {formatTime(selected.end, report.city.tz, language)}</h2><p>{formatDate(selected.start, report.city.tz, language)}</p></div>
              <div className="muhurtham-score"><strong>{selected.score}</strong><span>/100</span><small>{phrase(language, 'పారదర్శక స్కోరు', 'transparent score')}</small></div>
            </header>
            <div className="muhurtham-time-proof"><span aria-hidden="true">◷</span><div><strong>{zone.label}</strong><small>{report.city.name} · {report.city.tz} · {phrase(language, 'ఎంచుకున్న తేదీకి అధికారిక స్థానిక సమయం', 'Official local time for the selected date')}</small></div><Button variant="outline-secondary" className="muhurtham-selected-download" onClick={downloadSelected} disabled={downloadingSelected}>{downloadingSelected ? <Spinner size="sm" /> : '⇩'} {text(language, 'selectedDownload')}</Button></div>

            <section className="muhurtham-timeline"><div className="muhurtham-section-title"><span>01</span><div><small>{phrase(language, 'కార్య క్రమం', 'CEREMONY SEQUENCE')}</small><h3 data-pretext>{phrase(language, 'ఎప్పుడు ఏం చేయాలి', 'What to do and when')}</h3></div></div>
              <div className="muhurtham-timeline-track">
                <div><time>{formatTime(selected.hora.start, report.city.tz, language)}</time><span><strong>{phrase(language, 'అనుకూల హోరా ప్రారంభం', 'Supportive Hora begins')}</strong><small>{bilingual(HORA_PLANETS[selected.hora.planetKey].name, language)} {phrase(language, 'హోరా', 'Hora')}</small></span></div>
                <div className="is-primary"><time>{formatTime(selected.start, report.city.tz, language)}</time><span><strong>{phrase(language, 'ఇంట్లో ప్రవేశించి పూజ ప్రారంభించండి', 'Enter the home and begin Puja')}</strong><small>{bilingual(selected.lagna.name, language)} {phrase(language, 'లగ్నం కూడా అనుకూలం', 'Lagna is also active')}</small></span></div>
                <div><time>{formatTime(selected.end, report.city.tz, language)}</time><span><strong>{phrase(language, 'ఎంపిక చేసిన సంగమం ముగింపు', 'Selected overlap ends')}</strong><small>{Math.round(selected.durationMinutes)} {phrase(language, 'నిమిషాల సురక్షిత సమయం', 'minute safe window')}</small></span></div>
              </div>
            </section>

            <section className="muhurtham-panchanga-audit"><div className="muhurtham-section-title"><span>02</span><div><small>{phrase(language, 'పంచాంగం + ముహూర్త జాతకం', 'PANCHANGA + EVENT CHART')}</small><h3 data-pretext>{phrase(language, 'ఎందుకు ఈ సమయం ఎంపికైంది', 'Why this time ranked here')}</h3></div></div>
              <div className="muhurtham-check-grid">
                <Check pass={selected.checks.tithiPass} label={phrase(language, 'తిథి', 'Tithi')} value={bilingual(selected.panchanga.tithi, language)} />
                <Check pass={selected.checks.weekdayPass} label={phrase(language, 'వారం', 'Weekday')} value={bilingual(selected.panchanga.vara, language)} />
                <Check pass={selected.checks.nakshatraPass} label={phrase(language, 'నక్షత్రం', 'Nakshatra')} value={bilingual(selected.panchanga.nakshatra.name, language)} />
                <Check pass={selected.checks.yogaPass} label={phrase(language, 'నిత్య యోగం', 'Nitya Yoga')} value={`${bilingual(selected.panchanga.yoga, language)}${selected.checks.yogaPass === null ? ` · ${phrase(language, 'మార్పు సమీక్ష', 'transition review')}` : ''}`} />
                <Check pass={selected.checks.karanaPass} label={phrase(language, 'కరణం', 'Karana')} value={`${bilingual(selected.panchanga.karana, language)}${selected.checks.karanaPass === null ? ` · ${phrase(language, 'మార్పు సమీక్ష', 'transition review')}` : ''}`} />
                <Check pass={(selected.lagna.nature?.en || '').includes('Fixed')} label={phrase(language, 'లగ్న స్వభావం', 'Lagna nature')} value={bilingual(selected.lagna.nature, language)} />
                <Check pass={!selected.chartStrength.eighthMalefics.length} label={phrase(language, 'అష్టమ పరిశీలన', 'Eighth-house check')} value={selected.chartStrength.eighthMalefics.length ? `${selected.chartStrength.eighthMalefics.length} ${phrase(language, 'పాపగ్రహాలు', 'malefic placements')}` : phrase(language, 'ప్రధాన పాపగ్రహం లేదు', 'No major malefic found')} />
                <Check pass={selected.chartStrength.score >= 0} label={phrase(language, 'లగ్న / చతుర్థాధిపతి', 'Lagna / fourth lord')} value={`${bilingual(selected.chartStrength.lagnaLord?.name, language)} · ${bilingual(selected.chartStrength.fourthLord?.name, language)}`} />
              </div>
              <div className="muhurtham-panchanga-strip"><span><small>{phrase(language, 'హోరా', 'Hora')}</small><strong>{bilingual(HORA_PLANETS[selected.hora.planetKey].name, language)}</strong></span><span><small>{phrase(language, 'లగ్నం', 'Lagna')}</small><strong>{bilingual(selected.lagna.name, language)}</strong></span><span><small>{phrase(language, 'చంద్ర రాశి', 'Moon sign')}</small><strong>{bilingual(selected.panchanga.moonRashi.name, language)}</strong></span><span><small>{phrase(language, 'మాసం', 'Lunar month')}</small><strong>{bilingual(selected.panchanga.masa, language)}</strong></span></div>
              <div className="muhurtham-shubha-summary">
                <header><div><small>{phrase(language, 'వ్యక్తిగత శుభ యోగ అనుకూలత', 'PERSONAL SHUBHA SUITABILITY')}</small><h4>{phrase(language, 'ఈ రోజు ప్రతి వ్యక్తికి శుభమా?', 'Is this day auspicious for each person?')}</h4></div><span>{selected.panchanga.specialYogas?.length ? selected.panchanga.specialYogas.map((yoga) => bilingual(yoga.name, language)).join(' · ') : phrase(language, 'ప్రత్యేక వార–నక్షత్ర సిద్ధి యోగం లేదు', 'No named Vara–Nakshatra Siddhi Yoga')}</span></header>
                <div>
                  {selected.fits.map((fit) => <article className={`is-${fit.shubhaYoga.tone}`} key={`${fit.id}-shubha`}><span>{fit.shubhaYoga.tone === 'excellent' ? '✦' : fit.shubhaYoga.tone === 'suitable' ? '✓' : fit.shubhaYoga.tone === 'unsuitable' ? '×' : '◇'}</span><div><strong>{fit.name} · {bilingual(fit.shubhaYoga.name, language)}</strong><p>{bilingual(fit.shubhaYoga.explanation, language)}</p><small>{bilingual(fit.tara.name, language)} · {bilingual(fit.chandra.name, language)} · {bilingual(HORA_PLANETS[selected.hora.planetKey].name, language)} {phrase(language, 'హోరా', 'Hora')}</small></div></article>)}
                </div>
                <p>{phrase(language, 'గమనిక: ఇది కొత్త శాస్త్రీయ నిత్య యోగం పేరు కాదు; కార్యదిన యోగం మరియు వ్యక్తిగత తారాబలం, చంద్రబలం, హోరా బలాన్ని కలిపిన పారదర్శక అనుకూలత నిర్ణయం.', 'Note: this is not a newly invented classical Nitya Yoga. It is a transparent suitability verdict combining the event-day Yoga with personal Tarabala, Chandrabala and Hora strength.')}</p>
              </div>
            </section>

            <section className="muhurtham-score-audit"><div className="muhurtham-section-title"><span>03</span><div><small>{phrase(language, 'పూర్తి స్కోరు లెక్క', 'COMPLETE SCORE LEDGER')}</small><h3 data-pretext>{phrase(language, 'ప్రతి పాయింట్ ఎలా వచ్చింది', 'How every point was calculated')}</h3></div></div>
              <div className="muhurtham-score-totals">
                <span><small>{phrase(language, 'ముడి స్కోరు', 'Raw score')}</small><strong>{selected.scoreLedger.rawScore}</strong></span>
                <span><small>{phrase(language, 'దోష పరిమితి', 'Blocking cap')}</small><strong>{selected.scoreLedger.blockingCap}</strong><em>{selected.scoreLedger.blockingCount} {phrase(language, 'నిరోధాలు', 'blocks')}</em></span>
                <span className="is-final"><small>{phrase(language, 'తుది స్కోరు', 'Final score')}</small><strong>{selected.scoreLedger.finalScore}</strong></span>
              </div>
              <div className="muhurtham-score-ledger">
                {selected.scoreLedger.components.map((component) => <ScoreRow key={component.key} label={bilingual(component.label, language)} value={component.value} />)}
                <ScoreRow label={phrase(language, '100 పరిమితి / నిరోధ సర్దుబాటు', '100-point / blocking adjustment')} value={selected.scoreLedger.finalAdjustment} />
              </div>
              <p className="muhurtham-score-formula">{phrase(language,
                `ముడి స్కోరు ${selected.scoreLedger.rawScore}. ${selected.scoreLedger.blockingCount} నిరోధాల వల్ల గరిష్ఠ స్కోరు ${selected.scoreLedger.blockingCap}. అందువల్ల తుది స్కోరు ${selected.scoreLedger.finalScore}.`,
                `Raw score ${selected.scoreLedger.rawScore}. ${selected.scoreLedger.blockingCount} blocking checks set the maximum at ${selected.scoreLedger.blockingCap}, producing a final score of ${selected.scoreLedger.finalScore}.`
              )}</p>
            </section>

            <section className="muhurtham-family-fit"><div className="muhurtham-section-title"><span>04</span><div><small>{phrase(language, 'జన్మ జాతకం నుండి ఆధారం', 'PERSON-BY-PERSON BIRTH-CHART PROOF')}</small><h3 data-pretext>{phrase(language, 'కుటుంబ అనుకూలత ఎలా వచ్చింది', 'How family suitability was calculated')}</h3></div></div>
              <div className="muhurtham-fit-table">
                <div className="muhurtham-fit-head"><span>{phrase(language, 'వ్యక్తి', 'Person')}</span><span>{phrase(language, 'తారాబలం', 'Tarabala')}</span><span>{phrase(language, 'చంద్రబలం', 'Chandrabala')}</span><span>{phrase(language, 'హోరా', 'Hora')}</span><span>{phrase(language, 'ఫలితం', 'Fit')}</span></div>
                {selected.fits.map((fit) => <div className="muhurtham-fit-row" key={fit.id}><span><strong>{fit.name}</strong><small>{roleName(language, fit.role)}</small></span><span className={`is-${fit.tara.tone}`}><strong>{bilingual(fit.tara.name, language)}</strong><small>{fit.tara.count}/27 · {points(fit.tara.score)}</small></span><span className={`is-${fit.chandra.tone}`}><strong>{bilingual(fit.chandra.name, language)}</strong><small>{fit.chandra.house}{fit.chandra.house === 1 ? 'st' : 'th'} · {points(fit.chandra.score)}</small></span><span><strong>{bilingual(HORA_PLANETS[selected.hora.planetKey].name, language)}</strong><small>{points(fit.hora.score)} · {fit.hora.reasons.map((reason) => bilingual(reason, language)).join(' · ')}</small></span><span><b>{Math.round(fit.score)}</b></span></div>)}
              </div>
              <div className="muhurtham-person-proofs">
                {selected.fits.map((fit, index) => (
                  <details className="muhurtham-person-proof" key={`${fit.id}-proof`} open={index === 0}>
                    <summary><span><strong>{fit.name}</strong><small>{roleName(language, fit.role)} · {phrase(language, 'వ్యక్తిగత స్కోరు', 'personal score')} {Math.round(fit.score)} · {phrase(language, 'పాత్ర బరువు', 'role weight')} ×{fit.roleWeight}</small></span><b>{phrase(language, 'లెక్క చూడండి', 'View calculation')}</b></summary>
                    <div className="muhurtham-natal-grid">
                      <span><small>{phrase(language, 'జన్మ రాశి', 'Janma Rashi')}</small><strong>{bilingual(fit.natal.rashi.name, language)}</strong></span>
                      <span><small>{phrase(language, 'జన్మ నక్షత్రం', 'Janma Nakshatra')}</small><strong>{bilingual(fit.natal.nakshatra.name, language)} · {phrase(language, `${fit.natal.nakshatra.pada}వ పాదం`, `Pada ${fit.natal.nakshatra.pada}`)}</strong></span>
                      <span><small>{phrase(language, 'జన్మ లగ్నం', 'Natal Lagna')}</small><strong>{bilingual(fit.natal.lagna.rashi.name, language)} · {formatZodiacDegree(fit.natal.lagna.longitude)}</strong></span>
                      <span><small>{phrase(language, 'నక్షత్రాధిపతి', 'Nakshatra lord')}</small><strong>{bilingual(fit.natal.nakshatraLord?.name || { te: fit.natal.nakshatra.lord, en: fit.natal.nakshatra.lord }, language)}</strong></span>
                    </div>
                    <div className="muhurtham-lord-proof"><span><small>{phrase(language, 'లగ్నాధిపతి స్థితి', 'Lagna-lord placement')}</small><strong>{planetPlacement(fit.natal.lagnaLord, language)}</strong></span><span><small>{phrase(language, 'రాశ్యాధిపతి స్థితి', 'Moon-sign lord placement')}</small><strong>{planetPlacement(fit.natal.rashiLord, language)}</strong></span></div>
                    <div className="muhurtham-proof-steps">
                      <article><header><span>01</span><strong>{bilingual(fit.tara.name, language)}</strong><b>{points(fit.tara.score)}</b></header><p>{phrase(language,
                        `జన్మ నక్షత్రం #${fit.tara.janmaNakshatraNumber} నుండి కార్య నక్షత్రం #${fit.tara.eventNakshatraNumber} వరకు కలుపుకొని లెక్క ${fit.tara.count}. 9 తారల చక్రంలో స్థానం ${fit.tara.cyclePosition}; అందుకే ${fit.tara.name.te}.`,
                        `Count inclusively from birth star #${fit.tara.janmaNakshatraNumber} to event star #${fit.tara.eventNakshatraNumber}: ${fit.tara.count}. Position ${fit.tara.cyclePosition} in the repeating nine-Tara cycle is ${fit.tara.name.en}.`
                      )}</p></article>
                      <article><header><span>02</span><strong>{phrase(language, 'చంద్రబలం', 'Chandrabala')}</strong><b>{points(fit.chandra.score)}</b></header><p>{phrase(language,
                        `జన్మ చంద్ర రాశి #${fit.chandra.janmaRashiNumber} నుండి కార్య చంద్ర రాశి #${fit.chandra.eventRashiNumber} వరకు లెక్కిస్తే ${fit.chandra.house}వ స్థానం. ఫలితం: ${fit.chandra.name.te}.`,
                        `From natal Moon sign #${fit.chandra.janmaRashiNumber}, the event Moon sign #${fit.chandra.eventRashiNumber} falls in the ${fit.chandra.house}${fit.chandra.house === 1 ? 'st' : fit.chandra.house === 2 ? 'nd' : fit.chandra.house === 3 ? 'rd' : 'th'} position: ${fit.chandra.name.en}.`
                      )}</p></article>
                      <article><header><span>03</span><strong>{bilingual(HORA_PLANETS[selected.hora.planetKey].name, language)} {phrase(language, 'హోరా', 'Hora')}</strong><b>{points(fit.hora.score)}</b></header><p>{phrase(language,
                        `ప్రాథమికం ${points(fit.hora.baseScore)} + లగ్నాధిపతి సరిపోలిక ${points(fit.hora.lagnaLordBonus)} + రాశ్యాధిపతి సరిపోలిక ${points(fit.hora.rashiLordBonus)} + జన్మ గ్రహబలం ${points(fit.hora.dignityBonus)} = ${points(fit.hora.score)}.`,
                        `Base ${points(fit.hora.baseScore)} + natal Lagna-lord match ${points(fit.hora.lagnaLordBonus)} + Moon-sign-lord match ${points(fit.hora.rashiLordBonus)} + natal dignity ${points(fit.hora.dignityBonus)} = ${points(fit.hora.score)}.`
                      )}</p></article>
                      <article className={`is-${fit.shubhaYoga.tone}`}><header><span>04</span><strong>{phrase(language, 'వ్యక్తిగత శుభ యోగ నిర్ణయం', 'Personal Shubha verdict')}</strong><b>{fit.shubhaYoga.tone === 'unsuitable' ? '×' : fit.shubhaYoga.tone === 'mixed' ? '◇' : '✓'}</b></header><p><strong>{bilingual(fit.shubhaYoga.name, language)}</strong><br />{bilingual(fit.shubhaYoga.explanation, language)}</p></article>
                    </div>
                    <div className="muhurtham-person-total"><span>{phrase(language, 'వ్యక్తిగత మొత్తం', 'Personal total')}</span><strong>{points(fit.tara.score)} + {points(fit.chandra.score)} + {points(fit.hora.score)} = {Math.round(fit.score)}</strong></div>
                  </details>
                ))}
              </div>
            </section>

            <footer className="muhurtham-result-note"><strong>{bilingual(MUHURTHAM_METHOD.name, language)}</strong><p>{bilingual(MUHURTHAM_METHOD.notice, language)}</p><small>{MUHURTHAM_METHOD.sources.join(' · ')}</small></footer>
          </article>
        </section>
      )}

      <MuhurthamLocationPicker show={Boolean(locationTarget)} onHide={() => setLocationTarget(null)} onSelect={chooseLocation} purpose={locationTarget?.type === 'birth' ? 'birth' : 'event'} />
    </main>
  );
}

export default Muhurtham;
