import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { ApiError } from '../utils/ApiError';

const adminService = new AdminService();

export class AdminController {
  // ======================
  // Dashboard
  // ======================
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ======================
  // User Management
  // ======================
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAllUsers(req.query);
      
      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserById(id);
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { suspend } = req.body;
      
      const result = await adminService.suspendUser(id, suspend);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const result = await adminService.deleteUser(id);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // ======================
  // Job Moderation
  // ======================
  async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAllJobs(req.query);
      
      res.status(200).json({
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const { id } = req.params;
      const job = await adminService.moderateJob(id, req.user.userId, 'APPROVED');
      
      res.status(200).json({
        success: true,
        message: 'Job approved successfully',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const { id } = req.params;
      const job = await adminService.moderateJob(id, req.user.userId, 'REJECTED');
      
      res.status(200).json({
        success: true,
        message: 'Job rejected successfully',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkModerateJobs(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const { jobIds, status } = req.body;
      
      // Validate status
      if (status !== 'APPROVED' && status !== 'REJECTED') {
        throw new ApiError(400, 'Status must be either APPROVED or REJECTED');
      }
      
      const result = await adminService.bulkModerateJobs(
        jobIds,
        req.user.userId,
        status
      );
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: { count: result.count },
      });
    } catch (error) {
      next(error);
    }
  }

  // ======================
  // Application Management
  // ======================
  async getAllApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAllApplications(req.query);
      
      res.status(200).json({
        success: true,
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ======================
  // System Health
  // ======================
  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await adminService.getSystemHealth();
      
      res.status(200).json({
        success: true,
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }
}