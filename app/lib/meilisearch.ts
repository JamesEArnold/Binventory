import { MeiliSearch } from 'meilisearch';

// Initialize the MeiliSearch client with environment variables
const meilisearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export { meilisearch }; 