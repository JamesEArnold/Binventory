'use client';

import { FC, useState, useEffect } from 'react';
import { ObjectType } from '@/types/permission';
import { useOrganization } from '@/contexts/OrganizationContext';

interface SharedIndicatorProps {
  objectType: ObjectType;
  objectId: string;
  className?: string;
}

export const SharedIndicator: FC<SharedIndicatorProps> = ({
  objectType,
  objectId,
  className = ''
}) => {
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { context } = useOrganization();
  
  useEffect(() => {
    // Check if object is shared
    const checkSharedStatus = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build URL with context information
        let url = `/api/objects/${objectType}/${objectId}/shared-status`;
        
        // Add context parameters
        const params = new URLSearchParams();
        
        if (context.type === 'organization') {
          params.append('contextType', 'organization');
          params.append('organizationId', context.id);
        } else {
          params.append('contextType', 'personal');
        }
        
        // Append query params to URL
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to check sharing status');
        }
        
        if (data.success) {
          setIsShared(data.data.isShared);
        } else {
          throw new Error(data.error?.message || 'Unknown error');
        }
      } catch (err) {
        console.error('Error checking shared status:', err);
        setError(err instanceof Error ? err.message : 'Failed to check sharing status');
        setIsShared(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSharedStatus();
  }, [objectType, objectId, context]);
  
  if (isLoading) {
    return null; // Still loading
  }
  
  if (error) {
    // You could return a simple error indicator or nothing
    return null;
  }
  
  if (!isShared) {
    return null;
  }
  
  return (
    <div
      className={`inline-flex items-center text-xs font-medium text-blue-600 ${className}`}
      title="This item is shared"
    >
      <svg
        className="h-4 w-4 mr-1"
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
      {context.type === 'organization' ? 'Shared outside organization' : 'Shared'}
    </div>
  );
}; 