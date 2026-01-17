import express from 'express';
import { register, login, refreshToken, logout, getMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import authValidator from '../validators/authValidator.js';
import { loginLimiter, registerLimiter } from '../middleware/security.js';

const router = express.Router();

router.post('/register', registerLimiter, validate(authValidator.register, 'body'), register);
router.post('/login', loginLimiter, validate(authValidator.login, 'body'), login);
router.post('/refresh', validate(authValidator.refresh, 'body'), refreshToken);
router.post('/logout', protect, validate(authValidator.logout, 'body'), logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(authValidator.changePassword, 'body'), changePassword);

export default router;
