import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Database } from '@/lib/supabase/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber, formatCurrency, getConferenceColor, getDivisionColor } from '@/lib/utils'
import { 
  ExternalLink, 
  MapPin, 
  Users, 
  Phone, 
  Mail, 
  Globe, 
  Building, 
  DollarSign,
  Calendar,
  BookOpen,
  Trophy
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface SchoolDetail {
  id: number
  name: string
  athletic_division?: string
  conference?: string
  state?: string
  city?: string
  athletic_website?: string
  website?: string
  phone?: string
  address?: string
  zip_code?: string
  county?: string
  latitude?: number
  longitude?: number
  total_enrollment?: number
  undergraduate_enrollment?: number
  graduate_enrollment?: number
  student_faculty_ratio?: number
  acceptance_rate?: number
  graduation_rate?: number
  retention_rate?: number
  in_state_tuition?: number
  out_of_state_tuition?: number
  room_and_board?: number
  founded_year?: number
  carnegie_classification?: string
  religious_affiliation?: string
  campus_setting?: string
  campus_size_acres?: number
  endowment_size?: number
  mascot?: string
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  created_at: string
}

interface ContactInfo {
  main_phone?: string
  athletics_phone?: string
  main_email?: string
  athletics_email?: string
  physical_address?: string
}

interface AthleticMetrics {
  total_revenue?: number
  total_expenses?: number
  net_income?: number
  coaching_salaries?: number
  recruiting_expenses?: number
  ticket_sales_revenue?: number
  donations_revenue?: number
  reporting_year?: number
}

type SchoolRow = Database['public']['Tables']['schools_ncaa_verified']['Row']

async function getSchoolDetail(id: string): Promise<{
  school: SchoolRow | null
  visualIdentity: any | null  
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
  const { school, visualIdentity, staffCount } = await getSchoolDetail(id)

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
              
              {school.graduation_rate && (
                <div className="text-center p-4 bg-muted/50 rounded-md">
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{Math.round(school.graduation_rate * 100)}%</div>
                  <div className="text-sm text-muted-foreground">Graduation Rate</div>
                </div>
              )}
              
              {school.founded_year && (
                <div className="text-center p-4 bg-muted/50 rounded-md">
                  <Building className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{school.founded_year}</div>
                  <div className="text-sm text-muted-foreground">Founded</div>
                </div>
              )}
              
              {school.campus_size_acres && (
                <div className="text-center p-4 bg-muted/50 rounded-md">
                  <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{formatNumber(school.campus_size_acres)}</div>
                  <div className="text-sm text-muted-foreground">Campus Acres</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tuition & Costs */}
          {(school.in_state_tuition || school.out_of_state_tuition || school.room_and_board) && (
            <Card>
              <CardHeader>
                <CardTitle>Tuition & Costs</CardTitle>
                <CardDescription>Annual costs for students</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {school.in_state_tuition && (
                  <div className="text-center p-4 bg-green-50 rounded-md">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-xl font-bold">{formatCurrency(school.in_state_tuition)}</div>
                    <div className="text-sm text-muted-foreground">In-State Tuition</div>
                  </div>
                )}
                
                {school.out_of_state_tuition && (
                  <div className="text-center p-4 bg-blue-50 rounded-md">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-xl font-bold">{formatCurrency(school.out_of_state_tuition)}</div>
                    <div className="text-sm text-muted-foreground">Out-of-State Tuition</div>
                  </div>
                )}
                
                {school.room_and_board && (
                  <div className="text-center p-4 bg-purple-50 rounded-md">
                    <Building className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-xl font-bold">{formatCurrency(school.room_and_board)}</div>
                    <div className="text-sm text-muted-foreground">Room & Board</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Athletic Financial Data */}
          {athleticMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Athletic Program Finances</CardTitle>
                <CardDescription>
                  Financial data for {athleticMetrics.reporting_year || 'latest year'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {athleticMetrics.total_revenue && (
                  <div className="text-center p-4 bg-green-50 rounded-md">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-bold">{formatCurrency(athleticMetrics.total_revenue)}</div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                )}
                
                {athleticMetrics.total_expenses && (
                  <div className="text-center p-4 bg-red-50 rounded-md">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <div className="text-lg font-bold">{formatCurrency(athleticMetrics.total_expenses)}</div>
                    <div className="text-sm text-muted-foreground">Total Expenses</div>
                  </div>
                )}
                
                {athleticMetrics.net_income && (
                  <div className={`text-center p-4 rounded-md ${athleticMetrics.net_income > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <DollarSign className={`h-6 w-6 mx-auto mb-2 ${athleticMetrics.net_income > 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="text-lg font-bold">{formatCurrency(athleticMetrics.net_income)}</div>
                    <div className="text-sm text-muted-foreground">Net Income</div>
                  </div>
                )}
                
                {athleticMetrics.coaching_salaries && (
                  <div className="text-center p-4 bg-blue-50 rounded-md">
                    <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg font-bold">{formatCurrency(athleticMetrics.coaching_salaries)}</div>
                    <div className="text-sm text-muted-foreground">Coaching Salaries</div>
                  </div>
                )}
                
                {athleticMetrics.recruiting_expenses && (
                  <div className="text-center p-4 bg-orange-50 rounded-md">
                    <Trophy className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                    <div className="text-lg font-bold">{formatCurrency(athleticMetrics.recruiting_expenses)}</div>
                    <div className="text-sm text-muted-foreground">Recruiting</div>
                  </div>
                )}
                
                {athleticMetrics.donations_revenue && (
                  <div className="text-center p-4 bg-purple-50 rounded-md">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-lg font-bold">{formatCurrency(athleticMetrics.donations_revenue)}</div>
                    <div className="text-sm text-muted-foreground">Donations</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Contact & Location */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(school.phone || contactInfo?.main_phone) && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{contactInfo?.main_phone || school.phone}</span>
                </div>
              )}
              
              {contactInfo?.athletics_phone && (
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span>{contactInfo.athletics_phone}</span>
                  <span className="text-sm text-muted-foreground">(Athletics)</span>
                </div>
              )}
              
              {contactInfo?.main_email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Link href={`mailto:${contactInfo.main_email}`} className="text-primary hover:underline">
                    {contactInfo.main_email}
                  </Link>
                </div>
              )}
              
              {contactInfo?.athletics_email && (
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <Link href={`mailto:${contactInfo.athletics_email}`} className="text-primary hover:underline">
                    {contactInfo.athletics_email}
                  </Link>
                  <span className="text-sm text-muted-foreground">(Athletics)</span>
                </div>
              )}
              
              {(school.address || contactInfo?.physical_address) && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div>{contactInfo?.physical_address || school.address}</div>
                    {school.city && school.state && school.zip_code && (
                      <div className="text-sm text-muted-foreground">
                        {school.city}, {school.state} {school.zip_code}
                      </div>
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
              {school.carnegie_classification && (
                <div>
                  <span className="font-medium">Carnegie Classification:</span>
                  <div className="text-muted-foreground">{school.carnegie_classification}</div>
                </div>
              )}
              
              {school.campus_setting && (
                <div>
                  <span className="font-medium">Campus Setting:</span>
                  <div className="text-muted-foreground">{school.campus_setting}</div>
                </div>
              )}
              
              {school.county && (
                <div>
                  <span className="font-medium">County:</span>
                  <div className="text-muted-foreground">{school.county}</div>
                </div>
              )}
              
              {school.endowment_size && (
                <div>
                  <span className="font-medium">Endowment:</span>
                  <div className="text-muted-foreground">{formatCurrency(school.endowment_size)}</div>
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