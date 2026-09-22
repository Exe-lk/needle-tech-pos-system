// app/transaction-log/page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn } from '@/src/components/table/table';
import { Download, Loader2 } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { authFetch } from '@/lib/auth-client';

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

const API_BASE_URL = '/api/v1';

const TransactionLogPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchTransactionLogs = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      });
      const res = await authFetch(`${API_BASE_URL}/transaction-log?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to fetch transaction logs');
      }

      const raw = json?.data?.items;
      const list = Array.isArray(raw) ? raw : raw?.transactions ?? [];
      setTransactions(list);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load transaction logs';
      setError(message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactionLogs();
  }, [fetchTransactionLogs]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/transaction-log/export?sortBy=transactionDate&sortOrder=desc`, {
        method: 'GET',
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
  }, []);

  const handleMenuClick = () => setIsMobileSidebarOpen((prev) => !prev);
  const handleMobileSidebarClose = () => setIsMobileSidebarOpen(false);
  const handleLogout = () => console.log('Logout clicked');

  const columns: TableColumn[] = [
    {
      key: 'transactionDate',
      label: 'Date',
      sortable: true,
      filterable: true,
      filterType: 'dateRange',
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
      sortable: true,
      filterable: true,
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
      sortable: true,
      filterable: true,
      render: (value: TransactionType) => (
        <span className="text-gray-900 dark:text-white font-medium text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-900 dark:text-white text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'brand',
      label: 'Brand/Model',
      sortable: true,
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
      sortable: true,
      filterable: true,
      render: (value: string | undefined) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
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
      sortable: true,
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
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'performedBy',
      label: 'Performed By',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-700 dark:text-gray-300 text-sm">{value || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
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
    <div className="min-h-full bg-gray-100 dark:bg-slate-950">
      <Navbar onMenuClick={handleMenuClick} />
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      <main
        className={`pt-[84px] p-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}
      >
        <div className="w-full xl:max-w-[1600px] mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Transaction Log</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Comprehensive log of all system transactions including inventory, rentals, returns,
                invoices, and maintenance.
              </p>
            </div>
            <Tooltip content="Export transaction logs to CSV">
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

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <Table
            data={transactions}
            columns={columns}
            itemsPerPage={10}
            searchable
            filterable
            loading={loading}
            emptyMessage="No transactions found."
          />
        </div>
      </main>
    </div>
  );
};

export default TransactionLogPage;
