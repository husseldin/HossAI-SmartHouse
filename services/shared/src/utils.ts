/**
 * Common utility functions
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// =================================================================
// ID GENERATION
// =================================================================

export const generateId = (): string => {
  return randomBytes(16).toString('hex');
};

// =================================================================
// ENCRYPTION / DECRYPTION (for secrets at rest)
// =================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'CHANGE_ME_32_CHAR_KEY_HERE!!!!!!';
const ALGORITHM = 'aes-256-cbc';

export const encryptSecret = (text: string): string => {
  const iv = randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32); // Ensure 32 bytes
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
};

export const decryptSecret = (encrypted: string): string => {
  const [ivHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// =================================================================
// IP ADDRESS VALIDATION
// =================================================================

export const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    return false;
  }

  const parts = ip.split('.');
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

export const isValidCIDR = (cidr: string): boolean => {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const [ip, mask] = parts;
  const maskNum = parseInt(mask, 10);

  return isValidIPv4(ip) && maskNum >= 0 && maskNum <= 32;
};

// =================================================================
// MAC ADDRESS VALIDATION & FORMATTING
// =================================================================

export const isValidMacAddress = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export const normalizeMacAddress = (mac: string): string => {
  // Convert to uppercase and use colon separator
  return mac
    .replace(/[:-]/g, '')
    .toUpperCase()
    .match(/.{1,2}/g)!
    .join(':');
};

// =================================================================
// TIME & DATE UTILITIES
// =================================================================

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isDateExpired = (date: Date): boolean => {
  return date.getTime() < Date.now();
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 86400000);
};

// =================================================================
// ERROR HANDLING
// =================================================================

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

// =================================================================
// RETRY LOGIC
// =================================================================

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxAttempts = 3, delayMs = 1000, exponentialBackoff = true } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

// =================================================================
// SANITIZATION
// =================================================================

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const sanitizeForLog = (obj: any): any => {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'credentials'];

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeForLog(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
};
