// app/transaction-log/page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn } from '@/src/components/table/table';
import { Download, Filter, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { AUTH_ACCESS_TOKEN_KEY } from '@/lib/auth-constants';

// Align with API response and Prisma enums (API returns title-case; filters sent uppercase)
type TransactionCategory = 'Inventory' | 'Rental' | 'Return' | 'Invoice' | 'Maintenance' | 'Other';
type TransactionType = string;
type TransactionStatus = 'Success' | 'Pending' | 'Failed' | 'Cancelled';

interface TransactionLog {
  id: string;
  transactionDate: string;
  transactionTime: string;
  category: TransactionCategory;
  transactionType: TransactionType;
  reference: string;
  description: string;
  brand?: string | null;
  model?: string | null;
  customer?: string | null;
  amount?: number | null;
  quantity?: number | null;
  location: string;
  performedBy: string;
  status: TransactionStatus;
  notes?: string | null;
}

interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const API_BASE_URL = '/api/v1';

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'RETURN', label: 'Return' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SORT_BY_OPTIONS: { value: string; label: string }[] = [
  { value: 'transactionDate', label: 'Date' },
  { value: 'category', label: 'Category' },
  { value: 'transactionType', label: 'Transaction Type' },
  { value: 'reference', label: 'Reference' },
  { value: 'status', label: 'Status' },
  { value: 'performedBy', label: 'Performed By' },
];

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_ACCESS_TOKEN_KEY) : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const TransactionLogPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Server-side state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('transactionDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalItems: 0,
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const buildParams = useCallback(
    (forExport = false) => {
      const params = new URLSearchParams();
      if (!forExport) {
        params.set('page', String(page));
        params.set('limit', String(limit));
      }
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (transactionType) params.set('transactionType', transactionType);
      if (status) params.set('status', status);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      return params;
    },
    [page, limit, sortBy, sortOrder, search, category, transactionType, status, dateFrom, dateTo]
  );

  const fetchTransactionLogs = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = buildParams(false);
      const res = await fetch(`${API_BASE_URL}/transaction-log?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to fetch transaction logs');
      }

      const raw = json?.data?.items;
      const list = Array.isArray(raw) ? raw : raw?.transactions ?? [];
      setTransactions(list);

      const meta = json?.data?.pagination;
      if (meta) {
        setPagination({
          totalItems: meta.totalItems ?? 0,
          currentPage: meta.currentPage ?? 1,
          itemsPerPage: meta.itemsPerPage ?? limit,
          totalPages: meta.totalPages ?? 0,
          hasNextPage: meta.hasNextPage ?? false,
          hasPreviousPage: meta.hasPreviousPage ?? false,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load transaction logs';
      setError(message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams, limit]);

  useEffect(() => {
    fetchTransactionLogs();
  }, [fetchTransactionLogs]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = buildParams(true);
      const res = await fetch(`${API_BASE_URL}/transaction-log/export?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Export failed');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] || `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      alert(message);
    } finally {
      setExporting(false);
    }
  }, [buildParams]);

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setTransactionType('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleMenuClick = () => setIsMobileSidebarOpen((prev) => !prev);
  const handleMobileSidebarClose = () => setIsMobileSidebarOpen(false);
  const handleLogout = () => console.log('Logout clicked');

  const hasActiveFilters =
    search || category || transactionType || status || dateFrom || dateTo;

  const columns: TableColumn[] = [
    {
      key: 'transactionDate',
      label: 'Date',
      sortable: false,
      filterable: false,
      render: (value: string, row: TransactionLog) => (
        <div>
          <div className="text-gray-900 dark:text-white font-medium">
            {value ? new Date(value).toLocaleDateString('en-LK') : '—'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.transactionTime || '—'}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: false,
      filterable: false,
      render: (value: TransactionCategory) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center';
        const categoryColors: Record<string, string> = {
          Inventory: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          Rental: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          Return: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
          Invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
          Maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
          Other: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
        };
        return (
          <span className={`${base} ${categoryColors[value as string] || categoryColors.Other}`}>
            {value || '—'}
          </span>
        );
      },
    },
    {
      key: 'transactionType',
      label: 'Transaction Type',
      sortable: false,
      filterable: false,
      render: (value: TransactionType) => (
        <span className="text-gray-900 dark:text-white font-medium text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference',
      sortable: false,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-900 dark:text-white text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'brand',
      label: 'Brand/Model',
      sortable: false,
      filterable: false,
      render: (_: unknown, row: TransactionLog) => (
        <div>
          {row.brand && <div className="text-gray-900 dark:text-white font-medium">{row.brand}</div>}
          {row.model && <div className="text-xs text-gray-500 dark:text-gray-400">{row.model}</div>}
          {!row.brand && !row.model && <span className="text-gray-400 dark:text-gray-500">—</span>}
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: false,
      filterable: false,
      render: (value: string | undefined) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: false,
      filterable: false,
      render: (value: number | undefined) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {value !== undefined && value !== null ? value : '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount (LKR)',
      sortable: false,
      filterable: false,
      render: (value: number | undefined) => (
        <span className="text-gray-900 dark:text-white font-semibold">
          {value !== undefined && value !== null ? Number(value).toLocaleString('en-LK') : '—'}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      sortable: false,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'performedBy',
      label: 'Performed By',
      sortable: false,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      filterable: false,
      render: (value: TransactionStatus) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center';
        const statusColors: Record<string, string> = {
          Success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
          Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          Cancelled: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
        };
        return (
          <span className={`${base} ${statusColors[value as string] || statusColors.Pending}`}>
            {value || '—'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      <Navbar onMenuClick={handleMenuClick} />
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      <main
        className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Transaction Log</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Comprehensive log of all system transactions including inventory, rentals, returns,
                invoices, and maintenance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content="Export current filters to CSV">
                <button
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{exporting ? 'Exporting…' : 'Export'}</span>
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Filter className="w-4 h-4" />
                Filters & search
              </span>
              <span
                className={`text-sm text-gray-500 dark:text-gray-400 ${
                  hasActiveFilters ? 'text-blue-600 dark:text-indigo-400 font-medium' : ''
                }`}
              >
                {hasActiveFilters ? 'Active' : showFilters ? 'Hide' : 'Show'}
              </span>
            </button>
            {showFilters && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Search
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        placeholder="Reference, description, customer…"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={applySearch}
                        className="px-3 py-2 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 text-sm font-medium"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value || 'all'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Transaction type
                    </label>
                    <input
                      type="text"
                      value={transactionType}
                      onChange={(e) => {
                        setTransactionType(e.target.value);
                        setPage(1);
                      }}
                      placeholder="e.g. Stock In"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value || 'all'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date from
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date to
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    >
                      {SORT_BY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => {
                        setSortOrder(e.target.value as 'asc' | 'desc');
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    >
                      <option value="desc">Newest first</option>
                      <option value="asc">Oldest first</option>
                    </select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden flex flex-col">
            <Table
              data={transactions}
              columns={columns}
              itemsPerPage={limit}
              searchable={false}
              filterable={false}
              loading={loading}
              emptyMessage="No transactions found. Adjust filters or date range."
            />

            {!loading && pagination.totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
                  {Math.min(
                    pagination.currentPage * pagination.itemsPerPage,
                    pagination.totalItems
                  )}{' '}
                  of {pagination.totalItems}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPreviousPage}
                    className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNextPage}
                    className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TransactionLogPage;
