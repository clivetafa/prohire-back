import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

export class AuthController {
  register = async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, ...result });
  };

  login = async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, ...result });
  };

  refreshToken = async (req: Request, res: Response) => {
    const result = await authService.refreshToken(req.body.token);
    res.status(200).json({ success: true, ...result });
  };

  logout = async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  };

  getMe = async (req: Request, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.status(200).json({ success: true, user });
  };
}
