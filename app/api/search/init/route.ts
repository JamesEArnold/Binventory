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
    // Initialize indices
    await searchService.initializeIndices();
    
    // Index all data
    await Promise.all([
      searchService.indexAllItems(),
      searchService.indexAllBins()
    ]);
    
    return NextResponse.json({ 
      message: 'Search indices initialized and populated successfully' 
    });
  } catch (error) {
    console.error('Failed to initialize search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 