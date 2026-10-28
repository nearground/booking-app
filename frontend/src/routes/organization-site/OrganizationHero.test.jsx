import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import OrganizationHero from './OrganizationHero';

const organization = {
  name: 'Bay Adventures', coverUrl: '/api/media/object/users/1/cover.jpg',
  logoUrl: '/api/media/object/users/1/logo.jpg', tagline: 'See the bay',
};
const experiences = [{
  id: 1, title: 'Sunset sailing', thumbnail: '/api/media/object/users/1/boat.jpg',
  images: ['/api/media/object/users/1/boat.jpg', '/api/media/object/users/1/coast.jpg'],
}];
const currentPhoto = (container) => container.querySelector('.org-site-cover');
const advance = () => act(() => vi.advanceTimersByTime(6000));

describe('organization hero photo carousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('cycles uploaded cover and experience gallery photos, deduplicating URLs', () => {
    const { container } = render(<OrganizationHero organization={organization} experiences={[
      ...experiences, { title: 'Another outing', images: [organization.coverUrl, experiences[0].images[0]] },
    ]} />);
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore our experiences/ })).toHaveAttribute('href', '#organization-experiences');
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[0]);
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[1]);
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
  });

  test('supports previous/next, arrow keys and explicit pause/play', () => {
    const { container } = render(<OrganizationHero organization={organization} experiences={experiences} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }));
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
    fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[1]);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Previous photo' }), { key: 'ArrowLeft' });
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
  });

  test('pauses on hover and permanently pauses when keyboard focus enters', () => {
    const { container } = render(<OrganizationHero organization={organization} experiences={experiences} />);
    const hero = screen.getByRole('banner');
    fireEvent.mouseEnter(hero);
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
    fireEvent.mouseLeave(hero);
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[0]);
    fireEvent.focus(screen.getByRole('button', { name: 'Next photo' }));
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[0]);
    expect(screen.getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
  });

  test('reduced motion disables automatic cycling but preserves manual navigation', () => {
    window.matchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const { container } = render(<OrganizationHero organization={organization} experiences={experiences} />);
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
    expect(screen.queryByRole('button', { name: /slideshow/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(currentPhoto(container)).toHaveAttribute('src', experiences[0].images[0]);
  });

  test('responds to a changed reduced-motion preference and cleans up listeners/timers', () => {
    const preference = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    window.matchMedia.mockReturnValue(preference);
    const { container, unmount } = render(<OrganizationHero organization={organization} experiences={experiences} />);
    const listener = preference.addEventListener.mock.calls[0][1];
    act(() => { preference.matches = true; listener(); });
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', organization.coverUrl);
    unmount();
    expect(preference.removeEventListener).toHaveBeenCalledWith('change', listener);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('falls back to a thumbnail with no gallery and handles empty/unsafe media without controls', () => {
    const { container, rerender } = render(<OrganizationHero organization={{ name: '<script>Not markup</script>', coverUrl: 'data:text/html,<script>alert(1)</script>' }} experiences={[]} />);
    expect(currentPhoto(container)).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByRole('heading', { name: '<script>Not markup</script>' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<OrganizationHero organization={{ name: 'Empty' }} experiences={[{ title: 'Sailing', images: [], thumbnail: '/boat.jpg' }]} />);
    expect(currentPhoto(container)).toHaveAttribute('src', '/boat.jpg');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('video covers have native controls and never autoplay', () => {
    const { container } = render(<OrganizationHero organization={{ ...organization, coverUrl: '/cover.mp4', coverMediaType: 'video' }} experiences={experiences} />);
    expect(currentPhoto(container)).toHaveAttribute('controls');
    expect(currentPhoto(container)).not.toHaveAttribute('autoplay');
    advance();
    expect(currentPhoto(container)).toHaveAttribute('src', '/cover.mp4');
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(currentPhoto(container).tagName).toBe('IMG');
  });
});
