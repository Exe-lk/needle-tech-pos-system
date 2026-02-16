'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, Pencil } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { authFetch } from '@/lib/auth-client';

type AlertType = 'Payment Overdue' | 'High Balance' | 'Credit Limit Exceeded' | 'Agreement Expiring';
type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
type AlertStatus = 'Active' | 'Resolved';

interface OutstandingAlert {
  id: string;
  customerId: string;
  customerName: string;
  customerType: 'Company' | 'Individual';
  alertType: AlertType;
  description: string;
  amount: number | null;
  dueDate: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string | null;
  relatedAgreement?: string | null;
  relatedMachine?: string | null;
  daysOverdue?: number | null;
}

const API_BASE_URL = '/api/v1';

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'customerName',
    label: 'Customer Name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'customerType',
    label: 'Customer Type',
    sortable: true,
    filterable: true,
    render: (value: string) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      return (
        <span className={`${base} ${
          value === 'Company'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        }`}>
          {value}
        </span>
      );
    },
  },
  {
    key: 'alertType',
    label: 'Alert Type',
    sortable: true,
    filterable: true,
    render: (value: AlertType) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      const styles: Record<AlertType, string> = {
        'Payment Overdue': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        'High Balance': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        'Credit Limit Exceeded': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        'Agreement Expiring': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      };
      return (
        <span className={`${base} ${styles[value]}`}>
          {value}
        </span>
      );
    },
  },
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    filterable: false,
    render: (value: number | null) => (
      value != null && value > 0 ? (
        <span className="font-medium text-red-600 dark:text-red-400">
          Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ) : (
        <span className="text-gray-500 dark:text-gray-400">N/A</span>
      )
    ),
  },
  {
    key: 'dueDate',
    label: 'Due Date',
    sortable: true,
    filterable: false,
    render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
  },
  {
    key: 'severity',
    label: 'Severity',
    sortable: true,
    filterable: true,
    render: (value: AlertSeverity) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      const styles: Record<AlertSeverity, string> = {
        Critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      };
      return (
        <span className={`${base} ${styles[value]}`}>
          {value}
        </span>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: AlertStatus) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Resolved') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Resolved
          </span>
        );
      }
      return (
        <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
          Active
        </span>
      );
    },
  },
];

const OutstandingAlertsPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<OutstandingAlert | null>(null);
  const [alerts, setAlerts] = useState<OutstandingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form state
  const [alertStatus, setAlertStatus] = useState<AlertStatus>('Active');

  const fetchAlerts = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '100');
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');
      const res = await authFetch(`${API_BASE_URL}/outstanding-alerts?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message ?? 'Failed to fetch outstanding alerts');
      }

      const items = json?.data?.items;
      const list = (items?.outstandingAlerts ?? (Array.isArray(items) ? items : [])) as OutstandingAlert[];
      setAlerts(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load outstanding alerts';
      setError(message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleViewAlert = (alert: OutstandingAlert) => {
    setSelectedAlert(alert);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedAlert(null);
  };

  const handleEditAlert = (alert: OutstandingAlert) => {
    setSelectedAlert(alert);
    setAlertStatus(alert.status);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedAlert(null);
    setAlertStatus('Active');
  };

  const handleSubmitUpdate = async () => {
    if (!selectedAlert) return;

    setIsSubmitting(true);
    try {
      const body: { status: string; resolvedAt?: string } = { status: alertStatus };
      if (alertStatus === 'Resolved' && !selectedAlert.resolvedAt) {
        body.resolvedAt = new Date().toISOString();
      } else if (alertStatus === 'Active') {
        body.resolvedAt = undefined;
      }

      const res = await authFetch(`${API_BASE_URL}/outstanding-alerts/${selectedAlert.id}`, {
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message ?? 'Failed to update alert');
      }

      await fetchAlerts();
      handleCloseUpdateModal();
      alert('Alert status updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update alert. Please try again.';
      console.error('Error updating alert:', err);
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRowClassName = (alert: OutstandingAlert) => {
    if (alert.status === 'Resolved') return 'bg-green-50/60 dark:bg-green-950/20';
    if (alert.severity === 'Critical') return 'bg-red-50/60 dark:bg-red-950/40';
    if (alert.severity === 'High') return 'bg-orange-50/60 dark:bg-orange-950/30';
    return '';
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewAlert,
      tooltip: 'View Alert',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleEditAlert,
      tooltip: 'Edit Alert',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
  ];

  // Render Update Form
  const renderUpdateForm = () => {
    if (!selectedAlert) return null;

    return (
      <div className="space-y-6">
        {/* Alert Information - Read Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name
            </label>
            <input
              type="text"
              value={selectedAlert.customerName}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Type
            </label>
            <input
              type="text"
              value={selectedAlert.customerType}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alert Type
            </label>
            <input
              type="text"
              value={selectedAlert.alertType}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity
            </label>
            <input
              type="text"
              value={selectedAlert.severity}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="text"
              value={selectedAlert.amount != null && selectedAlert.amount > 0
                ? `Rs. ${selectedAlert.amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'N/A'}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="text"
              value={new Date(selectedAlert.dueDate).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Created At
            </label>
            <input
              type="text"
              value={new Date(selectedAlert.createdAt).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          {selectedAlert.resolvedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resolved At
              </label>
              <input
                type="text"
                value={new Date(selectedAlert.resolvedAt).toLocaleDateString('en-LK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={alertStatus}
              onChange={(e) => setAlertStatus(e.target.value as AlertStatus)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Description - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={selectedAlert.description}
            disabled
            rows={4}
            className="w-full px-4 py-3 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
          />
        </div>

        {/* Related Information - Read Only */}
        {(selectedAlert.relatedAgreement || selectedAlert.relatedMachine) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedAlert.relatedAgreement && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agreement Number
                </label>
                <input
                  type="text"
                  value={selectedAlert.relatedAgreement}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
                />
              </div>
            )}
            {selectedAlert.relatedMachine && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Machine
                </label>
                <input
                  type="text"
                  value={selectedAlert.relatedMachine}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
                />
              </div>
            )}
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
      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Outstanding Alerts
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all outstanding alerts across all customers with their severity and status.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Alerts table card */}
          <Table
            data={alerts}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            loading={loading}
            getRowClassName={getRowClassName}
            emptyMessage="No outstanding alerts found."
          />
        </div>
      </main>

      {/* Update Alert Modal */}
      {isUpdateModalOpen && selectedAlert && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Update Alert</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Alert ID: {selectedAlert.id} - {selectedAlert.alertType}
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
                {isSubmitting ? 'Updating...' : 'Update Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Alert Details Modal */}
      {isViewModalOpen && selectedAlert && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Alert Details
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
                {/* Alert Type & Severity / Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {selectedAlert.alertType}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedAlert.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        Severity :
                      </span>
                      <span
                        className={`font-semibold ${
                          selectedAlert.severity === 'Critical'
                            ? 'text-red-700 dark:text-red-300'
                            : selectedAlert.severity === 'High'
                            ? 'text-orange-700 dark:text-orange-300'
                            : selectedAlert.severity === 'Medium'
                            ? 'text-yellow-700 dark:text-yellow-300'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {selectedAlert.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        Status:
                      </span>
                      <span
                        className={`font-semibold ${
                          selectedAlert.status === 'Resolved'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        {selectedAlert.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {selectedAlert.customerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Customer Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {selectedAlert.customerType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Customer ID:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        #{selectedAlert.customerId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alert Details */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                    Alert Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Alert Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {selectedAlert.alertType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {selectedAlert.amount != null && selectedAlert.amount > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            Rs. {selectedAlert.amount.toLocaleString('en-LK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">N/A</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {new Date(selectedAlert.dueDate).toLocaleDateString('en-LK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {selectedAlert.daysOverdue !== undefined && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Days Overdue:</span>
                        <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                          {selectedAlert.daysOverdue} days
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Created At:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {new Date(selectedAlert.createdAt).toLocaleDateString('en-LK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {selectedAlert.resolvedAt && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Resolved At:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {new Date(selectedAlert.resolvedAt).toLocaleDateString('en-LK', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Information */}
                {(selectedAlert.relatedAgreement || selectedAlert.relatedMachine) && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                      Related Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {selectedAlert.relatedAgreement && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Agreement Number:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            {selectedAlert.relatedAgreement}
                          </span>
                        </div>
                      )}
                      {selectedAlert.relatedMachine && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Machine:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            {selectedAlert.relatedMachine}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                    Description
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedAlert.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={handleCloseViewModal}
                className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-slate-500 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstandingAlertsPage;