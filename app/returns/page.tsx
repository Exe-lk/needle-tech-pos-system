'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, Pencil, Package, FileText, Building2, MapPin, Camera, DollarSign, Calendar } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-client';

type ReturnType = 'Standard' | 'Damage' | 'Missing' | 'Exchange';
type ReturnStatus = 'Pending' | 'Completed' | 'Under Review';

interface Return {
  id: string;
  returnNumber: string;
  machineName: string;
  machineId: string;
  customerName: string;
  returnDate: string;
  returnType: ReturnType;
  status: ReturnStatus;
  damageNote?: string;
  photosCount?: number;
  repairCost?: number;
  inspectedBy: string;
  // Enhanced fields for view modal
  machineDetails?: {
    model: string;
    serialNumber: string;
    manufacturer: string;
    year: number;
    category: string;
    location?: string;
  };
  rentalDetails?: {
    agreementNumber: string;
    customerPhone: string;
    customerEmail: string;
    rentalStartDate: string;
    rentalEndDate: string;
    rentalPeriod: string;
    monthlyRate: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    securityDeposit: number;
    dispatchedDate: string;
    expectedReturnDate: string;
  };
}

const API_BASE_URL = '/api/v1';

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function triageToReturnType(triage: string): ReturnType {
  const m: Record<string, ReturnType> = {
    STANDARD: 'Standard',
    DAMAGE: 'Damage',
    MISSING_PARTS: 'Missing',
    EXCHANGE: 'Exchange',
  };
  return m[triage] ?? 'Standard';
}

function parseStatusFromNotes(notes: string | null | undefined): ReturnStatus {
  if (!notes) return 'Pending';
  const u = notes.toUpperCase();
  if (u.includes('COMPLETED')) return 'Completed';
  if (u.includes('UNDER REVIEW')) return 'Under Review';
  return 'Pending';
}

