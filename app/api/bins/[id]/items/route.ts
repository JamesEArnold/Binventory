/**
 * @description Bin Items API implementation from Phase 1.1
 * @phase Core Infrastructure and Basic Bin Management
 * @dependencies Phase 1.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Validation schemas
const addItemToBinSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional()
});

// Factory function for creating bin items route handlers
function createBinItemsRouteHandlers() {
  // Helper function to check if bin exists
  async function checkBinExists(binId: string) {
    const bin = await prisma.bin.findUnique({
      where: { id: binId }
    });
    
    return !!bin;
  }

  // Helper function to check if item exists
  async function checkItemExists(itemId: string) {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });
    
    return !!item;
  }

  // Handler for getting items in a bin
  async function getItemsHandler(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const binId = params.id;
      
      // Check if bin exists
      const binExists = await checkBinExists(binId);
      if (!binExists) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'BIN_NOT_FOUND', 
              message: 'Bin not found' 
            } 
          }, 
          { status: 404 }
        );
      }
      
      // Get bin items
      const binItems = await prisma.binItem.findMany({
        where: { binId },
        include: {
          item: true
        }
      });
      
      return NextResponse.json({ success: true, data: binItems });
    } catch (error) {
      console.error('Error fetching bin items:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'An error occurred while fetching bin items' 
          } 
        }, 
        { status: 500 }
      );
    }
  }

  // Handler for adding an item to a bin
  async function addItemHandler(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const binId = params.id;
      
      // Check if bin exists
      const binExists = await checkBinExists(binId);
      if (!binExists) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'BIN_NOT_FOUND', 
              message: 'Bin not found' 
            } 
          }, 
          { status: 404 }
        );
      }
      
      // Parse and validate request body
      const body = await req.json();
      const validationResult = addItemToBinSchema.safeParse(body);
      
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: 'Invalid request data',
              details: validationResult.error.format()
            } 
          }, 
          { status: 400 }
        );
      }
      
      const { itemId, quantity, notes } = validationResult.data;
      
      // Check if item exists
      const itemExists = await checkItemExists(itemId);
      if (!itemExists) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'ITEM_NOT_FOUND', 
              message: 'Item not found' 
            } 
          }, 
          { status: 404 }
        );
      }
      
      // Check if item is already in bin
      const existingBinItem = await prisma.binItem.findUnique({
        where: {
          binId_itemId: {
            binId,
            itemId
          }
        }
      });
      
      let binItem;
      
      if (existingBinItem) {
        // Update quantity if already exists
        binItem = await prisma.binItem.update({
          where: {
            binId_itemId: {
              binId,
              itemId
            }
          },
          data: {
            quantity: existingBinItem.quantity + quantity,
            notes: notes || existingBinItem.notes
          }
        });
      } else {
        // Create new bin item
        binItem = await prisma.binItem.create({
          data: {
            binId,
            itemId,
            quantity,
            notes: notes || null
          }
        });
      }
      
      return NextResponse.json({ success: true, data: binItem }, { status: 201 });
    } catch (error) {
      console.error('Error adding item to bin:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'An error occurred while adding the item to the bin' 
          } 
        }, 
        { status: 500 }
      );
    }
  }

  return {
    GET: getItemsHandler,
    POST: addItemHandler
  };
}

// Create route handlers
const handlers = createBinItemsRouteHandlers();

// Export the GET and POST handlers
export const GET = handlers.GET;
export const POST = handlers.POST; 