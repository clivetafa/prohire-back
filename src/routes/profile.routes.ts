import { Router } from 'express';
import multer from 'multer';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new ProfileController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// All routes require authentication
router.use(authenticate);

// ── Candidate routes ───────────────────────────────────────────────────────
router.get('/candidate', authorize('CANDIDATE'), (req, res) => controller.getCandidateProfile(req, res));
router.put('/candidate', authorize('CANDIDATE'), (req, res) => controller.updateCandidateProfile(req, res));
router.post('/candidate/cv', authorize('CANDIDATE'), upload.single('cv'), (req, res) => controller.uploadCv(req, res));

// Skills
router.post('/candidate/skills', authorize('CANDIDATE'), (req, res) => controller.addSkill(req, res));
router.delete('/candidate/skills/:skillId', authorize('CANDIDATE'), (req, res) => controller.removeSkill(req, res));

// Experience
router.post('/candidate/experience', authorize('CANDIDATE'), (req, res) => controller.addExperience(req, res));
router.put('/candidate/experience/:id', authorize('CANDIDATE'), (req, res) => controller.updateExperience(req, res));
router.delete('/candidate/experience/:id', authorize('CANDIDATE'), (req, res) => controller.deleteExperience(req, res));

// Education
router.post('/candidate/education', authorize('CANDIDATE'), (req, res) => controller.addEducation(req, res));
router.delete('/candidate/education/:id', authorize('CANDIDATE'), (req, res) => controller.deleteEducation(req, res));

// ── Employer routes ────────────────────────────────────────────────────────
router.get('/employer', authorize('EMPLOYER'), (req, res) => controller.getEmployerProfile(req, res));
router.put('/employer', authorize('EMPLOYER'), (req, res) => controller.updateEmployerProfile(req, res));

export default router;
