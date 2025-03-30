/**
 * @description BinCard component implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { FC } from 'react';
import Link from 'next/link';
import { Bin, BinItem } from '../../types/models';

export interface BinCardProps {
  bin: Bin;
  items?: Array<BinItem & { item?: { name: string } }>;
  onEdit?: (bin: Bin) => void;
  onDelete?: (binId: string) => void;
  onScan?: (binId: string) => void;
  className?: string;
  compact?: boolean;
}

export const BinCard: FC<BinCardProps> = ({
  bin,
  items = [],
  onEdit,
  onDelete,
  onScan,
  className = '',
  compact = false,
}) => {
  const itemCount = items.length;
  
  return (
    <div 
      className={`rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
      data-testid={`bin-card-${bin.id}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Link href={`/bins/${bin.id}`} className="text-lg font-medium text-blue-600 hover:underline">
            {bin.label}
          </Link>
          
          <div className="flex space-x-2">
            {onScan && (
              <button 
                onClick={() => onScan(bin.id)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Scan QR code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                  <rect x="7" y="7" width="10" height="10" rx="2"></rect>
                </svg>
              </button>
            )}
            
            {onEdit && (
              <button 
                onClick={() => onEdit(bin)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Edit bin"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            )}
            
            {onDelete && (
              <button 
                onClick={() => onDelete(bin.id)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-red-500"
                aria-label="Delete bin"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 h-4 w-4">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{bin.location}</span>
          </div>
        </div>
        
        {!compact && bin.description && (
          <p className="mt-2 text-sm text-gray-500">{bin.description}</p>
        )}
        
        {!compact && (
          <div className="mt-3 flex items-center text-sm">
            <span className="font-medium text-gray-900">{itemCount}</span>
            <span className="ml-1 text-gray-500">item{itemCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      
      {!compact && items.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 rounded-b-lg">
          <h4 className="text-sm font-medium text-gray-700">Top items:</h4>
          <ul className="mt-1 space-y-1">
            {items.slice(0, 3).map(binItem => (
              <li key={binItem.itemId} className="flex items-center justify-between text-sm">
                <Link href={`/items/${binItem.itemId}`} className="text-blue-600 hover:underline">
                  {binItem.item?.name || 'Unknown item'}
                </Link>
                <span className="text-gray-500">{binItem.quantity}</span>
              </li>
            ))}
            {items.length > 3 && (
              <li className="text-sm text-gray-500 text-right">
                <Link href={`/bins/${bin.id}`} className="text-blue-600 hover:underline">
                  View all {items.length} items
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}; 