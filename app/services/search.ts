/**
 * @description Search service abstraction - defaults to PostgreSQL full-text search
 * @phase Search Infrastructure - Free Deployment
 * @dependencies PostgreSQL with tsvector support
 */

import { prisma } from '../lib/prisma';
import { 
  SearchIndices, 
  TypeaheadConfig,
  SearchQuery,
  SearchResult 
} from '../types/search';
import { Bin, Item } from '@prisma/client';
import { createPostgresSearchService } from './search-postgres';

/**
 * Creates a search service with the provided configuration
 * Defaults to PostgreSQL full-text search for free deployment
 */
export function createSearchService(
  indices: SearchIndices,
  typeaheadConfig: TypeaheadConfig
) {
  // Use PostgreSQL search service by default
  return createPostgresSearchService(indices, typeaheadConfig);
} 