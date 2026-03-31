'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import type { FormField } from '@/src/components/form-popup/update';
import { Eye, Clock, Pencil, X, QrCode, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<MachineUnit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machineUnits, setMachineUnits] = useState<MachineUnit[]>([]);
  const [machineUnitsLoading, setMachineUnitsLoading] = useState(true);
  const [machineUnitsError, setMachineUnitsError] = useState<string | null>(null);
  const [isBrowserPrintLoaded, setIsBrowserPrintLoaded] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const qrCodeRef = useRef<HTMLDivElement>(null);

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

  // Fetch machine units (real serialNumber, boxNumber from DB) for view modal and QR codes
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

  // BrowserPrint (Zebra): init default/local printers after SDK loads (Script onLoad sets isBrowserPrintLoaded)
  useEffect(() => {
    if (!isBrowserPrintLoaded || typeof window === 'undefined') return;
    const wp = (window as any).BrowserPrint;
    if (!wp) return;
    wp.getDefaultDevice(
      'printer',
      (device: any) => {
        setSelectedDevice(device);
        setDevices((prev) => (device ? [...prev, device] : prev));
        wp.getLocalDevices(
          (list: any[]) => {
            const others = (list || []).filter((d: any) => d.uid !== device?.uid);
            setDevices((prev) => {
              const seen = new Set(prev.map((d: any) => d.uid));
              const added = others.filter((d: any) => !seen.has(d.uid));
              return added.length ? [...prev, ...added] : prev;
            });
            const zebra = others.find((d: any) => d.manufacturer === 'Zebra Technologies');
            if (zebra) setSelectedDevice(zebra);
          },
          () => {},
          'printer'
        );
      },
      () => {}
    );
  }, [isBrowserPrintLoaded]);

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

  /** ZPL from ZPL.txt: same structure and dimensions; only line 14 (QR), 18 (serial), 21 (box) are dynamic. */
  const getZPLForMachine = (serialNumber: string, boxNumber: string): string => {
    const qrData = JSON.stringify({ serialNumber, boxNo: boxNumber });
    return `^XA
^CI27
^PW464
^LL320

### Header: Company Name ###
^FO20,20^GB424,55,3^FS
^FO20,32^A0N,30,30^FB424,1,0,C^FDNeedle Technologies^FS

### LEFT SIDE: JSON Formatted QR Code ###
# Magnification 5 provides the best density for this much data
# Error Correction H (High) matches the look of your uploaded image
^FO50,100^BQN,2,5,H
^FDQA,${qrData}^FS

### RIGHT SIDE: Label Data ###
^FO250,135^A0N,22,22^FDS/N:^FS
^FO250,165^A0N,28,28^FD${serialNumber}^FS

^FO250,225^A0N,22,22^FDB/N:^FS
^FO250,255^A0N,28,28^FD${boxNumber}^FS

^XZ`;
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
    const m = selectedMachineForQR;
    if (!m) return;

    const zplString = getZPLForMachine(m.serialNumber, m.boxNumber);

    if (isBrowserPrintLoaded && selectedDevice && typeof selectedDevice.send === 'function') {
      selectedDevice.send(zplString, undefined, (err: string) => {
        if (err) console.error('Print error:', err);
      });
      return;
    }

    // Fallback: print in-place via hidden iframe (no new tab)
    if (!qrCodeRef.current) return;
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:0;');
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${m.serialNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
            .label { width: 464px; min-height: 320px; border: 2px solid #000; padding: 0; display: flex; flex-direction: column; }
            .header { border-bottom: 3px solid #000; padding: 12px; text-align: center; font-weight: bold; font-size: 22px; }
            .body { display: flex; flex: 1; }
            .left { padding: 16px; }
            .right { flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
            .row { font-size: 14px; color: #333; }
            .row .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">Needle Technologies</div>
            <div class="body">
              <div class="left">${svgData}</div>
              <div class="right">
                <div class="row">Serial Number:<div class="value">${m.serialNumber}</div></div>
                <div class="row">Box Number:<div class="value">${m.boxNumber}</div></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Remove iframe after print dialog closes (user can cancel or print)
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
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
      <Script
        src="/browser-print/BrowserPrint-3.1.250.min.js"
        strategy="afterInteractive"
        onLoad={() => setIsBrowserPrintLoaded(true)}
      />
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
                  data={allMachineUnits}
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

      {/* QR Code Modal - label preview matching ZPL (Needle Technologies, QR, S/N, B/N) */}
      {isQRModalOpen && selectedMachineForQR && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Generate QR Code
              </h2>
              <button
                onClick={handleCloseQRModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Label preview: matches ZPL layout (Needle Technologies, QR left, Serial/Box right) */}
              <div
                ref={qrCodeRef}
                className="mx-auto w-[464px] min-h-[320px] border-2 border-black bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded"
              >
                <div className="border-b-2 border-black py-2 text-center font-bold text-lg text-gray-900 dark:text-white">
                  Needle Technologies
                </div>
                <div className="flex flex-1 p-4 gap-6">
                  <div className="flex items-center justify-center shrink-0 p-2 bg-white dark:bg-slate-800 rounded">
                    <QRCodeSVG
                      value={getQRCodePayload(selectedMachineForQR)}
                      size={180}
                      level="H"
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-6 text-gray-900 dark:text-white">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Serial Number:</p>
                      <p className="text-xl font-bold mt-0.5">{selectedMachineForQR.serialNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Box Number:</p>
                      <p className="text-xl font-bold mt-0.5">{selectedMachineForQR.boxNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* <p className="text-sm text-gray-600 dark:text-gray-400">
                QR encodes serial and box number for gatepass/returns. Print sends ZPL to Zebra or opens preview.
              </p> */}
              {isBrowserPrintLoaded && (
                <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Select Printer
                  </label>
                  <select
                    value={selectedDevice?.uid ?? ''}
                    onChange={(e) => {
                      const uid = e.target.value;
                      if (uid) setSelectedDevice(devices.find((d: any) => d.uid === uid) ?? null);
                    }}
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm font-medium focus:border-blue-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-indigo-500/20 outline-none"
                  >
                    {devices.length > 0 ? (
                      devices.map((d: any, i: number) => (
                        <option key={d.uid ?? i} value={d.uid}>
                          {[d.name, d.manufacturer, d.model].filter(Boolean).join(' — ') || d.uid || `Printer ${i + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No printers available — connect a printer or start Browser Print service
                      </option>
                    )}
                  </select>
                  {devices.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Ensure the Browser Print service is running on this machine. Refresh after connecting a printer.
                    </p>
                  )}
                </div>
              )}
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