import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { authenticateApiKey, requirePermission, createApiResponse, createErrorResponse } from '@/lib/api/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    // Authenticate API key with admin permission
    const keyData = await authenticateApiKey(request);
    requirePermission(keyData, 'admin');
    
    const supabase = createServiceRoleClient();
    const requestBody = await request.json().catch(() => ({}));
    
    const {
      method = 'hybrid',
      school_ids,
      force_refresh = false
    } = requestBody;
    
    // Validate method
    if (!['firecrawl', 'puppeteer', 'hybrid'].includes(method)) {
      return createErrorResponse('Invalid method. Must be: firecrawl, puppeteer, or hybrid', 400);
    }
    
    // Get schools to scrape
    let schoolsQuery = supabase
      .from('schools_ncaa_verified')
      .select('id, name, athletic_website')
      .not('athletic_website', 'is', null)
      .order('name');
    
    if (school_ids && Array.isArray(school_ids)) {
      schoolsQuery = schoolsQuery.in('id', school_ids);
    }
    
    const { data: schools, error: schoolsError } = await schoolsQuery;
    
    if (schoolsError) {
      return createErrorResponse(`Failed to fetch schools: ${schoolsError.message}`, 500);
    }
    
    if (!schools || schools.length === 0) {
      return createErrorResponse('No schools found to scrape', 404);
    }
    
    // Create scraping run record
    const { data: scrapingRun, error: runError } = await supabase
      .from('scraping_runs')
      .insert({
        method,
        schools_processed: 0,
        coaches_extracted: 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (runError) {
      return createErrorResponse(`Failed to create scraping run: ${runError.message}`, 500);
    }
    
    // Start scraping process (this would typically be queued in production)
    const scrapingPromise = performScraping({
      method,
      schools,
      runId: scrapingRun.id,
      force_refresh
    });
    
    // Don't await the scraping - return immediately with job ID
    scrapingPromise.catch(error => {
      console.error('Scraping failed:', error);
      // Update run with error status
      supabase
        .from('scraping_runs')
        .update({
          completed_at: new Date().toISOString(),
          errors: [{ message: error.message, timestamp: new Date().toISOString() }]
        })
        .eq('id', scrapingRun.id);
    });
    
    return createApiResponse({
      job_id: scrapingRun.id,
      method,
      schools_count: schools.length,
      status: 'started'
    }, {
      status: 202,
      message: 'Scraping job started successfully',
      metadata: {
        job_details: {
          method,
          schools_to_process: schools.length,
          force_refresh,
          estimated_duration: `${Math.ceil(schools.length * 30 / 60)} minutes`
        }
      }
    });
    
  } catch (error) {
    return createErrorResponse(error as Error, 401);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get scraping run status
    const keyData = await authenticateApiKey(request);
    requirePermission(keyData, 'admin');
    
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    
    const supabase = createServiceRoleClient();
    
    if (jobId) {
      // Get specific job status
      const { data: run, error } = await supabase
        .from('scraping_runs')
        .select('*')
        .eq('id', parseInt(jobId))
        .single();
      
      if (error || !run) {
        return createErrorResponse('Scraping run not found', 404);
      }
      
      return createApiResponse({
        job_id: run.id,
        method: run.method,
        status: run.completed_at ? 'completed' : 'running',
        schools_processed: run.schools_processed,
        coaches_extracted: run.coaches_extracted,
        success_rate: run.success_rate,
        average_scraping_time: run.average_scraping_time,
        started_at: run.started_at,
        completed_at: run.completed_at,
        errors: run.errors,
        duration: run.completed_at 
          ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
          : Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000)
      });
    }
    
    // Get recent scraping runs
    const { data: runs, error } = await supabase
      .from('scraping_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      return createErrorResponse(`Failed to fetch runs: ${error.message}`, 500);
    }
    
    return createApiResponse(runs?.map(run => ({
      job_id: run.id,
      method: run.method,
      status: run.completed_at ? 'completed' : 'running',
      schools_processed: run.schools_processed,
      coaches_extracted: run.coaches_extracted,
      success_rate: run.success_rate,
      started_at: run.started_at,
      completed_at: run.completed_at,
      duration: run.completed_at 
        ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
        : Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000)
    })) || []);
    
  } catch (error) {
    return createErrorResponse(error as Error, 401);
  }
}

