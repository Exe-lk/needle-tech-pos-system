'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import type { FormField } from '@/src/components/form-popup/update';
import { Eye, Clock, Pencil, X } from 'lucide-react';
import { authFetch } from '@/lib/auth-client';
import { Swal } from '@/src/lib/swal';

const API_BASE = '/api/v1';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';
type StockType = 'New' | 'Used';
type TransactionType = 'Stock In' | 'Stock Out';

// Inventory Item - Represents stock levels for a brand/model combination (from API)
interface InventoryItem {
  id: string;
  brand: string;
  model: string;
  type: MachineType;
  totalStock: number;
  availableStock: number;
  reservedStock?: number; // AVAILABLE but assigned to a PENDING rental (not yet dispatched)
  rentedStock: number;
  maintenanceStock: number;
  retiredStock: number;
  lastUpdated: string;
}

// Individual machine unit (one row per physical machine)
interface MachineUnit {
  id: string;
  brand: string;
  model: string;
  type: MachineType;
  serialNumber: string;
  boxNumber: string;
}

// Stock Transaction - Records individual stock movements (from API)
interface StockTransaction {
  id: string | number;
  brand: string;
  model: string;
  type: MachineType | string;
  transactionType: TransactionType;
  stockType: StockType | string | null;
  quantity: number;
  warrantyExpiry?: string | null;
  condition?: string | null;
  location: string;
  notes?: string;
  transactionDate: string;
  performedBy?: string;
}

