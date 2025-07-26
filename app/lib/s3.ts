import { S3Client } from '@aws-sdk/client-s3';

// S3 client configuration
const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:4566';
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'binventory';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'binventory_local';

// Detect environment and storage provider
const isLocalStack = s3Endpoint.includes('localhost') || s3Endpoint.includes('localstack');
const isCloudflareR2 = s3Endpoint.includes('r2.cloudflarestorage.com');
const isProduction = process.env.NODE_ENV === 'production';

console.log('S3 Client Configuration:');
console.log('Endpoint:', s3Endpoint);
console.log('Region:', awsRegion);
console.log('Environment:', { isLocalStack, isCloudflareR2, isProduction });

export const s3Client = new S3Client({
  endpoint: s3Endpoint,
  region: awsRegion,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  },
  // Cloudflare R2 doesn't need forcePathStyle, but LocalStack does
  forcePathStyle: isLocalStack,
  // Add retry configuration for more resilience
  maxAttempts: 3
});

// Bucket name
export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'binventory-uploads';

// Helper function to check S3 connectivity
export async function checkS3Connectivity(): Promise<boolean> {
  try {
    // Import the ListBucketsCommand only when needed
    const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
    
    // Test connectivity with a simple command
    await s3Client.send(new ListBucketsCommand({}));
    console.log('Successfully connected to S3');
    return true;
  } catch (error) {
    console.error('S3 connectivity check failed:', error);
    return false;
  }
} 