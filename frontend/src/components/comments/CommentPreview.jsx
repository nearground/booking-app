import React, { useState, lazy, Suspense } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

const AddCommentForm = lazy(() => import('./AddCommentForm'));

const CommentPreview = ({ reply, renderStars, formatCommentDate, userDetails, loadComments, commentsTargetType }) => {
  if (!reply) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAnonymous = Number(reply.anonymity) === 0;
  let author = 'Guest User';
  if (isAnonymous) author = 'Anonymous User';
  else if (reply.commenter && (reply.commenter.firstName || reply.commenter.lastName)) {
    author = `${reply.commenter.firstName || ''} ${reply.commenter.lastName || ''}`.trim() || 'Guest User';
  } else if (reply.commenterName) {
    author = reply.commenterName;
  } else if (reply.UserId) {
    author = `User ${reply.UserId}`;
  }

  const commentOwnerId = reply.commenter?.id || reply.UserId || reply.User?.id;
  const isOwnerOfComment = Boolean(userDetails && userDetails.id && Number(userDetails.id) === Number(commentOwnerId));
  const isOrganizerForTarget = Boolean(userDetails && userDetails.organizerProfile && Number(userDetails.organizerProfile.id) === Number(reply.CommentableId));
  const canEdit = Boolean(isOwnerOfComment);
  const canDelete = Boolean(isOwnerOfComment || isOrganizerForTarget);

  return (
    <div className="bg-slate-50 rounded p-2">
      {!isEditing && (
        <>
          <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{reply.comment}</div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-slate-500">{formatCommentDate(reply.createdAt)}</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500">{author}</div>
              {canEdit && (
                <button
                  type="button"
                  className="px-2 py-1 rounded text-xs border bg-white text-slate-700"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  disabled={deleting}
                  className="px-2 py-1 rounded text-xs border bg-white text-red-600"
                  onClick={async () => {
                    if (!window.confirm('Delete this comment and its replies?')) return;
                    setDeleting(true);
                    try {
                      const resp = await networkAdapter.delete(`/api/comments/${reply.id}`);
                      if (resp && resp.ok) {
                        if (loadComments) loadComments({ page: 1, append: false, targetType: commentsTargetType });
                      } else if (resp && resp.status === 401) {
                        window.location.href = '/register';
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
        </>
      )}

      {isEditing && (
        <Suspense fallback={<div className="text-sm text-slate-500">Loading editor…</div>}>
          <div>
            <AddCommentForm
              initial={reply}
              commentableType={(reply.CommentableType || 'experience').toString().toLowerCase()}
              commentableId={reply.CommentableId}
              uploaderUserId={userDetails?.id}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                setIsEditing(false);
                if (loadComments) loadComments({ page: 1, append: false, targetType: commentsTargetType });
              }}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
};

export default CommentPreview;
