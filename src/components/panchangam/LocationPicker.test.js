import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LocationPicker from './LocationPicker';
import { resolveCoordinates } from './panchangamApi';

jest.mock('./panchangamApi', () => ({
  resolveCoordinates: jest.fn(),
  searchCities: jest.fn(),
}));

describe('Panchangam current location', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: 51.5074, longitude: -0.1278 },
        }),
      },
    });
  });

  afterEach(() => jest.clearAllMocks());

  test('uses the coordinate-resolved timezone for GPS selection', async () => {
    const location = {
      name: 'London, England, United Kingdom',
      lat: 51.5074062,
      lng: -0.1276915,
      tz: 'Europe/London',
      source: 'gps',
      timezoneSource: 'coordinates',
    };
    resolveCoordinates.mockResolvedValue(location);
    const onSelect = jest.fn();

    render(<LocationPicker show onHide={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await waitFor(() => expect(resolveCoordinates).toHaveBeenCalledWith(51.5074, -0.1278));
    expect(onSelect).toHaveBeenCalledWith(location);
  });
});
