import Comment from './components/Comment';
import React, { useState } from 'react';
import RatingsOverview from './components/RatingsOverview';
import UserRatingsSelector from './components/UserRatingsSelector';
import { networkAdapter } from 'services/NetworkAdapter';
import Toast from 'components/ux/toast/Toast';
import PaginationController from 'components/ux/pagination-controller/PaginationController';
import Loader from 'components/ux/loader/loader';

/**
 * Renders the user comments component.
 *
 * @component
 * @param {Object} commentData - The comment data object.
 * @returns {JSX.Element} The user comments component.
 */
const UserComments = ({
  commentData,
  handlePageChange,
  handlePreviousPageChange,
  handleNextPageChange,
}) => {
  const [userRating, setUserRating] = useState(0);

  const [userComment, setUserComment] = useState('');

  const [shouldHideUserRatingsSelector, setShouldHideUserRatingsSelector] =
    useState(false);

  const [toastMessage, setToastMessage] = useState('');

  /**
   * Handles the selected user rating.
   * @param {number} rate - The rating value.
   */
  const handleRating = (rate) => {
    setUserRating(rate);
  };

  const clearToastMessage = () => {
    setToastMessage('');
  };

  const handleCommentSubmit = async () => {
    if (userRating === 0) {
      setToastMessage({
        type: 'error',
        message: 'Please select a rating before submitting.',
      });
      return;
    }
    // TODO: Add validation for userRating and userComment
    const response = await networkAdapter.put('/api/hotel/add-comment', {
      rating: userRating,
      comment: userComment,
    });
    if (response && !response?.errors?.length && response?.data?.status) {
      setToastMessage({
        type: 'success',
        message: response.data.status,
      });
    } else {
      setToastMessage({
        type: 'error',
        message: 'Comment submission failed',
      });
    }
    setShouldHideUserRatingsSelector(true);
  };

  const handleUserCommentChange = (comment) => {
    setUserComment(comment);
  };

  const comments = Array.isArray(commentData?.data) ? commentData.data : [];
  const commentMetadata = commentData?.metadata || {};
  const commentPagination = commentData?.pagination || {};
  const isEmpty = comments.length === 0;

  return (
    <div className="flex flex-col p-4 border-t">
      <h1 className="text-xl font-bold text-gray-700">User Comments</h1>
      <div className="flex flex-col md:flex-row py-4 bg-white shadow-sm gap-6">
        {comments.length === 0 ? (
          <div className="w-3/5">
            <span className="text-gray-500 italic">
              Be the first to leave a comment!
            </span>
          </div>
        ) : (
          <RatingsOverview
            averageRating={commentMetadata.averageRating}
            ratingsCount={commentMetadata.totalComments}
            starCounts={commentMetadata.starCounts}
          />
        )}
        {shouldHideUserRatingsSelector ? null : (
          <UserRatingsSelector
            userRating={userRating}
            isEmpty={isEmpty}
            handleRating={handleRating}
            userComment={userComment}
            handleCommentSubmit={handleCommentSubmit}
            handleUserCommentChange={handleUserCommentChange}
          />
        )}
      </div>
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          dismissError={clearToastMessage}
        />
      )}
      <div>
        {commentData.isLoading ? (
          <Loader height={'600px'} />
        ) : (
          <div>
            {comments.map((comment, index) => (
              <Comment
                key={index}
                commenterName={comment.commenterName}
                commentDate={comment.date}
                comment={comment.comment}
                rating={comment.rating}
                verified={comment.verified}
              />
            ))}
          </div>
        )}
      </div>
      {comments.length > 0 && (
        <PaginationController
          currentPage={commentPagination.currentPage}
          totalPages={commentPagination.totalPages}
          handlePageChange={handlePageChange}
          handlePreviousPageChange={handlePreviousPageChange}
          handleNextPageChange={handleNextPageChange}
        />
      )}
    </div>
  );
};

export default UserComments;
