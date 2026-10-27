import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import OrganizationSite, { TemplateLayout } from './OrganizationSite';
import { networkAdapter } from 'services/NetworkAdapter';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn() },
}));

const organization = {
  name: 'PV Adventures', slug: 'pv-adventures', layoutTemplate: 'classic',
  primaryColor: '#124578', accentColor: '#fedcba', font: 'system',
  tagline: 'See the bay', about: '', socialLinks: {}, contactLinks: {},
};

describe('organization site templates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  test.each([
    [true, `${window.location.origin}/experiences`],
    [false, `${window.location.origin}/experiences`],
  ])('uses the correct main-site links with DEV=%s', async (development, url) => {
    vi.stubEnv('DEV', development);
    const { unmount } = render(<TemplateLayout organization={organization} experiences={[]} />);
    expect(screen.getByRole('link', { name: 'Puerto Vallarta Today' })).toHaveAttribute('href', url);
    unmount();
    networkAdapter.get.mockResolvedValue({ ok: false });
    render(<OrganizationSite slug="missing" />);
    expect(await screen.findByRole('link', { name: 'Browse experiences' })).toHaveAttribute('href', url);
  });

  test.each(['classic', 'editorial', 'immersive'])('renders the %s template with an empty state', (layoutTemplate) => {
    render(<TemplateLayout organization={{ ...organization, layoutTemplate }} experiences={[]} />);
    expect(screen.getByRole('heading', { name: 'PV Adventures' })).toBeInTheDocument();
    expect(screen.getByText('No upcoming experiences are available right now. Please check back soon.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming experiences' })).toBeInTheDocument();
  });

  test('experience action links to the main site', () => {
    render(<TemplateLayout organization={organization} experiences={[{
      id: 7, title: 'Sunset sailing', url: 'https://puertovallarta.today/experience/7', soldOut: true,
    }]} />);
    expect(screen.getByRole('link', { name: 'View experience' })).toHaveAttribute('href', `${window.location.origin}/experience/7`);
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});
