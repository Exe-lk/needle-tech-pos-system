'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Maximize2, Minimize2, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

interface QRScannerComponentProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  autoClose?: boolean; // Auto close after successful scan
  showCloseButton?: boolean;
}

const QRScannerComponent: React.FC<QRScannerComponentProps> = ({ 
  onScanSuccess, 
  onClose,
  autoClose = true,
  showCloseButton = true,
}) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    startScanning();

    return () => {
      isMountedRef.current = false;
      stopScanning();
    };
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const startScanning = async () => {
    if (isStartingRef.current) return;
    
    try {
      isStartingRef.current = true;
      setError(null);
      setLastScanResult(null);
      
      await stopScanning();

      const html5QrCode = new Html5Qrcode("qr-reader-scanner");
      scannerRef.current = html5QrCode;

      // Responsive QR box size based on screen
      const isMobile = window.innerWidth < 768;
      const qrboxSize = isMobile ? 200 : 250;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          if (isMountedRef.current) {
            handleScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore scanning errors (they're just failed attempts)
        }
      );

      if (isMountedRef.current) {
        setScanning(true);
        isStartingRef.current = false;
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to start camera. Please check permissions.');
        setScanning(false);
        isStartingRef.current = false;
      }
    }
  };

  const stopScanning = async () => {
    if (isStoppingRef.current) return;
    
    try {
      isStoppingRef.current = true;
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err: any) {
          const errorMessage = err?.message || err?.toString() || '';
          if (
            !errorMessage.includes('not running') && 
            !errorMessage.includes('not started') &&
            !errorMessage.includes('Cannot stop')
          ) {
            console.error('Error stopping scanner:', err);
          }
        }
        
        try {
          scannerRef.current.clear();
        } catch (clearErr) {
          // Ignore clear errors
        }
        
        scannerRef.current = null;
      }
      
      if (isMountedRef.current) {
        setScanning(false);
      }
      isStoppingRef.current = false;
    } catch (err) {
      scannerRef.current = null;
      if (isMountedRef.current) {
        setScanning(false);
      }
      isStoppingRef.current = false;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setLastScanResult(decodedText);
    stopScanning();
    onScanSuccess(decodedText);
    
    if (autoClose && onClose) {
      // Small delay to show success feedback
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleRescan = () => {
    setLastScanResult(null);
    setError(null);
    startScanning();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            QR Code Scanner
          </h2>
          <div className="flex items-center space-x-2">
            {scanning && (
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            )}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Close Scanner"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-md w-full mb-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg p-4 z-10">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Camera Error</p>
              <p className="text-sm">{error}</p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={startScanning}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                >
                  Try Again
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {lastScanResult && !scanning && (
        <div className="max-w-md w-full mb-4 bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg p-4 z-10">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Scan Successful!</p>
              <p className="text-sm break-all font-mono">{lastScanResult}</p>
              {!autoClose && (
                <button
                  onClick={handleRescan}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scan Another</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scanner Container */}
      <div
        className="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
        style={{ 
          width: '100%',
          maxWidth: '600px',
          aspectRatio: '1 / 1',
        }}
      >
        <div id="qr-reader-scanner" className="w-full h-full"></div>
        
        {/* Scanning Overlay */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner indicators */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
          </div>
        )}

        {/* Loading State */}
        {!scanning && !error && !lastScanResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Initializing camera...</p>
              <p className="text-sm text-gray-300 mt-2">Please allow camera access</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-md w-full mt-6 text-center text-white/80 text-sm space-y-1">
        <p>• Position the QR code within the scanning area</p>
        <p>• Ensure good lighting for better scanning</p>
        <p>• Hold the device steady</p>
      </div>
    </div>
  );
};

export default QRScannerComponent;