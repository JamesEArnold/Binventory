'use client';

/**
 * @description Redesigned QuickActions component for improved mobile scanner interface
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
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error' | null, message: string | null}>({
    type: null,
    message: null
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  
  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item && item.name ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : false
  );
  
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
      setFeedback({
        type: 'error',
        message: 'Please select an item'
      });
      return;
    }
    
    setIsSaving(true);
    setFeedback({ type: null, message: null });
    
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
      if (actionType === 'add') {
        scannerService.addItemToBin(binId, selectedItem, quantity);
      } else {
        scannerService.removeItemFromBin(binId, selectedItem, quantity);
      }
      
      // Try to sync immediately if online
      await scannerService.syncOfflineQueue();
      
      // Show success
      setFeedback({
        type: 'success',
        message: actionType === 'add' ? 
          `Added ${quantity} ${item.name} to bin` : 
          `Removed ${quantity} ${item.name} from bin`
      });
      
      // Reset selection and quantity after a delay
      setTimeout(() => {
        setSelectedItem('');
        setQuantity(1);
        setFeedback({ type: null, message: null });
      }, 2000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save changes'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Header with title and action toggle */}
      <div className="px-4 py-3 bg-white shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 mr-2 text-gray-600 rounded-full hover:bg-gray-100"
            aria-label="Close quick actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-lg font-medium">Bin Actions</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push(`/bins/${binId}`)}
            className="p-2 text-blue-600 rounded-full hover:bg-blue-50"
            aria-label="View bin details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Feedback messages */}
        {feedback.type && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center ${
            feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {feedback.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {feedback.message}
          </div>
        )}
        
        {/* Action type selector */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="flex divide-x divide-gray-200">
            <button
              onClick={() => setActionType('add')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 ${
                actionType === 'add' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </button>
            <button
              onClick={() => setActionType('remove')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 ${
                actionType === 'remove' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Remove Item
            </button>
          </div>
        </div>
        
        {/* Quick quantity selection */}
        <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Quantity</h2>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500"
                disabled={quantity <= 1}
                type="button"
                aria-label="Decrease quantity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <div className="w-12 mx-2">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center p-1 border border-gray-300 rounded-md"
                />
              </div>
              
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500"
                type="button"
                aria-label="Increase quantity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            {/* Quick quantity buttons */}
            <div className="flex gap-2">
              {[1, 5, 10].map(num => (
                <button
                  key={num}
                  onClick={() => setQuantity(num)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    quantity === num 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Item selection */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Select Item</h2>
            
            {/* Search input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Items list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredItems.length === 0 && recentItems.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                {searchQuery ? 'No matching items found' : 'No items available'}
              </div>
            )}
            
            <ul className="divide-y divide-gray-100">
              {/* Recent items section */}
              {recentItems.length > 0 && searchQuery === '' && (
                <>
                  <li className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Recent Items
                  </li>
                  {recentItems.map(item => (
                    <li 
                      key={`recent-${item.id}`} 
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedItem === item.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedItem(item.id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="selectedItem"
                          value={item.id}
                          checked={selectedItem === item.id}
                          onChange={() => setSelectedItem(item.id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-700">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.unit}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </>
              )}
              
              {/* Filtered items */}
              {filteredItems.length > 0 && (
                <>
                  {recentItems.length > 0 && searchQuery === '' && (
                    <li className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      All Items
                    </li>
                  )}
                  
                  {filteredItems.map(item => (
                    <li 
                      key={item.id} 
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedItem === item.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedItem(item.id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="selectedItem"
                          value={item.id}
                          checked={selectedItem === item.id}
                          onChange={() => setSelectedItem(item.id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-700">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.unit}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>
        </div>
        
        {/* Offline status badge */}
        <div className="bg-yellow-50 rounded-lg p-3 flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm text-yellow-700">
            Works offline - changes will sync when you&apos;re back online
          </span>
        </div>
      </div>
      
      {/* Footer with action button */}
      <div className="p-4 bg-white border-t border-gray-200 sticky bottom-0">
        <button
          onClick={handleSubmit}
          disabled={isSaving || !selectedItem}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
            selectedItem
              ? actionType === 'add' 
                ? 'bg-blue-600 text-white' 
                : 'bg-red-600 text-white'
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
            <>
              {actionType === 'add' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              )}
              {actionType === 'add' ? 'Add to Bin' : 'Remove from Bin'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}; 