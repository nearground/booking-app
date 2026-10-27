import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import Comment from '../models/Comment.model.js';
import User from '../models/User.model.js';
import Organizer from '../models/Organizer.model.js';
import Experience from '../models/Experience.model.js';
import db from '../models/index.js';
import cache from '../utils/cache.js';
import { REVIEW_COOLDOWN_MS } from '../utils/constants.js';
import { MEDIA_PUBLIC_BASE_URL, normalizeStoredMediaValue, resolveMediaUrl } from '../utils/media-storage.js';
const debug = require('debug')('app:comment-service');

const { Op } = require('sequelize');
const sequelize = db.sequelize;
const MAX_REVIEW_IMAGES = 10;
const REVIEW_IMAGE_KEY_PREFIXES = ['users/', 'orgs/', 'experiences/', 'hotels/'];

const toStoredReviewImageValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (raw.startsWith('/api/media/object/')) {
    return decodeURIComponent(raw.replace('/api/media/object/', ''));
  }

  return normalizeStoredMediaValue(raw);
};

const isAllowedReviewImageKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  const normalized = key.trim();
  if (!normalized) return false;
  if (!/^[a-zA-Z0-9._\-/]+$/.test(normalized)) return false;
  return REVIEW_IMAGE_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const validateImages = (images) => {
  if (!images) return [];
  if (!Array.isArray(images)) return null;
  if (images.length > MAX_REVIEW_IMAGES) return null;

  const normalized = [];
  for (const image of images) {
    if (!image || typeof image !== 'object') return null;

    const originalUrl = String(image.imageUrl || '').trim();
    if (!originalUrl) return null;

    if (/^https?:\/\//i.test(originalUrl)) {
      if (!MEDIA_PUBLIC_BASE_URL || !originalUrl.startsWith(`${MEDIA_PUBLIC_BASE_URL}/`)) {
        return null;
      }
    }

    const storedValue = toStoredReviewImageValue(originalUrl);
    if (!isAllowedReviewImageKey(storedValue)) return null;

    normalized.push({
      imageUrl: storedValue,
      accessibleText: image.accessibleText ? String(image.accessibleText).trim().slice(0, 200) : undefined,
    });
  }

  return normalized;
};

const mapReviewImagesForResponse = (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];

  return images
    .map((image) => {
      if (!image || typeof image !== 'object') return null;
      const storedValue = toStoredReviewImageValue(image.imageUrl);
      if (!isAllowedReviewImageKey(storedValue)) return null;

      const publicUrl = resolveMediaUrl(storedValue);
      if (!publicUrl) return null;

      return {
        imageUrl: publicUrl,
        accessibleText: image.accessibleText ? String(image.accessibleText).trim().slice(0, 200) : undefined,
      };
    })
    .filter(Boolean);
};

const isUserMemberOfOrganization = async (userId, organizationId) => {
  if (!userId || !organizationId) return false;
  try {
    const member = await db.OrganizationMembers.findOne({ where: { UserId: userId, OrganizationId: organizationId } });
    return !!member;
  } catch (e) {
    return false;
  }
};

const isAuthorizedToModify = async (userId, comment) => {
  if (!comment) return false;
  if (Number(userId) === Number(comment.UserId)) return true;

  if (comment.CommentableType === 'Experience') {
    const experience = await Experience.findByPk(comment.CommentableId, { attributes: ['id', 'OrganizationId'] });
    if (experience && experience.OrganizationId) {
      return isUserMemberOfOrganization(userId, experience.OrganizationId);
    }
  }

  if (comment.CommentableType === 'Organizer') {
    const orgRecord = await Organizer.findOne({ where: { UserId: userId } });
    if (orgRecord && Number(orgRecord.id) === Number(comment.CommentableId)) return true;
  }

  return false;
};

