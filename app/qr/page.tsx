'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRScannerComponent from '@/src/components/qr-scanner';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  History,
  QrCode,
  Share2,
  X
} from 'lucide-react';

interface ScanHistoryItem {
  id: string;
  data: string;
  timestamp: Date;
  source?: string;
}

const QRScannerPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Get context from URL params (e.g., ?context=rental-agreement&returnUrl=/rental-agreement)
  const context = searchParams.get('context') || 'general';
  const returnUrl = searchParams.get('returnUrl');
  const title = searchParams.get('title') || 'QR Code Scanner';
  const subtitle = searchParams.get('subtitle') ?? undefined;

  // Load scan history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qr-scan-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setScanHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      }
    } catch (err) {
      console.error('Error loading scan history:', err);
    }
  }, []);

  // Save scan history to localStorage
  const saveToHistory = (data: string) => {
    const newItem: ScanHistoryItem = {
      id: Date.now().toString(),
      data,
      timestamp: new Date(),
      source: context,
    };

    const updated = [newItem, ...scanHistory].slice(0, 50); // Keep last 50 scans
    setScanHistory(updated);
    
    try {
      localStorage.setItem('qr-scan-history', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving scan history:', err);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    saveToHistory(decodedText);
    
    // Handle different contexts
    handleContextAction(decodedText);
  };

  const handleContextAction = (qrData: string) => {
    switch (context) {
      case 'rental-agreement':
        // Navigate to rental agreement with QR data
        if (returnUrl) {
          router.push(`${returnUrl}?qrData=${encodeURIComponent(qrData)}`);
        }
        break;
      case 'returns':
        // Navigate to returns page with QR data
        if (returnUrl) {
          router.push(`${returnUrl}?qrData=${encodeURIComponent(qrData)}`);
        }
        break;
      case 'inventory':
        // Navigate to inventory with QR data
        if (returnUrl) {
          router.push(`${returnUrl}?qrData=${encodeURIComponent(qrData)}`);
        }
        break;
      default:
        // General use - just show result
        break;
    }
  };

  const handleCopy = async () => {
    if (scanResult) {
      try {
        await navigator.clipboard.writeText(scanResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleShare = async () => {
    if (scanResult && navigator.share) {
      try {
        await navigator.share({
          title: 'QR Code Scan Result',
          text: scanResult,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const handleRescan = () => {
    setScanResult(null);
  };

  const handleBack = () => {
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.back();
    }
  };

  const clearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem('qr-scan-history');
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header Bar - Only shown when not scanning */}
      {!scanResult && (
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {scanHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                    aria-label="View scan history"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    {scanHistory.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                        {scanHistory.length > 9 ? '9+' : scanHistory.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-40 lg:z-auto lg:relative">
          <div className="absolute inset-0 bg-black/50 lg:hidden" onClick={() => setShowHistory(false)} />
          <div className="absolute right-0 top-0 bottom-0 lg:relative lg:sticky lg:top-16 w-full max-w-md bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl lg:shadow-none overflow-y-auto h-screen lg:h-[calc(100vh-4rem)]">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Scan History</span>
              </h2>
              <div className="flex items-center space-x-2">
                {scanHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                  aria-label="Close history"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {scanHistory.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No scan history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => {
                        setScanResult(item.data);
                        setShowHistory(false);
                        handleContextAction(item.data);
                      }}
                    >
                      <p className="text-sm font-mono break-all text-gray-900 dark:text-white mb-2">
                        {item.data}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{item.timestamp.toLocaleString()}</span>
                        {item.source && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            {item.source}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex ${showHistory ? 'lg:flex-row' : 'flex-col'}`}>
        {/* Scanner Section */}
        <div className={`flex-1 ${showHistory ? 'lg:w-2/3' : 'w-full'}`}>
          {!scanResult ? (
            <QRScannerComponent
              onScanSuccess={handleScanSuccess}
              onClose={handleBack}
              autoClose={false}
              showCloseButton={false}
              title={title}
              subtitle={subtitle}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
              <div className="w-full max-w-2xl">
                {/* Success Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                  {/* Success Header */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 sm:p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full mb-4">
                      <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      Scan Successful!
                    </h2>
                    <p className="text-green-100 text-sm sm:text-base">
                      QR code scanned successfully
                    </p>
                  </div>

                  {/* Result Content */}
                  <div className="p-6 sm:p-8">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Scanned Data:
                      </label>
                      <div className="relative">
                        <div className="bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg p-4 sm:p-6">
                          <p className="text-sm sm:text-base font-mono break-all text-gray-900 dark:text-white">
                            {scanResult}
                          </p>
                        </div>
                        <button
                          onClick={handleCopy}
                          className="absolute top-2 right-2 p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleRescan}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <QrCode className="w-5 h-5" />
                        <span>Scan Another</span>
                      </button>
                      
                      {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                          onClick={handleShare}
                          className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <Share2 className="w-5 h-5" />
                          <span>Share</span>
                        </button>
                      )}

                      {returnUrl && (
                        <button
                          onClick={handleBack}
                          className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <ExternalLink className="w-5 h-5" />
                          <span>Continue</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 text-center">
                  <button
                    onClick={handleBack}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    ← Go back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;