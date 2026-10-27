import React, { useState, lazy, Suspense, useEffect } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import CommentPreview from './CommentPreview';

const ReplyForm = lazy(() => import('./ReplyForm'));
const AddCommentForm = lazy(() => import('./AddCommentForm'));
const ImageGalleryModal = lazy(() => import('../image-gallery-modal/ImageGalleryModal'));

const CommentCard = ({
  comment,
  userDetails,
  renderStars,
  formatCommentDate,
  loadComments,
  commentsTargetType,
}) => {
  const [openReply, setOpenReply] = useState(false);
  const [firstReply, setFirstReply] = useState(null);
  const [allReplies, setAllReplies] = useState(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const isFullyAnonymous = Number(comment.anonymity) === 0;
  const commenterLocation = [comment.commenter?.city, comment.commenter?.country]
    .filter(Boolean)
    .join(', ');

  const rawName = userDetails ? userDetails.firstName : (comment.commenter?.firstName || 'Name unavailable');
  const displayName = (rawName || '').trim();

  const hasUserDetailsLocation = Boolean(userDetails && (userDetails?.city || userDetails?.country));
  const displayLocation = hasUserDetailsLocation
    ? [userDetails?.city, userDetails?.country].filter(Boolean).join(', ')
    : commenterLocation;

  const isOwner = userDetails && userDetails.id && Number(userDetails.id) === Number(comment.commenter?.id) && comment.target?.type === 'organizer';
  const isOrganizer = userDetails && userDetails.organizerProfile && Number(userDetails.organizerProfile.id) === Number(comment.target?.id);
  const canReply = Boolean(userDetails && (isOwner || isOrganizer));

  const commentOwnerId = comment.commenter?.id || comment.UserId || comment.User?.id;
  const isOwnerOfComment = Boolean(userDetails && userDetails.id && Number(userDetails.id) === Number(commentOwnerId));
  const isOrganizerForTarget = Boolean(userDetails && userDetails.organizerProfile && Number(userDetails.organizerProfile.id) === Number(comment.target?.id));
  const canEdit = Boolean(isOwnerOfComment);
  // Delete permission mirrors backend: owner or organizer for the target may delete
  const canDelete = Boolean(isOwnerOfComment || isOrganizerForTarget);
  const commentImages = Array.isArray(comment.images)
    ? comment.images.filter((image) => image && typeof image.imageUrl === 'string' && image.imageUrl.trim())
    : [];
  const thumbnailImages = commentImages.slice(0, 3);

  useEffect(() => {
    let mounted = true;
    const loadFirstReply = async () => {
      try {
        if (!comment || comment.ParentId) return;
        const repliesCount = Number(comment.repliesCount || 0);
        if (repliesCount <= 0) return;
        const resp = await networkAdapter.get(`/api/comments/parent/${comment.id}/replies?limit=1`);
        if (!mounted) return;
        if (resp?.errors?.length) return;
        const el = Array.isArray(resp?.data?.elements) && resp.data.elements.length ? resp.data.elements[0] : null;
        setFirstReply(el);
      } catch (e) {
        // ignore
      }
    };

    loadFirstReply();
    return () => { mounted = false; };
  }, [comment]);

  const loadAllReplies = async () => {
    if (!comment) return;
    setLoadingReplies(true);
    try {
      const resp = await networkAdapter.get(`/api/comments/parent/${comment.id}/replies`);
      if (resp?.errors?.length) {
        setAllReplies([]);
        setLoadingReplies(false);
        return;
      }
      const els = Array.isArray(resp?.data?.elements) ? resp.data.elements : [];
      setAllReplies(els);
    } catch (e) {
      setAllReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  return (
    <div className="border rounded p-3 bg-white">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
        <div>
          <p className="text-amber-500 text-sm">{renderStars(comment.stars)}</p>
          <p className="text-sm font-semibold text-slate-800 break-words">{comment.title}</p>
          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{comment.comment}</p>
          {thumbnailImages.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {thumbnailImages.map((image, index) => (
                <button
                  key={`${image.imageUrl}-${index}`}
                  type="button"
                  className="relative w-16 h-16 rounded overflow-hidden border border-slate-200"
                  onClick={() => {
                    setGalleryStartIndex(index);
                    setIsGalleryOpen(true);
                  }}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.accessibleText || `Review image ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {index === 2 && commentImages.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                      +{commentImages.length - 3}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 md:text-right">
          <p>
            {comment.target?.type === 'organizer' ? 'Organizer' : 'Experience'}: {comment.target?.name || 'Unknown'}
          </p>
          <p>{formatCommentDate(comment.createdAt)}</p>
        </div>
      </div>

      {/* Replies preview / load-all */}
      {(Number(comment.repliesCount || 0) > 0) && (
        <div className="mt-3">
          {firstReply && !allReplies && (
            <div className="pl-4 border-l border-slate-200 mb-2">
              <CommentPreview reply={firstReply} renderStars={renderStars} formatCommentDate={formatCommentDate} userDetails={userDetails} loadComments={loadComments} commentsTargetType={commentsTargetType} />
            </div>
          )}
          {!allReplies && Number(comment.repliesCount || 0) > 1 && (
            <div className="text-sm">
              <button
                type="button"
                className="text-slate-600 underline"
                onClick={loadAllReplies}
                disabled={loadingReplies}
              >
                {loadingReplies ? 'Loading replies…' : `Load all replies (${comment.repliesCount})`}
              </button>
            </div>
          )}
          {allReplies && (
            <div className="space-y-2 mt-2">
                {allReplies.map((r) => (
                <div key={r.id} className="pl-4 border-l border-slate-200">
                  <CommentPreview reply={r} renderStars={renderStars} formatCommentDate={formatCommentDate} userDetails={userDetails} loadComments={loadComments} commentsTargetType={commentsTargetType} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-between items-center">
        <p className="text-xs text-slate-500 text-right">
          {isFullyAnonymous
            ? userDetails ? 'Posted Anonymously' : 'Anonymous User'
            : `${displayName || 'Guest User'}${displayLocation ? ' · ' + displayLocation : ''}`}
        </p>

        <div className="ml-3 flex items-center gap-2">
          {!comment.ParentId && canReply && userDetails && (
            !openReply && (
              <button
                type="button"
                className="px-2 py-1 rounded text-sm border bg-white text-slate-700"
                onClick={() => setOpenReply(true)}
              >
                Reply
              </button>
            )
          )}

          {/* Edit / Delete */}
          {canEdit && (
            !isEditing && (
              <button
                type="button"
                className="px-2 py-1 rounded text-sm border bg-white text-slate-700"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )
          )}

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              className="px-2 py-1 rounded text-sm border bg-white text-red-600"
              onClick={async () => {
                if (!window.confirm('Delete this comment and its replies?')) return;
                setDeleting(true);
                try {
                  const resp = await networkAdapter.delete(`/api/comments/${comment.id}`);
                  if (resp && resp.ok) {
                    if (loadComments) loadComments({ page: 1, append: false, targetType: commentsTargetType });
                  } else if (resp.status === 401) {
                    window.location.href = '/register';
                  } else {
                    // ignore errors for now
                    // could show toast
                  }
                } catch (e) {
                  // ignore
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Inline reply form with smooth transition */}
      <div
        className="mt-2 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: openReply ? '520px' : '0px', opacity: openReply ? 1 : 0 }}
      >
        <Suspense fallback={<div className="text-sm text-slate-500">Loading reply form…</div>}>
          {openReply && (
            <div className="bg-white border rounded shadow-sm p-3">
              <ReplyForm
                parentComment={comment}
                commentableType={comment.target?.type}
                commentableId={comment.target?.id}
                onCancel={() => setOpenReply(false)}
                onSuccess={() => {
                  setOpenReply(false);
                  if (loadComments) loadComments({ page: 1, append: false, targetType: commentsTargetType });
                }}
              />
            </div>
          )}
        </Suspense>
      </div>

      {/* Inline edit form */}
      <div className="mt-2">
        <Suspense fallback={<div className="text-sm text-slate-500">Loading editor…</div>}>
          {isEditing && (
            <div className="bg-white border rounded shadow-sm p-3">
              <AddCommentForm
                initial={comment}
                commentableType={comment.target?.type}
                commentableId={comment.target?.id}
                uploaderUserId={userDetails?.id}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => {
                  setIsEditing(false);
                  if (loadComments) loadComments({ page: 1, append: false, targetType: commentsTargetType });
                }}
              />
            </div>
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <ImageGalleryModal
          images={commentImages}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          initialIndex={galleryStartIndex}
          title={comment.title || 'Review photos'}
        />
      </Suspense>
    </div>
  );
};

export default CommentCard;