const getCommentsBySource = async ({ userId, currentPage = 1, pageSize = 5 }) => {
  try {
    const whereParams = { UserId: userId };

    const commentsData = await Comment.findAll({
      where: whereParams,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'stars', 'title', 'comment', 'anonymity', 'createdAt', 'CommentableId', 'CommentableType', 'UserId', 'ParentId', 'repliesCount', 'images'],
    });

    const organizerIds = [];
    const experienceIds = [];
    commentsData.forEach(comment => {
      if (comment.CommentableType === 'Organizer') organizerIds.push(comment.CommentableId);
      else if (comment.CommentableType === 'Experience') experienceIds.push(comment.CommentableId);
    });

    const [organizers, experiences] = await Promise.all([
      Organizer.findAll({ where: { id: [...new Set(organizerIds)] }, attributes: ['id', 'UserId'] }),
      Experience.findAll({ where: { id: [...new Set(experienceIds)] }, attributes: ['id', 'title'] }),
    ]);

    const organizerUserIdById = organizers.reduce((acc, org) => { acc[org.id] = org.UserId; return acc; }, {});

    const organizerUsers = await User.findAll({ where: { id: [...new Set(Object.values(organizerUserIdById))] }, attributes: ['id', 'firstName', 'lastName'] });
    const organizerNameByUserId = organizerUsers.reduce((acc, user) => { acc[user.id] = `${user.firstName} ${user.lastName}`; return acc; }, {});

    const experienceNameById = experiences.reduce((acc, exp) => { acc[exp.id] = exp.title || 'Experience'; return acc; }, {});

    const page = parseInt(currentPage);
    const paging = {
      currentPage: page,
      totalPages: Math.ceil(commentsData.length / pageSize),
      pageSize,
    };

    const data = commentsData
      .slice((paging.currentPage - 1) * pageSize, paging.currentPage * pageSize)
      .map((comment) => {
        const obj = comment.toJSON();
        obj.images = mapReviewImagesForResponse(obj.images);
        let targetName = '';
        if (obj.CommentableType === 'Organizer') {
          targetName = organizerNameByUserId[organizerUserIdById[obj.CommentableId]] || 'Organizer';
        } else if (obj.CommentableType === 'Experience') {
          targetName = experienceNameById[obj.CommentableId] || 'Experience';
        }
        obj.target = {
          type: obj.CommentableType === 'Organizer' ? 'organizer' : 'experience',
          id: obj.CommentableId,
          name: targetName,
        };
        return obj;
      });

    const metadata = {
      currentPage: paging.currentPage,
      totalPages: paging.totalPages,
      totalItems: commentsData.length,
      hasNext: paging.currentPage < paging.totalPages,
    };

    return { status: 200, errors: [], data: { elements: data }, metadata, paging };
  } catch (error) {
    debug('getCommentsBySource error: %O', error);
    return { status: 500, errors: ['Error fetching comments by source'] };
  }
};

