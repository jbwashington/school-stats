'use client'

import { useEffect, useState, Suspense } from 'react'
import { useQueryState } from 'nuqs'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlobalSearch } from '@/components/search/global-search'
import { formatNumber } from '@/lib/utils'
import { 
  GraduationCap, 
  Users, 
  Search as SearchIcon,
  ExternalLink,
  MapPin,
  Mail 
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SearchResult {
  id: string
  type: 'school' | 'staff'
  title: string
  description: string
  details?: Record<string, string | number | boolean>
  url: string
}

function SearchPageContent() {
  const [query] = useQueryState('q', { defaultValue: '' })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)

  // Mock search function - replace with actual API call
  const performSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return []
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Mock data - replace with actual search API
    const schoolResult: SearchResult = {
      id: '1',
      type: 'school',
      title: 'University of Alabama',
      description: 'NCAA DI • SEC Conference • Tuscaloosa, AL',
      details: {
        conference: 'SEC',
        division: 'NCAA DI',
        location: 'Tuscaloosa, AL',
        enrollment: 38563
      },
      url: '/schools/1'
    }

    const staffResult: SearchResult = {
      id: '2',
      type: 'staff',
      title: 'Nick Saban',
      description: 'Head Coach • Football • University of Alabama',
      details: {
        title: 'Head Coach',
        sport: 'Football',
        school: 'University of Alabama',
        email: 'nsaban@athletics.ua.edu'
      },
      url: '/staff/2'
    }

    const mockResults: SearchResult[] = [schoolResult, staffResult]
      .filter(result => 
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase())
      )

    return mockResults
  }

  useEffect(() => {
    if (query) {
      setIsLoading(true)
      performSearch(query).then(searchResults => {
        setResults(searchResults)
        setTotalResults(searchResults.length)
        setIsLoading(false)
      })
    } else {
      setResults([])
      setTotalResults(0)
      setIsLoading(false)
    }
  }, [query])

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'school':
        return <GraduationCap className="h-4 w-4" />
      case 'staff':
        return <Users className="h-4 w-4" />
      default:
        return <SearchIcon className="h-4 w-4" />
    }
  }

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case 'school':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Search Results</h1>
            {query && (
              <p className="text-muted-foreground">
                {isLoading ? 'Searching...' : `${formatNumber(totalResults)} results for &quot;${query}&quot;`}
              </p>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        <GlobalSearch className="max-w-2xl" />
      </div>

      {/* Results */}
      {!query ? (
        <Card>
          <CardHeader className="text-center py-12">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Search the NCAA Database</CardTitle>
            <CardDescription>
              Search for schools, athletic staff, conferences, and more across our comprehensive NCAA database.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardHeader className="text-center py-12">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Searching...</span>
            </div>
          </CardHeader>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Results Found</CardTitle>
            <CardDescription>
              No results found for &quot;{query}&quot;. Try adjusting your search terms or browse our directory.
            </CardDescription>
            <div className="flex justify-center space-x-2 mt-4">
              <Button variant="outline" asChild>
                <Link href="/schools">Browse Schools</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/staff">Browse Staff</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      {getResultIcon(result.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <CardTitle className="text-lg">{result.title}</CardTitle>
                        <Badge className={getResultBadgeColor(result.type)}>
                          {result.type === 'school' ? 'School' : 'Staff'}
                        </Badge>
                      </div>
                      <CardDescription>{result.description}</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={result.url} className="flex items-center space-x-1">
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              
              {result.details && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {result.type === 'school' && (
                      <>
                        {result.details.conference && (
                          <div>
                            <span className="text-muted-foreground">Conference:</span>
                            <div className="font-medium">{result.details.conference}</div>
                          </div>
                        )}
                        {result.details.division && (
                          <div>
                            <span className="text-muted-foreground">Division:</span>
                            <div className="font-medium">{result.details.division}</div>
                          </div>
                        )}
                        {result.details.location && (
                          <div>
                            <span className="text-muted-foreground">Location:</span>
                            <div className="font-medium flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {result.details.location}
                            </div>
                          </div>
                        )}
                        {result.details.enrollment && typeof result.details.enrollment === 'number' && (
                          <div>
                            <span className="text-muted-foreground">Enrollment:</span>
                            <div className="font-medium">{formatNumber(result.details.enrollment)}</div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {result.type === 'staff' && (
                      <>
                        {result.details.title && (
                          <div>
                            <span className="text-muted-foreground">Position:</span>
                            <div className="font-medium">{result.details.title}</div>
                          </div>
                        )}
                        {result.details.sport && (
                          <div>
                            <span className="text-muted-foreground">Sport:</span>
                            <div className="font-medium">{result.details.sport}</div>
                          </div>
                        )}
                        {result.details.school && (
                          <div>
                            <span className="text-muted-foreground">School:</span>
                            <div className="font-medium">{result.details.school}</div>
                          </div>
                        )}
                        {result.details.email && (
                          <div>
                            <span className="text-muted-foreground">Contact:</span>
                            <div className="font-medium flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {result.details.email}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  )
}