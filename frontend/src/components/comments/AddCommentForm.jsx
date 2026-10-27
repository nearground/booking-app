import React, { useState, useEffect, useRef } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const AddCommentForm = ({
  commentableType = 'experience',
  commentableId,
  onSuccess = () => {},
  onCancel = () => {},
  initial = null, // when provided, perform update
  uploaderUserId = null,
}) => {
  const [stars, setStars] = useState(initial?.stars || 5);
  const [title, setTitle] = useState(initial?.title || '');
  const [comment, setComment] = useState(initial?.comment || '');
  const [anonymity, setAnonymity] = useState(initial?.anonymity ?? 2);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [existingImages, setExistingImages] = useState(
    Array.isArray(initial?.images) ? initial.images : []
  );
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const fileInputRef = useRef(null);
  const selectedImageFilesRef = useRef([]);

  useEffect(() => {
    if (initial) {
      setStars(initial.stars || 5);
      setTitle(initial.title || '');
      setComment(initial.comment || '');
      setAnonymity(initial.anonymity ?? 2);
      setExistingImages(Array.isArray(initial.images) ? initial.images : []);
    }
  }, [initial]);

  useEffect(() => {
    selectedImageFilesRef.current = selectedImageFiles;
  }, [selectedImageFiles]);

  useEffect(() => {
    return () => {
      selectedImageFilesRef.current.forEach((entry) => {
        if (entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    };
  }, []);

  const removeSelectedImage = (entryId) => {
    setSelectedImageFiles((previous) => {
      const target = previous.find((entry) => entry.id === entryId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((entry) => entry.id !== entryId);
    });
  };

  const removeExistingImage = (index) => {
    setExistingImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleFileSelection = (event) => {
    const pickedFiles = Array.from(event.target.files || []);
    if (pickedFiles.length === 0) return;

    const nextErrors = [];
    const currentCount = existingImages.length + selectedImageFiles.length;
    const remainingSlots = MAX_IMAGES - currentCount;

    if (remainingSlots <= 0) {
      nextErrors.push(`You can attach up to ${MAX_IMAGES} photos.`);
      setErrors(nextErrors);
      event.target.value = '';
      return;
    }

    const acceptedFiles = pickedFiles.slice(0, remainingSlots);
    if (pickedFiles.length > remainingSlots) {
      nextErrors.push(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be attached.`);
    }

    const validEntries = [];
    acceptedFiles.forEach((file, index) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        nextErrors.push(`${file.name}: unsupported format.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        nextErrors.push(`${file.name}: exceeds 5MB limit.`);
        return;
      }

      validEntries.push({
        id: `${file.name}-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (validEntries.length > 0) {
      setSelectedImageFiles((previous) => [...previous, ...validEntries]);
    }

    if (nextErrors.length > 0) {
      setErrors((previous) => [...previous, ...nextErrors]);
    }

    event.target.value = '';
  };

  const save = async (e) => {
    e && e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      let uploadedImages = [];
      if (!initial?.ParentId && selectedImageFiles.length > 0) {
        const resolvedUploaderUserId = Number(uploaderUserId || initial?.UserId || 0);
        if (!Number.isInteger(resolvedUploaderUserId) || resolvedUploaderUserId <= 0) {
          throw new Error('You must be logged in to upload review images');
        }

        uploadedImages = await Promise.all(
          selectedImageFiles.map(async (entry) => {
            const uploadResponse = await networkAdapter.upload('/api/media/upload', entry.file, {
              method: 'PUT',
              params: {
                ownerType: 'user',
                ownerId: String(resolvedUploaderUserId),
                kind: 'review-image',
              },
              headers: {
                'Content-Type': entry.file.type || 'application/octet-stream',
              },
            });

            if (!uploadResponse?.ok) {
              throw new Error(uploadResponse?.errors?.[0] || 'Failed to upload one or more images');
            }

            const imageUrl = uploadResponse?.data?.url;
            if (!imageUrl) {
              throw new Error('Image upload response missing URL');
            }

            return { imageUrl };
          })
        );
      }

      const retainedImages = existingImages
        .filter((image) => image && image.imageUrl)
        .map((image) => ({ imageUrl: image.imageUrl, accessibleText: image.accessibleText }));

      const allImages = !initial?.ParentId ? [...retainedImages, ...uploadedImages] : undefined;

      let resp;
      if (initial && initial.id) {
        resp = await networkAdapter.put(`/api/comments/${initial.id}`, {
          comment,
          title: initial.ParentId ? undefined : title,
          stars: initial.ParentId ? undefined : stars,
          anonymity,
          images: initial.ParentId ? undefined : allImages,
        });
      } else {
        resp = await networkAdapter.post(`/api/comments/${commentableType}/${commentableId}`, {
          comment,
          title: title || undefined,
          stars: initial ? undefined : stars,
          anonymity,
          ParentId: initial?.ParentId || null,
          images: initial?.ParentId ? undefined : allImages,
        });
      }

      if (!resp || !resp.ok) {
        if (resp.status === 401) {
          try { localStorage.setItem(`comment_draft_${commentableType}_${commentableId}`, JSON.stringify({ stars, title, comment, anonymity })); } catch (_e) {}
          window.location.href = '/register';

          return;
        }
        if (resp.status === 429) {
          setErrors(resp.errors || ['You have already posted a review recently. Please try again later.']);
          setLoading(false);
          return;
        }
        setErrors(resp.errors || ['Failed to save comment']);
        setLoading(false);
        return;
      }

      onSuccess(resp.data || resp.data?.elements || null);
    } catch (err) {
      setErrors([err.message || 'Unexpected error']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-white border rounded p-3">
      {errors.length > 0 && (
        <div className="text-sm text-red-600 mb-2">{errors.join(', ')}</div>
      )}

      {!initial?.ParentId && (
        <div className="mb-2">
          <label className="block text-sm text-slate-700">Rating</label>
          <select value={stars} onChange={(e) => setStars(Number(e.target.value))} className="mt-1 p-2 border rounded">
            {[5,4,3,2,1].map((s) => <option key={s} value={s}>{s} star{s>1?'s':''}</option>)}
          </select>
        </div>
      )}

      {!initial?.ParentId && (
        <div className="mb-2">
          <label className="block text-sm text-slate-700">Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={75} className="mt-1 p-2 border rounded w-full" />
          <div className={`text-xs mt-1 ${title.length >= 75 ? 'text-red-600' : title.length >= 60 ? 'text-yellow-600' : 'text-slate-400'}`}>
            {title.length} / 75
          </div>
        </div>
      )}

      <div className="mb-2">
        <label className="block text-sm text-slate-700">Comment</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-1 p-2 border rounded w-full" required />
      </div>

      {!initial?.ParentId && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-slate-700">Attach Photos</label>
            <span className="text-xs text-slate-500">{existingImages.length + selectedImageFiles.length} / {MAX_IMAGES} photos attached</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileSelection}
          />

          <button
            type="button"
            className="px-3 py-2 border rounded text-sm text-slate-700 bg-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={existingImages.length + selectedImageFiles.length >= MAX_IMAGES}
          >
            Attach Photos
          </button>

          {(existingImages.length > 0 || selectedImageFiles.length > 0) && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {existingImages.map((image, index) => (
                <div key={`existing-${image.imageUrl}-${index}`} className="relative">
                  <img
                    src={image.imageUrl}
                    alt={image.accessibleText || `Attached review image ${index + 1}`}
                    loading="lazy"
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-black/80 text-white rounded-full w-6 h-6 text-xs"
                    onClick={() => removeExistingImage(index)}
                    aria-label="Remove attached image"
                  >
                    ×
                  </button>
                </div>
              ))}

              {selectedImageFiles.map((entry, index) => (
                <div key={entry.id} className="relative">
                  <img
                    src={entry.previewUrl}
                    alt={`Selected review image ${index + 1}`}
                    loading="lazy"
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-black/80 text-white rounded-full w-6 h-6 text-xs"
                    onClick={() => removeSelectedImage(entry.id)}
                    aria-label="Remove selected image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-slate-700">Post as anonymous</label>
        <input type="checkbox" checked={Number(anonymity) === 0} onChange={(e) => setAnonymity(e.target.checked ? 0 : 2)} />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-3 py-2 bg-brand text-white rounded disabled:opacity-60">
          {loading ? 'Saving…' : (initial ? 'Update' : 'Post Comment')}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 border rounded">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AddCommentForm;
