'use client';

/**
 * @description BatchPrintAction component for the dashboard quick action
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2, Phase 3.1
 */

import { useState } from 'react';
import BatchPrintButton from './bins/BatchPrintButton';

interface BatchPrintActionProps {
  bins: Array<{
    id: string;
    label: string;
    location: string;
    description?: string;
    qrCodeUrl: string;
  }>;
}

export default function BatchPrintAction({ bins }: BatchPrintActionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isModalOpen) {
      setIsModalOpen(true);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={handleClick}
    >
      <div className="h-6 w-6 text-purple-600 mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
      </div>
      <span className="text-sm font-medium text-gray-600">Batch Print</span>
      
      <BatchPrintButton 
        allBins={bins} 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
} 