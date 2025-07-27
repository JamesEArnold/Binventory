/**
 * @description Bin detail page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '../../lib/prisma';
import { ItemDetail } from '../../components/items/ItemDetail';
import { Item, BinItem } from '../../types/models';
import { storageService } from '@/services/storage';
import { requireAuth } from '../../lib/auth';
import BinDetailHeader from './BinDetailHeader';

// Define a type that includes the item relation
interface BinItemWithItem extends BinItem {
  item: Item;
}

// Get a single bin with all its items
async function getBinWithItems(id: string) {
  const bin = await prisma.bin.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          item: true
        }
      }
    }
  });
  
  if (!bin) {
    return null;
  }

  // If the bin has an image key but URL is expired or missing, get a fresh URL
  if (bin.imageKey && (!bin.imageUrl || isUrlExpired(bin.imageUrl))) {
    try {
      bin.imageUrl = await storageService.getFileUrl(bin.imageKey);
      
      // Update the bin with the fresh URL
      await prisma.bin.update({
        where: { id: bin.id },
        data: { imageUrl: bin.imageUrl }
      });
    } catch (error) {
      console.error('Error refreshing image URL:', error);
      // If we can't refresh the URL, just show without image
    }
  }
  
  return bin;
}

// Check if a URL is expired or invalid
function isUrlExpired(url: string): boolean {
  try {
    // Parse URL to get query parameters
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get('Expires');
    
    if (!expiresParam) return true; // No expiration, assume expired
    
    const expiresTimestamp = parseInt(expiresParam, 10) * 1000; // Convert to milliseconds
    const now = Date.now();
    
    // Check if URL is expired or will expire in the next hour
    return expiresTimestamp < (now + 3600 * 1000);
  } catch {
    // If the URL is invalid, treat as expired
    return true;
  }
}

export default async function BinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Ensure user is authenticated
  await requireAuth();
  
  const { id } = await params;
  const bin = await getBinWithItems(id);
  
  if (!bin) {
    notFound();
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/bins" className="text-blue-600 hover:text-blue-800 font-medium">
              Bins
            </Link>
          </li>
          <li className="flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="ml-2 text-gray-600 font-medium">{bin.label}</span>
          </li>
        </ol>
      </nav>
      
      {/* Bin header */}
      <BinDetailHeader bin={bin} />
      
      {/* Items section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Items in Bin</h2>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700">
              {bin.items.length} {bin.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          
          {bin.items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding an item to this bin.</p>
              <div className="mt-6">
                <Link
                  href={`/bins/${bin.id}/items/add`}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="mr-2 h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add your first item
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bin.items.map((binItem: BinItemWithItem) => (
                <div key={binItem.itemId} className="flex">
                  {binItem.item && (
                    <ItemDetail 
                      item={binItem.item}
                      bins={[{
                        ...binItem,
                        bin: {
                          label: bin.label,
                          location: bin.location
                        }
                      }]}
                      className="flex-1"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 