/**
 * File upload security and validation
 */

import { createHash } from 'crypto';
import { auditLogger, AuditAction } from './audit-logger';

// File type definitions
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  detectedMimeType?: string;
  fileHash?: string;
}

export interface FileSecurityConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
  stripExifData?: boolean;
  generateThumbnails?: boolean;
}

// Default configurations for different file types
export const fileConfigs = {
  image: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    stripExifData: true,
    generateThumbnails: true,
  },
  document: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    scanForMalware: true,
  },
  archive: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    allowedExtensions: ['.zip', '.rar', '.7z'],
    scanForMalware: true,
  },
};

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.vbe',
  '.js', '.jse', '.jar', '.ws', '.wsf', '.wsc', '.wsh', '.ps1',
  '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1',
  '.msh2', '.mshxml', '.msh1xml', '.msh2xml', '.scf', '.lnk',
  '.inf', '.reg', '.doc', '.xls', '.ppt', '.docm', '.dotm',
  '.xlsm', '.xltm', '.xlam', '.pptm', '.potm', '.ppam', '.ppsm',
  '.sldm', '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl'
];

// Magic numbers for file type detection
const MAGIC_NUMBERS: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xFF, 0xD8, 0xFF]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  'image/gif': new Uint8Array([0x47, 0x49, 0x46, 0x38]),
  'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]), // Partial - WEBP has more complex signature
  'application/pdf': new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]),
  'application/zip': new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
  'application/x-rar-compressed': new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]),
};

/**
 * Validate file based on security configuration
 */
