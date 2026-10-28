import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import ScheduleBuilder from './ScheduleBuilder';

const ScheduleBuilderHarness = ({ initialSchedules = [] }) => {
  const [schedules, setSchedules] = useState(initialSchedules);
  return <ScheduleBuilder schedules={schedules} onChange={setSchedules} timezone="America/Mexico_City" />;
};

describe('ScheduleBuilder', () => {
  test('explains the two schedule options before any sessions are added', () => {
    render(<ScheduleBuilderHarness />);

    expect(screen.getByText('No sessions added yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add repeating schedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add specific date' })).toBeInTheDocument();
  });

  test('builds a weekly schedule and supports a custom daily recurrence choice', () => {
    render(
      <ScheduleBuilderHarness
        initialSchedules={[{
          kind: 'template',
          ruleType: 'cron',
          _recurrenceType: 'weekly',
          _time: '09:00',
          _weekDays: [],
        }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
    expect(screen.getByRole('button', { name: 'Mon' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Every day' }));
    expect(screen.getByRole('button', { name: 'Every day' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Which days?')).not.toBeInTheDocument();
  });

  test('adds a specific date with clear date, time, capacity, and note fields', () => {
    render(<ScheduleBuilderHarness />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add specific date' }));

    expect(screen.getByLabelText('Date and start time')).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByLabelText(/End time/)).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByLabelText(/Session capacity/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organizer note/)).toBeInTheDocument();
  });
});
