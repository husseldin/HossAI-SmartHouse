/**
 * Authentication middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, AuthenticationError, AuthorizationError, UserRole, hasPermission } from '@smart-home/shared';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
  };
}

export const authMiddleware = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    throw new AuthenticationError('Invalid or expired token');
  }

  request.user = {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  };
};

export const requireRole = (requiredRole: UserRole) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AuthenticationError();
    }

    if (!hasPermission(request.user.role, requiredRole)) {
      throw new AuthorizationError();
    }
  };
};
