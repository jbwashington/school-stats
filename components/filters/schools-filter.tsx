'use client'

import { useQueryStates } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { X, Filter, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SchoolsFilterProps {
  className?: string
}

// Define the search params schema
const filterParams = {
  search: {
    default: '',
    serialize: (value: string) => value || '',
    parse: (value: string) => value || '',
  },
  division: {
    default: 'all',
    serialize: (value: string) => value || 'all',
    parse: (value: string) => value || 'all',
  },
  conference: {
    default: 'all',
    serialize: (value: string) => value || 'all',
    parse: (value: string) => value || 'all',
  },
  state: {
    default: 'all',
    serialize: (value: string) => value || 'all',
    parse: (value: string) => value || 'all',
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

export function SchoolsFilter({ className }: SchoolsFilterProps) {
  const [filters, setFilters] = useQueryStates(filterParams, {
    shallow: false,
  })

  const clearAllFilters = () => {
    setFilters({
      search: '',
      division: 'all',
      conference: 'all',
      state: 'all',
      page: 1,
    })
  }

  const hasActiveFilters = filters.search || (filters.division !== 'all') || (filters.conference !== 'all') || (filters.state !== 'all')

  const activeFilterCount = [
    filters.search,
    filters.division !== 'all' ? filters.division : null,
    filters.conference !== 'all' ? filters.conference : null,
    filters.state !== 'all' ? filters.state : null
  ].filter(Boolean).length

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost" 
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear all
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
              placeholder="School name..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value || '', page: 1 })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Division Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Division</label>
          <Select 
            value={filters.division || 'all'} 
            onValueChange={(value) => setFilters({ division: value || 'all', page: 1 })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All divisions</SelectItem>
              <SelectItem value="NCAA DI">NCAA Division I</SelectItem>
              <SelectItem value="NCAA DII">NCAA Division II</SelectItem>
              <SelectItem value="NCAA DIII">NCAA Division III</SelectItem>
              <SelectItem value="NAIA">NAIA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conference Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Conference</label>
          <Select 
            value={filters.conference || 'all'} 
            onValueChange={(value) => setFilters({ conference: value || 'all', page: 1 })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All conferences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conferences</SelectItem>
              <SelectItem value="SEC">SEC</SelectItem>
              <SelectItem value="Big Ten">Big Ten</SelectItem>
              <SelectItem value="Big 12">Big 12</SelectItem>
              <SelectItem value="ACC">ACC</SelectItem>
              <SelectItem value="Pac-12">Pac-12</SelectItem>
              <SelectItem value="Big East">Big East</SelectItem>
              <SelectItem value="American">American Athletic</SelectItem>
              <SelectItem value="Mountain West">Mountain West</SelectItem>
              <SelectItem value="Conference USA">Conference USA</SelectItem>
              <SelectItem value="MAC">MAC</SelectItem>
              <SelectItem value="Sun Belt">Sun Belt</SelectItem>
              <SelectItem value="Independent">Independent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* State Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">State</label>
          <Select 
            value={filters.state || 'all'} 
            onValueChange={(value) => setFilters({ state: value || 'all', page: 1 })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="Alabama">Alabama</SelectItem>
              <SelectItem value="California">California</SelectItem>
              <SelectItem value="Florida">Florida</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Illinois">Illinois</SelectItem>
              <SelectItem value="Indiana">Indiana</SelectItem>
              <SelectItem value="Michigan">Michigan</SelectItem>
              <SelectItem value="North Carolina">North Carolina</SelectItem>
              <SelectItem value="Ohio">Ohio</SelectItem>
              <SelectItem value="Pennsylvania">Pennsylvania</SelectItem>
              <SelectItem value="Texas">Texas</SelectItem>
              <SelectItem value="Virginia">Virginia</SelectItem>
              {/* Add more states as needed */}
            </SelectContent>
          </Select>
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
              {filters.division && filters.division !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {filters.division}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => setFilters({ division: 'all' })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.conference && filters.conference !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {filters.conference}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => setFilters({ conference: 'all' })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.state && filters.state !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {filters.state}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => setFilters({ state: 'all' })}
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
export type SchoolsFilterState = {
  search: string
  division: string
  conference: string
  state: string
  page: number
}