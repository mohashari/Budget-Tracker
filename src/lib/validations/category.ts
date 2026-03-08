import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  icon: z.string().default('circle'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color hex').default('#6366f1'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  parentId: z.string().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
