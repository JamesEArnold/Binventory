'use client';

/**
 * @description PrintCardWrapper component for dynamically loading the PrintCard component
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { FC, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the PrintCard component with no SSR to avoid window/document issues
const PrintCard = dynamic(() => import('./PrintCard'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-sm text-gray-500">Loading print card...</div>
});

export interface PrintCardWrapperProps {
  id: string;
  label: string;
  location: string;
  description?: string;
  qrCodeUrl: string;
}

export const PrintCardWrapper: FC<PrintCardWrapperProps> = (props) => {
  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading print card...</div>}>
        <PrintCard {...props} />
      </Suspense>
    </div>
  );
}; 