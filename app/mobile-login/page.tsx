'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY, AUTH_USER_KEY } from '@/lib/auth-constants';

const MOBILE_ROUTES_PRIORITY = ['/gatepass-qr-page', '/machine-assign-page', '/return-qr-page'] as const;

type PermissionsResponse = {
  permissions: string[];
  accessibleRoutes: string[];
  user?: { role?: { name?: string } };
};

export default function MobileLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickDefaultMobileRoute = (accessibleRoutes: string[]): string | null => {
    for (const r of MOBILE_ROUTES_PRIORITY) {
      if (accessibleRoutes.includes(r)) return r;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.message || 'Invalid email or password.');
        return;
      }

      if (json?.status !== 'success' || !json?.data) {
        setError(json?.message || 'Login failed.');
        return;
      }

      const { accessToken, refreshToken, user } = json.data;

      if (!accessToken) {
        setError('Login succeeded but access token is missing. Please contact support.');
        return;
      }

      // Validate access based on permissions (not role name)
      const permRes = await fetch('/api/v1/auth/permissions', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const permJson = (await permRes.json()) as { status?: string; data?: PermissionsResponse; message?: string };

      if (!permRes.ok || permJson?.status !== 'success' || !permJson?.data) {
        setError(permJson?.message || 'Failed to verify permissions. Please try again.');
        return;
      }

      const defaultRoute = pickDefaultMobileRoute(permJson.data.accessibleRoutes || []);
      if (!defaultRoute) {
        const roleName = permJson.data.user?.role?.name || user?.role?.name || 'Unknown';
        setError(`Access denied. The role "${roleName}" does not have access to any mobile features.`);
        return;
      }

      // Store authentication data
      localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
      }
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }

      // Redirect to role-specific default route
      router.push(defaultRoute);
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 py-8 font-sans dark:from-slate-900 dark:to-slate-800">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center sm:mb-8">
            <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-xl bg-white p-2 shadow-md dark:bg-slate-700 sm:h-24 sm:w-24">
              <div className="relative h-full w-full">
                <Image
                  src="/logo.jpg"
                  alt="NeedleTech Logo"
                  fill
                  sizes="(max-width: 640px) 80px, 96px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Needle Technologies
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Mobile Access Portal
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                <p className="font-medium">Error</p>
                <p className="mt-1 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="your.email@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-slate-500 dark:focus:ring-slate-500/20 dark:disabled:bg-slate-800"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-slate-500 dark:focus:ring-slate-500/20 dark:disabled:bg-slate-800"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:text-gray-400 dark:hover:bg-slate-600 dark:hover:text-gray-300 dark:focus:ring-slate-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-100 dark:focus:ring-offset-slate-800 sm:h-12"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-900 dark:border-t-transparent" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>Secure mobile access for authorized personnel only</p>
          </div>
        </div>
      </main>
    </div>
  );
}