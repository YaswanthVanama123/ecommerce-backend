import express from 'express';
import { getCsrfToken } from '../middleware/csrf.js';

const router = express.Router();

// Get CSRF token
router.get('/csrf-token', getCsrfToken);

export default router;
