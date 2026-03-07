import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

// ======================
// Types
// ======================

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

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
    isSuspended: boolean;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

// ======================
// Auth Service Class
// ======================

export class AuthService {

  private generateAccessToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { userId, email, role }, // ← role and email included
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' } as jwt.SignOptions
    );
  }

  private generateRefreshToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { userId, email, role }, // ← role and email included
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' } as jwt.SignOptions
    );
  }

  async register(data: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'CANDIDATE',
      }
    });

    const accessToken = this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id, user.email, user.role);

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (user.isSuspended) {
      throw new ApiError(403, 'Account is suspended');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id, user.email, user.role);

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET as string
      ) as { userId: string; email: string; role: string };

      const accessToken = this.generateAccessToken(decoded.userId, decoded.email, decoded.role);
      return { accessToken };
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }

  async getCurrentUser(userId: string) {
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
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  async logout(_userId: string): Promise<{ message: string }> {
    return { message: 'Logged out successfully' };
  }

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isSuspended: true,
      }
    });
  }
}