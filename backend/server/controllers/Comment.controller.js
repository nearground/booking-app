import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import * as CommentService from '../services/Comment.service.js';
import { sendError } from '../utils/http-response.js';
const debug = require('debug')('app:comment-controller');

//Does not include replies 
const getCommentsBySource = async (req, res) => {
  try {
	const { userId } = req.params;
	const { currentPage = 1, pageSize = 5 } = req.query;
	const result = await CommentService.getCommentsBySource({ userId, currentPage, pageSize });
	if (result.status >= 500) {
	  debug('Error fetching comments by source: %O', result.errors);
	  return sendError(res, { status: 500, message: result.errors[0] || 'Error fetching comments by source', requestId: req.requestId });
	}
	return res.status(result.status).json({ errors: result.errors, data: result.data, metadata: result.metadata, paging: result.paging });
  } catch (error) {
	debug('Unexpected error in getCommentsBySource: %O', error);
	return sendError(res, { status: 500, message: 'Error fetching comments by source', requestId: req.requestId });
  }
};

const postComment = async (req, res) => {
  try {
	const { commentableType: rawType, commentableId } = req.params;
	const { stars, title, comment: body, ParentId, anonymity, images } = req.body || {};
	const userId = req.user && req.user.id;
	const result = await CommentService.postComment({ rawType, commentableId, stars, title, body, ParentId, anonymity, userId, images });
	if (result.status >= 500) {
	  debug('Error adding comment: %O', result.errors);
	  return sendError(res, { status: 500, message: result.errors[0] || 'Error adding experience comment', requestId: req.requestId });
	}
	if (result.status === 429) return res.status(429).json({ errors: result.errors });
	if (result.status === 201) return res.status(201).json({ errors: result.errors, data: result.data });
	return res.status(result.status).json({ errors: result.errors });
  } catch (error) {
	debug('Unexpected error in postComment: %O', error);
	return sendError(res, { status: 500, message: 'Error adding experience comment', requestId: req.requestId });
  }
};

// Authorization helper is now provided by the service layer when needed

const updateComment = async (req, res) => {
  try {
	const { id } = req.params;
	const { comment: body, title, stars, anonymity, images } = req.body || {};
	const userId = req.user && req.user.id;
	const result = await CommentService.updateComment({ id, body, title, stars, anonymity, userId, images });
	if (result.status >= 500) {
	  debug('Error updating comment: %O', result.errors);
	  return sendError(res, { status: 500, message: result.errors[0] || 'Error updating comment', requestId: req.requestId });
	}
	return res.status(result.status).json({ errors: result.errors, data: result.data });
  } catch (error) {
	debug('Unexpected error in updateComment: %O', error);
	return sendError(res, { status: 500, message: 'Error updating comment', requestId: req.requestId });
  }
};

const deleteComment = async (req, res) => {
  try {
	const { id } = req.params;
	const userId = req.user && req.user.id;
	const result = await CommentService.deleteComment({ id, userId });
	if (result.status >= 500) {
	  debug('Error deleting comment: %O', result.errors);
	  return sendError(res, { status: 500, message: result.errors[0] || 'Error deleting comment', requestId: req.requestId });
	}
	if (result.status === 204) return res.status(204).send();
	return res.status(result.status).json({ errors: result.errors });
  } catch (error) {
	debug('Unexpected error in deleteComment: %O', error);
	return sendError(res, { status: 500, message: 'Error deleting comment', requestId: req.requestId });
  }
};

/**
 * GET replies for a specific parent comment.
 * Supports query params: page (1-based), pageSize, limit (overrides paging when present)
 */
const getRepliesByParent = async (req, res) => {
  try {
	const { parentId } = req.params;
	let { page = 1, pageSize = 100, limit } = req.query;
	const result = await CommentService.getRepliesByParent({ parentId, page, pageSize, limit });
	if (result.status >= 500) {
	  debug('Error fetching replies for parent: %O', result.errors);
	  return sendError(res, { status: 500, message: result.errors[0] || 'Error fetching replies for parent', requestId: req.requestId });
	}
	return res.status(result.status).json({ errors: result.errors, data: result.data, metadata: result.metadata, paging: result.paging });
  } catch (error) {
	debug('Unexpected error in getRepliesByParent: %O', error);
	return sendError(res, { status: 500, message: 'Error fetching replies for parent', requestId: req.requestId });
  }
};

const getReviewEligibility = async (req, res) => {
  try {
    const { commentableType, commentableId } = req.query;
    if (!commentableType || !commentableId) return res.status(400).json({ errors: ['commentableType and commentableId are required'] });
    const userId = req.user && req.user.id;
    const result = await CommentService.getReviewEligibility({ userId, commentableType, commentableId });
    return res.status(200).json(result);
  } catch (error) {
    debug('Unexpected error in getReviewEligibility: %O', error);
    return sendError(res, { status: 500, message: 'Error checking review eligibility', requestId: req.requestId });
  }
};

const defaultExport = { getCommentsBySource, postComment, updateComment, deleteComment, getRepliesByParent, getReviewEligibility };

export { getCommentsBySource, postComment, updateComment, deleteComment, getRepliesByParent, getReviewEligibility };
export default defaultExport;
