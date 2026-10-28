import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import CreateExperience from './CreateExperience';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    get: vi.fn().mockResolvedValue({ data: { locations: [] } }),
    post: vi.fn(),
    patch: vi.fn(),
    upload: vi.fn(),
  },
}));

// Leaflet maps require a DOM that vitest/jsdom can't fully provide; mock them
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  CircleMarker: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: vi.fn(() => 13) }),
  useMapEvents: () => null,
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

const userDetailsWithOrg = {
  id: 1,
  firstName: 'Alice',
  lastName: 'Admin',
  organizerProfile: { id: 10 },
  organizations: [{ id: 5, name: 'Adventure Co', isAdmin: true, LocationId: null }],
};

const renderComponent = (props = {}) => render(
  <AuthContext.Provider value={{ userDetails: userDetailsWithOrg }}>
    <MemoryRouter>
      <CreateExperience {...props} />
    </MemoryRouter>
  </AuthContext.Provider>
);

describe('CreateExperience — create mode (default)', () => {
  test('selects a validated details template, defaulting to legacy layout', () => {
    renderComponent();
    const selector = screen.getByLabelText('Details template');
    expect(selector).toHaveValue('default');
    fireEvent.change(selector, { target: { value: 'party' } });
    expect(selector).toHaveValue('party');
  });
  test('renders "Create New Experience" title in create mode', async () => {
    renderComponent();
    expect(screen.getByText('Create New Experience')).toBeInTheDocument();
  });

  test('renders "Preview Experience" submit button in create mode', async () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Preview Experience' })).toBeInTheDocument();
  });
});

describe('CreateExperience — edit mode', () => {
  const experienceData = {
    id: 42,
    title: 'Mountain Hike',
    subtitle: 'Epic views',
    description: 'A beautiful hike.',
    detailsMetadata: { version: 1, template: 'food-tour', overrides: { pinnedCommentIds: [1, 2, 3] } },
    thumbnail: 'https://example.com/mountain.jpg',
    capacity: 20,
    duration: 180,
    userQuestionnary: [],
    OrganizationId: 5,
    LocationId: 3,
    TicketTiers: [
      {
        id: 1,
        title: 'Adult',
        price: 50,
        description: 'Standard ticket',
        minAge: 18,
        maxAge: null,
        userQuestionnary: [],
      },
    ],
    ScheduleTemplates: [
      {
        id: 100,
        ruleType: 'cron',
        ruleCron: '0 9 * * 6', // every Saturday at 9am
        timezone: 'America/New_York',
        durationMinutes: null,
        capacity: null,
      },
    ],
    PickedOccurrences: [],
    Organizers: [{ id: 1, firstName: 'Alice', lastName: 'Admin', profilePicture: '', email: 'alice@example.com' }],
    Location: {
      id: 3,
      name: 'Trailhead',
      city: 'Denver',
      state: 'Colorado',
      country: 'United States',
      street: '123 Trail Rd',
      zipCode: '80202',
      timezone: 'America/Denver',
      coordinates: { coordinates: [-104.99, 39.74] },
    },
  };

  test('renders "Edit Experience" title in edit mode', () => {
    renderComponent({ mode: 'edit', experienceData });
    expect(screen.getByText('Edit Experience')).toBeInTheDocument();
  });

  test('retains the saved template selection when editing', () => {
    renderComponent({ mode: 'edit', experienceData });
    expect(screen.getByLabelText('Details template')).toHaveValue('food-tour');
  });

  test('renders "Preview Changes" submit button in edit mode', () => {
    renderComponent({ mode: 'edit', experienceData });
    expect(screen.getByRole('button', { name: 'Preview Changes' })).toBeInTheDocument();
  });

  test('pre-populates the title field from experienceData', () => {
    renderComponent({ mode: 'edit', experienceData });
    const titleInput = screen.getByDisplayValue('Mountain Hike');
    expect(titleInput).toBeInTheDocument();
  });

  test('pre-populates capacity from experienceData', () => {
    renderComponent({ mode: 'edit', experienceData });
    const capacityInput = screen.getByDisplayValue('20');
    expect(capacityInput).toBeInTheDocument();
  });

  test('pre-populates ticket tier title from experienceData', () => {
    renderComponent({ mode: 'edit', experienceData });
    expect(screen.getByDisplayValue('Adult')).toBeInTheDocument();
  });

  test('does not show schedule changed banner initially', () => {
    renderComponent({ mode: 'edit', experienceData });
    expect(screen.queryByText(/Schedule has been modified/)).not.toBeInTheDocument();
  });
});
