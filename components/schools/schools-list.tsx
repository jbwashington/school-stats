'use client'

import { useEffect, useState } from 'react'
import { useQueryStates } from 'nuqs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { filterParams, type SchoolsFilterState } from '@/components/filters/schools-filter'
import { formatNumber, getConferenceColor, getDivisionColor } from '@/lib/utils'
import { 
  ExternalLink, 
  MapPin, 
  Users, 
  DollarSign, 
  Phone, 
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface School {
  id: number
  name: string
  conference: string
  athletic_division: string
  state: string
  city?: string
  athletic_website?: string
  mascot?: string
  created_at: string
}

interface SchoolsListProps {
  className?: string
}

export function SchoolsList({ className }: SchoolsListProps) {
  const [filters] = useQueryStates(filterParams)
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  // Mock schools data - replace with actual API call
  const mockSchools: School[] = [
    {
      id: 1,
      name: "University of Alabama",
      conference: "SEC",
      athletic_division: "NCAA DI",
      state: "Alabama",
      city: "Tuscaloosa",
      athletic_website: "https://rolltide.com",
      mascot: "Crimson Tide",
      created_at: "2024-01-01T00:00:00Z"
    },
    {
      id: 2,
      name: "Auburn University",
      conference: "SEC",
      athletic_division: "NCAA DI", 
      state: "Alabama",
      city: "Auburn",
      athletic_website: "https://auburntigers.com",
      mascot: "Tigers",
      created_at: "2024-01-02T00:00:00Z"
    },
    {
      id: 3,
      name: "UCLA",
      conference: "Big Ten",
      athletic_division: "NCAA DI",
      state: "California", 
      city: "Los Angeles",
      athletic_website: "https://uclabruins.com",
      mascot: "Bruins",
      created_at: "2024-01-03T00:00:00Z"
    },
    // Add more mock schools as needed
  ]

  const filterSchools = (schools: School[], filters: SchoolsFilterState): School[] => {
    return schools.filter(school => {
      if (filters.search && !school.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.division && filters.division !== 'all' && school.athletic_division !== filters.division) {
        return false
      }
      if (filters.conference && filters.conference !== 'all' && school.conference !== filters.conference) {
        return false
      }
      if (filters.state && filters.state !== 'all' && school.state !== filters.state) {
        return false
      }
      return true
    })
  }

  const paginate = (schools: School[], page: number, limit: number = 12) => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return schools.slice(startIndex, endIndex)
  }

  useEffect(() => {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const filteredSchools = filterSchools(mockSchools, filters)
      const paginatedSchools = paginate(filteredSchools, filters.page)
      
      setSchools(paginatedSchools)
      setTotalResults(filteredSchools.length)
      setTotalPages(Math.ceil(filteredSchools.length / 12))
      setIsLoading(false)
    }, 300)
  }, [filters])

  const handlePageChange = (newPage: number) => {
    // This will be handled by the URL state
    // The parent component should use setFilters to update the page
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (schools.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader className="text-center py-12">
          <CardTitle>No Schools Found</CardTitle>
          <CardDescription>
            No schools match your current filter criteria. Try adjusting your filters or clearing them.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {formatNumber(schools.length)} of {formatNumber(totalResults)} schools
          {filters.page > 1 && ` (Page ${filters.page} of ${totalPages})`}
        </p>
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map((school) => (
          <Card key={school.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg leading-tight">
                    {school.name}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{school.city}, {school.state}</span>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/schools/${school.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* Conference and Division */}
                <div className="flex items-center space-x-2">
                  <Badge className={getConferenceColor(school.conference)}>
                    {school.conference}
                  </Badge>
                  <Badge className={getDivisionColor(school.athletic_division)}>
                    {school.athletic_division}
                  </Badge>
                </div>

                {/* Mascot */}
                {school.mascot && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Mascot:</strong> {school.mascot}
                  </p>
                )}

                {/* Quick Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>View Staff</span>
                  </div>
                  {school.athletic_website && (
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={school.athletic_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1"
                      >
                        <Globe className="h-3 w-3" />
                        <span>Website</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            disabled={filters.page <= 1}
            // onClick={() => handlePageChange(filters.page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + Math.max(1, filters.page - 2)
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === filters.page ? "default" : "outline"}
                  size="sm"
                  // onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button 
            variant="outline" 
            size="sm"
            disabled={filters.page >= totalPages}
            // onClick={() => handlePageChange(filters.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}