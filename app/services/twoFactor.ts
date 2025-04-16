/**
 * @description Implementation for Two-Factor Authentication from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';

const prisma = new PrismaClient();

// Database schema extension - will be added via migration
// model TwoFactorAuth {
//   id              String    @id @default(uuid())
//   userId          String    @unique @map("user_id")
//   secret          String
//   verified        Boolean   @default(false)
//   recoveryCodes   String[]  @map("recovery_codes")
//   createdAt       DateTime  @default(now()) @map("created_at")
//   updatedAt       DateTime  @updatedAt @map("updated_at")
//   user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
//   
//   @@map("two_factor_auth")
// }

// Validation schemas
export const verifyTOTPSchema = z.object({
  userId: z.string().uuid(),
  token: z.string().length(6).regex(/^\d+$/),
});

export const setupTOTPSchema = z.object({
  userId: z.string().uuid(),
});

export const verifyRecoveryCodeSchema = z.object({
  userId: z.string().uuid(),
  recoveryCode: z.string().min(10),
});

export type VerifyTOTPInput = z.infer<typeof verifyTOTPSchema>;
export type SetupTOTPInput = z.infer<typeof setupTOTPSchema>;
export type VerifyRecoveryCodeInput = z.infer<typeof verifyRecoveryCodeSchema>;

export type TwoFactorResult = {
  success: boolean;
  message?: string;
  error?: string;
  qrCodeUrl?: string;
  secret?: string;
  recoveryCodes?: string[];
};

/**
 * Generate a new TOTP secret for a user
 */
export async function generateTOTPSecret(
  data: SetupTOTPInput
): Promise<TwoFactorResult> {
  try {
    const { userId } = setupTOTPSchema.parse(data);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if 2FA is already setup
    const existingSetup = await prisma.$queryRaw`
      SELECT id FROM "two_factor_auth" WHERE user_id = ${userId}
    `;
    
    if (Array.isArray(existingSetup) && existingSetup.length > 0) {
      return { success: false, error: 'Two-factor authentication is already set up for this user' };
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();
    
    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(10).toString('hex')
    );

    // Create a new 2FA record
    await prisma.$executeRaw`
      INSERT INTO "two_factor_auth" (id, user_id, secret, verified, recovery_codes, created_at, updated_at)
      VALUES (
        ${crypto.randomUUID()}, 
        ${userId}, 
        ${secret}, 
        false, 
        ${recoveryCodes}::text[], 
        NOW(), 
        NOW()
      )
    `;

    // Generate QR code for TOTP app
    const keyUri = authenticator.keyuri(user.email, 'Binventory', secret);
    const qrCodeUrl = await QRCode.toDataURL(keyUri);

    return { 
      success: true, 
      message: 'TOTP secret generated successfully',
      qrCodeUrl,
      secret,
      recoveryCodes
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error generating TOTP secret:', error);
    return { success: false, error: 'Failed to generate TOTP secret' };
  }
}

/**
 * Verify a TOTP token
 */
export async function verifyTOTP(
  data: VerifyTOTPInput
): Promise<TwoFactorResult> {
  try {
    const { userId, token } = verifyTOTPSchema.parse(data);

    // Get the 2FA record
    const twoFactorRecord = await prisma.$queryRaw`
      SELECT secret FROM "two_factor_auth" WHERE user_id = ${userId}
    `;

    if (!Array.isArray(twoFactorRecord) || twoFactorRecord.length === 0) {
      return { success: false, error: 'Two-factor authentication not set up for this user' };
    }

    const secret = twoFactorRecord[0].secret;

    // Verify the token
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      return { success: false, error: 'Invalid authentication code' };
    }

    // Mark as verified if it's the first successful verification
    if (!twoFactorRecord[0].verified) {
      await prisma.$executeRaw`
        UPDATE "two_factor_auth" SET verified = true, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }

    return { success: true, message: 'Token verified successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error verifying TOTP:', error);
    return { success: false, error: 'Failed to verify authentication code' };
  }
}

/**
 * Verify a recovery code
 */
export async function verifyRecoveryCode(
  data: VerifyRecoveryCodeInput
): Promise<TwoFactorResult> {
  try {
    const { userId, recoveryCode } = verifyRecoveryCodeSchema.parse(data);

    // Get the 2FA record
    const twoFactorRecord = await prisma.$queryRaw`
      SELECT recovery_codes FROM "two_factor_auth" WHERE user_id = ${userId}
    `;

    if (!Array.isArray(twoFactorRecord) || twoFactorRecord.length === 0) {
      return { success: false, error: 'Two-factor authentication not set up for this user' };
    }

    const recoveryCodes = twoFactorRecord[0].recovery_codes;

    // Check if the recovery code exists
    const codeIndex = recoveryCodes.indexOf(recoveryCode);
    if (codeIndex === -1) {
      return { success: false, error: 'Invalid recovery code' };
    }

    // Remove the used recovery code
    const updatedCodes = [...recoveryCodes];
    updatedCodes.splice(codeIndex, 1);

    // Update the recovery codes
    await prisma.$executeRaw`
      UPDATE "two_factor_auth" 
      SET recovery_codes = ${updatedCodes}::text[], updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    return { 
      success: true, 
      message: 'Recovery code verified successfully',
      recoveryCodes: updatedCodes
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error verifying recovery code:', error);
    return { success: false, error: 'Failed to verify recovery code' };
  }
}

/**
 * Disable two-factor authentication for a user
 */
export async function disableTwoFactor(userId: string): Promise<TwoFactorResult> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if 2FA is set up
    const twoFactorRecord = await prisma.$queryRaw`
      SELECT id FROM "two_factor_auth" WHERE user_id = ${userId}
    `;

    if (!Array.isArray(twoFactorRecord) || twoFactorRecord.length === 0) {
      return { success: false, error: 'Two-factor authentication not set up for this user' };
    }

    // Delete the 2FA record
    await prisma.$executeRaw`
      DELETE FROM "two_factor_auth" WHERE user_id = ${userId}
    `;

    return { success: true, message: 'Two-factor authentication disabled successfully' };
  } catch (error) {
    console.error('Error disabling two-factor authentication:', error);
    return { success: false, error: 'Failed to disable two-factor authentication' };
  }
}

