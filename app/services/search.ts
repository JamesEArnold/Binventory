/**
 * @description Implementation for search service from Phase 2.1
 * @phase Search Infrastructure
 * @dependencies Phase 1.1
 */

import { meilisearch } from '../lib/meilisearch';
import { prisma } from '../lib/prisma';
import { 
  SearchIndices, 
  TypeaheadConfig,
  SearchQuery,
  SearchResult 
} from '../types/search';
import { Bin, Item } from '@prisma/client';

// Define interface for MeiliSearch document with category name
interface ItemWithCategory extends Item {
  'category.name': string;
  type: 'item';
}

interface BinWithType extends Bin {
  type: 'bin';
}

/**
 * Creates a search service with the provided configuration
 */
export function createSearchService(
  indices: SearchIndices,
  typeaheadConfig: TypeaheadConfig
) {
  /**
   * Initializes search indices in MeiliSearch
   */
  async function initializeIndices(): Promise<void> {
    try {
      // Initialize items index
      const itemsIndex = await meilisearch.getIndex('items');
      if (!itemsIndex) {
        await meilisearch.createIndex('items', { primaryKey: 'id' });
      }

      // Configure items index settings
      await meilisearch.index('items').updateSettings({
        searchableAttributes: indices.items.searchableAttributes,
        filterableAttributes: indices.items.filterableAttributes,
        sortableAttributes: indices.items.sortableAttributes,
        rankingRules: indices.items.ranking,
      });

      // Initialize bins index
      const binsIndex = await meilisearch.getIndex('bins');
      if (!binsIndex) {
        await meilisearch.createIndex('bins', { primaryKey: 'id' });
      }

      // Configure bins index settings
      await meilisearch.index('bins').updateSettings({
        searchableAttributes: indices.bins.searchableAttributes,
        filterableAttributes: indices.bins.filterableAttributes,
      });
    } catch (error) {
      console.error('Failed to initialize search indices:', error);
      throw new Error(`Search indices initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Indexes all bins in MeiliSearch
   */
  async function indexAllBins(): Promise<void> {
    try {
      const bins = await prisma.bin.findMany();
      if (bins.length > 0) {
        await meilisearch.index('bins').addDocuments(bins);
      }
    } catch (error) {
      console.error('Failed to index bins:', error);
      throw new Error(`Bin indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Indexes all items in MeiliSearch
   */
  async function indexAllItems(): Promise<void> {
    try {
      const items = await prisma.item.findMany({
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
      });

      // Transform items to include category name for searching
      const itemsToIndex = items.map(item => ({
        ...item,
        type: 'item',
        'category.name': item.category.name,
      }));

      if (itemsToIndex.length > 0) {
        await meilisearch.index('items').addDocuments(itemsToIndex);
      }
    } catch (error) {
      console.error('Failed to index items:', error);
      throw new Error(`Item indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates or adds a bin document in the search index
   */
  async function indexBin(bin: Bin): Promise<void> {
    try {
      const binToIndex: BinWithType = {
        ...bin,
        type: 'bin'
      };
      await meilisearch.index('bins').addDocuments([binToIndex]);
    } catch (error) {
      console.error('Failed to index bin:', error);
      throw new Error(`Bin indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates or adds an item document in the search index
   */
  async function indexItem(item: Item): Promise<void> {
    try {
      // Get category name
      const category = await prisma.category.findUnique({
        where: { id: item.categoryId },
        select: { name: true },
      });

      const itemToIndex: ItemWithCategory = {
        ...item,
        type: 'item',
        'category.name': category?.name || '',
      };

      await meilisearch.index('items').addDocuments([itemToIndex]);
    } catch (error) {
      console.error('Failed to index item:', error);
      throw new Error(`Item indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a bin from the search index
   */
  async function deleteBin(binId: string): Promise<void> {
    try {
      await meilisearch.index('bins').deleteDocument(binId);
    } catch (error) {
      console.error('Failed to delete bin from index:', error);
      throw new Error(`Bin deletion from index failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes an item from the search index
   */
  async function deleteItem(itemId: string): Promise<void> {
    try {
      await meilisearch.index('items').deleteDocument(itemId);
    } catch (error) {
      console.error('Failed to delete item from index:', error);
      throw new Error(`Item deletion from index failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Performs a search across specified indexes
   */
  async function search(searchQuery: SearchQuery): Promise<SearchResult> {
    try {
      const { query, filters, limit, offset, indexes } = searchQuery;
      
      if (!query) {
        return {
          hits: [],
          totalHits: 0,
          processingTimeMs: 0,
          query: ''
        };
      }

      // Default to all indexes if not specified
      const indexesToSearch = indexes || typeaheadConfig.indexes;
      
      // Perform search on each index
      const searchPromises = indexesToSearch.map(indexName =>
        meilisearch.index(indexName).search(query, {
          limit,
          offset,
          filter: filters ? buildFilterString(filters) : undefined,
        })
      );

      const results = await Promise.all(searchPromises);
      
      // Merge results
      const mergedHits: Record<string, unknown>[] = [];
      let totalHits = 0;
      let processingTimeMs = 0;
      
      results.forEach(result => {
        mergedHits.push(...result.hits);
        totalHits += result.estimatedTotalHits || 0;
        processingTimeMs += result.processingTimeMs;
      });
      
      return {
        hits: mergedHits,
        totalHits,
        processingTimeMs,
        query
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  /**
   * Helper function to build filter string from filter object
   */
  function buildFilterString(filters: Record<string, unknown>): string {
    return Object.entries(filters)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `(${value.map(v => `${key} = ${JSON.stringify(v)}`).join(' OR ')})`;
        }
        return `${key} = ${JSON.stringify(value)}`;
      })
      .join(' AND ');
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
    typeahead,
  };
} 