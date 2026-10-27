import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);



const express = require('express');

const router = express.Router();

/* GET home page. */
router.get('/', (_req, res) => {
    res.json({ message: 'express JSON' });
});

export default router;
