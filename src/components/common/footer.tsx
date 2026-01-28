// src/components/common/footer.tsx
'use client';

import React from 'react';
import { ExternalLink, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  className?: string;
  hasSidebar?: boolean;
  isSidebarExpanded?: boolean;
}

const Footer: React.FC<FooterProps> = ({ 
  className = '', 
  hasSidebar = true,
  isSidebarExpanded = true 
}) => {
  const currentYear = new Date().getFullYear();
  
  // Calculate footer positioning based on sidebar state
  const footerLeftMargin = hasSidebar 
    ? (isSidebarExpanded ? 'lg:ml-[280px]' : 'lg:ml-[72px]')
    : '';

  return (
    <footer
      className={`bg-gradient-to-b from-white to-[#F6F9FF] dark:from-slate-950 dark:to-slate-900 border-t border-gray-200/80 dark:border-slate-800/80 backdrop-blur-sm transition-all duration-300 ease-in-out ${footerLeftMargin} ${className}`}
    >
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Company Info Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  NeedleTech
                </h3>
                <span className="text-xs px-2 py-1 rounded-md bg-blue-100 dark:bg-indigo-900/30 text-blue-700 dark:text-indigo-300 font-semibold">
                  POS System
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                Comprehensive Point of Sale system for managing inventory, 
                rentals, customers, and transactions efficiently.
              </p>
            </div>

            {/* Quick Links Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Quick Links
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/dashboard"
                    className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200 inline-flex items-center group"
                  >
                    Dashboard
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
                <li>
                  <a
                    href="/inventory"
                    className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200 inline-flex items-center group"
                  >
                    Inventory
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
                <li>
                  <a
                    href="/customers"
                    className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200 inline-flex items-center group"
                  >
                    Customers
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
                <li>
                  <a
                    href="/analytics"
                    className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200 inline-flex items-center group"
                  >
                    Analytics
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact & Branding Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Contact & Support
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <Mail className="h-4 w-4 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                  <a
                    href="mailto:support@exe.lk"
                    className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200"
                  >
                    support@exe.lk
                  </a>
                </li>
                <li className="flex items-start space-x-3">
                  <Phone className="h-4 w-4 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                  <a
                    href="tel:+94112345678"
                    className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200"
                  >
                    +94 11 234 5678
                  </a>
                </li>
                <li className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Colombo, Sri Lanka
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200/60 dark:border-slate-800/60 my-6"></div>

          {/* Bottom Section with EXE.lk Branding */}
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-600 dark:text-slate-400">
              <span>© {currentYear} NeedleTech POS System. All rights reserved.</span>
              <div className="flex items-center space-x-1">
                <span>Powered by</span>
                <a
                  href="https://exe.lk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-600 dark:text-indigo-400 hover:text-blue-700 dark:hover:text-indigo-300 transition-colors duration-200 inline-flex items-center group"
                >
                  EXE.lk
                  <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
                </a>
              </div>
            </div>

            {/* Social Links / Additional Info */}
            <div className="flex items-center space-x-6">
              <a
                href="https://exe.lk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors duration-200 inline-flex items-center group"
              >
                Visit EXE.lk
                <ExternalLink className="ml-1.5 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;