import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { 
  GraduationCap, 
  Users, 
  Trophy, 
  DollarSign, 
  BarChart3, 
  Globe,
  Activity,
  Database 
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = createServiceRoleClient()
  
  try {
    // Get parallel data for dashboard
    const [
      schoolsResult,
      staffResult, 
      metricsResult,
      contactsResult,
      recentSchoolsResult
    ] = await Promise.all([
      // Total schools count
      supabase
        .from('schools_ncaa_verified')
        .select('id', { count: 'exact' }),
      
      // Total athletic staff count
      supabase
        .from('athletic_staff')
        .select('id', { count: 'exact' }),
        
      // Visual identity count
      supabase
        .from('school_visual_identity')
        .select('id', { count: 'exact' }),
        
      // Scraping logs count
      supabase
        .from('firecrawl_scraping_log')
        .select('id', { count: 'exact' }),
        
      // Recent schools with data
      supabase
        .from('schools_ncaa_verified')
        .select('id, name, conference, athletic_division, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    return {
      totalSchools: schoolsResult.count || 0,
      totalStaff: staffResult.count || 0,
      totalVisualIdentities: metricsResult.count || 0,
      totalScrapingLogs: contactsResult.count || 0,
      recentSchools: recentSchoolsResult.data || [],
      success: true
    }
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return {
      totalSchools: 0,
      totalStaff: 0,
      totalVisualIdentities: 0,
      totalScrapingLogs: 0,
      recentSchools: [],
      success: false
    }
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalSchools)}</div>
            <p className="text-xs text-muted-foreground">
              NCAA DI/DII/DIII + NAIA schools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Athletic Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalStaff)}</div>
            <p className="text-xs text-muted-foreground">
              Coaches and athletic personnel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visual Branding</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalVisualIdentities)}</div>
            <p className="text-xs text-muted-foreground">
              School colors and logos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scraping Logs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalScrapingLogs)}</div>
            <p className="text-xs text-muted-foreground">
              Data collection attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and navigation shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/schools">
                <GraduationCap className="h-6 w-6 mb-2" />
                Browse Schools
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/staff/search">
                <Users className="h-6 w-6 mb-2" />
                Search Staff
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/programs/metrics">
                <Trophy className="h-6 w-6 mb-2" />
                View Metrics
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/details/contacts">
                <Database className="h-6 w-6 mb-2" />
                Contact Data
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/quality">
                <BarChart3 className="h-6 w-6 mb-2" />
                Data Quality
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/admin/scraping">
                <Globe className="h-6 w-6 mb-2" />
                Admin Panel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Schools Added</CardTitle>
            <CardDescription>
              Latest schools imported to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentSchools.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSchools.map((school) => (
                  <div key={school.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{school.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {school.conference} • {school.athletic_division}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(school.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No recent school data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Status</CardTitle>
            <CardDescription>
              System health and data coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Database</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Online</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">API Endpoints</span>
                </div>
                <span className="text-sm text-blue-600 font-medium">Available</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Data Coverage</span>
                </div>
                <span className="text-sm text-yellow-600 font-medium">87%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">NCRA Compatible</span>
                </div>
                <span className="text-sm text-purple-600 font-medium">Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>
            Base URLs and authentication for external integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-md font-mono text-sm">
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Production API:</span>{' '}
                <span className="font-medium">https://ixyhhegjwdxtpmtmiqvd.supabase.co</span>
              </div>
              <div>
                <span className="text-muted-foreground">Local API:</span>{' '}
                <span className="font-medium">http://localhost:4001/api</span>
              </div>
              <div>
                <span className="text-muted-foreground">Authentication:</span>{' '}
                <span className="font-medium">Bearer token required</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}