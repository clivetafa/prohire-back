import { Router } from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationIdSchema,
  jobIdParamSchema,
  getApplicationsQuerySchema,
} from '../validators/application.validator';

const router = Router();
const applicationController = new ApplicationController();

// All routes require authentication
router.use(authenticate);

// Candidate routes
router.post(
  '/',
  authorize('CANDIDATE'),
  upload.single('resume'),
  validate(createApplicationSchema),
  applicationController.applyForJob
);

router.get(
  '/my-applications',
  authorize('CANDIDATE'),
  applicationController.getMyApplications
);

router.delete(
  '/:id/withdraw',
  authorize('CANDIDATE'),
  validate(applicationIdSchema),
  applicationController.withdrawApplication
);

// Employer routes
router.get(
  '/job/:jobId',
  authorize('EMPLOYER', 'ADMIN'),
  validate(jobIdParamSchema),
  applicationController.getJobApplications
);

router.patch(
  '/:id/status',
  authorize('EMPLOYER', 'ADMIN'),
  validate(applicationIdSchema),
  validate(updateApplicationStatusSchema),
  applicationController.updateApplicationStatus
);

// Shared routes (accessible by candidates, employers, and admins based on permissions)
router.get(
  '/',
  validate(getApplicationsQuerySchema),
  applicationController.getApplications
);

router.get(
  '/:id',
  validate(applicationIdSchema),
  applicationController.getApplicationById
);

export default router;