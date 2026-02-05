// app/transaction-log/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn } from '@/src/components/table/table';
import { Download, FileText, Filter, Calendar, User, Search } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';

type TransactionCategory = 'Inventory' | 'Rental' | 'Return' | 'Invoice' | 'Maintenance' | 'Other';
type TransactionType =
  | 'Stock In'
  | 'Stock Out'
  | 'Rental Created'
  | 'Rental Completed'
  | 'Return Processed'
  | 'Invoice Generated'
  | 'Payment Received'
  | 'Maintenance Out'
  | 'Maintenance In'
  | 'Machine Retired';

interface TransactionLog {
  id: number;
  transactionDate: string;
  transactionTime: string;
  category: TransactionCategory;
  transactionType: TransactionType;
  reference: string; // Invoice No, Gate Pass No, etc.
  description: string;
  brand?: string;
  model?: string;
  customer?: string;
  amount?: number;
  quantity?: number;
  location: string;
  performedBy: string;
  status: 'Success' | 'Pending' | 'Failed' | 'Cancelled';
  notes?: string;
}

// Mock transaction log data
const mockTransactionLogs: TransactionLog[] = [
  {
    id: 1,
    transactionDate: '2024-01-01',
    transactionTime: '10:30:00',
    category: 'Inventory',
    transactionType: 'Stock In',
    reference: 'PO-2024-001',
    description: 'Stock In: Brother XL2600i - 25 units',
    brand: 'Brother',
    model: 'XL2600i',
    quantity: 25,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Initial stock from supplier',
  },
  {
    id: 2,
    transactionDate: '2024-01-15',
    transactionTime: '14:20:00',
    category: 'Rental',
    transactionType: 'Rental Created',
    reference: 'GP-2024-001',
    description: 'Rental Created: ABC Holdings (Pvt) Ltd - 3 machines',
    brand: 'Brother',
    model: 'XL2600i',
    customer: 'ABC Holdings (Pvt) Ltd',
    quantity: 3,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Monthly rental agreement',
  },
  {
    id: 3,
    transactionDate: '2024-01-20',
    transactionTime: '09:15:00',
    category: 'Invoice',
    transactionType: 'Invoice Generated',
    reference: 'INV-2024-001',
    description: 'Invoice Generated: ABC Holdings (Pvt) Ltd',
    customer: 'ABC Holdings (Pvt) Ltd',
    amount: 17700,
    location: 'Main Office',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'VAT invoice for rental period',
  },
  {
    id: 4,
    transactionDate: '2024-01-25',
    transactionTime: '11:45:00',
    category: 'Invoice',
    transactionType: 'Payment Received',
    reference: 'RCP-2024-001',
    description: 'Payment Received: ABC Holdings (Pvt) Ltd - LKR 17,700',
    customer: 'ABC Holdings (Pvt) Ltd',
    amount: 17700,
    location: 'Main Office',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Bank transfer payment',
  },
  {
    id: 5,
    transactionDate: '2024-01-20',
    transactionTime: '15:30:00',
    category: 'Maintenance',
    transactionType: 'Maintenance Out',
    reference: 'MAINT-2024-001',
    description: 'Maintenance Out: Brother XL2600i - 2 units',
    brand: 'Brother',
    model: 'XL2600i',
    quantity: 2,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Sent for routine maintenance',
  },
  {
    id: 6,
    transactionDate: '2024-02-01',
    transactionTime: '10:00:00',
    category: 'Maintenance',
    transactionType: 'Maintenance In',
    reference: 'MAINT-2024-001',
    description: 'Maintenance In: Brother XL2600i - 2 units',
    brand: 'Brother',
    model: 'XL2600i',
    quantity: 2,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Returned from maintenance',
  },
  {
    id: 7,
    transactionDate: '2024-02-15',
    transactionTime: '13:20:00',
    category: 'Return',
    transactionType: 'Return Processed',
    reference: 'RET-2024-001',
    description: 'Return Processed: Brother XL2600i - 1 unit',
    brand: 'Brother',
    model: 'XL2600i',
    customer: 'ABC Holdings (Pvt) Ltd',
    quantity: 1,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Early return from rental',
  },
  {
    id: 8,
    transactionDate: '2024-01-01',
    transactionTime: '11:00:00',
    category: 'Inventory',
    transactionType: 'Stock In',
    reference: 'PO-2024-002',
    description: 'Stock In: Singer Heavy Duty 4423 - 15 units',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    quantity: 15,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Initial stock from supplier',
  },
  {
    id: 9,
    transactionDate: '2024-01-10',
    transactionTime: '16:00:00',
    category: 'Rental',
    transactionType: 'Rental Created',
    reference: 'GP-2024-002',
    description: 'Rental Created: XYZ Engineering - 6 machines',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    customer: 'XYZ Engineering',
    quantity: 6,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Monthly rental agreement',
  },
  {
    id: 10,
    transactionDate: '2024-01-25',
    transactionTime: '10:30:00',
    category: 'Maintenance',
    transactionType: 'Maintenance Out',
    reference: 'MAINT-2024-002',
    description: 'Maintenance Out: Singer Heavy Duty 4423 - 1 unit',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    quantity: 1,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Sent for repair',
  },
  {
    id: 11,
    transactionDate: '2024-01-01',
    transactionTime: '12:00:00',
    category: 'Inventory',
    transactionType: 'Stock In',
    reference: 'PO-2024-003',
    description: 'Stock In: Janome HD3000 - 12 units',
    brand: 'Janome',
    model: 'HD3000',
    quantity: 12,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Initial stock from supplier',
  },
  {
    id: 12,
    transactionDate: '2024-01-18',
    transactionTime: '14:00:00',
    category: 'Rental',
    transactionType: 'Rental Created',
    reference: 'GP-2024-003',
    description: 'Rental Created: John Perera - 2 machines',
    brand: 'Janome',
    model: 'HD3000',
    customer: 'John Perera',
    quantity: 2,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Monthly rental agreement',
  },
  {
    id: 13,
    transactionDate: '2024-01-20',
    transactionTime: '09:30:00',
    category: 'Invoice',
    transactionType: 'Invoice Generated',
    reference: 'INV-2024-002',
    description: 'Invoice Generated: John Perera',
    customer: 'John Perera',
    amount: 17000,
    location: 'Main Office',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Non-VAT invoice',
  },
  {
    id: 14,
    transactionDate: '2024-02-12',
    transactionTime: '11:00:00',
    category: 'Invoice',
    transactionType: 'Payment Received',
    reference: 'RCP-2024-002',
    description: 'Payment Received: John Perera - LKR 17,000',
    customer: 'John Perera',
    amount: 17000,
    location: 'Main Office',
    performedBy: 'Admin User',
    status: 'Success',
    notes: 'Cash payment',
  },
];

const TransactionLogPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleExport = () => {
    // Export functionality - can be implemented with xlsx library
    console.log('Exporting transaction log...');
    alert('Export functionality will be implemented with backend integration.');
  };

  // Table columns with date range filter enabled for transactionDate
  const columns: TableColumn[] = [
    {
      key: 'transactionDate',
      label: 'Date',
      sortable: true,
      filterable: true,
      filterType: 'dateRange', // Enable date range filtering
      render: (value: string, row: TransactionLog) => (
        <div>
          <div className="text-gray-900 dark:text-white font-medium">
            {new Date(value).toLocaleDateString('en-LK')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.transactionTime}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      filterable: true,
      render: (value: TransactionCategory) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center';
        const categoryColors: Record<TransactionCategory, string> = {
          Inventory: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          Rental: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          Return: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
          Invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
          Maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
          Other: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
        };
        return (
          <span className={`${base} ${categoryColors[value] || categoryColors.Other}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'transactionType',
      label: 'Transaction Type',
      sortable: true,
      filterable: true,
      render: (value: TransactionType) => (
        <span className="text-gray-900 dark:text-white font-medium text-sm">{value}</span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{value}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-900 dark:text-white text-sm">{value}</span>
      ),
    },
    {
      key: 'brand',
      label: 'Brand/Model',
      sortable: true,
      filterable: true,
      render: (value: string | undefined, row: TransactionLog) => (
        <div>
          {row.brand && (
            <div className="text-gray-900 dark:text-white font-medium">{row.brand}</div>
          )}
          {row.model && (
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.model}</div>
          )}
          {!row.brand && !row.model && (
            <span className="text-gray-400 dark:text-gray-500">N/A</span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      filterable: true,
      render: (value: string | undefined) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">
          {value || 'N/A'}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      filterable: false,
      render: (value: number | undefined) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {value !== undefined ? value : 'N/A'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount (LKR)',
      sortable: true,
      filterable: false,
      render: (value: number | undefined) => (
        <span className="text-gray-900 dark:text-white font-semibold">
          {value !== undefined ? value.toLocaleString('en-LK') : 'N/A'}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">{value}</span>
      ),
    },
    {
      key: 'performedBy',
      label: 'Performed By',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">{value}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (value: string) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center';
        const statusColors: Record<string, string> = {
          Success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
          Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          Cancelled: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
        };
        return (
          <span className={`${base} ${statusColors[value] || statusColors.Pending}`}>
            {value}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      {/* Top navbar */}
      <Navbar onMenuClick={handleMenuClick} />

      {/* Left sidebar */}
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      {/* Main content area */}
      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Transaction Log
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Comprehensive log of all system transactions including inventory, rentals, returns, invoices, and maintenance.
              </p>
            </div>
            <Tooltip content="Export Transaction Log">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </Tooltip>
          </div>

          {/* Transaction Log Table */}
          <Table
            data={mockTransactionLogs}
            columns={columns}
            itemsPerPage={10}
            searchable
            filterable
            emptyMessage="No transactions found matching the filters."
          />
        </div>
      </main>
    </div>
  );
};

export default TransactionLogPage;