import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', (req, res) => controller.register(req, res));
router.post('/login', (req, res) => controller.login(req, res));
router.post('/refresh', (req, res) => controller.refreshToken(req, res));

router.get('/me', authenticate, (req, res) =>
  controller.getCurrentUser(req, res)
);

router.post('/logout', authenticate, (req, res) =>
  controller.logout(req, res)
);

export default router;