async function performScraping(params: {
  method: string;
  schools: Array<{id: number, name: string, athletic_website: string | null}>;
  runId: number;
  force_refresh: boolean;
}) {
  const { method, schools, runId, force_refresh } = params;
  const supabase = createServiceRoleClient();
  
  let totalCoaches = 0;
  let successfulSchools = 0;
  const errors: any[] = [];
  const startTime = Date.now();
  
  try {
    if (method === 'hybrid') {
      // Use hybrid scraper system
      const { HybridScraperSystem } = await import('@/lib/scraping/hybrid-scraper-system');
      const hybridScraper = new HybridScraperSystem();
      
      for (const school of schools) {
        try {
          const result = await hybridScraper.scrapeSchoolWithFallback(
            school.id,
            school.name,
            school.athletic_website!
          );
          
          if (result.success) {
            successfulSchools++;
            totalCoaches += result.coaches.length;
          } else {
            errors.push({
              school_id: school.id,
              school_name: school.name,
              error: result.error,
              timestamp: new Date().toISOString()
            });
          }
          
          // Update progress
          await supabase
            .from('scraping_runs')
            .update({
              schools_processed: successfulSchools + errors.length,
              coaches_extracted: totalCoaches
            })
            .eq('id', runId);
            
        } catch (error) {
          errors.push({
            school_id: school.id,
            school_name: school.name,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }
      }
      
      await hybridScraper.close();
      
    } else if (method === 'puppeteer') {
      // Use Puppeteer-only scraping
      const { AthleticCoachScraper } = await import('@/lib/puppeteer/athletic-coach-scraper');
      const scraper = new AthleticCoachScraper();
      
      for (const school of schools) {
        try {
          const result = await scraper.scrapeSchool(
            school.id,
            school.name,
            school.athletic_website!
          );
          
          if (result.success) {
            successfulSchools++;
            totalCoaches += result.coaches.length;
            
            // Save coaches to database
            for (const coach of result.coaches) {
              await supabase
                .from('athletic_staff')
                .insert({
                  ncaa_school_id: school.id,
                  name: coach.name,
                  title: coach.title,
                  sport: coach.sport,
                  email: coach.email,
                  phone: coach.phone,
                  scraping_method: 'puppeteer'
                });
            }
          } else {
            errors.push({
              school_id: school.id,
              school_name: school.name,
              error: result.error,
              timestamp: new Date().toISOString()
            });
          }
          
        } catch (error) {
          errors.push({
            school_id: school.id,
            school_name: school.name,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }
      }
      
      await scraper.close();
      
    } else {
      // Firecrawl-only method
      const { scrapeAthleticCoaches } = await import('@/lib/firecrawl/scrape-athletic-coaches');
      
      await scrapeAthleticCoaches(schools.map(s => s.id));
      
      // Count results from database after scraping
      const { data: staffData } = await supabase
        .from('athletic_staff')
        .select('ncaa_school_id')
        .in('ncaa_school_id', schools.map(s => s.id));
      
      schools.forEach(school => {
        const schoolStaff = staffData?.filter(s => s.ncaa_school_id === school.id) || [];
        if (schoolStaff.length > 0) {
          successfulSchools++;
          totalCoaches += schoolStaff.length;
        } else {
          errors.push({
            school_id: school.id,
            school_name: school.name,
            error: 'No coaches extracted',
            timestamp: new Date().toISOString()
          });
        }
      });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const successRate = schools.length > 0 ? (successfulSchools / schools.length) * 100 : 0;
    const avgTime = schools.length > 0 ? Math.round(duration / schools.length) : 0;
    
    // Update final run status
    await supabase
      .from('scraping_runs')
      .update({
        schools_processed: schools.length,
        coaches_extracted: totalCoaches,
        success_rate: successRate,
        average_scraping_time: avgTime,
        completed_at: new Date().toISOString(),
        errors: errors.length > 0 ? errors : null
      })
      .eq('id', runId);
    
  } catch (error) {
    // Update run with error
    await supabase
      .from('scraping_runs')
      .update({
        completed_at: new Date().toISOString(),
        errors: [{
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }]
      })
      .eq('id', runId);
    
    throw error;
  }
}