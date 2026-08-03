import React, { useState } from 'react';
import { Alert, Button, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';
import { resolveCoordinates, searchCities } from '../panchangam/panchangamApi';
import { readRecentCities } from '../panchangam/helpers';

function MuhurthamLocationPicker({ show, onHide, onSelect, purpose = 'event' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isBirth = purpose === 'birth';

  const choose = (result) => {
    onSelect({
      name: result.displayName || result.name,
      lat: Number(result.lat),
      lng: Number(result.lng),
      tz: result.timezone || result.tz,
      ...(result.timezoneSource ? { timezoneSource: result.timezoneSource } : {}),
    });
    setQuery('');
    setResults([]);
    setError('');
  };

  const search = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Enter at least two letters and include the country when needed.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await searchCities(query.trim());
      const cities = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
      setResults(cities);
      if (!cities.length) setError('No matching place was found. Try a nearby city.');
    } catch (requestError) {
      setError(requestError.message || 'Location search is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      setError('Current location is not supported on this device.');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        choose(await resolveCoordinates(coords.latitude, coords.longitude));
      } catch {
        choose({
          name: 'Current GPS location', lat: coords.latitude, lng: coords.longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', timezoneSource: 'browser-fallback',
        });
      } finally {
        setLoading(false);
      }
    }, () => {
      setError('Location permission was not granted. Search for the city instead.');
      setLoading(false);
    }, { enableHighAccuracy: false, timeout: 10000 });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="muhurtham-location-modal">
      <Modal.Header closeButton>
        <Modal.Title>{isBirth ? 'Choose birth place' : 'Choose new-house location'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small">
          {isBirth
            ? 'Use the city where this person was born. Its historical timezone affects the natal Moon and Lagna.'
            : 'Use the exact town of the new house. Sunrise, Hora, Lagna and DST are calculated for this location.'}
        </p>
        <Button variant="outline-primary" className="w-100 mb-3 muhurtham-touch" onClick={useGps} disabled={loading}>
          ◎ Use current GPS location
        </Button>
        <div className="muhurtham-divider"><span>or search for a city</span></div>
        <Form className="d-flex gap-2 mb-3" onSubmit={search}>
          <Form.Control value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Middlesbrough, Hyderabad, Melbourne…" aria-label="Search city" autoFocus />
          <Button type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : 'Search'}</Button>
        </Form>
        {error && <Alert variant="warning" className="py-2 small">{error}</Alert>}
        {results.length > 0 && (
          <ListGroup className="muhurtham-location-results">
            {results.map((result) => (
              <ListGroup.Item key={`${result.displayName}-${result.lat}-${result.lng}`} action onClick={() => choose(result)}>
                <strong>{result.displayName}</strong><small>{result.timezone}</small>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        {!results.length && readRecentCities().length > 0 && (
          <div>
            <span className="small text-muted fw-semibold">Recent Panchangam locations</span>
            <ListGroup className="mt-2 muhurtham-location-results">
              {readRecentCities().map((city) => (
                <ListGroup.Item key={`${city.name}-${city.tz}`} action onClick={() => choose(city)}>
                  <strong>{city.name}</strong><small>{city.tz}</small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default MuhurthamLocationPicker;

