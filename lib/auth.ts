import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { unauthorizedResponse } from './api-response';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  type: 'access' | 'refresh';
}

// Token blacklist (in-memory storage)
// In production, use Redis or a database for distributed systems
const tokenBlacklist = new Set<string>();

// Cleanup old tokens from blacklist every hour
setInterval(() => {
  // In a real implementation, you'd check token expiration and remove expired ones
  // For now, we'll just log the size
  if (tokenBlacklist.size > 1000) {
    console.log(`Token blacklist size: ${tokenBlacklist.size}. Consider implementing cleanup.`);
  }
}, 60 * 60 * 1000);

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string, username: string, role: string): string {
  const payload: JWTPayload = {
    userId,
    username,
    role,
    type: 'access',
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string, username: string, role: string): string {
  const payload: JWTPayload = {
    userId,
    username,
    role,
    type: 'refresh',
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Add token to blacklist (for logout)
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Get blacklist size (for monitoring)
 */
export function getBlacklistSize(): number {
  return tokenBlacklist.size;
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // Check for Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Verify request authentication
 * Returns the decoded JWT payload or null if authentication fails
 */
export function verifyAuth(request: NextRequest): JWTPayload | null {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }
  
  const payload = verifyToken(token);
  
  if (!payload || payload.type !== 'access') {
    return null;
  }
  
  return payload;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash using bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Middleware wrapper for protected routes
 * Use this to wrap your route handlers to require authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, auth: JWTPayload, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const auth = verifyAuth(request);
    
    if (!auth) {
      return unauthorizedResponse('Authentication required. Please provide a valid access token.');
    }
    
    return handler(request, auth, ...args);
  };
}

/**
 * Middleware wrapper for protected routes with role-based authorization
 * Use this to restrict access to specific roles
 */
export function withAuthAndRole<T extends any[]>(
  allowedRoles: string[],
  handler: (request: NextRequest, auth: JWTPayload, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const auth = verifyAuth(request);
    
    if (!auth) {
      return unauthorizedResponse('Authentication required. Please provide a valid access token.');
    }
    
    if (!allowedRoles.includes(auth.role)) {
      return unauthorizedResponse('Insufficient permissions. You do not have access to this resource.');
    }
    
    return handler(request, auth, ...args);
  };
}
