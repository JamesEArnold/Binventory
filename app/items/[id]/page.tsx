'use client';

/**
 * @description Item details page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minQuantity: number | null;
  unit: string;
  category: {
    id: string;
    name: string;
  } | null;
  bins: Array<{
    bin: {
      id: string;
      label: string;
      location: string;
    };
    quantity: number;
    notes?: string;
  }>;
}

interface EditableField {
  name: keyof Item | 'category_id' | 'min_quantity';
  value: string | number | undefined;
  type: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingField, setEditingField] = useState<EditableField['name'] | null>(null);
  const [editValue, setEditValue] = useState<EditableField['value']>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  
  const router = useRouter();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch item
        const itemResponse = await fetch(`/api/items/${id}`);
        if (!itemResponse.ok) {
          throw new Error('Failed to fetch item');
        }
        const itemData = await itemResponse.json();
        setItem(itemData.data);
        
        // Fetch categories for the dropdown
        const categoriesResponse = await fetch('/api/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load item details. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete item');
      }
      
      router.push('/items');
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      setIsDeleting(false);
    }
  };

  const startEditing = (field: EditableField['name'], currentValue: EditableField['value']) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue(undefined);
  };

  const handleEditChange = (value: EditableField['value']) => {
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!item || editingField === null) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [editingField]: editValue
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update item');
      }

      // Fetch the complete item data after update
      const refreshResponse = await fetch(`/api/items/${item.id}`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh item data');
      }
      const refreshData = await refreshResponse.json();
      setItem(refreshData.data);
      
      setEditingField(null);
      setEditValue(undefined);
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableField = (field: EditableField) => {
    const isEditing = editingField === field.name;
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          {field.type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => handleEditChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              autoFocus
            >
              <option value="">-- No Category --</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={editValue}
              onChange={(e) => handleEditChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              min={field.type === 'number' ? 0 : undefined}
              autoFocus
            />
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={saveEdit}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </>
              )}
            </button>
            <button
              onClick={cancelEditing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="group relative p-2 -m-2 rounded-md hover:bg-gray-50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {field.type === 'select' && field.name === 'category_id' ? (
            item?.category ? (
              <Link href={`/categories/${item.category.id}`} className="text-blue-600 hover:text-blue-800">
                {item.category.name}
              </Link>
            ) : (
              <span className="text-gray-500 italic">Uncategorized</span>
            )
          ) : (
            <span className={field.value ? 'text-gray-900' : 'text-gray-500 italic'}>
              {field.value || 'Not set'}
            </span>
          )}
        </div>
        <button
          onClick={() => startEditing(field.name, field.value)}
          className="ml-2 text-gray-400 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors duration-200"
          title="Edit"
        >
          <div className="flex items-center">
            <span className="text-sm mr-1 font-medium text-gray-500 group-hover:text-blue-600">Edit</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </button>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center bg-white">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Item not found</h2>
          <p className="mt-1 text-sm text-gray-500">The item you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <div className="mt-6">
            <Link
              href="/items"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Items
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="mb-6">
        <Link href="/items" className="text-blue-600 hover:text-blue-800 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Items
        </Link>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          <button
            onClick={handleDelete}
            disabled={isDeleting || (item.bins?.length ?? 0) > 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Item Details</h3>
            <p className="mt-1 text-sm text-gray-500">Hover over a field to edit it.</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {renderEditableField({
                    name: 'name',
                    value: item.name,
                    type: 'text'
                  })}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {renderEditableField({
                    name: 'description',
                    value: item.description || '',
                    type: 'text'
                  })}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {renderEditableField({
                    name: 'category_id',
                    value: item.category?.id || '',
                    type: 'select',
                    options: categories.map(cat => ({
                      value: cat.id,
                      label: cat.name
                    }))
                  })}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      {renderEditableField({
                        name: 'quantity',
                        value: item.quantity,
                        type: 'number'
                      })}
                    </div>
                    <div className="flex-1">
                      {renderEditableField({
                        name: 'unit',
                        value: item.unit,
                        type: 'select',
                        options: [
                          { value: 'pieces', label: 'Pieces' },
                          { value: 'boxes', label: 'Boxes' },
                          { value: 'pairs', label: 'Pairs' },
                          { value: 'kg', label: 'Kilograms' },
                          { value: 'liters', label: 'Liters' },
                          { value: 'meters', label: 'Meters' },
                          { value: 'sets', label: 'Sets' }
                        ]
                      })}
                    </div>
                  </div>
                  <div className="mt-2">
                    Min Quantity: {renderEditableField({
                      name: 'min_quantity',
                      value: item.minQuantity || 0,
                      type: 'number'
                    })}
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        
        {(item.bins?.length ?? 0) > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Locations</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
              <ul className="divide-y divide-gray-200">
                {item.bins?.map(({ bin, quantity, notes }) => (
                  <li key={bin.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/bins/${bin.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {bin.label}
                        </Link>
                        <p className="mt-1 text-sm text-gray-500">{bin.location}</p>
                        {notes && (
                          <p className="mt-1 text-sm text-gray-600">Note: {notes}</p>
                        )}
                      </div>
                      <div className="ml-4 text-sm text-gray-900">
                        {quantity} {item.unit}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 