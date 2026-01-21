'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScannerPage: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Automatically start scanning when component mounts
    startScanning();

    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setResult(null);
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      // Start scanning with camera
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera if available, otherwise front
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
          aspectRatio: 1.0,
        },
        (decodedText, decodedResult) => {
          // Success callback
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Error callback (ignore most errors, they're just scanning attempts)
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && scanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setResult(decodedText);
    stopScanning();
    
    // Optional: You can add additional logic here
    // For example, navigate to a different page or process the QR code data
    console.log('QR Code scanned:', decodedText);
    
    // Optional: Show alert or notification
    alert(`QR Code Scanned: ${decodedText}`);
  };

  const handleRescan = () => {
    setResult(null);
    setError(null);
    startScanning();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            QR Code Scanner
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
              <button
                onClick={startScanning}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {result && (
            <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded">
              <p className="font-semibold">Scanned Successfully!</p>
              <p className="mt-2 break-all">{result}</p>
              <button
                onClick={handleRescan}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Scan Another
              </button>
            </div>
          )}

          <div 
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          >
            <div id="qr-reader" className="w-full"></div>
            
            {scanning && (
              <div className="absolute top-4 right-4">
                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            )}

            {scanning && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={stopScanning}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {!scanning && !result && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <p className="text-lg mb-2">Initializing camera...</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>• Position the QR code within the scanning box</p>
            <p>• Ensure good lighting for better scanning</p>
            <p>• Camera will start automatically when you visit this page</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;