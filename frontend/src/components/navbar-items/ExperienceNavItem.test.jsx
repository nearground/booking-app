import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExperienceNavItem from './ExperienceNavItem';

describe('ExperienceNavItem', () => {
  test('provides separate Experiences and Events navigation tabs', () => {
    render(
      <MemoryRouter initialEntries={['/experiences']}>
        <ExperienceNavItem />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Experiences' })).toHaveAttribute('href', '/experiences');
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
