import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingPanel, { OrderItemCard, OrderCard } from './BookingPanel';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    get: vi.fn().mockResolvedValue({ data: null }),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeItem = (overrides = {}) => ({
  id: 1,
  description: 'Sunset Sailing Tour',
  unitPrice: '120.00',
  quantity: 1,
  totalPrice: '120.00',
  ProductType: 'Experience',
  metadata: {
    experienceTitle: 'Sunset Sailing Tour',
    experienceThumbnail: 'https://example.com/img.jpg',
    sessionDateTime: '2026-05-15T18:00:00.000Z',
    experienceDurationMinutes: 120,
    ticketSelections: [
      { quantity: 2, title: 'Adult', unitPrice: 60 },
    ],
    confirmationCode: 'CONF-001',
  },
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  id: 1,
  orderNumber: 'ORD-20260410-ABCD',
  status: 'paid',
  totalAmount: '120.00',
  currency: 'USD',
  createdAt: '2026-04-10T12:15:00.000Z',
  paymentMethod: 'Visa •••• 4242',
  contactInfo: {
    fullName: 'Jane Doe',
    email: 'guest@example.com',
    phone: '555-123-4567',
  },
  meetingAddress: '123 Example Street, Springfield, IL',
  questionAnswers: { 'Allergies': 'None' },
  Items: [makeItem()],
  ...overrides,
});

// ---------------------------------------------------------------------------
// OrderItemCard tests
// ---------------------------------------------------------------------------

