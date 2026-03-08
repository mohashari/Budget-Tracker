'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ArrowLeftRight, Target, BarChart3,
  Tags, Settings, Wallet, ChevronLeft, ChevronRight,
  RefreshCw, FileText, Upload
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { href: '/budget', icon: Target, label: 'Budget' },
  { href: '/analytics', icon: BarChart3, label: 'Analitik' },
  { href: '/recurring', icon: RefreshCw, label: 'Berulang' },
  { href: '/categories', icon: Tags, label: 'Kategori' },
  { href: '/settings', icon: Settings, label: 'Pengaturan' },
]

const secondaryItems = [
  { href: '/analytics/reports', icon: FileText, label: 'Laporan' },
  { href: '/transactions/import', icon: Upload, label: 'Import CSV' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      collapsed ? 'w-16' : 'w-56'
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-gray-900 dark:text-white">BudgetTracker</span>
          </div>
        )}
        {collapsed && <Wallet className="h-6 w-6 text-indigo-600 mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ml-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/analytics' && pathname.startsWith(item.href + '/') && !pathname.startsWith('/analytics/reports') && !pathname.startsWith('/transactions/import'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
        {!collapsed && <p className="px-3 pt-3 pb-1 text-xs text-gray-400 uppercase tracking-wider font-medium">Tools</p>}
        {collapsed && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
        {secondaryItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
