import { z } from 'zod';

export const QRCodeDataSchema = z.object({
  version: z.string(),
  binId: z.string().uuid(),
  shortCode: z.string(),
  timestamp: z.number(),
  checksum: z.string()
});

export type QRCodeData = z.infer<typeof QRCodeDataSchema>;

export const QRCodeConfigSchema = z.object({
  size: z.number().default(300),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  format: z.enum(['PNG', 'SVG']).default('SVG'),
  margin: z.number().default(4)
});

export type QRCodeConfig = z.infer<typeof QRCodeConfigSchema>;

export const URLConfig = z.object({
  baseUrl: z.string().url(),
  shortCodeLength: z.number().default(8),
  expirationDays: z.number().optional()
});

export type URLConfig = z.infer<typeof URLConfig>;

export const QRStorageConfig = z.object({
  images: z.object({
    format: z.literal('SVG'),
    maxSize: z.literal('50KB'),
    path: z.string(),
    naming: z.string()
  }),
  cache: z.object({
    engine: z.literal('Redis'),
    ttl: z.string(),
    prefix: z.string()
  })
});

export type QRStorageConfig = z.infer<typeof QRStorageConfig>; 