describe('OrderItemCard', () => {
  test('renders the item title from metadata.experienceTitle', () => {
    render(<MemoryRouter><OrderItemCard item={makeItem()} /></MemoryRouter>);
    expect(screen.getByText('Sunset Sailing Tour')).toBeInTheDocument();
  });

  test('falls back to item.description when experienceTitle is absent', () => {
    const item = makeItem({ metadata: { confirmationCode: 'X' } });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.getByText('Sunset Sailing Tour')).toBeInTheDocument();
  });

  test('renders the thumbnail image when experienceThumbnail is present', () => {
    render(<MemoryRouter><OrderItemCard item={makeItem()} /></MemoryRouter>);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    expect(img).toHaveAttribute('alt', 'Sunset Sailing Tour');
  });

  test('renders "No image" placeholder when thumbnail is absent', () => {
    const item = makeItem({
      metadata: { experienceTitle: 'Tour', confirmationCode: 'C1' },
    });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  test('renders ticket selections with quantity and title', () => {
    render(<MemoryRouter><OrderItemCard item={makeItem()} /></MemoryRouter>);
    expect(screen.getByText(/2× Adult/)).toBeInTheDocument();
    expect(screen.getByText(/\$60\.00 each/)).toBeInTheDocument();
  });

  test('renders the formatted price', () => {
    render(<MemoryRouter><OrderItemCard item={makeItem()} /></MemoryRouter>);
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  test('renders confirmation code from metadata', () => {
    render(<MemoryRouter><OrderItemCard item={makeItem()} /></MemoryRouter>);
    expect(screen.getByText('CONF-001')).toBeInTheDocument();
  });

  test('resolves confirmation code from ExperienceReservation association when absent in metadata', () => {
    const item = makeItem({
      metadata: { experienceTitle: 'Tour' },
      ExperienceReservation: { id: 5, confirmationCode: 'RES-CODE-99', status: 'confirmed' },
    });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.getByText('RES-CODE-99')).toBeInTheDocument();
  });

  test('renders organization contact email for experience reservations', () => {
    const item = makeItem({
      metadata: { experienceTitle: 'Tour' },
      ExperienceReservation: {
        id: 5,
        confirmationCode: 'RES-CODE-99',
        status: 'confirmed',
        ScheduledExperience: {
          Experience: {
            Organization: { email: 'contact@org.com' },
          },
        },
      },
    });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.getByText(/Contact:/)).toBeInTheDocument();
    expect(screen.getByText('contact@org.com')).toBeInTheDocument();
  });

  test('resolves confirmation code from ServiceReservation association', () => {
    const item = makeItem({
      metadata: { experienceTitle: 'Dinner' },
      ServiceReservation: { id: 3, confirmationCode: 'SVC-555', status: 'confirmed' },
    });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.getByText('SVC-555')).toBeInTheDocument();
  });

  test('resolves confirmation code from HotelReservation association', () => {
    const item = makeItem({
      metadata: { experienceTitle: 'Hotel Stay' },
      HotelReservation: { id: 2, confirmationCode: 'HTL-777', status: 'confirmed' },
    });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.getByText('HTL-777')).toBeInTheDocument();
  });

  test('does not render confirmation section when no code is available', () => {
    const item = makeItem({ metadata: { experienceTitle: 'Tour' } });
    render(<MemoryRouter><OrderItemCard item={item} /></MemoryRouter>);
    expect(screen.queryByText(/Confirmation:/)).not.toBeInTheDocument();
  });

  test('has data-testid="order-item-card"', () => {
    render(<MemoryRouter><OrderItemCard item={makeItem()} /></MemoryRouter>);
    expect(screen.getByTestId('order-item-card')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OrderCard tests
// ---------------------------------------------------------------------------

describe('OrderCard', () => {
  test('renders the order number', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    expect(screen.getByText('ORD-20260410-ABCD')).toBeInTheDocument();
  });

  test('renders a capitalised status badge', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  test('renders the purchase date', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    // The exact locale-formatted string varies; check at least one element contains "2026"
    const matches = screen.getAllByText(/2026/);
    expect(matches.length).toBeGreaterThan(0);
  });

  test('renders the total amount with currency', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  test('renders the payment method', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    expect(screen.getByText('Payment:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
  });

  test('items are hidden by default', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    expect(screen.queryByTestId('order-item-card')).not.toBeInTheDocument();
  });

  test('clicking "Show items" expands the items list', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /show 1 item/i }));
    expect(screen.getByTestId('order-item-card')).toBeInTheDocument();
  });

  test('clicking again collapses the items list', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    const btn = screen.getByRole('button', { name: /show 1 item/i });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('button', { name: /hide items/i }));
    expect(screen.queryByTestId('order-item-card')).not.toBeInTheDocument();
  });

  test('show button label uses plural when multiple items', () => {
    const order = makeOrder({ Items: [makeItem(), makeItem({ id: 2 })] });
    render(<MemoryRouter><ul><OrderCard order={order} /></ul></MemoryRouter>);
    expect(screen.getByRole('button', { name: /show 2 items/i })).toBeInTheDocument();
  });

  test('has data-testid="order-card"', () => {
    render(<MemoryRouter><ul><OrderCard order={makeOrder()} /></ul></MemoryRouter>);
    expect(screen.getByTestId('order-card')).toBeInTheDocument();
  });

  test('renders all items after expand', () => {
    const order = makeOrder({ Items: [makeItem(), makeItem({ id: 2, description: 'Second Item' })] });
    render(<MemoryRouter><ul><OrderCard order={order} /></ul></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /show 2 items/i }));
    expect(screen.getAllByTestId('order-item-card')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// BookingPanel tests
// ---------------------------------------------------------------------------

describe('BookingPanel', () => {
  test('renders "My Orders" section heading', () => {
    render(<MemoryRouter><BookingPanel orders={[makeOrder()]} /></MemoryRouter>);
    expect(screen.getByText('My Orders')).toBeInTheDocument();
  });

  test('shows loading message while orders are fetching', () => {
    render(<MemoryRouter><BookingPanel orders={[]} isLoadingOrders={true} /></MemoryRouter>);
    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
  });

  test('shows "No orders yet" when orders list is empty', () => {
    render(<MemoryRouter><BookingPanel orders={[]} /></MemoryRouter>);
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });

  test('renders one OrderCard per order', () => {
    const orders = [makeOrder(), makeOrder({ id: 2, orderNumber: 'ORD-20260410-EFGH' })];
    render(<MemoryRouter><BookingPanel orders={orders} /></MemoryRouter>);
    expect(screen.getAllByTestId('order-card')).toHaveLength(2);
  });

  test('normalises non-array orders prop to empty list', () => {
    render(<MemoryRouter><BookingPanel orders={null} /></MemoryRouter>);
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });

  test('renders orders list with data-testid="orders-list"', () => {
    render(<MemoryRouter><BookingPanel orders={[makeOrder()]} /></MemoryRouter>);
    expect(screen.getByTestId('orders-list')).toBeInTheDocument();
  });
});
