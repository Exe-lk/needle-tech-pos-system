'use client'

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { APP_VERSION } from '@/src/utils/version';

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
  const [mounted, setMounted] = useState(false);

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

  const currentPageTitle = activeChild || activeSection || 'Dashboard';

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return (
      <nav
        className={`bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 fixed top-0 left-0 right-0 z-40 h-[70px] w-full ${className}`}
      >
        <div className="px-6 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight leading-tight">
                  NeedleTech POS
                </h1>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  V {APP_VERSION}
                </span>
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
      className={`bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 fixed top-0 left-0 right-0 z-40 h-[70px] w-full ${className}`}
    >
      <div className="px-6 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Left side - Logo, Page Title and Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick || toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-indigo-500 mr-1 transition-colors duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Project Name + Current Page */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight leading-tight">
                NeedleTech POS
              </h1>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                V {APP_VERSION}
              </span>
            </div>
           
          </div>

          {/* Right side - Dark Mode Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-lg">
          <div className="px-4 py-3 space-y-3">
            <div className="pt-2">
              <button
                onClick={toggleDarkMode}
                className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-colors duration-200"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="h-5 w-5 mr-3" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-5 w-5 mr-3" />
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