const postComment = async ({ rawType, commentableId, stars, title, body, ParentId, anonymity, userId, images }) => {
  try {
    const type = String(rawType || '').trim();
    if (!type) return { status: 400, errors: ['Missing commentable type'] };
    const CommentableType = `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}`;

    let TargetModel;
    if (CommentableType === 'Experience') TargetModel = Experience;
    else if (CommentableType === 'Organizer') TargetModel = Organizer;
    else return { status: 400, errors: ['Invalid commentable type'] };

    const target = await TargetModel.findByPk(commentableId);
    if (!target) return { status: 404, errors: ['Comment target not found'] };

    const isReply = ParentId !== undefined && ParentId !== null && ParentId !== '';
    if (!isReply) {
      if (stars === undefined || stars === null) return { status: 400, errors: ['Rating is required for comments'] };
      if (!body || String(body).trim().length === 0) return { status: 400, errors: ['Comment body is required'] };
    } else {
      if (stars !== undefined && stars !== null && String(stars).trim() !== '') return { status: 400, errors: ['Replies must not include stars'] };
      if (title) return { status: 400, errors: ['Replies must not include a title'] };
      if (images !== undefined && images !== null) return { status: 400, errors: ['Replies must not include images'] };
      if (!body || String(body).trim().length === 0) return { status: 400, errors: ['Reply body is required'] };
    }

    if (!userId) return { status: 401, errors: ['Authentication required'] };

    // Cooldown check for top-level comments only (replies are exempt)
    if (!isReply) {
      const recentReview = await Comment.findOne({
        where: {
          UserId: userId,
          CommentableType,
          CommentableId: Number(commentableId),
          ParentId: null,
          createdAt: { [Op.gte]: new Date(Date.now() - REVIEW_COOLDOWN_MS) },
        },
        order: [['createdAt', 'DESC']],
      });
      if (recentReview) {
        const nextDate = new Date(new Date(recentReview.createdAt).getTime() + REVIEW_COOLDOWN_MS);
        return {
          status: 429,
          errors: [`You have already posted a review for this experience in the past two weeks. Please wait until ${nextDate.toISOString().split('T')[0]} to post again.`],
        };
      }
    }

    let parent = null;
    let topParent = null;
    if (isReply) {
      parent = await Comment.findByPk(ParentId);
      if (!parent) return { status: 400, errors: ['Parent comment not found'] };
      if (parent.CommentableId !== Number(commentableId) || parent.CommentableType !== CommentableType) {
        return { status: 400, errors: ['Parent comment does not belong to the same target'] };
      }

      topParent = parent;
      while (topParent && topParent.ParentId) {
        // eslint-disable-next-line no-await-in-loop
        const p = await Comment.findByPk(topParent.ParentId);
        if (!p) break;
        topParent = p;
      }

      let allowed = false;
      if (topParent && topParent.UserId && Number(topParent.UserId) === Number(userId) && topParent.CommentableType === 'Organizer') allowed = true;
      if (!allowed) {
        const postingOrg = await Organizer.findOne({ where: { UserId: userId } });
        if (postingOrg && topParent && Number(postingOrg.id) === Number(topParent.CommentableId)) allowed = true;
      }
      if (!allowed) return { status: 403, errors: ['Not authorized to reply to this comment'] };
    }

    if (title && String(title).trim().length > 75) {
      return { status: 400, errors: ['Title must be 75 characters or fewer.'] };
    }

    // Validate images (only for top-level comments)
    let cleanedImages = [];
    if (!isReply && images && images.length > 0) {
      cleanedImages = validateImages(images);
      if (cleanedImages === null) return { status: 400, errors: [`Maximum ${MAX_REVIEW_IMAGES} images allowed, each must have a valid imageUrl`] };
    }

    const payload = {
      CommentableId: Number(commentableId),
      CommentableType,
      comment: String(body).trim(),
      ParentId: isReply ? ParentId : null,
      anonymity: (anonymity !== undefined && anonymity !== null) ? anonymity : 2,
      UserId: userId,
      images: cleanedImages,
    };
    if (!isReply) {
      payload.stars = Number(stars);
      if (title) payload.title = String(title).trim();
    } else {
      payload.stars = null;
      payload.title = null;
    }

    const created = await Comment.create(payload);
    if (isReply && parent) await parent.increment('repliesCount');

    try {
      await cache.del(`experience:detail:${payload.CommentableId}`);
      await cache.delByPrefix('experiences:');
    } catch (e) { /* ignore */ }

    const createdData = created.toJSON();
    createdData.images = mapReviewImagesForResponse(createdData.images);
    return { status: 201, errors: [], data: createdData };
  } catch (error) {
    debug('postComment error: %O', error);
    return { status: 500, errors: ['Error adding experience comment'] };
  }
};

