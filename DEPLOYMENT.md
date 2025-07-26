# Binventory Deployment Guide

This guide walks you through deploying Binventory using the completely free stack: Vercel + Supabase + Cloudflare R2.

## Prerequisites

1. **GitHub Account** (for Vercel deployment)
2. **Supabase Account** (free tier)
3. **Cloudflare Account** (for R2 storage)
4. **Vercel Account** (free tier)

## Step 1: Set Up Supabase Database

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and enter project details
   - Select a region (choose closest to your users)
   - Set a strong database password

2. **Get Connection Details**
   - Go to Settings > Database
   - Copy the connection string (under "Connection string")
   - Go to Settings > API
   - Copy the Project URL and anon public key

3. **Run Database Migrations**
   ```bash
   # Update DATABASE_URL in .env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].pooler.supabase.com:6543/postgres?schema=public"
   
   # Run migrations
   npm run prisma:migrate
   ```

## Step 2: Set Up Cloudflare R2 Storage

1. **Create R2 Bucket**
   - Go to Cloudflare Dashboard > R2 Object Storage
   - Click "Create bucket"
   - Name it `binventory-uploads` (or your preferred name)
   - Choose a location

2. **Create API Token**
   - Go to Manage R2 API tokens
   - Click "Create API token"
   - Set permissions to "Object Read & Write"
   - Copy the Access Key ID and Secret Access Key

3. **Get Account ID**
   - Found in the right sidebar of your Cloudflare dashboard
   - Your R2 endpoint will be: `https://[ACCOUNT-ID].r2.cloudflarestorage.com`

## Step 3: Deploy to Vercel

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   Add these environment variables in Vercel:

   ```env
   # Database
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].pooler.supabase.com:6543/postgres?schema=public
   
   # Authentication
   NEXTAUTH_SECRET=your-random-secret-key-here
   NEXTAUTH_URL=https://your-app-name.vercel.app
   
   # Storage (Cloudflare R2)
   S3_ENDPOINT=https://[YOUR-ACCOUNT-ID].r2.cloudflarestorage.com
   S3_BUCKET_NAME=binventory-uploads
   AWS_REGION=auto
   AWS_ACCESS_KEY_ID=your-r2-access-key
   AWS_SECRET_ACCESS_KEY=your-r2-secret-key
   
   # Optional: OAuth Providers
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GITHUB_ID=your-github-id
   GITHUB_SECRET=your-github-secret
   ```

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

## Step 4: Initialize Search Indices

After deployment, you need to populate the search vectors:

1. **Option A: Via API Call**
   ```bash
   curl -X POST https://your-app-name.vercel.app/api/search/init
   ```

2. **Option B: Via Database Console**
   - Go to Supabase Dashboard > SQL Editor
   - Run the search vector update queries:
   ```sql
   -- Update bin search vectors
   UPDATE bins SET search_vector = to_tsvector('english', 
     COALESCE(label, '') || ' ' ||
     COALESCE(location, '') || ' ' ||
     COALESCE(description, '')
   );
   
   -- Update item search vectors
   UPDATE items SET search_vector = to_tsvector('english', 
     COALESCE(name, '') || ' ' ||
     COALESCE(description, '') || ' ' ||
     COALESCE((SELECT name FROM categories WHERE id = items.category_id), '') || ' ' ||
     COALESCE(unit, '')
   );
   ```

## Step 5: Custom Domain (Optional)

1. **Add Domain in Vercel**
   - Go to your project settings
   - Click "Domains"
   - Add your custom domain

2. **Update Environment Variables**
   - Update `NEXTAUTH_URL` to use your custom domain

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure your DATABASE_URL is correct
   - Check that your Supabase project is not paused (free tier pauses after 7 days of inactivity)

2. **Search Not Working**
   - Verify search vectors are populated
   - Check that the search API endpoints are responding

3. **File Upload Issues**
   - Verify R2 credentials are correct
   - Check bucket permissions and CORS settings

### Performance Optimization

1. **Database Connection Pooling**
   - Use Supabase connection pooler (port 6543) for production
   - Configure Prisma connection pooling

2. **Image Optimization**
   - Enable Next.js image optimization
   - Configure R2 bucket for public access if needed

## Cost Monitoring

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Supabase**: Free tier includes 500MB database, 50K MAU
- **Cloudflare R2**: Only pay for storage (~$0.015/GB/month), no egress fees

Monitor usage in each platform's dashboard to avoid unexpected charges.

## Scaling

When you outgrow free tiers:

1. **Vercel Pro**: $20/month (more bandwidth, team features)
2. **Supabase Pro**: $25/month (8GB database, more features)
3. **Additional R2 storage**: ~$0.015/GB/month

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **Database Access**: Use connection pooling for production
3. **API Rate Limiting**: Consider implementing rate limiting
4. **CORS Configuration**: Configure R2 CORS for your domain only

## Support

For issues specific to:
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)
- **Cloudflare R2**: [R2 Documentation](https://developers.cloudflare.com/r2/)