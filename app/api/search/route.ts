/**
 * @description Implementation for search API from Phase 2.1
 * @phase Search Infrastructure
 * @dependencies Phase 1.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSearchService } from '../../services/search';
import { SearchIndicesSchema, TypeaheadConfigSchema } from '../../types/search';

// Initialize search configuration from roadmap specs
const searchIndices = SearchIndicesSchema.parse({
  items: {
    primaryKey: 'id',
    searchableAttributes: [
      'name',
      'description',
      'category.name'
    ],
    filterableAttributes: [
      'category_id',
      'quantity',
      'unit'
    ],
    sortableAttributes: [
      'name',
      'created_at',
      'quantity'
    ],
    ranking: [
      'typo',
      'words',
      'proximity',
      'attribute',
      'exactness'
    ]
  },
  bins: {
    primaryKey: 'id',
    searchableAttributes: [
      'label',
      'location',
      'description'
    ],
    filterableAttributes: [
      'location'
    ]
  }
});

const typeaheadConfig = TypeaheadConfigSchema.parse({
  minChars: 2,
  maxResults: 10,
  timeout: 150,
  indexes: ['items', 'bins'],
  weights: {
    name: 10,
    label: 8,
    description: 3
  }
});

// Initialize search service
const searchService = createSearchService(searchIndices, typeaheadConfig);

// Validation schema for search requests
const SearchRequestSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.unknown()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  indexes: z.array(z.string()).optional()
});

// Validation schema for typeahead requests
const TypeaheadRequestSchema = z.object({
  query: z.string().min(1)
});

// Initialize search indices when the server starts
// Note: This would normally be done in a proper startup script
// But for simplicity, we'll do it here in a self-executing async function
(async () => {
  try {
    await searchService.initializeIndices();
    console.log('Search indices initialized successfully');
  } catch (error) {
    console.error('Failed to initialize search indices:', error);
  }
})();

/**
 * Main search endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SearchRequestSchema.parse(body);
    
    const results = await searchService.search(validatedData);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters', 
          details: error.errors 
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Typeahead search endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }
    
    const validatedData = TypeaheadRequestSchema.parse({ query });
    const results = await searchService.typeahead(validatedData.query);
    
    return NextResponse.json({ hits: results });
  } catch (error) {
    console.error('Typeahead API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          details: error.errors 
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 