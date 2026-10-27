import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import { authUser } from '../middlewares/auth.js';
import { uploadMedia, getMediaObject } from '../controllers/Media.controller.js';

const router = express.Router();

router.put(
    '/upload',
    authUser,
    express.raw({
        type: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/avif',
        ],
        limit: '6mb',
    }),
    uploadMedia
);

router.get('/object/*', getMediaObject);

export default router;
