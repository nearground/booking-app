import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-to-print', () => ({
  useReactToPrint: () => vi.fn(),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ className }) => <span data-testid="icon" className={className} />,
}));

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
  faCheckCircle: 'faCheckCircle',
  faPrint: 'faPrint',
}));

import BookingConfirmation from './BookingConfirmation';

// ── Helpers ────────────────────────────────────────────────────────────────

const makeConfirmationData = (overrides = {}) => ({
  orderId: 42,
  orderNumber: 'ORD-20260415-XYZW',
  status: 'pending',
  totalAmount: '240.00',
  mainContactName: 'Jane Doe',
  mainContactPhone: '555-111-2222',
  mainContactEmail: 'jane@example.com',
  items: [
    {
      id: 1,
      ProductType: 'Experience',
      description: 'Sunset Sailing Tour',
      unitPrice: '120.00',
      quantity: 2,
      totalPrice: '240.00',
      metadata: {
        experienceTitle: 'Sunset Sailing Tour',
        sessionDateTime: '2026-06-01T18:00:00.000Z',
        confirmationCode: 'EXP-001-CONF',
        ticketSelections: [
          { title: 'Adult', quantity: 2, unitPrice: 120 },
        ],
        mainContact: { phone: '555-999-8888' },
        meetingAddress: 'Harbor Pier, 123 Harbor Drive, Miami, FL 33101, US',
        hotelName: 'Ocean View Hotel',
        comments: 'Window seat preferred',
        reservationAnswers: [
          { questionKey: 'q1', questionLabel: 'Do you have allergies?', answerText: 'None' },
        ],
        questionnaireAnswers: [
          {
            tierKey: '10',
            tierTitle: 'Adult',
            questionKey: 'q2',
            questionLabel: 'Swimming ability?',
            answerText: 'Strong swimmer',
          },
        ],
      },
    },
  ],
  ...overrides,
});

