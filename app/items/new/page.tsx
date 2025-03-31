'use client';

/**
 * @description New Item creation page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  parent_id?: string;
}

interface Bin {
  id: string;
  label: string;
  location?: string;
}

export default function NewItemPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    quantity: 1,
    min_quantity: 0,
    unit: 'pieces',
    bin_id: '',
    notes: '',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [binDataLoaded, setBinDataLoaded] = useState(false);
  
  const router = useRouter();
  
  // Direct Prisma fetch fallback
  const fetchBinsWithPrisma = async () => {
    try {
      console.log('Attempting to fetch bins directly with Prisma...');
      const res = await fetch('/api/internal/bins');
      
      if (!res.ok) {
        console.error('Prisma fallback failed:', res.status);
        return [];
      }
      
      const data = await res.json();
      console.log('Prisma direct fetch result:', data);
      return data.bins || [];
    } catch (err) {
      console.error('Prisma direct fetch error:', err);
      return [];
    }
  };

  // Fetch categories and bins when component mounts
  useEffect(() => {
    // Add a small delay to ensure the component is fully mounted
    const fetchWithRetry = async (url: string, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Fetching ${url}, attempt ${i + 1}`);
          const response = await fetch(url);
          if (response.ok) {
            return await response.json();
          }
          console.error(`Failed to fetch ${url}, status: ${response.status}`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Fetch error for ${url}:`, err);
        }
      }
      throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
    };

    const fetchData = async () => {
      try {
        // Fetch categories
        console.log('Starting data fetch...');
        let categoriesData;
        try {
          categoriesData = await fetchWithRetry('/api/categories');
          setCategories(categoriesData.data || []);
          console.log('Categories loaded:', categoriesData.data?.length || 0);
        } catch (catErr) {
          console.error('Categories fetch failed:', catErr);
          setCategories([]);
        }
        
        // Fetch bins
        try {
          console.log('Starting bins fetch...');
          const binsData = await fetchWithRetry('/api/bins');
          
          console.log('Bins API response:', binsData);
          console.log('Bins data structure:', 
            binsData && typeof binsData === 'object' ? 
            Object.keys(binsData).join(', ') : typeof binsData);
          
          if (binsData && binsData.success && Array.isArray(binsData.data)) {
            console.log(`Setting ${binsData.data.length} bins:`, 
              binsData.data.map((b: Bin) => `${b.id}: ${b.label}`));
            setBins(binsData.data);
          } else {
            console.error('Invalid bins data format:', binsData);
            
            // Try fallback to direct Prisma fetch
            console.log('Trying Prisma fallback...');
            const prismaBins = await fetchBinsWithPrisma();
            
            if (prismaBins.length > 0) {
              console.log('Prisma fallback successful:', prismaBins.length, 'bins');
              setBins(prismaBins);
            } else {
              console.error('Both API and Prisma fallback failed');
              setBins([]);
            }
          }
        } catch (binErr) {
          console.error('Bins fetch failed completely:', binErr);
          
          // Try fallback to direct Prisma fetch
          console.log('Trying Prisma fallback after error...');
          const prismaBins = await fetchBinsWithPrisma();
          
          if (prismaBins.length > 0) {
            console.log('Prisma fallback successful after error:', prismaBins.length, 'bins');
            setBins(prismaBins);
          } else {
            console.error('Both API and Prisma fallback failed');
            setBins([]);
          }
        }
        
        // Mark bin data as loaded regardless of result
        setBinDataLoaded(true);
      } catch (err) {
        console.error('Overall data fetching error:', err);
        setError('Failed to load required data. Please refresh the page.');
        setBinDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Use setTimeout to ensure component is mounted before fetching
    const timer = setTimeout(() => {
      fetchData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Log when bins state changes
  useEffect(() => {
    console.log('Current bins state:', bins);
  }, [bins]);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'min_quantity' ? parseInt(value) || 0 : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Step 1: Create the item
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id || undefined,
          quantity: formData.quantity,
          min_quantity: formData.min_quantity,
          unit: formData.unit,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create item');
      }
      
      const itemId = data.data.id;
      
      // Step 2: If bin is selected, add item to bin
      if (formData.bin_id) {
        const binResponse = await fetch(`/api/bins/${formData.bin_id}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: itemId,
            quantity: formData.quantity,
            notes: formData.notes || undefined,
          }),
        });
        
        const binData = await binResponse.json();
        
        if (!binResponse.ok) {
          throw new Error(binData.error?.message || 'Failed to add item to bin');
        }
        
        // Redirect to bin page if item was added to a bin
        router.push(`/bins/${formData.bin_id}`);
      } else {
        // Otherwise redirect to the newly created item page
        router.push(`/items/${itemId}`);
      }
    } catch (err) {
      console.error('Error creating item:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
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
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Item</h1>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
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
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Phillips Screwdriver, AAA Batteries"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description of the item"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Category --</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="mt-1 flex justify-end">
              <Link href="/categories/new" className="text-xs text-blue-600 hover:text-blue-800">
                Create New Category
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                required
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="min_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Min Quantity
              </label>
              <input
                type="number"
                id="min_quantity"
                name="min_quantity"
                min="0"
                value={formData.min_quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alert threshold
              </p>
            </div>
            
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <select
                id="unit"
                name="unit"
                required
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pieces">Pieces</option>
                <option value="boxes">Boxes</option>
                <option value="pairs">Pairs</option>
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
                <option value="meters">Meters</option>
                <option value="sets">Sets</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4 border-t border-gray-200 pt-4 mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Add directly to a bin (optional)</div>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
                <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-500">Loading bins...</span>
              </div>
            ) : binDataLoaded && bins.length === 0 ? (
              <div className="rounded-md bg-blue-50 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      No bins found. Create a bin first to add this item directly to it.
                    </p>
                    <p className="mt-3 text-sm md:mt-0 md:ml-6">
                      <Link 
                        href="/bins/new" 
                        className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
                      >
                        Create Bin →
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="bin_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Bin {bins.length > 0 ? `(${bins.length} available)` : '(No bins found)'}
                </label>
                <select
                  id="bin_id"
                  name="bin_id"
                  value={formData.bin_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Bin --</option>
                  {bins.map(bin => (
                    <option key={bin.id} value={bin.id}>
                      {bin.label} {bin.location ? `(${bin.location})` : ''}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex justify-end">
                  <Link href="/bins/new" className="text-xs text-blue-600 hover:text-blue-800">
                    Create New Bin
                  </Link>
                </div>
              </div>
            )}
            
            {formData.bin_id && (
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Bin Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes about this item in the selected bin"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-6">
            <Link
              href="/items"
              className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 