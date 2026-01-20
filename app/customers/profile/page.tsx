'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import ProfileTabs, { ProfileTab } from '@/src/components/profile/profile-tabs';
import Table, { TableColumn } from '@/src/components/table/table';

// Mock data types
interface CustomerInfo {
  id: number;
  name: string;
  type: 'Company' | 'Individual';
  nicNumber?: string;
  vatTin?: string;
  address: string;
  phone: string;
  email: string;
  creditStatus: 'Active' | 'Locked';
  totalOutstanding: number;
}

interface RentalHistory {
  id: number;
  machineName: string;
  rentalDate: string;
  returnDate: string | null;
  status: 'Active' | 'Completed' | 'Cancelled';
  totalAmount: number;
}

interface Payment {
  id: number;
  machineName: string;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
}

interface DamageRecord {
  id: number;
  machineName: string;
  rentalDate: string;
  returnDate: string;
  damageDescription: string;
  repairCost: number;
  status: 'Repaired' | 'Pending';
}

// Mock data
const mockCustomerInfo: CustomerInfo = {
  id: 1,
  name: 'ABC Holdings (Pvt) Ltd',
  type: 'Company',
  vatTin: 'VAT-123456789',
  address: '123 Business Street, Colombo 05',
  phone: '+94 11 2345678',
  email: 'contact@abcholdings.lk',
  creditStatus: 'Active',
  totalOutstanding: 120000.5,
};

const mockRentalHistory: RentalHistory[] = [
  {
    id: 1,
    machineName: 'Excavator CAT 320',
    rentalDate: '2024-01-15',
    returnDate: '2024-02-15',
    status: 'Completed',
    totalAmount: 150000,
  },
  {
    id: 2,
    machineName: 'Bulldozer CAT D6',
    rentalDate: '2024-03-01',
    returnDate: null,
    status: 'Active',
    totalAmount: 200000,
  },
];

const mockPayments: Payment[] = [
  {
    id: 1,
    machineName: 'Bulldozer CAT D6',
    dueDate: '2024-04-01',
    amount: 50000,
    status: 'Pending',
  },
  {
    id: 2,
    machineName: 'Bulldozer CAT D6',
    dueDate: '2024-05-01',
    amount: 50000,
    status: 'Pending',
  },
];

const mockDamageRecords: DamageRecord[] = [
  {
    id: 1,
    machineName: 'Excavator CAT 320',
    rentalDate: '2024-01-15',
    returnDate: '2024-02-15',
    damageDescription: 'Minor scratch on hydraulic arm',
    repairCost: 5000,
    status: 'Repaired',
  },
];

const CustomerProfilePage: React.FC = () => {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleBack = () => {
    router.push('/customers/list');
  };

  // Overview Content
  const overviewContent = (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Overview</h3>
      
      <div className="space-y-4">
        {/* Customer Info */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Customer Info
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Name:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {mockCustomerInfo.name}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Type:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {mockCustomerInfo.type}
              </span>
            </div>
            {mockCustomerInfo.vatTin && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">VAT/TIN:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {mockCustomerInfo.vatTin}
                </span>
              </div>
            )}
            {mockCustomerInfo.nicNumber && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">NIC:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {mockCustomerInfo.nicNumber}
                </span>
              </div>
            )}
            <div className="md:col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Address:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {mockCustomerInfo.address}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Phone:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {mockCustomerInfo.phone}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Email:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {mockCustomerInfo.email}
              </span>
            </div>
          </div>
        </div>

        {/* Credit Status */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Credit Status
          </h4>
          <div>
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-flex items-center ${
                mockCustomerInfo.creditStatus === 'Active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              }`}
            >
              {mockCustomerInfo.creditStatus}
            </span>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Total Outstanding
          </h4>
          <div>
            <span
              className={`text-2xl font-bold ${
                mockCustomerInfo.totalOutstanding > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              Rs. {mockCustomerInfo.totalOutstanding.toLocaleString('en-LK', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Rental History Content
  const rentalHistoryColumns: TableColumn[] = [
    {
      key: 'machineName',
      label: 'Machine Name',
      sortable: true,
    },
    {
      key: 'rentalDate',
      label: 'Rental Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
    },
    {
      key: 'returnDate',
      label: 'Return Date',
      sortable: true,
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString('en-LK') : 'N/A',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => {
        const base =
          'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
        if (value === 'Active') {
          return (
            <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
              Active
            </span>
          );
        }
        if (value === 'Completed') {
          return (
            <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
              Completed
            </span>
          );
        }
        return (
          <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
            Cancelled
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-gray-900 dark:text-white">
          Rs. {value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
  ];

  const rentalHistoryContent = (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rental History</h3>
      <Table
        data={mockRentalHistory}
        columns={rentalHistoryColumns}
        itemsPerPage={10}
        searchable={false}
        filterable={false}
        emptyMessage="No rental history found."
      />
    </div>
  );

  // Payments Content
  const paymentsColumns: TableColumn[] = [
    {
      key: 'machineName',
      label: 'Machine Name',
      sortable: true,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-gray-900 dark:text-white">
          Rs. {value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => {
        const base =
          'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
        if (value === 'Paid') {
          return (
            <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
              Paid
            </span>
          );
        }
        if (value === 'Overdue') {
          return (
            <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
              Overdue
            </span>
          );
        }
        return (
          <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
            Pending
          </span>
        );
      },
    },
  ];

  const paymentsContent = (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payments</h3>
      <Table
        data={mockPayments}
        columns={paymentsColumns}
        itemsPerPage={10}
        searchable={false}
        filterable={false}
        emptyMessage="No upcoming payments found."
      />
    </div>
  );

  // Damage Records Content
  const damageRecordsColumns: TableColumn[] = [
    {
      key: 'machineName',
      label: 'Machine Name',
      sortable: true,
    },
    {
      key: 'rentalDate',
      label: 'Rental Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
    },
    {
      key: 'returnDate',
      label: 'Return Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
    },
    {
      key: 'damageDescription',
      label: 'Damage Description',
      sortable: false,
    },
    {
      key: 'repairCost',
      label: 'Repair Cost',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-red-600 dark:text-red-400">
          Rs. {value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => {
        const base =
          'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
        if (value === 'Repaired') {
          return (
            <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
              Repaired
            </span>
          );
        }
        return (
          <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
            Pending
          </span>
        );
      },
    },
  ];

  const damageRecordsContent = (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Damage Records</h3>
      <Table
        data={mockDamageRecords}
        columns={damageRecordsColumns}
        itemsPerPage={10}
        searchable={false}
        filterable={false}
        emptyMessage="No damage records found."
      />
    </div>
  );

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
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Customer Profile
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                View customer details, rental history, payments, and damage records.
              </p>
            </div>
            <button
              onClick={handleBack}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 transition-colors duration-200 font-medium"
            >
              Back
            </button>
          </div>

          {/* Profile Tabs Component */}
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            overviewContent={overviewContent}
            rentalHistoryContent={rentalHistoryContent}
            paymentsContent={paymentsContent}
            damageRecordsContent={damageRecordsContent}
            onBack={handleBack}
          />
        </div>
      </main>
    </div>
  );
};

export default CustomerProfilePage;