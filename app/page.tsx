'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both user name and password.');
      return;
    }
    setIsSubmitting(true);
    // Replace with your actual auth API call
    try {
      // Example: await signIn(username, password);
      // For now, redirect to dashboard on submit
      router.push('/dashboard');
    } catch {
      setError('Invalid user name or password.');
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
              Sign in to your account
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
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                User name
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your user name"
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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                disabled={isSubmitting}
              />
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
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Point of Sale System for NeedleTech
        </p>
      </main>
    </div>
  );
}
