'use client';

/**
 * @description Scanner component implementation from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

import { FC, useState, useEffect, useRef, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const scannerService = createScannerService();
  const router = useRouter();
  
  // Centralized function to stop camera stream and clean up resources
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    
    // Cancel any ongoing scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Cancel animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    // Stop all media tracks
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind, track.readyState);
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Update state
    setIsScanning(false);
    setIsLoading(false);
  }, []);
  
  // Start the camera with specified settings
  const startCamera = useCallback(async () => {
    try {
      // First ensure any previous camera is stopped
      stopCamera();
      
      // Set loading state
      setIsLoading(true);
      
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices) {
        throw new Error('Camera API is not available in your browser.');
      }
      
      console.log('Starting camera...');
      
      // Use simpler constraints that worked in original code
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment' },
        audio: false
      };
      
      // Attempt to get camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera access granted with tracks:', mediaStream.getTracks().length);
      
      setHasPermission(true);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        try {
          // Force play and wait for it to start
          await videoRef.current.play();
          console.log('Video is now playing');
          
          // Automatically start scanning once video is playing
          setIsScanning(true);
          setIsLoading(false);
        } catch (e) {
          console.error('Failed to play video:', e);
          setIsLoading(false);
          throw e;
        }
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
      setHasPermission(false);
      setScanError(error instanceof Error ? error.message : 'Camera access denied. Please enable camera permissions.');
      setIsLoading(false);
    }
  }, [stopCamera]);
  
  // Request camera permission on component mount
  useEffect(() => {
    // Start camera automatically on mount
    startCamera();
    
    // Cleanup when component unmounts
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);
  
  // Handle scanning logic
  useEffect(() => {
    if (!isScanning || !hasPermission || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    console.log('Setting up QR scanning...');
    
    // Function to scan QR code from current video frame
    const scanQRCode = async () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Accept readyState >= 1 (at least metadata loaded)
      if (video.readyState < 1) return;
      
      // Match canvas dimensions to video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw current video frame to canvas
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data from canvas
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to detect QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // If QR code detected
        if (code) {
          console.log('QR code detected:', code.data);
          
          // Stop camera immediately when QR code is detected
          stopCamera();
          
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
            } else {
              setScanError(result.error || 'Failed to process QR code');
            }
          } catch (error) {
            console.error('Error processing scan:', error);
            setScanError(error instanceof Error ? error.message : 'Failed to process scan');
          }
        }
      } catch (error) {
        console.error('Draw or QR scan error:', error);
      }
    };
    
    // Set up interval for scanning at a reasonable rate
    scanIntervalRef.current = setInterval(scanQRCode, 500);
    
    // Use requestAnimationFrame for camera preview
    const renderPreview = () => {
      if (!isScanning) return;
      
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Accept any readyState (looser check)
          if (video.readyState > 0) {
            // Set canvas size to match video if needed
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              const width = video.videoWidth || video.clientWidth || 640;
              const height = video.videoHeight || video.clientHeight || 480;
              canvas.width = width;
              canvas.height = height;
            }
            
            // Draw video frame to canvas
            try {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (e) {
              console.error('Error drawing to canvas:', e);
            }
          }
        }
      }
      
      animationFrameIdRef.current = requestAnimationFrame(renderPreview);
    };
    
    renderPreview();
    
    // Cleanup function
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isScanning, hasPermission, onScanComplete, scannerService, stopCamera]);
  
  // Toggle flashlight
  const toggleFlashlight = async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    
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
      stopCamera();
      router.push(`/bins/${lastScan.binId}`);
    }
  };
  
  // Restart scanning
  const restartScan = () => {
    setScanError(null);
    setLastScan(null);
    startCamera();
  };
  
  // Handle close button
  const handleClose = () => {
    stopCamera();
    if (onClose) onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-blue-600">
        <button 
          onClick={handleClose}
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
          disabled={!hasPermission || !isScanning}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M12 20.488V22" />
          </svg>
        </button>
      </div>
      
      {/* Scanner viewport */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white p-6 text-center">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-lg font-medium mb-4">Camera access required</p>
              <p className="mb-4">Please enable camera permissions in your browser settings to scan QR codes.</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {hasPermission === true && (
          <>
            {/* Video element */}
            <video 
              ref={videoRef} 
              className="absolute inset-0 object-cover w-full h-full z-10" 
              playsInline 
              muted
              autoPlay
            />
            
            {/* Canvas overlay */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full z-20" 
            />
            
            {/* Display loading indicator while camera initializes */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
                <div className="bg-white p-4 rounded-md shadow-md">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-2 text-center text-sm font-medium">Initializing camera...</p>
                </div>
              </div>
            )}
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
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
                
                <div className="absolute bottom-8 left-0 right-0 text-center text-white text-sm drop-shadow-lg">
                  Position QR code within the frame
                </div>
              </div>
            )}
            
            {/* Scan result */}
            {lastScan && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 p-6 z-40">
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
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white p-3 text-center z-50">
            {scanError}
          </div>
        )}
      </div>
      
      {/* Footer with controls - Only show when camera needs to be restarted */}
      <div className="p-4 bg-gray-900">
        {!isScanning && hasPermission === true && !isLoading && !lastScan && (
          <button
            onClick={startCamera}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center"
          >
            Start Scanning
          </button>
        )}
        
        {isScanning && (
          <div className="text-white text-center text-sm">
            Scanning for QR codes...
          </div>
        )}
        
        {isLoading && (
          <div className="text-white text-center text-sm">
            Initializing camera...
          </div>
        )}
      </div>
    </div>
  );
}; 