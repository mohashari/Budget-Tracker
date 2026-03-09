import { transactionSchema } from '@/lib/validations/transaction'
import { budgetSchema } from '@/lib/validations/budget'
import { categorySchema } from '@/lib/validations/category'

describe('transactionSchema', () => {
  const validTransaction = {
    type: 'EXPENSE' as const,
    amount: 50000,
    currency: 'IDR',
    description: 'Lunch',
    date: '2026-03-09',
    tags: [],
  }

  it('passes with valid data', () => {
    const result = transactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it('passes with optional fields', () => {
    const result = transactionSchema.safeParse({
      ...validTransaction,
      notes: 'some notes',
      categoryId: 'cat-123',
      tags: ['food', 'lunch'],
    })
    expect(result.success).toBe(true)
  })

  it('fails when amount is zero', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('fails when amount is negative', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: -100 })
    expect(result.success).toBe(false)
  })

  it('fails when amount is missing', () => {
    const { amount, ...withoutAmount } = validTransaction
    const result = transactionSchema.safeParse(withoutAmount)
    expect(result.success).toBe(false)
  })

  it('fails when description is empty', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, description: '' })
    expect(result.success).toBe(false)
  })

  it('fails when description is missing', () => {
    const { description, ...withoutDescription } = validTransaction
    const result = transactionSchema.safeParse(withoutDescription)
    expect(result.success).toBe(false)
  })

  it('fails with invalid date format', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, date: '09-03-2026' })
    expect(result.success).toBe(false)
  })

  it('fails with invalid transaction type', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, type: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('passes with INCOME type', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, type: 'INCOME' })
    expect(result.success).toBe(true)
  })

  it('passes with TRANSFER type', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, type: 'TRANSFER' })
    expect(result.success).toBe(true)
  })

  it('defaults currency to IDR when not provided', () => {
    const { currency, ...withoutCurrency } = validTransaction
    const result = transactionSchema.safeParse(withoutCurrency)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('IDR')
    }
  })
})

describe('budgetSchema', () => {
  const validBudget = {
    categoryId: 'cat-123',
    month: '2026-03',
    limitAmount: 1000000,
    alertAt: 80,
  }

  it('passes with valid data', () => {
    const result = budgetSchema.safeParse(validBudget)
    expect(result.success).toBe(true)
  })

  it('passes without alertAt (uses default)', () => {
    const { alertAt, ...withoutAlertAt } = validBudget
    const result = budgetSchema.safeParse(withoutAlertAt)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.alertAt).toBe(80)
    }
  })

  it('fails when limitAmount is negative', () => {
    const result = budgetSchema.safeParse({ ...validBudget, limitAmount: -5000 })
    expect(result.success).toBe(false)
  })

  it('fails when limitAmount is zero', () => {
    const result = budgetSchema.safeParse({ ...validBudget, limitAmount: 0 })
    expect(result.success).toBe(false)
  })

  it('fails when categoryId is empty', () => {
    const result = budgetSchema.safeParse({ ...validBudget, categoryId: '' })
    expect(result.success).toBe(false)
  })

  it('fails when month format is invalid', () => {
    const result = budgetSchema.safeParse({ ...validBudget, month: '2026/03' })
    expect(result.success).toBe(false)
  })

  it('fails when month is missing', () => {
    const { month, ...withoutMonth } = validBudget
    const result = budgetSchema.safeParse(withoutMonth)
    expect(result.success).toBe(false)
  })

  it('fails when alertAt exceeds 100', () => {
    const result = budgetSchema.safeParse({ ...validBudget, alertAt: 101 })
    expect(result.success).toBe(false)
  })
})

describe('categorySchema', () => {
  const validCategory = {
    name: 'Makanan',
    icon: 'utensils',
    color: '#6366f1',
    type: 'EXPENSE' as const,
  }

  it('passes with valid data', () => {
    const result = categorySchema.safeParse(validCategory)
    expect(result.success).toBe(true)
  })

  it('passes with optional parentId', () => {
    const result = categorySchema.safeParse({ ...validCategory, parentId: 'parent-123' })
    expect(result.success).toBe(true)
  })

  it('fails when name is empty', () => {
    const result = categorySchema.safeParse({ ...validCategory, name: '' })
    expect(result.success).toBe(false)
  })

  it('fails when name is missing', () => {
    const { name, ...withoutName } = validCategory
    const result = categorySchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it('fails when type is invalid', () => {
    const result = categorySchema.safeParse({ ...validCategory, type: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('fails when type is missing', () => {
    const { type, ...withoutType } = validCategory
    const result = categorySchema.safeParse(withoutType)
    expect(result.success).toBe(false)
  })

  it('fails with invalid color hex', () => {
    const result = categorySchema.safeParse({ ...validCategory, color: 'not-a-color' })
    expect(result.success).toBe(false)
  })

  it('defaults icon to circle when not provided', () => {
    const { icon, ...withoutIcon } = validCategory
    const result = categorySchema.safeParse(withoutIcon)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.icon).toBe('circle')
    }
  })

  it('passes with INCOME type', () => {
    const result = categorySchema.safeParse({ ...validCategory, type: 'INCOME' })
    expect(result.success).toBe(true)
  })
})
