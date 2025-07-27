/**
 * @description PostgreSQL full-text search service to replace MeiliSearch
 * @phase Search Infrastructure - Free Deployment
 * @dependencies Prisma, PostgreSQL with tsvector support
 */

import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { 
  SearchIndices, 
  TypeaheadConfig,
  SearchQuery,
  SearchResult 
} from '@/types/search';

interface PostgresSearchHit {
  id: string;
  type: 'item' | 'bin';
  rank: number;
  label?: string;
  location?: string;
  description?: string;
  name?: string;
  categoryId?: string | number;
  quantity?: number;
  unit?: string;
  userId?: string | number;
  organizationId?: string | number;
  minQuantity?: string | number;
  [key: string]: string | number | undefined;
}

interface BinIndexData {
  id: string;
  label: string;
  location?: string;
  description?: string;
}

interface ItemIndexData {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  quantity?: number;
  unit?: string;
}

interface SearchFilters {
  categoryId?: string;
  category_id?: string;
  location?: string;
  unit?: string;
  quantity?: { min?: number; max?: number };
}

/**
 * Creates a PostgreSQL-based search service with the same interface as MeiliSearch
 */
export function createPostgresSearchService(
  _indices: SearchIndices,
  typeaheadConfig: TypeaheadConfig,
  prismaClient: PrismaClient = prisma
) {
  /**
   * Initializes search indices - no-op for PostgreSQL since schema handles this
   */
  async function initializeIndices(): Promise<void> {
    try {
      // Verify that search vectors exist by running a test query
      await prismaClient.$queryRaw`
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'bins' AND column_name = 'search_vector'
      `;
      await prismaClient.$queryRaw`
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'search_vector'
      `;
    } catch (error) {
      console.error('Search vectors not found. Run migrations first:', error);
      throw new Error('Search infrastructure not initialized. Run database migrations.');
    }
  }

  /**
   * Indexes all bins - no-op for PostgreSQL since triggers handle this
   */
  async function indexAllBins(): Promise<void> {
    try {
      // Update all bin search vectors
      await prismaClient.$executeRaw`
        UPDATE bins SET search_vector = to_tsvector('english', 
          COALESCE(label, '') || ' ' ||
          COALESCE(location, '') || ' ' ||
          COALESCE(description, '')
        )
      `;
    } catch (error) {
      console.error('Failed to reindex bins:', error);
      throw new Error(`Bin reindexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Indexes all items - no-op for PostgreSQL since triggers handle this
   */
  async function indexAllItems(): Promise<void> {
    try {
      // Update all item search vectors including category names
      await prismaClient.$executeRaw`
        UPDATE items SET search_vector = to_tsvector('english', 
          COALESCE(name, '') || ' ' ||
          COALESCE(description, '') || ' ' ||
          COALESCE((SELECT name FROM categories WHERE id = items.category_id), '') || ' ' ||
          COALESCE(unit, '')
        )
      `;
    } catch (error) {
      console.error('Failed to reindex items:', error);
      throw new Error(`Item reindexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates or adds a bin document in the search index
   */
  async function indexBin(bin: BinIndexData): Promise<void> {
    try {
      // The trigger will automatically update the search vector
      await prismaClient.bin.update({
        where: { id: bin.id },
        data: {
          label: bin.label,
          location: bin.location,
          description: bin.description
        }
      });
    } catch (error) {
      console.error('Failed to index bin:', error);
      throw new Error(`Bin indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates or adds an item document in the search index
   */
  async function indexItem(item: ItemIndexData): Promise<void> {
    try {
      // The trigger will automatically update the search vector
      await prismaClient.item.update({
        where: { id: item.id },
        data: {
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          unit: item.unit
        }
      });
    } catch (error) {
      console.error('Failed to index item:', error);
      throw new Error(`Item indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a bin from the search index - handled automatically by database
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function deleteBin(_binId: string): Promise<void> {
    // No-op: deletion is handled by the database when the record is deleted
  }

  /**
   * Deletes an item from the search index - handled automatically by database
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function deleteItem(_itemId: string): Promise<void> {
    // No-op: deletion is handled by the database when the record is deleted
  }

  /**
   * Performs a search across specified indexes using PostgreSQL full-text search
   */
  async function search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      const { query, filters, limit = 20, offset = 0, indexes } = searchQuery;
      
      if (!query || query.trim().length === 0) {
        return {
          hits: [],
          totalHits: 0,
          processingTimeMs: Date.now() - startTime,
          query: ''
        };
      }

      // Default to all indexes if not specified
      const indexesToSearch = indexes || typeaheadConfig.indexes;
      
      const results: PostgresSearchHit[] = [];
      
      // Search bins if requested
      if (indexesToSearch.includes('bins')) {
        const binResults = await searchBins(query, filters, limit, offset);
        results.push(...binResults);
      }
      
      // Search items if requested
      if (indexesToSearch.includes('items')) {
        const itemResults = await searchItems(query, filters, limit, offset);
        results.push(...itemResults);
      }
      
      // Sort by rank (relevance)
      results.sort((a, b) => b.rank - a.rank);
      
      // Apply limit
      const limitedResults = results.slice(0, limit);
      
      return {
        hits: limitedResults,
        totalHits: results.length,
        processingTimeMs: Date.now() - startTime,
        query
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search bins using PostgreSQL full-text search
   */
  async function searchBins(query: string, filters?: SearchFilters, limit = 20, offset = 0): Promise<PostgresSearchHit[]> {
    const tsQuery = query.trim().split(/\s+/).map(term => `${term}:*`).join(' & ');
    
    let whereClause = 'WHERE search_vector @@ to_tsquery($1)';
    const queryParams: (string | number)[] = [tsQuery];
    let paramIndex = 2;
    
    // Add filters
    if (filters?.location) {
      whereClause += ` AND location ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.location}%`);
      paramIndex++;
    }
    
    const sqlQuery = `
      SELECT 
        id, label, location, description, image_url, image_key,
        user_id, organization_id, created_at, updated_at, qr_code,
        ts_rank(search_vector, to_tsquery($1)) as rank,
        'bin' as type
      FROM bins 
      ${whereClause}
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const results = await prismaClient.$queryRawUnsafe(sqlQuery, ...queryParams) as PostgresSearchHit[];
    
    return results.map(row => ({
      ...row,
      type: 'bin' as const,
      imageUrl: row.image_url,
      imageKey: row.image_key,
      userId: row.user_id,
      organizationId: row.organization_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      qrCode: row.qr_code
    }));
  }

  /**
   * Search items using PostgreSQL full-text search
   */
  async function searchItems(query: string, filters?: SearchFilters, limit = 20, offset = 0): Promise<PostgresSearchHit[]> {
    const tsQuery = query.trim().split(/\s+/).map(term => `${term}:*`).join(' & ');
    
    let whereClause = 'WHERE i.search_vector @@ to_tsquery($1)';
    const queryParams: (string | number)[] = [tsQuery];
    let paramIndex = 2;
    
    // Add filters
    if (filters?.category_id) {
      whereClause += ` AND i.category_id = $${paramIndex}`;
      queryParams.push(filters.category_id);
      paramIndex++;
    }
    
    if (filters?.unit) {
      whereClause += ` AND i.unit ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.unit}%`);
      paramIndex++;
    }
    
    const sqlQuery = `
      SELECT 
        i.id, i.name, i.description, i.category_id, i.quantity, 
        i.min_quantity, i.unit, i.user_id, i.organization_id,
        i.created_at, i.updated_at,
        ts_rank(i.search_vector, to_tsquery($1)) as rank,
        c.name as category_name,
        'item' as type
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      ${whereClause}
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const results = await prismaClient.$queryRawUnsafe(sqlQuery, ...queryParams) as PostgresSearchHit[];
    
    return results.map(row => ({
      ...row,
      type: 'item' as const,
      categoryId: row.category_id,
      minQuantity: row.min_quantity,
      userId: row.user_id,
      organizationId: row.organization_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      'category.name': row.category_name
    }));
  }

  /**
   * Performs a typeahead search for autocomplete functionality
   */
  async function typeahead(query: string): Promise<Record<string, unknown>[]> {
    if (query.length < typeaheadConfig.minChars) {
      return [];
    }

    try {
      const searchQuery: SearchQuery = {
        query,
        limit: typeaheadConfig.maxResults,
        offset: 0,
        indexes: typeaheadConfig.indexes
      };

      const result = await search(searchQuery);
      return result.hits;
    } catch (error) {
      console.error('Typeahead search failed:', error);
      throw new Error(`Typeahead search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    initializeIndices,
    indexAllBins,
    indexAllItems,
    indexBin,
    indexItem,
    deleteBin,
    deleteItem,
    search,
    searchItems,
    typeahead,
  };
}

// Create default instance
export const postgresSearchService = createPostgresSearchService(
  {
    items: {
      primaryKey: 'id' as const,
      searchableAttributes: ['name', 'description', 'category.name'],
      filterableAttributes: ['category_id', 'quantity', 'unit'],
      sortableAttributes: ['name', 'created_at', 'quantity'],
      ranking: ['typo', 'words', 'proximity', 'attribute', 'exactness']
    },
    bins: {
      primaryKey: 'id' as const,
      searchableAttributes: ['label', 'location', 'description'],
      filterableAttributes: ['location']
    }
  },
  {
    minChars: 2,
    maxResults: 10,
    timeout: 150,
    indexes: ['items', 'bins'],
    weights: {
      name: 10,
      label: 8,
      description: 3
    }
  }
);