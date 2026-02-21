import { z } from 'zod';

export const jobTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'] as const;
export const experienceLevels = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'] as const;
export const jobStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED'] as const;

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    benefits: z.string().optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    location: z.string().min(1, 'Location is required'),
    type: z.enum(jobTypes),
    experience: z.enum(experienceLevels),
  }),
});

export const updateJobSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    benefits: z.string().optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    location: z.string().min(1).optional(),
    type: z.enum(jobTypes).optional(),
    experience: z.enum(experienceLevels).optional(),
    status: z.enum(jobStatuses).optional(),
  }),
});

export const jobIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Job ID is required'),
  }),
});

export const getJobsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    location: z.string().optional(),
    type: z.enum(jobTypes).optional(),
    experience: z.enum(experienceLevels).optional(),
    salaryMin: z.string().regex(/^\d+$/).transform(Number).optional(),
    salaryMax: z.string().regex(/^\d+$/).transform(Number).optional(),
    sort: z.enum(['latest', 'oldest', 'salary-high', 'salary-low']).optional(),
    status: z.enum(jobStatuses).optional(),
  }),
});

export type CreateJobInput = z.infer<typeof createJobSchema>['body'];
export type UpdateJobInput = z.infer<typeof updateJobSchema>['body'];
export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>['query'];