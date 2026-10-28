import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import OrganizationSite, { TemplateLayout } from './OrganizationSite';
import { networkAdapter } from 'services/NetworkAdapter';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn() },
}));

vi.mock('../experience-details/ExperienceDetails', () => ({
  default: ({ previewData }) => <div data-testid="experience-details">{previewData.title}</div>,
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

  test('Food Tours tabs show the experience list or full experience details on the page', async () => {
    const experiences = [
      { id: 8, title: 'Pitillal Food Tours', url: '/experience/8' },
      { id: 7, title: 'Old Town Taco Tour', url: '/experience/7' },
    ];
    render(<TemplateLayout organization={{
      ...organization,
      slug: 'food-tours',
      name: 'Food Tours',
      about: 'For years, our local guides have shared Vallarta food traditions.',
    }} experiences={experiences} />);

    expect(screen.getByRole('navigation', { name: 'Food Tours pages' })).toBeInTheDocument();
    expect(document.querySelector('.org-site')?.firstElementChild).toHaveClass('org-site-tabs');
    expect(document.querySelector('.org-site-tabs')?.nextElementSibling).toHaveClass('org-site-hero');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByLabelText('Food Tours highlights')).toBeInTheDocument();
    expect(screen.queryByLabelText('Map of Puerto Vallarta experiences')).not.toBeInTheDocument();
    expect(screen.getByText('For years, our local guides have shared Vallarta food traditions.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View experience' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'View experience' })[0]).toHaveAttribute('href', `${window.location.origin}/experience/8`);

    networkAdapter.get.mockResolvedValueOnce({
      ok: true,
      data: { id: 8, title: 'Pitillal Food Tours', detailsMetadata: { template: 'food-tour' } },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Pitillal Food Tour' }));
    expect(await screen.findByTestId('experience-details')).toHaveTextContent('Pitillal Food Tours');
    expect(screen.queryByLabelText('Food Tours highlights')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View experience' })).not.toBeInTheDocument();

    networkAdapter.get.mockResolvedValueOnce({
      ok: true,
      data: { id: 7, title: 'Old Town Taco Tour', detailsMetadata: { template: 'food-tour' } },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Old Town Taco Tour' }));
    expect(await screen.findByTestId('experience-details')).toHaveTextContent('Old Town Taco Tour');
    expect(screen.queryByLabelText('Food Tours highlights')).not.toBeInTheDocument();
    expect(networkAdapter.get).toHaveBeenLastCalledWith('/api/experiences/7');
    expect(document.querySelector('.org-site-tour-details iframe')).toBeNull();
  });

  test('public profile renders backend media in the default organization showcase', async () => {
    networkAdapter.get.mockResolvedValue({
      ok: true,
      data: {
        organization: { ...organization, layoutTemplate: undefined, logoUrl: '/api/media/object/users/1/logo.jpg' },
        experiences: [{
          id: 7, title: 'Sunset sailing', thumbnail: '/api/media/object/users/1/boat.jpg',
          images: ['/api/media/object/users/1/boat.jpg', '/api/media/object/users/1/coast.jpg'],
        }],
      },
    });
    const { container } = render(<OrganizationSite slug="pv-adventures" />);
    expect(await screen.findByRole('heading', { name: 'PV Adventures' })).toBeInTheDocument();
    expect(networkAdapter.get).toHaveBeenCalledWith('/api/organization-sites/pv-adventures');
    expect(container.querySelector('.org-site')).toHaveClass('org-site-classic');
    expect(container.querySelector('.org-site-cover')).toHaveAttribute('src', '/api/media/object/users/1/boat.jpg');
    expect(screen.getByRole('img', { name: 'PV Adventures logo' })).toHaveAttribute('src', '/api/media/object/users/1/logo.jpg');
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View experience' })).toHaveAttribute('href', `${window.location.origin}/experience/7`);
  });
});
