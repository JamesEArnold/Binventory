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
  const { id } = await params;
  const bin = await getBinWithItems(id);
  
  if (!bin) {
    notFound();
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/bins" className="text-blue-600 hover:text-blue-800">
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
            <span className="ml-2 text-gray-600">{bin.label}</span>
          </li>
        </ol>
      </nav>
      
      {/* Bin header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{bin.label}</h1>
          <div className="mt-1 flex items-center text-gray-600">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="mr-1 h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{bin.location}</span>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-0 space-x-3">
          <Link 
            href={`/bins/${bin.id}/edit`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="mr-2 h-5 w-5 text-gray-500" 
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
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="mr-2 h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Link>
        </div>
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bin description */}
        {bin.description && (
          <div className="rounded-lg bg-gray-50 p-4">
            <h2 className="text-lg font-medium text-gray-900">Description</h2>
            <p className="mt-1 text-gray-600">{bin.description}</p>
          </div>
        )}

        {/* Bin image */}
        {bin.imageUrl && (
          <div className="rounded-lg bg-gray-50 p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Image</h2>
            <div className="relative aspect-video overflow-hidden rounded-md border border-gray-200">
              <Image 
                src={bin.imageUrl}
                alt={`Image of ${bin.label}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* QR code */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">QR Code</h2>
        <div className="mt-2 inline-block bg-white p-4 border border-gray-200 rounded-lg">
          <img 
            src={`/api/qr/image/${bin.id}`} 
            alt={`QR code for ${bin.label}`}
            className="h-32 w-32 object-contain"
          />
          <div className="mt-2 text-center text-sm text-gray-500">
            Scan to quickly access this bin
          </div>
        </div>
      </div>
      
      {/* Items list */}
      <div>
        <h2 className="text-xl font-medium text-gray-900">Items ({bin.items.length})</h2>
        {bin.items.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-gray-500">No items in this bin yet.</p>
            <Link 
              href={`/bins/${bin.id}/items/add`}
              className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-1 h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first item
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {bin.items.map((binItem: BinItemWithItem) => (
              <div key={binItem.itemId}>
                {binItem.item && (
                  <ItemDetail 
                    item={binItem.item}
                    bins={[binItem]}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 