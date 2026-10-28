import { useEffect, useMemo, useState } from 'react';

const safeMediaUrl = (value) => {
  if (typeof value !== 'string') return null;
  return /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value) ? value : null;
};

const OrganizationHero = ({ organization, experiences }) => {
  const slides = useMemo(() => {
    const candidates = [
      { url: organization.coverUrl, type: organization.coverMediaType === 'video' ? 'video' : 'image', label: `${organization.name} cover` },
      ...experiences.flatMap((experience) => {
        const photos = Array.isArray(experience.images) && experience.images.length
          ? experience.images
          : [experience.thumbnail];
        return photos.map((photo) => ({
          url: typeof photo === 'string' ? photo : photo?.imageUrl,
          type: 'image',
          label: experience.title,
        }));
      }),
    ];
    const seen = new Set();
    return candidates.filter((slide) => {
      slide.url = safeMediaUrl(slide.url);
      if (!slide.url || seen.has(slide.url)) return false;
      seen.add(slide.url);
      return true;
    });
  }, [organization.coverUrl, organization.coverMediaType, organization.name, experiences]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const activeIndex = index % (slides.length || 1);
  const active = slides[activeIndex];
  const playing = slides.length > 1 && !paused && !hovered && !reducedMotion && active?.type !== 'video';

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!preference) return undefined;
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener?.('change', update);
    return () => preference.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);

  const navigate = (direction) => {
    setPaused(true);
    setIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <header
      className={`org-site-hero${active?.type === 'video' ? ' org-site-video-hero' : ''}`}
      aria-label={`${organization.name} highlights`}
      aria-roledescription={slides.length > 1 ? 'carousel' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
      onKeyDown={(event) => {
        if (slides.length < 2 || event.target.tagName === 'VIDEO') return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          navigate(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      {active?.type === 'video'
        ? <video key={active.url} className="org-site-cover org-site-cover-video" src={active.url} controls muted playsInline preload="metadata" aria-label={active.label} />
        : active ? <img key={active.url} className="org-site-cover" src={active.url} alt="" /> : null}
      <div className="org-site-shade" />
      <div className="org-site-brand">
        {safeMediaUrl(organization.logoUrl) ? <img className="org-site-logo" src={organization.logoUrl} alt={`${organization.name} logo`} /> : null}
        <p className="org-site-kicker">Local stories. Unforgettable experiences.</p>
        <h1>{organization.name}</h1>
        {organization.tagline ? <p className="org-site-tagline">{organization.tagline}</p> : null}
        <a className="org-site-hero-action" href="#organization-experiences">Explore our experiences <span aria-hidden="true">↗</span></a>
      </div>
      {slides.length > 1 ? (
        <div className="org-site-carousel-controls">
          <button type="button" onClick={() => navigate(-1)} aria-label="Previous photo">←</button>
          <span className="org-site-carousel-caption" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
            {activeIndex + 1} / {slides.length}<span className="org-site-carousel-title"> · {active.label}</span>
          </span>
          <button type="button" onClick={() => navigate(1)} aria-label="Next photo">→</button>
          {!reducedMotion ? <button type="button" onClick={() => setPaused((current) => !current)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>{paused ? 'Play' : 'Pause'}</button> : null}
        </div>
      ) : null}
    </header>
  );
};

export default OrganizationHero;
