import { render, screen, waitFor } from '@testing-library/react';
import FestivalCalendar from './FestivalCalendar';
import { fetchFestivals } from './panchangamApi';

jest.mock('./panchangamApi', () => ({ fetchFestivals: jest.fn() }));

test('refreshes annual festivals when the selected location changes', async () => {
  fetchFestivals
    .mockResolvedValueOnce({ data: { festivals: [{ date: '2026-08-15', en: 'London Festival', te: 'లండన్ పండుగ' }] } })
    .mockResolvedValueOnce({ data: { festivals: [{ date: '2026-08-16', en: 'Hyderabad Festival', te: 'హైదరాబాద్ పండుగ' }] } });
  const london = { name: 'London', lat: 51.5, lng: -0.1, tz: 'Europe/London' };
  const hyderabad = { name: 'Hyderabad', lat: 17.3, lng: 78.4, tz: 'Asia/Kolkata' };
  const { rerender } = render(<FestivalCalendar year={2026} city={london} language="en" onOpenDate={() => {}} />);

  expect(await screen.findByText('London Festival')).toBeTruthy();
  expect(fetchFestivals).toHaveBeenCalledWith(2026, london);

  rerender(<FestivalCalendar year={2026} city={hyderabad} language="en" onOpenDate={() => {}} />);
  expect(await screen.findByText('Hyderabad Festival')).toBeTruthy();
  await waitFor(() => expect(fetchFestivals).toHaveBeenCalledWith(2026, hyderabad));
});
