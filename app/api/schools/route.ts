import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { authenticateApiKey, requirePermission, createApiResponse, createErrorResponse } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const keyData = await authenticateApiKey(request);
    requirePermission(keyData, 'read');
    
    const searchParams = request.nextUrl.searchParams;
    const supabase = createServiceRoleClient();
    
    // Build query with filters
    let query = supabase
      .from('schools_ncaa_verified')
      .select('*');
    
    // Apply filters
    const conference = searchParams.get('conference');
    if (conference) {
      query = query.ilike('conference', `%${conference}%`);
    }
    
    const state = searchParams.get('state');
    if (state) {
      query = query.eq('state', state);
    }
    
    const division = searchParams.get('division');
    if (division) {
      query = query.eq('athletic_division', division);
    }
    
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,mascot.ilike.%${search}%`);
    }
    
    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    query = query
      .order('name')
      .range(offset, offset + limit - 1);
    
    const { data: schools, error } = await query;
    
    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('schools_ncaa_verified')
      .select('*', { count: 'exact', head: true });
    
    return createApiResponse(schools, {
      metadata: {
        limit: limit,
        offset: offset,
        total: totalCount || 0,
        returned: schools?.length || 0,
        conference: conference || 'none',
        state: state || 'none',
        division: division || 'none',
        search: search || 'none'
      }
    });
    
  } catch (error) {
    return createErrorResponse(error as Error, 401);
  }
}