const InventoryManagementPage: React.FC = () => {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machineUnits, setMachineUnits] = useState<MachineUnit[]>([]);
  const [machineUnitsLoading, setMachineUnitsLoading] = useState(true);
  const [machineUnitsError, setMachineUnitsError] = useState<string | null>(null);
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [machineForSale, setMachineForSale] = useState<MachineUnit | null>(null);
  const [sellSerialInput, setSellSerialInput] = useState('');
  const [sellBoxInput, setSellBoxInput] = useState('');
  const [sellSubmitting, setSellSubmitting] = useState(false);

  // Fetch inventory from API
  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const res = await authFetch(`${API_BASE}/inventory?page=1&limit=1000`, {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load inventory');
      }
      const list = json?.data?.items?.inventory ?? json?.data?.items ?? [];
      setInventory(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setInventoryError(err?.message || 'Failed to load inventory');
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Fetch machine units (real serialNumber, boxNumber from DB) for view modal
  const fetchMachineUnits = useCallback(async () => {
    setMachineUnitsLoading(true);
    setMachineUnitsError(null);
    try {
      const res = await authFetch(`${API_BASE}/inventory/machines`, {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load machines');
      }
      const list = json?.data?.machines ?? [];
      const units: MachineUnit[] = Array.isArray(list)
        ? list.map((m: { id: string; brand: string; model: string; type: string; serialNumber: string; boxNumber: string }) => ({
            id: m.id,
            brand: m.brand,
            model: m.model,
            type: m.type as MachineType,
            serialNumber: m.serialNumber,
            boxNumber: m.boxNumber,
          }))
        : [];
      setMachineUnits(units);
    } catch (err: unknown) {
      setMachineUnitsError(err instanceof Error ? err.message : 'Failed to load machines');
      setMachineUnits([]);
    } finally {
      setMachineUnitsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachineUnits();
  }, [fetchMachineUnits]);

  // Fetch transactions for history modal (filtered by brand/model)
  const fetchTransactionsForItem = useCallback(async (brand: string, model: string) => {
    setTransactionsLoading(true);
    try {
      const params = new URLSearchParams({
        brand,
        model,
        limit: '500',
      });
      const res = await authFetch(`${API_BASE}/inventory/transactions?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load transactions');
      }
      const list = json?.data?.items?.transactions ?? json?.data?.items ?? [];
      setTransactions(Array.isArray(list) ? list : []);
    } catch {
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // When history modal opens, fetch transactions for selected item
  useEffect(() => {
    if (isHistoryModalOpen && selectedItem) {
      fetchTransactionsForItem(selectedItem.brand, selectedItem.model);
    }
  }, [isHistoryModalOpen, selectedItem?.brand, selectedItem?.model, fetchTransactionsForItem]);

  /** All individual machine units from database (real serialNumber, boxNumber). */
  const allMachineUnits = machineUnits;

  /** Machines matching the selected inventory row (brand+model+type). */
  const selectedMachineUnits = selectedItem
    ? allMachineUnits.filter(
        (m) =>
          m.brand === selectedItem.brand &&
          m.model === selectedItem.model &&
          m.type === selectedItem.type
      )
    : [];

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleStockIn = () => {
    router.push('/inventory/stock-in');
  };

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedItem(null);
  };

  const handleOpenSoldModal = (machine: MachineUnit) => {
    setMachineForSale(machine);
    setSellSerialInput(machine.serialNumber ?? '');
    setSellBoxInput(machine.boxNumber ?? '');
    setIsSoldModalOpen(true);
  };

  const handleCloseSoldModal = () => {
    setIsSoldModalOpen(false);
    setMachineForSale(null);
    setSellSerialInput('');
    setSellBoxInput('');
  };

  const handleSubmitSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineForSale) return;
    const serial = sellSerialInput.trim();
    const box = sellBoxInput.trim();
    if (!serial) {
      await Swal.fire({ icon: 'warning', title: 'Serial required', text: 'Please enter the serial number.' });
      return;
    }
    setSellSubmitting(true);
    try {
      const res = await authFetch(`${API_BASE}/inventory/sell`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: machineForSale.id,
          serialNumber: serial,
          boxNumber: box,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to record sale');
      }
      await Swal.fire({
        icon: 'success',
        title: 'Sale recorded',
        text: json?.message || 'Machine removed from active inventory. Bincard and transaction log updated.',
      });
      handleCloseSoldModal();
      await Promise.all([fetchMachineUnits(), fetchInventory()]);
    } catch (err: unknown) {
      await Swal.fire({
        icon: 'error',
        title: 'Cannot complete sale',
        text: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setSellSubmitting(false);
    }
  };

  const handleViewHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedItem(null);
  };

  const handleUpdateItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedItem(null);
  };

  const getUpdateInitialData = (item: InventoryItem | null): Record<string, any> => {
    if (!item) return {};
    return {
      brand: item.brand,
      model: item.model,
      type: item.type,
      totalStock: item.totalStock,
      availableStock: item.availableStock,
      rentedStock: item.rentedStock,
      maintenanceStock: item.maintenanceStock,
      retiredStock: item.retiredStock,
    };
  };

  const handleInventoryUpdate = async (data: Record<string, any>) => {
    if (!selectedItem) return;
    const available = Number(data.availableStock) ?? 0;
    const rented = Number(data.rentedStock) ?? 0;
    const maintenance = Number(data.maintenanceStock) ?? 0;
    const retired = Number(data.retiredStock) ?? 0;
    const sum = available + rented + maintenance + retired;
    if (sum !== selectedItem.totalStock) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid stock breakdown',
        text: `Stock breakdown must equal total stock (${selectedItem.totalStock}). Current sum: ${sum}. Please ensure Available + Rented + Maintenance + Retired = ${selectedItem.totalStock}.`,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      setInventory((prev) =>
        prev.map((it) =>
          it.id === selectedItem.id
            ? {
                ...it,
                availableStock: available,
                rentedStock: rented,
                maintenanceStock: maintenance,
                retiredStock: retired,
                lastUpdated: new Date().toISOString().slice(0, 10),
              }
            : it
        )
      );
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get filtered transactions for selected item
  const getItemTransactions = (item: InventoryItem | null): StockTransaction[] => {
    if (!item) return [];
    return transactions.filter(
      (t) => t.brand === item.brand && t.model === item.model
    );
  };

  // Table columns for inventory list
  const inventoryColumns: TableColumn[] = [
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
        const base =
          'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
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
      key: 'totalStock',
      label: 'Total Stock',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'availableStock',
      label: 'Available',
      sortable: true,
      filterable: false,
      render: (value: number, row: InventoryItem) => {
        const percentage = row.totalStock > 0 ? (value / row.totalStock) * 100 : 0;
        const colorClass =
          percentage >= 50
            ? 'text-green-600 dark:text-green-400'
            : percentage >= 25
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400';
        return <span className={`font-medium ${colorClass}`}>{value}</span>;
      },
    },
    {
      key: 'reservedStock',
      label: 'Reserved',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="text-amber-600 dark:text-amber-400 font-medium">{value ?? 0}</span>
      ),
    },
    {
      key: 'rentedStock',
      label: 'Rented',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="text-blue-600 dark:text-blue-400 font-medium">{value}</span>
      ),
    },
    {
      key: 'maintenanceStock',
      label: 'Maintenance',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="text-yellow-600 dark:text-yellow-400 font-medium">{value}</span>
      ),
    },
    {
      key: 'retiredStock',
      label: 'Retired',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="text-gray-500 dark:text-gray-400 font-medium">{value}</span>
      ),
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(value).toLocaleDateString('en-LK')}
        </span>
      ),
    },
  ];

  // Update form fields: read-only brand, model, type, totalStock; editable available, rented, maintenance, retired
  const inventoryUpdateFields: FormField[] = [
    { name: 'brand', label: 'Brand', type: 'text', disabled: true },
    { name: 'model', label: 'Model', type: 'text', disabled: true },
    {
      name: 'type',
      label: 'Type',
      type: 'text',
      disabled: true,
    },
    {
      name: 'totalStock',
      label: 'Total Stock',
      type: 'number',
      disabled: true,
    },
    {
      name: 'availableStock',
      label: 'Available',
      type: 'number',
      required: true,
      validation: (value) => {
        const n = Number(value);
        if (isNaN(n) || n < 0) return 'Must be a non-negative number';
        return null;
      },
    },
    {
      name: 'rentedStock',
      label: 'Rented',
      type: 'number',
      required: true,
      validation: (value) => {
        const n = Number(value);
        if (isNaN(n) || n < 0) return 'Must be a non-negative number';
        return null;
      },
    },
    {
      name: 'maintenanceStock',
      label: 'Maintenance',
      type: 'number',
      required: true,
      validation: (value) => {
        const n = Number(value);
        if (isNaN(n) || n < 0) return 'Must be a non-negative number';
        return null;
      },
    },
    {
      name: 'retiredStock',
      label: 'Retired',
      type: 'number',
      required: true,
      validation: (value) => {
        const n = Number(value);
        if (isNaN(n) || n < 0) return 'Must be a non-negative number';
        return null;
      },
    },
  ];

  // Action buttons for inventory table
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewDetails,
      tooltip: 'View Details',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateItem,
      tooltip: 'Update',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
    {
      label: '',
      icon: <Clock className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleViewHistory,
      tooltip: 'View History',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700 focus:ring-green-500 dark:focus:ring-green-500',
    },
  ];

  // Transaction history columns
  const transactionColumns: TableColumn[] = [
    {
      key: 'transactionDate',
      label: 'Date',
      sortable: true,
      filterable: false,
      render: (value: string) => (
        <span className="text-gray-900 dark:text-white">
          {new Date(value).toLocaleDateString('en-LK')}
        </span>
      ),
    },
    {
      key: 'transactionType',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: TransactionType) => {
        const isStockIn = value === 'Stock In';
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ${
              isStockIn
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {value}
          </span>
        );
      },
    },
    {
      key: 'stockType',
      label: 'Stock Type',
      sortable: true,
      filterable: true,
      render: (value: StockType) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value === 'New'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'warrantyExpiry',
      label: 'Warranty Expiry',
      sortable: true,
      filterable: false,
      render: (value: string | undefined) =>
        value ? (
          <span className="text-gray-600 dark:text-gray-400">
            {new Date(value).toLocaleDateString('en-LK')}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">N/A</span>
        ),
    },
    {
      key: 'condition',
      label: 'Condition',
      sortable: true,
      filterable: true,
      render: (value: string | undefined) =>
        value ? (
          <span className="text-gray-600 dark:text-gray-400">{value}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">N/A</span>
        ),
    },
    {
      key: 'location',
      label: 'Location',
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

  // View details modal: table columns for all machine units (brand, model, type, serial, box)
  const viewDetailsColumns: TableColumn[] = [
    { key: 'brand', label: 'Brand', sortable: true, filterable: true },
    { key: 'model', label: 'Model', sortable: true, filterable: true },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: MachineType) => {
        const base =
          'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
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
    { key: 'serialNumber', label: 'Serial Number', sortable: true, filterable: true },
    { key: 'boxNumber', label: 'Box Number', sortable: true, filterable: true },
  ];

  const viewDetailsActions: ActionButton[] = [
    {
      label: 'Sell',
      variant: 'warning',
      onClick: (row: MachineUnit) => handleOpenSoldModal(row),
      tooltip: 'Record sale (removes from inventory if not on a hiring agreement)',
      className:
        'px-2.5 py-1 min-w-[4.5rem] text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
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
      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Inventory Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track and manage machine stock levels, view inventory history, and perform stock operations.
              </p>
            </div>
          </div>

          {/* Inventory table card */}
          {inventoryError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{inventoryError}</p>
              <button
                type="button"
                onClick={() => fetchInventory()}
                className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          <Table
            data={inventory}
            columns={inventoryColumns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            loading={inventoryLoading}
            onCreateClick={handleStockIn}
            createButtonLabel="Stock In"
            emptyMessage={inventoryLoading ? 'Loading inventory...' : 'No inventory items found. Add stock to get started.'}
          />
        </div>
      </main>

      {/* View Inventory Details Modal - All machine units table with pagination */}
      {isViewModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Inventory Details
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedItem ? (
                    <>
                      {selectedItem.brand} {selectedItem.model} &middot; {selectedItem.type} (
                      {selectedMachineUnits.length} machines)
                    </>
                  ) : (
                    <>All machines ({allMachineUnits.length} total)</>
                  )}
                </p>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Table with pagination */}
            <div className="flex-1 overflow-y-auto p-6">
              {machineUnitsLoading ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">Loading machines...</p>
              ) : machineUnitsError ? (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-red-700 dark:text-red-300">{machineUnitsError}</p>
                  <button
                    type="button"
                    onClick={() => fetchMachineUnits()}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <Table
                  data={selectedItem ? selectedMachineUnits : allMachineUnits}
                  columns={viewDetailsColumns}
                  actions={viewDetailsActions}
                  itemsPerPage={10}
                  searchable
                  filterable
                  emptyMessage="No machines found."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Inventory Modal */}
      {isUpdateModalOpen && selectedItem && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update Stock
              </h2>
              <button
                onClick={handleCloseUpdateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedItem.brand} {selectedItem.model} &middot; Total stock must equal Available + Rented + Maintenance + Retired.
              </p>
              <UpdateForm
                title=""
                fields={inventoryUpdateFields}
                onSubmit={handleInventoryUpdate}
                submitButtonLabel="Update"
                clearButtonLabel="Reset"
                loading={isSubmitting}
                initialData={getUpdateInitialData(selectedItem)}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {isHistoryModalOpen && selectedItem && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Transaction History
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedItem.brand} {selectedItem.model}
                </p>
              </div>
              <button
                onClick={handleCloseHistoryModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {transactionsLoading ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">Loading transactions...</p>
              ) : (
                <Table
                  data={getItemTransactions(selectedItem)}
                  columns={transactionColumns}
                  itemsPerPage={10}
                  searchable
                  filterable
                  emptyMessage="No transaction history found for this item."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record sale — confirm serial & box; server blocks if machine is on a pending/active hiring agreement */}
      {isSoldModalOpen && machineForSale && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Record sale</h2>
              <button
                type="button"
                onClick={handleCloseSoldModal}
                disabled={sellSubmitting}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitSold} className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Re-enter the serial and box number for{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {machineForSale.brand} {machineForSale.model}
                </span>
                . The machine is removed from active inventory only if it is not on a pending or active hiring agreement.
              </p>
              <div>
                <label htmlFor="sell-serial" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Serial number
                </label>
                <input
                  id="sell-serial"
                  type="text"
                  value={sellSerialInput}
                  onChange={(e) => setSellSerialInput(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="sell-box" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Box number
                </label>
                <input
                  id="sell-box"
                  type="text"
                  value={sellBoxInput}
                  onChange={(e) => setSellBoxInput(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseSoldModal}
                  disabled={sellSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sellSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50"
                >
                  {sellSubmitting ? 'Submitting…' : 'Submit sell'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagementPage;