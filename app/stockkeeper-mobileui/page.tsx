'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Moon, Package, RotateCcw, Scan, Sun } from 'lucide-react';
import { authFetch, clearAuth } from '@/lib/auth-client';

export default function StockkeeperMobileUiPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMounted(true);
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (savedTheme !== 'light' && systemPrefersDark);
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch(
        '/api/v1/auth/logout',
        { method: 'POST' },
        { skipRefresh: true }
      );
    } catch {
      // best-effort
    } finally {
      clearAuth();
      router.replace('/mobile-login');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors flex flex-col">
      <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/50 px-4 py-4 shrink-0">
        <div className="max-w-md mx-auto flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden />
              Stockkeeper
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Assign machines or manage returns
            </p>
          </div>
          {mounted && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-8 pb-10">
        <div className="max-w-md mx-auto space-y-4">
          <Link
            href="/machine-assign-page"
            className="flex w-full min-h-[56px] items-center justify-center gap-3 rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-5 py-4 text-base font-semibold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all hover:bg-gray-50 dark:hover:bg-slate-800 active:scale-[0.98] touch-manipulation"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 dark:bg-blue-500/15">
              <Scan className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden />
            </span>
            <span className="flex-1 text-left">Assign machines</span>
          </Link>

          <Link
            href="/return-qr-page"
            className="flex w-full min-h-[56px] items-center justify-center gap-3 rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-5 py-4 text-base font-semibold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all hover:bg-gray-50 dark:hover:bg-slate-800 active:scale-[0.98] touch-manipulation"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15">
              <RotateCcw className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </span>
            <span className="flex-1 text-left">Return management</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
