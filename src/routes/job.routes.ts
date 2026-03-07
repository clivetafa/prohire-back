import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createJobSchema,
  updateJobSchema,
  jobIdSchema,
  getJobsQuerySchema,
} from '../validators/job.validator';

const router = Router();
const jobController = new JobController();

// Public routes
router.get('/', validate(getJobsQuerySchema), jobController.getJobs);
router.get('/:id', validate(jobIdSchema), jobController.getJobById);

// Protected routes (require authentication)
router.use(authenticate);

// Employer routes
router.post(
  '/',
  authorize('EMPLOYER', 'ADMIN'),
  validate(createJobSchema),
  jobController.createJob
);

router.get(
  '/employer/my-jobs',
  authorize('EMPLOYER', 'ADMIN'),
  jobController.getEmployerJobs
);

router.put(
  '/:id',
  validate(jobIdSchema),
  validate(updateJobSchema),
  jobController.updateJob
);

router.delete(
  '/:id',
  validate(jobIdSchema),
  jobController.deleteJob
);

// Admin only routes
router.patch(
  '/:id/approve',
  authorize('ADMIN'),
  validate(jobIdSchema),
  jobController.approveJob
);

router.patch(
  '/:id/reject',
  authorize('ADMIN'),
  validate(jobIdSchema),
  jobController.rejectJob
);

export default router;  