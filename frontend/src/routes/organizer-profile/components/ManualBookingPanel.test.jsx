import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ManualBookingPanel from './ManualBookingPanel';
import { networkAdapter } from 'services/NetworkAdapter';
import { vi } from 'vitest';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { post: vi.fn() },
}));

const organization = {
  id: 8,
  Experiences: [
    {
      id: 4,
      title: 'Harbor Tour',
      TicketTiers: [{ id: 12, title: 'Adult', price: 25 }],
      ScheduledExperiences: [
        {
          id: 31,
          dateTime: '2099-06-01T10:00:00.000Z',
          availableSpots: 5,
          status: 'scheduled',
        },
      ],
    },
  ],
};

describe('ManualBookingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers a guest, records the payment method, and shows the email delivery result', async () => {
    networkAdapter.post.mockResolvedValue({
      errors: [],
      data: {
        orderNumber: 'ORD-1',
        confirmationCode: 'MAN-ABC123',
        experienceTitle: 'Harbor Tour',
        totalAmount: 50,
        contactMethod: 'email',
        email: 'guest@example.test',
        delivery: { status: 'sent' },
      },
    });

    render(<ManualBookingPanel organization={organization} />);
    fireEvent.change(screen.getByLabelText('Session'), {
      target: { value: '31' },
    });
    fireEvent.change(screen.getByLabelText('Adult quantity'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Guest name'), {
      target: { value: 'Guest Person' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'guest@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Payment method'), {
      target: { value: 'in_person' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register guest' }));

    await waitFor(() =>
      expect(networkAdapter.post).toHaveBeenCalledWith(
        '/api/organizers/sessions/31/reservations',
        expect.objectContaining({
          fullName: 'Guest Person',
          paymentMethod: 'in_person',
          contactMethod: 'email',
          ticketSelections: [{ ticketTierId: 12, quantity: 2 }],
        })
      )
    );
    expect(
      await screen.findByText('Booking details emailed to guest@example.test.')
    ).toBeInTheDocument();
  });

  test('offers the selected phone messaging app after booking', async () => {
    networkAdapter.post.mockResolvedValue({
      errors: [],
      data: {
        orderNumber: 'ORD-2',
        confirmationCode: 'MAN-XYZ123',
        experienceTitle: 'Harbor Tour',
        sessionDateTime: '2099-06-01T10:00:00.000Z',
        totalAmount: 25,
        attendeeCount: 1,
        paymentMethod: 'online',
        contactMethod: 'whatsapp',
        phone: '+15551234567',
      },
    });

    render(<ManualBookingPanel organization={organization} />);
    fireEvent.change(screen.getByLabelText('Session'), {
      target: { value: '31' },
    });
    fireEvent.change(screen.getByLabelText('Adult quantity'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Guest name'), {
      target: { value: 'Guest Person' },
    });
    fireEvent.change(screen.getByLabelText('Preferred contact method'), {
      target: { value: 'whatsapp' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+15551234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register guest' }));

    const sendLink = await screen.findByRole('link', {
      name: 'Open WhatsApp to send details',
    });
    expect(sendLink).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/15551234567?text=')
    );
  });
});
