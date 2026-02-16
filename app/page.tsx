'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const AUTH_ACCESS_TOKEN_KEY = 'needletech_access_token';
const AUTH_REFRESH_TOKEN_KEY = 'needletech_refresh_token';
const AUTH_USER_KEY = 'needletech_user';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (accessToken) {
        localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
      }
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
      }
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-slate-900">
      <main className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-8 flex flex-col items-center">
            <div className="relative mb-4 h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600">
              <Image
                src="/logo.jpg"
                alt="NeedleTech"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Needle Technologies
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Login to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter your email"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                disabled={isSubmitting}
              />
            </div>

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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 dark:text-gray-400 dark:hover:text-gray-300 dark:focus:ring-slate-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <LogIn className="h-4 w-4" />
              {isSubmitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
