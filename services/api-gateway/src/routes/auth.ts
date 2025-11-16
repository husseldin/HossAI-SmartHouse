/**
 * Authentication routes
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getPrismaClient,
  createLogger,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  loginSchema,
  createUserSchema,
  hashPassword,
  AuthenticationError,
  ValidationError,
  UserRole,
} from '@smart-home/shared';

const logger = createLogger('auth-routes');
const db = getPrismaClient();

export default async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid login data', parsed.error);
      }

      const { username, password } = parsed.data;

      const user = await db.user.findUnique({
        where: { username },
      });

      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new AuthenticationError('Invalid credentials');
      }

      const token = generateToken(user.id, user.username, user.role as UserRole);
      const refreshToken = generateRefreshToken(user.id, user.username, user.role as UserRole);

      // Store session
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await db.session.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt,
        },
      });

      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      logger.info({ userId: user.id, username: user.username }, 'User logged in');

      return {
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
      };
    } catch (error: any) {
      logger.error({ error }, 'Login failed');
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.code || 'LOGIN_FAILED',
          message: error.message,
        },
      });
    }
  });

  // Register (admin only or first user)
  fastify.post('/register', async (request, reply) => {
    try {
      const parsed = createUserSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid user data', parsed.error);
      }

      const { username, email, password, role } = parsed.data;

      // Check if this is the first user
      const userCount = await db.user.count();
      const isFirstUser = userCount === 0;

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await db.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: isFirstUser ? UserRole.ADMIN : role, // First user is always admin
        },
      });

      logger.info({ userId: user.id, username: user.username, isFirstUser }, 'User registered');

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
      };
    } catch (error: any) {
      logger.error({ error }, 'Registration failed');
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.code || 'REGISTRATION_FAILED',
          message: error.message,
        },
      });
    }
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await db.session.deleteMany({
          where: { token },
        });
      }

      return { success: true };
    } catch (error: any) {
      logger.error({ error }, 'Logout failed');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: error.message,
        },
      });
    }
  });

  // Verify token
  fastify.get('/verify', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError();
      }

      const token = authHeader.substring(7);
      const session = await db.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new AuthenticationError('Invalid or expired token');
      }

      return {
        success: true,
        data: {
          user: {
            id: session.user.id,
            username: session.user.username,
            email: session.user.email,
            role: session.user.role,
          },
        },
      };
    } catch (error: any) {
      return reply.status(error.statusCode || 401).send({
        success: false,
        error: {
          code: error.code || 'VERIFICATION_FAILED',
          message: error.message,
        },
      });
    }
  });
}
