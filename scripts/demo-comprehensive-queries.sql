-- ============================================================================
-- Comprehensive Data Demo Queries
-- Purpose: Demonstrate the power of our enhanced CSV integration
-- Created: 2025-08-27
-- ============================================================================

-- =====================================================================
-- QUERY 1: TOP REVENUE-GENERATING ATHLETIC PROGRAMS WITH SCHOOL CONTEXT
-- =====================================================================

SELECT 
    s.name as school_name,
    s.athletic_division,
    s.state,
    s.total_enrollment,
    s.phone,
    apm.sport,
    apm.total_revenue,
    apm.total_expenses,
    (apm.total_revenue - apm.total_expenses) as net_revenue,
    CASE 
        WHEN s.total_enrollment > 0 
        THEN apm.total_revenue / s.total_enrollment
        ELSE NULL
    END as revenue_per_student
FROM schools_ncaa_verified s
JOIN athletic_program_metrics apm ON s.id = apm.school_id
WHERE apm.total_revenue > 5000000  -- $5M+ revenue sports
  AND s.total_enrollment IS NOT NULL
ORDER BY apm.total_revenue DESC
LIMIT 10;

-- =====================================================================
-- QUERY 2: GEOGRAPHIC ANALYSIS - SCHOOLS BY REGION WITH FULL DETAILS
-- =====================================================================

SELECT 
    s.name,
    s.athletic_division,
    s.state,
    s.city,
    s.latitude,
    s.longitude,
    s.naics_description,
    s.total_enrollment,
    s.has_housing,
    s.dormitory_capacity,
    c.main_phone,
    c.physical_address,
    COUNT(apm.id) as total_sports_programs,
    SUM(apm.total_revenue) as total_athletic_revenue
FROM schools_ncaa_verified s
LEFT JOIN school_contact_info c ON s.id = c.school_id
LEFT JOIN athletic_program_metrics apm ON s.id = apm.school_id
WHERE s.state IN ('CA', 'TX', 'FL', 'NY')  -- Major states
  AND s.latitude IS NOT NULL 
  AND s.longitude IS NOT NULL
GROUP BY s.id, s.name, s.athletic_division, s.state, s.city, s.latitude, s.longitude,
         s.naics_description, s.total_enrollment, s.has_housing, s.dormitory_capacity,
         c.main_phone, c.physical_address
ORDER BY total_athletic_revenue DESC NULLS LAST
LIMIT 15;

-- =====================================================================
-- QUERY 3: ENROLLMENT vs ATHLETIC SUCCESS ANALYSIS
-- =====================================================================

SELECT 
    CASE 
        WHEN s.total_enrollment < 5000 THEN 'Small (< 5K)'
        WHEN s.total_enrollment < 15000 THEN 'Medium (5K-15K)'
        WHEN s.total_enrollment < 30000 THEN 'Large (15K-30K)'
        ELSE 'Very Large (30K+)'
    END as enrollment_category,
    s.athletic_division,
    COUNT(*) as school_count,
    AVG(s.total_enrollment) as avg_enrollment,
    AVG(metrics.total_revenue) as avg_athletic_revenue,
    AVG(metrics.total_sports) as avg_sports_programs,
    AVG(s.dormitory_capacity) as avg_dorm_capacity
FROM schools_ncaa_verified s
LEFT JOIN (
    SELECT 
        school_id,
        SUM(total_revenue) as total_revenue,
        COUNT(DISTINCT sport) as total_sports
    FROM athletic_program_metrics
    GROUP BY school_id
) metrics ON s.id = metrics.school_id
WHERE s.total_enrollment IS NOT NULL
GROUP BY 
    CASE 
        WHEN s.total_enrollment < 5000 THEN 'Small (< 5K)'
        WHEN s.total_enrollment < 15000 THEN 'Medium (5K-15K)'
        WHEN s.total_enrollment < 30000 THEN 'Large (15K-30K)'
        ELSE 'Very Large (30K+)'
    END,
    s.athletic_division
ORDER BY s.athletic_division, avg_enrollment;

-- =====================================================================
-- QUERY 4: CONTACT INFORMATION COMPLETENESS BY DIVISION
-- =====================================================================

SELECT 
    s.athletic_division,
    COUNT(*) as total_schools,
    COUNT(s.phone) as schools_with_phone,
    COUNT(c.main_email) as schools_with_email,
    COUNT(s.academic_website) as schools_with_website,
    COUNT(s.latitude) as schools_with_coordinates,
    ROUND(COUNT(s.phone)::decimal / COUNT(*) * 100, 1) as phone_coverage_pct,
    ROUND(COUNT(c.main_email)::decimal / COUNT(*) * 100, 1) as email_coverage_pct,
    ROUND(COUNT(s.academic_website)::decimal / COUNT(*) * 100, 1) as website_coverage_pct,
    ROUND(COUNT(s.latitude)::decimal / COUNT(*) * 100, 1) as coordinates_coverage_pct
FROM schools_ncaa_verified s
LEFT JOIN school_contact_info c ON s.id = c.school_id
GROUP BY s.athletic_division
ORDER BY s.athletic_division;

-- =====================================================================
-- QUERY 5: HOUSING CAPACITY vs ENROLLMENT ANALYSIS
-- =====================================================================

SELECT 
    s.name,
    s.athletic_division,
    s.state,
    s.total_enrollment,
    s.dormitory_capacity,
    CASE 
        WHEN s.dormitory_capacity IS NULL THEN 'No Housing Data'
        WHEN s.total_enrollment IS NULL THEN 'No Enrollment Data'
        ELSE ROUND((s.dormitory_capacity::decimal / s.total_enrollment * 100), 1)::text || '%'
    END as housing_coverage_pct,
    s.has_housing,
    c.main_phone
