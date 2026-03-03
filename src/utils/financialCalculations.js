// Currency formatting utilities

/**
 * Format a number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00'
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format a number with commas
 * @param {number} number - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(number) {
  if (number === null || number === undefined || isNaN(number)) {
    return '0'
  }
  
  return new Intl.NumberFormat('en-US').format(number)
}

/**
 * Calculate percentage change
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
export function calculatePercentageChange(current, previous) {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Calculate total from array of objects
 * @param {Array} items - Array of objects
 * @param {string} key - Key to sum
 * @returns {number} Total sum
 */
export function calculateTotal(items, key) {
  if (!Array.isArray(items) || items.length === 0) return 0
  
  return items.reduce((sum, item) => {
    const value = Number(item[key])
    return sum + (isNaN(value) ? 0 : value)
  }, 0)
}

/**
 * Calculate average from array of objects
 * @param {Array} items - Array of objects
 * @param {string} key - Key to average
 * @returns {number} Average value
 */
export function calculateAverage(items, key) {
  if (!Array.isArray(items) || items.length === 0) return 0
  
  const total = calculateTotal(items, key)
  return total / items.length
}