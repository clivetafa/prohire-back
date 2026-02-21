import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

// ==========================
// Types
// ==========================

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ==========================
// Environment Variables
// ==========================

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not defined');
}

if (!REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET is not defined');
}

// ==========================
// Generate Tokens
// ==========================

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(
    payload,
    ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRE as any || '15m',
    } as jwt.SignOptions
  );
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(
    payload,
    REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE as any || '7d',
    } as jwt.SignOptions
  );
};

// ==========================
// Verify Tokens
// ==========================

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
};
