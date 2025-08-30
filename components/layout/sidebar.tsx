'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BarChart3,
  Globe,
  Database,
  Trophy,
  Activity,
} from 'lucide-react'

const sidebarItems = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Schools',
    href: '/schools',
    icon: GraduationCap,
    submenu: [
      { title: 'All Schools', href: '/schools' },
      { title: 'By Conference', href: '/schools/conferences' },
      { title: 'By Division', href: '/schools/divisions' },
      { title: 'By State', href: '/schools/states' },
    ]
  },
  {
    title: 'Athletic Staff',
    href: '/staff',
    icon: Users,
    submenu: [
      { title: 'All Staff', href: '/staff' },
      { title: 'Head Coaches', href: '/staff/head-coaches' },
      { title: 'By Sport', href: '/staff/sports' },
      { title: 'Staff Search', href: '/staff/search' },
    ]
  },
  {
    title: 'Program Data',
    href: '/programs',
    icon: Trophy,
    submenu: [
      { title: 'Athletic Metrics', href: '/programs/metrics' },
      { title: 'Financial Data', href: '/programs/finances' },
      { title: 'Enrollment Stats', href: '/programs/enrollment' },
      { title: 'Sports Classifications', href: '/programs/sports' },
    ]
  },
  {
    title: 'School Details',
    href: '/details',
    icon: Database,
    submenu: [
      { title: 'Contact Information', href: '/details/contacts' },
      { title: 'Locations & Maps', href: '/details/locations' },
      { title: 'Institutional Data', href: '/details/institutional' },
      { title: 'Logos & Branding', href: '/details/branding' },
    ]
  },
  {
    title: 'Data Quality',
    href: '/quality',
    icon: BarChart3,
    submenu: [
      { title: 'Quality Overview', href: '/quality' },
      { title: 'Coverage Reports', href: '/quality/coverage' },
      { title: 'Data Completeness', href: '/quality/completeness' },
      { title: 'Validation Issues', href: '/quality/issues' },
    ]
  },
  {
    title: 'Scraping & Admin',
    href: '/admin',
    icon: Globe,
    submenu: [
      { title: 'Scraping Management', href: '/admin/scraping' },
      { title: 'API Keys', href: '/admin/api-keys' },
      { title: 'System Metrics', href: '/admin/metrics' },
      { title: 'Settings', href: '/admin/settings' },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-card border-r border-border h-screen sticky top-0">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <Trophy className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-lg font-bold">School Stats</span>
            <span className="text-xs text-muted-foreground">NCAA Data Platform</span>
          </div>
        </Link>
      </div>
      
      <nav className="px-4 space-y-2">
        {sidebarItems.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href || (item.submenu && item.submenu.some(sub => pathname === sub.href))
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
            
            {item.submenu && (pathname.startsWith(item.href) || pathname === '/') && (
              <div className="ml-6 mt-2 space-y-1">
                {item.submenu.map((subitem) => (
                  <Link
                    key={subitem.href}
                    href={subitem.href}
                    className={cn(
                      "block px-3 py-1 text-xs rounded-md transition-colors",
                      pathname === subitem.href
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {subitem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="text-xs text-muted-foreground bg-accent/20 p-3 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span>Database Status</span>
            <Activity className="h-3 w-3 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Schools:</span>
              <span className="font-mono">1,063</span>
            </div>
            <div className="flex justify-between">
              <span>Coverage:</span>
              <span className="font-mono text-green-600">87%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}