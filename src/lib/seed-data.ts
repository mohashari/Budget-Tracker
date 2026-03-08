import { TransactionType } from '@prisma/client'

export const DEFAULT_CATEGORIES = [
  // EXPENSE
  { name: 'Makan & Minum', icon: 'utensils', color: '#ef4444', type: TransactionType.EXPENSE },
  { name: 'Transportasi', icon: 'car', color: '#f97316', type: TransactionType.EXPENSE },
  { name: 'Tempat Tinggal', icon: 'home', color: '#84cc16', type: TransactionType.EXPENSE },
  { name: 'Tagihan & Utilitas', icon: 'zap', color: '#eab308', type: TransactionType.EXPENSE },
  { name: 'Belanja', icon: 'shopping-cart', color: '#06b6d4', type: TransactionType.EXPENSE },
  { name: 'Hiburan', icon: 'gamepad-2', color: '#8b5cf6', type: TransactionType.EXPENSE },
  { name: 'Kesehatan', icon: 'heart-pulse', color: '#ec4899', type: TransactionType.EXPENSE },
  { name: 'Pendidikan', icon: 'book-open', color: '#3b82f6', type: TransactionType.EXPENSE },
  { name: 'Pakaian', icon: 'shirt', color: '#f59e0b', type: TransactionType.EXPENSE },
  { name: 'Perjalanan', icon: 'plane', color: '#10b981', type: TransactionType.EXPENSE },
  { name: 'Bisnis', icon: 'briefcase', color: '#6366f1', type: TransactionType.EXPENSE },
  { name: 'Hadiah & Donasi', icon: 'gift', color: '#14b8a6', type: TransactionType.EXPENSE },
  { name: 'Lainnya', icon: 'circle', color: '#6b7280', type: TransactionType.EXPENSE },
  // INCOME
  { name: 'Gaji', icon: 'wallet', color: '#22c55e', type: TransactionType.INCOME },
  { name: 'Investasi', icon: 'trending-up', color: '#16a34a', type: TransactionType.INCOME },
  { name: 'Bisnis Sampingan', icon: 'building', color: '#15803d', type: TransactionType.INCOME },
  { name: 'Bonus & THR', icon: 'star', color: '#4ade80', type: TransactionType.INCOME },
  { name: 'Pendapatan Lain', icon: 'plus-circle', color: '#86efac', type: TransactionType.INCOME },
  // TRANSFER
  { name: 'Transfer', icon: 'arrows-right-left', color: '#94a3b8', type: TransactionType.TRANSFER },
]
