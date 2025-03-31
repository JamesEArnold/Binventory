import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/internal/bins
// Simple internal API endpoint to directly fetch all bins
export async function GET() {
  try {
    const bins = await prisma.bin.findMany({
      orderBy: {
        label: 'asc'
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      bins 
    });
  } catch (error) {
    console.error('Error fetching bins directly:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch bins' 
        } 
      }, 
      { status: 500 }
    );
  }
} 