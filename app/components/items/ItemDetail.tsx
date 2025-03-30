'use client';

/**
 * @description ItemDetail component implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { FC, useState } from 'react';
import Link from 'next/link';
import { Item, BinItem } from '../../types/models';

export interface ItemDetailProps {
  item: Item;
  bins?: Array<BinItem & { item?: Item }>;
  onQuantityChange?: (quantity: number) => void;
  onMove?: (fromBinId: string, toBinId: string) => void;
  onEdit?: (item: Item) => void;
  className?: string;
}

export const ItemDetail: FC<ItemDetailProps> = ({
  item,
  bins = [],
  onQuantityChange,
  onMove,
  onEdit,
  className = '',
}) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [selectedBinId, setSelectedBinId] = useState<string>('');
  const [targetBinId, setTargetBinId] = useState<string>('');
  
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(0, quantity + delta);
    setQuantity(newQuantity);
    onQuantityChange?.(newQuantity);
  };
  
  const handleMoveItem = () => {
    if (selectedBinId && targetBinId && onMove) {
      onMove(selectedBinId, targetBinId);
      setSelectedBinId('');
      setTargetBinId('');
    }
  };
  
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-md ${className}`}>
      <div className="p-4">
        {/* Header with item name and actions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{item.name}</h2>
          
          {onEdit && (
            <button 
              onClick={() => onEdit(item)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              type="button"
            >
              Edit Item
            </button>
          )}
        </div>
        
        {/* Item details */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-sm text-gray-900">{item.description}</p>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <h3 className="text-sm font-medium text-gray-500">Category</h3>
            <p className="mt-1 text-sm text-gray-900">{item.categoryId}</p>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <h3 className="text-sm font-medium text-gray-500">Quantity</h3>
            {onQuantityChange ? (
              <div className="mt-1 flex items-center">
                <button 
                  onClick={() => handleQuantityChange(-1)}
                  className="rounded-md border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-50"
                  disabled={quantity <= 0}
                  type="button"
                  aria-label="Decrement quantity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M5 12h14"></path>
                  </svg>
                </button>
                <span className="mx-3 text-sm font-medium text-gray-900">
                  {quantity} {item.unit}
                </span>
                <button 
                  onClick={() => handleQuantityChange(1)}
                  className="rounded-md border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-50"
                  type="button"
                  aria-label="Increment quantity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                  </svg>
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {item.quantity} {item.unit}
              </p>
            )}
            
            {item.minQuantity !== null && item.minQuantity !== undefined && (
              <p className="mt-1 text-xs text-gray-500">
                Minimum: {item.minQuantity} {item.unit}
                {item.quantity < item.minQuantity && (
                  <span className="ml-2 text-red-500 font-medium">Low stock!</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Bin locations */}
      {bins.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 rounded-b-lg">
          <h3 className="text-sm font-medium text-gray-700">Storage Locations</h3>
          <ul className="mt-2 divide-y divide-gray-200">
            {bins.map(binItem => (
              <li key={binItem.binId} className="py-2 flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="selectedBin"
                    id={`bin-${binItem.binId}`}
                    className="h-4 w-4 text-blue-600 mr-2"
                    checked={selectedBinId === binItem.binId}
                    onChange={() => setSelectedBinId(binItem.binId)}
                    disabled={!onMove}
                    aria-label={binItem.binId}
                  />
                  <Link href={`/bins/${binItem.binId}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {binItem.binId}
                  </Link>
                </div>
                <span className="text-sm text-gray-500">{binItem.quantity} {item.unit}</span>
              </li>
            ))}
          </ul>
          
          {/* Move functionality */}
          {onMove && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move to another bin
              </label>
              <div className="flex items-center">
                <select
                  className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm w-full mr-2"
                  value={targetBinId}
                  onChange={(e) => setTargetBinId(e.target.value)}
                  disabled={!selectedBinId}
                >
                  <option value="">Select destination bin</option>
                  {/* This would normally be populated with available bins */}
                  <option value="bin1">Bin 1</option>
                  <option value="bin2">Bin 2</option>
                  <option value="bin3">Bin 3</option>
                </select>
                <button
                  onClick={handleMoveItem}
                  disabled={!selectedBinId || !targetBinId}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  type="button"
                >
                  Move
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 