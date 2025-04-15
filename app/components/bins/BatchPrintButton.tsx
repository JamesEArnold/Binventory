'use client';

/**
 * @description BatchPrintButton component for printing multiple bin labels
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2, Phase 3.1
 */

import { FC, useState } from 'react';
import { PrintButton, PrintButtonProps } from './PrintButton';

interface BatchPrintButtonProps {
  allBins: Omit<PrintButtonProps, 'allBins'>[];
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const BatchPrintButton: FC<BatchPrintButtonProps> = ({ 
  allBins, 
  isOpen: externalIsOpen, 
  onOpenChange 
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Determine if modal is open based on props or internal state
  const isModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  // Function to open the modal
  const openModal = () => {
    if (onOpenChange) {
      onOpenChange(true);
    } else {
      setInternalIsOpen(true);
    }
  };
  
  // Function to close the modal
  const closeModal = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setInternalIsOpen(false);
    }
  };
  
  // Use the first bin as a placeholder for the PrintButton
  const firstBin = allBins[0];
  
  return (
    <>
      <button
        onClick={openModal}
        className="h-6 w-6 text-purple-600 mb-2 cursor-pointer"
        aria-label="Batch print bin labels"
      >
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
      </button>
      
      {isModalOpen && (
        <PrintButton
          id={firstBin.id}
          label={firstBin.label}
          location={firstBin.location}
          description={firstBin.description}
          qrCodeUrl={firstBin.qrCodeUrl}
          allBins={allBins}
          openModalDirectly={true}
          onClose={closeModal} />
      )}
    </>
  );
};

export default BatchPrintButton; 