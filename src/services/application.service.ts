import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateApplicationInput, UpdateApplicationStatusInput, GetApplicationsQuery } from '../validators/application.validator';
import { ApplicationStatus, JobStatus, Prisma } from '@prisma/client';
import { sendEmail, emailTemplates } from '../config/email';

export class ApplicationService {
  async applyForJob(candidateId: string, data: CreateApplicationInput, resumeUrl: string) {
    // Check if job exists and is approved
    const job = await prisma.job.findUnique({
      where: { id: data.jobId },
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

    if (job.status !== JobStatus.APPROVED) {
      throw new ApiError(400, 'This job is not available for applications');
    }

    // Get candidate info
    const candidate = await prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!candidate) {
      throw new ApiError(404, 'Candidate not found');
    }

    // Check if candidate already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_candidateId: {
          jobId: data.jobId,
          candidateId: candidateId,
        },
      },
    });

    if (existingApplication) {
      throw new ApiError(400, 'You have already applied for this job');
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId: data.jobId,
        candidateId: candidateId,
        coverLetter: data.coverLetter,
        resumeUrl: resumeUrl,
        status: ApplicationStatus.PENDING,
      },
      include: {
        job: {
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

    // Send email notification to employer
    try {
      await sendEmail(
        job.employer.email,
        emailTemplates.applicationReceived(
          job.title,
          `${candidate.firstName} ${candidate.lastName}`,
          job.employer.firstName
        ).subject,
        emailTemplates.applicationReceived(
          job.title,
          `${candidate.firstName} ${candidate.lastName}`,
          job.employer.firstName
        ).html
      );
    } catch (error) {
      console.error('Failed to send application notification email:', error);
      // Don't throw - application should still succeed even if email fails
    }

    return application;
  }

  async getApplications(query: GetApplicationsQuery, userId: string, userRole: string) {
    const {
      page = 1,
      limit = 10,
      status,
      jobId,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: Prisma.ApplicationWhereInput = {};

    if (userRole === 'CANDIDATE') {
      // Candidates can only see their own applications
      where.candidateId = userId;
    } else if (userRole === 'EMPLOYER') {
      // Employers can see applications for their jobs
      where.job = {
        employerId: userId,
      };
    }
    // Admins can see all applications

    if (status) {
      where.status = status as ApplicationStatus;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    // Get total count
    const total = await prisma.application.count({ where });

    // Get applications
    const applications = await prisma.application.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
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

  async getApplicationById(applicationId: string, userId: string, userRole: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
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

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    // Check permissions
    if (
      userRole !== 'ADMIN' &&
      !(userRole === 'CANDIDATE' && application.candidateId === userId) &&
      !(userRole === 'EMPLOYER' && application.job.employerId === userId)
    ) {
      throw new ApiError(403, 'You do not have permission to view this application');
    }

    return application;
  }

  async updateApplicationStatus(
    applicationId: string,
    employerId: string,
    data: UpdateApplicationStatusInput
  ) {
    // Find application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
      },
    });

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    // Check if employer owns the job
    if (application.job.employerId !== employerId) {
      throw new ApiError(403, 'You can only update applications for your own jobs');
    }

    // Update status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: data.status as ApplicationStatus,
        notes: data.notes,
      },
      include: {
        job: {
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

    return updatedApplication;
  }

  async getJobApplications(jobId: string, employerId: string) {
    // Check if job exists and belongs to employer
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new ApiError(404, 'Job not found');
    }

    if (job.employerId !== employerId) {
      throw new ApiError(403, 'You can only view applications for your own jobs');
    }

    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
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

    return applications;
  }

  async getMyApplications(candidateId: string) {
    const applications = await prisma.application.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
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
        },
      },
    });

    return applications;
  }

  async withdrawApplication(applicationId: string, candidateId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (application.candidateId !== candidateId) {
      throw new ApiError(403, 'You can only withdraw your own applications');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new ApiError(400, 'Cannot withdraw application that has been reviewed');
    }

    await prisma.application.delete({
      where: { id: applicationId },
    });

    return { message: 'Application withdrawn successfully' };
  }
}