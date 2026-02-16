'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import QRScannerComponent from '@/src/components/qr-scanner';
import {
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  QrCode,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Truck,
  User,
  FileText,
  XCircle,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { authFetch } from '@/lib/auth-client';

const API_BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Types (aligned with /api/v1/gate-passes/by-number response)
// ---------------------------------------------------------------------------

interface GatePassItem {
  id: string;
  description: string;
  status: string;
  serialNo: string;
  motorBoxNo: string;
}

interface GatePass {
  id: string;
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

/** Shown in popup after each scan: minimal info + Next to continue */
interface ScanResultPopupData {
  serial: string;
  box: string;
  result: ScanResultType;
}

interface SecurityScanLogItem {
  id: string;
  raw: string;
  extractedSerial: string;
  extractedBox: string;
  result: ScanResultType;
  reason: string;
  timestamp: Date;
  /** For failed scans: whether this mismatch is still blocking approval */
  blocking: boolean;
}

// Step 2 sub-flow: action menu, details, or scan
type Step2Mode = 'menu' | 'details' | 'scan';

// ---------------------------------------------------------------------------
// Helpers: QR parsing & normalization
// ---------------------------------------------------------------------------

function normalizeSerial(input: string): string {
  return (input || '').trim().toUpperCase();
}

function pairKey(serial: string, box: string): string {
  return `${normalizeSerial(serial)}|${normalizeSerial(box)}`;
}

function extractSerialAndBoxFromQR(
  decodedText: string
): { serial: string; box: string } | null {
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
      ].filter(
        (v: unknown) =>
          typeof v === 'string' && (v as string).trim().length > 0
      );
      const boxCandidates = [
        parsed.motorBoxNo,
        parsed.boxNo,
        parsed.boxNumber,
        parsed.MotorBoxNo,
        parsed.BoxNo,
        parsed.box,
      ].filter(
        (v: unknown) =>
          typeof v === 'string' && (v as string).trim().length > 0
      );
      const serial =
        serialCandidates.length > 0
          ? (serialCandidates[0] as string).trim()
          : '';
      const box =
        boxCandidates.length > 0 ? (boxCandidates[0] as string).trim() : '';
      if (serial || box) return { serial, box: box || '' };
    }
  } catch {
    // ignore
  }

  const serialMatch = raw.match(
    /serial\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i
  );
  const boxMatch = raw.match(
    /(?:motor)?\s*box\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i
  );
  const serial = serialMatch ? serialMatch[2].trim() : '';
  const box = boxMatch ? boxMatch[2].trim() : '';
  if (serial || box) return { serial, box: box || '' };

  return null;
}

