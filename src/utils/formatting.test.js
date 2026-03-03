import { expect, describe, it } from 'vitest'
import { formatDate, formatDateTime, getRelativeTime } from './formatting'

describe('formatting utilities', () => {
  describe('formatDate', () => {
    it('should format a date string correctly', () => {
      const date = '2026-02-23'
      const result = formatDate(date)
      expect(result).toContain('2026')
      expect(result).toContain('Feb')
    })

    it('should format a Date object correctly', () => {
      const date = new Date('2026-02-23')
      const result = formatDate(date)
      expect(result).toContain('2026')
      expect(result).toContain('Feb')
    })

    it('should return "N/A" for null/undefined', () => {
      expect(formatDate(null)).toBe('N/A')
      expect(formatDate(undefined)).toBe('N/A')
    })

    it('should return "Invalid Date" for invalid input', () => {
      expect(formatDate('invalid')).toBe('Invalid Date')
    })
  })

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2026-02-23T10:30:00')
      const result = formatDateTime(date)
      expect(result).toContain('2026')
      expect(result).toContain('10:30')
    })

    it('should return "N/A" for null/undefined', () => {
      expect(formatDateTime(null)).toBe('N/A')
    })
  })

  describe('getRelativeTime', () => {
    it('should return "Just now" for recent dates', () => {
      const now = new Date()
      expect(getRelativeTime(now)).toBe('Just now')
    })

    it('should return days ago for older dates', () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      expect(getRelativeTime(twoDaysAgo)).toBe('2 days ago')
    })

    it('should return formatted date for very old dates', () => {
      // Use a date that's definitely older than a week
      const oldDate = new Date('2020-06-15')
      const result = getRelativeTime(oldDate)
      // Should return formatted date, not relative time
      expect(result).toMatch(/\d{4}/) // Should contain a year
    })
  })
})