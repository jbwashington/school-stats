import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { authenticateApiKey, requirePermission, createApiResponse, createErrorResponse } from '@/lib/api/auth-middleware';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ school_id: string }> }
) {
  const resolvedParams = await params;
  try {
    // Authenticate API key
    const keyData = await authenticateApiKey(request);
    requirePermission(keyData, 'read');
    
    const schoolId = parseInt(resolvedParams.school_id);
    if (isNaN(schoolId)) {
      return createErrorResponse('Invalid school_id parameter', 400);
    }
    
    const searchParams = request.nextUrl.searchParams;
    const supabase = createServiceRoleClient();
    
    // Verify school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools_ncaa_verified')
      .select('id, name')
      .eq('id', schoolId)
      .single();
    
    if (schoolError || !school) {
      return createErrorResponse('School not found', 404);
    }
    
    // Build staff query with filters
    let query = supabase
      .from('athletic_staff')
      .select('*')
      .eq('ncaa_school_id', schoolId);
    
    // Apply filters
    const sport = searchParams.get('sport');
    if (sport) {
      query = query.eq('sport', sport);
    }
    
    const title = searchParams.get('title');
    if (title) {
      // Handle common title searches
      if (title.toLowerCase() === 'head-coach') {
        query = query.ilike('title', '%Head Coach%');
      } else if (title.toLowerCase() === 'assistant-coach') {
        query = query.ilike('title', '%Assistant Coach%');
      } else {
        query = query.ilike('title', `%${title}%`);
      }
    }
    
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`name.ilike.%${search}%,title.ilike.%${search}%,bio.ilike.%${search}%`);
    }
    
    // Filter by contact availability
    const hasEmail = searchParams.get('has_email');
    if (hasEmail === 'true') {
      query = query.not('email', 'is', null);
    }
    
    const hasPhone = searchParams.get('has_phone');
    if (hasPhone === 'true') {
      query = query.not('phone', 'is', null);
    }
    
    // Order by confidence and name
    query = query
      .order('confidence_score', { ascending: false })
      .order('name');
    
    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data: staff, error } = await query;
    
    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }
    
    // Get staff statistics
    const { data: statsData } = await supabase
      .from('athletic_staff')
      .select('sport, scraping_method, confidence_score, email, phone')
      .eq('ncaa_school_id', schoolId);
    
    const stats = {
      total_staff: statsData?.length || 0,
      by_sport: {} as Record<string, number>,
      by_method: {} as Record<string, number>,
      avg_confidence: 0,
      with_email: statsData?.filter(s => s.email).length || 0,
      with_phone: statsData?.filter(s => s.phone).length || 0
    };
    
    if (statsData) {
      // Calculate sport breakdown
      statsData.forEach(s => {
        stats.by_sport[s.sport] = (stats.by_sport[s.sport] || 0) + 1;
        stats.by_method[s.scraping_method] = (stats.by_method[s.scraping_method] || 0) + 1;
      });
      
      // Calculate average confidence
      const validConfidences = statsData
        .map(s => s.confidence_score)
        .filter(c => c != null) as number[];
      
      if (validConfidences.length > 0) {
        stats.avg_confidence = validConfidences.reduce((a, b) => a + b, 0) / validConfidences.length;
      }
    }
    
    return createApiResponse(staff, {
      metadata: {
        school: {
          id: school.id,
          name: school.name
        },
        statistics: stats,
        filters: {
          sport,
          title,
          search,
          has_email: hasEmail,
          has_phone: hasPhone
        },
        pagination: {
          limit,
          offset,
          returned: staff?.length || 0
        }
      }
    });
    
  } catch (error) {
    return createErrorResponse(error as Error, 401);
  }
}