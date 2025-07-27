#!/bin/bash

# Binventory Deployment Script
# This script helps prepare the application for production deployment

set -e

echo "🚀 Binventory Deployment Preparation"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Step 1: Checking prerequisites..."

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required but not installed"; exit 1; }

echo "✅ Prerequisites check passed"

echo "📦 Step 2: Installing dependencies..."
npm ci

echo "🔧 Step 3: Building the application..."
npm run build

echo "🧪 Step 4: Running tests..."
npm run test

echo "📝 Step 5: Checking lint..."
npm run lint

echo "🗄️ Step 6: Generating Prisma client..."
npm run prisma:generate

echo "✅ Build verification complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Set up Supabase database:"
echo "   - Create a new project at https://supabase.com"
echo "   - Copy the connection string"
echo "   - Update DATABASE_URL and DIRECT_URL in your environment"
echo ""
echo "2. Set up Cloudflare R2:"
echo "   - Create a bucket at https://dash.cloudflare.com"
echo "   - Generate API credentials"
echo "   - Update S3_* environment variables"
echo ""
echo "3. Deploy to Vercel:"
echo "   - Connect your repository to Vercel"
echo "   - Add all environment variables from .env.production.example"
echo "   - Deploy!"
echo ""
echo "4. After deployment, initialize search vectors:"
echo "   curl -X POST https://your-app.vercel.app/api/search/init"
echo ""
echo "🔐 Security Note:"
echo "All security features are enabled and configured."
echo "Review the security configuration in app/lib/security-config.ts"