'use client';

import { createShareComponents } from '@/components/organization/createShareComponents';
import { ObjectType } from '@/types/permission';

// Create bin sharing components using the factory
const BinShare = createShareComponents({
  objectType: ObjectType.BIN,
  canShare: true
});

/**
 * Client-side component for displaying sharing features in bin detail page
 */
interface BinDetailShareProps {
  id: string;
  name: string;
}

const BinDetailShare = ({ id, name }: BinDetailShareProps) => {
  return (
    <div className="flex items-center gap-2">
      <BinShare.Indicator id={id} name={name} />
      <BinShare.Button 
        id={id} 
        name={name} 
        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default BinDetailShare; 