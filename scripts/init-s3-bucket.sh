#!/bin/bash
set -e

# Enable trace mode for debugging
set -x

# Use environment variable from docker-compose if set, otherwise use default
export AWS_ENDPOINT="${AWS_ENDPOINT_URL:-http://localstack:4566}"

echo "===== DEBUG INFO ====="
echo "AWS_ENDPOINT: $AWS_ENDPOINT"
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY"
echo "AWS_DEFAULT_REGION: $AWS_DEFAULT_REGION"
echo "======================="

echo "Testing AWS CLI configuration:"
aws --version
aws configure list

echo "Waiting for LocalStack to be ready..."
# More reliable health check with timeout
max_retries=30
counter=0
until curl -s -v "$AWS_ENDPOINT/_localstack/health" | tee /tmp/health_check.log | grep -q '"s3": "running"'; do
  echo "Waiting for S3 service... (${counter}/${max_retries})"
  echo "Health check response:"
  cat /tmp/health_check.log
  sleep 2
  counter=$((counter+1))
  if [ $counter -ge $max_retries ]; then
    echo "Timed out waiting for S3 service to be ready"
    echo "Last health check response:"
    cat /tmp/health_check.log
    exit 1
  fi
done

echo "LocalStack S3 service is ready"

# Test network connectivity
echo "Testing network connectivity to LocalStack:"
curl -v $AWS_ENDPOINT

# Try creating the bucket using both methods
echo "Creating S3 bucket: binventory-uploads"
echo "Method 1: Using s3 mb command"
aws --debug --endpoint-url=$AWS_ENDPOINT s3 mb s3://binventory-uploads || echo "s3 mb command failed"

echo "Method 2: Using s3api create-bucket command"
aws --debug --endpoint-url=$AWS_ENDPOINT s3api create-bucket --bucket binventory-uploads || echo "s3api create-bucket command failed"

# Check if bucket was created
echo "Verifying bucket creation:"
aws --endpoint-url=$AWS_ENDPOINT s3 ls || echo "Failed to list buckets"

# Configure CORS for the bucket
echo "Configuring CORS for bucket"
aws --endpoint-url=$AWS_ENDPOINT s3api put-bucket-cors \
  --bucket binventory-uploads \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }' || echo "Failed to configure CORS"

echo "Bucket configuration complete"

# Turn off trace mode
set +x 