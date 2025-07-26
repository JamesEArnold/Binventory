import { NextResponse } from 'next/server';
import { createSearchService } from '../../../services/search';
import { SearchIndicesSchema, TypeaheadConfigSchema } from '../../../types/search';

// Initialize search configuration
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

export async function POST() {
  try {
    console.log('Initializing search indices...');
    
    // Initialize indices
    await searchService.initializeIndices();
    console.log('Search infrastructure verified');
    
    // Index all data
    await Promise.all([
      searchService.indexAllItems(),
      searchService.indexAllBins()
    ]);
    console.log('All data indexed successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Search indices initialized and populated successfully',
      searchEngine: 'PostgreSQL Full-Text Search'
    });
  } catch (error) {
    console.error('Failed to initialize search:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get search index status
 */
export async function GET() {
  try {
    // Verify search infrastructure is working
    await searchService.initializeIndices();
    
    return NextResponse.json({ 
      status: 'ready',
      searchEngine: 'PostgreSQL Full-Text Search',
      message: 'Search indices are ready' 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        searchEngine: 'PostgreSQL Full-Text Search',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 