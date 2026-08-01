import React, { useState } from 'react';
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

  return (
    <section className="panchangam-tools-section">
      <div className="panchangam-section-heading">
        <div>
          <span className="panchangam-kicker">Optional</span>
          <h2>More Panchangam tools</h2>
        </div>
        <p>Open only what you need. Your selected location is used for every calculation.</p>
      </div>
      {error && <Alert variant="warning" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Accordion className="panchangam-tools">
        <Accordion.Item eventKey="festivals">
          <Accordion.Header>✦ Annual festival calendar</Accordion.Header>
          <Accordion.Body>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchFestivals(festivalYear, city), setFestivalLoading, setFestivals);
            }} className="panchangam-inline-form">
              <Form.Group>
                <Form.Label>Year</Form.Label>
                <Form.Control type="number" min="1900" max="2200" value={festivalYear} onChange={(event) => setFestivalYear(event.target.value)} />
              </Form.Group>
              <LoadingButton type="submit" loading={festivalLoading}>Show festivals</LoadingButton>
            </Form>
            {festivalItems.length > 0 && (
              <div className="panchangam-tool-results">
                {festivalItems.map((festival, index) => (
                  <div className="panchangam-result-row" key={`${festival.date}-${festival.en}-${index}`}>
                    <time>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${festival.date}T12:00:00`))}</time>
                    <span><strong>{bilingual(festival, language)}</strong>{festival.description?.en && <small>{festival.description.en}</small>}</span>
                  </div>
                ))}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="muhurtam">
          <Accordion.Header>◇ Muhurtam finder</Accordion.Header>
          <Accordion.Body>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchMuhurtam(muhurtamFrom, muhurtamDays, city), setMuhurtamLoading, setMuhurtam);
            }}>
              <Row className="g-3 align-items-end">
                <Col md={6}><Form.Group><Form.Label>Start date</Form.Label><Form.Control type="date" required value={muhurtamFrom} onChange={(event) => setMuhurtamFrom(event.target.value)} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>Search days</Form.Label><Form.Select value={muhurtamDays} onChange={(event) => setMuhurtamDays(event.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></Form.Select></Form.Group></Col>
                <Col md={3}><LoadingButton className="w-100" type="submit" loading={muhurtamLoading}>Find times</LoadingButton></Col>
              </Row>
            </Form>
            {muhurtam && (
              <div className="panchangam-tool-results">
                {muhurtamWindows.length ? muhurtamWindows.map((window, index) => (
                  <div className="panchangam-result-row" key={`${window.date}-${window.start}-${index}`}>
                    <time>{formatLongDate(window.date)}</time>
                    <span><strong>{formatTime(window.start, city.tz)} – {formatTime(window.end, city.tz)}</strong><small>{bilingual(window.tithi, language)} · {bilingual(window.nakshatra, language)}</small></span>
                  </div>
                )) : <p className="panchangam-empty-copy">No suitable windows were found in this range.</p>}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="nakshatra">
          <Accordion.Header>★ Janma Nakshatra finder</Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">Birth place is currently set to {city.name}. Change the page location first if needed.</p>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchNakshatra(birthDate, birthTime, city), setNakshatraLoading, setNakshatra);
            }}>
              <Row className="g-3 align-items-end">
                <Col md={5}><Form.Group><Form.Label>Birth date</Form.Label><Form.Control type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>Birth time</Form.Label><Form.Control type="time" required value={birthTime} onChange={(event) => setBirthTime(event.target.value)} /></Form.Group></Col>
                <Col md={3}><LoadingButton className="w-100" type="submit" loading={nakshatraLoading}>Calculate</LoadingButton></Col>
              </Row>
            </Form>
            {nakshatra && (
              <div className="panchangam-tool-answer">
                <span>Janma Nakshatra</span>
                <strong>{bilingual(nakshatra.janmaNakshatra || nakshatra.nakshatra, language)} · Pada {nakshatra.janmaNakshatra?.pada || nakshatra.pada}</strong>
                <small>{bilingual(nakshatra.janmaRaasi || nakshatra.raasi, language)}</small>
                {nakshatra.tarabalam && <small>Today: {bilingual(nakshatra.tarabalam, language)}</small>}
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="anniversary">
          <Accordion.Header>◷ Tithi anniversary finder</Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">Find the corresponding lunar Tithi dates for the next five years at {city.name}.</p>
            <Form onSubmit={(event) => {
              event.preventDefault();
              run(() => fetchAnniversaries(anniversaryDate, 5, city), setAnniversaryLoading, setAnniversaries);
            }} className="panchangam-inline-form">
              <Form.Group><Form.Label>Original Gregorian date</Form.Label><Form.Control type="date" required value={anniversaryDate} onChange={(event) => setAnniversaryDate(event.target.value)} /></Form.Group>
              <LoadingButton type="submit" loading={anniversaryLoading}>Find dates</LoadingButton>
            </Form>
            {anniversaries && (
              <div className="panchangam-tool-results">
                <div className="panchangam-tool-answer">
                  <span>Original Tithi</span>
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
    </section>
  );
}

export default PanchangamTools;
