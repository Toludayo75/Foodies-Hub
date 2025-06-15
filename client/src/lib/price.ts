/**
 * Price formatting utilities for consistent currency display
 */

/**
 * Format price with Nigerian Naira symbol
 * @param price - Price amount as stored in database
 * @param showSymbol - Whether to show the ₦ symbol
 * @returns Formatted price string
 */
export function formatPrice(price: number, showSymbol: boolean = true): string {
  const formatted = price.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return showSymbol ? `₦${formatted}` : formatted;
}

/**
 * Format price for display with proper currency symbol
 * @param price - Price amount as stored in database
 * @returns Formatted price with currency symbol
 */
export function displayPrice(price: number): string {
  return formatPrice(price, true);
}