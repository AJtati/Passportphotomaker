import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { layout, prepare, setLocale } from '@chenglou/pretext';
import { bilingual, getTimeZoneDetails, readStoredCity } from '../panchangam/helpers';
import BirthLocationPicker from './BirthLocationPicker';
import SouthIndianChart from './SouthIndianChart';
import {
  calculateHoroscope,
  dashaInterpretation,
  dashaPlainSummary,
  formatZodiacDegree,
  resolveBirthInstant,
} from './horoscopeCalculator';
import { downloadHoroscopeReport } from './horoscopeReport';
import { buildHoroscopeInsights, interpretationMethod } from './horoscopeInterpretations';
import { buildAdvancedHoroscope } from './horoscopeAdvanced';
import './Horoscope.css';

const UI = {
  back: { te: 'పంచాంగానికి', en: 'Back to Panchangam' },
  title: { te: 'జన్మ జాతకం', en: 'Birth Horoscope' },
  subtitle: { te: 'దక్షిణ భారత జాతక చక్రాలు, యోగాలు, దశలు', en: 'South Indian charts, Yogas, Dashas and life timeline' },
  details: { te: 'జనన వివరాలు', en: 'Birth details' },
  name: { te: 'పూర్తి పేరు', en: 'Full name' },
  date: { te: 'జనన తేదీ', en: 'Date of birth' },
  time: { te: 'జనన సమయం', en: 'Time of birth' },
  place: { te: 'జన్మస్థలం', en: 'Birth place' },
  exact: { te: 'సమయం ఖచ్చితం', en: 'Time is exact' },
  approximate: { te: 'సమయం సుమారుగా', en: 'Time is approximate' },
  calculate: { te: 'జాతకం గణించండి', en: 'Calculate Horoscope' },
  overview: { te: 'సారాంశం', en: 'Overview' },
  charts: { te: 'చక్రాలు', en: 'Charts' },
  chakras: { te: 'చక్రాలు & బలం', en: 'Chakras & Strength' },
  predictions: { te: 'విస్తృత ఫలితాలు', en: 'Full Predictions' },
  planets: { te: 'గ్రహాలు', en: 'Planets' },
  star: { te: 'జన్మ నక్షత్రం', en: 'Birth Star' },
  houses: { te: '12 భావాలు', en: '12 Houses' },
  aspects: { te: 'దృష్టులు', en: 'Aspects' },
  yogas: { te: 'యోగాలు', en: 'Yogas' },
  life: { te: 'జీవిత అంశాలు', en: 'Life Areas' },
  dashas: { te: 'దశలు', en: 'Dashas' },
  timeline: { te: 'జీవిత కాలక్రమం', en: 'Life Timeline' },
  report: { te: 'నివేదిక', en: 'Report' },
  download: { te: 'పూర్తి జాతకం డౌన్‌లోడ్', en: 'Download Full Horoscope' },
  newChart: { te: 'కొత్త జాతకం', en: 'New horoscope' },
};

const text = (language, key) => bilingual(UI[key], language);
const valueText = (language, value) => bilingual(value, language);
const phrase = (language, te, en) => bilingual({ te, en }, language);
const readInitialLanguage = () => {
  try {
    const value = sessionStorage.getItem('horoscope-language');
    return ['te', 'en', 'both'].includes(value) ? value : 'both';
  } catch {
    return 'both';
  }
};

const formatDate = (value, timezone, language, options = {}) => new Intl.DateTimeFormat(
  language === 'te' ? 'te-IN' : 'en-GB',
  { timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric', ...options }
).format(new Date(value));

const DIGNITY = {
  exalted: { te: 'ఉచ్చ', en: 'Exalted' }, own: { te: 'స్వక్షేత్ర', en: 'Own sign' },
  debilitated: { te: 'నీచ', en: 'Debilitated' }, neutral: { te: 'సాధారణ', en: 'Neutral' },
};

const SETTING_COPY = {
  zodiac: { label: 'రాశి పద్ధతి', value: 'నిరయణ' },
  ayanamsa: { label: 'అయనాంశం', value: 'లహిరి / చిత్రపక్ష' },
  chart: { label: 'చక్రం', value: 'దక్షిణ భారత స్థిర-రాశి' },
  houses: { label: 'భావాలు', value: 'సంపూర్ణ రాశి భావాలు' },
  nodes: { label: 'రాహు/కేతు', value: 'మధ్యమ చంద్ర నోడ్లు' },
  dasha: { label: 'దశ', value: 'వింశోత్తరి · 365.2425-రోజుల సివిల్ సంవత్సరం' },
  ephemeris: { label: 'ఖగోళ గణన', value: 'Astronomy Engine భూకేంద్ర దృశ్య స్థితులు' },
};

const settingLabel = (language, key) => phrase(language, SETTING_COPY[key]?.label || key, key);
const settingValue = (language, key, value) => phrase(language, SETTING_COPY[key]?.value || value, value);

const SummaryCard = ({ label, children, note }) => (
  <article className="horoscope-summary-card">
    <span>{label}</span>
    <strong>{children}</strong>
    {note && <small>{note}</small>}
  </article>
);

const MethodChip = ({ label, value }) => (
  <div className="horoscope-method-chip"><span>{label}</span><strong>{value}</strong></div>
);

const usePretextLayout = (language, report, activeSection) => {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let disposed = false;
    let observer;
    let frame;
    let measuredWidth = 0;

    const prepareAndLayout = async () => {
      await document.fonts?.ready;
      if (disposed) return;
      setLocale(language === 'te' ? 'te' : 'en');
      const prepared = [...root.querySelectorAll('[data-pretext]')].map((element) => {
        element.style.height = 'auto';
        const styles = getComputedStyle(element);
        const fontSize = parseFloat(styles.fontSize) || 16;
        return {
          element,
          handle: prepare(element.textContent, styles.font),
          lineHeight: parseFloat(styles.lineHeight) || fontSize * 1.3,
        };
      });
      const relayout = () => {
        const nextWidth = root.clientWidth;
        if (Math.abs(nextWidth - measuredWidth) < 1) return;
        measuredWidth = nextWidth;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => prepared.forEach(({ element, handle, lineHeight }) => {
          if (!element.isConnected || element.clientWidth <= 0) return;
          if (element.clientWidth <= 560) {
            element.style.height = 'auto';
            return;
          }
          const result = layout(handle, element.clientWidth, lineHeight);
          const nextHeight = Math.ceil(result.height);
          if (Math.abs(element.getBoundingClientRect().height - nextHeight) > 1) element.style.height = `${nextHeight}px`;
        }));
      };
      relayout();
      observer = new ResizeObserver(relayout);
      observer.observe(root);
    };

    prepareAndLayout();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [language, report, activeSection]);

  return rootRef;
};

