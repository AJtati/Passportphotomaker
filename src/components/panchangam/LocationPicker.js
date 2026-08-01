import React, { useState } from 'react';
import { Alert, Button, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';
import { searchCities } from './panchangamApi';
import { readRecentCities } from './helpers';

function LocationPicker({ show, onHide, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectCity = (result) => {
    onSelect({
      name: result.displayName || result.name,
      lat: result.lat,
      lng: result.lng,
      tz: result.timezone || result.tz,
    });
    setQuery('');
    setResults([]);
    setError('');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Enter at least two letters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await searchCities(query.trim());
      const cities = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
      setResults(cities);
      if (!cities.length) setError('No matching cities found. Try including the country name.');
    } catch (requestError) {
      setError(requestError.message || 'City search is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Current location is not supported on this device.');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selectCity({
          name: 'Current location',
          lat: coords.latitude,
          lng: coords.longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        setLoading(false);
      },
      () => {
        setError('Location permission was not granted. Search for your city instead.');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const recentCities = readRecentCities();

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="panchangam-modal">
      <Modal.Header closeButton>
        <Modal.Title>Choose calendar location</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-3">
          Panchangam dates and timings change by latitude, longitude and timezone.
        </p>
        <Button variant="outline-primary" className="w-100 mb-3 panchangam-touch" onClick={useCurrentLocation} disabled={loading}>
          ◎ Use my current location
        </Button>
        <div className="panchangam-divider"><span>or search for a city</span></div>
        <Form onSubmit={handleSearch} className="d-flex gap-2 mb-3">
          <Form.Control
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hyderabad, London, Melbourne…"
            aria-label="Search city"
            autoFocus
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Search'}
          </Button>
        </Form>
        {error && <Alert variant="warning" className="py-2 small">{error}</Alert>}
        {results.length > 0 && (
          <ListGroup className="mb-3">
            {results.map((result) => (
              <ListGroup.Item
                key={`${result.displayName}-${result.lat}-${result.lng}`}
                action
                onClick={() => selectCity(result)}
                className="panchangam-location-result"
              >
                <strong>{result.displayName}</strong>
                <small>{result.timezone}</small>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        {recentCities.length > 0 && !results.length && (
          <div>
            <div className="small text-muted fw-semibold mb-2">Recent locations</div>
            <ListGroup>
              {recentCities.map((recent) => (
                <ListGroup.Item key={recent.name} action onClick={() => selectCity(recent)}>
                  <span>⌖ {recent.name}</span>
                  <small className="d-block text-muted">{recent.tz}</small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default LocationPicker;

