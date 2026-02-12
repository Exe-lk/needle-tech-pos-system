// app/bincard/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, TrendingUp, TrendingDown } from 'lucide-react';
import { AUTH_ACCESS_TOKEN_KEY } from '@/lib/auth-constants';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';
type TransactionType = 'Stock In' | 'Stock Out' | 'Rental Out' | 'Return In' | 'Maintenance Out' | 'Maintenance In' | 'Retired';

interface BincardEntry {
  id: string;
  date: string;
  brand: string;
  model: string;
  type: MachineType;
  transactionType: TransactionType;
  reference: string;
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

const API_BASE_URL = '/api/v1';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_ACCESS_TOKEN_KEY) : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

function normalizeMachineType(value: string): MachineType {
  const normalized = value?.trim() || '';
  const map: Record<string, MachineType> = {
    industrial: 'Industrial',
    domestic: 'Domestic',
    embroidery: 'Embroidery',
    overlock: 'Overlock',
    buttonhole: 'Buttonhole',
    other: 'Other',
  };
  return (map[normalized.toLowerCase()] as MachineType) || 'Other';
}

const BincardPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BincardSummary | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [bincardSummary, setBincardSummary] = useState<BincardSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [modalEntries, setModalEntries] = useState<BincardEntry[]>([]);
  const [modalEntriesLoading, setModalEntriesLoading] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set('dateFrom', dateRange.from);
      if (dateRange.to) params.set('dateTo', dateRange.to);
      const qs = params.toString();
      const url = `${API_BASE_URL}/bincard/summary${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch bincard summary');
      const json = await res.json();
      const raw: any[] = json.data?.summary ?? [];
      const mapped: BincardSummary[] = raw.map((s: any) => ({
        brand: s.brand ?? '',
        model: s.model ?? '',
        type: normalizeMachineType(s.type ?? ''),
        openingBalance: Number(s.openingBalance) ?? 0,
        totalIn: Number(s.totalIn) ?? 0,
        totalOut: Number(s.totalOut) ?? 0,
        closingBalance: Number(s.closingBalance) ?? 0,
        lastTransactionDate: s.lastTransactionDate
          ? new Date(s.lastTransactionDate).toISOString().slice(0, 10)
          : '',
      }));
      setBincardSummary(mapped);
    } catch (e) {
      console.error('Error fetching bincard summary:', e);
      setBincardSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleViewDetails = (item: BincardSummary) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
    setModalEntries([]);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedItem(null);
    setModalEntries([]);
  };

  useEffect(() => {
    if (!isViewModalOpen || !selectedItem) return;
    let cancelled = false;
    setModalEntriesLoading(true);
    const params = new URLSearchParams();
    params.set('brand', selectedItem.brand);
    params.set('model', selectedItem.model);
    params.set('limit', '500');
    params.set('sortBy', 'date');
    params.set('sortOrder', 'asc');
    if (dateRange.from) params.set('dateFrom', dateRange.from);
    if (dateRange.to) params.set('dateTo', dateRange.to);
    fetch(`${API_BASE_URL}/bincard/entries?${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch entries');
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const raw: any[] = json.data?.items?.entries ?? [];
        const mapped: BincardEntry[] = raw.map((e: any) => ({
          id: String(e.id),
          date: e.date ? new Date(e.date).toISOString().slice(0, 10) : '',
          brand: e.brand ?? '',
          model: e.model ?? '',
          type: normalizeMachineType(e.type ?? ''),
          transactionType: (e.transactionType ?? '') as TransactionType,
          reference: e.reference ?? '',
          in: Number(e.in) ?? 0,
          out: Number(e.out) ?? 0,
          balance: Number(e.balance) ?? 0,
          location: e.location ?? '',
          performedBy: e.performedBy ?? '',
          notes: e.notes ?? undefined,
        }));
        setModalEntries(mapped);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error fetching bincard entries:', err);
          setModalEntries([]);
        }
      })
      .finally(() => {
        if (!cancelled) setModalEntriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isViewModalOpen, selectedItem?.brand, selectedItem?.model, dateRange.from, dateRange.to]);

  const uniqueBrands = useMemo(() => [...new Set(bincardSummary.map((s) => s.brand))].sort(), [bincardSummary]);
  const uniqueModels = useMemo(() => [...new Set(bincardSummary.map((s) => s.model))].sort(), [bincardSummary]);

  const filteredSummary = useMemo(() => {
    let filtered = [...bincardSummary];
    if (selectedBrand) filtered = filtered.filter((item) => item.brand === selectedBrand);
    if (selectedModel) filtered = filtered.filter((item) => item.model === selectedModel);
    return filtered;
  }, [bincardSummary, selectedBrand, selectedModel]);

  const getItemEntries = useCallback((item: BincardSummary | null): BincardEntry[] => {
    if (!item || !selectedItem) return modalEntries;
    if (item.brand !== selectedItem.brand || item.model !== selectedItem.model) return [];
    return modalEntries;
  }, [selectedItem, modalEntries]);

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
      tooltip: 'View Details',
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
  <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
      {/* Modal Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <div className="min-w-0 flex-1 pr-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
            Bincard Details
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
            {selectedItem.brand} {selectedItem.model}
          </p>
        </div>
        <button
          onClick={handleCloseViewModal}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Content - Scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {/* Detailed Entries Table */}
          <Table
            data={getItemEntries(selectedItem)}
            columns={entryColumns}
            itemsPerPage={20}
            searchable
            filterable
            emptyMessage="No transaction entries found for this item."
            maxHeight="none"
            className="h-full"
          />
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default BincardPage;