/** Normalize user input for display / API: accept 016633, 16633, etc. */
function normalizeGatePassInput(input: string): string {
  const t = (input || '').trim();
  if (!t) return '';
  const digitsOnly = t.replace(/\D/g, '');
  if (digitsOnly.length >= 6) return digitsOnly.slice(-6);
  return digitsOnly.padStart(6, '0');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GatePassQRPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [gatePassNumberInput, setGatePassNumberInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [gatePass, setGatePass] = useState<GatePass | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Step 2 sub-flow
  const [mode, setMode] = useState<Step2Mode>('menu');

  const [scannerKey, setScannerKey] = useState(1);
  const [scanLog, setScanLog] = useState<SecurityScanLogItem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  /** Historical count of mismatches (for analytics / display) */
  const [mismatchCount, setMismatchCount] = useState(0);
  /** Popup after each scan: serial, box, result, user clicks Next to continue */
  const [scanResultPopup, setScanResultPopup] =
    useState<ScanResultPopupData | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [scanHistoryExpanded, setScanHistoryExpanded] = useState(false);

  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let shouldBeDark = savedTheme === 'dark' || (savedTheme !== 'light' && systemPrefersDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const expectedPairs = useMemo(() => {
    if (!gatePass) return new Set<string>();
    const s = new Set<string>();
    for (const item of gatePass.items || []) {
      const key = pairKey(item.serialNo, item.motorBoxNo);
      if (key !== '|') s.add(key);
    }
    return s;
  }, [gatePass]);

  const failedScans = useMemo(
    () => scanLog.filter((s) => s.result === 'failed'),
    [scanLog]
  );

  // chronological (first scan = 1)
  const scanLogInOrder = useMemo(() => [...scanLog].reverse(), [scanLog]);

  const expectedPairCount = expectedPairs.size;
  const matchedCount = matchedPairs.size;
  const allMatched = expectedPairCount > 0 && matchedCount === expectedPairCount;
  /** Approve only when all items matched and no mismatch (no "resolve" path) */
  const canApprove = allMatched && failedScans.length === 0;
  /** Reject when there is at least one mismatch (QR not on gatepass) */
  const canReject = failedScans.length > 0;

  const resetScanSession = useCallback(() => {
    setScannerKey((k) => k + 1);
    setScanLog([]);
    setMatchedPairs(new Set());
    setMismatchCount(0);
    setScanResultPopup(null);
  }, []);

  const handleContinueFromStep1 = async () => {
    const trimmed = gatePassNumberInput.trim();
    if (!trimmed) {
      setLookupError('Please enter a gatepass number.');
      return;
    }
    setLookupError(null);
    setLookupLoading(true);
    try {
      const number = normalizeGatePassInput(trimmed) || trimmed;
      const res = await authFetch(
        `${API_BASE}/gate-passes/by-number?number=${encodeURIComponent(number)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'success') {
        const message =
          json?.message || (res.status === 404 ? 'Gatepass not found. Please check the number.' : 'Failed to load gatepass.');
        setLookupError(message);
        return;
      }
      const data = json?.data;
      if (!data || !data.gatepassNo) {
        setLookupError('Invalid gatepass response. Please try again.');
        return;
      }
      // Normalize dateOfIssue if API returns ISO string or Date
      const gatePassData: GatePass = {
        ...data,
        id: String(data.id),
        dateOfIssue:
          typeof data.dateOfIssue === 'string'
            ? data.dateOfIssue
            : data.dateOfIssue
              ? new Date(data.dateOfIssue).toISOString().slice(0, 10)
              : '',
      };
      setGatePass(gatePassData);
      setStep(2);
      setMode('menu');
      resetScanSession();
      setDetailsExpanded(true);
      setScanHistoryExpanded(false);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setGatePassNumberInput('');
    setLookupError(null);
    setGatePass(null);
    setMode('menu');
    setApproveError(null);
    resetScanSession();
  };

  const restartScannerSoon = () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(
      () => setScannerKey((k) => k + 1),
      450
    );
  };

  // -------------------------------------------------------------------------
  // EXISTING QR SCAN FAILURE HANDLING (detection unchanged)
  // -------------------------------------------------------------------------

  const handleScanSuccess = (decodedText: string) => {
    if (!gatePass) return;
    if (scanResultPopup !== null) return;

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
          reason:
            'Could not extract serial number and box number from QR (expected serial + motor box).',
          timestamp: new Date(),
          blocking: true,
        },
        ...prev,
      ]);
      setScanResultPopup({
        serial: parsed?.serial ?? '—',
        box: parsed?.box ?? '—',
        result: 'failed',
      });
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
          reason: 'Serial / box pair not found on this gatepass.',
          timestamp: new Date(),
          blocking: true,
        },
        ...prev,
      ]);
      setScanResultPopup({
        serial: parsed.serial,
        box: parsed.box,
        result: 'failed',
      });
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
          reason: 'This serial / box pair was already verified.',
          timestamp: new Date(),
          blocking: false,
        },
        ...prev,
      ]);
      setScanResultPopup({
        serial: parsed.serial,
        box: parsed.box,
        result: 'duplicate',
      });
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
        reason: 'Matched with gatepass.',
        timestamp: new Date(),
        blocking: false,
      },
      ...prev,
    ]);
    setScanResultPopup({
      serial: parsed.serial,
      box: parsed.box,
      result: 'success',
    });
  };

  const handleCloseScanPopupAndContinue = () => {
    setScanResultPopup(null);
    restartScannerSoon();
  };

  const handleApproveGatePass = async () => {
    if (!gatePass) return;
    if (!canApprove) {
      if (failedScans.length > 0) {
        alert('Cannot approve: One or more scans do not match this gatepass. Reject the gatepass instead.');
      } else {
        alert('Scan and verify all machines on this gatepass first.');
      }
      return;
    }
    setApproveError(null);
    setApproveLoading(true);
    try {
      const scannedPairs = Array.from(matchedPairs).map((key) => {
        const [serialNo, motorBoxNo] = key.split('|');
        return { serialNo: serialNo || '', motorBoxNo: motorBoxNo || '' };
      });
      const res = await authFetch(
        `${API_BASE}/gate-passes/${encodeURIComponent(gatePass.id)}/security-approve`,
        {
          method: 'POST',
          body: JSON.stringify({ scannedPairs }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'success') {
        const message =
          json?.message || 'Failed to approve gate pass. Please try again.';
        setApproveError(message);
        return;
      }
      alert(`Gate Pass ${gatePass.gatepassNo} approved by Security Officer.`);
      handleBackToStep1();
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectGatePass = () => {
    if (!gatePass) return;
    if (!canReject) return;
    alert(
      `Gate Pass ${gatePass.gatepassNo} rejected by Security Officer (frontend only).`
    );
    handleBackToStep1();
  };

  const isItemVerified = useCallback(
    (item: GatePassItem) =>
      matchedPairs.has(pairKey(item.serialNo, item.motorBoxNo)),
    [matchedPairs]
  );

  // -------------------------------------------------------------------------
  // STEP 1: Enter gatepass number (unchanged UI)
  // -------------------------------------------------------------------------

  if (step === 1) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/50 px-4 py-4">
          <div className="max-w-md mx-auto flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Security Verification
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Enter gatepass number to start QR verification
              </p>
            </div>
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-slate-700/60 p-6 space-y-4 shadow-sm dark:shadow-none">
              <label
                htmlFor="gatepass-input"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Gatepass Number
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
                className="w-full min-h-[52px] px-4 py-3 text-base border rounded-xl bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder-slate-500"
                autoFocus
              />
              {lookupError && (
                <p
                  className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                  role="alert"
                >
                  <span className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full"></span>
                  {lookupError}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-slate-500">
                Enter the gatepass number (e.g. 016633) and continue to verify.
              </p>
              <button
                type="button"
                onClick={() => void handleContinueFromStep1()}
                disabled={lookupLoading}
                className="w-full min-h-[52px] px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {lookupLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Continue
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STEP 2: Menu / Details / Scan
  // -------------------------------------------------------------------------

  if (!gatePass) return null;

  const totalExpected = expectedPairCount;
  const totalVerified = matchedCount;

  // --- Mode: Menu (two main actions) ---------------------------------------

  if (mode === 'menu') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/60 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToStep1}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-700 dark:text-white"
            aria-label="Change gatepass"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Gatepass ready to verify
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Gatepass #{gatePass.gatepassNo}
            </p>
          </div>
          {mounted ? (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Compact summary card */}
            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                Quick summary
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 dark:text-slate-400">Agreement</p>
                    <p className="text-gray-900 dark:text-slate-100 font-medium">
                      {gatePass.agreementReference}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 dark:text-slate-400">To / Driver</p>
                    <p className="text-gray-900 dark:text-slate-100 font-medium">
                      {gatePass.to} · {gatePass.driverName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-gray-500 dark:text-slate-400">Address · Vehicle</p>
                    <p className="text-gray-900 dark:text-slate-100 font-medium">
                      {gatePass.toAddress} · {gatePass.vehicleNumber}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-slate-300">
                <span>
                  Machines on gatepass:{' '}
                  <span className="font-semibold">
                    {gatePass.items.length}
                  </span>
                </span>
                <span>
                  Verified:{' '}
                  <span className="font-semibold">
                    {totalVerified}/{totalExpected}
                  </span>
                </span>
              </div>
            </div>

            {/* Two main actions */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode('details')}
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/80 text-left flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/80 active:scale-[0.98] transition-all shadow-sm dark:shadow-none"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      View gatepass details
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      See all machines and full agreement info
                    </p>
                  </div>
                </div>
                <ChevronRightIcon />
              </button>

              <button
                type="button"
                onClick={() => setMode('scan')}
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-blue-600 text-white text-left flex items-center justify-between gap-3 hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-semibold">Start QR scan</p>
                    <p className="text-xs text-blue-100">
                      Scan each machine before approving gatepass
                    </p>
                  </div>
                </div>
                <ChevronRightIcon light />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Mode: Details (separate details screen with its own Back) -----------

  if (mode === 'details') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/60 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode('menu')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-700 dark:text-white"
            aria-label="Back to actions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Gatepass details
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Gatepass #{gatePass.gatepassNo}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('scan')}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-100 border border-gray-300 dark:border-slate-600/80 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              Start scan
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Info card */}
            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 dark:text-slate-400">Agreement</p>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {gatePass.agreementReference}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 dark:text-slate-400">To / Driver</p>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {gatePass.to} · {gatePass.driverName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Truck className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-gray-500 dark:text-slate-400">Address · Vehicle</p>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {gatePass.toAddress} · {gatePass.vehicleNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
                  Machines on this gatepass (green = already verified)
                </p>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {gatePass.items.map((item) => {
                    const verified = isItemVerified(item);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 py-2 px-3 rounded-xl border ${
                          verified
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/80'
                            : 'bg-gray-50 dark:bg-slate-900/80 border-gray-200 dark:border-slate-700/80'
                        }`}
                      >
                        {verified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">
                            Serial: {item.serialNo} · Box: {item.motorBoxNo}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-slate-400 text-center">
              Verified {totalVerified} of {totalExpected} machines. When all match, approve.
              If any scan does not match, you must reject the gatepass.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Mode: Scan (full scanner + progress + approve) ----------------------

  // default: mode === 'scan'
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col transition-colors">
      {/* Post-scan popup: serial, box, result, Next */}
      {scanResultPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-result-title"
        >
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p id="scan-result-title" className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">
              Scanned
            </p>
            <p className="font-mono text-lg text-gray-900 dark:text-white mb-1">
              Serial: {scanResultPopup.serial}
            </p>
            <p className="font-mono text-lg text-gray-900 dark:text-white mb-4">
              Box: {scanResultPopup.box}
            </p>
            <p className="text-sm mb-4">
              {scanResultPopup.result === 'success' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Matched</span>
              )}
              {scanResultPopup.result === 'failed' && (
                <span className="text-red-600 dark:text-red-400 font-medium">Not on gatepass</span>
              )}
              {scanResultPopup.result === 'duplicate' && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Already scanned</span>
              )}
            </p>
            <button
              type="button"
              onClick={handleCloseScanPopupAndContinue}
              className="w-full min-h-[52px] px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/60 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode('menu')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-700 dark:text-white"
          aria-label="Back to actions"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Verify Gatepass QR
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Gatepass #{gatePass.gatepassNo}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={resetScanSession}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-600/80 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Scanner section */}
      <div
        className="relative flex-shrink-0 bg-black/70 backdrop-blur-sm"
        style={{ height: '45vh', minHeight: 280 }}
      >
        <div className="absolute inset-0">
          <QRScannerComponent
            key={scannerKey}
            onScanSuccess={handleScanSuccess}
            autoClose={false}
            showCloseButton={false}
            title="Scan machine QR"
            subtitle={`${totalVerified} / ${totalExpected}`}
            embedded
          />
          <div className="pointer-events-none absolute inset-10 border-2 border-white/15 rounded-3xl" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-xs text-slate-200 font-medium">
              Point at QR code
            </p>
          </div>
        </div>
      </div>

      {/* Content section */}
      <div className="flex-1 bg-gray-50/80 dark:bg-slate-900/60 px-4 py-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Progress: minimal */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 rounded-xl px-3 py-2 shadow-sm dark:shadow-none">
              <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                {totalVerified} / {totalExpected}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">verified</span>
            </div>
            <button
              type="button"
              onClick={() => setMode('details')}
              className="text-xs text-blue-600 dark:text-blue-300 underline underline-offset-2"
            >
              View gatepass
            </button>
          </div>

          <div className="w-full bg-gray-200 dark:bg-slate-800/70 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                canApprove ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-blue-500'
              }`}
              style={{
                width:
                  totalExpected > 0
                    ? `${(totalVerified / totalExpected) * 100}%`
                    : '0%',
              }}
            />
          </div>

          {/* Failed scans – mismatch list (no resolve; officer must reject) */}
          {failedScans.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-700/80 rounded-2xl p-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-200 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Not on gatepass ({failedScans.length})
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {failedScans.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 py-2 px-3 rounded-xl border bg-red-100/80 dark:bg-red-950/70 border-red-200 dark:border-red-800/80"
                  >
                    <p className="font-mono text-xs text-red-900 dark:text-red-50 flex-1 min-w-0">
                      {entry.extractedSerial || '—'} · {entry.extractedBox || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan history – minimal list, no long explanation */}
          {scanLogInOrder.length > 0 && (
            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
              <button
                type="button"
                onClick={() => setScanHistoryExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors"
                aria-expanded={scanHistoryExpanded}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  History ({scanLogInOrder.length})
                </span>
                {scanHistoryExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                )}
              </button>
              {scanHistoryExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-200 dark:border-slate-800 space-y-2 max-h-52 overflow-y-auto">
                  {scanLogInOrder.map((entry, idx) => {
                    const isSuccess = entry.result === 'success';
                    const isFailed = entry.result === 'failed';
                    const isDuplicate = entry.result === 'duplicate';
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-2 py-2 px-3 rounded-xl border ${
                          isSuccess
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/80'
                            : isFailed
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/80'
                        }`}
                      >
                        <span className="text-xs font-mono text-gray-500 dark:text-slate-300 w-5">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium flex-1 min-w-0">
                          {isSuccess && <span className="text-emerald-700 dark:text-emerald-300">Matched</span>}
                          {isFailed && <span className="text-red-700 dark:text-red-300">Not on gatepass</span>}
                          {isDuplicate && <span className="text-amber-700 dark:text-amber-300">Already scanned</span>}
                        </span>
                        <span className="font-mono text-[11px] text-gray-500 dark:text-slate-400 truncate">
                          {entry.extractedSerial} · {entry.extractedBox}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Status – one short line */}
          <p className="text-xs text-center text-gray-600 dark:text-slate-300 min-h-[1.25rem]" role="status">
            {canApprove && (
              <span className="text-emerald-600 dark:text-emerald-300 font-medium">Ready to approve.</span>
            )}
            {canReject && (
              <span className="text-red-600 dark:text-red-300 font-medium">Mismatch. Reject gatepass.</span>
            )}
            {!canApprove && !canReject && (
              <span className="text-gray-500 dark:text-slate-400">Scan each machine.</span>
            )}
          </p>

          {/* Approve error message */}
          {approveError && (
            <p
              className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
              role="alert"
            >
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {approveError}
            </p>
          )}

          {/* Approve / Reject buttons */}
          <div className="pb-4 space-y-3">
            <button
              type="button"
              onClick={() => void handleApproveGatePass()}
              disabled={!canApprove || approveLoading}
              className={`w-full min-h-[56px] px-5 py-3 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                canApprove && !approveLoading
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 dark:shadow-emerald-900/40'
                  : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              {approveLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Approving…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Approve Gatepass
                </>
              )}
            </button>
            {canReject && (
              <button
                type="button"
                onClick={handleRejectGatePass}
                className="w-full min-h-[52px] px-5 py-3 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white active:scale-[0.98] transition-all"
              >
                <XCircle className="w-5 h-5" />
                Reject Gatepass
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Small internal icon helper for right-chevron
const ChevronRightIcon: React.FC<{ light?: boolean }> = ({ light }) => (
  <svg
    className={`w-4 h-4 flex-shrink-0 ${
      light ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'
    }`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M7.293 4.293a1 1 0 011.414 0L13 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 01-1.414-1.414L10.586 11 7.293 7.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export default GatePassQRPage;