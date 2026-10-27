import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

const getReviewerName = (review) => {
  if (Number(review?.anonymity) === 0) {
    return 'Anonymous';
  }

  const commenterName = typeof review?.commenter?.name === 'string'
    ? review.commenter.name.trim()
    : `${review?.commenter?.firstName || ''} ${review?.commenter?.lastName || ''}`.trim();
  const fallbackName = typeof review?.commenterName === 'string' ? review.commenterName.trim() : '';

  return commenterName || fallbackName || 'Anonymous';
};

const ReviewSidebar = ({ review }) => {
  if (!review) {
    return null;
  }

  const reviewerName = getReviewerName(review);
  const roundedStars = Math.max(0, Math.round(Number(review.stars) || 0));

  return (
    <aside
      className="w-full min-w-0 [overflow-wrap:anywhere] rounded-3xl bg-white/95 p-5 text-slate-900 shadow-2xl backdrop-blur-sm lg:h-full"
      aria-label="Review context"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Guest Photo
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-lg font-semibold text-slate-900">{reviewerName}</p>
        {Number(review?.anonymity) === 0 ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            Anonymous
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-1 text-amber-500" aria-label={`${roundedStars} star review`}>
        {roundedStars > 0 ? (
          Array.from({ length: roundedStars }, (_, index) => (
            <FontAwesomeIcon key={index} icon={faStar} />
          ))
        ) : (
          <span className="text-sm font-medium text-slate-500">No rating provided</span>
        )}
      </div>

      {review.title ? (
        <p className="mt-4 text-base font-semibold text-slate-900">{review.title}</p>
      ) : null}

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {review.comment || 'No review text provided.'}
      </p>
    </aside>
  );
};

export default ReviewSidebar;