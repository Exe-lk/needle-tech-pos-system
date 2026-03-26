'use client'

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AUTH_USER_KEY } from '@/lib/auth-constants';

// ---- Match sidebar structure for titles ----
type MenuChild = {
  label: string;
  href: string;
};

type MenuSection = {
  label: string;
  href?: string;
  children?: MenuChild[];
  adminOnly?: boolean;
};

const menuSections: MenuSection[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    label: 'Customer Management',
    children: [
      { label: 'Customer List', href: '/customers/list' },
      { label: 'Add Company', href: '/customers/add-company' },
      { label: 'Add Individual', href: '/customers/add-individual' },
      { label: 'Customer Profile', href: '/customers/profile' }, // History + Outstanding
    ],
  },
  {
    label: 'Machine Management',
    children: [
      { label: 'Machine Inventory List', href: '/machines/inventory' },
      { label: 'Machine Registration', href: '/machines/register' },
      { label: 'Machine Detail (QR Scan View)', href: '/machines/detail' },
    ],
  },
  {
    label: 'Rental & Agreement',
    children: [
      { label: 'Create Agreement', href: '/rental/create' },
      { label: 'Active Rentals', href: '/rental/active' },
      { label: 'Rental History', href: '/rental/history' },
    ],
  },
  {
    label: 'Dispatch & Gate Pass',
    href: '/dispatch',
  },
  {
    label: 'Returns Management',
    href: '/returns',
  },
  {
    label: 'Invoice & Payments',
    href: '/invoice',
  },
  {
    label: 'Outstanding Alerts',
    href: '/outstanding-alerts',
  },
  {
    label: 'Analytics (Admin Only)',
    href: '/analytics',
    adminOnly: true,
  },
  {
    label: 'User Management (Admin Only)',
    href: '/users',
    adminOnly: true,
  },
];

const isActive = (pathname: string, href: string): boolean => {
  if (!href) return false;
  if (pathname === href) return true;
  if (pathname.startsWith(href + '/')) return true;
  return false;
};

const getActiveLabels = (pathname: string): { section?: string; child?: string } => {
  for (const section of menuSections) {
    if (section.href && isActive(pathname, section.href)) {
      return { section: section.label };
    }
    if (section.children) {
      for (const child of section.children) {
        if (isActive(pathname, child.href)) {
          return { section: section.label, child: child.label };
        }
      }
    }
  }
  return {};
};

