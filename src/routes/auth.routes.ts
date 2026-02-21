import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { authenticate } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError'; // Add this import
import { AuthService } from '../services/auth.service'; // Add this import

const router = Router();
const authController = new AuthController();
const authService = new AuthService(); // Create instance for email verification routes

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

// Email verification routes
router.post(
  '/send-verification',
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }
      const result = await authService.sendVerificationEmail(req.user.userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/verify-email/:token',
  async (req, res, next) => {
    try {
      const result = await authService.verifyEmail(req.params.token);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;