import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { CreateApplicationInput, UpdateApplicationStatusInput, GetApplicationsQuery } from '../validators/application.validator';
import { ApiError } from '../utils/ApiError';
import { uploadToCloudinary } from '../middleware/upload.middleware';

const applicationService = new ApplicationService();

export class ApplicationController {
  async applyForJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      if (req.user.role !== 'CANDIDATE') {
        throw new ApiError(403, 'Only candidates can apply for jobs');
      }

      if (!req.file) {
        throw new ApiError(400, 'Resume file is required');
      }

      const data: CreateApplicationInput = req.body;
      
      // Upload resume to Cloudinary
      const resumeUrl = await uploadToCloudinary(req.file);

      const application = await applicationService.applyForJob(
        req.user.userId,
        data,
        resumeUrl
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const query: GetApplicationsQuery = req.query;
      const result = await applicationService.getApplications(
        query,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApplicationById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const { id } = req.params;
      const application = await applicationService.getApplicationById(
        id,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      if (req.user.role !== 'EMPLOYER' && req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Only employers can update application status');
      }

      const { id } = req.params;
      const data: UpdateApplicationStatusInput = req.body;
      
      const application = await applicationService.updateApplicationStatus(
        id,
        req.user.userId,
        data
      );

      res.status(200).json({
        success: true,
        message: 'Application status updated successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobApplications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      if (req.user.role !== 'EMPLOYER' && req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Access denied');
      }

      const { jobId } = req.params;
      const applications = await applicationService.getJobApplications(
        jobId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyApplications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      if (req.user.role !== 'CANDIDATE') {
        throw new ApiError(403, 'Access denied');
      }

      const applications = await applicationService.getMyApplications(req.user.userId);

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  async withdrawApplication(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      if (req.user.role !== 'CANDIDATE') {
        throw new ApiError(403, 'Only candidates can withdraw applications');
      }

      const { id } = req.params;
      const result = await applicationService.withdrawApplication(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}