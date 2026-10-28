import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import FoodTourExperienceHero from './FoodTourExperienceHero';

describe('FoodTourExperienceHero', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const props = {
    title: 'The taco trail',
    subtitle: 'Taste the city with a local chef',
    videoUrl: '/api/media/42/file',
    posterUrl: 'https://media.example.test/tacos.jpg',
  };

  test('uses uploaded media as a muted, inline decorative widescreen hero', () => {
    const { container } = render(<FoodTourExperienceHero {...props} />);
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', props.videoUrl);
    expect(video).toHaveAttribute('poster', props.posterUrl);
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { level: 1, name: props.title })).toBeInTheDocument();
    expect(screen.getByText(props.subtitle)).toBeInTheDocument();
  });

  test('never loads motion media when the visitor prefers reduced motion', () => {
    window.matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { container } = render(<FoodTourExperienceHero {...props} />);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', props.posterUrl);
    expect(screen.queryByRole('button', { name: /background video/ })).not.toBeInTheDocument();
  });

  test('responds to preference changes and removes its listener on unmount', () => {
    const query = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    window.matchMedia.mockReturnValue(query);
    const { container, unmount } = render(<FoodTourExperienceHero {...props} />);
    const update = query.addEventListener.mock.calls[0][1];
    query.matches = true;
    act(() => update());
    expect(container.querySelector('video')).toBeNull();
    unmount();
    expect(query.removeEventListener).toHaveBeenCalledWith('change', update);
  });

  test('keeps the poster and readable content if video fails', () => {
    const { container } = render(<FoodTourExperienceHero {...props} />);
    fireEvent.error(container.querySelector('video'));
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', props.posterUrl);
    expect(screen.getByRole('heading', { name: props.title })).toBeInTheDocument();
  });

  test('offers accessible playback controls without unmuting', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container } = render(<FoodTourExperienceHero {...props} />);
    const video = container.querySelector('video');
    fireEvent.click(screen.getByRole('button', { name: 'Play background video' }));
    await waitFor(() => expect(play).toHaveBeenCalled());
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    fireEvent.play(video);
    fireEvent.click(screen.getByRole('button', { name: 'Pause background video' }));
    expect(pause).toHaveBeenCalled();
    expect(video.muted).toBe(true);
  });

  test('safely handles blocked playback', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('Autoplay blocked'));
    render(<FoodTourExperienceHero {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play background video' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play background video' })).toBeInTheDocument());
  });

  // eslint-disable-next-line no-script-url
  test.each(['javascript:alert(1)', '//untrusted.test/video.mp4', '/\\untrusted.test/video.mp4'])(
    'does not render unsafe media source %s',
    (videoUrl) => {
      const { container } = render(<FoodTourExperienceHero {...props} videoUrl={videoUrl} posterUrl="data:image/svg+xml,bad" />);
      expect(container.querySelector('video')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByRole('heading', { name: props.title })).toBeInTheDocument();
    }
  );
});
