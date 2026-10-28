import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { networkAdapter } from 'services/NetworkAdapter';
import './experience-map.scss';
import 'leaflet/dist/leaflet.css';

const PUERTO_VALLARTA_CENTER = [20.6534, -105.2253];

const getCoordinates = (experience) => {
  const coordinates = experience.Location?.coordinates?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [longitude, latitude] = coordinates.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [latitude, longitude];
};

const MapFocus = ({ experience }) => {
  const map = useMap();
  useEffect(() => {
    const coordinates = experience && getCoordinates(experience);
    if (coordinates) map.setView(coordinates, Math.max(map.getZoom(), 14));
  }, [experience, map]);
  return null;
};

const markerIcon = (highlighted) => L.divIcon({
  className: `experience-map-marker${highlighted ? ' experience-map-marker-highlighted' : ''}`,
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const ExperienceMap = ({ experienceType = 'experience' }) => {
  const [experiences, setExperiences] = useState([]);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [minimumRating, setMinimumRating] = useState('');
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.resolve(networkAdapter.get('/api/experiences/nearbyExperiences?city=Puerto%20Vallarta'))
      .then((response) => {
        if (!active) return;
        if (!response?.ok || response.errors?.length || !Array.isArray(response.data?.elements)) {
          setStatus('error');
          return;
        }
        setExperiences(response.data.elements);
        setStatus('loaded');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, []);

  const mapExperiences = useMemo(() => experiences
    .map((experience) => ({ ...experience, coordinates: getCoordinates(experience) }))
    .filter((experience) => experience.coordinates
      && (experienceType === 'event'
        ? experience.detailsMetadata?.template === 'event'
        : experience.detailsMetadata?.template !== 'event')), [experiences, experienceType]);

  useEffect(() => {
    if (status === 'loaded') searchInputRef.current?.focus();
  }, [status]);

  const visibleExperiences = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return mapExperiences.filter((experience) => {
      const matchesSearch = !normalizedSearch
        || `${experience.title || ''} ${experience.subtitle || ''} ${experience.Location?.name || ''}`.toLowerCase().includes(normalizedSearch);
      const price = Number(experience.price);
      const matchesPrice = !maximumPrice || !Number.isFinite(price) || price <= Number(maximumPrice);
      const matchesRating = !minimumRating || Number(experience.ratings) >= Number(minimumRating);
      return (matchesSearch && matchesPrice && matchesRating) || highlightedIds.includes(experience.id);
    });
  }, [highlightedIds, mapExperiences, maximumPrice, minimumRating, search]);

  const selectedExperience = mapExperiences.find(({ id }) => id === selectedId);
  const markerIcons = useMemo(() => ({
    default: markerIcon(false),
    highlighted: markerIcon(true),
  }), []);

  const toggleHighlight = (id) => {
    setHighlightedIds((current) => current.includes(id)
      ? current.filter((highlightedId) => highlightedId !== id)
      : [...current, id]);
  };

  return (
    <section className="experience-map-widget" aria-labelledby="experience-map-title">
      <header className="experience-map-heading">
        <div>
          <p className="experience-map-eyebrow">Explore Puerto Vallarta</p>
          <h2 id="experience-map-title">{experienceType === 'event' ? 'Find your next event' : 'Find your next experience'}</h2>
        </div>
        {status === 'loaded' ? (
          <span>{mapExperiences.length} {mapExperiences.length === 1 ? 'experience' : 'experiences'} nearby</span>
        ) : null}
      </header>
      {status === 'loading' ? <p className="experience-map-state" role="status">Finding experiences around the bay...</p> : null}
      {status === 'error' ? <p className="experience-map-state" role="alert">Experiences could not be loaded. Please try again later.</p> : null}
      {status === 'loaded' && mapExperiences.length === 0 ? <p className="experience-map-state">No mapped experiences are available in Puerto Vallarta right now.</p> : null}
      {status === 'loaded' && mapExperiences.length > 0 ? (
        <div className="experience-map-layout">
          <aside className="experience-map-sidebar" aria-label="Experience search and results">
            <label className="experience-map-search">
              <span>Search experiences</span>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Tours, neighborhoods..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="experience-map-filters">
              <label>
                <span>Maximum price</span>
                <select value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)}>
                  <option value="">Any price</option>
                  {[25, 50, 75, 100, 150, 200].map((price) => <option key={price} value={price}>Up to ${price}</option>)}
                </select>
              </label>
              <label>
                <span>Minimum rating</span>
                <select value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}>
                  <option value="">Any rating</option>
                  <option value="3">3+ stars</option>
                  <option value="4">4+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                </select>
              </label>
            </div>
            <p className="experience-map-result-count">
              {visibleExperiences.length} {visibleExperiences.length === 1 ? 'experience' : 'experiences'} shown
              {highlightedIds.length ? ` · ${highlightedIds.length} highlighted` : ''}
            </p>
            <div className="experience-map-cards">
              {visibleExperiences.map((experience) => {
                const highlighted = highlightedIds.includes(experience.id);
                return (
                  <article
                    className={`experience-map-card${selectedId === experience.id ? ' is-selected' : ''}`}
                    key={experience.id}
                  >
                    <button
                      type="button"
                      className="experience-map-card-select"
                      onClick={() => setSelectedId(experience.id)}
                      aria-pressed={selectedId === experience.id}
                    >
                      {experience.thumbnail
                        ? <img src={experience.thumbnail} alt="" loading="lazy" />
                        : <span className="experience-map-card-placeholder" aria-hidden="true" />}
                      <span className="experience-map-card-copy">
                        <strong>{experience.title}</strong>
                        <span>{experience.Location?.name || 'Puerto Vallarta'}</span>
                        <span className="experience-map-card-meta">
                          {experience.price ? `From $${Number(experience.price).toFixed(2)}` : 'See prices'}
                          {experience.ratings ? ` · ★ ${Number(experience.ratings).toFixed(1)}` : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="experience-map-highlight"
                      aria-label={`${highlighted ? 'Remove highlight from' : 'Highlight'} ${experience.title}`}
                      aria-pressed={highlighted}
                      onClick={() => toggleHighlight(experience.id)}
                    >
                      {highlighted ? '★' : '☆'}
                    </button>
                  </article>
                );
              })}
            </div>
            {visibleExperiences.length === 0 ? <p className="experience-map-no-results">No matches. Try changing your filters.</p> : null}
          </aside>
          <div className="experience-map-canvas" aria-label="Map of Puerto Vallarta experiences">
            <MapContainer center={PUERTO_VALLARTA_CENTER} zoom={12} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFocus experience={selectedExperience} />
              {visibleExperiences.map((experience) => (
                <Marker
                  key={experience.id}
                  position={experience.coordinates}
                  icon={highlightedIds.includes(experience.id) ? markerIcons.highlighted : markerIcons.default}
                  eventHandlers={{ click: () => setSelectedId(experience.id) }}
                >
                  <Popup>
                    <div className="experience-map-popup">
                      <strong>{experience.title}</strong>
                      <span>{experience.price ? `From $${Number(experience.price).toFixed(2)}` : 'View experience details'}</span>
                      <a href={`/experience/${experience.id}`}>Explore experience</a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ExperienceMap;
