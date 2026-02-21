import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateJobInput, UpdateJobInput, GetJobsQuery } from '../validators/job.validator';
import { JobStatus, Prisma } from '@prisma/client';

export class JobService {
  async createJob(employerId: string, data: CreateJobInput) {
    // Check if employer exists and is not suspended
    const employer = await prisma.user.findUnique({
      where: { id: employerId },
      select: { isSuspended: true, role: true },
    });

    if (!employer || employer.isSuspended) {
      throw new ApiError(403, 'You cannot create jobs');
    }

    // Create job with PENDING_APPROVAL status by default
    const job = await prisma.job.create({
      data: {
        ...data,
        employerId,
    status: JobStatus.APPROVED, // Auto-approve for testing
    
    },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return job;
  }

  async getJobs(query: GetJobsQuery, userRole?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      type,
      experience,
      salaryMin,
      salaryMax,
      sort = 'latest',
      status,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {};

    // Only show approved jobs to non-admin users
    if (userRole !== 'ADMIN') {
      where.status = JobStatus.APPROVED;
    } else if (status) {
      where.status = status as JobStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (type) {
      where.type = type;
    }

    if (experience) {
      where.experience = experience;
    }

    if (salaryMin || salaryMax) {
      where.salaryMin = {};
      if (salaryMin) where.salaryMin.gte = salaryMin;
      if (salaryMax) where.salaryMin.lte = salaryMax;
    }

    // Build orderBy
    let orderBy: Prisma.JobOrderByWithRelationInput = {};
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'salary-high':
        orderBy = { salaryMax: 'desc' };
        break;
      case 'salary-low':
        orderBy = { salaryMin: 'asc' };
        break;
    }

    // Get total count for pagination
    const total = await prisma.job.count({ where });

    // Get jobs
    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getJobById(jobId: string, userRole?: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    // Check if job is approved or user is admin/employer who owns it
    if (
      job.status !== JobStatus.APPROVED &&
      userRole !== 'ADMIN' &&
      !(userRole === 'EMPLOYER')
    ) {
      throw new ApiError(403, 'Job is not available');
    }

    // Increment view count
    await prisma.job.update({
      where: { id: jobId },
      data: { viewCount: { increment: 1 } },
    });

    return job;
  }

  async updateJob(jobId: string, employerId: string, data: UpdateJobInput, userRole: string) {
    // Find the job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    // Check permissions (admin or job owner)
    if (userRole !== 'ADMIN' && job.employerId !== employerId) {
      throw new ApiError(403, 'You do not have permission to update this job');
    }

    // If status is being updated and user is not admin, prevent changing to APPROVED
    if (data.status && userRole !== 'ADMIN' && data.status === JobStatus.APPROVED) {
      throw new ApiError(403, 'Only admins can approve jobs');
    }

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data,
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedJob;
  }

  async deleteJob(jobId: string, employerId: string, userRole: string) {
    // Find the job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    // Check permissions (admin or job owner)
    if (userRole !== 'ADMIN' && job.employerId !== employerId) {
      throw new ApiError(403, 'You do not have permission to delete this job');
    }

    // Delete job
    await prisma.job.delete({
      where: { id: jobId },
    });

    return { message: 'Job deleted successfully' };
  }

  async getEmployerJobs(employerId: string) {
    const jobs = await prisma.job.findMany({
      where: { employerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return jobs;
  }

  // Admin only: Approve job
  async approveJob(jobId: string, adminId: string) {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.APPROVED,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return job;
  }

  // Admin only: Reject job
  async rejectJob(jobId: string, adminId: string) {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.REJECTED,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return job;
  }
}