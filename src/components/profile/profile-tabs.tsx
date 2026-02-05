'use client';

import React, { useState, ReactNode } from 'react';

export type ProfileTab = 'overview' | 'rental-history' | 'payments' | 'damage-records';

export interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  overviewContent: ReactNode;
  rentalHistoryContent: ReactNode;
  paymentsContent: ReactNode;
  damageRecordsContent: ReactNode;
  onBack?: () => void;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  overviewContent,
  rentalHistoryContent,
  paymentsContent,
  damageRecordsContent,
  onBack,
}) => {
  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'rental-history', label: 'Rental History' },
    { key: 'payments', label: 'Payments' },
    { key: 'damage-records', label: 'Damage Records' },
  ];

  const getContent = () => {
    switch (activeTab) {
      case 'overview':
        return overviewContent;
      case 'rental-history':
        return rentalHistoryContent;
      case 'payments':
        return paymentsContent;
      case 'damage-records':
        return damageRecordsContent;
      default:
        return overviewContent;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel - Navigation */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-2 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 dark:bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          {getContent()}
        </div>
      </div>

      {/* Back Button */}
      {onBack && (
        <div className="w-full lg:w-64 flex-shrink-0 lg:hidden mt-4">
          <button
            onClick={onBack}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200 font-medium"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileTabs;