import { fireEvent, render, screen } from '@testing-library/react';
import YogaSection from './YogaSection';

describe('Yoga selector', () => {
  test('shows Nitya Yoga details only after its button is selected', () => {
    render(<YogaSection
      data={{ date: '2026-08-02', sunrise: '2026-08-02T04:18:18Z', specialYogas: [] }}
      city={{ name: 'London', tz: 'Europe/London' }}
      language="en"
    />);

    expect(screen.queryByText('One of 27 daily Yogas from the sidereal Sun–Moon longitude sum')).toBeNull();
    expect(screen.getByText(/Different calculations:/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Nitya Yoga' }));
    expect(screen.getByText('One of 27 daily Yogas from the sidereal Sun–Moon longitude sum')).not.toBeNull();
    expect(screen.queryByText(/No Amrita Siddhi/)).toBeNull();
  });
});
