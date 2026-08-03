import { render, screen } from '@testing-library/react';
import MonthCalendar from './MonthCalendar';

const named = (te, en) => ({ te, en });

describe('Detailed month calendar labels', () => {
  test('shows understandable labels in each date cell and provides a shorthand guide', () => {
    render(<MonthCalendar
      data={{
        year: 2026,
        month: 8,
        days: [{
          date: '2026-08-02',
          gregorianDay: 2,
          moonPhaseEmoji: '🌖',
          masa: named('ఆషాఢం', 'Ashadha'),
          paksha: named('కృష్ణ', 'Krishna'),
          tithi: named('చతుర్థి', 'Chaturthi'),
          nakshatra: named('పూర్వాభాద్ర', 'Purva Bhadrapada'),
          yoga: named('శోభన', 'Shobhana'),
          karana: named('బవ', 'Bava'),
        }],
      }}
      selectedDate="2026-08-02"
      language="te"
      city={{ tz: 'Europe/London' }}
      onSelectDate={() => {}}
    />);

    expect(screen.getByText('కరణం')).toBeTruthy();
    expect(screen.getByText('దుర్ముహూర్తం')).toBeTruthy();
    expect(screen.getByText(/క్యాలెండర్ పదాల అర్థాలు/)).toBeTruthy();
    expect(screen.getByText('కరణం · Karana')).toBeTruthy();
  });
});
