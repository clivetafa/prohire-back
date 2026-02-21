import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ======================
// Dashboard
// ======================
router.get('/dashboard/stats', adminController.getDashboardStats);

// ======================
// User Management
// ======================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch(
  '/users/:id/suspend',
  validate(
    z.object({
      body: z.object({
        suspend: z.boolean(),
      }),
      params: z.object({
        id: z.string(),
      }),
    })
  ),
  adminController.suspendUser
);
router.delete('/users/:id', adminController.deleteUser);

// ======================
// Job Moderation
// ======================
router.get('/jobs', adminController.getAllJobs);
router.patch('/jobs/:id/approve', adminController.approveJob);
router.patch('/jobs/:id/reject', adminController.rejectJob);
router.post(
  '/jobs/bulk-moderate',
  validate(
    z.object({
      body: z.object({
        jobIds: z.array(z.string()),
        status: z.enum(['APPROVED', 'REJECTED']),
      }),
    })
  ),
  adminController.bulkModerateJobs
);

// ======================
// Application Management
// ======================
router.get('/applications', adminController.getAllApplications);

// ======================
// System Health
// ======================
router.get('/health', adminController.getSystemHealth);

export default router;