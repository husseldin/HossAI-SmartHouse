/**
 * Centralized logging utility using Pino
 */

import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const createLogger = (serviceName: string) => {
  const logger = pino({
    name: serviceName,
    level: LOG_LEVEL,
    ...(LOG_FORMAT === 'pretty' && NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  return logger;
};

// Create a default logger for the shared module
export const logger = createLogger('shared');

export default createLogger;
