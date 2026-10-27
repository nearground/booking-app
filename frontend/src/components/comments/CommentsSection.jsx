import React, { useEffect } from 'react';
import CommentCard from './CommentCard';

const REVIEW_FILTER_OPTIONS = [
  { value: 'organizer', label: 'About You' },
  { value: 'experience', label: 'Your Experiences' },
  { value: 'all', label: 'All Reviews' },
];

const CommentsSection = ({
  userDetails,
  comments,
  commentsTargetType,
  setCommentsTargetType,
  commentsSortType,
  setCommentsSortType,
  commentsPageSize,
  setCommentsPageSize,
  isLoadingComments,
  loadComments,
  commentsMetadata,
  commentsError,
  renderStars,
  formatCommentDate,
  onLoginRedirect,
  displayText
}) => {
  useEffect(() => {
    // Only auto-load when no comments value has been provided yet (null/undefined).
    // Avoid triggering when comments is an empty array, as parents manage loading and
    // repeatedly setting empty arrays causes a reload loop.
    if (
      typeof loadComments === 'function' &&
      !isLoadingComments &&
      (comments === undefined || comments === null)
    ) {
      loadComments({ page: 1, append: false, targetType: commentsTargetType });
    }
  }, [loadComments, isLoadingComments, comments, commentsTargetType]);
  return (
    <div id="received-comments-section" className="bg-white rounded shadow-md p-4 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-700">Reviews</h3>
          <p className="text-sm text-slate-500">
            {displayText || 'Reviews'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {setCommentsTargetType && REVIEW_FILTER_OPTIONS.map((option) => {
            const isActive = commentsTargetType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`px-3 py-1.5 rounded text-sm border ${
                  isActive
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
                onClick={() => setCommentsTargetType(option.value)}
              >
                {option.label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="comments-sort-type" className="text-sm text-slate-600">
              Sort
            </label>
            <select
              id="comments-sort-type"
              className="border rounded px-2 py-1.5 text-sm"
              value={commentsSortType}
              onChange={(event) => setCommentsSortType(event.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="rating_desc">Rating: High to Low</option>
              <option value="rating_asc">Rating: Low to High</option>
            </select>

            <label htmlFor="comments-page-size" className="text-sm text-slate-600">
              Per page
            </label>
            <select
              id="comments-page-size"
              className="border rounded px-2 py-1.5 text-sm"
              value={commentsPageSize}
              onChange={(event) => setCommentsPageSize(Number(event.target.value))}
            >
              {[5, 10, 15, 25, 50].map((sizeOption) => (
                <option key={sizeOption} value={sizeOption}>
                  {sizeOption}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="px-3 py-1.5 rounded text-sm border border-slate-300 bg-white text-slate-700"
              disabled={isLoadingComments}
              onClick={() =>
                loadComments({
                  page: 1,
                  append: false,
                  targetType: commentsTargetType,
                })
              }
            >
              {isLoadingComments ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-slate-50">
        <p className="text-xs text-slate-500 mb-3">
          {commentsMetadata.totalItems || 0} comment
          {Number(commentsMetadata.totalItems || 0) === 1 ? '' : 's'}
        </p>

        {isLoadingComments && comments.length === 0 ? (
          <div className="animate-pulse h-20 rounded bg-slate-200" />
        ) : commentsError ? (
          <div className="border border-red-200 bg-red-50 rounded p-3">
            <p className="text-sm text-red-700">{commentsError}</p>
            <button
              type="button"
              className="mt-2 px-3 py-1.5 rounded text-sm bg-red-600 text-white"
              onClick={() => {
                const shouldNavigateToLogin = String(commentsError || '')
                  .toLowerCase()
                  .includes('please login to access this resource');

                if (shouldNavigateToLogin) {
                  onLoginRedirect();
                  return;
                }

                loadComments({
                  page: 1,
                  append: false,
                  targetType: commentsTargetType,
                });
              }}
            >
              Retry
            </button>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews found for this selection yet.</p>
        ) : (
          <>
            <div className="space-y-3">
              {comments.filter((c) => !c.ParentId).map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  userDetails={userDetails}
                  renderStars={renderStars}
                  formatCommentDate={formatCommentDate}
                  loadComments={loadComments}
                  commentsTargetType={commentsTargetType}
                />
              ))}
            </div>

            {commentsMetadata.hasNext && (
              <div className="mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-slate-800 text-white"
                  disabled={isLoadingComments}
                  onClick={() =>
                    loadComments({
                      page: Number(commentsMetadata.currentPage || 1) + 1,
                      append: true,
                      targetType: commentsTargetType,
                    })
                  }
                >
                  {isLoadingComments ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