const renderWithState = (confirmationData) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/booking-confirmation', state: { confirmationData } }]}
    >
      <BookingConfirmation />
    </MemoryRouter>
  );

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BookingConfirmation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('navigates away when no confirmationData in location state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/booking-confirmation', state: {} }]}>
        <BookingConfirmation />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('renders the "Booking Confirmed!" heading', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument();
  });

  test('shows the order number', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('ORD-20260415-XYZW')).toBeInTheDocument();
  });

  test('shows the status badge', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  test('shows an email failure warning without invalidating the booking', () => {
    renderWithState(makeConfirmationData({ confirmationEmail: { status: 'failed' } }));
    expect(screen.getByRole('alert')).toHaveTextContent('Your booking is saved');
    expect(screen.getByRole('alert')).toHaveTextContent('Do not book again');
    expect(screen.getByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument();
    expect(screen.queryByText(/accepted by our email provider/i)).not.toBeInTheDocument();
  });

  test('only reports provider acceptance when email sending succeeded', () => {
    renderWithState(makeConfirmationData({ confirmationEmail: { status: 'sent' } }));
    expect(screen.getByText(/accepted by our email provider/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('hides email failure diagnostics in production without claiming email success', () => {
    vi.stubEnv('DEV', false);
    renderWithState(makeConfirmationData({ confirmationEmail: { status: 'failed' } }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/email delivery status is unavailable|could not send|accepted by our email provider/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument();
  });

  test('does not claim older orders without email status were emailed', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText(/email delivery status is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/has been sent|accepted by our email provider/i)).not.toBeInTheDocument();
  });

  // ── Main contact ─────────────────────────────────────────────────────────

  test('renders main contact name from Order', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  test('renders main contact email from Order', () => {
    renderWithState(makeConfirmationData());
    const elements = screen.getAllByText('jane@example.com');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  test('renders main contact phone from Order', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('555-111-2222')).toBeInTheDocument();
  });

  test('shows "Not provided" when all main contact fields are absent', () => {
    const data = makeConfirmationData({
      mainContactName: null,
      mainContactPhone: null,
      mainContactEmail: null,
    });
    renderWithState(data);
    // Both "Main Contact" and "Day-of Contact" sections may show "Not provided"
    const notProvided = screen.getAllByText(/not provided/i);
    expect(notProvided.length).toBeGreaterThanOrEqual(1);
  });

  // ── Day-of contact ────────────────────────────────────────────────────────

  test('renders day-of contact phone from item metadata', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('555-999-8888')).toBeInTheDocument();
  });

  test('does not render Day-of Phone row when phone is absent', () => {
    const data = makeConfirmationData();
    data.items[0].metadata.mainContact = {};
    renderWithState(data);
    expect(screen.queryByText(/day-of phone/i)).not.toBeInTheDocument();
  });

  // ── Additional info ───────────────────────────────────────────────────────

  test('renders hotel name when present', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Ocean View Hotel')).toBeInTheDocument();
  });

  test('renders comments when present', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Window seat preferred')).toBeInTheDocument();
  });

  test('does not render Additional Information card when absent', () => {
    const data = makeConfirmationData();
    data.items[0].metadata.hotelName = null;
    data.items[0].metadata.comments = null;
    renderWithState(data);
    expect(screen.queryByText(/hotel \/ accommodation/i)).not.toBeInTheDocument();
  });

  // ── Experience questions ──────────────────────────────────────────────────

  test('renders experience-level reservation question label and answer', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Do you have allergies?')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  test('does not render Reservation Questions card when empty', () => {
    const data = makeConfirmationData();
    data.items[0].metadata.reservationAnswers = [];
    renderWithState(data);
    expect(screen.queryByText('Reservation Questions')).not.toBeInTheDocument();
  });

  // ── Ticket tier questions ─────────────────────────────────────────────────

  test('renders ticket tier question label and answer', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Swimming ability?')).toBeInTheDocument();
    expect(screen.getByText('Strong swimmer')).toBeInTheDocument();
  });

  test('renders tier title heading in tier questions section', () => {
    renderWithState(makeConfirmationData());
    // Tier title "Adult" appears in a few places; check at least one occurrence
    const adultHeadings = screen.getAllByText('Adult');
    expect(adultHeadings.length).toBeGreaterThanOrEqual(1);
  });

  test('does not render Ticket Tier Questions card when empty', () => {
    const data = makeConfirmationData();
    data.items[0].metadata.questionnaireAnswers = [];
    renderWithState(data);
    expect(screen.queryByText('Ticket Tier Questions')).not.toBeInTheDocument();
  });

  // ── Order summary ─────────────────────────────────────────────────────────

  test('renders experience title in experience card', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Sunset Sailing Tour')).toBeInTheDocument();
  });

  test('renders confirmation code next to experience title', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('# EXP-001-CONF')).toBeInTheDocument();
  });

  test('renders ticket breakdown with price', () => {
    renderWithState(makeConfirmationData());
    const adultRows = screen.getAllByText(/adult/i);
    expect(adultRows.length).toBeGreaterThanOrEqual(1);
    // $240 appears in ticket row, item total, and order total
    const priceElements = screen.getAllByText('$240.00');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  test('renders order total', () => {
    renderWithState(makeConfirmationData());
    expect(screen.getByText('Order Total')).toBeInTheDocument();
  });

  // ── Meeting address ───────────────────────────────────────────────────────

  test('renders meeting address when present in item metadata', () => {
    renderWithState(makeConfirmationData());
    const found = screen.getAllByText('Harbor Pier, 123 Harbor Drive, Miami, FL 33101, US');
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  test('does not render meeting address when absent from item metadata', () => {
    const data = makeConfirmationData();
    data.items[0].metadata.meetingAddress = null;
    renderWithState(data);
    expect(screen.queryByText(/meeting address/i)).not.toBeInTheDocument();
  });

  // ── Print ─────────────────────────────────────────────────────────────────

  test('renders the Print confirmation buttons', () => {
    renderWithState(makeConfirmationData());
    const printButtons = screen.getAllByRole('button', { name: /print/i });
    expect(printButtons.length).toBeGreaterThanOrEqual(1);
  });

  test('offers optional registration to guest purchasers with receipt email prefilled', () => {
    renderWithState(makeConfirmationData({ guestReceiptToken: 'guest-capability' }));
    const link = screen.getByRole('link', { name: /create an optional account/i });
    expect(link).toHaveAttribute('href', '/register');
    expect(screen.getByText(/verify the receipt email/i)).toBeInTheDocument();
  });});
