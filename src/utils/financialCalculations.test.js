import { expect, describe, it } from 'vitest'
import { 
  formatCurrency, 
  formatNumber, 
  calculatePercentageChange,
  calculateTotal,
  calculateAverage
} from './financialCalculations'

describe('financial calculations', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(50.5)).toBe('$50.50')
    })

    it('should format negative numbers as currency', () => {
      expect(formatCurrency(-100)).toBe('-$100.00')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should return $0.00 for null/undefined', () => {
      expect(formatCurrency(null)).toBe('$0.00')
      expect(formatCurrency(undefined)).toBe('$0.00')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(1000)).toBe('1,000')
    })

    it('should return "0" for null/undefined', () => {
      expect(formatNumber(null)).toBe('0')
      expect(formatNumber(undefined)).toBe('0')
    })
  })

  describe('calculatePercentageChange', () => {
    it('should calculate positive change', () => {
      expect(calculatePercentageChange(110, 100)).toBe(10)
    })

    it('should calculate negative change', () => {
      expect(calculatePercentageChange(90, 100)).toBe(-10)
    })

    it('should return 0 when previous is 0', () => {
      expect(calculatePercentageChange(100, 0)).toBe(0)
    })
  })

  describe('calculateTotal', () => {
    it('should sum values from array', () => {
      const items = [{ amount: 10 }, { amount: 20 }, { amount: 30 }]
      expect(calculateTotal(items, 'amount')).toBe(60)
    })

    it('should handle empty arrays', () => {
      expect(calculateTotal([], 'amount')).toBe(0)
    })

    it('should handle string numbers', () => {
      const items = [{ amount: '10' }, { amount: '20' }]
      expect(calculateTotal(items, 'amount')).toBe(30)
    })
  })

  describe('calculateAverage', () => {
    it('should calculate average from array', () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }]
      expect(calculateAverage(items, 'value')).toBe(20)
    })

    it('should handle empty arrays', () => {
      expect(calculateAverage([], 'value')).toBe(0)
    })
  })
})