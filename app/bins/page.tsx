/**
 * @description Bins index page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { BinCard } from '../components/bins/BinCard';
import { prisma } from '../lib/prisma';

// Fetch bins with their items
async function getBinsWithItems() {
  const bins = await prisma.bin.findMany({
    include: {
      items: {
        include: {
          item: true
        }
      }
    },
    orderBy: {
      label: 'asc'
    }
  });
  
  return bins;
}

export default async function BinsPage() {
  const bins = await getBinsWithItems();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bins</h1>
        <a 
          href="/bins/new" 
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create New Bin
        </a>
      </div>
      
      {bins.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No bins found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new bin.
          </p>
          <a 
            href="/bins/new"
            className="mt-4 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="mr-2 h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Bin
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bins.map(bin => (
            <BinCard 
              key={bin.id} 
              bin={bin} 
              items={bin.items}
            />
          ))}
        </div>
      )}
    </div>
  );
} 