function mapApiReturnToReturn(api: any): Return {
  const rental = api.rental;
  const customer = rental?.customer;
  const machine = api.machine;
  const inspector = api.inspectedBy;
  const damageReport = api.damageReport;

  const returnDate = api.returnDate ? new Date(api.returnDate).toISOString().slice(0, 10) : '';
  const startDate = rental?.startDate ? new Date(rental.startDate).toISOString().slice(0, 10) : '';
  const endDate = rental?.expectedEndDate ? new Date(rental.expectedEndDate).toISOString().slice(0, 10) : '';

  const total = toNum(rental?.total);
  const paid = toNum(rental?.paidAmount);
  const balance = toNum(rental?.balance);
  const deposit = toNum(rental?.depositTotal);
  const monthlyRate = total;

  const customerPhones = customer?.phones;
  const customerEmails = customer?.emails;
  const customerPhone = Array.isArray(customerPhones) && customerPhones.length > 0 ? customerPhones[0] : '—';
  const customerEmail = Array.isArray(customerEmails) && customerEmails.length > 0 ? customerEmails[0] : '—';

  const repairCostVal = damageReport != null ? toNum(damageReport.estimatedRepairCost ?? damageReport.approvedChargeToCustomer) : undefined;

  return {
    id: api.id,
    returnNumber: api.returnNumber ?? '—',
    machineName: machine
      ? (() => {
          const part = `${machine.brand?.name ?? ''} ${machine.model?.name ?? machine.serialNumber ?? ''}`.trim();
          return (part || machine.serialNumber) ?? api.machineId;
        })()
      : (api.machineId ?? '—'),
    machineId: api.machineId ?? '—',
    customerName: customer?.name ?? '—',
    returnDate,
    returnType: triageToReturnType(api.triageCategory),
    status: parseStatusFromNotes(api.notes),
    damageNote: api.notes ?? api.condition ?? undefined,
    photosCount: Array.isArray(api.photos) ? api.photos.length : 0,
    repairCost: repairCostVal,
    inspectedBy: inspector?.fullName ?? inspector?.username ?? '—',
    machineDetails: machine
      ? {
          model: machine.model?.name ?? machine.serialNumber ?? '—',
          serialNumber: machine.serialNumber ?? '—',
          manufacturer: machine.brand?.name ?? '—',
          year: machine.manufactureYear ? parseInt(String(machine.manufactureYear), 10) || 0 : 0,
          category: machine.type?.name ?? '—',
          location: machine.currentLocationName ?? undefined,
        }
      : undefined,
    rentalDetails: rental
      ? {
          agreementNumber: rental.agreementNumber ?? '—',
          customerPhone,
          customerEmail,
          rentalStartDate: startDate,
          rentalEndDate: endDate,
          rentalPeriod: rental.expectedEndDate && rental.startDate ? `${Math.ceil((new Date(rental.expectedEndDate).getTime() - new Date(rental.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000))} months` : '—',
          monthlyRate,
          totalAmount: total,
          paidAmount: paid,
          outstandingAmount: balance,
          securityDeposit: deposit,
          dispatchedDate: startDate,
          expectedReturnDate: endDate,
        }
      : undefined,
  };
}

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'returnNumber',
    label: 'Return Number',
    sortable: true,
    filterable: false,
  },
  {
    key: 'machineName',
    label: 'Machine Name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'customerName',
    label: 'Customer',
    sortable: true,
    filterable: true,
  },
  {
    key: 'returnDate',
    label: 'Return Date',
    sortable: true,
    filterable: false,
    render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
  },
  {
    key: 'returnType',
    label: 'Return Type',
    sortable: true,
    filterable: true,
    render: (value: ReturnType) => {
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Standard') {
        return (
          <span
            className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}
          >
            Standard
          </span>
        );
      }
      if (value === 'Damage') {
        return (
          <span
            className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}
          >
            Damage
          </span>
        );
      }
      if (value === 'Missing') {
        return (
          <span
            className={`${base} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}
          >
            Missing
          </span>
        );
      }
      return (
        <span
          className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}
        >
          Exchange
        </span>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: ReturnStatus) => {
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Completed') {
        return (
          <span
            className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}
          >
            Completed
          </span>
        );
      }
      if (value === 'Under Review') {
        return (
          <span
            className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}
          >
            Under Review
          </span>
        );
      }
      return (
        <span
          className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}
        >
          Pending
        </span>
      );
    },
  },
  {
    key: 'repairCost',
    label: 'Repair Cost',
    sortable: true,
    filterable: false,
    render: (value: number | undefined) => {
      if (!value)
        return <span className="text-gray-400 dark:text-gray-500">N/A</span>;
      return (
        <span className="font-medium text-red-600 dark:text-red-400">
          Rs.{' '}
          {value.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
];

const ReturnsPage: React.FC = () => {
  const router = useRouter();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update form state
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>('Pending');
  const [repairCost, setRepairCost] = useState<number | undefined>(undefined);
  const [inspectedBy, setInspectedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '500');
      params.set('sortBy', 'returnDate');
      params.set('sortOrder', 'desc');
      const res = await authFetch(`${API_BASE_URL}/returns?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message ?? 'Failed to load returns');
        setReturns([]);
        return;
      }
      const items = json?.data?.items ?? [];
      setReturns(items.map(mapApiReturnToReturn));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load returns');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  // Navigate to dedicated create page
  const handleCreateReturn = () => {
    router.push('/returns/create');
  };

  const handleViewReturn = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedReturn(null);
  };

  const handleEditReturn = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setReturnStatus(returnItem.status);
    setRepairCost(returnItem.repairCost);
    setInspectedBy(returnItem.inspectedBy);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedReturn(null);
    setReturnStatus('Pending');
    setRepairCost(undefined);
    setInspectedBy('');
  };

  const handleSubmitUpdate = async () => {
    if (!selectedReturn) return;

    setIsSubmitting(true);
    try {
      const notesParts: string[] = [`Status: ${returnStatus}.`];
      if (inspectedBy?.trim()) notesParts.push(`Inspected by: ${inspectedBy.trim()}.`);
      if (repairCost != null && repairCost >= 0) notesParts.push(`Repair cost: ${repairCost}.`);
      const existingNote = selectedReturn.damageNote?.trim();
      if (existingNote) notesParts.push(existingNote);
      const notes = notesParts.join(' ').trim();

      const res = await authFetch(`${API_BASE_URL}/returns/${selectedReturn.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json?.message ?? 'Failed to update return. Please try again.');
        return;
      }

      const updatedFromApi = json?.data ? mapApiReturnToReturn(json.data) : null;
      if (updatedFromApi) {
        setReturns((prev) =>
          prev.map((ret) => (ret.id === selectedReturn.id ? updatedFromApi : ret)),
        );
        setSelectedReturn(updatedFromApi);
      } else {
        const updatedReturn: Return = {
          ...selectedReturn,
          status: returnStatus,
          repairCost: repairCost,
          inspectedBy: inspectedBy || selectedReturn.inspectedBy,
        };
        setReturns((prev) =>
          prev.map((ret) => (ret.id === selectedReturn.id ? updatedReturn : ret)),
        );
      }
      alert('Return updated successfully.');
      handleCloseUpdateModal();
    } catch (err: any) {
      console.error('Error updating return:', err);
      alert(err?.message ?? 'Failed to update return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewReturn,
      tooltip: 'View Return',
      className:
        'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleEditReturn,
      tooltip: 'Edit Return',
      className:
        'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
  ];

  // Render Update Form
  const renderUpdateForm = () => {
    if (!selectedReturn) return null;

    return (
      <div className="space-y-6">
        {/* Return Information - Read Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Return Number
            </label>
            <input
              type="text"
              value={selectedReturn.returnNumber}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Machine Name
            </label>
            <input
              type="text"
              value={selectedReturn.machineName}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name
            </label>
            <input
              type="text"
              value={selectedReturn.customerName}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Return Date
            </label>
            <input
              type="text"
              value={new Date(selectedReturn.returnDate).toLocaleDateString(
                'en-LK',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Return Type
            </label>
            <input
              type="text"
              value={selectedReturn.returnType}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={returnStatus}
              onChange={(e) => setReturnStatus(e.target.value as ReturnStatus)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
            >
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {(selectedReturn.returnType === 'Damage' ||
            selectedReturn.returnType === 'Missing') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repair Cost (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={repairCost || ''}
                onChange={(e) =>
                  setRepairCost(
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="Enter repair cost"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Inspected By
            </label>
            <input
              type="text"
              value={inspectedBy}
              onChange={(e) => setInspectedBy(e.target.value)}
              placeholder="Enter inspector name"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Damage Note - Read Only if exists */}
        {(selectedReturn.returnType === 'Damage' ||
          selectedReturn.returnType === 'Missing') &&
          selectedReturn.damageNote && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedReturn.returnType === 'Damage'
                  ? 'Damage Note'
                  : 'Missing Parts Note'}
              </label>
              <textarea
                value={selectedReturn.damageNote}
                disabled
                rows={4}
                className="w-full px-4 py-3 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
              />
            </div>
          )}
      </div>
    );
  };

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
      <main
        className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Returns Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Quality control and inspection of returned machines.
              </p>
            </div>
            
          </div>

          {/* Loading / Error */}
          {error && !loading && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}
          <Table
            data={returns}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            loading={loading}
            onCreateClick={handleCreateReturn}
            createButtonLabel="Create Return"
            emptyMessage={loading ? 'Loading returns...' : 'No returns found.'}
          />
        </div>
      </main>

      {/* Update Return Modal */}
      {isUpdateModalOpen && selectedReturn && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Update Return
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Return Number: {selectedReturn.returnNumber}
                </p>
              </div>
              <button
                onClick={handleCloseUpdateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderUpdateForm()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleCloseUpdateModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced View Return Modal */}
      {isViewModalOpen && selectedReturn && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                 
                  Return Details
                </h2>
                
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
              <div className="space-y-6">
                {/* Return Information Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide flex items-center">
                      
                      Return Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          Return Number:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedReturn.returnNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          Return Date:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {new Date(
                            selectedReturn.returnDate,
                          ).toLocaleDateString('en-LK', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          Return Type:
                        </span>
                        <span className="ml-2">
                          {selectedReturn.returnType === 'Standard' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Standard
                            </span>
                          ) : selectedReturn.returnType === 'Damage' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Damage
                            </span>
                          ) : selectedReturn.returnType === 'Missing' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              Missing
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Exchange
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          Status:
                        </span>
                        <span className="ml-2">
                          {selectedReturn.status === 'Completed' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Completed
                            </span>
                          ) : selectedReturn.status === 'Under Review' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Under Review
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200">
                              Pending
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          Inspected By:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedReturn.inspectedBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide flex items-center">
                      
                      Customer Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          Customer Name:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedReturn.customerName}
                        </span>
                      </div>
                      {selectedReturn.rentalDetails && (
                        <>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Phone:
                            </span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {selectedReturn.rentalDetails.customerPhone}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Email:
                            </span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {selectedReturn.rentalDetails.customerEmail}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Machine Information Section */}
                {selectedReturn.machineDetails && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-4 flex items-center">
                      
                      Machine Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Machine Name:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Machine ID:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineId}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Model:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Serial Number:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.serialNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Manufacturer:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.manufacturer}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Year:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.year}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Category:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.category}
                        </span>
                      </div>
                      {selectedReturn.machineDetails.location && (
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 mr-1 mt-0.5 text-gray-500 dark:text-gray-400" />
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Location:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedReturn.machineDetails.location}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rental Information Section */}
                {selectedReturn.rentalDetails && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
                      
                      Rental Information
                    </h4>

                    <div className="space-y-4">
                      {/* Agreement Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Agreement Number:
                          </span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {selectedReturn.rentalDetails.agreementNumber}
                          </span>
                        </div>
                      </div>

                      {/* Rental Period */}
                      <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                          
                          Rental Period
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Start Date:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(
                                selectedReturn.rentalDetails.rentalStartDate,
                              ).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              End Date:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(
                                selectedReturn.rentalDetails.rentalEndDate,
                              ).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Rental Period:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedReturn.rentalDetails.rentalPeriod}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Expected Return:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(
                                selectedReturn.rentalDetails.expectedReturnDate,
                              ).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Dispatched Date:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(
                                selectedReturn.rentalDetails.dispatchedDate,
                              ).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                          
                          Financial Details
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Monthly Rate:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              Rs.{' '}
                              {selectedReturn.rentalDetails.monthlyRate.toLocaleString(
                                'en-LK',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Total Amount:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              Rs.{' '}
                              {selectedReturn.rentalDetails.totalAmount.toLocaleString(
                                'en-LK',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Paid Amount:
                            </span>
                            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                              Rs.{' '}
                              {selectedReturn.rentalDetails.paidAmount.toLocaleString(
                                'en-LK',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Outstanding:
                            </span>
                            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                              Rs.{' '}
                              {selectedReturn.rentalDetails.outstandingAmount.toLocaleString(
                                'en-LK',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Security Deposit:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              Rs.{' '}
                              {selectedReturn.rentalDetails.securityDeposit.toLocaleString(
                                'en-LK',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Damage/Missing Details Section */}
                {(selectedReturn.returnType === 'Damage' ||
                  selectedReturn.returnType === 'Missing') && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center">
                      <Camera className="w-5 h-5 mr-2" />
                      {selectedReturn.returnType === 'Damage'
                        ? 'Damage'
                        : 'Missing Parts'}{' '}
                      Details
                    </h4>
                    <div className="space-y-4">
                      {selectedReturn.damageNote && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Note:
                          </span>
                          <p className="mt-2 p-3 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                            {selectedReturn.damageNote}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {selectedReturn.photosCount && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Photos Attached:
                            </span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedReturn.photosCount} photo(s)
                            </span>
                          </div>
                        )}
                        {selectedReturn.repairCost && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">
                              Repair Cost:
                            </span>
                            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                              Rs.{' '}
                              {selectedReturn.repairCost.toLocaleString(
                                'en-LK',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;