import React from 'react';
import { selectPinnedComments } from '../experienceDetailsTemplate';
import { resolveTemplateCopy } from '../experienceDetailsCopy';

const reviewerName = (comment) => {
  if (Number(comment.anonymity ?? 0) === 0) return 'Anonymous';
  const reviewer = comment.commenter || comment.user || {};
  if (Number(comment.anonymity) === 1) return reviewer.firstName || 'Guest';
  return reviewer.name
    || [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ')
    || comment.commenterName
    || 'Guest';
};

const PinnedExperienceComments = ({ comments, metadata, selectedComments }) => {
  const pinnedComments = selectedComments || selectPinnedComments(comments, metadata);
  const template = metadata?.template || 'default';
  const copy = resolveTemplateCopy(metadata, template);
  const eyebrow = copy.pinnedReviewsEyebrow || copy.reviewsEyebrow;
  const heading = copy.pinnedReviewsHeading || copy.reviewsHeading;
  if (pinnedComments.length === 0) return null;

  return (
    <section className="food-tour-pins" aria-label="Pinned experience comments">
      <p className="food-tour-eyebrow">{eyebrow}</p>
      <h2>{heading}</h2>
      <div className="food-tour-pins__grid">
        {pinnedComments.map((comment) => (
          <article className="food-tour-pins__card" key={comment.id} data-testid="food-tour-pinned-comment">
            <p className="food-tour-pins__label">{copy.pinnedReviewLabel}</p>
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
  );
};

export default PinnedExperienceComments;
