import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/utils'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Database,
  Users,
  Phone,
  Mail,
  Trophy,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface QualityMetrics {
  totalSchools: number
  schoolsWithMascot: number
  schoolsWithAthleticWebsite: number
  schoolsWithAcademicWebsite: number
  schoolsWithVisualIdentity: number
  totalStaff: number
  staffWithEmail: number
  staffWithPhone: number
  staffWithBio: number
  avgConfidenceScore: number
  dataCompleteness: number
  lastUpdated: string
}

async function getQualityMetrics(): Promise<QualityMetrics> {
  const supabase = createServiceRoleClient()
  
  try {
    // Get school quality metrics
    const [
      totalSchools,
      schoolsWithMascot,
      schoolsWithAthleticWebsite,
      schoolsWithAcademicWebsite,
      schoolsWithVisualIdentity,
      totalStaff,
      staffWithEmail,
      staffWithPhone,
      staffWithBio,
      avgConfidence,
    ] = await Promise.all([
      // Total schools
      supabase.from('schools_ncaa_verified').select('id', { count: 'exact' }),
      
      // Schools with mascot
      supabase.from('schools_ncaa_verified').select('id', { count: 'exact' }).not('mascot', 'is', null),
      
      // Schools with contact email (using athletic website as proxy)
      supabase.from('schools_ncaa_verified').select('id', { count: 'exact' }).not('athletic_website', 'is', null),
      
      // Schools with academic website
      supabase.from('schools_ncaa_verified').select('id', { count: 'exact' }).not('academic_website', 'is', null),
      
      // Schools with visual identity data
      supabase.from('school_visual_identity').select('ncaa_school_id', { count: 'exact' }),
      
      // Total staff
      supabase.from('athletic_staff').select('id', { count: 'exact' }),
      
      // Staff with email
      supabase.from('athletic_staff').select('id', { count: 'exact' }).not('email', 'is', null),
      
      // Staff with phone
      supabase.from('athletic_staff').select('id', { count: 'exact' }).not('phone', 'is', null),
      
      // Staff with bio
      supabase.from('athletic_staff').select('id', { count: 'exact' }).not('bio', 'is', null),
      
      // Average confidence score
      supabase.from('athletic_staff').select('confidence_score').not('confidence_score', 'is', null),
    ])

    const schoolCount = totalSchools.count || 0
    const staffCount = totalStaff.count || 0
    
    // Calculate average confidence score
    const confidenceScores = avgConfidence.data?.map(s => s.confidence_score).filter(Boolean) as number[] || []
    const avgConfidenceScore = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0

    // Calculate overall data completeness score
    const schoolCompleteness = schoolCount > 0 ? [
      (schoolsWithMascot.count || 0) / schoolCount,
      (schoolsWithAthleticWebsite.count || 0) / schoolCount,
      (schoolsWithAcademicWebsite.count || 0) / schoolCount,
      (schoolsWithVisualIdentity.count || 0) / schoolCount,
    ].reduce((sum, rate) => sum + rate, 0) / 4 : 0

    const staffCompleteness = staffCount > 0 ? [
      (staffWithEmail.count || 0) / staffCount,
      (staffWithPhone.count || 0) / staffCount,
      (staffWithBio.count || 0) / staffCount,
    ].reduce((sum, rate) => sum + rate, 0) / 3 : 0

    const dataCompleteness = ((schoolCompleteness + staffCompleteness) / 2) * 100

    return {
      totalSchools: schoolCount,
      schoolsWithMascot: schoolsWithMascot.count || 0,
      schoolsWithAthleticWebsite: schoolsWithAthleticWebsite.count || 0,
      schoolsWithAcademicWebsite: schoolsWithAcademicWebsite.count || 0,
      schoolsWithVisualIdentity: schoolsWithVisualIdentity.count || 0,
      totalStaff: staffCount,
      staffWithEmail: staffWithEmail.count || 0,
      staffWithPhone: staffWithPhone.count || 0,
      staffWithBio: staffWithBio.count || 0,
      avgConfidenceScore: avgConfidenceScore,
      dataCompleteness: dataCompleteness,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Quality metrics error:', error)
    return {
      totalSchools: 0,
      schoolsWithMascot: 0,
      schoolsWithAthleticWebsite: 0,
      schoolsWithAcademicWebsite: 0,
      schoolsWithVisualIdentity: 0,
      totalStaff: 0,
      staffWithEmail: 0,
      staffWithPhone: 0,
      staffWithBio: 0,
      avgConfidenceScore: 0,
      dataCompleteness: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}

function QualityBadge({ percentage, label }: { percentage: number, label: string }) {
  const getColor = (pct: number) => {
    if (pct >= 80) return 'text-green-700 bg-green-100'
    if (pct >= 60) return 'text-yellow-700 bg-yellow-100'
    if (pct >= 40) return 'text-orange-700 bg-orange-100'
    return 'text-red-700 bg-red-100'
  }

  const getIcon = (pct: number) => {
    if (pct >= 80) return <CheckCircle className="h-4 w-4" />
    if (pct >= 40) return <AlertCircle className="h-4 w-4" />
    return <XCircle className="h-4 w-4" />
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${getColor(percentage)}`}>
      {getIcon(percentage)}
      <div>
        <div className="font-semibold">{percentage.toFixed(1)}%</div>
        <div className="text-sm">{label}</div>
      </div>
    </div>
  )
}

export default async function DataQualityPage() {
  const metrics = await getQualityMetrics()

  const schoolMascotRate = metrics.totalSchools > 0 ? (metrics.schoolsWithMascot / metrics.totalSchools) * 100 : 0
  const schoolAthleticWebsiteRate = metrics.totalSchools > 0 ? (metrics.schoolsWithAthleticWebsite / metrics.totalSchools) * 100 : 0
  const schoolAcademicWebsiteRate = metrics.totalSchools > 0 ? (metrics.schoolsWithAcademicWebsite / metrics.totalSchools) * 100 : 0
  const schoolVisualIdentityRate = metrics.totalSchools > 0 ? (metrics.schoolsWithVisualIdentity / metrics.totalSchools) * 100 : 0

  const staffEmailRate = metrics.totalStaff > 0 ? (metrics.staffWithEmail / metrics.totalStaff) * 100 : 0
  const staffPhoneRate = metrics.totalStaff > 0 ? (metrics.staffWithPhone / metrics.totalStaff) * 100 : 0
  const staffBioRate = metrics.totalStaff > 0 ? (metrics.staffWithBio / metrics.totalStaff) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6" />
                <span>Data Quality Overview</span>
              </CardTitle>
              <CardDescription>
                Overall platform health and data completeness metrics
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {metrics.dataCompleteness.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(metrics.totalSchools)}</div>
              <div className="text-sm text-muted-foreground">Total Schools</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(metrics.totalStaff)}</div>
              <div className="text-sm text-muted-foreground">Staff Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(metrics.avgConfidenceScore * 100).toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">87%</div>
              <div className="text-sm text-muted-foreground">Coverage Target</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Data Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>School Data Quality</span>
            </CardTitle>
            <CardDescription>
              Completeness of institutional data across {metrics.totalSchools} schools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">School Mascots</span>
                </div>
                <QualityBadge percentage={schoolMascotRate} label={`${metrics.schoolsWithMascot}/${metrics.totalSchools}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Athletic Websites</span>
                </div>
                <QualityBadge percentage={schoolAthleticWebsiteRate} label={`${metrics.schoolsWithAthleticWebsite}/${metrics.totalSchools}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Academic Websites</span>
                </div>
                <QualityBadge percentage={schoolAcademicWebsiteRate} label={`${metrics.schoolsWithAcademicWebsite}/${metrics.totalSchools}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Visual Identity</span>
                </div>
                <QualityBadge percentage={schoolVisualIdentityRate} label={`${metrics.schoolsWithVisualIdentity}/${metrics.totalSchools}`} />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button asChild variant="outline" className="w-full">
                <Link href="/quality/coverage">
                  View Detailed Coverage Report
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staff Data Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Athletic Staff Quality</span>
            </CardTitle>
            <CardDescription>
              Completeness of staff contact and profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email Addresses</span>
                </div>
                <QualityBadge percentage={staffEmailRate} label={`${metrics.staffWithEmail}/${metrics.totalStaff}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Phone Numbers</span>
                </div>
                <QualityBadge percentage={staffPhoneRate} label={`${metrics.staffWithPhone}/${metrics.totalStaff}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Biography Data</span>
                </div>
                <QualityBadge percentage={staffBioRate} label={`${metrics.staffWithBio}/${metrics.totalStaff}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Confidence Score</span>
                </div>
                <QualityBadge percentage={metrics.avgConfidenceScore * 100} label="Average" />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button asChild variant="outline" className="w-full">
                <Link href="/staff">
                  View All Staff Records
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Improvement Areas</CardTitle>
          <CardDescription>
            Recommendations for enhancing data completeness and accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Strong Areas</h3>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• School academic websites ({schoolAcademicWebsiteRate.toFixed(0)}%)</li>
                <li>• Basic contact information</li>
                <li>• Geographic data coverage</li>
                <li>• Financial metrics collection</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium">Needs Improvement</h3>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Staff email collection ({staffEmailRate.toFixed(0)}%)</li>
                <li>• Athletic staff directory coverage</li>
                <li>• Detailed biographical information</li>
                <li>• Social media profile links</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h3 className="font-medium">Priority Issues</h3>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Staff phone numbers ({staffPhoneRate.toFixed(0)}%)</li>
                <li>• Photo URL availability</li>
                <li>• Scraping method optimization</li>
                <li>• Data validation processes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/scraping">
                <Trophy className="h-6 w-6 mb-2" />
                <span className="font-medium">Run Data Collection</span>
                <span className="text-xs text-muted-foreground">Update staff directories</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/quality/issues">
                <AlertCircle className="h-6 w-6 mb-2" />
                <span className="font-medium">Review Data Issues</span>
                <span className="text-xs text-muted-foreground">Fix validation errors</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/quality/completeness">
                <BarChart3 className="h-6 w-6 mb-2" />
                <span className="font-medium">Coverage Analysis</span>
                <span className="text-xs text-muted-foreground">Detailed breakdowns</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/metrics">
                <Database className="h-6 w-6 mb-2" />
                <span className="font-medium">System Metrics</span>
                <span className="text-xs text-muted-foreground">Performance monitoring</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}