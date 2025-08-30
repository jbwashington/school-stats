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
    
    // Build comprehensive staff search query
    let query = supabase
      .from('athletic_staff')
      .select(`
        *,
        schools_ncaa_verified!athletic_staff_ncaa_school_id_fkey (
          id,
          name,
          conference,
          state,
          athletic_division
        )
      `);
    
    // Name search
    const name = searchParams.get('name');
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    
    // Sport filter
    const sport = searchParams.get('sport');
    if (sport) {
      query = query.eq('sport', sport);
    }
    
    // Title search
    const title = searchParams.get('title');
    if (title) {
      if (title.toLowerCase() === 'head-coach') {
        query = query.ilike('title', '%Head Coach%');
      } else if (title.toLowerCase() === 'assistant-coach') {
        query = query.ilike('title', '%Assistant Coach%');
      } else {
        query = query.ilike('title', `%${title}%`);
      }
    }
    
    // Conference filter (via school relationship)
    const conference = searchParams.get('conference');
    if (conference) {
      // We'll need to join and filter - for now, get all and filter in memory
      // In production, you might want to use a database view or function
    }
    
    // State filter (via school relationship)
    const state = searchParams.get('state');
    if (state) {
      // Similar to conference - would benefit from proper join
    }
    
    // Contact availability filters
    const hasEmail = searchParams.get('has_email');
    if (hasEmail === 'true') {
      query = query.not('email', 'is', null);
    }
    
    const hasPhone = searchParams.get('has_phone');
    if (hasPhone === 'true') {
      query = query.not('phone', 'is', null);
    }
    
    // Confidence threshold
    const minConfidence = searchParams.get('min_confidence');
    if (minConfidence) {
      const threshold = parseFloat(minConfidence);
      if (!isNaN(threshold)) {
        query = query.gte('confidence_score', threshold);
      }
    }
    
    // General search across multiple fields
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`name.ilike.%${search}%,title.ilike.%${search}%,sport.ilike.%${search}%,bio.ilike.%${search}%`);
    }
    
    // Scraping method filter
    const method = searchParams.get('method');
    if (method) {
      query = query.eq('scraping_method', method);
    }
    
    // Order by relevance (confidence score, then name)
    query = query
      .order('confidence_score', { ascending: false })
      .order('name');
    
    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    let results = data;
    
    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }
    
    // Post-process filtering for conference and state if needed
    if (conference && results) {
      results = results.filter(staff => 
        staff.schools_ncaa_verified && 
        staff.schools_ncaa_verified.conference &&
        staff.schools_ncaa_verified.conference.toLowerCase().includes(conference.toLowerCase())
      );
    }
    
    if (state && results) {
      results = results.filter(staff => 
        staff.schools_ncaa_verified && 
        staff.schools_ncaa_verified.state === state
      );
    }
    
    // Calculate search statistics
    const stats = {
      total_results: results?.length || 0,
      by_sport: {} as Record<string, number>,
      by_conference: {} as Record<string, number>,
      by_state: {} as Record<string, number>,
      by_method: {} as Record<string, number>,
      avg_confidence: 0
    };
    
    if (results && results.length > 0) {
      results.forEach(staff => {
        // Sport breakdown
        if (staff.sport) {
          stats.by_sport[staff.sport] = (stats.by_sport[staff.sport] || 0) + 1;
        }
        
        // Method breakdown
        if (staff.scraping_method) {
          stats.by_method[staff.scraping_method] = (stats.by_method[staff.scraping_method] || 0) + 1;
        }
        
        // Conference breakdown
        if (staff.schools_ncaa_verified?.conference) {
          const conf = staff.schools_ncaa_verified.conference;
          stats.by_conference[conf] = (stats.by_conference[conf] || 0) + 1;
        }
        
        // State breakdown
        if (staff.schools_ncaa_verified?.state) {
          const st = staff.schools_ncaa_verified.state;
          stats.by_state[st] = (stats.by_state[st] || 0) + 1;
        }
      });
      
      // Average confidence
      const validConfidences = results
        .map(s => s.confidence_score)
        .filter(c => c != null) as number[];
      
      if (validConfidences.length > 0) {
        stats.avg_confidence = validConfidences.reduce((a, b) => a + b, 0) / validConfidences.length;
      }
    }
    
    return createApiResponse(results, {
      metadata: {
        name: name || 'none',
        sport: sport || 'none',
        title: title || 'none',
        conference: conference || 'none',
        state: state || 'none',
        has_email: hasEmail || 'none',
        has_phone: hasPhone || 'none',
        min_confidence: minConfidence || 'none',
        search: search || 'none',
        method: method || 'none',
        total_results: stats.total_results,
        avg_confidence: stats.avg_confidence,
        limit: limit,
        offset: offset,
        returned: results?.length || 0
      }
    });
    
  } catch (error) {
    return createErrorResponse(error as Error, 401);
  }
}