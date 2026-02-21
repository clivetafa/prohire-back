import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const payload = verifyAccessToken(token);

    // Check if user still exists and is not suspended
// Check if user still exists and is not suspended
try {
  const user = await prisma.user.findUnique({
    where: { 
      id: payload.userId 
    },
    select: { 
      id: true, 
      isSuspended: true 
    },
  });

  console.log('Looking for user with ID:', payload.userId);
  console.log('Found user:', user);

  if (!user) {
    console.log('User not found in database');
    throw new ApiError(401, 'User no longer exists');
  }

  if (user.isSuspended) {
    throw new ApiError(403, 'Your account has been suspended');
  }
} catch (error) {
  console.error('Database error in auth middleware:', error);
  throw new ApiError(500, 'Authentication error');
}

    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    next();
  };
};
console.log("JWT_SECRET:", process.env.JWT_SECRET);
