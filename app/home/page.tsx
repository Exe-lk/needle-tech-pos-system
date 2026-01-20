'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';

const HomePage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    // TODO: add real logout logic here
    console.log('Logout clicked');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      {/* Top navbar */}
      <Navbar onMenuClick={handleMenuClick} />

      {/* Left sidebar */}
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
      />

      {/* Main content area */}
      <main className="pt-[70px] lg:ml-[300px] p-6">
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Home
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This is a temporary home page to test the navbar and sidebar layout.
          </p>
        </div>
      </main>
    </div>
  );
};

export default HomePage;