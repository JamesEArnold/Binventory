/**
 * @description Items index page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Item, Category } from '@prisma/client';

type ItemWithCategory = Item & {
  category: Category | null;
};

export default function ItemsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      window.location.href = '/login';
      return;
    }

    async function fetchItems() {
      try {
        const response = await fetch('/api/items');
        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }
        const data = await response.json();
        if (data.success) {
          setItems(data.data);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch items');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchItems();
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <Link 
          href="/items/new" 
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Create New Item
        </Link>
      </div>
      
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new item.
          </p>
          <Link 
            href="/items/new"
            className="mt-4 inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="mr-2 h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <div key={item.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-5">
                <Link href={`/items/${item.id}`}>
                  <h3 className="text-lg font-medium text-blue-600 hover:text-blue-800">{item.name}</h3>
                </Link>
                <p className="mt-1 text-sm text-gray-500">
                  {item.category ? item.category.name : 'Uncategorized'}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Quantity: {item.quantity} {item.unit}
                  </span>
                  <Link 
                    href={`/items/${item.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 