export async function validateFile(
  file: File | Buffer,
  config: FileSecurityConfig,
  fileName?: string
): Promise<FileValidationResult> {
  try {
    let buffer: Buffer;
    let originalName: string;
    let fileSize: number;
    
    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
      originalName = file.name;
      fileSize = file.size;
    } else {
      buffer = file;
      originalName = fileName || 'unknown';
      fileSize = buffer.length;
    }
    
    // Check file size
    if (fileSize > config.maxFileSize) {
      return {
        valid: false,
        error: `File size ${formatFileSize(fileSize)} exceeds maximum allowed size ${formatFileSize(config.maxFileSize)}`,
      };
    }
    
    // Sanitize filename
    const sanitizedName = sanitizeFileName(originalName);
    if (!sanitizedName) {
      return {
        valid: false,
        error: 'Invalid filename',
      };
    }
    
    // Check extension
    const extension = getFileExtension(sanitizedName).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(extension)) {
      await auditLogger.logSecurityEvent(
        AuditAction.FILE_MALWARE_DETECTED,
        undefined,
        undefined,
        { fileName: originalName, reason: 'dangerous_extension', extension }
      );
      
      return {
        valid: false,
        error: 'File type not allowed for security reasons',
      };
    }
    
    if (config.allowedExtensions && !config.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension '${extension}' is not allowed`,
      };
    }
    
    // Detect actual file type using magic numbers
    const detectedMimeType = detectMimeType(buffer);
    if (!detectedMimeType) {
      return {
        valid: false,
        error: 'Unable to determine file type',
      };
    }
    
    // Check MIME type
    if (!config.allowedMimeTypes.includes(detectedMimeType)) {
      return {
        valid: false,
        error: `File type '${detectedMimeType}' is not allowed`,
      };
    }
    
    // Additional security checks
    const securityCheck = await performSecurityChecks(buffer, detectedMimeType, originalName);
    if (!securityCheck.safe) {
      await auditLogger.logSecurityEvent(
        AuditAction.FILE_MALWARE_DETECTED,
        undefined,
        undefined,
        { fileName: originalName, reason: securityCheck.reason }
      );
      
      return {
        valid: false,
        error: securityCheck.reason || 'File failed security validation',
      };
    }
    
    // Generate file hash for integrity checking
    const fileHash = generateFileHash(buffer);
    
    return {
      valid: true,
      sanitizedName,
      detectedMimeType,
      fileHash,
    };
    
  } catch (error) {
    console.error('File validation error:', error);
    return {
      valid: false,
      error: 'File validation failed',
    };
  }
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  // Remove or replace dangerous characters
  let sanitized = fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 255); // Limit length
  
  // Ensure there's at least a valid character
  if (!sanitized || sanitized.length === 0) {
    return '';
  }
  
  // Prevent reserved names on Windows
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    sanitized = `file_${sanitized}`;
  }
  
  return sanitized;
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot) : '';
}

/**
 * Detect MIME type using magic numbers
 */
function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, signature] of Object.entries(MAGIC_NUMBERS)) {
    if (buffer.length >= signature.length) {
      const fileStart = buffer.subarray(0, signature.length);
      if (signature.every((byte, index) => byte === fileStart[index])) {
        return mimeType;
      }
    }
  }
  
  // Special case for WEBP (more complex signature)
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4);
    const webp = buffer.subarray(8, 12);
    if (riff.equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
        webp.equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))) {
      return 'image/webp';
    }
  }
  
  return null;
}

/**
 * Perform additional security checks on file content
 */
async function performSecurityChecks(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ safe: boolean; reason?: string }> {
  // Check for embedded scripts in images
  if (mimeType.startsWith('image/')) {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    
    // Look for script tags or JavaScript
    if (/<script/i.test(content) || /javascript:/i.test(content)) {
      return { safe: false, reason: `Embedded script detected in image file: ${fileName}` };
    }
    
    // Look for PHP code
    if (/<\?php/i.test(content)) {
      return { safe: false, reason: `Embedded PHP code detected in file: ${fileName}` };
    }
  }
  
  // Check for polyglot files (files that are valid in multiple formats)
  if (buffer.length > 0) {
    const header = buffer.toString('utf8', 0, Math.min(buffer.length, 512));
    
    // Look for HTML/XML declarations
    if (mimeType.startsWith('image/') && (/<html/i.test(header) || /<xml/i.test(header))) {
      return { safe: false, reason: `HTML/XML content detected in image file: ${fileName}` };
    }
  }
  
  // Additional checks can be added here:
  // - Virus scanning integration
  // - Content analysis
  // - Steganography detection
  
  return { safe: true };
}

/**
 * Generate SHA-256 hash of file content
 */
function generateFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Format file size for human reading
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Strip EXIF data from images (requires image processing library)
 */
export async function stripExifData(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // This would require an image processing library like sharp
  // For now, return the original buffer
  // In production, you would implement EXIF stripping here
  
  if (mimeType.startsWith('image/')) {
    // TODO: Implement EXIF stripping with sharp or similar library
    console.log('EXIF stripping not implemented - would strip EXIF data here');
  }
  
  return buffer;
}

/**
 * Validate and process uploaded file
 */
export async function processUploadedFile(
  file: File,
  fileType: keyof typeof fileConfigs,
  userId?: string,
  ipAddress?: string
): Promise<{
  success: boolean;
  processedFile?: Buffer;
  fileName?: string;
  mimeType?: string;
  fileHash?: string;
  error?: string;
}> {
  try {
    const config = fileConfigs[fileType];
    if (!config) {
      return { success: false, error: 'Invalid file type configuration' };
    }
    
    // Validate file
    const validation = await validateFile(file, config);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Process file
    let buffer: Buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    
    // Strip EXIF data if configured
    if ('stripExifData' in config && config.stripExifData && validation.detectedMimeType?.startsWith('image/')) {
      buffer = await stripExifData(buffer, validation.detectedMimeType);
    }
    
    // Log successful upload
    await auditLogger.log({
      action: AuditAction.FILE_UPLOAD,
      userId,
      ipAddress,
      metadata: {
        fileName: validation.sanitizedName,
        mimeType: validation.detectedMimeType,
        fileSize: buffer.length,
        fileHash: validation.fileHash,
      },
    });
    
    return {
      success: true,
      processedFile: buffer,
      fileName: validation.sanitizedName,
      mimeType: validation.detectedMimeType,
      fileHash: validation.fileHash,
    };
    
  } catch (error) {
    console.error('File processing error:', error);
    return { success: false, error: 'File processing failed' };
  }
}