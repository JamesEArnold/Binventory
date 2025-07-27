/**
 * Security headers configuration for enhanced protection
 */

export interface SecurityHeadersConfig {
  csp?: {
    directives: Record<string, string[]>;
    reportOnly?: boolean;
  };
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  referrerPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  xXssProtection?: string;
  permissionsPolicy?: Record<string, string[]>;
}

export function getSecurityHeaders(config?: SecurityHeadersConfig): Record<string, string> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const headers: Record<string, string> = {};

  // Content Security Policy
  const defaultCSP = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Allow inline scripts for Next.js
      isDevelopment ? "'unsafe-eval'" : '', // Allow eval in development only
    ].filter(Boolean),
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Allow inline styles for Tailwind
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'img-src': [
      "'self'",
      'data:', // Allow data URLs for images
      'blob:', // Allow blob URLs for images
      'https:', // Allow HTTPS images
      isDevelopment ? 'http://localhost:4566' : '', // LocalStack in development
    ].filter(Boolean),
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': isProduction ? [] : undefined,
  };

  const cspDirectives = { ...defaultCSP, ...config?.csp?.directives };
  const cspValue = Object.entries(cspDirectives)
    .filter(([, values]) => values !== undefined)
    .map(([directive, values]) => 
      values!.length > 0 ? `${directive} ${values!.join(' ')}` : directive
    )
    .join('; ');

  if (config?.csp?.reportOnly) {
    headers['Content-Security-Policy-Report-Only'] = cspValue;
  } else {
    headers['Content-Security-Policy'] = cspValue;
  }

  // HTTP Strict Transport Security (HSTS)
  if (isProduction) {
    const hstsConfig = config?.hsts || {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    };
    
    let hstsValue = `max-age=${hstsConfig.maxAge}`;
    if (hstsConfig.includeSubDomains) hstsValue += '; includeSubDomains';
    if (hstsConfig.preload) hstsValue += '; preload';
    
    headers['Strict-Transport-Security'] = hstsValue;
  }

  // X-Frame-Options
  headers['X-Frame-Options'] = config?.xFrameOptions || 'DENY';

  // X-Content-Type-Options
  headers['X-Content-Type-Options'] = config?.xContentTypeOptions || 'nosniff';

  // X-XSS-Protection (legacy, but still useful for older browsers)
  headers['X-XSS-Protection'] = config?.xXssProtection || '1; mode=block';

  // Referrer Policy
  headers['Referrer-Policy'] = config?.referrerPolicy || 'strict-origin-when-cross-origin';

  // Permissions Policy (Feature Policy replacement)
  const defaultPermissions = {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'self'"],
    'web-share': ["'self'"],
    'payment': ["'none'"],
    'usb': ["'none'"],
  };
  
  const permissions = { ...defaultPermissions, ...config?.permissionsPolicy };
  const permissionsValue = Object.entries(permissions)
    .map(([feature, allowlist]) => `${feature}=(${allowlist.join(' ')})`)
    .join(', ');
  
  headers['Permissions-Policy'] = permissionsValue;

  // Additional security headers
  headers['X-DNS-Prefetch-Control'] = 'off';
  headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'; // Adjust based on needs
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Resource-Policy'] = 'same-origin';

  // Remove server information
  headers['Server'] = '';

  return headers;
}

// Predefined configurations for different environments
export const securityConfigs = {
  development: {
    csp: {
      directives: {
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'connect-src': ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      },
    },
  },
  
  production: {
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      directives: {
        'upgrade-insecure-requests': [],
      },
    },
  },
  
  testing: {
    csp: {
      reportOnly: true, // Use report-only mode for testing
    },
  },
};

// Helper function to apply security headers to a Response
export function applySecurityHeaders(
  response: Response,
  config?: SecurityHeadersConfig
): Response {
  const headers = getSecurityHeaders(config);
  
  Object.entries(headers).forEach(([name, value]) => {
    if (value) {
      response.headers.set(name, value);
    }
  });
  
  return response;
}

// Helper function to create a NextResponse with security headers
export function createSecureResponse(
  body?: BodyInit | null,
  init?: ResponseInit,
  config?: SecurityHeadersConfig
): Response {
  const response = new Response(body, init);
  return applySecurityHeaders(response, config);
}