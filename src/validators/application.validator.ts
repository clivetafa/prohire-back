import { z } from 'zod';

export const applicationStatuses = ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'] as const;

export const createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    coverLetter: z.string().optional(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  body: z.object({
    status: z.enum(applicationStatuses),
    notes: z.string().optional(),
  }),
});

export const applicationIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Application ID is required'),
  }),
});

export const jobIdParamSchema = z.object({
  params: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
  }),
});

export const getApplicationsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(applicationStatuses).optional(),
    jobId: z.string().optional(),
  }),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>['body'];
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>['body'];
export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>['query'];