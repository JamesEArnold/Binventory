# Binventory Deployment Checklist

## Pre-Deployment Preparation

### ✅ 1. Code Preparation
- [x] Security hardening implemented
- [x] PostgreSQL search service configured
- [x] Production environment template created
- [x] Prisma configuration optimized for production
- [x] Vercel configuration updated with security headers

### ✅ 2. Local Testing
- [ ] Run deployment preparation script: `./scripts/deploy.sh`
- [ ] Verify all tests pass: `npm run test`
- [ ] Verify build succeeds: `npm run build`
- [ ] Verify linting passes: `npm run lint`

## External Services Setup

### 📋 3. Supabase Database Setup
- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project
- [ ] Copy connection details:
  - [ ] Connection string (pooler): `postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:6543/postgres`
  - [ ] Direct connection: `postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres`
- [ ] Update DATABASE_URL and DIRECT_URL in environment variables

### 📋 4. Cloudflare R2 Storage Setup
- [ ] Create Cloudflare account and access R2
- [ ] Create bucket named `binventory-uploads` (or your choice)
- [ ] Generate R2 API token with Object Read & Write permissions
- [ ] Copy credentials:
  - [ ] Account ID (from dashboard)
  - [ ] Access Key ID
  - [ ] Secret Access Key
- [ ] Configure CORS settings for your domain

### 📋 5. OAuth Providers (Optional)
- [ ] Google OAuth (if desired):
  - [ ] Create project in Google Cloud Console
  - [ ] Enable Google+ API
  - [ ] Create OAuth 2.0 credentials
  - [ ] Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
- [ ] GitHub OAuth (if desired):
  - [ ] Create GitHub OAuth App
  - [ ] Add authorization callback URL: `https://your-domain.vercel.app/api/auth/callback/github`

## Vercel Deployment

### 📋 6. Repository Setup
- [ ] Commit all changes to Git
- [ ] Push to GitHub repository
- [ ] Ensure repository is public or accessible to Vercel

### 📋 7. Vercel Project Setup
- [ ] Create Vercel account at https://vercel.com
- [ ] Import GitHub repository
- [ ] Configure environment variables (see section below)
- [ ] Deploy application

### 📋 8. Environment Variables Configuration
Copy these variables to Vercel project settings:

#### Core Configuration
```env
NODE_ENV=production
NEXTAUTH_SECRET=<64-character-random-string>
NEXTAUTH_URL=https://your-app-name.vercel.app
```

#### Database
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:6543/postgres?schema=public
DIRECT_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres?schema=public
```

#### File Storage
```env
S3_ENDPOINT=https://[ACCOUNT-ID].r2.cloudflarestorage.com
S3_BUCKET_NAME=binventory-uploads
AWS_REGION=auto
AWS_ACCESS_KEY_ID=<your-r2-access-key>
AWS_SECRET_ACCESS_KEY=<your-r2-secret-key>
```

#### Security Configuration
```env
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
ATTEMPT_WINDOW=300000
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_REQUESTS=10
MAX_FILE_SIZE=5242880
SESSION_MAX_AGE=86400
CSRF_TOKEN_EXPIRY=900000
AUDIT_LOG_LEVEL=info
AUDIT_CONSOLE_LOGGING=false
ENABLE_2FA=true
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_FILE_SCANNING=false
```

#### OAuth (Optional)
```env
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GITHUB_ID=<your-github-id>
GITHUB_SECRET=<your-github-secret>
```

## Post-Deployment Setup

### 📋 9. Database Migration
- [ ] Run database migrations:
  ```bash
  # If using Vercel CLI
  vercel env pull .env.production
  npm run prisma:deploy
  ```

### 📋 10. Initialize Search Vectors
- [ ] Call search initialization endpoint:
  ```bash
  curl -X POST https://your-app-name.vercel.app/api/search/init
  ```
- [ ] Verify search is working by testing search functionality

### 📋 11. Security Verification
- [ ] Test rate limiting by making rapid API requests
- [ ] Verify CSRF protection on forms
- [ ] Test account lockout with failed login attempts
- [ ] Check security headers using https://securityheaders.com
- [ ] Verify audit logs are being created

### 📋 12. Functional Testing
- [ ] User registration and login
- [ ] Bin creation and management
- [ ] Item creation and management
- [ ] File upload functionality
- [ ] Search functionality
- [ ] Organization features (if applicable)

## Performance Optimization

### 📋 13. Performance Tuning
- [ ] Monitor Vercel function execution times
- [ ] Check Supabase connection pooling is working
- [ ] Verify image optimization is enabled
- [ ] Test application performance with tools like Lighthouse

### 📋 14. Monitoring Setup
- [ ] Set up Vercel monitoring and alerts
- [ ] Configure Supabase monitoring
- [ ] Monitor R2 storage usage
- [ ] Set up external uptime monitoring (optional)

## Custom Domain (Optional)

### 📋 15. Domain Configuration
- [ ] Add custom domain in Vercel project settings
- [ ] Configure DNS records as instructed by Vercel
- [ ] Update NEXTAUTH_URL environment variable
- [ ] Update OAuth redirect URIs
- [ ] Test SSL certificate

## Final Verification

### 📋 16. Production Readiness
- [ ] All environment variables configured correctly
- [ ] Database migrations completed successfully
- [ ] Search functionality working
- [ ] File uploads working to R2
- [ ] All security features enabled and tested
- [ ] Performance meets requirements
- [ ] Error handling working properly
- [ ] Logging and monitoring in place

## Troubleshooting

### Common Issues:
1. **Database connection failures**: Check Supabase project isn't paused
2. **Search not working**: Verify search vectors were initialized
3. **File upload issues**: Check R2 credentials and CORS settings
4. **Authentication issues**: Verify NEXTAUTH_SECRET and URL
5. **Rate limiting too aggressive**: Adjust rate limit settings

### Getting Help:
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Cloudflare R2: https://developers.cloudflare.com/r2/

---

## Security Notes

🔐 **Important Security Reminders:**
- Never commit real environment variables to Git
- Use strong, unique passwords for all services
- Regularly rotate API keys and secrets
- Monitor logs for suspicious activity
- Keep dependencies updated
- Use HTTPS everywhere
- Enable 2FA on all service accounts