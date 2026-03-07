import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { sendOtpEmail } from './email.service';

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'CANDIDATE' | 'EMPLOYER';
}

interface LoginInput {
  email: string;
  password: string;
}

const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateAccessToken = (userId: string, email: string, role: string): string =>
  jwt.sign(
    { userId, email, role },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' } as jwt.SignOptions
  );

const generateRefreshToken = (userId: string, email: string, role: string): string =>
  jwt.sign(
    { userId, email, role },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' } as jwt.SignOptions
  );

export class AuthService {

  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ApiError(400, 'An account with this email already exists');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'CANDIDATE',
        otpCode: otp,
        otpExpiresAt,
      },
    });

    if (user.role === 'CANDIDATE') {
      await prisma.candidateProfile.create({ data: { userId: user.id } });
    } else if (user.role === 'EMPLOYER') {
      await prisma.employerProfile.create({ data: { userId: user.id } });
    }

    sendOtpEmail(user.email, otp, user.firstName).catch((err) =>
      console.error('Failed to send OTP email:', err.message)
    );

    return {
      message: 'Registration successful. Please check your email for a verification code.',
      userId: user.id,
      email: user.email,
    };
  }

  async verifyEmail(userId: string, otp: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.isVerified) throw new ApiError(400, 'Email already verified');
    if (!user.otpCode || !user.otpExpiresAt) throw new ApiError(400, 'No verification code found');
    if (new Date() > user.otpExpiresAt) throw new ApiError(400, 'Verification code has expired');
    if (user.otpCode !== otp) throw new ApiError(400, 'Invalid verification code');

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id, user.email, user.role);
    const { password: _, otpCode: __, ...userWithoutSensitive } = user;

    return {
      message: 'Email verified successfully!',
      user: { ...userWithoutSensitive, isVerified: true },
      accessToken,
      refreshToken,
    };
  }

  async resendOtp(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.isVerified) throw new ApiError(400, 'Email already verified');

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({ where: { id: userId }, data: { otpCode: otp, otpExpiresAt } });

    sendOtpEmail(user.email, otp, user.firstName).catch((err) =>
      console.error('Failed to resend OTP:', err.message)
    );

    return { message: 'A new verification code has been sent to your email.' };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new ApiError(401, 'Invalid email or password');
    if (user.isSuspended) throw new ApiError(403, 'Your account has been suspended');

    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) throw new ApiError(401, 'Invalid email or password');

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id, user.email, user.role);
    const { password: _, otpCode: __, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      accessToken,
      refreshToken,
      requiresVerification: !user.isVerified,
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as {
        userId: string; email: string; role: string;
      };
      return { accessToken: generateAccessToken(decoded.userId, decoded.email, decoded.role) };
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isVerified: true, isSuspended: true,
        createdAt: true, updatedAt: true,
        candidateProfile: { include: { skills: true, experience: true, education: true } },
        employerProfile: true,
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  async logout(_userId: string) {
    return { message: 'Logged out successfully' };
  }
}
