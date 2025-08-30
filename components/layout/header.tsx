'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { GlobalSearch } from '@/components/search/global-search'
import { Bell, User, RefreshCw } from 'lucide-react'

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/': 'Dashboard Overview',
    '/schools': 'Schools Directory',
    '/schools/conferences': 'Schools by Conference',
    '/schools/divisions': 'Schools by Division',
    '/schools/states': 'Schools by State',
    '/staff': 'Athletic Staff Directory',
    '/staff/head-coaches': 'Head Coaches',
    '/staff/sports': 'Staff by Sport',
    '/staff/search': 'Staff Search',
    '/programs': 'Athletic Programs',
    '/programs/metrics': 'Athletic Metrics',
    '/programs/finances': 'Financial Data',
    '/programs/enrollment': 'Enrollment Statistics',
    '/programs/sports': 'Sports Classifications',
    '/details': 'School Details',
    '/details/contacts': 'Contact Information',
    '/details/locations': 'Locations & Maps',
    '/details/institutional': 'Institutional Data',
    '/details/branding': 'Logos & Branding',
    '/quality': 'Data Quality Overview',
    '/quality/coverage': 'Coverage Reports',
    '/quality/completeness': 'Data Completeness',
    '/quality/issues': 'Validation Issues',
    '/admin': 'Administration',
    '/admin/scraping': 'Scraping Management',
    '/admin/api-keys': 'API Key Management',
    '/admin/metrics': 'System Metrics',
    '/admin/settings': 'Settings',
  }
  
  return routes[pathname] || 'School Stats Platform'
}

const getPageDescription = (pathname: string): string => {
  const descriptions: Record<string, string> = {
    '/': 'Comprehensive overview of your NCAA athletic data platform',
    '/schools': 'Browse and manage all NCAA schools in the database',
    '/staff': 'Athletic staff directory across all institutions',
    '/programs': 'Athletic program data and performance metrics',
    '/details': 'Detailed institutional information and contacts',
    '/quality': 'Monitor data quality and coverage metrics',
    '/admin': 'System administration and management tools',
  }
  
  // Find the best matching description
  const exactMatch = descriptions[pathname]
  if (exactMatch) return exactMatch
  
  // Find parent route description
  const parentRoute = Object.keys(descriptions).find(route => 
    route !== '/' && pathname.startsWith(route)
  )
  
  return parentRoute ? descriptions[parentRoute] : 'NCAA athletic program data and analytics'
}

export function Header() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const description = getPageDescription(pathname)

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <GlobalSearch className="w-64" />
          
          {/* Quick Actions */}
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}