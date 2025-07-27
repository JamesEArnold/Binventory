'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { PrintButton } from '../../components/bins/PrintButton';
import BinDetailShare from './BinDetailShare';

interface BinDetailHeaderProps {
  bin: {
    id: string;
    label: string;
    location: string;
    description?: string | null;
    imageUrl?: string | null;
  };
}

export default function BinDetailHeader({ bin }: BinDetailHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 sm:p-8">
        {/* Always visible header section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 break-words">{bin.label}</h1>
              <BinDetailShare id={bin.id} name={bin.label} />
            </div>
            <div className="flex items-center text-gray-600 mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-2 h-5 w-5 flex-shrink-0" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{bin.location}</span>
            </div>
            
            {/* Mobile expand/collapse toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isExpanded ? 'Show less' : 'Show more'}
                <svg 
                  className={`ml-1 h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {/* Description - always visible on desktop, collapsible on mobile */}
            {bin.description && (
              <div className={`${isExpanded ? 'block' : 'hidden'} md:block mt-4`}>
                <p className="text-gray-600 max-w-2xl">{bin.description}</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start flex-shrink-0">
            <Link 
              href={`/bins/${bin.id}/edit`}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-2 h-4 w-4 text-gray-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Bin
            </Link>
            
            <Link 
              href={`/bins/${bin.id}/items/add`}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-2 h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Link>
            
            <PrintButton
              id={bin.id}
              label={bin.label}
              location={bin.location}
              description={bin.description || undefined}
              qrCodeUrl={`/api/qr/image/${bin.id}`}
            />
          </div>
        </div>
      </div>
      
      {/* Bin image and QR code section - collapsible on mobile */}
      <div className={`border-t border-gray-200 bg-gray-50 ${isExpanded ? 'block' : 'hidden'} md:block`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          {/* Bin image */}
          {bin.imageUrl && (
            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Bin Image</h2>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                <Image 
                  src={bin.imageUrl}
                  alt={`Image of ${bin.label}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="transition-opacity duration-300"
                  onLoadingComplete={(image) => image.classList.remove('opacity-0')}
                />
              </div>
            </div>
          )}
          
          {/* QR code */}
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access</h2>
            <div className="flex items-center justify-center sm:justify-start">
              <div className="inline-block bg-white p-4 border border-gray-200 rounded-lg">
                <Image 
                  src={`/api/qr/image/${bin.id}`} 
                  alt={`QR code for ${bin.label}`}
                  width={128}
                  height={128}
                  className="h-32 w-32 object-contain"
                  unoptimized
                />
                <div className="mt-2 text-center text-sm text-gray-500">
                  Scan to access this bin
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}