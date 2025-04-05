/**
 * @description Scanner service implementation from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

// Define the types and interfaces
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
  // Initialize offline queue (without qrService reference)
  const offlineQueue: OfflineQueueItem[] = [];
  
  /**
   * Process a QR code scan result
   */
  async function processScan(qrData: string): Promise<ScanResult> {
    try {
      console.log('Processing scan data:', qrData);
      
      // Check if we're in a client environment
      if (typeof window === 'undefined') {
        throw new Error('Scanner must be used in client environment');
      }
      
      // Try to validate using our API endpoint
      let binId: string | undefined;
      
      // If it looks like a URL with our short code
      if (qrData.includes('/b/')) {
        // Extract the short code from the scanned URL
        const url = new URL(qrData);
        const pathParts = url.pathname.split('/');
        const shortCode = pathParts[pathParts.length - 1];
        
        // Call the validate API
        const response = await fetch(`/api/qr/validate?code=${encodeURIComponent(shortCode)}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('QR validation error:', errorText);
          throw new Error(errorText || 'Failed to validate QR code');
        }
        
        const validationResult = await response.json();
        console.log('Validation result:', validationResult);
        
        if (!validationResult.success) {
          throw new Error(validationResult.error || 'Invalid QR code');
        }
        
        binId = validationResult.binId;
      } else {
        // Try to directly call the validate API with whatever we got
        const response = await fetch(`/api/qr/validate?code=${encodeURIComponent(qrData)}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('QR validation error:', errorText);
          throw new Error(errorText || 'Failed to validate QR code');
        }
        
        const validationResult = await response.json();
        console.log('Validation result:', validationResult);
        
        if (!validationResult.success) {
          throw new Error(validationResult.error || 'Invalid QR code');
        }
        
        binId = validationResult.binId;
      }
      
      return {
        success: true,
        binId
      };
    } catch (error) {
      console.error('Error processing scan:', error);
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