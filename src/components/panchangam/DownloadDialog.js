import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { fetchYear } from './panchangamApi';
import { downloadPanchangam } from './panchangamExport';
import { getTimeZoneDetails } from './helpers';

function DownloadDialog({ show, onHide, view, language, day, monthData, city, year }) {
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
    if (((content === 'day' || content === 'hora') && !day) || (content === 'month' && !monthData)) {
      setError(`Open the ${content} view once before downloading it.`);
      return;
    }
    setWorking(true);
    setError('');
    try {
      let yearMonths;
      if (content === 'year') {
        const response = await fetchYear(year, city, (month, completed, total) =>
          setProgress(`Loading month ${month} of 12 · ${completed} of ${total} days…`)
        );
        yearMonths = response.data;
      }
      await downloadPanchangam({
        content,
        format,
        language: exportLanguage,
        day,
        monthData,
        yearMonths,
        year,
        city,
        onProgress: content === 'year' ? (month) => setProgress(`Rendering month ${month} of 12…`) : undefined,
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
        <Modal.Title>Download Panchangam</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        <Form.Group className="mb-3">
          <Form.Label>Calendar content</Form.Label>
          <Form.Select value={content} onChange={(event) => setContent(event.target.value)} disabled={working}>
            <option value="day">Selected day</option>
            <option value="hora">శుభ హోరా · Date-wise timings</option>
            <option value="month">Complete month</option>
            <option value="year">Complete year ({year})</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>File format</Form.Label>
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
          <Form.Label>Language</Form.Label>
          <Form.Select value={exportLanguage} onChange={(event) => setExportLanguage(event.target.value)} disabled={working}>
            <option value="both">Telugu + English</option>
            <option value="te">Telugu</option>
            <option value="en">English</option>
          </Form.Select>
        </Form.Group>
        <div className="panchangam-export-note">
          {content === 'year'
            ? (format === 'PDF' ? `12-page A3 landscape calendar for ${year}` : `ZIP containing 12 detailed monthly ${format} calendars for ${year}`)
            : content === 'month' ? 'A3 landscape detailed calendar' : content === 'hora' ? 'A4 portrait date-wise Hora timings · Complete boundary times' : 'A4 portrait day sheet'} · Calculated for {city.name} · {timeZoneDetails.label}
        </div>
        {working && progress && <div className="panchangam-export-progress" aria-live="polite">{progress}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={working}>Cancel</Button>
        <Button onClick={handleDownload} disabled={working}>
          {working
            ? <><Spinner size="sm" className="me-2" />Preparing…</>
            : content === 'year' && format !== 'PDF' ? 'Download ZIP' : `Download ${format}`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DownloadDialog;
