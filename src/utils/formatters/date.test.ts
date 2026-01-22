import { getDifferenceInDays, formatTimeAgo } from './date'

describe('Date Formatting Utilities', () => {
  describe('getDifferenceInDays', () => {
    it('calculates difference between two dates correctly (positive values)', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-05')
      expect(getDifferenceInDays(date1, date2)).toBe(4)
    })

    it('handles negative differences (when first date is later)', () => {
      const date1 = new Date('2024-01-05')
      const date2 = new Date('2024-01-01')
      expect(getDifferenceInDays(date1, date2)).toBe(-4)
    })

    it('returns 0 for identical dates', () => {
      const date = new Date('2024-01-01')
      expect(getDifferenceInDays(date, date)).toBe(0)
    })

    it('accepts string dates as input parameters', () => {
      expect(getDifferenceInDays('2024-01-01', '2024-01-10')).toBe(9)
      expect(getDifferenceInDays('2024-01-01T10:30:00', '2024-01-02T08:00:00')).toBe(1)
    })

    it('ignores time component (only considers date part)', () => {
      const date1 = new Date('2024-01-01T23:59:59')
      const date2 = new Date('2024-01-02T00:00:01')
      expect(getDifferenceInDays(date1, date2)).toBe(1)
    })

    it('handles daylight saving time transitions properly', () => {
      // DST transition example (adjust dates based on locale)
      const beforeDST = new Date('2024-03-09')
      const afterDST = new Date('2024-03-11')
      expect(getDifferenceInDays(beforeDST, afterDST)).toBe(2)
    })

    it('returns NaN for invalid date inputs', () => {
      expect(getDifferenceInDays('invalid-date', '2024-01-01')).toBeNaN()
      expect(getDifferenceInDays('2024-01-01', 'invalid-date')).toBeNaN()
    })

    it('handles dates across year boundaries', () => {
      expect(getDifferenceInDays('2023-12-31', '2024-01-01')).toBe(1)
      expect(getDifferenceInDays('2023-12-01', '2024-01-01')).toBe(31)
    })

    it('handles leap year correctly', () => {
      expect(getDifferenceInDays('2024-02-28', '2024-03-01')).toBe(2) // 2024 is leap year
      expect(getDifferenceInDays('2023-02-28', '2023-03-01')).toBe(1) // 2023 is not
    })
  })

  describe('formatTimeAgo', () => {
    // Mock current time for consistent testing
    const mockNow = new Date('2024-01-15T12:00:00Z')
    
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(mockNow)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('returns "—" for null, undefined, or invalid dates', () => {
      expect(formatTimeAgo(null)).toBe('—')
      expect(formatTimeAgo(undefined)).toBe('—')
      expect(formatTimeAgo('')).toBe('—')
      expect(formatTimeAgo('invalid-date')).toBe('—')
    })

    it('formats seconds ago correctly', () => {
      // Less than 30 seconds
      const date1 = new Date(mockNow.getTime() - 15 * 1000)
      expect(formatTimeAgo(date1)).toBe('just now')
      
      const date2 = new Date(mockNow.getTime() - 29 * 1000)
      expect(formatTimeAgo(date2)).toBe('just now')
      
      // 30 seconds or more
      const date3 = new Date(mockNow.getTime() - 30 * 1000)
      expect(formatTimeAgo(date3)).toBe('30 seconds ago')
      
      const date4 = new Date(mockNow.getTime() - 45 * 1000)
      expect(formatTimeAgo(date4)).toBe('45 seconds ago')
    })

    it('formats minutes ago correctly', () => {
      const date1 = new Date(mockNow.getTime() - 60 * 1000) // 1 minute
      expect(formatTimeAgo(date1)).toBe('1 minute ago')
      
      const date2 = new Date(mockNow.getTime() - 5 * 60 * 1000) // 5 minutes
      expect(formatTimeAgo(date2)).toBe('5 minutes ago')
      
      const date3 = new Date(mockNow.getTime() - 59 * 60 * 1000) // 59 minutes
      expect(formatTimeAgo(date3)).toBe('59 minutes ago')
    })

    it('formats hours ago correctly', () => {
      const date1 = new Date(mockNow.getTime() - 60 * 60 * 1000) // 1 hour
      expect(formatTimeAgo(date1)).toBe('1 hour ago')
      
      const date2 = new Date(mockNow.getTime() - 3 * 60 * 60 * 1000) // 3 hours
      expect(formatTimeAgo(date2)).toBe('3 hours ago')
      
      const date3 = new Date(mockNow.getTime() - 23 * 60 * 60 * 1000) // 23 hours
      expect(formatTimeAgo(date3)).toBe('23 hours ago')
    })

    it('formats days ago correctly', () => {
      const date1 = new Date(mockNow.getTime() - 24 * 60 * 60 * 1000) // 1 day
      expect(formatTimeAgo(date1)).toBe('1 day ago')
      
      const date2 = new Date(mockNow.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days
      expect(formatTimeAgo(date2)).toBe('3 days ago')
      
      const date3 = new Date(mockNow.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days
      expect(formatTimeAgo(date3)).toBe('6 days ago')
    })

    it('formats weeks ago correctly', () => {
      const date1 = new Date(mockNow.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week
      expect(formatTimeAgo(date1)).toBe('1 week ago')
      
      const date2 = new Date(mockNow.getTime() - 2 * 7 * 24 * 60 * 60 * 1000) // 2 weeks
      expect(formatTimeAgo(date2)).toBe('2 weeks ago')
      
      const date3 = new Date(mockNow.getTime() - 4 * 7 * 24 * 60 * 60 * 1000) // 4 weeks
      expect(formatTimeAgo(date3)).toBe('4 weeks ago')
    })

    it('formats months ago correctly', () => {
      const date1 = new Date(mockNow.getTime() - 30 * 24 * 60 * 60 * 1000) // ~1 month
      expect(formatTimeAgo(date1)).toBe('1 month ago')
      
      const date2 = new Date(mockNow.getTime() - 3 * 30 * 24 * 60 * 60 * 1000) // ~3 months
      expect(formatTimeAgo(date2)).toBe('3 months ago')
      
      const date3 = new Date(mockNow.getTime() - 11 * 30 * 24 * 60 * 60 * 1000) // ~11 months
      expect(formatTimeAgo(date3)).toBe('11 months ago')
    })

    it('formats years ago correctly', () => {
      const date1 = new Date(mockNow.getTime() - 365 * 24 * 60 * 60 * 1000) // 1 year
      expect(formatTimeAgo(date1)).toBe('1 year ago')
      
      const date2 = new Date(mockNow.getTime() - 2 * 365 * 24 * 60 * 60 * 1000) // 2 years
      expect(formatTimeAgo(date2)).toBe('2 years ago')
      
      const date3 = new Date(mockNow.getTime() - 10 * 365 * 24 * 60 * 60 * 1000) // 10 years
      expect(formatTimeAgo(date3)).toBe('10 years ago')
    })

    it('handles future dates gracefully (returns "just now")', () => {
      const futureDate = new Date(mockNow.getTime() + 60 * 1000) // 1 minute in future
      expect(formatTimeAgo(futureDate)).toBe('just now')
    })

    it('accepts string dates as input parameters', () => {
      const dateString = new Date(mockNow.getTime() - 2 * 60 * 60 * 1000).toISOString()
      expect(formatTimeAgo(dateString)).toBe('2 hours ago')
    })

    it('handles edge case testing (exactly boundary values)', () => {
      // Exactly 30 seconds
      const exactly30s = new Date(mockNow.getTime() - 30 * 1000)
      expect(formatTimeAgo(exactly30s)).toBe('30 seconds ago')
      
      // Exactly 1 hour
      const exactly1h = new Date(mockNow.getTime() - 60 * 60 * 1000)
      expect(formatTimeAgo(exactly1h)).toBe('1 hour ago')
      
      // Just under 1 hour (59 minutes 59 seconds)
      const justUnder1h = new Date(mockNow.getTime() - (60 * 60 * 1000 - 1000))
      expect(formatTimeAgo(justUnder1h)).toBe('59 minutes ago')
    })

    it('uses singular form for 1 unit', () => {
      expect(formatTimeAgo(new Date(mockNow.getTime() - 60 * 1000))).toBe('1 minute ago')
      expect(formatTimeAgo(new Date(mockNow.getTime() - 3600 * 1000))).toBe('1 hour ago')
      expect(formatTimeAgo(new Date(mockNow.getTime() - 86400 * 1000))).toBe('1 day ago')
    })

    it('uses plural form for multiple units', () => {
      expect(formatTimeAgo(new Date(mockNow.getTime() - 120 * 1000))).toBe('2 minutes ago')
      expect(formatTimeAgo(new Date(mockNow.getTime() - 7200 * 1000))).toBe('2 hours ago')
      expect(formatTimeAgo(new Date(mockNow.getTime() - 172800 * 1000))).toBe('2 days ago')
    })
  })
})