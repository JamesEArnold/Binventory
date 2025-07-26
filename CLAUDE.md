# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with HTTPS and Turbopack
- `npm run build` - Build the production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database Commands
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:deploy` - Deploy migrations (production)

### Docker Commands
- `npm run docker:up` - Start Docker services (PostgreSQL + MeiliSearch)
- `npm run docker:down` - Stop Docker services
- `npm run dev:docker` - Start Docker services and development server

## Architecture Overview

Binventory is a Next.js 15 inventory management system with the following stack:
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Search**: MeiliSearch for full-text search
- **Auth**: NextAuth.js with 2FA support
- **Storage**: AWS S3 compatible storage
- **Testing**: Jest with React Testing Library
- **UI**: Tailwind CSS

### Core Models
The application centers around these main entities:
- **Bins**: Physical containers with QR codes
- **Items**: Inventory items categorized and assigned to bins
- **Categories**: Hierarchical categorization system
- **Organizations**: Multi-tenant support with role-based access
- **Permissions**: Object-level permission system

### Permission System
The app implements a sophisticated object-level permission system:
- User, organization, and role-based permissions
- Actions: READ, WRITE, ADMIN
- Objects: bins, items, categories
- Cached permission checks for performance

### Service Layer Architecture
Services are located in `app/services/` and follow dependency injection patterns:
- `createPermissionService()` - Factory function pattern
- Services accept Prisma client as parameter for testability
- All services export both factory function and default instance

### Testing Strategy
Tests follow strict patterns defined in `.cursor/rules/test-strategy.mdc`:
- Arrange-Act-Assert pattern
- Nested describe blocks: feature > category > specific tests
- Categories: setup, happy paths, error cases, edge cases
- Mock setup in beforeEach with proper cleanup
- Coverage thresholds: 80% for all metrics

### API Structure
- RESTful API routes in `app/api/`
- Consistent error handling with `createAppError`
- NextAuth.js authentication middleware
- Request validation using Zod schemas

### Key Libraries
- `@prisma/client` - Database ORM
- `next-auth` - Authentication
- `meilisearch` - Search engine client
- `@aws-sdk/client-s3` - File storage
- `zod` - Schema validation
- `nanoid` - ID generation
- `qrcode` - QR code generation

### Environment Setup
Development requires Docker for PostgreSQL and MeiliSearch. Use `npm run dev:docker` to start all services together.

### Testing Commands
- Single test: `npm test -- path/to/test.test.ts`
- Test specific pattern: `npm test -- --testNamePattern="pattern"`
- Watch mode for specific file: `npm run test:watch -- path/to/test.test.ts`

### Code Conventions
- Use conventional commits format (enforced by .cursor/rules)
- All async functions properly handle errors
- Services use factory pattern for dependency injection
- Components follow Next.js App Router patterns
- TypeScript strict mode enabled

## Deployment

### Free Deployment Stack
Binventory uses a completely free deployment stack:
- **Hosting**: Vercel (free tier)
- **Database**: Supabase PostgreSQL (free tier)
- **Search**: PostgreSQL full-text search (built-in)
- **Storage**: Cloudflare R2 (minimal cost)

### Deployment Commands
- See `DEPLOYMENT.md` for detailed deployment instructions
- `npm run prisma:deploy` - Deploy database migrations in production
- Database migrations include search vector setup and triggers

### Search Implementation
- Uses PostgreSQL full-text search with tsvector columns
- Automatic search vector updates via database triggers
- API endpoint `/api/search/init` to initialize search indices
- Search service abstraction allows future engine switching

### Environment Configuration
- Development: PostgreSQL + LocalStack S3
- Production: Supabase + Cloudflare R2
- Environment variables documented in `.env.example`

### Deployment Files
- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to exclude from deployment
- `DEPLOYMENT.md` - Complete deployment guide