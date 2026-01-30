'use client';

import React from 'react';
import { useSidebar } from '@/src/contexts/SidebarContext';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  const { isSidebarExpanded } = useSidebar();
  const footerLeftMargin = isSidebarExpanded ? 'lg:ml-[280px]' : 'lg:ml-[72px]';

  return (
    <footer
      className={`bg-white dark:bg-slate-950 border-t border-gray-200/80 dark:border-slate-800/80 transition-all duration-300 ${footerLeftMargin} ${className}`}
    >
      <div className="px-4 py-4 max-w-7xl mx-auto">
        <div className="flex justify-center items-center text-sm text-gray-600 dark:text-slate-400">
          <span>
            © {currentYear} Powered by{' '}
            <a
              href="https://exe.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-indigo-400 transition-colors"
            >
              EXE.lk
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;