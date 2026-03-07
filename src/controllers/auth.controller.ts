import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {

  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { userId, otp } = req.body;
      const result = await authService.verifyEmail(userId, otp);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  async resendOtp(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const result = await authService.resendOtp(userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      const result = await authService.refreshToken(token);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  async getCurrentUser(req: any, res: Response) {
    try {
      const user = await authService.getCurrentUser(req.user.userId);
      res.status(200).json({ success: true, user });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  async logout(req: any, res: Response) {
    try {
      const result = await authService.logout(req.user.userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }
}
