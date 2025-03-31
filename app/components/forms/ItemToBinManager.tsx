'use client';

/**
 * @description Manager component for switching between adding existing items and creating new items
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { useState } from 'react';
import ItemAddForm from './ItemAddForm';
import CreateItemInBinForm from './CreateItemInBinForm';

interface Item {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
}

interface Bin {
  id: string;
  label: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
}

interface ItemToBinManagerProps {
  bin: Bin;
  availableItems: Item[];
  categories: Category[];
}

type Mode = 'add-existing' | 'create-new';

export default function ItemToBinManager({ bin, availableItems, categories }: ItemToBinManagerProps) {
  const [mode, setMode] = useState<Mode>('add-existing');
  
  return (
    <div>
      <div className="mb-6 flex justify-center space-x-2">
        <button
          type="button"
          onClick={() => setMode('add-existing')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            mode === 'add-existing' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Add Existing Item
        </button>
        <button
          type="button"
          onClick={() => setMode('create-new')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            mode === 'create-new' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Create New Item
        </button>
      </div>
      
      {mode === 'add-existing' ? (
        <ItemAddForm bin={bin} availableItems={availableItems} />
      ) : (
        <CreateItemInBinForm bin={bin} categories={categories} onCancel={() => setMode('add-existing')} />
      )}
    </div>
  );
} 