import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { vi } from 'vitest';
import PartyExperience from './PartyExperience';
import { networkAdapter } from 'services/NetworkAdapter';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn() },
}));
vi.mock(
  '../../../components/experience-session-booking-modal/ExperienceSessionBookingModal',
  () => ({
    default: (props) =>
      props.isOpen ? (
        <div role="dialog" aria-label="Existing booking flow">
          <p>Session {props.session.id}</p>
          <p>{props.ticketTiers[0].price}</p>
          <p>
            {
              props.experienceUserQuestionnary.find(
                (question) => question.questionKey === 'publicAttendance'
              )?.prompt
            }
          </p>
          <p>
            {props.initialCartEdit ? 'Editing reservation' : 'New reservation'}
          </p>
          <button onClick={props.onClose}>Close booking</button>
        </div>
      ) : null,
  })
);

const session = {
  id: 91,
  dateTime: '2099-12-20T21:00:00Z',
  availableSpots: 42,
  status: 'scheduled',
};
const experience = {
  id: 7,
  title: 'After Dark',
  subtitle: 'A one-night celebration',
  description: 'Music, friends and a private rooftop.',
  Organization: { name: 'Nightfall Collective' },
  Location: { name: 'The Rooftop', city: 'Puerto Vallarta', timezone: 'UTC' },
  TicketTiers: [{ id: 3, title: 'Free entry', price: '0.00' }],
  organizers: [
    { name: 'Do not show organizer biography', email: 'private@example.com' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  networkAdapter.get.mockResolvedValue({
    data: {
      session,
      checkedInCount: 12,
      attendees: [
        {
          name: 'Alex Rivera',
          avatar: '/alex.jpg',
          email: 'private@example.com',
        },
      ],
    },
    errors: [],
  });
});

describe('PartyExperience', () => {
  test('shows a dedicated single-event page and public checked-in identities without organizer bios or contact data', async () => {
    render(<PartyExperience experience={experience} />);
    expect(await screen.findByText('12 checked in')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'After Dark' })
    ).toBeInTheDocument();
    expect(screen.getByText('Nightfall Collective')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
    expect(
      screen.getByText(/Only checked-in registered guests/)
    ).toBeInTheDocument();
    expect(screen.queryByText('private@example.com')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Do not show organizer biography')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(networkAdapter.get).toHaveBeenCalledWith(
      '/api/experiences/7/attendance'
    );
  });

  test('registers for the fixed free session through the existing booking modal with optional explicit public consent', async () => {
    render(<PartyExperience experience={experience} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Register for free' })
    );
    expect(
      screen.getByRole('dialog', { name: 'Existing booking flow' })
    ).toBeInTheDocument();
    expect(screen.getByText('Session 91')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Show my registered profile name and avatar publicly after I check in/
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close booking' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test.each([
    [{ ...session, availableSpots: 0 }, 'Event full'],
    [{ ...session, status: 'cancelled' }, 'Registration closed'],
    [{ ...session, status: 'completed' }, 'Registration closed'],
    [{ ...session, dateTime: '2020-01-01T21:00:00Z' }, 'Registration closed'],
  ])('does not register unavailable sessions', async (event, label) => {
    networkAdapter.get.mockResolvedValue({
      data: { session: event, checkedInCount: 0, attendees: [] },
    });
    render(<PartyExperience experience={experience} />);
    expect(await screen.findByRole('button', { name: label })).toBeDisabled();
  });

  test('does not advertise a paid ticket as a free registration', async () => {
    render(
      <PartyExperience
        experience={{ ...experience, TicketTiers: [{ id: 3, price: '10' }] }}
      />
    );
    expect(
      await screen.findByRole('button', { name: 'Registration unavailable' })
    ).toBeDisabled();
  });

  test('shows a safe unavailable state rather than a false zero count on failure', async () => {
    networkAdapter.get.mockResolvedValue({
      errors: ['Internal database detail'],
      status: 500,
    });
    render(<PartyExperience experience={experience} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Event details are temporarily unavailable'
    );
    expect(screen.getByText('Check-ins unavailable')).toBeInTheDocument();
    expect(screen.queryByText('0 checked in')).not.toBeInTheDocument();
  });

  test('keeps preview non-transactional and does not fetch live attendance', async () => {
    render(
      <PartyExperience
        experience={{ ...experience, previewUpcomingSessions: [session] }}
        isPreview
      />
    );
    expect(
      screen.getByRole('button', { name: 'Registration preview' })
    ).toBeDisabled();
    expect(networkAdapter.get).not.toHaveBeenCalled();
  });

  test('resumes cart edits only for this exact event', async () => {
    const initialCartEdit = { id: 4, metadata: { ScheduledExperienceId: 91 } };
    render(
      <PartyExperience
        experience={experience}
        initialCartEdit={initialCartEdit}
      />
    );
    expect(await screen.findByText('Editing reservation')).toBeInTheDocument();
  });

  test('refreshes current check-ins and clears its refresh timer on unmount', async () => {
    const interval = vi.spyOn(window, 'setInterval');
    const clear = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(<PartyExperience experience={experience} />);
    await screen.findByText('12 checked in');
    const refresh = interval.mock.calls[0][0];
    networkAdapter.get.mockResolvedValue({
      data: { session, checkedInCount: 13, attendees: [] },
    });
    await act(async () => {
      await refresh();
    });
    await waitFor(() =>
      expect(screen.getByText('13 checked in')).toBeInTheDocument()
    );
    unmount();
    expect(clear).toHaveBeenCalled();
    interval.mockRestore();
    clear.mockRestore();
  });
});
