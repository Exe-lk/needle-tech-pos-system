'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Script from 'next/script';
import Swal, { type SweetAlertResult } from 'sweetalert2';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { X, QrCode, Printer, History } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authFetch } from '@/lib/auth-client';

const API_BASE = '/api/v1';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';

interface MachineUnit {
  id: string;
  brand: string;
  model: string;
  type: MachineType;
  serialNumber: string;
  boxNumber: string;
}

const QRGeneratePage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [machineUnits, setMachineUnits] = useState<MachineUnit[]>([]);
  const [machineUnitsLoading, setMachineUnitsLoading] = useState(true);
  const [machineUnitsError, setMachineUnitsError] = useState<string | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<MachineUnit | null>(null);
  const [isBrowserPrintLoaded, setIsBrowserPrintLoaded] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const qrCodeRef = useRef<HTMLDivElement>(null);

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

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const getQRCodePayload = (machine: MachineUnit | null): string => {
    if (!machine) return '';
    return JSON.stringify({
      serialNumber: machine.serialNumber,
      boxNo: machine.boxNumber,
    });
  };

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

  const performPrint = (count: number) => {
    const m = selectedMachineForQR;
    if (!m) return;

    const zplString = getZPLForMachine(m.serialNumber, m.boxNumber);

    if (isBrowserPrintLoaded && selectedDevice && typeof selectedDevice.send === 'function') {
      let sent = 0;
      const sendNext = () => {
        if (sent >= count) return;
        selectedDevice.send(zplString, undefined, (err: string) => {
          if (err) console.error('Print error:', err);
          sent += 1;
          if (sent < count) sendNext();
        });
      };
      sendNext();
      return;
    }

    if (!qrCodeRef.current) return;
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const labelHtml = `
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
    `;
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
            .label { width: 464px; min-height: 320px; border: 2px solid #000; padding: 0; display: flex; flex-direction: column; page-break-after: always; }
            .label:last-child { page-break-after: auto; }
            .header { border-bottom: 3px solid #000; padding: 12px; text-align: center; font-weight: bold; font-size: 22px; }
            .body { display: flex; flex: 1; }
            .left { padding: 16px; }
            .right { flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
            .row { font-size: 14px; color: #333; }
            .row .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${Array(count).fill(labelHtml).join('')}
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  const handlePrintQR = () => {
    if (!selectedMachineForQR) return;

    Swal.fire({
      title: 'How many QR codes to print?',
      input: 'number',
      inputValue: 1,
      inputAttributes: {
        min: '1',
        max: '100',
        step: '1',
      },
      inputValidator: (value: string) => {
        const num = Number(value);
        if (Number.isNaN(num) || num < 1 || num > 100) {
          return 'Please enter a number between 1 and 100';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Print',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
    }).then((result: SweetAlertResult) => {
      if (result.isConfirmed && result.value !== undefined && result.value !== '') {
        const count = Math.min(100, Math.max(1, Math.floor(Number(result.value))));
        performPrint(count);
        Swal.fire({
          title: 'Printing',
          text: `Printing ${count} QR code label${count > 1 ? 's' : ''}...`,
          icon: 'info',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  };

  const tableColumns: TableColumn[] = [
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

  const handleViewQRPrintHistory = (_row: MachineUnit) => {
    // Upcoming feature: QR printing history
    alert('View QR Printing History — Coming soon');
  };

  const tableActions: ActionButton[] = [
    {
      label: '',
      icon: <QrCode className="w-4 h-4" />,
      variant: 'secondary',
      onClick: (row: MachineUnit) => handleGenerateQR(row),
      tooltip: 'Generate QR Code',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <History className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewQRPrintHistory,
      tooltip: 'View QR Printing History (Coming soon)',
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
      <Navbar onMenuClick={handleMenuClick} />
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              QR Code Generate
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View all machines and generate or print QR labels. Use the action on each row to open the label preview and print (Zebra or browser).
            </p>
          </div>

          {machineUnitsError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{machineUnitsError}</p>
              <button
                type="button"
                onClick={() => fetchMachineUnits()}
                className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {machineUnitsLoading ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">Loading machines...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Inventory Details
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  All machines ({machineUnits.length} total). Click Generate QR Code to preview and print.
                </p>
              </div>
              <div className="p-6">
                <Table
                  data={machineUnits}
                  columns={tableColumns}
                  actions={tableActions}
                  itemsPerPage={10}
                  searchable
                  filterable
                  emptyMessage="No machines found."
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal - same as inventory: label preview, printer select, Print */}
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

export default QRGeneratePage;
