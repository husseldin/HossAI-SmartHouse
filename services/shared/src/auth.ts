/**
 * Authentication utilities
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';
const BCRYPT_ROUNDS = 12;

// =================================================================
// PASSWORD HASHING
// =================================================================

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// =================================================================
// JWT TOKEN GENERATION & VERIFICATION
// =================================================================

export interface TokenOptions {
  expiresIn?: string;
}

export const generateToken = (
  userId: string,
  username: string,
  role: UserRole,
  options?: TokenOptions
): string => {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    userId,
    username,
    role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options?.expiresIn || JWT_EXPIRY,
  });
};

export const generateRefreshToken = (userId: string, username: string, role: UserRole): string => {
  return generateToken(userId, username, role, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyToken = (token: string): AuthTokenPayload | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): AuthTokenPayload | null => {
  try {
    const payload = jwt.decode(token) as AuthTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
};

// =================================================================
// TOKEN VALIDATION
// =================================================================

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
};

// =================================================================
// ROLE & PERMISSION CHECKS
// =================================================================

export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.READONLY]: 1,
    [UserRole.AGENT]: 2,
    [UserRole.USER]: 3,
    [UserRole.ADMIN]: 4,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const isAdmin = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN;
};

export const isAgent = (userRole: UserRole): boolean => {
  return userRole === UserRole.AGENT;
};
