import { fireEvent, render, screen } from '@testing-library/react';
import MonthFestivalSummary from './MonthFestivalSummary';

test('shows every monthly festival and opens its date', () => {
  const onSelectDate = jest.fn();
  render(<MonthFestivalSummary
    monthData={{ days: [
      { date: '2026-08-02', festivals: [{ te: 'పండుగ ఒకటి', en: 'Festival One' }] },
      { date: '2026-08-15', festivals: [{ te: 'పండుగ రెండు', en: 'Festival Two' }] },
    ] }}
    city={{ name: 'London, United Kingdom' }}
    language="both"
    onSelectDate={onSelectDate}
  />);

  expect(screen.getByText(/Festival One/)).toBeTruthy();
  expect(screen.getByText(/Festival Two/)).toBeTruthy();
  expect(screen.getByText(/London, United Kingdom/)).toBeTruthy();
  fireEvent.click(screen.getByText(/Festival Two/));
  expect(onSelectDate).toHaveBeenCalledWith('2026-08-15');
});
