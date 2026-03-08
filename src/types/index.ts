import type { User, Workspace, Category, Transaction, Budget, RecurringRule, Report } from '@prisma/client'

export type { User, Workspace, Category, Transaction, Budget, RecurringRule, Report }

export type TransactionWithCategory = Transaction & {
  category: Category | null
  user: Pick<User, 'id' | 'name'>
}

export type CategoryWithStats = Category & {
  _count: { transactions: number }
}

export type BudgetWithCategory = Budget & {
  category: Category
  spent: number
  utilization: number
}

export type WorkspaceWithRole = Workspace & {
  role: 'OWNER' | 'MEMBER' | 'VIEWER'
}

export type AnalyticsSummary = {
  income: number
  expense: number
  balance: number
  savingsRate: number
  transactionCount: number
}

export type CategoryBreakdown = {
  categoryId: string
  name: string
  color: string
  icon: string
  total: number
  percentage: number
  count: number
}

export type TrendPoint = {
  month: string
  income: number
  expense: number
  balance: number
}

export type BudgetVsActual = {
  id: string
  categoryId: string
  name: string
  color: string
  icon: string
  limitAmount: number
  spent: number
  remaining: number
  utilization: number
  alertAt: number
}

export type ApiResponse<T> = {
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
