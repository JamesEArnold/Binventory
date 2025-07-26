/**
 * Security configuration and environment validation
 */

import { z } from 'zod';

// Security environment schema
const securityEnvSchema = z.object({
  // Core security settings
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Password security
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  
  // Account lockout settings
  MAX_LOGIN_ATTEMPTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(3).max(10)).default('5'),
  LOCKOUT_DURATION: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(300000)).default('900000'), // 15 minutes
  ATTEMPT_WINDOW: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(60000)).default('300000'), // 5 minutes
  
  // Rate limiting
  API_RATE_LIMIT_REQUESTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(50).max(1000)).default('100'),
  API_RATE_LIMIT_WINDOW: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(600000)).default('900000'), // 15 minutes
  AUTH_RATE_LIMIT_REQUESTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(5).max(50)).default('10'),
  
  // File upload limits
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1048576)).default('5242880'), // 5MB
  
  // Session security
  SESSION_MAX_AGE: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(3600)).default('86400'), // 24 hours
  
  // CSRF protection
  CSRF_TOKEN_EXPIRY: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(300000)).default('900000'), // 15 minutes
  
  // Audit logging
  AUDIT_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUDIT_CONSOLE_LOGGING: z.string().transform(val => val === 'true').default('false'),
  
  // External services (optional)
  WEBHOOK_SECURITY_ALERTS: z.string().url().optional(),
  SIEM_ENDPOINT: z.string().url().optional(),
  
  // Feature flags
  ENABLE_2FA: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CSRF_PROTECTION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_RATE_LIMITING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AUDIT_LOGGING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_FILE_SCANNING: z.string().transform(val => val === 'true').default('false'),
});

export type SecurityConfig = z.infer<typeof securityEnvSchema>;

// Production security requirements
const productionRequirements = {
  NEXTAUTH_SECRET: {
    minLength: 64,
    mustBeRandom: true,
  },
  BCRYPT_ROUNDS: {
    minimum: 12,
  },
  SESSION_MAX_AGE: {
    maximum: 86400, // 24 hours
  },
  requiredFeatures: [
    'ENABLE_2FA',
    'ENABLE_CSRF_PROTECTION',
    'ENABLE_RATE_LIMITING',
    'ENABLE_AUDIT_LOGGING',
  ],
};

/**
 * Validate security configuration
 */
