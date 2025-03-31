/**
 * @description Bin image upload API route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBinService } from '@/services/bin';
import { createAppError } from '@/utils/errors';
import { storageService } from '@/services/storage';
import { checkS3Connectivity } from '@/lib/s3';

// Define a type for our custom error
interface AppError extends Error {
  code: string;
  httpStatus: number;
}

// Function to type guard for AppError
function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'code' in error && 'httpStatus' in error;
}

const binService = createBinService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const binId = params.id;
    console.log(`Processing image upload for bin: ${binId}`);
    
    // Check S3 connectivity first
    const s3Connected = await checkS3Connectivity();
    if (!s3Connected) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'S3_UNAVAILABLE',
            message: 'S3 storage service is currently unavailable. Please try again later.',
          },
        },
        { status: 503 }
      );
    }
    
    // Check if bin exists
    const bin = await binService.get(binId);
    console.log(`Found bin: ${bin.label}`);
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      throw createAppError({
        code: 'MISSING_FILE',
        message: 'No image file provided',
        httpStatus: 400,
      });
    }
    
    console.log(`Processing file of type ${file.type} and size ${file.size} bytes`);
    
    // Delete old image if it exists
    if (bin.imageKey) {
      console.log(`Deleting old image with key: ${bin.imageKey}`);
      await storageService.deleteFile(bin.imageKey);
    }
    
    // Upload the new image to S3
    console.log('Uploading new image to S3...');
    const uploadResult = await storageService.uploadFile(file);
    console.log(`Upload successful, assigned key: ${uploadResult.key}`);
    
    // Update the bin with the new image URL and key
    const updatedBin = await binService.update(binId, {
      imageUrl: uploadResult.url,
      imageKey: uploadResult.key,
    });
    console.log('Bin updated with new image information');
    
    return NextResponse.json({
      success: true,
      data: {
        imageUrl: updatedBin.imageUrl,
      },
    });
  } catch (error) {
    console.error('Error uploading bin image:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorCode = isAppError(error) ? error.code : 'UNKNOWN_ERROR';
    const httpStatus = isAppError(error) ? error.httpStatus : 500;
    
    let additionalInfo = {};
    
    // Add more context for specific errors
    if (errorCode === 'S3_SERVICE_ERROR' || errorCode === 'STORAGE_ERROR') {
      additionalInfo = {
        suggestion: 'Please check your S3 configuration and ensure the service is running correctly.',
        retry: true
      };
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          ...additionalInfo
        },
      },
      { status: httpStatus }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const binId = params.id;
    console.log(`Processing image deletion for bin: ${binId}`);
    
    // Check if bin exists
    const bin = await binService.get(binId);
    
    if (!bin.imageUrl || !bin.imageKey) {
      console.log(`No image found for bin: ${binId}`);
      return NextResponse.json({
        success: true,
        data: null,
      });
    }
    
    // Check S3 connectivity before deletion
    const s3Connected = await checkS3Connectivity();
    if (!s3Connected) {
      console.warn('S3 storage service is unavailable for deletion, proceeding with database update only');
      // Even if S3 is unavailable, we can still update the database record
    } else {
      // Delete the image from S3
      console.log(`Deleting image with key: ${bin.imageKey}`);
      await storageService.deleteFile(bin.imageKey);
    }
    
    // Update the bin to remove the image URL and key
    await binService.update(binId, {
      imageUrl: null,
      imageKey: null,
    });
    console.log('Bin updated to remove image references');
    
    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error deleting bin image:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorCode = isAppError(error) ? error.code : 'UNKNOWN_ERROR';
    const httpStatus = isAppError(error) ? error.httpStatus : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      },
      { status: httpStatus }
    );
  }
} 