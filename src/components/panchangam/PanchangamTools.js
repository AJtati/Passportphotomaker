import React, { useEffect, useState } from 'react';
import { Accordion, Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { fetchAnniversaries, fetchFestivals, fetchMuhurtam, fetchNakshatra } from './panchangamApi';
import { bilingual, formatLongDate, formatTime } from './helpers';

const LoadingButton = ({ loading, children, ...props }) => (
  <Button {...props} disabled={loading || props.disabled}>
    {loading && <Spinner size="sm" className="me-2" />}
    {children}
  </Button>
);

function PanchangamTools({ city, selectedDate, language }) {
  const phrase = (te, en) => bilingual({ te, en }, language);
  const selectedYear = Number(selectedDate.slice(0, 4));
  const [festivalYear, setFestivalYear] = useState(selectedYear);
  const [festivals, setFestivals] = useState(null);
  const [festivalLoading, setFestivalLoading] = useState(false);
  const [muhurtamFrom, setMuhurtamFrom] = useState(selectedDate);
  const [muhurtamDays, setMuhurtamDays] = useState(7);
  const [muhurtam, setMuhurtam] = useState(null);
  const [muhurtamLoading, setMuhurtamLoading] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('06:00');
  const [nakshatra, setNakshatra] = useState(null);
  const [nakshatraLoading, setNakshatraLoading] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [anniversaries, setAnniversaries] = useState(null);
  const [anniversaryLoading, setAnniversaryLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFestivals(null);
    setFestivalYear(selectedYear);
  }, [city.lat, city.lng, city.tz, selectedYear]);

  const run = async (loader, setLoading, setResult) => {
    setLoading(true);
    setError('');
    try {
      const response = await loader();
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.message || 'This tool is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const festivalItems = festivals?.festivals || [];
  const muhurtamWindows = muhurtam?.windows || (Array.isArray(muhurtam) ? muhurtam : []);

  const openHoroscope = () => {
    try {
      sessionStorage.setItem('horoscope-language', language);
    } catch {
      // Navigation must still work when browser storage is unavailable.
    }
    window.location.hash = '/horoscope';
  };

  const openPersonalMuhurtam = () => {
    try {
      sessionStorage.setItem('muhurtham-language', language);
    } catch {
      // Navigation must still work when browser storage is unavailable.
    }
    window.location.hash = '/muhurtham';
  };

  const openMarriageMatch = () => {
    try {
      sessionStorage.setItem('marriage-language', language);
    } catch {
      // Navigation must still work when browser storage is unavailable.
    }
    window.location.hash = '/marriage-match';
  };

  return (
    <section className="panchangam-tools-section">
      <div className="panchangam-section-heading">
        <div>
          <span className="panchangam-kicker">{phrase('ఐచ్ఛికం', 'Optional')}</span>
          <h2>{phrase('మరిన్ని పంచాంగ సాధనాలు', 'More Panchangam tools')}</h2>
        </div>
        <p>{phrase('మీకు అవసరమైన సాధనాన్ని మాత్రమే తెరవండి. ప్రతి గణనకు ఎంచుకున్న స్థానం ఉపయోగించబడుతుంది.', 'Open only what you need. Your selected location is used for every calculation.')}</p>
      </div>
      {error && <Alert variant="warning" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Accordion className="panchangam-tools">
        <Accordion.Item eventKey="festivals">
          <Accordion.Header>✦ {phrase('వార్షిక పండుగల క్యాలెండర్', 'Annual festival calendar')}</Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">{phrase(`${city.name} స్థానిక పంచాంగం ప్రకారం తేదీలు గణించబడతాయి. స్థానం మారితే ఫలితాలు నవీకరించబడతాయి.`, `Dates are calculated for ${city.name} and refresh when the selected location changes.`)}</p>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchFestivals(festivalYear, city), setFestivalLoading, setFestivals);
            }} className="panchangam-inline-form">
              <Form.Group>
                <Form.Label>{phrase('సంవత్సరం', 'Year')}</Form.Label>
                <Form.Control type="number" min="1900" max="2200" value={festivalYear} onChange={(event) => setFestivalYear(event.target.value)} />
              </Form.Group>
              <LoadingButton type="submit" loading={festivalLoading}>{phrase('పండుగలు చూపించండి', 'Show festivals')}</LoadingButton>
            </Form>
            {festivalItems.length > 0 && (
              <div className="panchangam-tool-results">
                {festivalItems.map((festival, index) => (
                  <div className="panchangam-result-row" key={`${festival.date}-${festival.en}-${index}`}>
                    <time>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${festival.date}T12:00:00`))}</time>
                    <span><strong>{bilingual(festival, language)}</strong>{festival.description && <small>{bilingual(festival.description, language)}</small>}</span>
                  </div>
                ))}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="muhurtam">
          <Accordion.Header>◇ {phrase('ముహూర్త అన్వేషణ', 'Muhurtam finder')}</Accordion.Header>
          <Accordion.Body>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchMuhurtam(muhurtamFrom, muhurtamDays, city), setMuhurtamLoading, setMuhurtam);
            }}>
              <Row className="g-3 align-items-end">
                <Col md={6}><Form.Group><Form.Label>{phrase('ప్రారంభ తేదీ', 'Start date')}</Form.Label><Form.Control type="date" required value={muhurtamFrom} onChange={(event) => setMuhurtamFrom(event.target.value)} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>{phrase('వెతకాల్సిన రోజులు', 'Search days')}</Form.Label><Form.Select value={muhurtamDays} onChange={(event) => setMuhurtamDays(event.target.value)}><option value="1">{phrase('ఒక రోజు', '1 day')}</option><option value="7">{phrase('7 రోజులు', '7 days')}</option><option value="14">{phrase('14 రోజులు', '14 days')}</option><option value="30">{phrase('30 రోజులు', '30 days')}</option></Form.Select></Form.Group></Col>
                <Col md={3}><LoadingButton className="w-100" type="submit" loading={muhurtamLoading}>{phrase('సమయాలు కనుగొనండి', 'Find times')}</LoadingButton></Col>
              </Row>
            </Form>
            {muhurtam && (
              <div className="panchangam-tool-results">
                {muhurtamWindows.length ? muhurtamWindows.map((window, index) => (
                  <div className="panchangam-result-row" key={`${window.date}-${window.start}-${index}`}>
                    <time>{formatLongDate(window.date)}</time>
                    <span><strong>{formatTime(window.start, city.tz)} – {formatTime(window.end, city.tz)}</strong><small>{bilingual(window.tithi, language)} · {bilingual(window.nakshatra, language)}</small></span>
                  </div>
                )) : <p className="panchangam-empty-copy">{phrase('ఈ పరిధిలో అనుకూల సమయాలు కనుగొనబడలేదు.', 'No suitable windows were found in this range.')}</p>}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="nakshatra">
          <Accordion.Header>★ {phrase('జన్మ నక్షత్ర అన్వేషణ', 'Janma Nakshatra finder')}</Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">{phrase(`జన్మస్థలం ప్రస్తుతం ${city.name}గా ఉంది. అవసరమైతే ముందుగా పేజీ స్థానాన్ని మార్చండి.`, `Birth place is currently set to ${city.name}. Change the page location first if needed.`)}</p>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchNakshatra(birthDate, birthTime, city), setNakshatraLoading, setNakshatra);
            }}>
              <Row className="g-3 align-items-end">
                <Col md={5}><Form.Group><Form.Label>{phrase('జనన తేదీ', 'Birth date')}</Form.Label><Form.Control type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>{phrase('జనన సమయం', 'Birth time')}</Form.Label><Form.Control type="time" required value={birthTime} onChange={(event) => setBirthTime(event.target.value)} /></Form.Group></Col>
                <Col md={3}><LoadingButton className="w-100" type="submit" loading={nakshatraLoading}>{phrase('గణించండి', 'Calculate')}</LoadingButton></Col>
              </Row>
            </Form>
            {nakshatra && (
              <div className="panchangam-tool-answer">
                <span>{phrase('జన్మ నక్షత్రం', 'Janma Nakshatra')}</span>
                <strong>{bilingual(nakshatra.janmaNakshatra || nakshatra.nakshatra, language)} · {phrase('పాదం', 'Pada')} {nakshatra.janmaNakshatra?.pada || nakshatra.pada}</strong>
                <small>{bilingual(nakshatra.janmaRaasi || nakshatra.raasi, language)}</small>
                {nakshatra.tarabalam && <small>{phrase('ఈ రోజు', 'Today')}: {bilingual(nakshatra.tarabalam, language)}</small>}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="anniversary">
          <Accordion.Header>◷ {phrase('తిథి వార్షికోత్సవ అన్వేషణ', 'Tithi anniversary finder')}</Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">{phrase(`${city.name}లో తదుపరి ఐదు సంవత్సరాలకు సంబంధించిన చంద్ర తిథి తేదీలను కనుగొనండి.`, `Find the corresponding lunar Tithi dates for the next five years at ${city.name}.`)}</p>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchAnniversaries(anniversaryDate, 5, city), setAnniversaryLoading, setAnniversaries);
            }} className="panchangam-inline-form">
              <Form.Group><Form.Label>{phrase('అసలు గ్రెగోరియన్ తేదీ', 'Original Gregorian date')}</Form.Label><Form.Control type="date" required value={anniversaryDate} onChange={(event) => setAnniversaryDate(event.target.value)} /></Form.Group>
              <LoadingButton type="submit" loading={anniversaryLoading}>{phrase('తేదీలు కనుగొనండి', 'Find dates')}</LoadingButton>
            </Form>
            {anniversaries && (
              <div className="panchangam-tool-results">
                <div className="panchangam-tool-answer">
                  <span>{phrase('అసలు తిథి', 'Original Tithi')}</span>
                  <strong>{bilingual(anniversaries.tithiIdentity?.masa, language)} · {bilingual(anniversaries.tithiIdentity?.tithi, language)}</strong>
                </div>
                {anniversaries.occurrences?.map((occurrence) => (
                  <div className="panchangam-result-row" key={occurrence.year}>
                    <time>{occurrence.year}</time>
                    <span><strong>{occurrence.gregorianFormatted || formatLongDate(occurrence.date)}</strong><small>{occurrence.teluguFormatted}</small></span>
                  </div>
                ))}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <button type="button" className="panchangam-horoscope-launch panchangam-muhurtham-launch" onClick={openPersonalMuhurtam}>
        <span className="panchangam-horoscope-mark" aria-hidden="true">◇</span>
        <span className="panchangam-horoscope-copy">
          <small>{phrase('వ్యక్తిగత + కుటుంబ ముహూర్తం', 'PERSONAL + FAMILY MUHURTHAM')}</small>
          <strong>{phrase('వ్యక్తిగత ముహూర్తం', 'Personal Muhurtham')}</strong>
          <span>{phrase('తారాబలం, చంద్రబలం, హోరా, లగ్నం, కుటుంబ అనుకూలతతో గృహ ప్రవేశ సమయాలు', 'Griha Pravesham timings using Tarabala, Chandrabala, Hora, Lagna and family compatibility')}</span>
        </span>
        <span className="panchangam-horoscope-action">{phrase('ముహూర్తం కనుగొనండి', 'Find Muhurtham')} <b aria-hidden="true">→</b></span>
      </button>
      <button type="button" className="panchangam-horoscope-launch" onClick={openHoroscope}>
        <span className="panchangam-horoscope-mark" aria-hidden="true">✦</span>
        <span className="panchangam-horoscope-copy">
          <small>{phrase('వ్యక్తిగత జ్యోతిషం', 'PERSONAL ASTROLOGY')}</small>
          <strong>{phrase('జన్మ జాతకం', 'Birth Horoscope')}</strong>
          <span>{phrase('దక్షిణ భారత చక్రాలు, ధృవీకరించిన యోగాలు, వింశోత్తరి దశలు, జీవిత కాలక్రమం', 'South Indian charts, verified Yogas, Vimshottari Dashas and life timeline')}</span>
        </span>
        <span className="panchangam-horoscope-action">{phrase('జాతకం తెరవండి', 'Open Horoscope')} <b aria-hidden="true">→</b></span>
      </button>
      <button type="button" className="panchangam-horoscope-launch panchangam-marriage-launch" onClick={openMarriageMatch}>
        <span className="panchangam-horoscope-mark" aria-hidden="true">♡</span>
        <span className="panchangam-horoscope-copy">
          <small>{phrase('దక్షిణ భారత వివాహ జ్యోతిషం', 'SOUTH INDIAN MARRIAGE ASTROLOGY')}</small>
          <strong>{phrase('వివాహ జాతక సరిపోలిక', 'Marriage Horoscope Match')}</strong>
          <span>{phrase('10 పొరుత్తాలు, 36 గుణాలు, D1/D9 చక్రాలు, కుజ/పాప సామ్యం మరియు దశా సంధి', '10 Poruthams, 36 Gunas, D1/D9 charts, Kuja/Papa balance and Dasha Sandhi')}</span>
        </span>
        <span className="panchangam-horoscope-action">{phrase('సరిపోలిక తెరవండి', 'Open Match')} <b aria-hidden="true">→</b></span>
      </button>
    </section>
  );
}

export default PanchangamTools;