const updateComment = async ({ id, body, title, stars, anonymity, userId, images }) => {
  const t = await sequelize.transaction();
  try {
    if (!userId) { await t.rollback(); return { status: 401, errors: ['Authentication required'] }; }

    const existing = await Comment.findByPk(id, { transaction: t });
    if (!existing) { await t.rollback(); return { status: 404, errors: ['Comment not found'] }; }

    if (Number(userId) !== Number(existing.UserId)) { await t.rollback(); return { status: 403, errors: ['Not authorized to edit this comment'] }; }

    const updates = {};
    if (body !== undefined) {
      if (!body || String(body).trim().length === 0) { await t.rollback(); return { status: 400, errors: ['Comment body is required'] }; }
      updates.comment = String(body).trim();
    }
    if (images !== undefined && existing.ParentId === null) {
      const cleanedImages = validateImages(images || []);
      if (cleanedImages === null) { await t.rollback(); return { status: 400, errors: [`Maximum ${MAX_REVIEW_IMAGES} images allowed, each must have a valid imageUrl`] }; }
      updates.images = cleanedImages;
    }
    if (anonymity !== undefined) updates.anonymity = anonymity;
    if (existing.ParentId === null) {
      if (title !== undefined) {
        if (title && String(title).trim().length > 75) { await t.rollback(); return { status: 400, errors: ['Title must be 75 characters or fewer.'] }; }
        updates.title = title ? String(title).trim() : null;
      }
      if (stars !== undefined) {
        const s = Number(stars);
        if (Number.isNaN(s) || s < 1 || s > 5) { await t.rollback(); return { status: 400, errors: ['Stars must be 1-5'] }; }
        updates.stars = s;
      }
    } else {
      if (stars !== undefined || title !== undefined || images !== undefined) { await t.rollback(); return { status: 400, errors: ['Replies cannot have stars, title, or images'] }; }
    }

    await existing.update(updates, { transaction: t });
    await t.commit();
    try {
      await cache.del(`experience:detail:${existing.CommentableId}`);
      await cache.delByPrefix('experiences:');
    } catch (e) { /* ignore */ }
    const updatedData = existing.toJSON();
    updatedData.images = mapReviewImagesForResponse(updatedData.images);
    return { status: 200, errors: [], data: updatedData };
  } catch (error) {
    await t.rollback();
    debug('updateComment error: %O', error);
    return { status: 500, errors: ['Error updating comment'] };
  }
};

const deleteComment = async ({ id, userId }) => {
  const t = await sequelize.transaction();
  try {
    if (!userId) { await t.rollback(); return { status: 401, errors: ['Authentication required'] }; }

    const existing = await Comment.findByPk(id, { transaction: t });
    if (!existing) { await t.rollback(); return { status: 404, errors: ['Comment not found'] }; }

    const authorized = await isAuthorizedToModify(userId, existing);
    if (!authorized) { await t.rollback(); return { status: 403, errors: ['Not authorized to delete this comment'] }; }

    const toDelete = [existing.id];
    for (let i = 0; i < toDelete.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const children = await Comment.findAll({ where: { ParentId: toDelete[i] }, attributes: ['id'], transaction: t });
      children.forEach((c) => { if (!toDelete.includes(c.id)) toDelete.push(c.id); });
    }

    if (existing.ParentId) {
      const parent = await Comment.findByPk(existing.ParentId, { transaction: t });
      if (parent) await parent.decrement('repliesCount', { by: 1, transaction: t });
    }

    await Comment.destroy({ where: { id: toDelete }, transaction: t });
    await t.commit();
    try {
      await cache.del(`experience:detail:${existing.CommentableId}`);
      await cache.delByPrefix('experiences:');
    } catch (e) { /* ignore */ }
    return { status: 204, errors: [] };
  } catch (error) {
    await t.rollback();
    debug('deleteComment error: %O', error);
    return { status: 500, errors: ['Error deleting comment'] };
  }
};

