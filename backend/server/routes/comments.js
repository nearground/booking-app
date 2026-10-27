import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');
import {
    postComment,
    getCommentsBySource,
    getRepliesByParent,
    updateComment,
    deleteComment,
    getReviewEligibility,
} from '../controllers/Comment.controller.js';
import { authUser } from '../middlewares/auth.js';


// const { requireOrganizationAdmin } = require('../middlewares/organization-auth.js');
// const { requireExperienceOrganizationAdmin } = require('../middlewares/experience-auth.js');

const router = express.Router();

//Do we need middleware for verifying user was the one who created the comments for updateComment?
router.get('/received/:commentableType/:commentableId', getCommentsBySource);
router.get('/sent/:userId', getCommentsBySource);
// Replies for a parent comment (useful for eager-first-reply or load-all)
router.get('/parent/:parentId/replies', getRepliesByParent);
// Review eligibility check (authenticated)
router.get('/eligibility', authUser, getReviewEligibility);
router.post('/:commentableType/:commentableId', authUser, postComment);

// Update and delete
router.put('/:id', authUser, updateComment);
router.delete('/:id', authUser, deleteComment);

export default router;
