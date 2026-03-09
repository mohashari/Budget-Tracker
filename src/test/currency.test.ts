import { formatCurrency } from '@/lib/currency'

describe('formatCurrency', () => {
  describe('IDR formatting', () => {
    it('formats a positive IDR amount', () => {
      const result = formatCurrency(50000, 'IDR')
      expect(result).toContain('50.000')
    })

    it('formats zero in IDR', () => {
      const result = formatCurrency(0, 'IDR')
      expect(result).toContain('0')
    })

    it('formats negative IDR amount', () => {
      const result = formatCurrency(-10000, 'IDR')
      expect(result).toContain('10.000')
    })

    it('formats large IDR amount (1000000)', () => {
      const result = formatCurrency(1000000, 'IDR')
      expect(result).toContain('1.000.000')
    })

    it('uses default currency IDR when not specified', () => {
      const withDefault = formatCurrency(5000)
      const withIDR = formatCurrency(5000, 'IDR')
      expect(withDefault).toBe(withIDR)
    })
  })

  describe('USD formatting', () => {
    it('formats a positive USD amount', () => {
      const result = formatCurrency(100, 'USD')
      expect(result).toContain('100.00')
      expect(result).toContain('$')
    })

    it('formats zero in USD', () => {
      const result = formatCurrency(0, 'USD')
      expect(result).toContain('0.00')
    })

    it('formats negative USD amount', () => {
      const result = formatCurrency(-99.99, 'USD')
      expect(result).toContain('99.99')
    })

    it('formats large USD amount (1000000)', () => {
      const result = formatCurrency(1000000, 'USD')
      expect(result).toContain('1,000,000.00')
    })
  })

  describe('EUR formatting', () => {
    it('formats a positive EUR amount', () => {
      const result = formatCurrency(50, 'EUR')
      expect(result).toContain('50')
      expect(result).toContain('€')
    })

    it('formats zero in EUR', () => {
      const result = formatCurrency(0, 'EUR')
      expect(result).toContain('0')
    })

    it('formats large EUR amount (1000000)', () => {
      const result = formatCurrency(1000000, 'EUR')
      expect(result).toContain('1.000.000')
    })
  })

  describe('edge cases', () => {
    it('accepts string amounts', () => {
      const result = formatCurrency('25000', 'IDR')
      expect(result).toContain('25.000')
    })

    it('falls back to IDR locale for unknown currency', () => {
      const result = formatCurrency(100, 'XYZ')
      // Falls back to IDR locale/symbol but retains decimal places since currency !== 'IDR'
      expect(result).toContain('Rp')
    })
  })
})
