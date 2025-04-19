/**
 * Convert a string to a URL-friendly slug
 * @param text The text to convert to a slug
 * @returns A lowercase, hyphenated slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

/**
 * Truncate a string to a specified length
 * @param text The text to truncate
 * @param length Maximum length
 * @param suffix Suffix to add if truncated, defaults to '...'
 * @returns Truncated string
 */
export function truncateString(text: string, length: number, suffix = '...'): string {
  if (text.length <= length) {
    return text;
  }
  return text.substring(0, length) + suffix;
}

/**
 * Capitalize the first letter of a string
 * @param text The text to capitalize
 * @returns Text with first letter capitalized
 */
export function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format a string with template variables
 * @param template String with placeholders like {name}
 * @param variables Object with key-value pairs to replace placeholders
 * @returns Formatted string
 */
export function formatString(template: string, variables: Record<string, string | number>): string {
  return template.replace(/{([^{}]*)}/g, (match, key) => {
    const value = variables[key];
    return typeof value !== 'undefined' ? String(value) : match;
  });
} 