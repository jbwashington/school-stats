'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber, getConferenceColor, getDivisionColor } from '@/lib/utils'
import { Search, Filter, Mail, Phone, User, Trophy, MapPin, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface SearchFilters {
  query: string
  sport: string
  title: string
  conference: string
  division: string
  state: string
  hasEmail: boolean
  hasPhone: boolean
}

interface StaffResult {
  id: number
  name: string
  title?: string
  sport?: string
  email?: string
  phone?: string
  photo_url?: string
  confidence_score?: number
  school_name?: string
  school_conference?: string
  school_division?: string
  school_state?: string
  ncaa_school_id?: number
}

const initialFilters: SearchFilters = {
  query: '',
  sport: '',
  title: '',
  conference: '',
  division: '',
  state: '',
  hasEmail: false,
  hasPhone: false,
}

export default function StaffSearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [results, setResults] = useState<StaffResult[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)

  const performSearch = async (searchFilters: SearchFilters) => {
    setLoading(true)
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (searchFilters.query) params.append('query', searchFilters.query)
      if (searchFilters.sport) params.append('sport', searchFilters.sport)
      if (searchFilters.title) params.append('title', searchFilters.title)
      if (searchFilters.conference) params.append('conference', searchFilters.conference)
      if (searchFilters.division) params.append('division', searchFilters.division)
      if (searchFilters.state) params.append('state', searchFilters.state)
      if (searchFilters.hasEmail) params.append('has_email', 'true')
      if (searchFilters.hasPhone) params.append('has_phone', 'true')

      const response = await fetch(`/api/staff/search?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      setResults(data.staff || [])
      setTotalResults(data.total || 0)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const handleSearch = () => {
    performSearch(filters)
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setResults([])
    setTotalResults(0)
  }

  // Sample data for demo (since we don't have real data yet)
  useEffect(() => {
    if (filters.query || filters.sport || filters.title) {
      // Simulate search results
      const mockResults: StaffResult[] = [
        {
          id: 1,
          name: 'John Smith',
          title: 'Head Coach',
          sport: 'Football',
          email: 'jsmith@university.edu',
          phone: '555-0123',
          confidence_score: 0.95,
          school_name: 'University of Alabama',
          school_conference: 'SEC',
          school_division: 'NCAA DI',
          school_state: 'Alabama',
          ncaa_school_id: 8,
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          title: 'Assistant Coach',
          sport: 'Basketball',
          email: 'sjohnson@college.edu',
          confidence_score: 0.88,
          school_name: 'Duke University',
          school_conference: 'ACC',
          school_division: 'NCAA DI',
          school_state: 'North Carolina',
          ncaa_school_id: 15,
        },
      ]
      
      setResults(mockResults)
      setTotalResults(mockResults.length)
    }
  }, [filters])

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-6 w-6" />
            <span>Athletic Staff Search</span>
          </CardTitle>
          <CardDescription>
            Search for coaches and athletic personnel across all institutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, title, or sport..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sport</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.sport}
                onChange={(e) => handleFilterChange('sport', e.target.value)}
              >
                <option value="">All Sports</option>
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Baseball">Baseball</option>
                <option value="Soccer">Soccer</option>
                <option value="Track and Field">Track and Field</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.title}
                onChange={(e) => handleFilterChange('title', e.target.value)}
              >
                <option value="">All Titles</option>
                <option value="Head Coach">Head Coach</option>
                <option value="Assistant Coach">Assistant Coach</option>
                <option value="Associate Coach">Associate Coach</option>
                <option value="Athletic Director">Athletic Director</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Conference</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.conference}
                onChange={(e) => handleFilterChange('conference', e.target.value)}
              >
                <option value="">All Conferences</option>
                <option value="SEC">SEC</option>
                <option value="Big Ten">Big Ten</option>
                <option value="ACC">ACC</option>
                <option value="Big 12">Big 12</option>
                <option value="Pac-12">Pac-12</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Division</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.division}
                onChange={(e) => handleFilterChange('division', e.target.value)}
              >
                <option value="">All Divisions</option>
                <option value="NCAA DI">NCAA DI</option>
                <option value="NCAA DII">NCAA DII</option>
                <option value="NCAA DIII">NCAA DIII</option>
                <option value="NAIA">NAIA</option>
              </select>
            </div>
          </div>

          {/* Contact Filters */}
          <div className="flex space-x-4 pt-2 border-t">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.hasEmail}
                onChange={(e) => handleFilterChange('hasEmail', e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Has Email</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.hasPhone}
                onChange={(e) => handleFilterChange('hasPhone', e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Has Phone</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {(results.length > 0 || loading) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {loading ? 'Searching...' : `Found ${formatNumber(totalResults)} results`}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>
                  {Object.entries(filters).filter(([key, value]) => 
                    key !== 'query' && ((typeof value === 'string' && value) || (typeof value === 'boolean' && value))
                  ).length} filters active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((staff) => (
            <Card key={staff.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-3">
                  {staff.photo_url ? (
                    <Image
                      src={staff.photo_url}
                      alt={staff.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-1">{staff.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {staff.title}
                      {staff.sport && staff.sport !== 'General Athletics' && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          <Trophy className="h-3 w-3 inline mr-1" />
                          {staff.sport}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* School Information */}
                {staff.school_name && (
                  <div className="space-y-1">
                    <Link 
                      href={`/schools/${staff.ncaa_school_id}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {staff.school_name}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      {staff.school_division && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDivisionColor(staff.school_division)}`}>
                          {staff.school_division}
                        </span>
                      )}
                      {staff.school_conference && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConferenceColor(staff.school_conference)}`}>
                          {staff.school_conference}
                        </span>
                      )}
                    </div>
                    {staff.school_state && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {staff.school_state}
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-2">
                  {staff.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <Link 
                        href={`mailto:${staff.email}`}
                        className="text-primary hover:underline truncate"
                      >
                        {staff.email}
                      </Link>
                    </div>
                  )}
                  
                  {staff.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <Link 
                        href={`tel:${staff.phone}`}
                        className="text-primary hover:underline"
                      >
                        {staff.phone}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Data Quality Indicator */}
                {staff.confidence_score && (
                  <div className="text-xs text-muted-foreground">
                    Confidence: {Math.round(staff.confidence_score * 100)}%
                  </div>
                )}

                {/* Action */}
                <div className="pt-2 border-t">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/staff/${staff.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && (filters.query || filters.sport || filters.title) && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No Results Found</CardTitle>
            <CardDescription className="mb-4">
              Try adjusting your search criteria or filters
            </CardDescription>
            <Button onClick={clearFilters} variant="outline">
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!loading && results.length === 0 && !filters.query && !filters.sport && !filters.title && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Search Athletic Staff</CardTitle>
            <CardDescription className="mb-4">
              Use the search and filters above to find coaches and athletic personnel
            </CardDescription>
            <div className="flex justify-center space-x-2">
              <Button onClick={() => handleFilterChange('title', 'Head Coach')}>
                Find Head Coaches
              </Button>
              <Button variant="outline" onClick={() => handleFilterChange('sport', 'Football')}>
                Football Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}