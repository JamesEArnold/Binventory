import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  S3ServiceException
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createAppError } from '@/utils/errors';
import { s3Client, BUCKET_NAME, checkS3Connectivity } from '@/lib/s3';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

// Define allowed file types and maximum size (5MB)
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Storage service for managing file uploads and retrieval
 */
export function createStorageService() {
  return {
    /**
     * Upload a file to S3 storage
     */
    async uploadFile(file: File): Promise<UploadResult> {
      try {
        console.log(`Storage Service: Starting upload for file of type ${file.type} and size ${file.size} bytes`);
        
        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          throw createAppError({
            code: 'INVALID_FILE_TYPE',
            message: `File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
            httpStatus: 400,
          });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw createAppError({
            code: 'FILE_TOO_LARGE',
            message: `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            httpStatus: 400,
          });
        }

        // Check S3 connectivity before attempting upload
        const isConnected = await checkS3Connectivity();
        if (!isConnected) {
          throw createAppError({
            code: 'S3_CONNECTIVITY_ERROR',
            message: 'Cannot connect to S3 storage service',
            httpStatus: 503,
          });
        }

        // Generate a unique key for the file
        const fileExtension = file.type.split('/')[1];
        const key = `uploads/${nanoid()}.${fileExtension}`;
        console.log(`Storage Service: Generated key: ${key}`);

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`Storage Service: Converted file to buffer of size ${buffer.length} bytes`);

        // Optimize the image
        console.log('Storage Service: Optimizing image...');
        const optimizedBuffer = await sharp(buffer)
          .resize(800) // Resize to 800px width (maintaining aspect ratio)
          .toBuffer();
        console.log(`Storage Service: Optimized image to ${optimizedBuffer.length} bytes`);

        // Upload to S3
        console.log(`Storage Service: Uploading to S3 bucket: ${BUCKET_NAME}...`);
        const uploadCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: optimizedBuffer,
          ContentType: file.type,
        });
        
        await s3Client.send(uploadCommand);
        console.log('Storage Service: Upload successful');

        // Generate a presigned URL for immediate access
        console.log('Storage Service: Generating presigned URL...');
        const signedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          }),
          { expiresIn: 3600 * 24 * 7 } // URL valid for 7 days
        );
        console.log(`Storage Service: Generated presigned URL valid for 7 days`);

        return {
          url: signedUrl,
          key: key,
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        
        // Handle S3 specific errors
        if (error instanceof S3ServiceException) {
          console.error(`S3 Service Error: ${error.name}: ${error.message}`);
          return Promise.reject(createAppError({
            code: 'S3_SERVICE_ERROR',
            message: `S3 service error: ${error.message}`,
            httpStatus: 500,
          }));
        }
        
        if (error instanceof Error && 'code' in error && error.code === 'INVALID_FILE_TYPE') {
          throw error;
        }
        
        if (error instanceof Error && 'code' in error && error.code === 'FILE_TOO_LARGE') {
          throw error;
        }
        
        if (error instanceof Error && 'code' in error && error.code === 'S3_CONNECTIVITY_ERROR') {
          throw error;
        }
        
        throw createAppError({
          code: 'STORAGE_ERROR',
          message: error instanceof Error ? error.message : 'Error uploading file',
          httpStatus: 500,
        });
      }
    },

    /**
     * Delete a file from S3 storage
     */
    async deleteFile(key: string): Promise<void> {
      if (!key) return;
      
      console.log(`Storage Service: Deleting file with key: ${key}`);
      
      try {
        // Check S3 connectivity before attempting to delete
        const isConnected = await checkS3Connectivity();
        if (!isConnected) {
          console.warn('Cannot connect to S3 storage service for deletion');
          return;
        }
        
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          })
        );
        console.log(`Storage Service: Successfully deleted file with key: ${key}`);
      } catch (error) {
        console.error('Error deleting file:', error);
        // Don't throw, just log - we don't want to break operations if file deletion fails
      }
    },

    /**
     * Get a presigned URL for a file
     */
    async getFileUrl(key: string): Promise<string> {
      console.log(`Storage Service: Generating URL for key: ${key}`);
      
      try {
        // Check S3 connectivity first
        const isConnected = await checkS3Connectivity();
        if (!isConnected) {
          throw createAppError({
            code: 'S3_CONNECTIVITY_ERROR',
            message: 'Cannot connect to S3 storage service',
            httpStatus: 503,
          });
        }
        
        const signedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          }),
          { expiresIn: 3600 * 24 } // URL valid for 24 hours
        );
        
        console.log(`Storage Service: Generated URL valid for 24 hours`);
        return signedUrl;
      } catch (error) {
        console.error('Error getting file URL:', error);
        
        // Handle S3 specific errors
        if (error instanceof S3ServiceException) {
          throw createAppError({
            code: 'S3_SERVICE_ERROR',
            message: `S3 service error: ${error.message}`,
            httpStatus: 500,
          });
        }
        
        throw createAppError({
          code: 'STORAGE_ERROR',
          message: 'Error generating file URL',
          httpStatus: 500,
        });
      }
    },
  };
}

// Export a singleton instance for convenience
export const storageService = createStorageService(); 