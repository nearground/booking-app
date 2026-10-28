import React from 'react';
import FoodTourExperienceHero from './FoodTourExperienceHero';
import OrganizerCard from '../components/OrganizerCard';
import { resolveDetailsMedia, selectPinnedComments } from '../experienceDetailsTemplate';
import { resolveTemplateCopy } from '../experienceDetailsCopy';
import PinnedExperienceComments from '../components/PinnedExperienceComments';
import { isValidOrganizationSiteSlug, resolveAppUrl } from '../../organization-site/organizationSiteResolver';
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

const FoodTourExperience = ({
  experience,
  metadata,
  presentation = {},
  children,
  booking,
  reviews,
  onSelectOrganizer,
  onOpenGallery,
  showPinnedComments = true,
}) => {
  const ux = presentation.uxOverrides || {};
  const copy = resolveTemplateCopy(metadata || experience.detailsMetadata, 'food-tour');
  const media = resolveDetailsMedia(metadata || experience.detailsMetadata);
  const pinnedComments = selectFoodTourPinnedComments(
    presentation.pinnedComments || selectPinnedComments(experience.comments, metadata || experience.detailsMetadata)
  );
  const brandFont = presentation.brandFont || experience.Organization?.font;
  const primaryColor = experience.Organization?.primaryColor;
  const brandAccent = typeof primaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(primaryColor)
    ? primaryColor : null;
  const className = [
    'food-tour-experience',
    FONT_CLASSES[brandFont] || FONT_CLASSES.editorial,
    ACCENT_CLASSES[ux.accent] || ACCENT_CLASSES.terracotta,
    ux.density === 'compact' ? 'food-tour-experience--compact' : '',
    ux.corners === 'square' ? 'food-tour-experience--square' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      style={brandAccent ? { '--food-tour-accent': brandAccent } : undefined}
      data-testid="food-tour-experience"
    >
      <FoodTourExperienceHero
        title={experience.title}
        subtitle={experience.subtitle}
        videoUrl={presentation.heroVideoUrl || experience.detailsMedia?.heroVideoUrl || media.heroVideoUrl}
        posterUrl={presentation.heroPosterUrl || experience.detailsMedia?.heroPosterUrl || media.heroPosterUrl || experience.thumbnail}
        onOpenGallery={onOpenGallery}
        copy={copy}
      />
      <div className="food-tour-experience__content">
        {isValidOrganizationSiteSlug(experience.Organization?.slug) && (
          <a
            href={resolveAppUrl(`/o/${encodeURIComponent(experience.Organization.slug)}`)}
            className="inline-block py-2 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            View {experience.Organization.name || 'organization'} profile
          </a>
        )}
        {children ?? (
          <div className="food-tour-details">
            <div>
              <p className="food-tour-details__rating" data-testid="experience-details__rating">
                ★ {Number(experience.ratings || 0).toFixed(2)} ({experience.commentCount || 0} comments)
              </p>
              <section aria-label="Tour description">
                <h2>{copy.descriptionHeading}</h2>
                {(experience.description || copy.descriptionFallback)
                  .split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </section>
              <section aria-label="Tour organizers">
                <h2>{copy.hostsHeading}</h2>
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
                <h2>{copy.locationHeading}</h2>
                <p>{experience.Location?.name || copy.locationFallback}</p>
                <p>{[
                  experience.Location?.street, experience.Location?.city, experience.Location?.state,
                  experience.Location?.zipCode, experience.Location?.country,
                ].filter(Boolean).join(', ')}</p>
              </section>
            </div>
            <aside aria-label={copy.bookingLabel}>{booking}</aside>
          </div>
        )}
        {reviews}
      </div>
      {showPinnedComments && pinnedComments.length > 0 ? (
        <PinnedExperienceComments
          selectedComments={pinnedComments}
          metadata={metadata || experience.detailsMetadata || { version: 1, template: 'food-tour', overrides: {} }}
        />
      ) : null}
    </div>
  );
};

export default FoodTourExperience;
