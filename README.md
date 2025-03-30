This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Binventory

## Docker Setup

The project uses Docker Compose to manage its development dependencies. The following services are included:

- PostgreSQL 16 (Database)
- MeiliSearch v1.5 (Search Engine)

### Prerequisites

- Docker
- Docker Compose

### Getting Started with Docker

1. Start the services:
   ```bash
   docker compose up -d
   ```

2. Verify services are running:
   ```bash
   docker compose ps
   ```

3. Access services:
   - PostgreSQL: localhost:5432
     - User: binventory
     - Password: binventory_local
     - Database: binventory
   - MeiliSearch: http://localhost:7700
     - API Key: binventory_meili_local_key

4. Stop services:
   ```bash
   docker compose down
   ```

### Data Persistence

Data is persisted through Docker volumes:
- `postgres_data`: PostgreSQL data
- `meilisearch_data`: MeiliSearch data

To completely reset the data, remove the volumes:
```bash
docker compose down -v
```
