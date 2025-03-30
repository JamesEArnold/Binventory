/**
 * @description Navigation component implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Navigation() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-semibold text-blue-600">Binventory</span>
            </Link>
            
            <div className="ml-10 flex items-center space-x-4">
              <Link 
                href="/bins" 
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Bins
              </Link>
              
              <Link 
                href="/items" 
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Items
              </Link>
              
              <Link 
                href="/categories" 
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Categories
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg 
                  className="w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input 
                type="search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-10 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Search items, bins..." 
              />
            </form>
            
            <Link
              href="/scanner"
              className="ml-4 relative rounded-full bg-blue-100 p-1 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Open scanner"
            >
              <svg 
                className="h-6 w-6 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
            
            <button 
              type="button" 
              className="ml-4 relative rounded-full bg-gray-100 p-1 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg 
                className="h-6 w-6 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                3
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 