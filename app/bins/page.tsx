/**
 * @description Bins index page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { BinCard } from '../components/bins/BinCard';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { OperationContext } from '@/types/organization';
import { permissionService } from '@/services/permission';
import { ObjectType, Action, SubjectType } from '@/types/permission';

interface GetBinsOptions {
  context: OperationContext;
  userId: string;
}

interface SharedPermission {
  objectId: string;
}

// Fetch bins with their items based on context
async function getBinsWithItems({ context, userId }: GetBinsOptions) {
  // Build the where clause based on context
  const where = context.type === 'organization' && context.id
    ? { organizationId: context.id }  // Organization context
    : { userId };                     // Personal context

  const bins = await prisma.bin.findMany({
    where,
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
  
  // If in organization context, also fetch bins shared with the user
  if (context.type === 'organization' && context.id) {
    try {
      // Get permissions where the user has access to bins
      const permissions = await permissionService.getPermissions({
        subjectType: SubjectType.USER,
        subjectId: userId,
        objectType: ObjectType.BIN,
        action: Action.READ
      });
      
      // If there are shared bins, fetch and merge them
      if (permissions.length > 0) {
        const sharedBinIds = permissions.map((p: SharedPermission) => p.objectId);
        
        // Skip if no shared bin IDs
        if (sharedBinIds.length === 0) return bins;
        
        const sharedBins = await prisma.bin.findMany({
          where: {
            id: { in: sharedBinIds },
            organizationId: { not: context.id }, // Exclude bins from current org
          },
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
        
        // Add shared bins to the result
        bins.push(...sharedBins);
      }
    } catch (error) {
      console.error('Error fetching shared bins:', error);
    }
  }
  
  return bins;
}

export default async function BinsPage() {
  // Ensure user is authenticated
  const user = await requireAuth();
  
  // We determine context from the path in middleware or client components
  // For this server component, we'll default to personal context
  const context: OperationContext = { type: 'personal' };
  
  // Get bins based on context
  const bins = await getBinsWithItems({ 
    context, 
    userId: user.id 
  });
  
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bins</h1>
        <div className="flex space-x-3">
          <Link 
            href="/bins/new" 
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create New Bin
          </Link>
        </div>
      </div>
      
      {bins.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No bins found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new bin.
          </p>
          <Link 
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
          </Link>
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