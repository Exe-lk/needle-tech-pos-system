'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import { Eye, X, Package, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';

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

// Mock registered machines (should be fetched from machines API)
const mockRegisteredMachines = [
  { brand: 'Brother', model: 'XL2600i', type: 'Domestic' as MachineType },
  { brand: 'Singer', model: 'Heavy Duty 4423', type: 'Industrial' as MachineType },
  { brand: 'Janome', model: 'HD3000', type: 'Domestic' as MachineType },
  { brand: 'Brother', model: 'SE600', type: 'Embroidery' as MachineType },
  { brand: 'Juki', model: 'MO-654DE', type: 'Overlock' as MachineType },
  { brand: 'Singer', model: 'Buttonhole 160', type: 'Buttonhole' as MachineType },
  { brand: 'Brother', model: 'CS6000i', type: 'Domestic' as MachineType },
  { brand: 'Janome', model: 'MB-4S', type: 'Industrial' as MachineType },
];

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

const InventoryManagementPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [transactions, setTransactions] = useState<StockTransaction[]>(mockTransactions);

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
    setIsStockInModalOpen(true);
  };

  const handleCloseStockInModal = () => {
    setIsStockInModalOpen(false);
  };

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedItem(null);
  };

  const handleViewHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedItem(null);
  };

  // Get unique brands for dropdown
  const uniqueBrands = useMemo(() => {
    return [...new Set(mockRegisteredMachines.map((m) => m.brand))].sort();
  }, []);

  // Get models for selected brand
  const getModelsForBrand = (brand: string) => {
    return mockRegisteredMachines
      .filter((m) => m.brand === brand)
      .map((m) => ({ label: m.model, value: m.model }));
  };

  // Stock In form fields
  const stockInFields: FormField[] = [
    {
      name: 'brand',
      label: 'Brand',
      type: 'select',
      placeholder: 'Select brand',
      required: true,
      options: uniqueBrands.map((brand) => ({ label: brand, value: brand })),
    },
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      placeholder: 'Select model',
      required: true,
      options: [], // Will be populated dynamically based on brand
    },
    {
      name: 'stockType',
      label: 'Stock Type',
      type: 'select',
      placeholder: 'Select stock type',
      required: true,
      options: [
        { label: 'New (with warranty)', value: 'New' },
        { label: 'Used', value: 'Used' },
      ],
    },
    {
      name: 'quantity',
      label: 'Quantity',
      type: 'number',
      placeholder: 'Enter quantity',
      required: true,
    },
    {
      name: 'warrantyExpiry',
      label: 'Warranty Expiry Date',
      type: 'date',
      placeholder: 'Select warranty expiry date',
      required: false, // Required only for new machines
    },
    {
      name: 'condition',
      label: 'Condition',
      type: 'select',
      placeholder: 'Select condition',
      required: false, // Required only for used machines
      options: [
        { label: 'Excellent', value: 'Excellent' },
        { label: 'Good', value: 'Good' },
        { label: 'Fair', value: 'Fair' },
        { label: 'Poor', value: 'Poor' },
      ],
    },
    {
      name: 'location',
      label: 'Storage Location',
      type: 'select',
      placeholder: 'Select location',
      required: true,
      options: [
        { label: 'Main Warehouse', value: 'Main Warehouse' },
        { label: 'Branch Office 1', value: 'Branch Office 1' },
        { label: 'Branch Office 2', value: 'Branch Office 2' },
        { label: 'Storage Facility', value: 'Storage Facility' },
      ],
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Enter any additional notes',
      required: false,
      rows: 3,
    },
  ];

  const handleStockInSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // Validate warranty expiry for new machines
      if (data.stockType === 'New' && !data.warrantyExpiry) {
        alert('Warranty expiry date is required for new machines.');
        setIsSubmitting(false);
        return;
      }

      // Validate condition for used machines
      if (data.stockType === 'Used' && !data.condition) {
        alert('Condition is required for used machines.');
        setIsSubmitting(false);
        return;
      }

      // Create transaction record
      const newTransaction: StockTransaction = {
        id: transactions.length + 1,
        brand: data.brand,
        model: data.model,
        type: mockRegisteredMachines.find(
          (m) => m.brand === data.brand && m.model === data.model
        )?.type || 'Domestic',
        transactionType: 'Stock In',
        stockType: data.stockType,
        quantity: parseInt(data.quantity),
        warrantyExpiry: data.warrantyExpiry,
        condition: data.condition,
        location: data.location,
        notes: data.notes,
        transactionDate: new Date().toISOString().split('T')[0],
        performedBy: 'Current User', // Replace with actual user from auth
      };

      // Update or create inventory item
      const existingItemIndex = inventory.findIndex(
        (item) => item.brand === data.brand && item.model === data.model
      );

      if (existingItemIndex >= 0) {
        // Update existing inventory
        const updatedInventory = [...inventory];
        updatedInventory[existingItemIndex] = {
          ...updatedInventory[existingItemIndex],
          totalStock: updatedInventory[existingItemIndex].totalStock + parseInt(data.quantity),
          availableStock: updatedInventory[existingItemIndex].availableStock + parseInt(data.quantity),
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        setInventory(updatedInventory);
      } else {
        // Create new inventory item
        const newItem: InventoryItem = {
          id: inventory.length + 1,
          brand: data.brand,
          model: data.model,
          type: mockRegisteredMachines.find(
            (m) => m.brand === data.brand && m.model === data.model
          )?.type || 'Domestic',
          totalStock: parseInt(data.quantity),
          availableStock: parseInt(data.quantity),
          rentedStock: 0,
          maintenanceStock: 0,
          retiredStock: 0,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        setInventory([...inventory, newItem]);
      }

      // Add transaction
      setTransactions([newTransaction, ...transactions]);

      console.log('Stock In transaction:', newTransaction);
      alert(
        `Successfully added ${data.quantity} ${data.stockType === 'New' ? 'new' : 'used'} ${data.brand} ${data.model} machine(s) to inventory.`
      );
      handleCloseStockInModal();
    } catch (error) {
      console.error('Error processing stock in:', error);
      alert('Failed to process stock in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
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
        icon: <Clock className="w-4 h-4" />,
        variant: 'primary',
        onClick: handleViewHistory, 
        tooltip: 'View History',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
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
            {isStockIn ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
            )}
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

  // Render inventory details view
  const renderInventoryDetails = () => {
    if (!selectedItem) return null;

    const availablePercentage =
      selectedItem.totalStock > 0
        ? (selectedItem.availableStock / selectedItem.totalStock) * 100
        : 0;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Inventory Details
          </h3>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Machine Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Brand:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedItem.brand}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Model:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedItem.model}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Type:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedItem.type}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {new Date(selectedItem.lastUpdated).toLocaleDateString('en-LK')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Stock Levels
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedItem.totalStock}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Stock</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {selectedItem.availableStock}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">Available</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {selectedItem.rentedStock}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Rented</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {selectedItem.maintenanceStock}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Maintenance</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                {selectedItem.retiredStock}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Retired</div>
            </div>
          </div>

          {/* Availability Status */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Availability Rate
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {availablePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  availablePercentage >= 50
                    ? 'bg-green-500'
                    : availablePercentage >= 25
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${availablePercentage}%` }}
              />
            </div>
            {availablePercentage < 25 && (
              <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-1" />
                Low stock alert - Consider restocking
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = inventory.reduce((sum, item) => sum + item.totalStock, 0);
    const available = inventory.reduce((sum, item) => sum + item.availableStock, 0);
    const rented = inventory.reduce((sum, item) => sum + item.rentedStock, 0);
    const maintenance = inventory.reduce((sum, item) => sum + item.maintenanceStock, 0);
    const retired = inventory.reduce((sum, item) => sum + item.retiredStock, 0);

    return { total, available, rented, maintenance, retired };
  }, [inventory]);

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

      {/* Stock In Modal */}
      {isStockInModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Stock In - Add New Stock
              </h2>
              <button
                onClick={handleCloseStockInModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <CreateForm
                title="Add Stock to Inventory"
                fields={stockInFields}
                onSubmit={handleStockInSubmit}
                onClear={handleClear}
                submitButtonLabel="Add Stock"
                clearButtonLabel="Clear"
                loading={isSubmitting}
                enableDynamicSpecs={false}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Inventory Details Modal */}
      {isViewModalOpen && selectedItem && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Inventory Details
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
              {renderInventoryDetails()}
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
    </div>
  );
};

export default InventoryManagementPage;