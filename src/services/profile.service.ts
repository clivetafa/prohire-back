import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Completion score calculator ────────────────────────────────────────────

const calcCandidateCompletion = (profile: any, user: any): number => {
  const fields = [
    profile.phone, profile.location, profile.bio,
    profile.cvUrl, profile.portfolioUrl,
    user.firstName, user.lastName,
    profile.skills?.length > 0,
    profile.experience?.length > 0,
    profile.education?.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

const calcEmployerCompletion = (profile: any): number => {
  const fields = [
    profile.companyName, profile.industry, profile.companySize,
    profile.website, profile.description, profile.location,
    profile.logoUrl, profile.foundedYear,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

// ── Candidate Profile ──────────────────────────────────────────────────────

export class ProfileService {

  async getCandidateProfile(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { skills: true, experience: { orderBy: { startDate: 'desc' } }, education: { orderBy: { startDate: 'desc' } } },
    });
    if (!profile) throw new ApiError(404, 'Profile not found');
    return profile;
  }

  async updateCandidateProfile(userId: string, data: any) {
    const profile = await prisma.candidateProfile.upsert({
      where: { userId },
      update: {
        phone: data.phone,
        location: data.location,
        bio: data.bio,
        portfolioUrl: data.portfolioUrl,
      },
      create: {
        userId,
        phone: data.phone,
        location: data.location,
        bio: data.bio,
        portfolioUrl: data.portfolioUrl,
      },
      include: { skills: true, experience: true, education: true },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const completion = calcCandidateCompletion(profile, user);
    await prisma.candidateProfile.update({ where: { userId }, data: { profileCompletion: completion } });

    return { ...profile, profileCompletion: completion };
  }

  async uploadCv(userId: string, fileBuffer: Buffer, mimetype: string) {
    if (mimetype !== 'application/pdf') throw new ApiError(400, 'Only PDF files are allowed');

    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');

    // Delete old CV if exists
    if (profile.cvPublicId) {
      await cloudinary.uploader.destroy(profile.cvPublicId, { resource_type: 'raw' });
    }

    // Upload new CV
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: 'prohire/cvs', format: 'pdf' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      ).end(fileBuffer);
    });

    await prisma.candidateProfile.update({
      where: { userId },
      data: { cvUrl: result.secure_url, cvPublicId: result.public_id },
    });

    return { cvUrl: result.secure_url };
  }

  // ── Skills ──────────────────────────────────────────────────────────────

  async addSkill(userId: string, name: string, level: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');

    const skill = await prisma.candidateSkill.create({
      data: { profileId: profile.id, name, level: level as any },
    });
    return skill;
  }

  async removeSkill(userId: string, skillId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');

    await prisma.candidateSkill.deleteMany({
      where: { id: skillId, profileId: profile.id },
    });
    return { message: 'Skill removed' };
  }

  // ── Work Experience ─────────────────────────────────────────────────────

  async addExperience(userId: string, data: any) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');

    return prisma.workExperience.create({
      data: {
        profileId: profile.id,
        jobTitle: data.jobTitle,
        company: data.company,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent || false,
        description: data.description,
      },
    });
  }

  async updateExperience(userId: string, experienceId: string, data: any) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');

    return prisma.workExperience.update({
      where: { id: experienceId },
      data: {
        jobTitle: data.jobTitle,
        company: data.company,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent || false,
        description: data.description,
      },
    });
  }

  async deleteExperience(userId: string, experienceId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');
    await prisma.workExperience.delete({ where: { id: experienceId } });
    return { message: 'Experience deleted' };
  }

  // ── Education ───────────────────────────────────────────────────────────

  async addEducation(userId: string, data: any) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');

    return prisma.education.create({
      data: {
        profileId: profile.id,
        institution: data.institution,
        degree: data.degree,
        fieldOfStudy: data.fieldOfStudy,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent || false,
        grade: data.grade,
      },
    });
  }

  async deleteEducation(userId: string, educationId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');
    await prisma.education.delete({ where: { id: educationId } });
    return { message: 'Education deleted' };
  }

  // ── Employer Profile ────────────────────────────────────────────────────

  async getEmployerProfile(userId: string) {
    const profile = await prisma.employerProfile.findUnique({ where: { userId } });
    if (!profile) throw new ApiError(404, 'Profile not found');
    return profile;
  }

  async updateEmployerProfile(userId: string, data: any) {
    const profile = await prisma.employerProfile.upsert({
      where: { userId },
      update: {
        companyName: data.companyName,
        industry: data.industry,
        companySize: data.companySize,
        website: data.website,
        description: data.description,
        location: data.location,
        foundedYear: data.foundedYear,
      },
      create: {
        userId,
        companyName: data.companyName,
        industry: data.industry,
        companySize: data.companySize,
        website: data.website,
        description: data.description,
        location: data.location,
        foundedYear: data.foundedYear,
      },
    });

    const completion = calcEmployerCompletion(profile);
    await prisma.employerProfile.update({ where: { userId }, data: { profileCompletion: completion } });

    return { ...profile, profileCompletion: completion };
  }
}
