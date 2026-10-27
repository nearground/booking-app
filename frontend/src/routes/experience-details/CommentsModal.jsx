import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import CommentCard from '../../components/comments/CommentCard';
import GuestCommentPrompt from '../../components/comments/GuestCommentPrompt';
import useModalAccessibility from '../../components/ux/modal/useModalAccessibility';

const CommentsModal = ({ isOpen, onClose, comments, isLoggedIn = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const dialogRef = useRef(null);
  useModalAccessibility({ isOpen, onClose, dialogRef });

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setCurrentPage(1);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Paginate top-level comments (exclude replies from page count)
  const topLevelComments = Array.isArray(comments) ? comments.filter((c) => !c.ParentId) : [];
  const totalPages = Math.ceil(topLevelComments.length / itemsPerPage) || 1;
  const currentTopLevel = topLevelComments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderStars = (count) =>
    Array.from({ length: Math.round(count || 0) }).map((_, index) => (
      <FontAwesomeIcon key={index} icon={faStar} className="text-amber-500" />
    ));

  const formatCommentDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const prevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div
      className="responsive-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="All comments"
        tabIndex={-1}
        className="responsive-dialog relative bg-white rounded-xl shadow-lg max-w-4xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap shrink-0 justify-between items-center gap-2 px-4 py-2 border-b border-slate-200">
          <h3 className="min-w-0 text-lg font-semibold text-slate-800">
            All Comments ({topLevelComments.length})
          </h3>
          {!isLoggedIn && <GuestCommentPrompt />}
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 text-slate-500 hover:text-slate-700 text-2xl leading-none"
            aria-label="Close comments"
          >
            ×
          </button>
        </div>

        <div className="responsive-dialog__body flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentTopLevel.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                userDetails={null}
                renderStars={renderStars}
                formatCommentDate={formatCommentDate}
                loadComments={null}
                commentsTargetType="experience"
              />
            ))}
            {currentTopLevel.length === 0 && (
              <p className="text-slate-500 md:col-span-2 text-center">
                No comments found.
              </p>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap shrink-0 justify-between items-center gap-2 px-3 py-2 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="min-h-11 min-w-11 px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="min-h-11 min-w-11 px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsModal;
