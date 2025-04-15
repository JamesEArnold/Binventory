/**
 * @description Dashboard homepage implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import Link from 'next/link';
import { prisma } from './lib/prisma';
import BatchPrintAction from './components/BatchPrintAction';

async function getDashboardStats() {
  const binCount = await prisma.bin.count();
  const itemCount = await prisma.item.count();
  const categoryCount = await prisma.category.count();
  
  const recentBins = await prisma.bin.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  
  // Get all bins for batch printing
  const allBins = await prisma.bin.findMany({
    select: {
      id: true,
      label: true,
      location: true,
      description: true
    },
    orderBy: {
      label: 'asc'
    }
  });
  
  const printableBins = allBins.map(bin => ({
    id: bin.id,
    label: bin.label,
    location: bin.location,
    description: bin.description || undefined,
    qrCodeUrl: `/api/qr/image/${bin.id}`
  }));
  
  return {
    binCount,
    itemCount,
    categoryCount,
    recentBins,
    printableBins
  };
}

export default async function HomePage() {
  const { binCount, itemCount, categoryCount, recentBins, printableBins } = await getDashboardStats();
  
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Link href="/bins" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bins</p>
              <p className="text-2xl font-semibold text-gray-900">{binCount}</p>
            </div>
          </div>
        </Link>
        
        <Link href="/items" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{itemCount}</p>
            </div>
          </div>
        </Link>
        
        <Link href="/categories" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div className="flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">{categoryCount}</p>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Link href="/bins/new" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="h-6 w-6 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium text-gray-600">New Bin</span>
          </Link>
          
          <Link href="/items/new" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="h-6 w-6 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium text-gray-600">New Item</span>
          </Link>
          
          <Link href="/scanner" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="h-6 w-6 text-yellow-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-600">Scan QR</span>
          </Link>
          
          <Link href="/search" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="h-6 w-6 text-red-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-600">Search</span>
          </Link>
          
          <BatchPrintAction bins={printableBins} />
        </div>
      </div>
      
      {/* Recent Bins */}
      {recentBins.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Bins</h2>
            <Link href="/bins" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View All
            </Link>
          </div>
          
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {recentBins.map(bin => (
                <li key={bin.id} className="py-3">
                  <Link href={`/bins/${bin.id}`} className="flex justify-between items-center hover:bg-gray-50 -mx-3 px-3 py-1 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-blue-600">{bin.label}</p>
                      <p className="text-xs text-gray-500">{bin.location}</p>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
