import React, { useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

const ReplyForm = ({ parentComment, commentableType, commentableId, onSuccess, onCancel }) => {
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const normalizedType = (String(commentableType || '')).trim();
  const backendType = normalizedType ? `${normalizedType.charAt(0).toUpperCase()}${normalizedType.slice(1)}` : '';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = String(body || '').trim();
    if (trimmed.length < 10) {
      setError('Reply must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        comment: trimmed,
        ParentId: parentComment?.id,
      };

      const resp = await networkAdapter.post(`/api/comments/${backendType}/${commentableId}`, payload);
      if (resp?.errors && resp.errors.length) {
        setError(resp.errors[0] || 'Unable to post reply');
        setIsSubmitting(false);
        return;
      }

      if (resp.status === 403) {
        setError('Not authorized to reply to this comment.');
        setIsSubmitting(false);
        return;
      }

      // Success — call parent handler
      if (onSuccess) onSuccess(resp.data || resp);
    } catch (err) {
      setError(err.message || 'Network error');
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-3 border-t pt-3" onSubmit={submit}>
      <textarea
        className="w-full border rounded p-2 text-sm"
        placeholder="Write your reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        disabled={isSubmitting}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Reply'}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-white text-slate-700 border text-sm"
          onClick={() => { setBody(''); if (onCancel) onCancel(); }}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ReplyForm;
