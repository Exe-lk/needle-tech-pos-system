import { NextRequest } from 'next/server';
import { unauthorizedResponse } from './api-response';

/**
 * ⚠️  DEPRECATED: This file uses JWT which has been replaced with Supabase Auth
 * 
 * Please use auth-supabase.ts instead for all authentication needs.
 * This file is kept for backwards compatibility only.
 */

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  type: 'access' | 'refresh';
}

console.warn('⚠️  auth.ts (JWT) is deprecated. Use auth-supabase.ts instead.');

export function verifyAuth(request: NextRequest): JWTPayload | null {
  console.warn('⚠️  verifyAuth() from auth.ts is deprecated. Use authenticateRequest() from auth-supabase.ts');
  return null;
}

