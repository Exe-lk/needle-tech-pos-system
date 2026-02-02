'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import { Printer } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import {
  LetterheadDocument,
  LETTERHEAD_COMPANY_INFO,
} from '@/src/components/letterhead/letterhead-document';

const LetterHeadPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handlePrint = () => {
    window.print();
  };

  /** Letterhead preview - Logo top-left, tagline right, empty content area */
  const renderLetterheadPreview = () => (
    <div className="bg-white p-6 sm:p-8 lg:p-10 max-w-[210mm] mx-auto shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-0 print:rounded-none print:p-8">
      <LetterheadDocument footerStyle="simple" documentTitle={undefined} className="print:p-0">
        {/* Empty content area - placeholder for document body */}
        <div className="min-h-[120mm] py-8 border-2 border-dashed border-gray-300 rounded-lg print:min-h-[140mm] print:border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm print:text-gray-500">
            Document content area — Letterhead preview
          </p>
        </div>
      </LetterheadDocument>
    </div>
  );

  /** Print-only letterhead - clean A4, no dashed border, no placeholder text */
  const renderPrintLetterhead = () => (
    <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col">
      <LetterheadDocument footerStyle="simple" documentTitle={undefined}>
        <div className="flex-1 min-h-[140mm]" />
      </LetterheadDocument>
    </div>
  );

  return (
    <>
      {/* Print-only letterhead - hidden on screen, visible when printing */}
      <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0 print:m-0">
        {renderPrintLetterhead()}
      </div>

      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 print:hidden">
        <Navbar onMenuClick={handleMenuClick} />
        <Sidebar
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={handleMobileSidebarClose}
          onExpandedChange={setIsSidebarExpanded}
        />

        <main
          className={`pt-24 sm:pt-28 lg:pt-32 px-3 sm:px-4 md:px-6 pb-6 transition-all duration-300 ${
            isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
          }`}
        >
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Letterhead
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                  Needle Technologies company letterhead — matches Tax Invoice, Normal Invoice, Hiring Machine Agreement, and Gatepass documents.
                </p>
              </div>
              <div className="flex justify-start sm:justify-end">
                <Tooltip content="Print letterhead">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Letterhead preview */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700/50 overflow-hidden">
              {renderLetterheadPreview()}
            </div>

            {/* Company info reference */}
            <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1 p-4 bg-gray-50 dark:bg-slate-800/30 rounded-lg">
              <p className="font-medium text-gray-700 dark:text-slate-300">Letterhead details</p>
              <p>{LETTERHEAD_COMPANY_INFO.fullName}</p>
              <p>{LETTERHEAD_COMPANY_INFO.address}</p>
              <p>Tel: {LETTERHEAD_COMPANY_INFO.telephone.join(', ')} | Fax: {LETTERHEAD_COMPANY_INFO.fax} | Hotline: {LETTERHEAD_COMPANY_INFO.hotline}</p>
              <p>Email: {LETTERHEAD_COMPANY_INFO.email}</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default LetterHeadPage;
