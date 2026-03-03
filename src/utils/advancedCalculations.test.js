import { describe, it, expect } from 'vitest'
import {
  calculateFCR,
  calculateLayRate,
  calculateMortalityRate,
  calculateADG
} from '../hooks/useMetrics'

describe('Advanced Metrics Calculations', () => {
  describe('calculateFCR', () => {
    it('should calculate FCR correctly with valid inputs', () => {
      expect(calculateFCR(100, 500)).toBe(0.2)
      expect(calculateFCR(200, 1000)).toBe(0.2)
      expect(calculateFCR(150, 600)).toBe(0.25)
    })

    it('should return 0 when no eggs produced', () => {
      expect(calculateFCR(100, 0)).toBe(0)
      expect(calculateFCR(100, null)).toBe(0)
      expect(calculateFCR(100, undefined)).toBe(0)
    })

    it('should handle zero feed consumption', () => {
      expect(calculateFCR(0, 100)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateFCR(123.456, 789.012)).toBe(0.16)
      expect(calculateFCR(1, 3)).toBe(0.33)
    })
  })

  describe('calculateLayRate', () => {
    it('should calculate lay rate correctly with valid inputs', () => {
      expect(calculateLayRate(80, 100)).toBe(80.0)
      expect(calculateLayRate(50, 100)).toBe(50.0)
      expect(calculateLayRate(95, 100)).toBe(95.0)
    })

    it('should return 0 when no hens', () => {
      expect(calculateLayRate(50, 0)).toBe(0)
      expect(calculateLayRate(50, null)).toBe(0)
      expect(calculateLayRate(50, undefined)).toBe(0)
    })

    it('should calculate correctly for less than 100%', () => {
      expect(calculateLayRate(75, 100)).toBe(75.0)
      expect(calculateLayRate(30, 50)).toBe(60.0)
    })

    it('should round to 1 decimal place', () => {
      expect(calculateLayRate(333, 1000)).toBe(33.3)
      expect(calculateLayRate(1, 3)).toBe(33.3)
    })

    it('should handle more eggs than hens (possible in multi-day calculations)', () => {
      expect(calculateLayRate(150, 100)).toBe(150.0)
      expect(calculateLayRate(200, 100)).toBe(200.0)
    })
  })

  describe('calculateMortalityRate', () => {
    it('should calculate mortality rate correctly with valid inputs', () => {
      expect(calculateMortalityRate(5, 100)).toBe(5.0)
      expect(calculateMortalityRate(10, 100)).toBe(10.0)
      expect(calculateMortalityRate(2, 50)).toBe(4.0)
    })

    it('should return 0 when no initial flock', () => {
      expect(calculateMortalityRate(5, 0)).toBe(0)
      expect(calculateMortalityRate(5, null)).toBe(0)
      expect(calculateMortalityRate(5, undefined)).toBe(0)
    })

    it('should return 0 when no deaths', () => {
      expect(calculateMortalityRate(0, 100)).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      expect(calculateMortalityRate(33, 1000)).toBe(3.3)
      expect(calculateMortalityRate(1, 3)).toBe(33.3)
    })

    it('should handle edge cases', () => {
      expect(calculateMortalityRate(100, 100)).toBe(100.0)
      expect(calculateMortalityRate(0, 0)).toBe(0)
    })
  })

  describe('calculateADG', () => {
    it('should calculate ADG correctly with valid inputs', () => {
      expect(calculateADG(2000, 40)).toBe(50.0)
      expect(calculateADG(1500, 30)).toBe(50.0)
      expect(calculateADG(1800, 45)).toBe(40.0)
    })

    it('should return 0 when no days', () => {
      expect(calculateADG(2000, 0)).toBe(0)
      expect(calculateADG(2000, null)).toBe(0)
      expect(calculateADG(2000, undefined)).toBe(0)
    })

    it('should return 0 when no weight gain', () => {
      expect(calculateADG(0, 40)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateADG(1234, 56)).toBe(22.04)
      expect(calculateADG(1, 3)).toBe(0.33)
    })

    it('should handle realistic broiler growth', () => {
      // Broiler: 40g at day 0, 2500g at day 42
      const weightGain = 2500 - 40
      expect(calculateADG(weightGain, 42)).toBe(58.57)
    })
  })

  describe('Edge cases and boundary conditions', () => {
    it('should handle negative values gracefully', () => {
      // Negative values don't make sense in context, but function should handle them
      expect(calculateFCR(-100, 500)).toBe(-0.2)
      expect(calculateLayRate(-50, 100)).toBe(-50.0)
      expect(calculateMortalityRate(-5, 100)).toBe(-5.0)
    })

    it('should handle very large numbers', () => {
      expect(calculateFCR(1000000, 5000000)).toBe(0.2)
      expect(calculateLayRate(100000, 100000)).toBe(100.0)
      expect(calculateMortalityRate(1000, 10000)).toBe(10.0)
    })

    it('should handle very small numbers', () => {
      expect(calculateFCR(0.1, 1)).toBe(0.1)
      expect(calculateLayRate(1, 100)).toBe(1.0)
      expect(calculateMortalityRate(1, 1000)).toBe(0.1)
    })

    it('should handle string inputs that can be coerced', () => {
      expect(calculateFCR('100', '500')).toBe(0.2)
      expect(calculateLayRate('80', '100')).toBe(80.0)
      expect(calculateMortalityRate('5', '100')).toBe(5.0)
    })
  })
})
