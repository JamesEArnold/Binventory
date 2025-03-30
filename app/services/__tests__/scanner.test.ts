/**
 * @description Tests for scanner service from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

import { createScannerService } from '../scanner';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    clear() {
      store = {};
    },
  };
})();

// Mock the QR service
jest.mock('../qr', () => ({
  createQRCodeService: jest.fn().mockReturnValue({
    validateQRCode: jest.fn().mockImplementation((shortCode: string) => {
      if (shortCode === 'validCode') {
        return Promise.resolve({
          version: '1.0',
          binId: 'bin123',
          shortCode: 'validCode',
          timestamp: Date.now(),
          checksum: 'validChecksum'
        });
      } else {
        return Promise.reject(new Error('Invalid QR code'));
      }
    })
  })
}));

describe('ScannerService', () => {
  let originalLocalStorage: Storage;
  
  beforeAll(() => {
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', { value: localStorageMock });
    Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock } });
  });
  
  afterAll(() => {
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
    jest.resetAllMocks();
  });
  
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });
  
  describe('processScan', () => {
    it('should successfully process a valid QR code URL', async () => {
      const scannerService = createScannerService();
      const result = await scannerService.processScan('http://example.com/b/validCode');
      
      expect(result.success).toBe(true);
      expect(result.binId).toBe('bin123');
    });
    
    it('should handle an invalid QR code URL', async () => {
      const scannerService = createScannerService();
      const result = await scannerService.processScan('http://example.com/b/invalidCode');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid QR code');
    });
    
    it('should handle malformed URLs', async () => {
      const scannerService = createScannerService();
      const result = await scannerService.processScan('not-a-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
  
  describe('offline queue', () => {
    it('should add an item to the offline queue', () => {
      const scannerService = createScannerService();
      scannerService.addItemToBin('bin123', 'item456', 2);
      
      const queue = scannerService.getOfflineQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].action).toBe('add');
      expect(queue[0].binId).toBe('bin123');
      expect(queue[0].itemId).toBe('item456');
      expect(queue[0].quantity).toBe(2);
    });
    
    it('should remove an item from the offline queue', () => {
      const scannerService = createScannerService();
      scannerService.removeItemFromBin('bin123', 'item456', 1);
      
      const queue = scannerService.getOfflineQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].action).toBe('remove');
      expect(queue[0].binId).toBe('bin123');
      expect(queue[0].itemId).toBe('item456');
      expect(queue[0].quantity).toBe(1);
    });
    
    it('should save and load the offline queue from localStorage', () => {
      // First create a service and add items
      const service1 = createScannerService();
      service1.addItemToBin('bin123', 'item456', 2);
      service1.removeItemFromBin('bin123', 'item789', 1);
      
      // Then create a new service instance which should load from localStorage
      const service2 = createScannerService();
      const queue = service2.getOfflineQueue();
      
      expect(queue.length).toBe(2);
      expect(queue[0].action).toBe('add');
      expect(queue[1].action).toBe('remove');
    });
    
    it('should sync the offline queue', async () => {
      const scannerService = createScannerService();
      scannerService.addItemToBin('bin123', 'item456', 2);
      
      const result = await scannerService.syncOfflineQueue();
      expect(result).toBe(true);
      
      // Queue should be empty after sync
      const queue = scannerService.getOfflineQueue();
      expect(queue.length).toBe(0);
    });
  });
}); 