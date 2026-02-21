import { Router } from 'express';
import { PasswordService } from '../services/password.service';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError'; // Add this import

const router = Router();
const passwordService = new PasswordService();

// Request password reset
router.post(
  '/forgot-password',
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const result = await passwordService.generateResetToken(req.body.email);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

// Reset password with token
router.post(
  '/reset-password',
  validate(
    z.object({
      body: z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const result = await passwordService.resetPassword(req.body.token, req.body.newPassword);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

// Change password (authenticated)
router.post(
  '/change-password',
  authenticate,
  validate(
    z.object({
      body: z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }
      const result = await passwordService.changePassword(
        req.user.userId,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;