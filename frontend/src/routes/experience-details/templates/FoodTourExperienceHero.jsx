import React, { useEffect, useRef, useState } from 'react';

const safeMediaUrl = (value) => {
  if (typeof value !== 'string' || /[\\\s]/.test(value)) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? value : '';
  } catch {
    return '';
  }
};

const FoodTourExperienceHero = ({ title, subtitle, videoUrl, posterUrl, onOpenGallery }) => {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia
      ? true
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const source = safeMediaUrl(videoUrl);
  const poster = safeMediaUrl(posterUrl);
  const showVideo = Boolean(source && !failed && !reducedMotion);

  useEffect(() => {
    setFailed(false);
    setPaused(true);
  }, [source]);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    try {
      await video.play();
    } catch {
      setPaused(true);
    }
  };

  return (
    <header className="food-tour-hero" aria-label="Food tour introduction">
      {poster && (
        <img
          key={poster}
          className="food-tour-hero__media"
          src={poster}
          alt=""
          aria-hidden="true"
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      )}
      {showVideo && (
        <video
          ref={videoRef}
          className="food-tour-hero__media"
          src={source}
          poster={poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => setFailed(true)}
        />
      )}
      <div className="food-tour-hero__shade" />
      <div className="food-tour-hero__copy">
        <p className="food-tour-eyebrow">Local flavors. Lasting memories.</p>
        <h1 data-testid="experience-details__title">{title}</h1>
        {subtitle && <p data-testid="experience-details__subtitle">{subtitle}</p>}
      </div>
      <div className="food-tour-hero__actions">
        {showVideo && (
          <button type="button" onClick={togglePlayback}>
            {paused ? 'Play background video' : 'Pause background video'}
          </button>
        )}
        {onOpenGallery && <button type="button" onClick={onOpenGallery}>View tour photos</button>}
      </div>
    </header>
  );
};

export default FoodTourExperienceHero;
