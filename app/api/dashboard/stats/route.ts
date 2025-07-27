import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    // Define the base query filter
    let whereClause: Prisma.BinWhereInput = {};
    
    if (organizationId) {
      // Organization context
      whereClause = { organizationId };
    } else {
      // Personal context
      whereClause = { userId };
    }

    // Get bin count
    const binCount = await prisma.bin.count({
      where: whereClause
    });
    
    // Get item count
    const itemCount = await prisma.item.count({
      where: whereClause as Prisma.ItemWhereInput
    });
    
    // Get category count
    const categoryCount = await prisma.category.count({
      where: whereClause as Prisma.CategoryWhereInput
    });
    
    // Get recent bins
    const recentBins = await prisma.bin.findMany({
      where: whereClause,
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    
    // Get all bins for batch printing
    const allBins = await prisma.bin.findMany({
      where: whereClause,
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
    
    return NextResponse.json({
      binCount,
      itemCount,
      categoryCount,
      recentBins,
      printableBins
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
} 