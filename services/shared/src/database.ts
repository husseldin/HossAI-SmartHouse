/**
 * Database client using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';

const logger = createLogger('database');

// Singleton Prisma client
let prisma: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query' as any, (e: any) => {
        logger.debug({ query: e.query, duration: e.duration }, 'Database query');
      });
    }

    prisma.$on('error' as any, (e: any) => {
      logger.error({ error: e }, 'Database error');
    });

    prisma.$on('warn' as any, (e: any) => {
      logger.warn({ warning: e }, 'Database warning');
    });

    logger.info('Prisma client initialized');
  }

  return prisma;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Disconnected from database');
    prisma = null;
  }
};

// Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
};

export default getPrismaClient;
