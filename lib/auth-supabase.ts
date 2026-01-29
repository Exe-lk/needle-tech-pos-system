import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'
import prisma from './prisma'

export interface AuthUser {
  id: string
  email: string
  username: string
  fullName: string
  role: {
    id: string
    name: string
    permissions: string[]
  }
}

/**
 * Register a new user with Supabase Auth and create corresponding Prisma user record
 * @param email User email
 * @param password User password
 * @param username Username
 * @param fullName Full name
 * @param roleId Role ID (defaults to user role)
 * @param phone Optional phone number
 */
export async function registerUser({
  email,
  password,
  username,
  fullName,
  roleId,
  phone
}: {
  email: string
  password: string
  username: string
  fullName: string
  roleId: string
  phone?: string
}) {
  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username }
  })

  if (existingUser) {
    throw new Error('Username already exists')
  }

  // Create user in Supabase Auth (no email confirmation required)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email confirmation
    user_metadata: {
      username,
      fullName,
      phone
    }
  })

  if (authError) {
    throw new Error(`Supabase Auth error: ${authError.message}`)
  }

  if (!authData.user) {
    throw new Error('Failed to create user in Supabase Auth')
  }

  // Create user in Prisma database
  try {
    const user = await prisma.user.create({
      data: {
        id: authData.user.id, // Use the same UUID from Supabase Auth
        email,
        username,
        passwordHash: '', // Password is managed by Supabase Auth
        fullName,
        roleId,
        phone,
        status: 'ACTIVE'
      },
      include: {
        role: true
      }
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      },
      authUser: authData.user
    }
  } catch (error: any) {
    // Rollback: delete the auth user if database creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new Error(`Database error: ${error.message}`)
  }
}

/**
 * Login user with email/password
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw new Error(`Login failed: ${error.message}`)
  }

  if (!data.user || !data.session) {
    throw new Error('Login failed: No user or session returned')
  }

  // Get user details from Prisma
  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: { role: true }
  })

  if (!user) {
    throw new Error('User not found in database')
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('User account is not active')
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  return {
    session: data.session,
    user: {
      id: user.id,
      email: user.email!,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    }
  }
}

/**
 * Get user from access token
 */
export async function getUserFromToken(token: string): Promise<AuthUser> {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  // Get full user details from Prisma
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { role: true }
  })

  if (!dbUser) {
    throw new Error('User not found in database')
  }

  if (dbUser.status !== 'ACTIVE') {
    throw new Error('User account is not active')
  }

  return {
    id: dbUser.id,
    email: dbUser.email!,
    username: dbUser.username,
    fullName: dbUser.fullName,
    role: dbUser.role
  }
}

/**
 * Extract and verify token from request headers
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthUser> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7)
  return getUserFromToken(token)
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshToken: string) {
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken
  })

  if (error) {
    throw new Error(`Token refresh failed: ${error.message}`)
  }

  return data.session
}

/**
 * Logout user (revoke refresh token)
 */
export async function logoutUser(token: string) {
  const { error } = await supabaseAdmin.auth.admin.signOut(token)
  
  if (error) {
    throw new Error(`Logout failed: ${error.message}`)
  }
  
  return { success: true }
}

/**
 * Check if user has permission
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.role.permissions.includes(permission) || user.role.permissions.includes('*')
}

/**
 * Require specific permission
 */
export function requirePermission(user: AuthUser, permission: string) {
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission denied: ${permission} required`)
  }
}
