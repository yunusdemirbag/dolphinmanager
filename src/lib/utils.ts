import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: { amount: number; divisor: number; currency_code: string }) {
  return `${price.currency_code} ${(price.amount / price.divisor).toFixed(2)}`
}
