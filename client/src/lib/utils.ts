import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price for Nigerian Naira currency
 * Shows whole numbers without decimals, keeps decimals for non-whole amounts
 */
export function formatPrice(price: number): string {
  if (price % 1 === 0) {
    // Whole number - no decimals
    return `₦${price.toLocaleString()}`
  } else {
    // Has decimals - show 2 decimal places
    return `₦${price.toFixed(2)}`
  }
}