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

  return (
    <div 
      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={() => setIsModalOpen(true)}
    >
      <BatchPrintButton 
        allBins={bins} 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
      <span className="text-sm font-medium text-gray-600">Batch Print</span>
    </div>
  );
} 