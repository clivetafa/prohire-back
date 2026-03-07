import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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
  // ======================
  // Private Helpers
  // ======================

  private generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
  }

  // ======================
  // Public Methods
  // ======================

  async register(data: RegisterInput): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: hashedPassword,
          role: data.role || 'CANDIDATE',
        }
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw error;
    }
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if suspended
      if (user.isSuspended) {
        throw new Error('Account is suspended');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        data.password,
        user.password
      );

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET as string
      ) as { userId: string };

      const accessToken = this.generateAccessToken(decoded.userId);

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async getCurrentUser(userId: string) {
    try {
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
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // In a real app, you might want to invalidate the refresh token in database
    return { message: 'Logged out successfully' };
  }

  // Optional: Get user by email (useful for other services)
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