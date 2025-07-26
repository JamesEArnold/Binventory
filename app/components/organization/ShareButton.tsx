'use client';

import { FC, useState } from 'react';
import { ObjectType } from '@/types/permission';
import { SharingModal } from './SharingModal';

interface ShareButtonProps {
  objectType: ObjectType;
  objectId: string;
  objectName: string;
  className?: string;
}

export const ShareButton: FC<ShareButtonProps> = ({
  objectType,
  objectId,
  objectName,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <svg
          className="h-4 w-4 mr-1.5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>
      
      <SharingModal
        objectType={objectType}
        objectId={objectId}
        objectName={objectName}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}; 