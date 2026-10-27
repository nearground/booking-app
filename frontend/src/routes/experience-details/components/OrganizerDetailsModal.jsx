import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faStar } from '@fortawesome/free-solid-svg-icons';
import CommentPreview from '../../../components/comments/CommentPreview';

const OrganizerDetailsModal = ({ organizer, contactHref, contactLabel, onClose }) => {
  if (!organizer) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3">
          <p className="text-base font-semibold text-slate-800">Hosted By</p>
          <button
            type="button"
            className="text-slate-500 text-2xl leading-none"
            onClick={onClose}
            aria-label="Close organizer details"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center text-center">
          {organizer.profilePicture ? (
            <img
              src={organizer.profilePicture}
              alt={organizer.name || 'Organizer'}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-200" />
          )}
          <p className="mt-3 text-lg font-semibold text-slate-800">
            {organizer.name || 'Organizer'}
          </p>
          <p className="mt-2 text-sm text-slate-600 leading-6">
            {organizer.description || 'Organizer profile details coming soon.'}
          </p>

          <div className="mt-4 w-full">
            <div className="flex flex-wrap justify-center gap-2">
              {organizer.socials?.instagram ? (
                <a
                  href={organizer.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-md px-3 py-1"
                >
                  Instagram
                </a>
              ) : null}
              {organizer.socials?.facebook ? (
                <a
                  href={organizer.socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-md px-3 py-1"
                >
                  Facebook
                </a>
              ) : null}
              {organizer.socials?.x ? (
                <a
                  href={organizer.socials.x}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-md px-3 py-1"
                >
                  X
                </a>
              ) : null}
            </div>
          </div>

          {contactHref ? (
            <a
              href={contactHref}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 text-white text-sm font-semibold px-4 py-2"
            >
              <FontAwesomeIcon
                icon={organizer.contact?.email ? faEnvelope : faPhone}
                className="text-xs"
              />
              {contactLabel}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-200 text-slate-500 text-sm font-semibold px-4 py-2 cursor-not-allowed"
            >
              {contactLabel}
            </button>
          )}

          <div className="mt-5 w-full text-left border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Organizer Comments</p>
              <p className="text-xs text-slate-600">
                {organizer.organizerAverageRating !== null && organizer.organizerAverageRating !== undefined
                  ? `${Number(organizer.organizerAverageRating).toFixed(2)} (${organizer.organizerCommentCount || 0})`
                  : 'No ratings yet'}
              </p>
            </div>

            {Array.isArray(organizer.organizerComments) && organizer.organizerComments.length > 0 ? (
              <div className="mt-3">
                <div className="space-y-3 max-h-[40vh] sm:max-h-[60vh] overflow-y-auto pr-2">
                {
                  // Group comments by ParentId so replies can be shown under their parent
                  (() => {
                    const comments = organizer.organizerAllComments || organizer.organizerComments || [];
                    const byParent = comments.reduce((acc, c) => {
                      const pid = c.ParentId || null;
                      acc[pid] = acc[pid] || [];
                      acc[pid].push(c);
                      return acc;
                    }, {});

                    const topLevel = (byParent[null] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    const formatCommentDate = (iso) => {
                      try {
                        return new Date(iso).toLocaleString();
                      } catch (e) {
                        return iso;
                      }
                    };

                    return topLevel.map((comment) => (
                      <div key={comment.id}>
                        <div className="border border-slate-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            {Array.from({ length: Math.round(comment.stars || 0) }).map((_, index) => (
                              <FontAwesomeIcon key={index} icon={faStar} className="text-amber-500" />
                            ))}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{comment.title}</p>
                          <p className="mt-1 text-xs text-slate-600 leading-5 whitespace-pre-wrap break-words">{comment.comment}</p>
                        </div>

                        {/* Render replies, if any */}
                        {(byParent[comment.id] || []).length > 0 && (
                          <div className="mt-2 space-y-2 pl-4 border-l border-slate-200">
                            {(byParent[comment.id] || []).map((r) => (
                              <CommentPreview
                                key={r.id}
                                reply={r}
                                formatCommentDate={formatCommentDate}
                                userDetails={null}
                                loadComments={null}
                                commentsTargetType="organizer"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ));
                  })()
                }
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600">No organizer comments yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetailsModal;
