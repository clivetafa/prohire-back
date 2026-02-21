import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { CreateJobInput, UpdateJobInput, GetJobsQuery } from '../validators/job.validator';
import { ApiError } from '../utils/ApiError';
import { JobStatus } from '@prisma/client';

const jobService = new JobService();

export class JobController {
  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      // Only employers and admins can create jobs
      if (req.user.role !== 'EMPLOYER' && req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Only employers can create jobs');
      }

      const data: CreateJobInput = req.body;
      const job = await jobService.createJob(req.user.userId, data);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const query: GetJobsQuery = req.query;
      const result = await jobService.getJobs(query, req.user?.role);

      res.status(200).json({
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const job = await jobService.getJobById(id, req.user?.role);

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const { id } = req.params;
      const data: UpdateJobInput = req.body;
      const job = await jobService.updateJob(id, req.user.userId, data, req.user.role);

      res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const { id } = req.params;
      const result = await jobService.deleteJob(id, req.user.userId, req.user.role);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployerJobs(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      if (req.user.role !== 'EMPLOYER' && req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Access denied');
      }

      const jobs = await jobService.getEmployerJobs(req.user.userId);

      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin only: Approve job
  async approveJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Admin access required');
      }

      const { id } = req.params;
      const job = await jobService.approveJob(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Job approved successfully',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin only: Reject job
  async rejectJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Admin access required');
      }

      const { id } = req.params;
      const job = await jobService.rejectJob(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Job rejected successfully',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
}