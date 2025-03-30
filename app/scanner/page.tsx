'use client';

/**
 * @description Scanner page implementation from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scanner } from '../components/scanner/Scanner';
import { QuickActions } from '../components/scanner/QuickActions';
import { ScanResult } from '../services/scanner';
import { Item } from '../types/models';

export default function ScannerPage() {
  const [binId, setBinId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if there's a bin ID in the URL
  useEffect(() => {
    const id = searchParams.get('binId');
    if (id) {
      setBinId(id);
      fetchBinItems(id);
    }
  }, [searchParams]);
  
  // Fetch items in the bin if binId is provided
  const fetchBinItems = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bins/${id}/items`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bin items');
      }
      
      const data = await response.json();
      setItems(data.data || []);
    } catch (err) {
      console.error('Error fetching bin items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle scan completion
  const handleScanComplete = (result: ScanResult) => {
    if (result.success && result.binId) {
      setBinId(result.binId);
      fetchBinItems(result.binId);
    }
  };
  
  // Handle closing the scanner interface
  const handleClose = () => {
    router.push('/');
  };
  
  return (
    <main>
      {binId ? (
        <QuickActions 
          binId={binId}
          items={items}
          onClose={handleClose}
        />
      ) : (
        <Scanner 
          onScanComplete={handleScanComplete}
          onClose={handleClose}
        />
      )}
      
      {/* Error message */}
      {error && (
        <div className="fixed inset-x-0 bottom-0 p-4 bg-red-500 text-white text-center">
          {error}
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded-lg flex items-center">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      )}
    </main>
  );
} 