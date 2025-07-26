'use client';

import { FC } from 'react';
import { ObjectType } from '@/types/permission';
import { SharedIndicator } from './SharedIndicator';
import { ShareButton } from './ShareButton';

interface ShareComponentsOptions {
  objectType: ObjectType;
  canShare?: boolean;
}

export interface ShareComponents {
  Indicator: FC<{ id: string; name: string; className?: string }>;
  Button: FC<{ id: string; name: string; className?: string }>;
}

/**
 * Factory function that creates share components for a specific object type
 */
export function createShareComponents(options: ShareComponentsOptions): ShareComponents {
  const { objectType, canShare = true } = options;
  
  // Component for showing shared status
  const Indicator: FC<{ id: string; name: string; className?: string }> = ({ 
    id, 
    className = '' 
  }) => {
    return <SharedIndicator objectType={objectType} objectId={id} className={className} />;
  };
  
  // Button for sharing an object
  const Button: FC<{ id: string; name: string; className?: string }> = ({ 
    id, 
    name, 
    className = '' 
  }) => {
    if (!canShare) return null;
    return (
      <ShareButton 
        objectType={objectType} 
        objectId={id} 
        objectName={name} 
        className={className}
      />
    );
  };
  
  return {
    Indicator,
    Button
  };
} 