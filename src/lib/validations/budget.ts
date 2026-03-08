import { z } from 'zod'

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
  limitAmount: z.coerce.number().positive('Limit must be positive'),
  alertAt: z.coerce.number().min(1).max(100).default(80),
})

export type BudgetInput = z.infer<typeof budgetSchema>
