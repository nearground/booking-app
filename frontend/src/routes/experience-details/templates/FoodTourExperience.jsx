import React from 'react';
import FoodTourExperienceHero from './FoodTourExperienceHero';
import OrganizerCard from '../components/OrganizerCard';
import { resolveDetailsMedia, selectPinnedComments } from '../experienceDetailsTemplate';
import './FoodTourExperience.css';

const FONT_CLASSES = {
  editorial: 'food-tour-experience--editorial',
  rounded: 'food-tour-experience--rounded',
  humanist: 'food-tour-experience--humanist',
  system: 'food-tour-experience--system',
  inter: 'food-tour-experience--inter',
  roboto: 'food-tour-experience--roboto',
  lato: 'food-tour-experience--lato',
  montserrat: 'food-tour-experience--montserrat',
};
const ACCENT_CLASSES = {
  terracotta: 'food-tour-experience--terracotta',
  citrus: 'food-tour-experience--citrus',
  forest: 'food-tour-experience--forest',
};

export const selectFoodTourPinnedComments = (comments) => {
  const seen = new Set();
  return (Array.isArray(comments) ? comments : []).filter((comment) => {
    if (!comment || comment.id == null || comment.ParentId || Number(comment.stars) !== 5) return false;
    if (comment.target?.type && comment.target.type !== 'experience') return false;
    const key = String(comment.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
};

const reviewerName = (comment) => {
  if (Number(comment.anonymity ?? 0) === 0) return 'Anonymous';
  const reviewer = comment.commenter || comment.user || {};
  if (Number(comment.anonymity) === 1) return reviewer.firstName || 'Guest';
  return reviewer.name
    || [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ')
    || comment.commenterName
    || 'Guest';
};

const FoodTourExperience = ({
  experience,
  metadata,
  presentation = {},
  children,
  booking,
  reviews,
  onSelectOrganizer,
  onOpenGallery,
}) => {
  const ux = presentation.uxOverrides || {};
  const media = resolveDetailsMedia(metadata || experience.detailsMetadata);
  const pinnedComments = selectFoodTourPinnedComments(
    presentation.pinnedComments || selectPinnedComments(experience.comments, metadata || experience.detailsMetadata)
  );
  const brandFont = presentation.brandFont || experience.Organization?.font;
  const className = [
    'food-tour-experience',
    FONT_CLASSES[brandFont] || FONT_CLASSES.editorial,
    ACCENT_CLASSES[ux.accent] || ACCENT_CLASSES.terracotta,
    ux.density === 'compact' ? 'food-tour-experience--compact' : '',
    ux.corners === 'square' ? 'food-tour-experience--square' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className} data-testid="food-tour-experience">
      <FoodTourExperienceHero
        title={experience.title}
        subtitle={experience.subtitle}
        videoUrl={presentation.heroVideoUrl || media.heroVideoUrl}
        posterUrl={presentation.heroPosterUrl || media.heroPosterUrl || experience.thumbnail}
        onOpenGallery={onOpenGallery}
      />
      <div className="food-tour-experience__content">
        {children ?? (
          <div className="food-tour-details">
            <div>
              <p className="food-tour-details__rating" data-testid="experience-details__rating">
                ★ {Number(experience.ratings || 0).toFixed(2)} ({experience.commentCount || 0} comments)
              </p>
              <section aria-label="Tour description">
                <h2>What You'll Do</h2>
                {(experience.description || 'Full experience details will be shared soon.')
                  .split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </section>
              <section aria-label="Tour organizers">
                <h2>Meet your local hosts</h2>
                <div className="food-tour-details__hosts">
                  {(Array.isArray(experience.organizers) ? experience.organizers : []).map((organizer) => (
                    <OrganizerCard
                      key={organizer.id || organizer.name}
                      organizer={organizer}
                      compact
                      onSelect={onSelectOrganizer || (() => {})}
                    />
                  ))}
                </div>
              </section>
              <section aria-label="Meeting location">
                <h2>Where we'll meet</h2>
                <p>{experience.Location?.name || 'Location details unavailable'}</p>
                <p>{[
                  experience.Location?.street, experience.Location?.city, experience.Location?.state,
                  experience.Location?.zipCode, experience.Location?.country,
                ].filter(Boolean).join(', ')}</p>
              </section>
            </div>
            <aside aria-label="Book this food tour">{booking}</aside>
          </div>
        )}
        {reviews}
      </div>
      {pinnedComments.length > 0 && (
        <section className="food-tour-pins" aria-label="Pinned experience comments">
          <p className="food-tour-eyebrow">From our guests</p>
          <h2>A taste of what guests love</h2>
          <div className="food-tour-pins__grid">
            {pinnedComments.map((comment) => (
              <article className="food-tour-pins__card" key={comment.id} data-testid="food-tour-pinned-comment">
                <p className="food-tour-pins__label">Pinned experience review</p>
                <p className="food-tour-pins__stars" aria-label="5 out of 5 stars">
                  <span aria-hidden="true">★★★★★</span>
                </p>
                {comment.title && <h3>{comment.title}</h3>}
                <blockquote>{comment.comment}</blockquote>
                <p className="food-tour-pins__author">{reviewerName(comment)}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FoodTourExperience;
