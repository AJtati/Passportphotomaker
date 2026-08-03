import { fireEvent, render, screen } from '@testing-library/react';
import LagnaSchedule from './LagnaSchedule';

const city = {
  name: 'London, England, United Kingdom',
  lat: 51.5074,
  lng: -0.1278,
  tz: 'Europe/London',
};

const lagna = {
  key: 'mithuna',
  symbol: '♊',
  name: { te: 'మిథునం', en: 'Mithuna' },
  lord: { te: 'బుధుడు', en: 'Mercury' },
  nature: { te: 'ద్విస్వభావ', en: 'Dwisvabhava (Dual)' },
  start: '2026-10-25T00:30:00.000Z',
  end: '2026-10-25T01:30:00.000Z',
};

describe('Udaya Lagna schedule', () => {
  test('shows the selected date, complete boundaries, and both DST offsets when clocks change', () => {
    render(<LagnaSchedule
      data={{ date: '2026-10-25', sunrise: '2026-10-25T06:45:00.000Z', lagnas: [lagna] }}
      city={city}
      language="both"
    />);

    expect(screen.getByText(/Udaya Lagna/)).toBeTruthy();
    expect(screen.getByText(/Sunday, 25 October 2026/)).toBeTruthy();
    expect(screen.getByText(/ద్విస్వభావ · Dwisvabhava \(Dual\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /View complete date-wise timings/i }));
    expect(screen.getByText(/BST · UTC\+1/)).toBeTruthy();
    expect(screen.getByText(/GMT · UTC$/)).toBeTruthy();
  });
});