FROM schools_ncaa_verified s
LEFT JOIN school_contact_info c ON s.id = c.school_id
WHERE s.has_housing = true 
  AND s.dormitory_capacity IS NOT NULL
  AND s.total_enrollment IS NOT NULL
  AND s.total_enrollment > 0
ORDER BY (s.dormitory_capacity::decimal / s.total_enrollment) DESC
LIMIT 20;

-- =====================================================================
-- QUERY 6: ATHLETIC FINANCIAL EFFICIENCY BY INSTITUTION TYPE
-- =====================================================================

SELECT 
    s.institution_type,
    s.athletic_division,
    COUNT(DISTINCT s.id) as school_count,
    AVG(s.total_enrollment) as avg_enrollment,
    AVG(metrics.total_revenue) as avg_athletic_revenue,
    AVG(metrics.total_expenses) as avg_athletic_expenses,
    AVG(metrics.net_result) as avg_net_result,
    AVG(metrics.revenue_per_student) as avg_revenue_per_student
FROM schools_ncaa_verified s
JOIN (
    SELECT 
        school_id,
        SUM(total_revenue) as total_revenue,
        SUM(total_expenses) as total_expenses,
        SUM(total_revenue - total_expenses) as net_result,
        CASE 
            WHEN SUM(s2.total_enrollment) > 0 
            THEN SUM(total_revenue) / SUM(s2.total_enrollment)
            ELSE NULL
        END as revenue_per_student
    FROM athletic_program_metrics apm
    JOIN schools_ncaa_verified s2 ON apm.school_id = s2.id
    GROUP BY school_id
) metrics ON s.id = metrics.school_id
WHERE s.institution_type IN ('public', 'private')
  AND s.total_enrollment IS NOT NULL
GROUP BY s.institution_type, s.athletic_division
ORDER BY s.institution_type, s.athletic_division;

-- =====================================================================
-- QUERY 7: COMPREHENSIVE SCHOOL PROFILES FOR RECRUITING
-- =====================================================================

SELECT 
    s.name as school_name,
    s.athletic_division,
    s.conference,
    s.state || ', ' || s.city as location,
    s.institution_type,
    s.total_enrollment,
    s.has_housing,
    s.dormitory_capacity,
    c.main_phone,
    c.physical_address,
    s.academic_website,
    s.latitude || ', ' || s.longitude as coordinates,
    COUNT(apm.id) as sports_programs,
    STRING_AGG(DISTINCT apm.sport, ', ' ORDER BY apm.sport) as available_sports,
    SUM(apm.total_revenue) as total_athletic_budget
FROM schools_ncaa_verified s
LEFT JOIN school_contact_info c ON s.id = c.school_id  
LEFT JOIN athletic_program_metrics apm ON s.id = apm.school_id
WHERE s.athletic_division = 'NCAA DI'
  AND s.total_enrollment BETWEEN 10000 AND 25000  -- Target size range
  AND s.state IN ('CA', 'TX', 'FL', 'NC', 'VA')   -- Target states
  AND s.has_housing = true                         -- Must have housing
GROUP BY s.id, s.name, s.athletic_division, s.conference, s.state, s.city,
         s.institution_type, s.total_enrollment, s.has_housing, s.dormitory_capacity,
         c.main_phone, c.physical_address, s.academic_website, s.latitude, s.longitude
HAVING COUNT(apm.id) >= 10  -- Must have robust athletic programs
ORDER BY total_athletic_budget DESC NULLS LAST
LIMIT 10;

-- =====================================================================
-- SUMMARY STATISTICS
-- =====================================================================

SELECT 
    'COMPREHENSIVE DATA SUMMARY' as category,
    '' as metric,
    '' as value
UNION ALL
SELECT 
    'Schools' as category,
    'Total Schools' as metric,
    COUNT(*)::text as value
FROM schools_ncaa_verified
UNION ALL
SELECT 
    'Schools' as category,
    'With Phone Numbers' as metric,
    COUNT(*)::text || ' (' || ROUND(COUNT(*)::decimal / total.count * 100, 1)::text || '%)'
FROM schools_ncaa_verified, (SELECT COUNT(*) as count FROM schools_ncaa_verified) total
WHERE phone IS NOT NULL
UNION ALL
SELECT 
    'Schools' as category,
    'With Enrollment Data' as metric,
    COUNT(*)::text || ' (' || ROUND(COUNT(*)::decimal / total.count * 100, 1)::text || '%)'
FROM schools_ncaa_verified, (SELECT COUNT(*) as count FROM schools_ncaa_verified) total
WHERE total_enrollment IS NOT NULL
UNION ALL
SELECT 
    'Schools' as category,
    'With Housing Info' as metric,
    COUNT(*)::text || ' (' || ROUND(COUNT(*)::decimal / total.count * 100, 1)::text || '%)'
FROM schools_ncaa_verified, (SELECT COUNT(*) as count FROM schools_ncaa_verified) total
WHERE has_housing IS NOT NULL
UNION ALL
SELECT 
    'Athletics' as category,
    'Program Records' as metric,
    COUNT(*)::text as value
FROM athletic_program_metrics
UNION ALL
SELECT 
    'Contact' as category,
    'Contact Records' as metric,
    COUNT(*)::text as value
FROM school_contact_info
UNION ALL
SELECT 
    'Enrollment' as category,
    'Analytics Records' as metric,
    COUNT(*)::text as value
FROM enrollment_analytics;

-- ============================================================================
-- END OF DEMO QUERIES
-- ============================================================================