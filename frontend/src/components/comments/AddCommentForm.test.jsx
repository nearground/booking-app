import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddCommentForm from './AddCommentForm';
import { networkAdapter } from 'services/NetworkAdapter';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    post: vi.fn(),
    put: vi.fn(),
    upload: vi.fn(),
  },
}));

describe('AddCommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = vi.fn(() => 'blob:preview');
    } else {
      vi.spyOn(global.URL, 'createObjectURL').mockImplementation(() => 'blob:preview');
    }
    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  test('renders Attach Photos section for top-level comments', () => {
    render(
      <AddCommentForm
        commentableType="experience"
        commentableId={1}
        uploaderUserId={10}
      />
    );

    expect(screen.getByRole('button', { name: 'Attach Photos' })).toBeInTheDocument();
    expect(screen.getByText('0 / 10 photos attached')).toBeInTheDocument();
  });

  test('shows selected image preview and supports removing it', () => {
    const { container } = render(
      <AddCommentForm
        commentableType="experience"
        commentableId={1}
        uploaderUserId={10}
      />
    );

    const fileInput = container.querySelector('input[type="file"]');
    const imageFile = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [imageFile] } });

    expect(screen.getByAltText('Selected review image 1')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove selected image'));
    expect(screen.queryByAltText('Selected review image 1')).not.toBeInTheDocument();
  });

  test('validates file size limit (5MB)', () => {
    const { container } = render(
      <AddCommentForm
        commentableType="experience"
        commentableId={1}
        uploaderUserId={10}
      />
    );

    const fileInput = container.querySelector('input[type="file"]');
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [oversized] } });

    expect(screen.getByText(/exceeds 5MB limit/i)).toBeInTheDocument();
  });

  test('resubmits retained API images as imageUrl objects after removing a photo', async () => {
    networkAdapter.put.mockResolvedValue({ ok: true, data: { id: 8 } });
    const removedUrl = 'http://localhost:4000/api/media/object/users/10/review-image/remove.jpg';
    const retainedUrl = 'http://localhost:4000/api/media/object/users/10/review-image/retain.jpg';

    render(
      <AddCommentForm
        initial={{
          id: 8,
          UserId: 10,
          ParentId: null,
          comment: 'Original comment body',
          images: [
            { imageUrl: removedUrl, accessibleText: 'Remove this' },
            { imageUrl: retainedUrl, imageKey: 'users/10/review-image/retain.jpg', accessibleText: 'Keep this' },
          ],
        }}
        uploaderUserId={10}
      />
    );

    fireEvent.click(screen.getAllByLabelText('Remove attached image')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(networkAdapter.put).toHaveBeenCalledTimes(1));
    expect(networkAdapter.put).toHaveBeenCalledWith('/api/comments/8', expect.objectContaining({
      images: [{ imageUrl: 'users/10/review-image/retain.jpg', accessibleText: 'Keep this' }],
    }));
  });
  test('removing all existing photos sends an empty image list', async () => {
    networkAdapter.put.mockResolvedValue({ ok: true, data: { id: 8 } });
    render(
      <AddCommentForm
        initial={{
          id: 8,
          UserId: 10,
          ParentId: null,
          comment: 'Original comment body',
          images: [
            { imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/a.jpg', imageKey: 'users/10/review-image/a.jpg' },
            { imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/b.jpg', imageKey: 'users/10/review-image/b.jpg' },
          ],
        }}
        uploaderUserId={10}
      />
    );

    fireEvent.click(screen.getAllByLabelText('Remove attached image')[0]);
    fireEvent.click(screen.getByLabelText('Remove attached image'));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(networkAdapter.put).toHaveBeenCalledTimes(1));
    expect(networkAdapter.put.mock.calls[0][1].images).toEqual([]);
  });

  test('retains the unchanged image set as canonical keys when saving', async () => {
    networkAdapter.put.mockResolvedValue({ ok: true, data: { id: 8 } });
    render(
      <AddCommentForm
        initial={{
          id: 8,
          UserId: 10,
          ParentId: null,
          comment: 'Original comment body',
          images: [
            { imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/a.jpg', imageKey: 'users/10/review-image/a.jpg', accessibleText: 'A' },
            { imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/b.jpg', imageKey: 'users/10/review-image/b.jpg', accessibleText: 'B' },
          ],
        }}
        uploaderUserId={10}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(networkAdapter.put).toHaveBeenCalledTimes(1));
    expect(networkAdapter.put.mock.calls[0][1].images).toEqual([
      { imageUrl: 'users/10/review-image/a.jpg', accessibleText: 'A' },
      { imageUrl: 'users/10/review-image/b.jpg', accessibleText: 'B' },
    ]);
  });

  test('combines newly uploaded image keys with retained photos after removal', async () => {
    networkAdapter.put.mockResolvedValue({ ok: true, data: { id: 8 } });
    networkAdapter.upload.mockResolvedValue({
      ok: true,
      data: {
        url: 'http://localhost:4000/api/media/object/users/10/review-image/new.jpg',
        objectKey: 'users/10/review-image/new.jpg',
      },
    });
    const { container } = render(
      <AddCommentForm
        initial={{
          id: 8,
          UserId: 10,
          ParentId: null,
          comment: 'Original comment body',
          images: [
            { imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/remove.jpg', imageKey: 'users/10/review-image/remove.jpg' },
            { imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/retain.jpg', imageKey: 'users/10/review-image/retain.jpg', accessibleText: 'Retained' },
          ],
        }}
        uploaderUserId={10}
      />
    );

    const file = new File(['abc'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getAllByLabelText('Remove attached image')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(networkAdapter.put).toHaveBeenCalledTimes(1));
    expect(networkAdapter.put.mock.calls[0][1].images).toEqual([
      { imageUrl: 'users/10/review-image/retain.jpg', accessibleText: 'Retained' },
      { imageUrl: 'users/10/review-image/new.jpg', accessibleText: undefined },
    ]);
  });
  test('uploads selected images and includes them in comment payload', async () => {
    networkAdapter.upload.mockResolvedValue({
      ok: true,
      data: { url: 'http://localhost:4000/api/media/object/users/10/review-image/photo.jpg', objectKey: 'users/10/review-image/photo.jpg' },
    });
    networkAdapter.post.mockResolvedValue({ ok: true, data: { id: 1 } });

    const onSuccess = vi.fn();
    const { container } = render(
      <AddCommentForm
        commentableType="experience"
        commentableId={1}
        uploaderUserId={10}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(container.querySelector('textarea'), {
      target: { value: 'This is a comment body long enough.' },
    });

    const fileInput = container.querySelector('input[type="file"]');
    const imageFile = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [imageFile] } });

    fireEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() => {
      expect(networkAdapter.upload).toHaveBeenCalledTimes(1);
      expect(networkAdapter.post).toHaveBeenCalledTimes(1);
    });

    const [, payload] = networkAdapter.post.mock.calls[0];
    expect(payload.images).toHaveLength(1);
    expect(payload.images[0].imageUrl).toBe('users/10/review-image/photo.jpg');
    expect(onSuccess).toHaveBeenCalled();
  });
});
