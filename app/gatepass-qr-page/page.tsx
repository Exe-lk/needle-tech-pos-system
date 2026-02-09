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
  /** For failed scans: whether this mismatch is still blocking approval */
  blocking: boolean;
}

// Step 2 sub-flow: action menu, details, or scan
type Step2Mode = 'menu' | 'details' | 'scan';

// ---------------------------------------------------------------------------
// Mock data
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
      {
        id: '1',
        description: 'JUKI LX-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01733',
        motorBoxNo: 'NMBDH01171',
      },
      {
        id: '2',
        description: 'JUKI DDL-8700 - HIGH-SPEED LOCKSTITCH MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01734',
        motorBoxNo: 'NMBDH01172',
      },
      {
        id: '3',
        description: 'BROTHER DB2-B755-403 - OVERLOCK MACHINE',
        status: 'FAIR',
        serialNo: 'BR-2024-001',
        motorBoxNo: 'BOX-2024-001',
      },
      {
        id: '4',
        description: 'SINGER 4423 - HEAVY DUTY SEWING MACHINE',
        status: 'GOOD',
        serialNo: 'SG-2024-001',
        motorBoxNo: 'BOX-2024-002',
      },
      {
        id: '5',
        description: 'JUKI MO-2516 - OVERLOCK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01735',
        motorBoxNo: 'NMBDH01173',
      },
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
      {
        id: '1',
        description: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
        status: 'GOOD',
        serialNo: 'BR-2024-002',
        motorBoxNo: 'BOX-2024-003',
      },
      {
        id: '2',
        description: 'JUKI DDL-5550N - INDUSTRIAL SEWING MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01736',
        motorBoxNo: 'NMBDH01174',
      },
      {
        id: '3',
        description: 'SINGER 9960 - QUANTUM STYLIST MACHINE',
        status: 'GOOD',
        serialNo: 'SG-2024-002',
        motorBoxNo: 'BOX-2024-004',
      },
      {
        id: '4',
        description: 'BROTHER DB2-B755-403 - OVERLOCK MACHINE',
        status: 'FAIR',
        serialNo: 'BR-2024-003',
        motorBoxNo: 'BOX-2024-005',
      },
      {
        id: '5',
        description: 'JUKI MO-6700S - OVERLOCK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01737',
        motorBoxNo: 'NMBDH01175',
      },
    ],
    issuedBy: 'Admin User',
  },
];

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
// Component
// ---------------------------------------------------------------------------

const GatePassQRPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [gatePassNumberInput, setGatePassNumberInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [gatePass, setGatePass] = useState<GatePass | null>(null);

  // Step 2 sub-flow
  const [mode, setMode] = useState<Step2Mode>('menu');

  const [scannerKey, setScannerKey] = useState(1);
  const [scanLog, setScanLog] = useState<SecurityScanLogItem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  /** Historical count of mismatches (for analytics / display) */
  const [mismatchCount, setMismatchCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{
    type: ScanResultType;
    title: string;
    message: string;
  } | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [scanHistoryExpanded, setScanHistoryExpanded] = useState(false);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const failedScans = useMemo(
    () => scanLog.filter((s) => s.result === 'failed'),
    [scanLog]
  );

  /** Only failed scans that are still marked as blocking approval */
  const unresolvedMismatchCount = useMemo(
    () => scanLog.filter((s) => s.result === 'failed' && s.blocking).length,
    [scanLog]
  );

  // chronological (first scan = 1)
  const scanLogInOrder = useMemo(() => [...scanLog].reverse(), [scanLog]);

  const expectedPairCount = expectedPairs.size;
  const matchedCount = matchedPairs.size;
  const allMatched = expectedPairCount > 0 && matchedCount === expectedPairCount;
  const canApprove = allMatched && unresolvedMismatchCount === 0;

  const resetScanSession = useCallback(() => {
    setScannerKey((k) => k + 1);
    setScanLog([]);
    setMatchedPairs(new Set());
    setMismatchCount(0);
    setLastFeedback(null);
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
    setMode('menu'); // show 2-button menu first
    resetScanSession();
    setDetailsExpanded(true);
    setScanHistoryExpanded(false);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setGatePassNumberInput('');
    setLookupError(null);
    setGatePass(null);
    setMode('menu');
    resetScanSession();
  };

  const showFeedback = (fb: {
    type: ScanResultType;
    title: string;
    message: string;
  }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2200);
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
      showFeedback({
        type: 'failed',
        title: 'Scan failed',
        message: 'QR must contain serial number and motor box number.',
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
          reason: 'Serial / box pair not found on this gatepass.',
          timestamp: new Date(),
          blocking: true,
        },
        ...prev,
      ]);
      showFeedback({
        type: 'failed',
        title: 'Not on gatepass',
        message: `Serial ${serial || '—'} / Box ${box || '—'} is not on this gatepass. If this was a wrong machine scanned by mistake, you can mark it as resolved below after checking the stock.`,
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
          reason: 'This serial / box pair was already verified.',
          timestamp: new Date(),
          blocking: false,
        },
        ...prev,
      ]);
      showFeedback({
        type: 'duplicate',
        title: 'Already verified',
        message: `${serial || '—'} / ${box || '—'} was already scanned. Scan the next machine.`,
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
        reason: 'Matched with gatepass.',
        timestamp: new Date(),
        blocking: false,
      },
      ...prev,
    ]);
    showFeedback({
      type: 'success',
      title: 'Matched',
      message: `${serial || '—'} / ${box || '—'} verified. Scan next machine.`,
    });
    restartScannerSoon();
  };

  /** Mark a failed scan as resolved (e.g. accidental wrong QR), so it stops blocking approval */
  const handleResolveFailedScan = (id: string) => {
    setScanLog((prev) =>
      prev.map((entry) =>
        entry.id === id && entry.result === 'failed' && entry.blocking
          ? { ...entry, blocking: false }
          : entry
      )
    );
  };

  const handleApproveGatePass = () => {
    if (!gatePass) return;
    if (!canApprove) {
      alert(
        'Cannot approve: Scan and verify all machines on this gatepass. Any unresolved mismatches must be reviewed or marked as resolved first.'
      );
      return;
    }
    alert(
      `Gate Pass ${gatePass.gatepassNo} approved by Security Officer (frontend only).`
    );
    handleBackToStep1();
  };

  const renderFeedbackChip = () => {
    if (!lastFeedback) return null;
    const base =
      lastFeedback.type === 'success'
        ? 'bg-emerald-900/60 border-emerald-500/80 text-emerald-100'
        : lastFeedback.type === 'duplicate'
        ? 'bg-amber-900/60 border-amber-500/80 text-amber-100'
        : 'bg-red-900/60 border-red-500/80 text-red-100';

    return (
      <div
        className={`px-4 py-3 rounded-xl border text-sm shadow-lg shadow-black/30`}
        role="status"
        aria-live="polite"
      >
        <div className={`font-semibold mb-0.5 ${base.split(' ')[2]}`}>
          {lastFeedback.title}
        </div>
        <div className="text-xs opacity-90">{lastFeedback.message}</div>
      </div>
    );
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-4">
          <div className="max-w-md mx-auto">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Security Verification
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Enter gatepass number to start QR verification
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/60 p-6 space-y-4">
              <label
                htmlFor="gatepass-input"
                className="block text-sm font-medium text-slate-300"
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
                className="w-full min-h-[52px] px-4 py-3 text-base border rounded-xl bg-slate-900/50 text-white border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-500"
                autoFocus
              />
              {lookupError && (
                <p
                  className="text-sm text-red-400 flex items-center gap-2"
                  role="alert"
                >
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  {lookupError}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Try: <span className="font-mono">016633</span> or{' '}
                <span className="font-mono">016634</span>
              </p>
              <button
                type="button"
                onClick={handleContinueFromStep1}
                className="w-full min-h-[52px] px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Continue
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/85 backdrop-blur-sm border-b border-slate-700/60 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToStep1}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Change gatepass"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-white">
              Gatepass ready to verify
            </h1>
            <p className="text-xs text-slate-400">
              Gatepass #{gatePass.gatepassNo}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Compact summary card */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-medium text-slate-400 mb-1">
                Quick summary
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-400">Agreement</p>
                    <p className="text-slate-100 font-medium">
                      {gatePass.agreementReference}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-400">To / Driver</p>
                    <p className="text-slate-100 font-medium">
                      {gatePass.to} · {gatePass.driverName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-slate-400">Address · Vehicle</p>
                    <p className="text-slate-100 font-medium">
                      {gatePass.toAddress} · {gatePass.vehicleNumber}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
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
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-left flex items-center justify-between gap-3 hover:bg-slate-800/80 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      View gatepass details
                    </p>
                    <p className="text-xs text-slate-400">
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/85 backdrop-blur-sm border-b border-slate-700/60 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode('menu')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Back to actions"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-white">
              Gatepass details
            </h1>
            <p className="text-xs text-slate-400">
              Gatepass #{gatePass.gatepassNo}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode('scan')}
            className="px-3 py-1.5 text-xs font-medium text-slate-100 border border-slate-600/80 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            Start scan
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Info card */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-400">Agreement</p>
                    <p className="font-medium text-slate-100">
                      {gatePass.agreementReference}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-400">To / Driver</p>
                    <p className="font-medium text-slate-100">
                      {gatePass.to} · {gatePass.driverName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Truck className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-slate-400">Address · Vehicle</p>
                    <p className="font-medium text-slate-100">
                      {gatePass.toAddress} · {gatePass.vehicleNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-slate-400 mb-2">
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
                            ? 'bg-emerald-950/40 border-emerald-700/80'
                            : 'bg-slate-900/80 border-slate-700/80'
                        }`}
                      >
                        {verified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-100 truncate">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Serial: {item.serialNo} · Box: {item.motorBoxNo}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Verified {totalVerified} of {totalExpected} machines. When all are
              verified and any wrong scans are resolved, you can approve from
              the scan screen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Mode: Scan (full scanner + progress + approve) ----------------------

  // default: mode === 'scan'
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/85 backdrop-blur-sm border-b border-slate-700/60 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode('menu')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Back to actions"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-white">
            Verify Gatepass QR
          </h1>
          <p className="text-xs text-slate-400">
            Gatepass #{gatePass.gatepassNo}
          </p>
        </div>
        <button
          type="button"
          onClick={resetScanSession}
          className="px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-600/80 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
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
            subtitle={
              canApprove
                ? 'All machines verified — you can approve below'
                : unresolvedMismatchCount > 0
                ? `${totalVerified}/${totalExpected} verified · ${unresolvedMismatchCount} unresolved mismatch`
                : `${totalVerified}/${totalExpected} verified`
            }
            embedded
          />
          <div className="pointer-events-none absolute inset-10 border-2 border-white/15 rounded-3xl" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-xs text-slate-200 font-medium">
              Align QR code inside the frame
            </p>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <p className="text-[11px] text-slate-300/80">
              The camera will auto-detect and confirm each machine
            </p>
          </div>
        </div>
      </div>

      {/* Content section */}
      <div className="flex-1 bg-slate-900/60 px-4 py-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Progress + small link to details */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Verification progress
              </h2>
              <p className="text-[11px] text-slate-400">
                Step 2 of 2 · Scan every machine on this gatepass
              </p>
              <button
                type="button"
                onClick={() => setMode('details')}
                className="mt-1 text-[11px] text-blue-300 underline underline-offset-2"
              >
                View gatepass details
              </button>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/80 rounded-xl px-3 py-2">
              <div className="text-center">
                <div className="text-lg font-bold text-white tabular-nums">
                  {totalVerified}
                </div>
                <div className="text-[10px] text-slate-400">Verified</div>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="text-center">
                <div className="text-lg font-bold text-white tabular-nums">
                  {totalExpected}
                </div>
                <div className="text-[10px] text-slate-400">Total</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-800/70 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  canApprove ? 'bg-emerald-400' : 'bg-blue-500'
                }`}
                style={{
                  width:
                    totalExpected > 0
                      ? `${(totalVerified / totalExpected) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>

          {/* Feedback chip (latest scan) */}
          {lastFeedback && (
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3">
              {renderFeedbackChip()}
            </div>
          )}

          {/* Failed scans – with "Mark resolved" to handle accidental wrong QR */}
          {failedScans.length > 0 && (
            <div className="bg-red-950/40 border border-red-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-300" />
                  <p className="text-xs font-semibold text-red-200">
                    Failed scans ({failedScans.length})
                  </p>
                </div>
                <p className="text-[11px] text-red-200/80">
                  {unresolvedMismatchCount > 0
                    ? `${unresolvedMismatchCount} unresolved (blocking approval)`
                    : 'All marked resolved (not blocking approval)'}
                </p>
              </div>
              <p className="text-[11px] text-red-200/90">
                If a wrong machine was scanned by mistake, you can mark that
                entry as resolved after confirming the correct machines are
                present.
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {failedScans.map((entry, idx) => {
                  const isBlocking = entry.blocking;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-2 py-2 px-3 rounded-xl border ${
                        isBlocking
                          ? 'bg-red-950/70 border-red-800/80'
                          : 'bg-red-950/20 border-red-800/40 opacity-85'
                      }`}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-900 flex items-center justify-center text-[11px] font-semibold text-red-200">
                        {failedScans.length - idx}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-red-50">
                          Serial: {entry.extractedSerial || '—'} · Box:{' '}
                          {entry.extractedBox || '—'}
                        </p>
                        <p className="text-[11px] text-red-200 mt-0.5">
                          {entry.reason}
                        </p>
                        <p className="text-[11px] text-red-200/80 mt-0.5">
                          {isBlocking
                            ? 'Unresolved – still blocking approval.'
                            : 'Resolved – treated as accidental / external machine.'}
                        </p>
                      </div>
                      {isBlocking && (
                        <button
                          type="button"
                          onClick={() => handleResolveFailedScan(entry.id)}
                          className="ml-2 px-2 py-1 text-[11px] font-medium rounded-lg bg-red-900/70 text-red-100 border border-red-600/80 hover:bg-red-800/80"
                        >
                          Mark resolved
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scan history (collapsible, unchanged detection logic) */}
          {scanLogInOrder.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setScanHistoryExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/80 transition-colors"
                aria-expanded={scanHistoryExpanded}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  <ListOrdered className="w-4 h-4 text-blue-400" />
                  Scan history ({scanLogInOrder.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  {matchedCount} verified · {failedScans.length} failed
                </span>
                {scanHistoryExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {scanHistoryExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Scan 1 = first scan, Scan 6 = 6th scan, etc. Use this to
                    see which QR was wrong or duplicated.
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {scanLogInOrder.map((entry, idx) => {
                      const scanNumber = idx + 1;
                      const isSuccess = entry.result === 'success';
                      const isFailed = entry.result === 'failed';
                      const isDuplicate = entry.result === 'duplicate';
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-start gap-2 py-2 px-3 rounded-xl border text-left ${
                            isSuccess
                              ? 'bg-emerald-950/40 border-emerald-700/80'
                              : isFailed
                              ? entry.blocking
                                ? 'bg-red-950/40 border-red-800/80'
                                : 'bg-red-950/20 border-red-800/40'
                              : 'bg-amber-950/40 border-amber-700/80'
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isSuccess
                                ? 'bg-emerald-800 text-emerald-100'
                                : isFailed
                                ? 'bg-red-800 text-red-100'
                                : 'bg-amber-800 text-amber-100'
                            }`}
                          >
                            {scanNumber}
                          </span>
                          <div className="min-w-0 flex-1">
                            {isSuccess && (
                              <>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Matched
                                </span>
                                <p className="font-mono text-[11px] text-emerald-50 mt-0.5">
                                  Serial: {entry.extractedSerial} · Box:{' '}
                                  {entry.extractedBox}
                                </p>
                              </>
                            )}
                            {isFailed && (
                              <>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  {entry.blocking
                                    ? 'Not on gatepass (unresolved)'
                                    : 'Not on gatepass (resolved)'}
                                </span>
                                <p className="font-mono text-[11px] text-red-50 mt-0.5">
                                  Scanned: Serial{' '}
                                  {entry.extractedSerial || '—'} · Box{' '}
                                  {entry.extractedBox || '—'}
                                </p>
                                <p className="text-[11px] text-red-200 mt-0.5">
                                  {entry.reason}
                                </p>
                              </>
                            )}
                            {isDuplicate && (
                              <>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-200">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Already verified
                                </span>
                                <p className="font-mono text-[11px] text-amber-50 mt-0.5">
                                  Serial: {entry.extractedSerial} · Box:{' '}
                                  {entry.extractedBox}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          <p
            className="text-xs text-center text-slate-300 min-h-[1.25rem]"
            role="status"
          >
            {canApprove ? (
              <span className="text-emerald-300 font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                All machines matched and no unresolved mismatches. You can
                approve this gatepass.
              </span>
            ) : unresolvedMismatchCount > 0 ? (
              <span className="text-red-300 font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                There are unresolved mismatches. Review them and either rescan
                or mark as resolved before approving.
              </span>
            ) : (
              'Scan each machine QR one by one. Order does not matter.'
            )}
          </p>

          {/* Approve button */}
          <div className="pb-4">
            <button
              type="button"
              onClick={handleApproveGatePass}
              disabled={!canApprove}
              className={`w-full min-h-[56px] px-5 py-3 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                canApprove
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            Approve Gatepass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small internal icon helper for right-chevron
const ChevronRightIcon: React.FC<{ light?: boolean }> = ({ light }) => (
  <svg
    className={`w-4 h-4 ${
      light ? 'text-blue-100' : 'text-slate-400'
    } flex-shrink-0`}
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