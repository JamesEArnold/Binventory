/**
 * Rate limiting implementation for API protection
 * Uses in-memory storage for simplicity (consider Redis for production scaling)
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.requests.entries())) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  async check(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = this.getKey(identifier);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    let entry = this.requests.get(key);

    // If no entry exists or it's expired, create a new one
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime
      };
      this.requests.set(key, entry);
    }

    entry.count++;
    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalHits: entry.count
    };
  }

  async reset(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    this.requests.delete(key);
  }
}

// Create rate limiters for different types of requests
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes per IP
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth attempts per 15 minutes per IP
  skipSuccessfulRequests: true, // Only count failed attempts
  skipFailedRequests: false
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour per user
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Helper function to get client IP address
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  // Fallback for development
  return '127.0.0.1';
}

// Helper function to get user identifier (IP + user ID if authenticated)
export function getUserIdentifier(request: Request, userId?: string): string {
  const ip = getClientIP(request);
  return userId ? `${ip}:${userId}` : ip;
}

// Rate limit response headers
export function getRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
  totalHits: number;
}) {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'X-RateLimit-Used': result.totalHits.toString()
  };
}

// Create rate limit middleware
export async function rateLimit(
  request: Request,
  limiter: RateLimiter,
  identifier: string
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const result = await limiter.check(identifier);
  const headers: Record<string, string> = getRateLimitHeaders(result);

  if (!result.allowed) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString();
  }

  return {
    allowed: result.allowed,
    headers
  };
}