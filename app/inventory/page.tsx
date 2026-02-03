'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import type { FormField } from '@/src/components/form-popup/update';
import { Eye, Clock, Pencil, X, QrCode, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';
type StockType = 'New' | 'Used';
type TransactionType = 'Stock In' | 'Stock Out';

// Inventory Item - Represents stock levels for a brand/model combination
interface InventoryItem {
  id: number;
  brand: string;
  model: string;
  type: MachineType;
  totalStock: number;
  availableStock: number;
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

// Stock Transaction - Records individual stock movements
interface StockTransaction {
  id: number;
  brand: string;
  model: string;
  type: MachineType;
  transactionType: TransactionType;
  stockType: StockType;
  quantity: number;
  warrantyExpiry?: string; // For new machines
  condition?: string; // For used machines
  location: string;
  notes?: string;
  transactionDate: string;
  performedBy?: string;
}

// Mock inventory data
const mockInventory: InventoryItem[] = [
  {
    id: 1,
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    totalStock: 25,
    availableStock: 20,
    rentedStock: 3,
    maintenanceStock: 2,
    retiredStock: 0,
    lastUpdated: '2024-04-15',
  },
  {
    id: 2,
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    type: 'Industrial',
    totalStock: 15,
    availableStock: 8,
    rentedStock: 6,
    maintenanceStock: 1,
    retiredStock: 0,
    lastUpdated: '2024-04-14',
  },
  {
    id: 3,
    brand: 'Janome',
    model: 'HD3000',
    type: 'Domestic',
    totalStock: 12,
    availableStock: 10,
    rentedStock: 2,
    maintenanceStock: 0,
    retiredStock: 0,
    lastUpdated: '2024-04-13',
  },
  {
    id: 4,
    brand: 'Brother',
    model: 'SE600',
    type: 'Embroidery',
    totalStock: 8,
    availableStock: 5,
    rentedStock: 2,
    maintenanceStock: 1,
    retiredStock: 0,
    lastUpdated: '2024-04-12',
  },
  {
    id: 5,
    brand: 'Juki',
    model: 'MO-654DE',
    type: 'Overlock',
    totalStock: 10,
    availableStock: 7,
    rentedStock: 2,
    maintenanceStock: 1,
    retiredStock: 0,
    lastUpdated: '2024-04-11',
  },
];

// Mock stock transactions
const mockTransactions: StockTransaction[] = [
  {
    id: 1,
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Stock In',
    stockType: 'New',
    quantity: 10,
    warrantyExpiry: '2027-04-15',
    location: 'Main Warehouse',
    notes: 'New shipment from supplier',
    transactionDate: '2024-04-15',
    performedBy: 'Admin User',
  },
  {
    id: 2,
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    type: 'Industrial',
    transactionType: 'Stock In',
    stockType: 'Used',
    quantity: 5,
    condition: 'Good',
    location: 'Main Warehouse',
    notes: 'Refurbished machines',
    transactionDate: '2024-04-14',
    performedBy: 'Admin User',
  },
  {
    id: 3,
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
    transactionType: 'Stock In',
    stockType: 'New',
    quantity: 15,
    warrantyExpiry: '2027-04-20',
    location: 'Main Warehouse',
    transactionDate: '2024-04-10',
    performedBy: 'Admin User',
  },
];

/** Expand inventory items into individual machine units (one per physical machine). */
function expandInventoryToMachineUnits(items: InventoryItem[]): MachineUnit[] {
  const units: MachineUnit[] = [];
  let globalIndex = 0;
  for (const item of items) {
    const prefix = `${item.brand}-${item.model}`.replace(/\s+/g, '-');
    for (let i = 0; i < item.totalStock; i++) {
      globalIndex += 1;
      const serialNum = String(globalIndex).padStart(4, '0');
      const boxNum = `${prefix}-B${String(i + 1).padStart(3, '0')}`;
      units.push({
        id: `unit-${item.id}-${i + 1}`,
        brand: item.brand,
        model: item.model,
        type: item.type,
        serialNumber: `${prefix}-SN${serialNum}`,
        boxNumber: boxNum,
      });
    }
  }
  return units;
}

const InventoryManagementPage: React.FC = () => {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [transactions, setTransactions] = useState<StockTransaction[]>(mockTransactions);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<MachineUnit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  /** All individual machine units (70 total from 5 inventory rows). */
  const allMachineUnits = useMemo(() => expandInventoryToMachineUnits(inventory), [inventory]);

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

  /** QR code payload: only serial number and box number (for scanning in gatepass/returns). */
  const getQRCodePayload = (machine: MachineUnit | null): string => {
    if (!machine) return '';
    return JSON.stringify({
      serialNumber: machine.serialNumber,
      boxNo: machine.boxNumber,
    });
  };

  const handleGenerateQR = (machine: MachineUnit) => {
    setSelectedMachineForQR(machine);
    setIsQRModalOpen(true);
  };

  const handleCloseQRModal = () => {
    setIsQRModalOpen(false);
    setSelectedMachineForQR(null);
  };

  const handlePrintQR = () => {
    if (!qrCodeRef.current || !selectedMachineForQR) return;
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const m = selectedMachineForQR;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${m.brand} ${m.model}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            h2 { margin: 0 0 8px 0; font-size: 1.25rem; }
            p { margin: 0 0 16px 0; color: #666; font-size: 0.875rem; }
            div.qr-wrap { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h2>Machine QR Code</h2>
          <p>${m.brand} ${m.model} &middot; ${m.serialNumber} / ${m.boxNumber}</p>
          <div class="qr-wrap">${svgData}</div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
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
      alert(
        `Stock breakdown must equal total stock (${selectedItem.totalStock}). Current sum: ${sum}. Please ensure Available + Rented + Maintenance + Retired = ${selectedItem.totalStock}.`
      );
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
      label: '',
      icon: <QrCode className="w-4 h-4" />,
      variant: 'secondary',
      onClick: (row: MachineUnit) => handleGenerateQR(row),
      tooltip: 'Generate QR Code',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
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
          <Table
            data={inventory}
            columns={inventoryColumns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            onCreateClick={handleStockIn}
            createButtonLabel="Stock In"
            emptyMessage="No inventory items found. Add stock to get started."
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
                  All machines ({allMachineUnits.length} total)
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
              <Table
                data={allMachineUnits}
                columns={viewDetailsColumns}
                actions={viewDetailsActions}
                itemsPerPage={10}
                searchable
                filterable
                emptyMessage="No machines found."
              />
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
              <Table
                data={getItemTransactions(selectedItem)}
                columns={transactionColumns}
                itemsPerPage={10}
                searchable
                filterable
                emptyMessage="No transaction history found for this item."
              />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal - serial number and box number only */}
      {isQRModalOpen && selectedMachineForQR && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Machine QR Code
              </h2>
              <button
                onClick={handleCloseQRModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div
                ref={qrCodeRef}
                className="flex justify-center p-4 bg-white dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
              >
                <QRCodeSVG value={getQRCodePayload(selectedMachineForQR)} size={200} level="M" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This QR code contains only serial number and box number for scanning in gatepass or returns.
              </p>
              <button
                type="button"
                onClick={handlePrintQR}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagementPage;