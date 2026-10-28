import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ExperienceMap from './ExperienceMap';
import { networkAdapter } from 'services/NetworkAdapter';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn() },
}));

vi.mock('leaflet', () => ({
  divIcon: vi.fn((options) => options),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  Marker: ({ children, eventHandlers }) => (
    <div>
      <button type="button" onClick={eventHandlers?.click}>Map marker</button>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({ getZoom: () => 12, setView: vi.fn() }),
}));

const experiences = [
  {
    id: 7,
    title: 'Old Town Taco Tour',
    subtitle: 'A neighborhood food walk',
    price: '32.99',
    ratings: '5.00',
    detailsMetadata: { version: 1, template: 'food-tour', overrides: {} },
    Location: {
      name: 'Old Town',
      coordinates: { type: 'Point', coordinates: [-105.2364, 20.6085] },
    },
  },
  {
    id: 9,
    title: 'Pitillal Market Tour',
    subtitle: 'Market food and local stories',
    price: '54.99',
    ratings: '4.00',
    detailsMetadata: { version: 1, template: 'default', overrides: {} },
    Location: {
      name: 'Pitillal',
      coordinates: { type: 'Point', coordinates: [-105.2194, 20.6671] },
    },
  },
  {
    id: 11,
    title: 'Rooftop Party',
    subtitle: 'A special night above the bay',
    price: '25.00',
    ratings: '4.50',
    detailsMetadata: { version: 1, template: 'event', overrides: {} },
    Location: {
      name: 'Centro',
      coordinates: { type: 'Point', coordinates: [-105.232, 20.612] },
    },
  },
];

describe('ExperienceMap', () => {
  beforeEach(() => {
    networkAdapter.get.mockResolvedValue({
      ok: true,
      errors: [],
      data: { elements: experiences },
    });
  });

  afterEach(() => vi.clearAllMocks());

  test('shows local events, filters them, and keeps highlighted events visible', async () => {
    render(<ExperienceMap />);

    expect(await screen.findByText('2 experiences nearby')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByTestId('map')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '25' } });
    await waitFor(() => expect(screen.queryAllByRole('article')).toHaveLength(0));
    fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Minimum rating'), { target: { value: '4.5' } });
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));

    fireEvent.change(screen.getByLabelText('Minimum rating'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Highlight Pitillal Market Tour' }));
    fireEvent.change(screen.getByLabelText('Minimum rating'), { target: { value: '4.5' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search experiences' }), {
      target: { value: 'taco' },
    });

    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(2);
    });
    expect(screen.getByText(/1 highlighted/)).toBeInTheDocument();
    expect(networkAdapter.get).toHaveBeenCalledWith(
      '/api/experiences/nearbyExperiences?city=Puerto%20Vallarta'
    );
  });

  test('only maps event-template experiences in the Events view', async () => {
    render(<ExperienceMap experienceType="event" />);

    expect(await screen.findByText('1 experience nearby')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article').textContent).toContain('Rooftop Party');
    expect(screen.queryByText('Old Town Taco Tour')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Find your next event' })).toBeInTheDocument();
  });
});
