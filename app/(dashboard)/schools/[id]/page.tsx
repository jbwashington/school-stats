import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Database } from '@/lib/supabase/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getConferenceColor, getDivisionColor } from '@/lib/utils'
import { 
  MapPin, 
  Users, 
  Globe, 
  Trophy
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'


type SchoolRow = Database['public']['Tables']['schools_ncaa_verified']['Row']
type VisualIdentityRow = Database['public']['Tables']['school_visual_identity']['Row']

async function getSchoolDetail(id: string): Promise<{
  school: SchoolRow | null
  visualIdentity: VisualIdentityRow | null  
  staffCount: number
}> {
  const supabase = createServiceRoleClient()
  
  try {
    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from('schools_ncaa_verified')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (schoolError || !school) {
      return { school: null, visualIdentity: null, staffCount: 0 }
    }

    // Get visual identity information
    const { data: visualIdentity } = await supabase
      .from('school_visual_identity')
      .select('*')
      .eq('ncaa_school_id', parseInt(id))
      .single()

    // Get staff count for this school
    const { count: staffCount } = await supabase
      .from('athletic_staff')
      .select('id', { count: 'exact' })
      .eq('ncaa_school_id', parseInt(id))

    return {
      school,
      visualIdentity: visualIdentity || null,
      staffCount: staffCount || 0
    }
  } catch (error) {
    console.error('Error fetching school detail:', error)
    return { school: null, visualIdentity: null, staffCount: 0 }
  }
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { school } = await getSchoolDetail(id)

  if (!school) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {school.logo_url && (
                  <Image
                    src={school.logo_url}
                    alt={`${school.name} logo`}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                )}
                <div>
                  <CardTitle className="text-3xl">{school.name}</CardTitle>
                  <CardDescription className="text-lg">
                    {school.mascot && `${school.mascot} • `}
                    {school.city && school.state && `${school.city}, ${school.state}`}
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {school.athletic_division && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDivisionColor(school.athletic_division)}`}>
                    {school.athletic_division}
                  </span>
                )}
                {school.conference && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConferenceColor(school.conference)}`}>
                    {school.conference}
                  </span>
                )}
                {/* Religious affiliation not available in current schema */}
              </div>
            </div>
            
            <div className="flex gap-2">
              {school.athletic_website && (
                <Button asChild size="sm">
                  <Link href={school.athletic_website} target="_blank">
                    <Trophy className="h-4 w-4 mr-2" />
                    Athletics Site
                  </Link>
                </Button>
              )}
              {school.academic_website && (
                <Button asChild size="sm" variant="outline">
                  <Link href={school.academic_website} target="_blank">
                    <Globe className="h-4 w-4 mr-2" />
                    Academic Site
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Academic Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Academic Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Enrollment data not available in current schema */}
              
              {/* Student-faculty ratio not available in current schema */}
              
              {/* Acceptance rate not available in current schema */}
              
              {/* Graduation rate not available in current schema */}
              
              {/* Founded year not available in current schema */}
              
              {/* Campus size not available in current schema */}
            </CardContent>
          </Card>

          {/* Tuition & Costs not available in current schema */}

          {/* Athletic Financial Data not available in current schema */}
        </div>

        {/* Right Column - Contact & Location */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone information not available in current schema */}
              
              {/* Athletics phone not available in current schema */}
              
              {/* Main email not available in current schema */}
              
              {/* Athletics email not available in current schema */}
              
              {(school.city || school.state || school.full_location) && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {school.full_location ? (
                      <div>{school.full_location}</div>
                    ) : (
                      school.city && school.state && (
                        <div>{school.city}, {school.state}</div>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {school.school_type && (
                <div>
                  <span className="font-medium">School Type:</span>
                  <div className="text-muted-foreground">{school.school_type}</div>
                </div>
              )}
              
              {school.school_level && (
                <div>
                  <span className="font-medium">School Level:</span>
                  <div className="text-muted-foreground">{school.school_level}</div>
                </div>
              )}
              
              {school.subdivision_level && (
                <div>
                  <span className="font-medium">Subdivision:</span>
                  <div className="text-muted-foreground">{school.subdivision_level}</div>
                </div>
              )}
              
              {school.verification_status && (
                <div>
                  <span className="font-medium">Verification Status:</span>
                  <div className="text-muted-foreground">{school.verification_status}</div>
                </div>
              )}
              
              {(school.latitude && school.longitude) && (
                <div>
                  <span className="font-medium">Coordinates:</span>
                  <div className="text-muted-foreground">
                    {school.latitude?.toFixed(4)}, {school.longitude?.toFixed(4)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/schools/${school.id}/staff`}>
                  <Users className="h-4 w-4 mr-2" />
                  View Athletic Staff
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/programs/metrics?school=${school.id}`}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Athletic Metrics
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/api/schools/${school.id}`} target="_blank">
                  <Globe className="h-4 w-4 mr-2" />
                  API Data
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}