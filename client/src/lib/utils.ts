import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format file sizes with proper units and edge case handling
 * @param sizeInBytes - File size in bytes (number, string, null, or undefined)
 * @returns Formatted file size string (e.g., "1.2 MB", "500 KB", "0 B")
 */
export function formatFileSize(sizeInBytes: number | string | undefined | null): string {
  // Handle undefined, null, or invalid inputs
  if (sizeInBytes == null || sizeInBytes === '') {
    return '0 B';
  }
  
  // Convert string to number if needed
  const size = typeof sizeInBytes === 'string' ? parseFloat(sizeInBytes) : sizeInBytes;
  
  // Check if conversion resulted in a valid number
  if (isNaN(size) || size < 0) {
    return '0 B';
  }
  
  // If size is 0, return immediately
  if (size === 0) {
    return '0 B';
  }
  
  // Define units and thresholds
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let calculatedSize = size;
  
  // Find the appropriate unit
  while (calculatedSize >= 1024 && unitIndex < units.length - 1) {
    calculatedSize /= 1024;
    unitIndex++;
  }
  
  // Format the number with appropriate decimal places
  const formattedSize = calculatedSize < 10 && unitIndex > 0 
    ? calculatedSize.toFixed(1) 
    : Math.round(calculatedSize);
  
  return `${formattedSize} ${units[unitIndex]}`;
}
