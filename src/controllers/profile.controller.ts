import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service';

const profileService = new ProfileService();

export class ProfileController {

  // ── Candidate ────────────────────────────────────────────────────────────

  async getCandidateProfile(req: any, res: Response) {
    try {
      const profile = await profileService.getCandidateProfile(req.user.userId);
      res.json({ success: true, profile });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async updateCandidateProfile(req: any, res: Response) {
    try {
      const profile = await profileService.updateCandidateProfile(req.user.userId, req.body);
      res.json({ success: true, profile });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async uploadCv(req: any, res: Response) {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const result = await profileService.uploadCv(
        req.user.userId,
        req.file.buffer,
        req.file.mimetype
      );
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async addSkill(req: any, res: Response) {
    try {
      const { name, level } = req.body;
      const skill = await profileService.addSkill(req.user.userId, name, level);
      res.status(201).json({ success: true, skill });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async removeSkill(req: any, res: Response) {
    try {
      const result = await profileService.removeSkill(req.user.userId, req.params.skillId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async addExperience(req: any, res: Response) {
    try {
      const experience = await profileService.addExperience(req.user.userId, req.body);
      res.status(201).json({ success: true, experience });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async updateExperience(req: any, res: Response) {
    try {
      const experience = await profileService.updateExperience(
        req.user.userId, req.params.id, req.body
      );
      res.json({ success: true, experience });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async deleteExperience(req: any, res: Response) {
    try {
      const result = await profileService.deleteExperience(req.user.userId, req.params.id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async addEducation(req: any, res: Response) {
    try {
      const education = await profileService.addEducation(req.user.userId, req.body);
      res.status(201).json({ success: true, education });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async deleteEducation(req: any, res: Response) {
    try {
      const result = await profileService.deleteEducation(req.user.userId, req.params.id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  // ── Employer ─────────────────────────────────────────────────────────────

  async getEmployerProfile(req: any, res: Response) {
    try {
      const profile = await profileService.getEmployerProfile(req.user.userId);
      res.json({ success: true, profile });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async updateEmployerProfile(req: any, res: Response) {
    try {
      const profile = await profileService.updateEmployerProfile(req.user.userId, req.body);
      res.json({ success: true, profile });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}
