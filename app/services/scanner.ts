/**
 * @description Scanner service implementation from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

import { createQRCodeService } from './qr';
import { QRCodeConfig, URLConfig } from '../types/qr';

// Default configurations
const qrConfig: QRCodeConfig = {
  size: 300,
  errorCorrection: 'M',
  format: 'SVG',
  margin: 4,
};

const urlConfig: URLConfig = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  shortCodeLength: 8,
  expirationDays: 365,
};

export interface ScanResult {
  success: boolean;
  binId?: string;
  error?: string;
}

export interface OfflineQueueItem {
  action: 'add' | 'remove';
  binId: string;
  itemId: string;
  quantity: number;
  timestamp: number;
}

export function createScannerService() {
  const qrService = createQRCodeService(qrConfig, urlConfig);
  const offlineQueue: OfflineQueueItem[] = [];
  
  /**
   * Process a QR code scan result
   */
  async function processScan(qrData: string): Promise<ScanResult> {
    try {
      // Extract the short code from the scanned URL
      const url = new URL(qrData);
      const pathParts = url.pathname.split('/');
      const shortCode = pathParts[pathParts.length - 1];
      
      // Validate the QR code
      const validatedQR = await qrService.validateQRCode(shortCode);
      
      return {
        success: true,
        binId: validatedQR.binId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid QR code'
      };
    }
  }
  
  /**
   * Add item to a bin (works offline)
   */
  function addItemToBin(binId: string, itemId: string, quantity: number): void {
    // Add to offline queue for later sync
    offlineQueue.push({
      action: 'add',
      binId,
      itemId,
      quantity,
      timestamp: Date.now()
    });
    
    // Save to IndexedDB/localStorage for persistence
    saveOfflineQueue();
  }
  
  /**
   * Remove item from a bin (works offline)
   */
  function removeItemFromBin(binId: string, itemId: string, quantity: number): void {
    // Add to offline queue for later sync
    offlineQueue.push({
      action: 'remove',
      binId,
      itemId,
      quantity,
      timestamp: Date.now()
    });
    
    // Save to IndexedDB/localStorage for persistence
    saveOfflineQueue();
  }
  
  /**
   * Save offline queue to persistent storage
   */
  function saveOfflineQueue(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('binventory-offline-queue', JSON.stringify(offlineQueue));
    }
  }
  
  /**
   * Load offline queue from persistent storage
   */
  function loadOfflineQueue(): OfflineQueueItem[] {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('binventory-offline-queue');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse offline queue:', e);
        }
      }
    }
    return [];
  }
  
  /**
   * Sync offline queue with server when online
   */
  async function syncOfflineQueue(): Promise<boolean> {
    try {
      if (offlineQueue.length === 0) return true;
      
      // TODO: Implement actual API calls to sync
      // This would call the appropriate API endpoints to update bin items
      
      // On successful sync, clear the queue
      offlineQueue.length = 0;
      saveOfflineQueue();
      return true;
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
      return false;
    }
  }
  
  // Initialize by loading any saved offline queue
  if (typeof window !== 'undefined') {
    offlineQueue.push(...loadOfflineQueue());
  }
  
  return {
    processScan,
    addItemToBin,
    removeItemFromBin,
    syncOfflineQueue,
    getOfflineQueue: () => [...offlineQueue]
  };
} 