/**
 * Check if a user has two-factor authentication enabled
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorResult> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if 2FA is set up
    const twoFactorRecord = await prisma.$queryRaw`
      SELECT verified FROM "two_factor_auth" WHERE user_id = ${userId}
    `;

    if (!Array.isArray(twoFactorRecord) || twoFactorRecord.length === 0) {
      return { success: true, message: 'Two-factor authentication not set up' };
    }

    const isVerified = twoFactorRecord[0].verified;

    return { 
      success: true, 
      message: isVerified 
        ? 'Two-factor authentication is enabled and verified' 
        : 'Two-factor authentication is set up but not verified'
    };
  } catch (error) {
    console.error('Error checking two-factor status:', error);
    return { success: false, error: 'Failed to check two-factor authentication status' };
  }
}

/**
 * Generate new recovery codes
 */
export async function regenerateRecoveryCodes(userId: string): Promise<TwoFactorResult> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if 2FA is set up
    const twoFactorRecord = await prisma.$queryRaw`
      SELECT id FROM "two_factor_auth" WHERE user_id = ${userId}
    `;

    if (!Array.isArray(twoFactorRecord) || twoFactorRecord.length === 0) {
      return { success: false, error: 'Two-factor authentication not set up for this user' };
    }

    // Generate new recovery codes
    const newRecoveryCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(10).toString('hex')
    );

    // Update the recovery codes
    await prisma.$executeRaw`
      UPDATE "two_factor_auth" 
      SET recovery_codes = ${newRecoveryCodes}::text[], updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    return { 
      success: true, 
      message: 'Recovery codes regenerated successfully',
      recoveryCodes: newRecoveryCodes
    };
  } catch (error) {
    console.error('Error regenerating recovery codes:', error);
    return { success: false, error: 'Failed to regenerate recovery codes' };
  }
}

// Factory function for two-factor authentication service
export function createTwoFactorService() {
  return {
    generateTOTPSecret,
    verifyTOTP,
    verifyRecoveryCode,
    disableTwoFactor,
    getTwoFactorStatus,
    regenerateRecoveryCodes,
  };
}

export default createTwoFactorService(); 