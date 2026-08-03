import { fireEvent, render, screen } from '@testing-library/react';
import SpecialYogaSchedule from './SpecialYogaSchedule';

const yoga = (key, name, start, end) => ({
  key,
  name: { te: name, en: name },
  basis: { te: 'Vara + Nakshatra', en: 'Vara + Nakshatra' },
  description: { te: 'Auspicious', en: 'Auspicious' },
  start,
  end,
});

describe('Special Yoga date-wise schedule', () => {
  test('reveals Yogas from both sunrise days that touch the selected date', () => {
    render(<SpecialYogaSchedule
      data={{
        date: '2026-08-02',
        sunrise: '2026-08-02T04:00:00Z',
        previousSpecialYogas: [yoga('amrita-siddhi', 'Amrita Siddhi Yoga', '2026-08-01T22:00:00Z', '2026-08-02T04:00:00Z')],
        specialYogas: [yoga('sarvartha-siddhi', 'Sarvartha Siddhi Yoga', '2026-08-02T17:00:00Z', '2026-08-03T04:00:00Z')],
      }}
      city={{ name: 'London', tz: 'Europe/London' }}
      language="en"
    />);

    expect(screen.queryByText('Amrita Siddhi Yoga')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View date-wise timings' }));
    expect(screen.getByText('Amrita Siddhi Yoga')).not.toBeNull();
    expect(screen.getAllByText('Sarvartha Siddhi Yoga')).toHaveLength(2);
    expect(screen.getAllByText(/To · 3 Aug/)).toHaveLength(2);
  });
});
