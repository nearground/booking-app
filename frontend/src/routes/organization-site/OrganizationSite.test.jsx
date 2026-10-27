import { render, screen } from '@testing-library/react';
import { TemplateLayout } from './OrganizationSite';

const organization = {
  name: 'PV Adventures', slug: 'pv-adventures', layoutTemplate: 'classic',
  primaryColor: '#124578', accentColor: '#fedcba', font: 'system',
  tagline: 'See the bay', about: '', socialLinks: {}, contactLinks: {},
};

describe('organization site templates', () => {
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
    expect(screen.getByRole('link', { name: 'View experience' })).toHaveAttribute('href', 'https://puertovallarta.today/experience/7');
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});
