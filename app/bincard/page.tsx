// app/bincard/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, TrendingUp, TrendingDown, Package, Calendar, Filter } from 'lucide-react';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';
type TransactionType = 'Stock In' | 'Stock Out' | 'Rental Out' | 'Return In' | 'Maintenance Out' | 'Maintenance In' | 'Retired';

interface BincardEntry {
  id: number;
  date: string;
  brand: string;
  model: string;
  type: MachineType;
  transactionType: TransactionType;
  reference: string; // Invoice No, Gate Pass No, etc.
  in: number;
  out: number;
  balance: number;
  location: string;
  performedBy: string;
  notes?: string;
}

interface BincardSummary {
  brand: string;
  model: string;
  type: MachineType;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  lastTransactionDate: string;
}

// Mock bincard data
const mockBincardEntries: BincardEntry[] = [
  {
    id: 1,
    date: '2024-01-01',
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Stock In',
    reference: 'PO-2024-001',
    in: 25,
    out: 0,
    balance: 25,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Initial stock from supplier',
  },
  {
    id: 2,
    date: '2024-01-15',
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Rental Out',
    reference: 'GP-2024-001',
    in: 0,
    out: 3,
    balance: 22,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Rented to ABC Holdings',
  },
  {
    id: 3,
    date: '2024-01-20',
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Maintenance Out',
    reference: 'MAINT-2024-001',
    in: 0,
    out: 2,
    balance: 20,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Sent for maintenance',
  },
  {
    id: 4,
    date: '2024-02-01',
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Maintenance In',
    reference: 'MAINT-2024-001',
    in: 2,
    out: 0,
    balance: 22,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Returned from maintenance',
  },
  {
    id: 5,
    date: '2024-02-15',
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Return In',
    reference: 'RET-2024-001',
    in: 1,
    out: 0,
    balance: 23,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Returned from rental',
  },
  {
    id: 6,
    date: '2024-01-01',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    type: 'Industrial',
    transactionType: 'Stock In',
    reference: 'PO-2024-002',
    in: 15,
    out: 0,
    balance: 15,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Initial stock from supplier',
  },
  {
    id: 7,
    date: '2024-01-10',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    type: 'Industrial',
    transactionType: 'Rental Out',
    reference: 'GP-2024-002',
    in: 0,
    out: 6,
    balance: 9,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Rented to XYZ Engineering',
  },
  {
    id: 8,
    date: '2024-01-25',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    type: 'Industrial',
    transactionType: 'Maintenance Out',
    reference: 'MAINT-2024-002',
    in: 0,
    out: 1,
    balance: 8,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Sent for maintenance',
  },
  {
    id: 9,
    date: '2024-01-01',
    brand: 'Janome',
    model: 'HD3000',
    type: 'Domestic',
    transactionType: 'Stock In',
    reference: 'PO-2024-003',
    in: 12,
    out: 0,
    balance: 12,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Initial stock from supplier',
  },
  {
    id: 10,
    date: '2024-01-18',
    brand: 'Janome',
    model: 'HD3000',
    type: 'Domestic',
    transactionType: 'Rental Out',
    reference: 'GP-2024-003',
    in: 0,
    out: 2,
    balance: 10,
    location: 'Main Warehouse',
    performedBy: 'Admin User',
    notes: 'Rented to John Perera',
  },
];

const BincardPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BincardSummary | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleViewDetails = (item: BincardSummary) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedItem(null);
  };

  // Get unique brands and models
  const uniqueBrands = useMemo(() => {
    return [...new Set(mockBincardEntries.map((e) => e.brand))].sort();
  }, []);

  const uniqueModels = useMemo(() => {
    return [...new Set(mockBincardEntries.map((e) => e.model))].sort();
  }, []);

  // Calculate bincard summary
  const bincardSummary = useMemo(() => {
    const summaryMap = new Map<string, BincardSummary>();

    mockBincardEntries.forEach((entry) => {
      const key = `${entry.brand}-${entry.model}`;
      
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          brand: entry.brand,
          model: entry.model,
          type: entry.type,
          openingBalance: 0,
          totalIn: 0,
          totalOut: 0,
          closingBalance: 0,
          lastTransactionDate: entry.date,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.totalIn += entry.in;
      summary.totalOut += entry.out;
      summary.closingBalance = entry.balance;
      if (new Date(entry.date) > new Date(summary.lastTransactionDate)) {
        summary.lastTransactionDate = entry.date;
      }
    });

    // Calculate opening balance (closing - totalIn + totalOut)
    summaryMap.forEach((summary) => {
      summary.openingBalance = summary.closingBalance - summary.totalIn + summary.totalOut;
    });

    return Array.from(summaryMap.values());
  }, []);

  // Filter summary based on filters
  const filteredSummary = useMemo(() => {
    let filtered = [...bincardSummary];

    if (selectedBrand) {
      filtered = filtered.filter((item) => item.brand === selectedBrand);
    }

    if (selectedModel) {
      filtered = filtered.filter((item) => item.model === selectedModel);
    }

    return filtered;
  }, [bincardSummary, selectedBrand, selectedModel]);

  // Get detailed entries for selected item
  const getItemEntries = (item: BincardSummary | null): BincardEntry[] => {
    if (!item) return [];
    
    let entries = mockBincardEntries.filter(
      (e) => e.brand === item.brand && e.model === item.model
    );

    if (dateRange.from) {
      entries = entries.filter((e) => e.date >= dateRange.from);
    }

    if (dateRange.to) {
      entries = entries.filter((e) => e.date <= dateRange.to);
    }

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Table columns for bincard summary
  const summaryColumns: TableColumn[] = [
    {
      key: 'brand',
      label: 'Brand',
      sortable: true,
      filterable: true,
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true,
      filterable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: MachineType) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
        const typeColors: Record<MachineType, string> = {
          Industrial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          Domestic: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          Embroidery: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
          Overlock: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
          Buttonhole: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
          Other: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
        };
        return (
          <span className={`${base} ${typeColors[value] || typeColors.Other}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'openingBalance',
      label: 'Opening Balance',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'totalIn',
      label: 'Total In',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-medium text-green-600 dark:text-green-400 flex items-center">
          <TrendingUp className="w-4 h-4 mr-1" />
          {value}
        </span>
      ),
    },
    {
      key: 'totalOut',
      label: 'Total Out',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-medium text-red-600 dark:text-red-400 flex items-center">
          <TrendingDown className="w-4 h-4 mr-1" />
          {value}
        </span>
      ),
    },
    {
      key: 'closingBalance',
      label: 'Closing Balance',
      sortable: true,
      filterable: false,
      render: (value: number, row: BincardSummary) => {
        const percentage = row.openingBalance > 0 ? (value / row.openingBalance) * 100 : 0;
        const colorClass =
          percentage >= 80
            ? 'text-green-600 dark:text-green-400'
            : percentage >= 50
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400';
        return (
          <span className={`font-bold text-lg ${colorClass}`}>{value}</span>
        );
      },
    },
    {
      key: 'lastTransactionDate',
      label: 'Last Transaction',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(value).toLocaleDateString('en-LK')}
        </span>
      ),
    },
  ];

  // Table columns for detailed entries
  const entryColumns: TableColumn[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {new Date(value).toLocaleDateString('en-LK')}
        </span>
      ),
    },
    {
      key: 'transactionType',
      label: 'Transaction Type',
      sortable: true,
      filterable: true,
      render: (value: TransactionType) => {
        const isIn = value.includes('In') || value === 'Return In' || value === 'Maintenance In';
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center';
        const colors = isIn
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        return (
          <span className={`${base} ${colors}`}>
            {isIn ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {value}
          </span>
        );
      },
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
      key: 'in',
      label: 'In',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          {value > 0 ? value : '-'}
        </span>
      ),
    },
    {
      key: 'out',
      label: 'Out',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {value > 0 ? value : '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-bold text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      filterable: true,
    },
    {
      key: 'performedBy',
      label: 'Performed By',
      sortable: true,
      filterable: true,
    },
    {
      key: 'notes',
      label: 'Notes',
      sortable: false,
      filterable: false,
      render: (value: string | undefined) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {value || 'N/A'}
        </span>
      ),
    },
  ];

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewDetails,
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
  ];

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalOpening = filteredSummary.reduce((sum, item) => sum + item.openingBalance, 0);
    const totalIn = filteredSummary.reduce((sum, item) => sum + item.totalIn, 0);
    const totalOut = filteredSummary.reduce((sum, item) => sum + item.totalOut, 0);
    const totalClosing = filteredSummary.reduce((sum, item) => sum + item.closingBalance, 0);

    return { totalOpening, totalIn, totalOut, totalClosing };
  }, [filteredSummary]);

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
      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Bincard Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track stock movements and balances for each machine brand and model.
              </p>
            </div>
          </div>

          

          

          {/* Bincard Summary Table */}
          <Table
            data={filteredSummary}
            columns={summaryColumns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            emptyMessage="No bincard data found."
          />
        </div>
      </main>

      {/* View Details Modal */}
      {isViewModalOpen && selectedItem && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Bincard Details
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedItem.brand} {selectedItem.model}
                </p>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              

              {/* Detailed Entries Table */}
              <Table
                data={getItemEntries(selectedItem)}
                columns={entryColumns}
                itemsPerPage={20}
                searchable
                filterable
                emptyMessage="No transaction entries found for this item."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BincardPage;