import { nanoid } from 'nanoid';

/**
 * Generate human-readable order numbers for better customer service
 * Format: ORD-2024-00001, SRV-2024-00001, PRT-2024-00001
 */

export type OrderType = 'order' | 'service' | 'parts';

const ORDER_PREFIXES: Record<OrderType, string> = {
  order: 'ORD',
  service: 'SRV', 
  parts: 'PRT'
};

/**
 * Generate a human-readable order number
 * @param orderType - Type of order (order, service, parts)
 * @returns Human-readable order number like "ORD-2024-00001"
 */
export function generateOrderNumber(orderType: OrderType): string {
  const year = new Date().getFullYear();
  const prefix = ORDER_PREFIXES[orderType];
  
  // Generate a random 5-digit number for uniqueness
  // In production, this would typically be a sequential number from database
  const randomNumber = Math.floor(10000 + Math.random() * 90000);
  
  return `${prefix}-${year}-${randomNumber}`;
}

/**
 * Generate a unique order number with collision detection
 * @param orderType - Type of order
 * @param existingOrderNumbers - Set of existing order numbers to avoid collisions
 * @returns Unique human-readable order number
 */
export function generateUniqueOrderNumber(
  orderType: OrderType, 
  existingOrderNumbers: Set<string> = new Set()
): string {
  let orderNumber: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    orderNumber = generateOrderNumber(orderType);
    attempts++;
    
    if (attempts >= maxAttempts) {
      // Fallback to nanoid suffix for uniqueness
      const year = new Date().getFullYear();
      const prefix = ORDER_PREFIXES[orderType];
      const uniqueSuffix = nanoid(8).toUpperCase();
      orderNumber = `${prefix}-${year}-${uniqueSuffix}`;
      break;
    }
  } while (existingOrderNumbers.has(orderNumber));
  
  return orderNumber;
}

/**
 * Parse order number to extract components
 * @param orderNumber - Order number like "ORD-2024-00001"
 * @returns Parsed components or null if invalid format
 */
export function parseOrderNumber(orderNumber: string): {
  type: OrderType;
  year: number;
  sequence: string;
} | null {
  const pattern = /^(ORD|SRV|PRT)-(\d{4})-(.+)$/;
  const match = orderNumber.match(pattern);
  
  if (!match) return null;
  
  const [, prefix, yearStr, sequence] = match;
  const typeMap: Record<string, OrderType> = {
    'ORD': 'order',
    'SRV': 'service',
    'PRT': 'parts'
  };
  
  return {
    type: typeMap[prefix],
    year: parseInt(yearStr),
    sequence
  };
}

/**
 * Validate order number format
 * @param orderNumber - Order number to validate
 * @returns True if valid format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return parseOrderNumber(orderNumber) !== null;
}