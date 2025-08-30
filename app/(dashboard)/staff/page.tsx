import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getConferenceColor, getDivisionColor } from '@/lib/utils'
import { Mail, Phone, User, Trophy, MapPin } from 'lucide-react'
import Link from 'next/link'

interface StaffMember {
  id: number
  name: string
  title: string | null
  sport: string | null
  email: string | null
  phone: string | null
  bio: string | null
  scraping_method: string | null
  confidence_score: number | null
  ncaa_school_id: number | null
  school_name?: string
  school_conference?: string
  school_division?: string
  school_state?: string
  created_at: string
}

async function getAthleticStaff(): Promise<StaffMember[]> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data: staff, error } = await supabase
      .from('athletic_staff')
      .select(`
        id,
        name,
        title,
        sport,
        email,
        phone,
        bio,
        scraping_method,
        confidence_score,
        ncaa_school_id,
        schools_ncaa_verified!inner (
          name,
          conference,
          athletic_division,
          state
        ),
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50) // Limit for performance

    if (error) {
      console.error('Error fetching staff:', error)
      return []
    }

    // Transform the data to flatten the school information
    return staff?.map(member => ({
      ...member,
      school_name: member.schools_ncaa_verified?.name,
      school_conference: member.schools_ncaa_verified?.conference,
      school_division: member.schools_ncaa_verified?.athletic_division,
      school_state: member.schools_ncaa_verified?.state,
    })) || []
  } catch (error) {
    console.error('Staff fetch error:', error)
    return []
  }
}

export default async function StaffPage() {
  const staff = await getAthleticStaff()

  // Group staff by title type for better organization
  const headCoaches = staff.filter(member => member.title?.toLowerCase().includes('head coach'))
  const assistantCoaches = staff.filter(member => member.title?.toLowerCase().includes('assistant') || member.title?.toLowerCase().includes('associate'))
  const otherStaff = staff.filter(member => 
    !member.title?.toLowerCase().includes('head coach') && 
    !member.title?.toLowerCase().includes('assistant') && 
    !member.title?.toLowerCase().includes('associate')
  )

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-sm text-muted-foreground">Total Staff Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{headCoaches.length}</div>
            <p className="text-sm text-muted-foreground">Head Coaches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {staff.filter(s => s.email).length}
            </div>
            <p className="text-sm text-muted-foreground">With Email</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(staff.map(s => s.sport)).size}
            </div>
            <p className="text-sm text-muted-foreground">Sports Covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Sections */}
      {headCoaches.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Head Coaches ({headCoaches.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {headCoaches.slice(0, 6).map((member) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>
          {headCoaches.length > 6 && (
            <div className="text-center mt-4">
              <Button asChild variant="outline">
                <Link href="/staff/head-coaches">
                  View All {headCoaches.length} Head Coaches
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {assistantCoaches.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Assistant & Associate Coaches ({assistantCoaches.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assistantCoaches.slice(0, 6).map((member) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>
          {assistantCoaches.length > 6 && (
            <div className="text-center mt-4">
              <Button asChild variant="outline">
                <Link href="/staff?filter=assistant">
                  View All {assistantCoaches.length} Assistant Coaches
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {otherStaff.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Other Athletic Staff ({otherStaff.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherStaff.slice(0, 6).map((member) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {staff.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No Staff Data Available</CardTitle>
            <CardDescription>
              Athletic staff data is currently being collected. Check back later for updates.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link href="/admin/scraping">
                Manage Data Collection
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {staff.length === 50 && (
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Staff
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Showing first 50 staff members. Use search to find specific personnel.
          </p>
        </div>
      )}
    </div>
  )
}

// Staff Card Component
function StaffCard({ member }: { member: StaffMember }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">{member.name}</CardTitle>
            <CardDescription className="text-sm">
              {member.title}
              {member.sport && member.sport !== 'General Athletics' && (
                <span className="block text-xs text-muted-foreground mt-1">
                  <Trophy className="h-3 w-3 inline mr-1" />
                  {member.sport}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* School Information */}
        {member.school_name && (
          <div className="space-y-1">
            <Link 
              href={`/schools/${member.ncaa_school_id}`}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {member.school_name}
            </Link>
            <div className="flex flex-wrap gap-1">
              {member.school_division && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDivisionColor(member.school_division)}`}>
                  {member.school_division}
                </span>
              )}
              {member.school_conference && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConferenceColor(member.school_conference)}`}>
                  {member.school_conference}
                </span>
              )}
            </div>
            {member.school_state && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                {member.school_state}
              </div>
            )}
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-2">
          {member.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
              <Link 
                href={`mailto:${member.email}`}
                className="text-primary hover:underline truncate"
              >
                {member.email}
              </Link>
            </div>
          )}
          
          {member.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
              <Link 
                href={`tel:${member.phone}`}
                className="text-primary hover:underline"
              >
                {member.phone}
              </Link>
            </div>
          )}
        </div>

        {/* Bio Preview */}
        {member.bio && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {member.bio}
          </div>
        )}

        {/* Data Quality Indicator */}
        {member.confidence_score && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Confidence: {Math.round(member.confidence_score * 100)}%
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              member.scraping_method === 'firecrawl' 
                ? 'bg-green-100 text-green-700'
                : member.scraping_method === 'puppeteer'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {member.scraping_method}
            </span>
          </div>
        )}

        {/* Action */}
        <div className="pt-2 border-t">
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href={`/staff/${member.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}