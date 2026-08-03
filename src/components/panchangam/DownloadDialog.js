import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { fetchFestivals, fetchYear } from './panchangamApi';
import { downloadPanchangam } from './panchangamExport';
import { bilingual, getTimeZoneDetails } from './helpers';

function DownloadDialog({ show, onHide, view, language, day, monthData, city, year }) {
  const phrase = (te, en) => bilingual({ te, en }, language);
  const [content, setContent] = useState(view);
  const [format, setFormat] = useState('PDF');
  const [exportLanguage, setExportLanguage] = useState(language);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const timeZoneDetails = getTimeZoneDetails(city.tz, day?.sunrise || new Date());

  useEffect(() => {
    if (show) {
      setContent(view);
      setFormat('PDF');
      setExportLanguage(language);
      setError('');
      setProgress('');
    }
  }, [show, view, language]);

  const handleDownload = async () => {
    const needsDay = ['day', 'hora', 'lagna', 'lagna-month'].includes(content);
    if ((needsDay && !day) || (content === 'month' && !monthData)) {
      setError(`Open the ${content} view once before downloading it.`);
      return;
    }
    setWorking(true);
    setError('');
    try {
      let yearMonths;
      let festivalData;
      if (content === 'year') {
        const response = await fetchYear(year, city, (month, completed, total) =>
          setProgress(`Loading month ${month} of 12 · ${completed} of ${total} days…`)
        );
        yearMonths = response.data;
      }
      if (content === 'festivals') {
        setProgress(`Loading location-aware festivals for ${year}…`);
        const response = await fetchFestivals(year, city);
        festivalData = response.data;
      }
      await downloadPanchangam({
        content,
        format,
        language: exportLanguage,
        day,
        monthData,
        yearMonths,
        festivalData,
        year,
        city,
        onProgress: content === 'year' || content === 'lagna-year'
          ? (month) => setProgress(`Rendering month ${month} of 12…`)
          : undefined,
      });
      onHide();
    } catch (downloadError) {
      setError(downloadError.message || 'The calendar could not be exported.');
    } finally {
      setWorking(false);
      setProgress('');
    }
  };

  return (
    <Modal show={show} onHide={working ? undefined : onHide} centered className="panchangam-modal">
      <Modal.Header closeButton={!working}>
        <Modal.Title>{phrase('పంచాంగం డౌన్‌లోడ్', 'Download Panchangam')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        <Form.Group className="mb-3">
          <Form.Label>{phrase('క్యాలెండర్ విషయం', 'Calendar content')}</Form.Label>
          <Form.Select value={content} onChange={(event) => setContent(event.target.value)} disabled={working}>
            <optgroup label={phrase('పంచాంగ క్యాలెండర్', 'Panchangam calendar')}>
              <option value="day">{phrase('ఎంచుకున్న రోజు', 'Selected day')}</option>
              <option value="month">{phrase('పూర్తి నెల', 'Complete month')}</option>
              <option value="year">{phrase(`పూర్తి సంవత్సరం (${year})`, `Complete year (${year})`)}</option>
              <option value="festivals">{phrase(`పండుగల క్యాలెండర్ (${year})`, `Festival calendar (${year})`)}</option>
            </optgroup>
            <optgroup label={phrase('సంప్రదాయ సమయాలు', 'Traditional timings')}>
              <option value="hora">{phrase('శుభ హోరా · ఎంచుకున్న తేదీ', 'Hora · Selected date')}</option>
              <option value="lagna">{phrase('ఉదయ లగ్నం · ఎంచుకున్న తేదీ', 'Udaya Lagna · Selected date')}</option>
              <option value="lagna-month">{phrase('ఉదయ లగ్నం · పూర్తి నెల', 'Udaya Lagna · Complete month')}</option>
              <option value="lagna-year">{phrase(`ఉదయ లగ్నం · పూర్తి సంవత్సరం (${year})`, `Udaya Lagna · Complete year (${year})`)}</option>
            </optgroup>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>{phrase('ఫైల్ రూపం', 'File format')}</Form.Label>
          <div className="panchangam-choice-grid">
            {['PDF', 'PNG', 'JPG'].map((option) => (
              <Button
                key={option}
                variant={format === option ? 'primary' : 'outline-secondary'}
                onClick={() => setFormat(option)}
                disabled={working}
              >
                {option}
              </Button>
            ))}
          </div>
        </Form.Group>
        <Form.Group>
          <Form.Label>{phrase('భాష', 'Language')}</Form.Label>
          <Form.Select value={exportLanguage} onChange={(event) => setExportLanguage(event.target.value)} disabled={working}>
            <option value="both">Telugu + English</option>
            <option value="te">Telugu</option>
            <option value="en">English</option>
          </Form.Select>
        </Form.Group>
        <div className="panchangam-export-note">
          {content === 'festivals' ? `A3 landscape location-aware festival calendar for ${year}`
            : content === 'lagna-year'
            ? (format === 'PDF' ? `12-page A3 landscape Lagna timetable for ${year}` : `ZIP containing 12 monthly Lagna ${format} timetables for ${year}`)
            : content === 'lagna-month' ? 'A3 landscape complete monthly Lagna timetable'
            : content === 'lagna' ? 'A4 portrait date-wise Udaya Lagna · Lahiri/Chitra Paksha'
            : content === 'year'
            ? (format === 'PDF' ? `12-page A3 landscape calendar for ${year}` : `ZIP containing 12 detailed monthly ${format} calendars for ${year}`)
            : content === 'month' ? 'A3 landscape detailed calendar' : content === 'hora' ? 'A4 portrait date-wise Hora timings · Complete boundary times' : 'A4 portrait day sheet'} · Calculated for {city.name} · {timeZoneDetails.label}
        </div>
        {working && progress && <div className="panchangam-export-progress" aria-live="polite">{progress}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={working}>{phrase('రద్దు', 'Cancel')}</Button>
        <Button onClick={handleDownload} disabled={working}>
          {working
            ? <><Spinner size="sm" className="me-2" />{phrase('సిద్ధం చేస్తోంది…', 'Preparing…')}</>
            : (content === 'year' || content === 'lagna-year') && format !== 'PDF' ? phrase('ZIP డౌన్‌లోడ్', 'Download ZIP') : phrase(`${format} డౌన్‌లోడ్`, `Download ${format}`)}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DownloadDialog;
