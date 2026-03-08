export const CURRENCIES = [
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
]

export function formatCurrency(amount: number | string, currency = 'IDR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const curr = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0]
  return new Intl.NumberFormat(curr.locale, {
    style: 'currency',
    currency: curr.code,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(num)
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
}

export function getCurrencySymbol(currency = 'IDR'): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? 'Rp'
}
