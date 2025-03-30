import { z } from 'zod';

export const SearchIndicesSchema = z.object({
  items: z.object({
    primaryKey: z.literal('id'),
    searchableAttributes: z.array(z.string()).default([
      'name',
      'description',
      'category.name'
    ]),
    filterableAttributes: z.array(z.string()).default([
      'category_id',
      'quantity',
      'unit'
    ]),
    sortableAttributes: z.array(z.string()).default([
      'name',
      'created_at',
      'quantity'
    ]),
    ranking: z.array(z.string()).default([
      'typo',
      'words',
      'proximity',
      'attribute',
      'exactness'
    ])
  }),
  bins: z.object({
    primaryKey: z.literal('id'),
    searchableAttributes: z.array(z.string()).default([
      'label',
      'location',
      'description'
    ]),
    filterableAttributes: z.array(z.string()).default([
      'location'
    ])
  })
});

export type SearchIndices = z.infer<typeof SearchIndicesSchema>;

export const TypeaheadConfigSchema = z.object({
  minChars: z.number().default(2),
  maxResults: z.number().default(10),
  timeout: z.number().default(150),
  indexes: z.array(z.string()).default(['items', 'bins']),
  weights: z.object({
    name: z.number().default(10),
    label: z.number().default(8),
    description: z.number().default(3)
  })
});

export type TypeaheadConfig = z.infer<typeof TypeaheadConfigSchema>;

export const SearchQuerySchema = z.object({
  query: z.string(),
  filters: z.record(z.string(), z.any()).optional(),
  limit: z.number().default(20),
  offset: z.number().default(0),
  indexes: z.array(z.string()).optional()
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultSchema = z.object({
  hits: z.array(z.any()),
  totalHits: z.number(),
  processingTimeMs: z.number(),
  query: z.string()
});

export type SearchResult = z.infer<typeof SearchResultSchema>; 