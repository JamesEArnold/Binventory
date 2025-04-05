'use client';

/**
 * @description Scanner component implementation from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

import { FC, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createScannerService, ScanResult } from '../../services/scanner';
import jsQR from 'jsqr';

export interface ScannerProps {
  onScanComplete?: (result: ScanResult) => void;
  onClose?: () => void;
}

export const Scanner: FC<ScannerProps> = ({ 
  onScanComplete,
  onClose 
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerService = createScannerService();
  const router = useRouter();
  
  // Check for secure context
  useEffect(() => {
    // Check if we're in a secure context (HTTPS or localhost)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setScanError('Camera access requires HTTPS. Please use a secure connection.');
    }
  }, []);
  
  // Request camera permission and set up video stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    async function setupCamera() {
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices) {
          // Try to handle iOS Safari specific issues
          if (typeof navigator !== 'undefined' && 
              navigator.userAgent && 
              /iPad|iPhone|iPod/.test(navigator.userAgent)) {
            throw new Error('Camera access is limited on iOS. Please ensure you are using Safari and a secure HTTPS connection.');
          } else {
            throw new Error('Camera API is not available in your browser. Please ensure you are using HTTPS or a supported browser.');
          }
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        setHasPermission(true);
        stream = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => {
            console.error('Failed to play video:', e);
          });
        }
      } catch (error) {
        console.error('Camera access error:', error);
        setHasPermission(false);
        setScanError(error instanceof Error ? error.message : 'Camera access denied. Please enable camera permissions.');
      }
    }
    
    // Add a small delay to ensure browser APIs are fully initialized
    setTimeout(() => {
      setupCamera();
    }, 300);
    
    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Handle scanning logic
  useEffect(() => {
    if (!isScanning || !hasPermission || !videoRef.current || !canvasRef.current) return;
    
    let animationFrameId: number;
    
    const scanQRCode = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      
      // Match canvas dimensions to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        // Get image data from canvas
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to detect QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // If QR code detected
        if (code) {
          console.log('QR code detected:', code.data);
          
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
          
          try {
            // Process the scan result
            const result = await scannerService.processScan(code.data);
            console.log('Scan result:', result);
            setLastScan(result);
            
            if (result.success) {
              // Call the callback if provided
              if (onScanComplete) {
                onScanComplete(result);
              }
              
              // Pause scanning
              setIsScanning(false);
            } else {
              setScanError(result.error || 'Failed to process QR code');
              // Continue scanning
            }
          } catch (error) {
            console.error('Error processing scan:', error);
            setScanError(error instanceof Error ? error.message : 'Failed to process scan');
          }
        }
      } catch (error) {
        console.error('QR scan error:', error);
        setScanError('Failed to process QR code');
      }
    };
    
    const scanInterval: NodeJS.Timeout = setInterval(scanQRCode, 500);
    
    // Use requestAnimationFrame for camera preview
    const renderPreview = () => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(
            videoRef.current, 
            0, 0, 
            canvasRef.current.width, 
            canvasRef.current.height
          );
        }
      }
      animationFrameId = requestAnimationFrame(renderPreview);
    };
    
    renderPreview();
    
    return () => {
      clearInterval(scanInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isScanning, hasPermission, onScanComplete, scannerService]);
  
  // Toggle flashlight
  const toggleFlashlight = async () => {
    if (!videoRef.current?.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    
    try {
      // Define enhanced MediaTrackCapabilities with torch property
      interface EnhancedMediaTrackCapabilities extends MediaTrackCapabilities {
        torch?: boolean;
      }
      
      // Cast to get torch capability
      const capabilities = track.getCapabilities() as EnhancedMediaTrackCapabilities;
      
      // Check if torch is supported
      if (capabilities.torch) {
        // Define advanced constraints with torch option
        interface TorchConstraintSet extends MediaTrackConstraintSet {
          torch?: boolean;
        }
        
        await track.applyConstraints({
          advanced: [{ torch: !isFlashlightOn } as TorchConstraintSet]
        });
        setIsFlashlightOn(!isFlashlightOn);
      } else {
        console.error('Torch not supported on this device');
      }
    } catch (error) {
      console.error('Error toggling flashlight:', error);
    }
  };
  
  // Navigate to bin page on successful scan
  const navigateToBin = () => {
    if (lastScan?.success && lastScan.binId) {
      router.push(`/bins/${lastScan.binId}`);
    }
  };
  
  // Restart scanning
  const restartScan = () => {
    setScanError(null);
    setLastScan(null);
    setIsScanning(true);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-blue-600">
        <button 
          onClick={onClose}
          className="p-2 text-white"
          aria-label="Close scanner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-medium">Scan QR Code</h1>
        <button
          onClick={toggleFlashlight}
          className={`p-2 ${isFlashlightOn ? 'text-yellow-400' : 'text-white'}`}
          aria-label="Toggle flashlight"
          disabled={!hasPermission}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M12 20.488V22" />
          </svg>
        </button>
      </div>
      
      {/* Scanner viewport */}
      <div className="relative flex-1 overflow-hidden">
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white p-6 text-center">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-lg font-medium mb-4">Camera access required</p>
              <p className="mb-4">Please enable camera permissions in your browser settings to scan QR codes.</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {hasPermission === true && (
          <>
            <video 
              ref={videoRef} 
              className="absolute inset-0 object-cover w-full h-full opacity-0" 
              playsInline 
              muted
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full" 
            />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-3/4 max-w-xs aspect-square">
                  {/* Scanner frame */}
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-lg" />
                  
                  {/* Corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  
                  {/* Scanning animation */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-scan-line" />
                </div>
                
                <div className="absolute bottom-8 left-0 right-0 text-center text-white text-sm">
                  Position QR code within the frame
                </div>
              </div>
            )}
            
            {/* Scan result */}
            {lastScan && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 p-6">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                  {lastScan.success ? (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-center mb-2">QR Code Scanned</h3>
                      <p className="text-gray-600 text-center mb-4">Successfully identified bin</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={navigateToBin}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
                        >
                          View Bin
                        </button>
                        <button
                          onClick={restartScan}
                          className="px-4 py-2 border border-gray-300 rounded-md"
                        >
                          Scan Again
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-center mb-2">Scan Failed</h3>
                      <p className="text-gray-600 text-center mb-4">{lastScan.error || 'Unable to process QR code'}</p>
                      <button
                        onClick={restartScan}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md"
                      >
                        Try Again
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Display error message if any */}
        {scanError && !lastScan && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white p-3 text-center">
            {scanError}
          </div>
        )}
      </div>
      
      {/* Footer with controls */}
      <div className="p-4 bg-gray-900">
        <button
          onClick={() => setIsScanning(true)}
          disabled={isScanning || hasPermission !== true}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center"
        >
          {isScanning ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning...
            </>
          ) : (
            'Start Scanning'
          )}
        </button>
      </div>
    </div>
  );
}; 