// ---- Navbar component ----
interface NavbarProps {
  className?: string;
  onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ className, onMenuClick }) => {
  const pathname = usePathname();
  const { section: activeSection, child: activeChild } = getActiveLabels(pathname || '');

  // Initialize theme state - check both localStorage and DOM
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggedUser, setLoggedUser] = useState<Record<string, any> | null>(null);

  // Only run on client after mount
  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let shouldBeDark = false;
    if (savedTheme === 'dark') {
      shouldBeDark = true;
    } else if (savedTheme === 'light') {
      shouldBeDark = false;
    } else {
      // No saved preference, use system preference
      shouldBeDark = systemPrefersDark;
    }

    // Apply theme to document
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }

    // Listen for system theme changes (only if no manual preference is set)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          setIsDarkMode(true);
        } else {
          document.documentElement.classList.remove('dark');
          setIsDarkMode(false);
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load logged-in user from localStorage (set at login)
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) {
        setLoggedUser(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setLoggedUser(parsed);
      } else {
        setLoggedUser(null);
      }
    } catch {
      setLoggedUser(null);
    }
  }, [mounted]);

  // Close profile panel with Escape
  useEffect(() => {
    if (!isProfileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isProfileOpen]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const openProfile = () => {
    setIsProfileOpen(true);
  };

  const getUserEmail = (u: Record<string, any> | null): string | null => {
    if (!u) return null;
    return (
      u.email ??
      u.user?.email ??
      u.profile?.email ??
      null
    );
  };

  const getUserRole = (u: Record<string, any> | null): string | null => {
    if (!u) return null;
    return (
      u.role?.name ??
      u.role_name ??
      u.user?.role?.name ??
      u.profile?.role?.name ??
      null
    );
  };

  const getUserName = (u: Record<string, any> | null): string | null => {
    if (!u) return null;
    return (
      u.name ??
      u.full_name ??
      u.fullName ??
      u.username ??
      u.user?.name ??
      u.user?.full_name ??
      u.user?.username ??
      null
    );
  };

  const getInitials = (nameOrEmail: string | null): string => {
    const value = (nameOrEmail ?? '').trim();
    if (!value) return 'U';
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return value.slice(0, 2).toUpperCase();
  };

  const currentPageTitle = activeChild || activeSection || 'Dashboard';

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return (
      <nav
        className={`bg-gradient-to-b from-[#F6F9FF] to-white dark:from-slate-900 dark:to-slate-950 shadow-sm border-b border-gray-200/80 dark:border-slate-800/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-40 h-[70px] w-full transition-all duration-300 ease-in-out ${className}`}
      >
        <div className="px-6 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-3.5">
              <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-slate-800/50 shadow-sm border border-gray-200/50 dark:border-slate-700/50">
                <div className="w-full h-full bg-gray-100 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                  Needle Tech
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 w-9 h-9" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={`bg-gradient-to-b from-[#F6F9FF] to-white dark:from-slate-900 dark:to-slate-950 shadow-sm border-b border-gray-200/80 dark:border-slate-800/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-40 h-[70px] w-full transition-all duration-300 ease-in-out ${className}`}
    >
      <div className="px-6 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Left side - Logo, Page Title and Mobile Menu Button */}
          <div className="flex items-center space-x-3.5">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick || toggleMobileMenu}
              className="lg:hidden group relative p-2.5 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-indigo-400 mr-1 transition-all duration-200 ease-in-out"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
              ) : (
                <Menu className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
              )}
            </button>

            {/* Logo - Increased size for better visibility */}
            <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-slate-800/50 shadow-sm border border-gray-200/50 dark:border-slate-700/50">
              <Image
                src="/logo.jpg"
                alt="Needle Technologies Logo"
                fill
                className="object-contain p-1"
                priority
                sizes="56px"
              />
            </div>

            {/* Company Name */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Needle Tech
              </h1>
            </div>
           
          </div>

          {/* Right side - Dark Mode Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={openProfile}
              className="group relative p-2.5 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-indigo-400 transition-all duration-200 ease-in-out"
              aria-label="Open profile"
            >
              <UserRound className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-indigo-400" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="group relative p-2.5 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-indigo-400 transition-all duration-200 ease-in-out"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-indigo-400" />
              ) : (
                <Moon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Profile side popup */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close profile panel"
            onClick={() => setIsProfileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="User profile"
            className="absolute right-0 top-0 h-full w-[360px] max-w-[92vw] bg-white dark:bg-slate-950 border-l border-gray-200/80 dark:border-slate-800/80 shadow-2xl"
          >
            <div className="h-[70px] px-5 flex items-center justify-between border-b border-gray-200/80 dark:border-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {getInitials(getUserName(loggedUser) || getUserEmail(loggedUser))}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {getUserName(loggedUser) || 'User Profile'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {getUserRole(loggedUser) || '—'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="group relative p-2.5 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-indigo-400 transition-all duration-200 ease-in-out"
                aria-label="Close"
              >
                <X className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-gray-200/70 dark:border-slate-800/70 bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900/40 p-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Email</div>
                    <div className="mt-0.5 text-sm text-gray-900 dark:text-white break-all">
                      {getUserEmail(loggedUser) || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Role</div>
                    <div className="mt-0.5 text-sm text-gray-900 dark:text-white">
                      {getUserRole(loggedUser) || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400">User ID</div>
                    <div className="mt-0.5 text-sm text-gray-900 dark:text-white break-all">
                      {(loggedUser as any)?.id ?? (loggedUser as any)?.user_id ?? (loggedUser as any)?.user?.id ?? '—'}
                    </div>
                  </div>
                </div>
              </div>

              {!loggedUser && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  No user details found in this browser session. Please sign in again if this is unexpected.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-gradient-to-b from-white to-[#F6F9FF] dark:from-slate-900 dark:to-slate-950 border-t border-gray-200/80 dark:border-slate-800/80 shadow-xl backdrop-blur-sm">
          <div className="px-4 py-3 space-y-3">
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openProfile();
                }}
                className="group relative flex items-center w-full px-3 py-2.5 text-base font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50 hover:shadow-sm rounded-xl transition-all duration-200 ease-in-out"
              >
                <UserRound className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-indigo-400" />
                Profile
              </button>
              <button
                onClick={toggleDarkMode}
                className="group relative flex items-center w-full px-3 py-2.5 text-base font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50 hover:shadow-sm rounded-xl transition-all duration-200 ease-in-out"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-indigo-400" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-indigo-400" />
                    Dark Mode
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;