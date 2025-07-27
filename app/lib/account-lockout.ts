/**
 * Account lockout protection against brute force attacks
 */

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// In-memory storage for login attempts (consider Redis for production)
const loginAttempts = new Map<string, LoginAttempt>();

// Configuration
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
// const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION || '900000', 10); // 15 minutes
const ATTEMPT_WINDOW = parseInt(process.env.ATTEMPT_WINDOW || '300000', 10); // 5 minutes

// Progressive lockout durations (in milliseconds)
const LOCKOUT_DURATIONS = [
  15 * 60 * 1000,  // 15 minutes for first lockout
  30 * 60 * 1000,  // 30 minutes for second lockout
  60 * 60 * 1000,  // 1 hour for third lockout
  24 * 60 * 60 * 1000, // 24 hours for subsequent lockouts
];

// Cleanup expired attempts every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of Array.from(loginAttempts.entries())) {
    // Remove attempts older than the attempt window and not locked
    if (!attempt.lockedUntil && (now - attempt.lastAttempt) > ATTEMPT_WINDOW * 2) {
      loginAttempts.delete(key);
    }
    // Remove unlocked expired lockouts
    if (attempt.lockedUntil && now > attempt.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get identifier for rate limiting (email + IP combination)
 */
function getIdentifier(email: string, ip?: string): string {
  return ip ? `${email}:${ip}` : email;
}

/**
 * Calculate lockout duration based on attempt count
 */
function calculateLockoutDuration(attemptCount: number): number {
  const index = Math.min(Math.floor(attemptCount / MAX_LOGIN_ATTEMPTS) - 1, LOCKOUT_DURATIONS.length - 1);
  return LOCKOUT_DURATIONS[Math.max(0, index)];
}

/**
 * Check if account is currently locked
 */
export function isAccountLocked(email: string, ip?: string): {
  locked: boolean;
  lockedUntil?: number;
  remainingTime?: number;
} {
  const identifier = getIdentifier(email, ip);
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt || !attempt.lockedUntil) {
    return { locked: false };
  }
  
  const now = Date.now();
  if (now > attempt.lockedUntil) {
    // Lockout has expired, clean up
    loginAttempts.delete(identifier);
    return { locked: false };
  }
  
  return {
    locked: true,
    lockedUntil: attempt.lockedUntil,
    remainingTime: attempt.lockedUntil - now,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string, ip?: string): {
  attemptsRemaining: number;
  lockedUntil?: number;
  lockoutDuration?: number;
} {
  const identifier = getIdentifier(email, ip);
  const now = Date.now();
  let attempt = loginAttempts.get(identifier);
  
  if (!attempt) {
    // First failed attempt
    attempt = {
      count: 1,
      lastAttempt: now,
    };
  } else {
    // Check if this is within the attempt window
    if ((now - attempt.lastAttempt) > ATTEMPT_WINDOW) {
      // Reset counter if outside attempt window
      attempt.count = 1;
    } else {
      attempt.count++;
    }
    attempt.lastAttempt = now;
  }
  
  // Check if account should be locked
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    const lockoutDuration = calculateLockoutDuration(attempt.count);
    attempt.lockedUntil = now + lockoutDuration;
    
    loginAttempts.set(identifier, attempt);
    
    return {
      attemptsRemaining: 0,
      lockedUntil: attempt.lockedUntil,
      lockoutDuration,
    };
  }
  
  loginAttempts.set(identifier, attempt);
  
  return {
    attemptsRemaining: MAX_LOGIN_ATTEMPTS - attempt.count,
  };
}

/**
 * Record a successful login (clears failed attempts)
 */
export function recordSuccessfulLogin(email: string, ip?: string): void {
  const identifier = getIdentifier(email, ip);
  loginAttempts.delete(identifier);
}

/**
 * Get current attempt count for an identifier
 */
export function getAttemptCount(email: string, ip?: string): number {
  const identifier = getIdentifier(email, ip);
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt) {
    return 0;
  }
  
  // Check if attempts are within the window
  const now = Date.now();
  if ((now - attempt.lastAttempt) > ATTEMPT_WINDOW) {
    loginAttempts.delete(identifier);
    return 0;
  }
  
  return attempt.count;
}

/**
 * Manually unlock an account (admin function)
 */
export function unlockAccount(email: string, ip?: string): boolean {
  const identifier = getIdentifier(email, ip);
  const attempt = loginAttempts.get(identifier);
  
  if (attempt) {
    loginAttempts.delete(identifier);
    return true;
  }
  
  return false;
}

/**
 * Get lockout status for multiple accounts (admin function)
 */
export function getLockoutStatus(): Array<{
  identifier: string;
  count: number;
  lastAttempt: Date;
  lockedUntil?: Date;
  isLocked: boolean;
}> {
  const now = Date.now();
  const status: Array<{
    identifier: string;
    count: number;
    lastAttempt: Date;
    lockedUntil?: Date;
    isLocked: boolean;
  }> = [];
  
  for (const [identifier, attempt] of Array.from(loginAttempts.entries())) {
    const isLocked = attempt.lockedUntil ? now < attempt.lockedUntil : false;
    
    status.push({
      identifier,
      count: attempt.count,
      lastAttempt: new Date(attempt.lastAttempt),
      lockedUntil: attempt.lockedUntil ? new Date(attempt.lockedUntil) : undefined,
      isLocked,
    });
  }
  
  return status;
}

/**
 * Format remaining time for user display
 */
export function formatRemainingTime(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / (60 * 1000));
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.ceil(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}