export function validateSecurityConfig(): {
  valid: boolean;
  config?: SecurityConfig;
  errors?: string[];
  warnings?: string[];
} {
  try {
    const config = securityEnvSchema.parse(process.env);
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Production-specific validations
    if (config.NODE_ENV === 'production') {
      // Check NEXTAUTH_SECRET strength
      if (config.NEXTAUTH_SECRET.length < productionRequirements.NEXTAUTH_SECRET.minLength) {
        errors.push(`NEXTAUTH_SECRET must be at least ${productionRequirements.NEXTAUTH_SECRET.minLength} characters in production`);
      }
      
      // Check if secret looks random
      if (isWeakSecret(config.NEXTAUTH_SECRET)) {
        warnings.push('NEXTAUTH_SECRET appears to be weak. Use a cryptographically random string.');
      }
      
      // Check bcrypt rounds
      if (config.BCRYPT_ROUNDS < productionRequirements.BCRYPT_ROUNDS.minimum) {
        warnings.push(`BCRYPT_ROUNDS should be at least ${productionRequirements.BCRYPT_ROUNDS.minimum} in production`);
      }
      
      // Check session duration
      if (config.SESSION_MAX_AGE > productionRequirements.SESSION_MAX_AGE.maximum) {
        warnings.push('SESSION_MAX_AGE is longer than recommended for production');
      }
      
      // Check required features
      productionRequirements.requiredFeatures.forEach(feature => {
        if (!config[feature as keyof SecurityConfig]) {
          warnings.push(`${feature} should be enabled in production`);
        }
      });
      
      // Check for missing external monitoring
      if (!config.WEBHOOK_SECURITY_ALERTS && !config.SIEM_ENDPOINT) {
        warnings.push('Consider configuring external security alerting for production');
      }
    }
    
    // Development-specific warnings
    if (config.NODE_ENV === 'development') {
      if (config.BCRYPT_ROUNDS > 12) {
        warnings.push('High BCRYPT_ROUNDS may slow down development. Consider using 10-12 for development.');
      }
    }
    
    return {
      valid: errors.length === 0,
      config,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    
    return {
      valid: false,
      errors: ['Unknown configuration validation error'],
    };
  }
}

/**
 * Check if a secret appears to be weak
 */
function isWeakSecret(secret: string): boolean {
  // Check for common weak patterns
  const weakPatterns = [
    /^[a-z]+$/i, // Only letters
    /^\d+$/, // Only numbers
    /^(.)\1+$/, // Repeated character
    /^(abc|123|password|secret|key)/i, // Common prefixes
    /^(qwerty|asdf|zxcv)/i, // Keyboard patterns
  ];
  
  return weakPatterns.some(pattern => pattern.test(secret));
}

/**
 * Generate secure environment template
 */
export function generateSecureEnvTemplate(): string {
  return `# Security Configuration

# Core Security (REQUIRED)
NODE_ENV=production
NEXTAUTH_SECRET=<generate-64-character-random-string>

# Password Security
BCRYPT_ROUNDS=12

# Account Lockout Protection
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
ATTEMPT_WINDOW=300000

# Rate Limiting
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_REQUESTS=10

# File Upload Security
MAX_FILE_SIZE=5242880

# Session Security
SESSION_MAX_AGE=86400

# CSRF Protection
CSRF_TOKEN_EXPIRY=900000

# Audit Logging
AUDIT_LOG_LEVEL=info
AUDIT_CONSOLE_LOGGING=false

# Feature Flags
ENABLE_2FA=true
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_FILE_SCANNING=false

# External Security Services (Optional)
# WEBHOOK_SECURITY_ALERTS=https://your-webhook-url
# SIEM_ENDPOINT=https://your-siem-endpoint
`;
}

/**
 * Get runtime security status
 */
export function getSecurityStatus(): {
  environment: string;
  securityLevel: 'low' | 'medium' | 'high';
  enabledFeatures: string[];
  vulnerabilities: string[];
  recommendations: string[];
} {
  const validation = validateSecurityConfig();
  const config = validation.config;
  
  if (!config) {
    return {
      environment: 'unknown',
      securityLevel: 'low',
      enabledFeatures: [],
      vulnerabilities: validation.errors || ['Configuration validation failed'],
      recommendations: ['Fix configuration errors'],
    };
  }
  
  const enabledFeatures = Object.entries(config)
    .filter(([key, value]) => key.startsWith('ENABLE_') && value === true)
    .map(([key]) => key);
  
  let securityLevel: 'low' | 'medium' | 'high' = 'medium';
  
  // Determine security level
  if (config.NODE_ENV === 'production' && enabledFeatures.length >= 4) {
    securityLevel = 'high';
  } else if (enabledFeatures.length >= 2) {
    securityLevel = 'medium';
  } else {
    securityLevel = 'low';
  }
  
  const vulnerabilities = validation.errors || [];
  const recommendations = validation.warnings || [];
  
  return {
    environment: config.NODE_ENV,
    securityLevel,
    enabledFeatures,
    vulnerabilities,
    recommendations,
  };
}

// Initialize and validate configuration on module load
let securityConfig: SecurityConfig | null = null;
let configValidation: ReturnType<typeof validateSecurityConfig> | null = null;

try {
  configValidation = validateSecurityConfig();
  if (configValidation.valid && configValidation.config) {
    securityConfig = configValidation.config;
    
    // Log configuration status
    if (configValidation.warnings && configValidation.warnings.length > 0) {
      console.warn('Security configuration warnings:', configValidation.warnings);
    }
  } else {
    console.error('Security configuration errors:', configValidation.errors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid security configuration in production');
    }
  }
} catch (error) {
  console.error('Failed to initialize security configuration:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export { securityConfig };
export default securityConfig;