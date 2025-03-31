/**
 * @description Add Item to Bin page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ItemToBinManager from '@/components/forms/ItemToBinManager';

// Fetch bin by ID
async function getBinById(id: string) {
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
  
  return bin;
}

// Fetch available items not in the bin
async function getAvailableItems(binId: string) {
  const binItems = await prisma.binItem.findMany({
    where: { binId },
    select: { itemId: true }
  });
  
  const binItemIds = binItems.map(bi => bi.itemId);
  
  const availableItems = await prisma.item.findMany({
    where: {
      id: {
        notIn: binItemIds
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  return availableItems;
}

// Fetch all categories for new item creation
async function getAllCategories() {
  const categories = await prisma.category.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  return categories;
}

export default async function AddItemToBinPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  // Fetch bin
  const bin = await getBinById(id);
  if (!bin) {
    notFound();
  }
  
  // Fetch available items
  const availableItems = await getAvailableItems(id);
  
  // Fetch categories for new item creation
  const categories = await getAllCategories();
  
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="mb-6">
        <div className="flex items-center">
          <Link 
            href={`/bins/${id}`}
            className="mr-2 text-blue-600 hover:text-blue-800"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add Items to Bin: {bin.label}</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Add existing items or create new items for this bin
        </p>
      </div>
      
      <div className="mt-8">
        <ItemToBinManager bin={bin} availableItems={availableItems} categories={categories} />
      </div>
    </div>
  );
} 