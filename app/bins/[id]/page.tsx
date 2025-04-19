/**
 * @description Bin detail page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '../../lib/prisma';
import { ItemDetail } from '../../components/items/ItemDetail';
import { Item, BinItem } from '../../types/models';
import { storageService } from '@/services/storage';
import { PrintButton } from '../../components/bins/PrintButton';
import { requireAuth } from '../../lib/auth';

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

export default async function BinDetailPage({ params }: { params: { id: string } }) {
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
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 break-words">{bin.label}</h1>
              <div className="flex items-center text-gray-600 mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="mr-2 h-5 w-5 flex-shrink-0" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{bin.location}</span>
              </div>
              {bin.description && (
                <p className="text-gray-600 max-w-2xl">{bin.description}</p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:items-start flex-shrink-0">
              <Link 
                href={`/bins/${bin.id}/edit`}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="mr-2 h-4 w-4 text-gray-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Bin
              </Link>
              
              <Link 
                href={`/bins/${bin.id}/items/add`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
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
                Add Item
              </Link>
              
              {/* Print Card button */}
              <PrintButton
                id={bin.id}
                label={bin.label}
                location={bin.location}
                description={bin.description || undefined}
                qrCodeUrl={`/api/qr/image/${bin.id}`}
              />
            </div>
          </div>
        </div>
        
        {/* Bin image and QR code section */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
            {/* Bin image */}
            {bin.imageUrl && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Bin Image</h2>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <Image 
                    src={bin.imageUrl}
                    alt={`Image of ${bin.label}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="transition-opacity duration-300"
                    onLoadingComplete={(image) => image.classList.remove('opacity-0')}
                  />
                </div>
              </div>
            )}
            
            {/* QR code */}
            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access</h2>
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-block bg-white p-4 border border-gray-200 rounded-lg">
                  <img 
                    src={`/api/qr/image/${bin.id}`} 
                    alt={`QR code for ${bin.label}`}
                    className="h-32 w-32 object-contain"
                  />
                  <div className="mt-2 text-center text-sm text-gray-500">
                    Scan to access this bin
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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