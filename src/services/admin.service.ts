import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { Prisma, JobStatus, ApplicationStatus, Role } from '@prisma/client';
import { sendEmail, emailTemplates } from '../config/email';

export class AdminService {
  // ======================
  // Dashboard Statistics
  // ======================
  async getDashboardStats() {
    const [
      totalUsers,
      totalEmployers,
      totalCandidates,
      totalJobs,
      pendingJobs,
      approvedJobs,
      totalApplications,
      recentUsers,
      recentJobs,
      recentApplications,
      jobStatsByType,
      applicationStatsByStatus,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.EMPLOYER } }),
      prisma.user.count({ where: { role: Role.CANDIDATE } }),
      
      // Job counts
      prisma.job.count(),
      prisma.job.count({ where: { status: JobStatus.PENDING_APPROVAL } }),
      prisma.job.count({ where: { status: JobStatus.APPROVED } }),
      
      // Application count
      prisma.application.count(),
      
      // Recent data (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.job.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.application.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Jobs by type
      prisma.job.groupBy({
        by: ['type'],
        _count: true,
      }),
      
      // Applications by status
      prisma.application.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Get top employers (by job count)
    const topEmployers = await prisma.user.findMany({
      where: { role: Role.EMPLOYER },
      take: 5,
      orderBy: {
        jobs: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: { jobs: true },
        },
      },
    });

    // Get most active jobs (by application count)
    const topJobs = await prisma.job.findMany({
      where: { status: JobStatus.APPROVED },
      take: 5,
      orderBy: {
        applications: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        title: true,
        employer: {
          select: {
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
      users: {
        total: totalUsers,
        employers: totalEmployers,
        candidates: totalCandidates,
        newLast7Days: recentUsers,
      },
      jobs: {
        total: totalJobs,
        pending: pendingJobs,
        approved: approvedJobs,
        newLast7Days: recentJobs,
        byType: jobStatsByType,
      },
      applications: {
        total: totalApplications,
        newLast7Days: recentApplications,
        byStatus: applicationStatsByStatus,
      },
      topEmployers,
      topJobs,
    };
  }

  // ======================
  // User Management
  // ======================
  async getAllUsers(query: any) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isSuspended,
      sort = 'latest',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isSuspended !== undefined) {
      where.isSuspended = isSuspended === 'true';
    }

    // Build orderBy
    let orderBy: Prisma.UserOrderByWithRelationInput = {};
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'name':
        orderBy = { firstName: 'asc' };
        break;
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            jobs: true,
            applications: true,
          },
        },
      },
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            _count: {
              select: { applications: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            job: {
              select: {
                id: true,
                title: true,
                employer: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            jobs: true,
            applications: true,
            refreshTokens: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  async suspendUser(userId: string, suspend: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role === Role.ADMIN) {
      throw new ApiError(403, 'Cannot suspend another admin');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: suspend },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isSuspended: true,
      },
    });

    return {
      user: updatedUser,
      message: suspend ? 'User suspended successfully' : 'User activated successfully',
    };
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role === Role.ADMIN) {
      throw new ApiError(403, 'Cannot delete another admin');
    }

    // Delete user and all related data (cascading should handle this)
    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  // ======================
  // Job Moderation
  // ======================
  async getAllJobs(query: any) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      employerId,
      sort = 'latest',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (employerId) {
      where.employerId = employerId;
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
      case 'most-viewed':
        orderBy = { viewCount: 'desc' };
        break;
      case 'most-applied':
        orderBy = { applications: { _count: 'desc' } };
        break;
    }

    const total = await prisma.job.count({ where });

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
        approver: {
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

  async moderateJob(jobId: string, adminId: string, status: 'APPROVED' | 'REJECTED') {
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
      },
    });

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: status as JobStatus,
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
        approver: {
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

    // Send email notification to employer if job is approved
    if (status === 'APPROVED') {
      try {
        await sendEmail(
          job.employer.email,
          emailTemplates.jobApproved(job.title, job.employer.firstName).subject,
          emailTemplates.jobApproved(job.title, job.employer.firstName).html
        );
      } catch (error) {
        console.error('Failed to send job approval email:', error);
        // Don't throw - we don't want to fail the moderation if email fails
      }
    }

    return updatedJob;
  }

  async bulkModerateJobs(jobIds: string[], adminId: string, status: 'APPROVED' | 'REJECTED') {
    const result = await prisma.job.updateMany({
      where: {
        id: { in: jobIds },
      },
      data: {
        status: status as JobStatus,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    return {
      message: `${result.count} jobs ${status.toLowerCase()} successfully`,
      count: result.count,
    };
  }

  // ======================
  // Application Management
  // ======================
  async getAllApplications(query: any) {
    const {
      page = 1,
      limit = 10,
      status,
      jobId,
      candidateId,
      sort = 'latest',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ApplicationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (candidateId) {
      where.candidateId = candidateId;
    }

    // Build orderBy
    let orderBy: Prisma.ApplicationOrderByWithRelationInput = {};
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
    }

    const total = await prisma.application.count({ where });

    const applications = await prisma.application.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ======================
  // System Health
  // ======================
  async getSystemHealth() {
    // Check database connection
    let dbStatus = 'healthy';
    let dbError = null;
    
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'unhealthy';
      dbError = error instanceof Error ? error.message : 'Database connection failed';
    }

    // Get storage stats (if needed)
    const totalUsers = await prisma.user.count();
    const totalJobs = await prisma.job.count();
    const totalApplications = await prisma.application.count();

    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        error: dbError,
      },
      statistics: {
        totalUsers,
        totalJobs,
        totalApplications,
      },
    };
  }
}