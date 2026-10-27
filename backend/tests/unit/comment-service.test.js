jest.mock('../../server/models/Comment.model.js', () => {
  const comment = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
  };
  return { __esModule: true, default: comment };
});

jest.mock('../../server/models/User.model.js', () => ({
  __esModule: true,
  default: { findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn() },
}));

jest.mock('../../server/models/Organizer.model.js', () => ({
  __esModule: true,
  default: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../server/models/Experience.model.js', () => ({
  __esModule: true,
  default: { findByPk: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../server/models/index.js', () => {
  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
  return {
    __esModule: true,
    default: {
      sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
      OrganizationMembers: { findOne: jest.fn() },
    },
  };
});

jest.mock('../../server/utils/cache.js', () => ({
  __esModule: true,
  default: { del: jest.fn().mockResolvedValue(true), delByPrefix: jest.fn().mockResolvedValue(true) },
}));

jest.mock('../../server/utils/media-storage.js', () => ({
  __esModule: true,
  MEDIA_PUBLIC_BASE_URL: 'http://localhost:4000/api/media/object',
  normalizeStoredMediaValue: jest.fn((value) => String(value || '').replace('http://localhost:4000/api/media/object/', '')),
  resolveMediaUrl: jest.fn((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `http://localhost:4000/api/media/object/${normalized}`;
  }),
}));

import Comment from '../../server/models/Comment.model.js';
import Experience from '../../server/models/Experience.model.js';
import Organizer from '../../server/models/Organizer.model.js';
import db from '../../server/models/index.js';
import { postComment, updateComment, getReviewEligibility } from '../../server/services/Comment.service.js';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('postComment - title length validation', () => {
  const baseArgs = {
    rawType: 'experience',
    commentableId: 1,
    stars: 5,
    body: 'This is a valid comment body text.',
    ParentId: null,
    anonymity: 2,
    userId: 10,
  };

  beforeEach(() => {
    Experience.findByPk.mockResolvedValue({ id: 1 });
  });

  test('accepts title of exactly 75 characters', async () => {
    const title75 = 'A'.repeat(75);
    Comment.create.mockResolvedValue({ toJSON: () => ({ id: 1, title: title75 }) });
    const result = await postComment({ ...baseArgs, title: title75 });
    expect(result.status).toBe(201);
  });

  test('rejects title of 76 characters', async () => {
    const title76 = 'A'.repeat(76);
    const result = await postComment({ ...baseArgs, title: title76 });
    expect(result.status).toBe(400);
    expect(result.errors[0]).toBe('Title must be 75 characters or fewer.');
  });

  test('accepts empty/null title', async () => {
    Comment.create.mockResolvedValue({ toJSON: () => ({ id: 1, title: null }) });
    const result = await postComment({ ...baseArgs, title: null });
    expect(result.status).toBe(201);
  });

  test('accepts undefined title', async () => {
    Comment.create.mockResolvedValue({ toJSON: () => ({ id: 1, title: null }) });
    const result = await postComment({ ...baseArgs, title: undefined });
    expect(result.status).toBe(201);
  });
});

describe('updateComment - title length validation', () => {
  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

  beforeEach(() => {
    db.sequelize.transaction.mockResolvedValue(mockTransaction);
    jest.clearAllMocks();
  });

  test('rejects title over 75 chars on update', async () => {
    const existing = { id: 1, UserId: 10, ParentId: null, CommentableId: 1, update: jest.fn(), toJSON: () => ({}) };
    Comment.findByPk.mockResolvedValue(existing);
    const title76 = 'B'.repeat(76);
    const result = await updateComment({ id: 1, title: title76, userId: 10 });
    expect(result.status).toBe(400);
    expect(result.errors[0]).toBe('Title must be 75 characters or fewer.');
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  test('accepts title of 75 chars on update', async () => {
    const existing = { id: 1, UserId: 10, ParentId: null, CommentableId: 1, update: jest.fn(), toJSON: () => ({ id: 1 }) };
    Comment.findByPk.mockResolvedValue(existing);
    const title75 = 'B'.repeat(75);
    const result = await updateComment({ id: 1, title: title75, userId: 10 });
    expect(result.status).toBe(200);
    expect(mockTransaction.commit).toHaveBeenCalled();
  });
});

describe('postComment - review cooldown (14-day limit)', () => {
  const baseArgs = {
    rawType: 'experience',
    commentableId: 1,
    stars: 5,
    body: 'This is a valid comment body text.',
    ParentId: null,
    anonymity: 2,
    userId: 10,
    title: 'Great',
  };

  beforeEach(() => {
    Experience.findByPk.mockResolvedValue({ id: 1 });
  });

  test('allows posting when no recent review exists', async () => {
    Comment.findOne.mockResolvedValue(null);
    Comment.create.mockResolvedValue({ toJSON: () => ({ id: 1 }) });
    const result = await postComment(baseArgs);
    expect(result.status).toBe(201);
  });

  test('rejects with 429 when recent review within 14 days', async () => {
    Comment.findOne.mockResolvedValue({
      id: 99,
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    });
    const result = await postComment(baseArgs);
    expect(result.status).toBe(429);
    expect(result.errors[0]).toMatch(/already posted a review/);
    expect(result.errors[0]).toMatch(/Please wait until/);
  });

  test('allows posting for a different CommentableId', async () => {
    // findOne for cooldown returns null (different commentableId)
    Comment.findOne.mockResolvedValue(null);
    Comment.create.mockResolvedValue({ toJSON: () => ({ id: 2 }) });
    const result = await postComment({ ...baseArgs, commentableId: 2 });
    expect(result.status).toBe(201);
  });

  test('allows replies (ParentId not null) regardless of cooldown', async () => {
    // Setup: for the cooldown check findOne would match, but replies are exempt
    // We need parent comment lookup to succeed
    const parentComment = {
      id: 50, CommentableId: 1, CommentableType: 'Experience', ParentId: null,
      UserId: 10,
    };
    Comment.findByPk.mockResolvedValue(parentComment);
    Organizer.findOne.mockResolvedValue(null);
    // Reply should be rejected for auth, but let's test it doesn't hit cooldown
    const result = await postComment({ ...baseArgs, ParentId: 50, stars: undefined, title: undefined });
    // The reply will fail on authorization check (not organizer), but it won't be 429
    expect(result.status).not.toBe(429);
  });

  test('returns correct next eligible date in error', async () => {
    const reviewDate = new Date('2026-04-01T10:00:00Z');
    Comment.findOne.mockResolvedValue({ id: 99, createdAt: reviewDate });
    const result = await postComment(baseArgs);
    expect(result.status).toBe(429);
    expect(result.errors[0]).toContain('2026-04-15');
  });
});

describe('getReviewEligibility', () => {
  test('returns eligible: true when no recent review', async () => {
    Comment.findOne.mockResolvedValue(null);
    const result = await getReviewEligibility({ userId: 10, commentableType: 'experience', commentableId: 1 });
    expect(result.eligible).toBe(true);
    expect(result.recentReview).toBeNull();
  });

  test('returns eligible: false with recent review data', async () => {
    const reviewDate = new Date(Date.now() - 1000 * 60 * 60);
    Comment.findOne.mockResolvedValue({
      id: 42, createdAt: reviewDate,
      toJSON: () => ({ id: 42, title: 'Great', createdAt: reviewDate }),
    });
    const result = await getReviewEligibility({ userId: 10, commentableType: 'experience', commentableId: 1 });
    expect(result.eligible).toBe(false);
    expect(result.recentReview).toBeTruthy();
    expect(result.nextEligibleDate).toBeDefined();
  });

  test('returns eligible: true for unauthenticated users', async () => {
    const result = await getReviewEligibility({ userId: null, commentableType: 'experience', commentableId: 1 });
    expect(result.eligible).toBe(true);
  });
});

describe('review images handling', () => {
  const baseArgs = {
    rawType: 'experience',
    commentableId: 1,
    stars: 5,
    body: 'This is a valid comment body text.',
    ParentId: null,
    anonymity: 2,
    userId: 10,
    title: 'Great',
  };

  beforeEach(() => {
    Experience.findByPk.mockResolvedValue({ id: 1 });
    Comment.findOne.mockResolvedValue(null);
  });

  test('postComment stores valid images payload', async () => {
    const created = {
      id: 7,
      images: [{ imageUrl: 'users/10/review-image/a.jpg' }],
      toJSON: () => ({ id: 7, images: [{ imageUrl: 'users/10/review-image/a.jpg' }] }),
    };
    Comment.create.mockResolvedValue(created);

    const result = await postComment({
      ...baseArgs,
      images: [{ imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/a.jpg' }],
    });

    expect(result.status).toBe(201);
    expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({
      images: [{ imageUrl: 'users/10/review-image/a.jpg', accessibleText: undefined }],
    }));
    expect(result.data.images).toEqual([{ imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/a.jpg', imageKey: 'users/10/review-image/a.jpg', accessibleText: undefined }]);
  });

  test('postComment rejects more than 10 images', async () => {
    const images = new Array(11).fill(null).map((_, i) => ({ imageUrl: `users/10/review-image/${i}.jpg` }));
    const result = await postComment({ ...baseArgs, images });
    expect(result.status).toBe(400);
    expect(result.errors[0]).toMatch(/Maximum 10 images allowed/);
  });

  test('updateComment updates images for top-level comment', async () => {
    const existing = {
      id: 1,
      UserId: 10,
      ParentId: null,
      CommentableId: 1,
      update: jest.fn().mockResolvedValue(true),
      toJSON: () => ({ id: 1, images: [{ imageUrl: 'users/10/review-image/new.jpg' }] }),
    };
    Comment.findByPk.mockResolvedValue(existing);

    const result = await updateComment({
      id: 1,
      userId: 10,
      images: [{ imageUrl: 'users/10/review-image/new.jpg' }],
    });

    expect(result.status).toBe(200);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      images: [{ imageUrl: 'users/10/review-image/new.jpg', accessibleText: undefined }],
    }), expect.any(Object));
  });

  test('accepts the configured public URL that the API returns on an edit', async () => {
    const existing = {
      id: 9,
      UserId: 10,
      ParentId: null,
      CommentableId: 1,
      update: jest.fn().mockResolvedValue(true),
      toJSON: () => ({ id: 9, images: [{ imageUrl: 'users/10/review-image/retained.jpg' }] }),
    };
    Comment.findByPk.mockResolvedValue(existing);

    const result = await updateComment({
      id: 9,
      userId: 10,
      images: [{ imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/retained.jpg' }],
    });

    expect(result.status).toBe(200);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      images: [{ imageUrl: 'users/10/review-image/retained.jpg', accessibleText: undefined }],
    }), expect.any(Object));
  });

  test('rejects absolute image URLs outside the configured public media base', async () => {
    const existing = {
      id: 10,
      UserId: 10,
      ParentId: null,
      CommentableId: 1,
      update: jest.fn(),
      toJSON: () => ({ id: 10, images: [] }),
    };
    Comment.findByPk.mockResolvedValue(existing);

    const result = await updateComment({
      id: 10,
      userId: 10,
      images: [{ imageUrl: 'https://media.example.test/api/media/object/users/10/review-image/retained.jpg' }],
    });

    expect(result.status).toBe(400);
    expect(result.errors[0]).toBe('Maximum 10 images allowed, each must have a valid imageUrl');
    expect(existing.update).not.toHaveBeenCalled();
  });
  test('returns a stored image key with its resolved URL for a stable edit round-trip', async () => {
    const existing = {
      id: 8,
      UserId: 10,
      ParentId: null,
      CommentableId: 1,
      update: jest.fn().mockResolvedValue(true),
      toJSON: () => ({ id: 8, images: [{ imageUrl: 'users/10/review-image/retained.jpg', accessibleText: 'Retained' }] }),
    };
    Comment.findByPk.mockResolvedValue(existing);

    const result = await updateComment({
      id: 8,
      userId: 10,
      images: [{ imageUrl: 'users/10/review-image/retained.jpg', accessibleText: 'Retained' }],
    });

    expect(result.status).toBe(200);
    expect(result.data.images).toEqual([{
      imageUrl: 'http://localhost:4000/api/media/object/users/10/review-image/retained.jpg',
      imageKey: 'users/10/review-image/retained.jpg',
      accessibleText: 'Retained',
    }]);
  });
  test('updateComment rejects images for replies', async () => {
    const existing = {
      id: 1,
      UserId: 10,
      ParentId: 50,
      CommentableId: 1,
      update: jest.fn(),
      toJSON: () => ({ id: 1 }),
    };
    Comment.findByPk.mockResolvedValue(existing);

    const result = await updateComment({
      id: 1,
      userId: 10,
      images: [{ imageUrl: 'users/10/review-image/new.jpg' }],
    });

    expect(result.status).toBe(400);
    expect(result.errors[0]).toBe('Replies cannot have stars, title, or images');
  });
});