const getRepliesByParent = async ({ parentId, page = 1, pageSize = 100, limit = null }) => {
  try {
    if (!parentId) return { status: 400, errors: ['Missing parentId'] };

    page = Number(page) || 1;
    pageSize = Number(pageSize) || 100;
    limit = limit !== undefined && limit !== null ? Number(limit) : null;

    const totalItems = await Comment.count({ where: { ParentId: parentId } });

    const queryOptions = {
      where: { ParentId: parentId },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'stars', 'title', 'comment', 'anonymity', 'createdAt', 'CommentableId', 'CommentableType', 'UserId', 'ParentId', 'images'],
      include: [ { model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'city', 'country'] } ],
    };

    if (limit && Number(limit) > 0) {
      queryOptions.limit = Number(limit);
      queryOptions.offset = 0;
    } else {
      queryOptions.limit = pageSize;
      queryOptions.offset = (page - 1) * pageSize;
    }

    const repliesData = await Comment.findAll(queryOptions);

    const organizerIds = [];
    const experienceIds = [];
    repliesData.forEach((comment) => {
      if (comment.CommentableType === 'Organizer') organizerIds.push(comment.CommentableId);
      else if (comment.CommentableType === 'Experience') experienceIds.push(comment.CommentableId);
    });

    const [organizers, experiences] = await Promise.all([
      Organizer.findAll({ where: { id: [...new Set(organizerIds)] }, attributes: ['id', 'UserId'] }),
      Experience.findAll({ where: { id: [...new Set(experienceIds)] }, attributes: ['id', 'title'] }),
    ]);

    const organizerUserIdById = organizers.reduce((acc, org) => { acc[org.id] = org.UserId; return acc; }, {});
    const organizerUsers = await User.findAll({ where: { id: [...new Set(Object.values(organizerUserIdById))] }, attributes: ['id', 'firstName', 'lastName'] });
    const organizerNameByUserId = organizerUsers.reduce((acc, user) => { acc[user.id] = `${user.firstName} ${user.lastName}`; return acc; }, {});
    const experienceNameById = experiences.reduce((acc, exp) => { acc[exp.id] = exp.title || 'Experience'; return acc; }, {});

    const elements = repliesData.map((comment) => {
      const obj = comment.toJSON();
      obj.images = mapReviewImagesForResponse(obj.images);
      if (comment.User) {
        obj.commenter = {
          id: comment.User.id,
          firstName: comment.User.firstName,
          lastName: comment.User.lastName,
          profilePicture: comment.User.profilePicture,
          city: comment.User.city,
          country: comment.User.country,
        };
      }
      let targetName = '';
      if (obj.CommentableType === 'Organizer') targetName = organizerNameByUserId[organizerUserIdById[obj.CommentableId]] || 'Organizer';
      else if (obj.CommentableType === 'Experience') targetName = experienceNameById[obj.CommentableId] || 'Experience';
      obj.target = { type: obj.CommentableType === 'Organizer' ? 'organizer' : 'experience', id: obj.CommentableId, name: targetName };
      return obj;
    });

    const metadata = { currentPage: page, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), totalItems, hasNext: (page * pageSize) < totalItems };

    return { status: 200, errors: [], data: { elements }, metadata, paging: { currentPage: page, pageSize } };
  } catch (error) {
    debug('getRepliesByParent error: %O', error);
    return { status: 500, errors: ['Error fetching replies for parent'] };
  }
};

const getReviewEligibility = async ({ userId, commentableType, commentableId }) => {
  try {
    if (!userId) return { eligible: true, recentReview: null };
    const CommentableType = `${String(commentableType).charAt(0).toUpperCase()}${String(commentableType).slice(1).toLowerCase()}`;
    const recentReview = await Comment.findOne({
      where: {
        UserId: userId,
        CommentableType,
        CommentableId: Number(commentableId),
        ParentId: null,
        createdAt: { [Op.gte]: new Date(Date.now() - REVIEW_COOLDOWN_MS) },
      },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'city', 'country'] }],
    });
    if (recentReview) {
      const nextDate = new Date(new Date(recentReview.createdAt).getTime() + REVIEW_COOLDOWN_MS);
      return {
        eligible: false,
        nextEligibleDate: nextDate.toISOString().split('T')[0],
        recentReview: recentReview.toJSON(),
      };
    }
    return { eligible: true, recentReview: null };
  } catch (error) {
    debug('getReviewEligibility error: %O', error);
    return { eligible: true, recentReview: null };
  }
};

export { getCommentsBySource, postComment, updateComment, deleteComment, getRepliesByParent, isAuthorizedToModify, getReviewEligibility };