function Horoscope() {
  const [language, setLanguage] = useState(readInitialLanguage);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [timeAccuracy, setTimeAccuracy] = useState('exact');
  const [birthCity, setBirthCity] = useState(readStoredCity);
  const [selectedOffset, setSelectedOffset] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedDasha, setSelectedDasha] = useState('');
  const pageRef = usePretextLayout(language, report, activeSection);

  useEffect(() => {
    try { sessionStorage.setItem('horoscope-language', language); } catch { /* no-op */ }
  }, [language]);

  const resolvedBirth = useMemo(() => {
    if (!birthDate || !birthTime || !birthCity?.tz) return null;
    try {
      return resolveBirthInstant({ birthDate, birthTime, timezone: birthCity.tz, selectedOffset });
    } catch {
      return null;
    }
  }, [birthDate, birthTime, birthCity, selectedOffset]);

  const offsetOptions = resolvedBirth?.possibleOffsets || [];
  const timezoneDetails = getTimeZoneDetails(birthCity.tz, resolvedBirth?.instant || new Date());

  const changeDateOrTime = (setter) => (event) => {
    setter(event.target.value);
    setSelectedOffset('');
    setError('');
  };

  const chooseBirthCity = (city) => {
    setBirthCity(city);
    setSelectedOffset('');
    setShowLocation(false);
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    if (offsetOptions.length > 1 && selectedOffset === '') {
      setError('This birth time occurs twice because the clocks changed. Select the correct UTC offset below.');
      return;
    }
    setCalculating(true);
    setError('');
    window.setTimeout(() => {
      try {
        const next = calculateHoroscope({ name, birthDate, birthTime, city: birthCity, selectedOffset, timeAccuracy });
        setReport(next);
        setSelectedDasha(next.dashas.periods[0]?.start || '');
        setActiveSection('overview');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (calculationError) {
        setError(calculationError.message || 'The horoscope could not be calculated.');
      } finally {
        setCalculating(false);
      }
    }, 40);
  };

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadHoroscopeReport(report, language);
    } catch (downloadError) {
      setError(downloadError.message || 'The horoscope report could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  const reset = () => {
    setReport(null);
    setError('');
    setActiveSection('overview');
  };

  return (
    <main className="horoscope-page" ref={pageRef}>
      <header className="horoscope-command-bar">
        <div>
          <button className="horoscope-back" type="button" onClick={() => { window.location.hash = '/panchangam'; }}>
            ← {text(language, 'back')}
          </button>
          <span className="horoscope-kicker">{phrase(language, 'దక్షిణ భారత · లహిరి / చిత్రపక్ష', 'SOUTH INDIAN · LAHIRI / CHITRAPAKSHA')}</span>
          <h1 data-pretext>{text(language, 'title')}</h1>
          <p data-pretext>{text(language, 'subtitle')}</p>
        </div>
        <div className="horoscope-header-actions">
          <Form.Select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Horoscope language">
            <option value="both">తెలుగు + English</option>
            <option value="te">తెలుగు</option>
            <option value="en">English</option>
          </Form.Select>
          {report && <Button variant="outline-secondary" onClick={reset}>{text(language, 'newChart')}</Button>}
          {report && <Button className="horoscope-download" onClick={download} disabled={downloading}>
            {downloading ? <Spinner size="sm" /> : '⇩'} {text(language, 'download')}
          </Button>}
        </div>
      </header>

      {error && <Alert variant="warning" className="horoscope-alert" dismissible onClose={() => setError('')}>{error}</Alert>}

      {!report ? (
        <section className="horoscope-onboarding">
          <Form className="horoscope-intake" onSubmit={submit}>
            <div className="horoscope-panel-heading">
              <span className="horoscope-step">01</span>
              <div><small>{phrase(language, 'గోప్యం · ఈ బ్రౌజర్‌లోనే', 'PRIVATE · KEPT IN THIS BROWSER')}</small><h2 data-pretext>{text(language, 'details')}</h2></div>
            </div>

            <Form.Group className="horoscope-field-wide">
              <Form.Label>{text(language, 'name')}</Form.Label>
              <Form.Control value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required placeholder={phrase(language, 'నివేదికలో కనిపించే పేరు', 'Name shown on the report')} />
            </Form.Group>

            <div className="horoscope-form-grid">
              <Form.Group>
                <Form.Label>{text(language, 'date')}</Form.Label>
                <Form.Control type="date" value={birthDate} onChange={changeDateOrTime(setBirthDate)} required />
              </Form.Group>
              <Form.Group>
                <Form.Label>{text(language, 'time')}</Form.Label>
                <Form.Control type="time" value={birthTime} onChange={changeDateOrTime(setBirthTime)} required step="60" />
              </Form.Group>
            </div>

            <fieldset className="horoscope-accuracy">
              <legend>{phrase(language, 'జనన సమయంపై నమ్మకం', 'Birth-time confidence')}</legend>
              <label className={timeAccuracy === 'exact' ? 'is-selected' : ''}>
                <input type="radio" name="accuracy" value="exact" checked={timeAccuracy === 'exact'} onChange={() => setTimeAccuracy('exact')} />
                <span><strong>{text(language, 'exact')}</strong><small>{phrase(language, 'ఆసుపత్రి లేదా కుటుంబ ధృవీకరణ', 'Hospital record or confirmed family record')}</small></span>
              </label>
              <label className={timeAccuracy === 'approximate' ? 'is-selected' : ''}>
                <input type="radio" name="accuracy" value="approximate" checked={timeAccuracy === 'approximate'} onChange={() => setTimeAccuracy('approximate')} />
                <span><strong>{text(language, 'approximate')}</strong><small>{phrase(language, 'లగ్న సంధి దగ్గర చక్రాలు మారవచ్చు', 'Charts may change near a Lagna boundary')}</small></span>
              </label>
            </fieldset>

            <Form.Group>
              <Form.Label>{text(language, 'place')}</Form.Label>
              <button type="button" className="horoscope-place-button" onClick={() => setShowLocation(true)}>
                <span aria-hidden="true">⌖</span>
                <span><strong>{birthCity.name}</strong><small>{birthCity.tz} · {Number(birthCity.lat).toFixed(4)}, {Number(birthCity.lng).toFixed(4)}</small></span>
                <b>{phrase(language, 'మార్చండి', 'Change')}</b>
              </button>
            </Form.Group>

            {offsetOptions.length > 1 && (
              <fieldset className="horoscope-offset-choice">
                <legend>{phrase(language, 'గడియార మార్పు ధృవీకరణ', 'Clock-change confirmation required')}</legend>
                <p>{phrase(language, 'ఈ స్థానిక సమయం రెండుసార్లు వచ్చింది. జనన రికార్డులోని UTC భేదాన్ని ఎంచుకోండి.', 'This local time occurred twice. Choose the offset recorded at birth.')}</p>
                {offsetOptions.map((option) => (
                  <label key={option.offset}>
                    <input type="radio" name="offset" value={option.offset} checked={String(selectedOffset) === String(option.offset)} onChange={(event) => setSelectedOffset(event.target.value)} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="horoscope-timezone-proof">
              <span aria-hidden="true">◷</span>
              <p><strong>{timezoneDetails.label}</strong><small>{birthCity.tz} · {phrase(language, 'జనన తేదీకి చారిత్రక DST గణనకు ముందే నిర్ధారించబడుతుంది.', 'Historical DST is resolved for the birth date before calculation.')}</small></p>
            </div>

            {timeAccuracy === 'approximate' && (
              <Alert variant="warning" className="small mb-0">{phrase(language, 'సుమారు సమయం వల్ల లగ్నం, భావాలు, నవాంశం మారవచ్చు. ఈ హెచ్చరిక నివేదికలో కూడా ఉంటుంది.', 'An approximate time can change Lagna, houses and Navamsa. The downloaded report will retain this warning.')}</Alert>
            )}

            <Button type="submit" className="horoscope-calculate" disabled={calculating}>
              {calculating ? <><Spinner size="sm" /> {phrase(language, 'గ్రహ స్థితులు గణిస్తున్నాం…', 'Calculating planetary positions…')}</> : <>{text(language, 'calculate')} <span>→</span></>}
            </Button>
          </Form>

          <aside className="horoscope-intro-panel">
            <span className="horoscope-orbit" aria-hidden="true"><i /><i /><i /></span>
            <div className="horoscope-intro-copy">
              <span className="horoscope-kicker">{phrase(language, 'మీకు లభించేవి', 'WHAT YOU RECEIVE')}</span>
              <h2 data-pretext>{phrase(language, 'పరిశీలించగల జాతకం, రహస్య ఫలితం కాదు.', 'A chart you can inspect, not a black-box reading.')}</h2>
              <ul>
                <li><b>D1 + D9</b><span>{phrase(language, 'దక్షిణ భారత స్థిర-రాశి చక్రాలు', 'South Indian fixed-sign charts')}</span></li>
                <li><b>{phrase(language, '9 గ్రహాలు', '9 Grahas')}</b><span>{phrase(language, 'డిగ్రీలు, భావాలు, నక్షత్రాలు, బలం', 'Degrees, houses, Nakshatras and dignity')}</span></li>
                <li><b>{phrase(language, '120 సంవత్సరాలు', '120 years')}</b><span>{phrase(language, 'వింశోత్తరి మహాదశ, అంతర్దశ కాలక్రమం', 'Vimshottari Mahadasha and Antardasha timeline')}</span></li>
                <li><b>{phrase(language, 'మూల సూచనలు', 'Source labels')}</b><span>{phrase(language, 'ప్రతి యోగం ఎందుకు వచ్చిందో నియమంతో చూపిస్తుంది', 'Every implemented Yoga explains why it appears')}</span></li>
                <li><b>{phrase(language, 'పూర్తి PDF', 'Full PDF')}</b><span>{phrase(language, 'తెలుగు, ఇంగ్లీష్ లేదా ద్విభాషా నివేదిక', 'Telugu, English or bilingual report')}</span></li>
              </ul>
            </div>
            <div className="horoscope-intro-note">
              <strong>{phrase(language, 'ముందు గణన. తర్వాత వ్యాఖ్యానం.', 'Calculation first. Interpretation second.')}</strong>
              <span>{phrase(language, 'జనన వివరాలు ఈ పరికరంలోనే గణించబడతాయి; ప్రొఫైల్‌కు జోడించబడవు, అప్‌లోడ్ కావు.', 'Birth data is processed on this device. It is not added to a profile or uploaded by this page.')}</span>
            </div>
          </aside>
        </section>
      ) : (
        <HoroscopeResults
          report={report}
          language={language}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          selectedDasha={selectedDasha}
          setSelectedDasha={setSelectedDasha}
          download={download}
          downloading={downloading}
        />
      )}

      <BirthLocationPicker show={showLocation} onHide={() => setShowLocation(false)} onSelect={chooseBirthCity} />
    </main>
  );
}

function HoroscopeResults({ report, language, activeSection, setActiveSection, selectedDasha, setSelectedDasha, download, downloading }) {
  const insights = useMemo(() => buildHoroscopeInsights(report), [report]);
  const advanced = useMemo(() => buildAdvancedHoroscope(report), [report]);
  const now = new Date();
  const currentDasha = report.dashas.periods.find((period) => new Date(period.start) <= now && new Date(period.end) > now)
    || report.dashas.periods[0];
  const chosenDasha = report.dashas.periods.find((period) => period.start === selectedDasha) || currentDasha;
  const currentAntardasha = chosenDasha.antardashas.find((period) => new Date(period.start) <= now && new Date(period.end) > now);
  const timezone = report.person.city.tz;
  const sections = ['overview', 'charts', 'chakras', 'star', 'houses', 'planets', 'aspects', 'yogas', 'life', 'predictions', 'dashas', 'timeline', 'report'];
  const ageAt = (value) => Math.max(0, Math.floor((new Date(value) - new Date(report.instant)) / (365.2425 * 86400000)));

  return (
    <section className="horoscope-results">
      <div className="horoscope-result-identity">
        <div>
          <span className="horoscope-kicker">{phrase(language, 'గణించిన జన్మ జాతకం', 'CALCULATED BIRTH CHART')}</span>
          <h2 data-pretext>{report.person.name}</h2>
          <p data-pretext>{formatDate(report.instant, timezone, language, { hour: 'numeric', minute: '2-digit' })} · {report.person.city.name}</p>
        </div>
        <div className="horoscope-result-badges">
          <span>{report.settings.ayanamsa}</span>
          <span>UTC{report.timezone.offset}</span>
          <span>{report.timezone.isDst ? phrase(language, 'జనన సమయంలో DST', 'DST at birth') : phrase(language, 'ప్రామాణిక సమయం', 'Standard time')}</span>
          {report.person.timeAccuracy === 'approximate' && <span className="is-warning">{phrase(language, 'సుమారు జనన సమయం', 'Approximate birth time')}</span>}
        </div>
      </div>

      <nav className="horoscope-result-nav" aria-label="Horoscope sections">
        {sections.map((section) => (
          <button key={section} type="button" className={activeSection === section ? 'is-active' : ''} onClick={() => setActiveSection(section)}>
            {text(language, section)}
          </button>
        ))}
      </nav>

      {activeSection === 'overview' && (
        <div className="horoscope-section-stack">
          <div className="horoscope-summary-grid">
            <SummaryCard label={text(language, 'charts')} note={`${formatZodiacDegree(report.ascendant.longitude)} · ${valueText(language, report.ascendant.nakshatra.name)} ${report.ascendant.nakshatra.pada}`}>
              {valueText(language, report.ascendant.rashi.name)} {phrase(language, 'లగ్నం', 'Lagna')}
            </SummaryCard>
            <SummaryCard label={phrase(language, 'జన్మ రాశి', 'Janma Rashi')} note={`${formatZodiacDegree(report.moon.longitude)} · ${phrase(language, 'భావం', 'House')} ${report.moon.house}`}>
              {valueText(language, report.moon.rashi.name)}
            </SummaryCard>
            <SummaryCard label={phrase(language, 'జన్మ నక్షత్రం', 'Janma Nakshatra')} note={`${phrase(language, 'పాదం', 'Pada')} ${report.moon.nakshatra.pada} · ${valueText(language, report.moon.nakshatra.name)}`}>
              {valueText(language, report.moon.nakshatra.name)}
            </SummaryCard>
            <SummaryCard label={phrase(language, 'ప్రస్తుత మహాదశ', 'Current Mahadasha')} note={`${formatDate(currentDasha.start, timezone, language)} → ${formatDate(currentDasha.end, timezone, language)}`}>
              {currentDasha.lord.symbol} {valueText(language, currentDasha.lord.name)}
            </SummaryCard>
          </div>
          <div className="horoscope-overview-grid">
            <SouthIndianChart report={report} type="d1" language={language} />
            <SouthIndianChart report={report} type="d9" language={language} />
            <article className="horoscope-current-period">
              <span className="horoscope-kicker">{phrase(language, 'ప్రస్తుత జీవిత దశ', 'LIFE PERIOD NOW')}</span>
              <h3>{currentDasha.lord.symbol} {valueText(language, currentDasha.lord.name)} {phrase(language, 'మహాదశ', 'Mahadasha')}</h3>
              {currentAntardasha && <strong>{currentAntardasha.lord.symbol} {valueText(language, currentAntardasha.lord.name)} {phrase(language, 'అంతర్దశ', 'Antardasha')}</strong>}
              <p data-pretext>{valueText(language, dashaInterpretation(report, currentDasha.lord.key))}</p>
              <button type="button" onClick={() => setActiveSection('dashas')}>{phrase(language, 'పూర్తి దశ కాలక్రమం చూడండి', 'View complete Dasha schedule')} →</button>
            </article>
          </div>
        </div>
      )}

      {activeSection === 'charts' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'షోడశ వర్గాలు', 'SHODASHA VARGA SET')}</span><h2>{text(language, 'charts')}</h2></div><p>{phrase(language, 'D1 నుండి D60 వరకు 16 సంప్రదాయ విభాగ చక్రాలు. ప్రతి చక్రం ఏ అంశానికి ఉపయోగిస్తారో స్పష్టంగా చూపిస్తుంది.', 'Sixteen traditional divisional charts from D1 to D60, each labelled with its intended area of use.')}</p></div>
          <div className="horoscope-varga-grid">{advanced.vargas.map((chart) => <article key={chart.key}><SouthIndianChart report={report} chartData={chart} type={chart.key} language={language} compact /><p>{valueText(language, chart.purpose)}</p></article>)}</div>
          <Alert variant="warning" className="mt-3 mb-0 small">{phrase(language, 'D16 నుండి D60 వరకు చక్రాలు జనన సమయానికి అత్యంత సున్నితమైనవి. D60ను చదవడానికి ఖచ్చితమైన, అవసరమైతే శుద్ధి చేసిన జనన సమయం కావాలి.', 'D16 through D60 are highly birth-time sensitive. D60 should only be interpreted with an exact, and when needed rectified, birth time.')}</Alert>
        </section>
      )}

      {activeSection === 'chakras' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'పుట్టిన రోజు గణన పట్టికలు', 'BIRTH-DAY CALCULATION TABLES')}</span><h2>{text(language, 'chakras')}</h2></div><p>{phrase(language, 'పంచాంగం, చంద్ర కుండలి, భావాలు, నవతార, గ్రహ మైత్రి మరియు పారదర్శక బల సూచిక.', 'Panchanga, Chandra Kundli, Bhavas, Navatara, Graha Maitri and a transparent support index.')}</p></div>
          <div className="horoscope-panchanga-strip">
            <SummaryCard label={phrase(language, 'పక్షం', 'Paksha')}>{valueText(language, advanced.panchanga.paksha)}</SummaryCard>
            <SummaryCard label={phrase(language, 'తిథి', 'Tithi')} note={`#${advanced.panchanga.tithiNumber}`}>{valueText(language, advanced.panchanga.tithi)}</SummaryCard>
            <SummaryCard label={phrase(language, 'నిత్య యోగం', 'Nitya Yoga')}>{valueText(language, advanced.panchanga.yoga)}</SummaryCard>
            <SummaryCard label={phrase(language, 'కరణం', 'Karana')}>{valueText(language, advanced.panchanga.karana)}</SummaryCard>
            <SummaryCard label={phrase(language, 'వారం', 'Weekday')}>{advanced.panchanga.weekday}</SummaryCard>
          </div>
          <div className="horoscope-advanced-pair">
            <SouthIndianChart report={report} chartData={advanced.chandraChart} language={language} />
            <div className="horoscope-bhava-table-wrap"><h3>{phrase(language, 'సంపూర్ణ రాశి భావ పట్టిక', 'Whole-sign Bhava Table')}</h3><table><thead><tr><th>{phrase(language, 'భావం', 'House')}</th><th>{phrase(language, 'రాశి', 'Sign')}</th><th>{phrase(language, 'అధిపతి', 'Lord')}</th><th>{phrase(language, 'గ్రహాలు', 'Occupants')}</th></tr></thead><tbody>{advanced.bhavaTable.map((item) => <tr key={item.house}><td>{item.house}</td><td>{valueText(language, item.sign.name)}</td><td>{valueText(language, item.lord.name)}</td><td>{item.occupants.map((planet) => valueText(language, planet.name)).join(', ') || '—'}</td></tr>)}</tbody></table></div>
          </div>
          <div className="horoscope-strength-layout">
            <div><h3>{phrase(language, 'గ్రహ సహాయక బల సూచిక', 'Graha Support Index')}</h3><p className="horoscope-table-note">{valueText(language, advanced.disclaimer)}</p><div className="horoscope-strength-list">{advanced.strengths.map((item) => <article key={item.planet.key}><span>{item.planet.symbol} {valueText(language, item.planet.name)}</span><div><i style={{ width: `${item.total}%` }} /></div><strong>{item.total}/100</strong><small>{phrase(language, `రాశి ${item.dignity} · భావం ${item.house} · స్థితి ${item.condition}`, `Sign ${item.dignity} · house ${item.house} · condition ${item.condition}`)}</small></article>)}</div></div>
            <div><h3>{phrase(language, 'నవతార చక్రం', 'Nav Tara Chakra')}</h3><div className="horoscope-navtara-grid">{advanced.navTara.map((tara) => <article className={`is-${tara.tone}`} key={tara.name.en}><strong>{valueText(language, tara.name)}</strong><span>{tara.stars.map((star) => valueText(language, star.name)).join(' · ')}</span></article>)}</div></div>
          </div>
          <details className="horoscope-friendship"><summary>{phrase(language, 'గ్రహ మైత్రి పట్టిక — సహజ, తాత్కాలిక, పంచధా', 'Graha Maitri table — natural, temporal and compound')}</summary><div>{advanced.friendships.map((row) => <article key={row.key}><strong>{row.planet.symbol} {valueText(language, row.planet.name)}</strong>{row.relations.map((relation) => <span key={relation.key}>{relation.planet.symbol} {valueText(language, relation.planet.name)}<b>{valueText(language, relation.label)}</b><small>{relation.natural > 0 ? '+' : ''}{relation.natural} / {relation.temporal > 0 ? '+' : ''}{relation.temporal}</small></span>)}</article>)}</div></details>
        </section>
      )}

      {activeSection === 'star' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'చంద్ర నక్షత్ర విశ్లేషణ', 'MOON NAKSHATRA READING')}</span><h2>{text(language, 'star')}</h2></div><p>{phrase(language, 'నక్షత్రం, పాదం మరియు నవాంశ వ్యక్తీకరణను విడిగా చూపిస్తుంది.', 'Shows the Nakshatra pattern, Pada and Navamsa expression separately.')}</p></div>
          <div className="horoscope-reading-hero"><span>{report.moon.nakshatra.symbol || '✦'}</span><div><small>{phrase(language, 'జన్మ నక్షత్రం', 'BIRTH STAR')}</small><h3>{valueText(language, insights.nakshatra.name)} · {phrase(language, `${insights.nakshatra.pada}వ పాదం`, `Pada ${insights.nakshatra.pada}`)}</h3><p>{valueText(language, insights.nakshatra.trait)}</p><strong>{valueText(language, insights.nakshatra.padaNote)}</strong></div></div>
        </section>
      )}

      {activeSection === 'houses' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'భావాధిపతి + గ్రహ స్థితి', 'HOUSE LORD + OCCUPANTS')}</span><h2>{text(language, 'houses')}</h2></div><p>{phrase(language, 'ప్రతి భావానికి గణన ఆధారం మరియు సంప్రదాయ ఫలితాన్ని పక్కపక్కన చూపిస్తాం.', 'Every house shows its calculation basis and traditional reading side by side.')}</p></div>
          <div className="horoscope-reading-grid">{insights.houseReadings.map((item) => <article key={item.house}><header><span>{String(item.house).padStart(2, '0')}</span><div><small>{valueText(language, item.sign.name)}</small><h3>{valueText(language, item.theme)}</h3></div></header><b>{phrase(language, 'గణన ఆధారం', 'Calculation basis')}</b><p>{valueText(language, item.evidence)}</p><b>{phrase(language, 'సంప్రదాయ ఫలితం', 'Traditional reading')}</b><p>{valueText(language, item.reading)}</p><b>{phrase(language, 'సులభంగా అర్థం', 'What this means for you')}</b><p className="horoscope-plain-summary">{valueText(language, item.plain)}</p></article>)}</div>
        </section>
      )}

      {activeSection === 'planets' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'నిరయణ గ్రహ స్థితులు', 'SIDEREAL POSITIONS')}</span><h2>{text(language, 'planets')}</h2></div><p>{phrase(language, 'సంపూర్ణ రాశి భావాలు · మధ్యమ రాహు/కేతు · లహిరి / చిత్రపక్ష', 'Whole-sign houses · Mean Rahu/Ketu · Lahiri / Chitrapaksha')}</p></div>
          <div className="horoscope-planet-table-wrap">
            <table className="horoscope-planet-table">
              <thead><tr><th>{phrase(language, 'గ్రహం', 'Graha')}</th><th>{phrase(language, 'రాశి', 'Rashi')}</th><th>{phrase(language, 'డిగ్రీ', 'Degree')}</th><th>{phrase(language, 'భావం', 'House')}</th><th>{phrase(language, 'నక్షత్రం', 'Nakshatra')}</th><th>{phrase(language, 'స్థితి', 'State')}</th></tr></thead>
              <tbody>{report.planets.map((planet) => (
                <tr key={planet.key}>
                  <td><b>{planet.symbol}</b><strong>{valueText(language, planet.name)}</strong></td>
                  <td>{valueText(language, planet.rashi.name)}</td><td>{formatZodiacDegree(planet.longitude)}</td><td>{planet.house}</td>
                  <td>{valueText(language, planet.nakshatra.name)} <small>{phrase(language, 'పాదం', 'Pada')} {planet.nakshatra.pada}</small></td>
                  <td><span className={`horoscope-state is-${planet.dignity}`}>{valueText(language, DIGNITY[planet.dignity])}</span>{planet.retrograde && <small>℞ {phrase(language, 'వక్రగతి', 'Retrograde')}</small>}{planet.combust && <small>{phrase(language, 'అస్తంగత', 'Combust')}</small>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="horoscope-reading-grid horoscope-planet-readings">{insights.planetReadings.map((item) => <article key={`${item.planet.key}-reading`}><header><span>{item.planet.symbol}</span><div><small>{phrase(language, `భావం ${item.planet.house}`, `House ${item.planet.house}`)}</small><h3>{valueText(language, item.planet.name)}</h3></div></header><b>{phrase(language, 'గణన ఆధారం', 'Calculation basis')}</b><p>{valueText(language, item.evidence)}</p><b>{phrase(language, 'సంప్రదాయ ఫలితం', 'Traditional reading')}</b><p>{valueText(language, item.reading)}</p><b>{phrase(language, 'సులభంగా అర్థం', 'What this means for you')}</b><p className="horoscope-plain-summary">{valueText(language, item.plain)}</p></article>)}</div>
        </section>
      )}

      {activeSection === 'aspects' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'పరాశరి గ్రహ దృష్టులు', 'CLASSICAL PARASHARI ASPECTS')}</span><h2>{text(language, 'aspects')}</h2></div><p>{phrase(language, 'సప్తమ దృష్టితో పాటు కుజ, గురు, శని ప్రత్యేక దృష్టులు.', 'Seventh aspects plus the special aspects of Mars, Jupiter and Saturn.')}</p></div>
          <div className="horoscope-aspect-list">{insights.aspects.map((aspect, index) => <article key={`${aspect.planet.key}-${aspect.distance}-${index}`}><span>{aspect.planet.symbol}</span><div><strong>{valueText(language, aspect.planet.name)} → {phrase(language, `${aspect.targetHouse}వ భావం`, `House ${aspect.targetHouse}`)}</strong><p>{phrase(language, `${aspect.distance}వ దృష్టి.`, `${aspect.distance}${aspect.distance === 3 ? 'rd' : 'th'} aspect.`)} {aspect.targets.length ? phrase(language, `అక్కడ ${aspect.targets.map((planet) => planet.name.te).join(', ')} ఉన్నారు.`, `It contacts ${aspect.targets.map((planet) => planet.name.en).join(', ')}.`) : phrase(language, 'ఆ భావంలో గ్రహం లేదు; భావ ఫలితంపై దృష్టి ఉంటుంది.', 'No planet occupies it; the aspect still influences the house.')}</p></div></article>)}</div>
        </section>
      )}

      {activeSection === 'yogas' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'నియమంతో నిర్ధారించిన ఫలితాలు', 'RULE-TRACEABLE RESULTS')}</span><h2>{text(language, 'yogas')}</h2></div><p>{phrase(language, 'స్పష్టమైన అమలు నియమం ఉన్న యోగాలనే చూపిస్తాం.', 'Only combinations covered by an explicit implemented rule are displayed.')}</p></div>
          <div className="horoscope-yoga-grid">
            {report.yogas.length ? report.yogas.map((yoga) => (
              <article className={`horoscope-yoga-card is-${yoga.tone}`} key={yoga.key}>
                <span>{yoga.tone === 'supportive' ? phrase(language, 'కనుగొన్నాం · శుభప్రదం', 'FOUND · SUPPORTIVE') : phrase(language, 'కనుగొన్నాం · మిశ్రమం', 'FOUND · MIXED')}</span>
                <h3>{valueText(language, yoga.name)}</h3>
                <p>{valueText(language, yoga.reason)}</p>
                <b>{phrase(language, 'సులభంగా అర్థం', 'What this means for you')}</b>
                <p className="horoscope-plain-summary">{valueText(language, yoga.summary)}</p>
                <small>{yoga.source}</small>
              </article>
            )) : <div className="horoscope-empty"><strong>{phrase(language, 'అమలు చేసిన యోగ నియమం ఈ చక్రానికి సరిపోలలేదు.', 'No implemented Yoga rule matched this chart.')}</strong><p>{phrase(language, 'దీని అర్థం చక్రంలో యోగాలు లేవని కాదు; ఈ విడుదలలో పరిశీలించిన నియమాలు మాత్రమే కనిపిస్తాయి.', 'This does not mean the chart has no Yogas. It means none of the source-audited rules in this release matched.')}</p></div>}
          </div>
          <div className="horoscope-source-note"><b>{phrase(language, 'వందలాది పేర్లు ఎందుకు లేవు?', 'Why not list hundreds?')}</b><span>{phrase(language, 'సంప్రదాయాలను బట్టి యోగ నిర్వచనాలు మారతాయి. మూలం తెలియని పేర్ల బదులు నియమంతో నిర్ధారించిన ఫలితాలనే చూపిస్తాం.', 'Yoga definitions differ between traditions. We show fewer rules with their detection basis instead of generating untraceable names.')}</span></div>
        </section>
      )}

      {activeSection === 'dashas' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, '120 సంవత్సరాల క్రమం', '120-YEAR SEQUENCE')}</span><h2>{text(language, 'dashas')}</h2></div><p>{phrase(language, 'వింశోత్తరి · 365.2425-రోజుల సివిల్ సంవత్సరం', report.settings.dasha)}</p></div>
          <div className="horoscope-dasha-layout">
            <div className="horoscope-dasha-list">
              {report.dashas.periods.map((period) => (
                <button key={period.start} type="button" className={chosenDasha.start === period.start ? 'is-active' : ''} onClick={() => setSelectedDasha(period.start)}>
                  <span>{period.lord.symbol}</span><strong>{valueText(language, period.lord.name)}</strong><small>{formatDate(period.start, timezone, language)} – {formatDate(period.end, timezone, language)}</small>
                </button>
              ))}
            </div>
            <article className="horoscope-dasha-detail">
              <span className="horoscope-kicker">{phrase(language, 'మహాదశ వివరం', 'MAHADASHA DETAIL')}</span>
              <h3>{chosenDasha.lord.symbol} {valueText(language, chosenDasha.lord.name)}</h3>
              <p>{valueText(language, dashaInterpretation(report, chosenDasha.lord.key))}</p>
              <b>{phrase(language, 'సులభంగా అర్థం', 'What this means for you')}</b>
              <p className="horoscope-plain-summary">{valueText(language, dashaPlainSummary(report, chosenDasha.lord.key))}</p>
              {insights.activePeriods.pratyantara && <div className="horoscope-active-periods"><span>{phrase(language, 'ప్రస్తుతం నడుస్తున్న క్రమం', 'ACTIVE PERIOD NOW')}</span><strong>{valueText(language, insights.activePeriods.mahadasha.lord.name)} → {valueText(language, insights.activePeriods.antardasha.lord.name)} → {valueText(language, insights.activePeriods.pratyantara.lord.name)}</strong><small>{phrase(language, 'మహాదశ · అంతర్దశ · ప్రత్యంతర దశ', 'Mahadasha · Antardasha · Pratyantara')}</small></div>}
              <h4>{phrase(language, 'అంతర్దశ కాలక్రమం మరియు ఫలితం', 'Antardasha schedule and reading')}</h4>
              <div className="horoscope-antardasha-list">
                {chosenDasha.antardashas.map((period) => (
                  <div key={`${period.lord.key}-${period.start}`} className={new Date(period.start) <= now && new Date(period.end) > now ? 'is-current' : ''}>
                    <strong>{period.lord.symbol} {valueText(language, period.lord.name)}</strong>
                    <span>{formatDate(period.start, timezone, language)} → {formatDate(period.end, timezone, language)}</span>
                    <p>{valueText(language, dashaInterpretation(report, period.lord.key))}</p>
                    <small className="horoscope-plain-summary">{valueText(language, dashaPlainSummary(report, period.lord.key))}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      {activeSection === 'life' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'వ్యక్తిగత అంశాల విశ్లేషణ', 'PERSONALISED LIFE-AREA READING')}</span><h2>{text(language, 'life')}</h2></div><p>{phrase(language, 'సంబంధిత భావాలు, భావాధిపతులు మరియు సహజ కారకులను కలిపి చదువుతుంది.', 'Combines the relevant houses, their lords and natural significators.')}</p></div>
          <div className="horoscope-reading-grid">{insights.lifeAreas.map((item) => <article key={item.key}><header><span>✦</span><div><h3>{valueText(language, item.title)}</h3></div></header><b>{phrase(language, 'గణన ఆధారం', 'Calculation basis')}</b><p>{valueText(language, item.evidence)}</p><b>{phrase(language, 'సంప్రదాయ విశ్లేషణ', 'Traditional analysis')}</b><p>{valueText(language, item.reading)}</p><b>{phrase(language, 'సాధారణ భాషలో సారాంశం', 'Plain-language summary')}</b><p className="horoscope-plain-summary">{valueText(language, item.plain)}</p></article>)}</div>
        </section>
      )}

      {activeSection === 'predictions' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'సాధారణ భాషలో వ్యక్తిగత విశ్లేషణ', 'PLAIN-LANGUAGE PERSONALISED READING')}</span><h2>{text(language, 'predictions')}</h2></div><p>{phrase(language, 'ప్రతి అధ్యాయం వెనుక భావాలు, కారకులు, భావాధిపతులు మరియు దశా కాల సూచన కనిపిస్తుంది.', 'Every chapter exposes the houses, significators, house lords and Dasha timing used behind the reading.')}</p></div>
          <div className="horoscope-prediction-grid">{advanced.predictions.map((item, index) => <article key={item.key}><header><span>{String(index + 1).padStart(2, '0')}</span><h3>{valueText(language, item.title)}</h3></header><b>{phrase(language, 'గణన ఆధారం', 'Calculation basis')}</b><p>{valueText(language, item.evidence)}</p><b>{phrase(language, 'సాధారణ భాషలో పఠనం', 'Plain-language reading')}</b><p>{valueText(language, item.plain)}</p><footer><strong>◷ {phrase(language, 'కాల సూచన', 'Timing')}</strong><span>{valueText(language, item.timing)}</span></footer></article>)}</div>
          <Alert variant="warning" className="mt-3 mb-0">{phrase(language, 'ఈ ఫలితాలు సంప్రదాయ జ్యోతిష వ్యాఖ్యానాలు; ఖచ్చిత సంఘటనలు, వైద్య పరిస్థితులు లేదా వివాహ ఫలితాలకు హామీ కావు.', 'These are traditional astrological interpretations, not guarantees of exact events, medical conditions or relationship outcomes.')}</Alert>
        </section>
      )}

      {activeSection === 'timeline' && (
        <section className="horoscope-content-section">
          <div className="horoscope-section-heading"><div><span className="horoscope-kicker">{phrase(language, 'సాంప్రదాయ దశా విశ్లేషణ', 'TRADITIONAL PERIOD READING')}</span><h2>{text(language, 'timeline')}</h2></div><p>{phrase(language, 'దశా తేదీలు గణనాత్మకమైనవి. వ్యాఖ్యానం సంప్రదాయ సూచన మాత్రమే; ఘటనకు హామీ కాదు.', 'Dasha dates are deterministic. Interpretive text is traditional guidance, not a guaranteed event.')}</p></div>
          <div className="horoscope-life-timeline">
            {report.dashas.periods.map((period) => (
              <article key={period.start} className={period === currentDasha ? 'is-current' : ''}>
                <div className="horoscope-timeline-age"><span>{phrase(language, 'వయస్సు', 'AGE')}</span><strong>{ageAt(period.start)}<small>–{ageAt(period.end)}</small></strong></div>
                <div className="horoscope-timeline-copy">
                  <span>{formatDate(period.start, timezone, language)} → {formatDate(period.end, timezone, language)}</span>
                  <h3>{period.lord.symbol} {valueText(language, period.lord.name)} {phrase(language, 'మహాదశ', 'Mahadasha')}</h3>
                  <p>{valueText(language, dashaInterpretation(report, period.lord.key))}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === 'report' && (
        <section className="horoscope-content-section">
          <div className="horoscope-report-hero">
            <div><span className="horoscope-kicker">{phrase(language, 'A4 · బహుళ పేజీలు · మూల సూచనలతో', 'A4 · MULTI-PAGE · SOURCE-LABELLED')}</span><h2>{text(language, 'report')}</h2><p>{phrase(language, 'వెబ్‌సైట్‌లోని జనన వివరాలు, 16 విభాగ చక్రాలు, పంచాంగం, చంద్ర కుండలి, భావ/గ్రహ పట్టికలు, నవతార, మైత్రి, యోగాలు, విస్తృత ఫలితాలు మరియు పూర్తి దశలు PDFలో కూడా ఉంటాయి.', 'The PDF mirrors the website: birth facts, 16 divisional charts, Panchanga, Chandra Kundli, Bhava and planet tables, Navatara, Maitri, Yogas, full predictions and complete Dashas.')}</p></div>
            <Button onClick={download} disabled={downloading}>{downloading ? <Spinner size="sm" /> : '⇩'} {text(language, 'download')}</Button>
          </div>
          <div className="horoscope-method-grid">
            {Object.entries(report.settings).map(([key, value]) => <MethodChip key={key} label={settingLabel(language, key)} value={settingValue(language, key, value)} />)}
            <MethodChip label={phrase(language, 'జనన సమయ అయనాంశం', 'Ayanamsa at birth')} value={`${report.ayanamsaDegrees.toFixed(6)}°`} />
            <MethodChip label={phrase(language, 'చారిత్రక స్థానిక సమయం', 'Historical local time')} value={`${report.timezone.name} · UTC${report.timezone.offset}`} />
          </div>
          <div className="horoscope-methodology">
            <h3>{phrase(language, 'గణన మరియు మూలాల పారదర్శకత', 'Calculation and source transparency')}</h3>
            <p>{phrase(language, 'గ్రహ దీర్ఘాంశాలు Astronomy Engine భూకేంద్ర దృశ్య స్థితులను తీసుకొని లహిరి అయనాంశానికి మార్చబడతాయి. లగ్నంలో స్థానిక నక్షత్ర సమయం, జనన కోఆర్డినేట్లు, క్రాంతివృత్త వంగుతనాన్ని ఉపయోగిస్తాం. వ్యాఖ్యాన నియమాలు ఖగోళ గణనల నుండి వేరుగా ఉంటాయి.', 'Planetary longitudes use Astronomy Engine geocentric apparent positions, converted to the documented Lahiri approximation. Ascendant uses local sidereal time, birth coordinates and obliquity. Interpretive rules are kept separate from astronomical calculations.')}</p>
            <p>{valueText(language, interpretationMethod)}</p>
            <div><a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine documentation ↗</a><a href="https://www.iana.org/time-zones" target="_blank" rel="noreferrer">IANA timezone data ↗</a><a href="https://vedastro.org/OpenSource.html" target="_blank" rel="noreferrer">VedAstro open-source reference ↗</a></div>
            <Alert variant="warning" className="mt-3 mb-0">{phrase(language, 'జ్యోతిష వ్యాఖ్యానాలు సంప్రదాయ సూచనలు; నిర్దిష్ట ఘటనలకు హామీ ఇవ్వలేవు. వైద్య, న్యాయ, ఆర్థిక సలహాకు ప్రత్యామ్నాయంగా వాడకండి.', 'Astrological interpretations are traditional and cannot guarantee specific events. Do not use them as a substitute for medical, legal or financial advice.')}</Alert>
          </div>
        </section>
      )}
    </section>
  );
}

export default Horoscope;
