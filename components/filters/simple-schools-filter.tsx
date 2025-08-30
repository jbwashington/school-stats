'use client'

import { useQueryStates } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { X, Filter, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleSchoolsFilterProps {
  className?: string
}

// Simplified search params schema
const filterParams = {
  search: {
    default: '',
    serialize: (value: string) => value || '',
    parse: (value: string) => value || '',
  },
  page: {
    default: 1,
    serialize: (value: number) => String(value),
    parse: (value: string) => {
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? 1 : parsed
    },
  },
}

export function SimpleSchoolsFilter({ className }: SimpleSchoolsFilterProps) {
  const [filters, setFilters] = useQueryStates(filterParams, {
    shallow: false,
  })

  const clearAllFilters = () => {
    setFilters({
      search: '',
      page: 1,
    })
  }

  const hasActiveFilters = filters.search

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Search Schools</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost" 
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Schools</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter school name..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value || '', page: 1 })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium">Active Filters:</div>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="outline" className="text-xs">
                  Search: {filters.search}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => setFilters({ search: '' })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { filterParams }
export type SimpleSchoolsFilterState = {
  search: string
  page: number
}