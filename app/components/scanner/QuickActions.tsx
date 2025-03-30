'use client';

/**
 * @description QuickActions component implementation from Phase 3.2: Mobile Scanner Interface
 * @phase Mobile Scanner Interface
 * @dependencies Phase 3.1
 */

import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createScannerService } from '../../services/scanner';
import { Item } from '../../types/models';

export interface QuickActionsProps {
  binId: string;
  items?: Item[];
  onClose?: () => void;
}

export const QuickActions: FC<QuickActionsProps> = ({
  binId,
  items = [],
  onClose
}) => {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  
  const router = useRouter();
  const scannerService = createScannerService();
  
  // Load recent items from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('binventory-recent-items');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setRecentItems(parsed.slice(0, 5)); // Keep only 5 most recent
          }
        }
      } catch (e) {
        console.error('Failed to load recent items:', e);
      }
    }
  }, []);
  
  // Save an item to recent items
  const saveToRecent = (item: Item) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Remove if already exists
      const updated = recentItems.filter(i => i.id !== item.id);
      // Add to beginning
      const newRecent = [item, ...updated].slice(0, 5);
      setRecentItems(newRecent);
      localStorage.setItem('binventory-recent-items', JSON.stringify(newRecent));
    } catch (e) {
      console.error('Failed to save recent item:', e);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedItem) {
      setError('Please select an item');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Find the selected item object
      const item = items.find(i => i.id === selectedItem) || 
                   recentItems.find(i => i.id === selectedItem);
      
      if (!item) {
        throw new Error('Selected item not found');
      }
      
      // Save to recent items
      saveToRecent(item);
      
      // Perform the action
      if (isAdding) {
        scannerService.addItemToBin(binId, selectedItem, quantity);
      } else {
        scannerService.removeItemFromBin(binId, selectedItem, quantity);
      }
      
      // Try to sync immediately if online
      await scannerService.syncOfflineQueue();
      
      // Show success
      setSuccess(true);
      
      // Reset form after a delay
      setTimeout(() => {
        setSelectedItem('');
        setQuantity(1);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle quick increment/decrement
  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button 
          onClick={onClose}
          className="p-2 text-gray-600"
          aria-label="Close quick actions"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-gray-800 text-lg font-medium">Quick Actions</h1>
        <button
          onClick={() => router.push(`/bins/${binId}`)}
          className="p-2 text-blue-600"
          aria-label="View bin details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Action type toggle */}
        <div className="bg-white rounded-lg shadow-sm mb-4 p-1 flex">
          <button
            onClick={() => setIsAdding(true)}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              isAdding 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-white text-gray-700'
            }`}
          >
            Add Item
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              !isAdding 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-white text-gray-700'
            }`}
          >
            Remove Item
          </button>
        </div>
        
        {/* Status messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isAdding ? 'Item added successfully' : 'Item removed successfully'}
          </div>
        )}
        
        {/* Item selection */}
        <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Select Item</h2>
          
          {/* Items list */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md mb-4">
            {items.length === 0 && recentItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No items available
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {/* Recent items section if available */}
                {recentItems.length > 0 && (
                  <>
                    <li className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                      Recent Items
                    </li>
                    {recentItems.map(item => (
                      <li key={`recent-${item.id}`} className="px-4 py-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="selectedItem"
                            value={item.id}
                            checked={selectedItem === item.id}
                            onChange={() => setSelectedItem(item.id)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-xs text-gray-500">({item.unit})</span>
                        </label>
                      </li>
                    ))}
                    {items.length > 0 && (
                      <li className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                        All Items
                      </li>
                    )}
                  </>
                )}
                
                {/* All items */}
                {items.map(item => (
                  <li key={item.id} className="px-4 py-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="selectedItem"
                        value={item.id}
                        checked={selectedItem === item.id}
                        onChange={() => setSelectedItem(item.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-xs text-gray-500">({item.unit})</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Quantity selection */}
        <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Quantity</h2>
          
          <div className="flex items-center">
            <button 
              onClick={() => handleQuantityChange(-1)}
              className="rounded-md border border-gray-300 p-2 text-gray-500"
              disabled={quantity <= 1}
              type="button"
              aria-label="Decrease quantity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="mx-2 w-16 text-center p-2 border border-gray-300 rounded-md"
            />
            
            <button 
              onClick={() => handleQuantityChange(1)}
              className="rounded-md border border-gray-300 p-2 text-gray-500"
              type="button"
              aria-label="Increase quantity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Offline status */}
        <div className="bg-yellow-50 rounded-lg p-3 flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm text-yellow-700">
            Works offline - changes will sync when you're back online
          </span>
        </div>
      </div>
      
      {/* Footer with action button */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={isSaving || !selectedItem}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
            selectedItem
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            isAdding ? 'Add to Bin' : 'Remove from Bin'
          )}
        </button>
      </div>
    </div>
  );
}; 