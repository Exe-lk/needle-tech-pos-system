'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Tooltip from '@/src/components/common/tooltip';
import QRScannerComponent from '@/src/components/qr-scanner';
import {
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Minimize2,
  QrCode,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  Truck,
  User,
  FileText,
  XCircle,
  ListOrdered,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GatePassItem {
  id: string;
  description: string;
  status: string;
  serialNo: string;
  motorBoxNo: string;
}

interface GatePass {
  id: number;
  gatepassNo: string;
  agreementReference: string;
  dateOfIssue: string;
  returnable: boolean;
  entry: 'IN' | 'OUT';
  from: string;
  to: string;
  toAddress: string;
  vehicleNumber: string;
  driverName: string;
  items: GatePassItem[];
  issuedBy?: string;
  receivedBy?: string;
}

type ScanResultType = 'success' | 'failed' | 'duplicate';

interface SecurityScanLogItem {
  id: string;
  raw: string;
  extractedSerial: string;
  extractedBox: string;
  result: ScanResultType;
  reason: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Mock data (align with main gatepass page – gatepassNo as 6-digit)
// ---------------------------------------------------------------------------

const MOCK_GATE_PASSES: GatePass[] = [
  {
    id: 1,
    gatepassNo: '016633',
    agreementReference: 'RA-2024-001',
    dateOfIssue: '2024-01-20',
    returnable: true,
    entry: 'OUT',
    from: 'Needle Technologies',
    to: 'ABC Holdings (Pvt) Ltd',
    toAddress: '123 Main Street, Colombo 05',
    vehicleNumber: 'ABC-1234',
    driverName: 'Nimal Perera',
    items: [
      { id: '1', description: 'JUKI LX-1903A-SS - ELECTRONIC BAR TACK MACHINE', status: 'GOOD', serialNo: '2LIDH01733', motorBoxNo: 'NMBDH01171' },
      { id: '2', description: 'JUKI DDL-8700 - HIGH-SPEED LOCKSTITCH MACHINE', status: 'GOOD', serialNo: '2LIDH01734', motorBoxNo: 'NMBDH01172' },
      { id: '3', description: 'BROTHER DB2-B755-403 - OVERLOCK MACHINE', status: 'FAIR', serialNo: 'BR-2024-001', motorBoxNo: 'BOX-2024-001' },
      { id: '4', description: 'SINGER 4423 - HEAVY DUTY SEWING MACHINE', status: 'GOOD', serialNo: 'SG-2024-001', motorBoxNo: 'BOX-2024-002' },
      { id: '5', description: 'JUKI MO-2516 - OVERLOCK MACHINE', status: 'GOOD', serialNo: '2LIDH01735', motorBoxNo: 'NMBDH01173' },
    ],
    issuedBy: 'Admin User',
    receivedBy: 'Nimal Perera',
  },
  {
    id: 2,
    gatepassNo: '016634',
    agreementReference: 'RA-2024-002',
    dateOfIssue: '2024-03-05',
    returnable: false,
    entry: 'OUT',
    from: 'Needle Technologies',
    to: 'John Perera',
    toAddress: '456 Galle Road, Mount Lavinia',
    vehicleNumber: 'XYZ-5678',
    driverName: 'Kamal Silva',
    items: [
      { id: '1', description: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE', status: 'GOOD', serialNo: 'BR-2024-002', motorBoxNo: 'BOX-2024-003' },
      { id: '2', description: 'JUKI DDL-5550N - INDUSTRIAL SEWING MACHINE', status: 'GOOD', serialNo: '2LIDH01736', motorBoxNo: 'NMBDH01174' },
      { id: '3', description: 'SINGER 9960 - QUANTUM STYLIST MACHINE', status: 'GOOD', serialNo: 'SG-2024-002', motorBoxNo: 'BOX-2024-004' },
      { id: '4', description: 'BROTHER DB2-B755-403 - OVERLOCK MACHINE', status: 'FAIR', serialNo: 'BR-2024-003', motorBoxNo: 'BOX-2024-005' },
      { id: '5', description: 'JUKI MO-6700S - OVERLOCK MACHINE', status: 'GOOD', serialNo: '2LIDH01737', motorBoxNo: 'NMBDH01175' },
    ],
    issuedBy: 'Admin User',
  },
];

// ---------------------------------------------------------------------------
// Helpers: QR parsing & normalization
// ---------------------------------------------------------------------------

function pairKey(serial: string, box: string): string {
  return `${normalizeSerial(serial)}|${normalizeSerial(box)}`;
}

function normalizeSerial(input: string): string {
  return (input || '').trim().toUpperCase();
}

function extractSerialAndBoxFromQR(decodedText: string): { serial: string; box: string } | null {
  const raw = (decodedText || '').trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const serialCandidates = [
        parsed.serialNo,
        parsed.serialNO,
        parsed.serial,
        parsed.serialNumber,
        parsed.SerialNo,
        parsed.Serial,
        parsed.machineSerial,
        parsed.machineSerialNo,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 0);
      const boxCandidates = [
        parsed.motorBoxNo,
        parsed.boxNo,
        parsed.boxNumber,
        parsed.MotorBoxNo,
        parsed.BoxNo,
        parsed.box,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 0);
      const serial = serialCandidates.length > 0 ? (serialCandidates[0] as string).trim() : '';
      const box = boxCandidates.length > 0 ? (boxCandidates[0] as string).trim() : '';
      if (serial || box) return { serial, box: box || '' };
    }
  } catch {
    // ignore
  }

  const serialMatch = raw.match(/serial\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const boxMatch = raw.match(/(?:motor)?\s*box\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const serial = serialMatch ? serialMatch[2].trim() : '';
  const box = boxMatch ? boxMatch[2].trim() : '';
  if (serial || box) return { serial, box: box || '' };

  return null;
}

/** Normalize user input for gatepass lookup: accept 016633, 16633, GP24026633, etc. */
function normalizeGatePassInput(input: string): string {
  const t = (input || '').trim();
  if (!t) return '';
  const digitsOnly = t.replace(/\D/g, '');
  if (digitsOnly.length >= 6) return digitsOnly.slice(-6);
  return digitsOnly.padStart(6, '0');
}

function findGatePassByNumber(input: string): GatePass | undefined {
  const normalized = normalizeGatePassInput(input);
  if (!normalized) return undefined;
  return MOCK_GATE_PASSES.find(
    (g) =>
      normalizeGatePassInput(g.gatepassNo) === normalized ||
      g.gatepassNo === input.trim() ||
      g.gatepassNo === input.trim().toUpperCase()
  );
}

// ---------------------------------------------------------------------------
// Breakpoints (for responsive logic)
// ---------------------------------------------------------------------------

const BP_NARROW = 640;
const BP_MOBILE_SCANNER_FULL = 480;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GatePassQRPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [gatePassNumberInput, setGatePassNumberInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [gatePass, setGatePass] = useState<GatePass | null>(null);

  const [scannerKey, setScannerKey] = useState(1);
  const [scanLog, setScanLog] = useState<SecurityScanLogItem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  /** Only real mismatches block approval; duplicate does not */
  const [mismatchCount, setMismatchCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{
    type: ScanResultType;
    title: string;
    message: string;
  } | null>(null);
  const [isScannerExpanded, setIsScannerExpanded] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isNarrow = viewportWidth < BP_NARROW;
  const isVerySmall = viewportWidth < BP_MOBILE_SCANNER_FULL;

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (step === 2 && isNarrow) setIsScannerExpanded(true);
  }, [step, isNarrow]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const expectedPairs = useMemo(() => {
    if (!gatePass) return new Set<string>();
    const s = new Set<string>();
    for (const item of gatePass.items || []) {
      const key = pairKey(item.serialNo, item.motorBoxNo);
      if (key !== '|') s.add(key);
    }
    return s;
  }, [gatePass]);

  /** Failed/mismatched scans only – SO can see exactly which QR(s) did not match */
  const failedScans = useMemo(
    () => scanLog.filter((s) => s.result === 'failed'),
    [scanLog]
  );

  /** Scan log in chronological order (first scan = index 0) so "Scan 6" = 6th scan */
  const scanLogInOrder = useMemo(() => [...scanLog].reverse(), [scanLog]);

  const [scanHistoryExpanded, setScanHistoryExpanded] = useState(true);

  const expectedPairCount = expectedPairs.size;
  const matchedCount = matchedPairs.size;
  const allMatched = expectedPairCount > 0 && matchedCount === expectedPairCount;
  const canApprove = allMatched && mismatchCount === 0;

  const resetScanSession = useCallback(() => {
    setScannerKey((k) => k + 1);
    setScanLog([]);
    setMatchedPairs(new Set());
    setMismatchCount(0);
    setLastFeedback(null);
    setIsScannerVisible(false);
  }, []);

  const handleContinueFromStep1 = () => {
    const trimmed = gatePassNumberInput.trim();
    if (!trimmed) {
      setLookupError('Please enter a gatepass number.');
      return;
    }
    const found = findGatePassByNumber(trimmed);
    if (!found) {
      setLookupError('Gatepass not found. Please check the number.');
      return;
    }
    setLookupError(null);
    setGatePass(found);
    setStep(2);
    resetScanSession();
    setDetailsExpanded(true);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setGatePassNumberInput('');
    setLookupError(null);
    setGatePass(null);
    setIsScannerExpanded(false);
    setIsScannerVisible(false);
    resetScanSession();
  };

  const showFeedback = (fb: { type: ScanResultType; title: string; message: string }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
  };

  const restartScannerSoon = () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => setScannerKey((k) => k + 1), 450);
  };

  const handleScanSuccess = (decodedText: string) => {
    if (!gatePass) return;

    const parsed = extractSerialAndBoxFromQR(decodedText);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (!parsed || (!parsed.serial && !parsed.box)) {
      setMismatchCount((c) => c + 1);
      setScanLog((prev) => [
        {
          id,
          raw: decodedText,
          extractedSerial: parsed?.serial ?? '',
          extractedBox: parsed?.box ?? '',
          result: 'failed',
          reason: 'Could not extract serial number and box number from QR',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      showFeedback({
        type: 'failed',
        title: 'Scan Failed',
        message: 'QR must contain serial number and box number.',
      });
      restartScannerSoon();
      return;
    }

    const serial = normalizeSerial(parsed.serial);
    const box = normalizeSerial(parsed.box);
    const key = pairKey(parsed.serial, parsed.box);

    if (!expectedPairs.has(key)) {
      setMismatchCount((c) => c + 1);
      setScanLog((prev) => [
        {
          id,
          raw: decodedText,
          extractedSerial: parsed.serial,
          extractedBox: parsed.box,
          result: 'failed',
          reason: 'Serial/Box pair not found on this gatepass',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      showFeedback({
        type: 'failed',
        title: 'Not Matched',
        message: `Serial ${serial} / Box ${box} is not on this gatepass.`,
      });
      restartScannerSoon();
      return;
    }

    if (matchedPairs.has(key)) {
      setScanLog((prev) => [
        {
          id,
          raw: decodedText,
          extractedSerial: parsed.serial,
          extractedBox: parsed.box,
          result: 'duplicate',
          reason: 'This serial/box pair was already verified',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      showFeedback({
        type: 'duplicate',
        title: 'Already Verified',
        message: `${serial} / ${box} was already scanned. Scan the next machine.`,
      });
      restartScannerSoon();
      return;
    }

    setMatchedPairs((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setScanLog((prev) => [
      {
        id,
        raw: decodedText,
        extractedSerial: parsed.serial,
        extractedBox: parsed.box,
        result: 'success',
        reason: 'Matched with gatepass',
        timestamp: new Date(),
      },
      ...prev,
    ]);
    showFeedback({
      type: 'success',
      title: 'Matched',
      message: `${serial} / ${box} verified. Scan next machine.`,
    });
    restartScannerSoon();
  };

  const handleApproveGatePass = () => {
    if (!gatePass) return;
    if (!canApprove) {
      alert(
        'Cannot approve: Scan and verify all machines on this gatepass. Any mismatch must be resolved first.'
      );
      return;
    }
    alert(`Gate Pass ${gatePass.gatepassNo} approved by Security Officer (frontend only).`);
    handleBackToStep1();
  };

  const renderFeedback = () => {
    if (!lastFeedback) return null;
    const styles =
      lastFeedback.type === 'success'
        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
        : lastFeedback.type === 'duplicate'
          ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200'
          : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200';
    return (
      <div
        className={`p-3 sm:p-4 rounded-xl border-2 ${styles} shadow-lg animate-in fade-in duration-200`}
        role="status"
        aria-live="polite"
      >
        <div className="font-semibold text-sm sm:text-base">{lastFeedback.title}</div>
        <div className="text-xs sm:text-sm mt-1 opacity-90">{lastFeedback.message}</div>
      </div>
    );
  };

  const isItemVerified = useCallback(
    (item: GatePassItem) => matchedPairs.has(pairKey(item.serialNo, item.motorBoxNo)),
    [matchedPairs]
  );

  return (
    <div
      className="min-h-0 w-full bg-gray-100 dark:bg-slate-950 overflow-x-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <Navbar />

      <main
        className="w-full min-h-0"
        style={{
          paddingTop: 'calc(6rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-3 sm:px-4 md:px-6 max-w-3xl mx-auto">
          <div className="space-y-4 sm:space-y-5">
            {/* Page title */}
            <div className="max-w-2xl">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
               
                Security Officer Verification
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {step === 1
                  ? 'Enter gatepass number to view agreement details, then scan each machine QR.'
                  : 'Verify each machine by scanning its QR. When all match, approve the gate pass.'}
              </p>
            </div>

            {step === 1 ? (
              /* Step 1: Enter gatepass number */
              <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-4">
                  <label
                    htmlFor="gatepass-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Gatepass number
                  </label>
                  <input
                    id="gatepass-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={gatePassNumberInput}
                    onChange={(e) => {
                      setGatePassNumberInput(e.target.value);
                      setLookupError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleContinueFromStep1()}
                    placeholder="e.g. 016633"
                    className="w-full min-h-[48px] sm:min-h-[52px] px-4 py-3 text-base border rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-indigo-500 touch-manipulation"
                    autoFocus
                  />
                  {lookupError && (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                      {lookupError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleContinueFromStep1}
                    className="w-full min-h-[48px] sm:min-h-[52px] px-4 py-3 text-base font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-xl hover:bg-blue-700 dark:hover:bg-indigo-700 active:scale-[0.98] transition-transform touch-manipulation"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : gatePass ? (
              /* Step 2: Agreement details + Scan QR flow */
              <div className="flex flex-col w-full gap-4">
                {/* Top: Gatepass ref + actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    Gatepass: {gatePass.gatepassNo}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tooltip content="Clear scans and start over (same gatepass)">
                      <button
                        type="button"
                        onClick={resetScanSession}
                        className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
                      >
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline">Reset scans</span>
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      onClick={handleBackToStep1}
                      className="min-h-[44px] px-3 sm:px-4 py-2 bg-gray-100 dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] touch-manipulation"
                    >
                      Change gatepass
                    </button>
                  </div>
                </div>

                {/* Failed scans – SO sees exactly which QR(s) did not match (during and after scanning) */}
                {failedScans.length > 0 && (
                  <div
                    className="rounded-xl sm:rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 shadow-sm"
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                      <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">
                        Failed scans ({failedScans.length}) — cannot approve until resolved
                      </h2>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                      These QR codes did not match this gatepass. Check the machine or QR and rescan the correct one.
                    </p>
                    <ul className="space-y-2 min-h-0 sm:max-h-[min(200px,35vh)] sm:overflow-y-auto sm:overscroll-contain overscroll-contain -webkit-overflow-scrolling-touch">
                      {failedScans.map((entry, idx) => (
                        <li
                          key={entry.id}
                          className="flex items-start gap-2 py-2 px-3 rounded-lg bg-white dark:bg-slate-800/80 border border-red-200 dark:border-red-800/60 text-left"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-xs font-semibold text-red-700 dark:text-red-300">
                            {failedScans.length - idx}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                              Serial: {entry.extractedSerial || '—'} · Box: {entry.extractedBox || '—'}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{entry.reason}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Agreement / Gatepass details card – collapsible on mobile */}
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDetailsExpanded((e) => !e)}
                    className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors touch-manipulation min-h-[44px]"
                    aria-expanded={detailsExpanded}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Agreement & gatepass details
                    </span>
                    {detailsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  {detailsExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs sm:text-sm">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Agreement</span>
                            <p className="font-medium text-gray-900 dark:text-white break-words">{gatePass.agreementReference}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">To / Driver</span>
                            <p className="font-medium text-gray-900 dark:text-white break-words">{gatePass.to} · {gatePass.driverName}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <Truck className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-gray-500 dark:text-gray-400">Address · Vehicle</span>
                            <p className="font-medium text-gray-900 dark:text-white break-words">{gatePass.toAddress} · {gatePass.vehicleNumber}</p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Machines on this gatepass (scan each QR)</p>
                        <ul className="space-y-2 min-h-0 sm:max-h-[min(240px,40vh)] sm:overflow-y-auto sm:overscroll-contain overscroll-contain -webkit-overflow-scrolling-touch">
                          {gatePass.items.map((item) => {
                            const verified = isItemVerified(item);
                            return (
                              <li
                                key={item.id}
                                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-xs sm:text-sm ${
                                  verified
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                                }`}
                              >
                                {verified ? (
                                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{item.description}</p>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                                    Serial: {item.serialNo} · Box: {item.motorBoxNo}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scan history – SO sees scan order (Scan 1, 2, … 10) and which one failed */}
                {scanLogInOrder.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setScanHistoryExpanded((e) => !e)}
                      className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors touch-manipulation min-h-[44px]"
                      aria-expanded={scanHistoryExpanded}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                        <ListOrdered className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Scan history ({scanLogInOrder.length})
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {matchedCount} verified · {failedScans.length} failed
                        {(scanLogInOrder.filter((s) => s.result === 'duplicate').length > 0) &&
                          ` · ${scanLogInOrder.filter((s) => s.result === 'duplicate').length} duplicate`}
                      </span>
                      {scanHistoryExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                      )}
                    </button>
                    {scanHistoryExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 pt-3 mb-2">
                          Order of scans (Scan 1 = first scan, Scan 6 = 6th scan, etc.). Use this to see which machine had a failed QR.
                        </p>
                        <ul className="space-y-2 min-h-0 sm:max-h-[min(280px,45vh)] sm:overflow-y-auto sm:overscroll-contain overscroll-contain -webkit-overflow-scrolling-touch">
                          {scanLogInOrder.map((entry, idx) => {
                            const scanNumber = idx + 1;
                            const isSuccess = entry.result === 'success';
                            const isFailed = entry.result === 'failed';
                            const isDuplicate = entry.result === 'duplicate';
                            return (
                              <li
                                key={entry.id}
                                className={`flex items-start gap-2 py-2 px-3 rounded-lg border text-left ${
                                  isSuccess
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                    : isFailed
                                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                <span
                                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    isSuccess
                                      ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                                      : isFailed
                                        ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                                        : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                                  }`}
                                >
                                  {scanNumber}
                                </span>
                                <div className="min-w-0 flex-1">
                                  {isSuccess && (
                                    <>
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        Matched
                                      </span>
                                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                        Serial: {entry.extractedSerial} · Box: {entry.extractedBox}
                                      </p>
                                    </>
                                  )}
                                  {isFailed && (
                                    <>
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300">
                                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                                        Not on gatepass
                                      </span>
                                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                        Scanned: Serial {entry.extractedSerial || '—'} · Box {entry.extractedBox || '—'}
                                      </p>
                                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{entry.reason}</p>
                                    </>
                                  )}
                                  {isDuplicate && (
                                    <>
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                        Already verified
                                      </span>
                                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                        Serial: {entry.extractedSerial} · Box: {entry.extractedBox}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback toast */}
                {lastFeedback && <div>{renderFeedback()}</div>}

                {/* Scan QR: button to show scanner, or inline scanner */}
                {!isScannerVisible ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsScannerVisible(true);
                      setScannerKey((k) => k + 1);
                    }}
                    className="w-full min-h-[52px] sm:min-h-[48px] px-4 py-3 rounded-xl text-base sm:text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 active:scale-[0.98] transition-transform touch-manipulation flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-5 h-5 sm:w-4 sm:h-4" />
                    Scan QR
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan each machine QR</span>
                      <div className="flex items-center gap-2">
                        {!isVerySmall && (
                          <Tooltip content={isScannerExpanded ? 'Collapse scanner' : 'Expand scanner'}>
                            <button
                              type="button"
                              onClick={() => setIsScannerExpanded((prev) => !prev)}
                              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation"
                              aria-label={isScannerExpanded ? 'Collapse scanner' : 'Expand scanner'}
                            >
                              {isScannerExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                            </button>
                          </Tooltip>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsScannerVisible(false);
                          }}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 touch-manipulation"
                        >
                          Close scanner
                        </button>
                      </div>
                    </div>
                    <div className="w-full rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-900 dark:bg-black shadow-inner">
                      <div
                        className={
                          isScannerExpanded || isNarrow
                            ? 'min-h-[min(70dvh,520px)] h-[min(70dvh,520px)]'
                            : 'min-h-[min(50dvh,380px)] h-[min(50dvh,380px)]'
                        }
                      >
                        <QRScannerComponent
                          key={scannerKey}
                          onScanSuccess={handleScanSuccess}
                          autoClose={false}
                          showCloseButton={false}
                          title="Scan machine QR"
                          subtitle={
                            canApprove
                              ? 'All matched — you can approve below'
                              : mismatchCount > 0
                                ? `${matchedCount}/${expectedPairCount} verified · Mismatch detected`
                                : `${matchedCount}/${expectedPairCount} verified`
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Status message */}
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left min-h-[1.25rem]" role="status">
                  {canApprove ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      All machines matched. You can approve the gate pass.
                    </span>
                  ) : mismatchCount > 0 ? (
                    <span className="text-red-600 dark:text-red-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      A scan did not match this gatepass. Resolve or reset before approving.
                    </span>
                  ) : (
                    <span>Scan every machine QR one by one. Order does not matter.</span>
                  )}
                </p>

                {/* Approve: in-flow on mobile (single scroll), sticky on sm+ */}
                <div
                  className="pt-4 pb-4 sm:pt-5 sm:pb-0 sm:sticky sm:bottom-0 left-0 right-0 z-10 bg-gray-100 dark:bg-slate-950 -mx-3 px-3 sm:mx-0 sm:px-0 sm:bg-transparent border-t border-gray-200 dark:border-slate-800 sm:border-0"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  <button
                    type="button"
                    onClick={handleApproveGatePass}
                    disabled={!canApprove}
                    className={`w-full min-h-[52px] sm:min-h-[48px] px-5 py-3 rounded-xl text-base sm:text-sm font-medium text-white flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] transition-transform ${
                      canApprove
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20'
                        : 'bg-gray-400 cursor-not-allowed dark:bg-slate-600'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                    Approve Gate Pass
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GatePassQRPage;
