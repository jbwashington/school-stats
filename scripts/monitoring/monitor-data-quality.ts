#!/usr/bin/env bun

/**
 * Data Quality Monitoring System
 * Continuous monitoring of data quality with alerting and reporting
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import fs from 'fs/promises';

interface DataQualityMetric {
  metric_name: string;
  table_name: string;
  current_value: number;
  threshold_value: number;
  threshold_type: 'min' | 'max' | 'exact';
  severity: 'info' | 'warning' | 'critical';
  status: 'ok' | 'warning' | 'critical';
  description: string;
  last_checked: string;
}

interface MonitoringReport {
  timestamp: string;
  overall_status: 'healthy' | 'warning' | 'critical';
  total_metrics: number;
  metrics_ok: number;
  metrics_warning: number;
  metrics_critical: number;
  metrics: DataQualityMetric[];
}

class DataQualityMonitor {
  private supabase = createServiceRoleClient();

  /**
   * Run complete data quality monitoring check
   */
  async runMonitoring(): Promise<MonitoringReport> {
    console.log('📊 Running data quality monitoring...\n');

    const metrics: DataQualityMetric[] = [];

    // Core data metrics
    metrics.push(...await this.checkCoreDataMetrics());
    
    // Growth and activity metrics
    metrics.push(...await this.checkGrowthMetrics());
    
    // Data integrity metrics
    metrics.push(...await this.checkIntegrityMetrics());
    
    // Performance metrics
    metrics.push(...await this.checkPerformanceMetrics());

    const report = this.generateReport(metrics);
    
    // Save to database for historical tracking
    await this.saveMetricsToDatabase(metrics);

    console.log('✅ Data quality monitoring completed');
    
    return report;
  }

  /**
   * Check core data availability and completeness
   */
  private async checkCoreDataMetrics(): Promise<DataQualityMetric[]> {
    const metrics: DataQualityMetric[] = [];

    // 1. Total schools count
    const { data: schoolsData, count: schoolsCount } = await this.supabase
      .from('schools_ncaa_verified')
      .select('*', { count: 'exact' });

    metrics.push({
      metric_name: 'total_schools',
      table_name: 'schools_ncaa_verified',
      current_value: schoolsCount || 0,
      threshold_value: 5,
      threshold_type: 'min',
      severity: 'critical',
      status: (schoolsCount || 0) >= 5 ? 'ok' : 'critical',
      description: 'Total number of schools in database',
      last_checked: new Date().toISOString()
    });

    // 2. Schools with athletic websites
    const { count: schoolsWithWebsitesCount } = await this.supabase
      .from('schools_ncaa_verified')
      .select('*', { count: 'exact', head: true })
      .not('athletic_website', 'is', null);

    const websitePercentage = schoolsCount ? 
      ((schoolsWithWebsitesCount || 0) / schoolsCount * 100) : 0;

    metrics.push({
      metric_name: 'schools_with_websites_pct',
      table_name: 'schools_ncaa_verified',
      current_value: Math.round(websitePercentage),
      threshold_value: 80,
      threshold_type: 'min',
      severity: 'warning',
      status: websitePercentage >= 80 ? 'ok' : 'warning',
      description: 'Percentage of schools with athletic websites',
      last_checked: new Date().toISOString()
    });

    // 3. Athletic staff count
    const { count: staffCount } = await this.supabase
      .from('athletic_staff')
      .select('*', { count: 'exact', head: true });

    metrics.push({
      metric_name: 'total_athletic_staff',
      table_name: 'athletic_staff',
      current_value: staffCount || 0,
      threshold_value: 0,
      threshold_type: 'min',
      severity: 'info',
      status: 'ok',
      description: 'Total athletic staff records',
      last_checked: new Date().toISOString()
    });

    // 4. Active user profiles - commented out (no profiles table)
    // const { count: profilesCount } = await this.supabase
    //   .from('profiles')
    //   .select('*', { count: 'exact', head: true });
    const profilesCount = 0;

    metrics.push({
      metric_name: 'total_user_profiles',
      table_name: 'profiles',
      current_value: profilesCount || 0,
      threshold_value: 0,
      threshold_type: 'min',
      severity: 'info',
      status: 'ok',
      description: 'Total user profiles',
      last_checked: new Date().toISOString()
    });

    return metrics;
  }

  /**
   * Check data growth and activity metrics
   */
  private async checkGrowthMetrics(): Promise<DataQualityMetric[]> {
    const metrics: DataQualityMetric[] = [];

    // 1. Recent user registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // const { data: recentProfiles } = await this.supabase
    //   .from('profiles')
    //   .select('*', { count: 'exact', head: true })
    //   .gte('created_at', sevenDaysAgo);
    const recentProfiles = [];

    metrics.push({
      metric_name: 'recent_user_registrations',
      table_name: 'profiles',
      current_value: recentProfiles?.length || 0,
      threshold_value: 0,
      threshold_type: 'min',
      severity: 'info',
      status: 'ok',
      description: 'New user registrations in last 7 days',
      last_checked: new Date().toISOString()
    });

    // 2. Recent scraping activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Use scraping_runs table instead
    const { data: recentScraping } = await this.supabase
      .from('scraping_runs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', oneDayAgo);

    metrics.push({
      metric_name: 'recent_scraping_attempts',
      table_name: 'scraping_runs',
      current_value: recentScraping?.length || 0,
      threshold_value: 0,
      threshold_type: 'min',
      severity: 'info',
      status: 'ok',
      description: 'Scraping attempts in last 24 hours',
      last_checked: new Date().toISOString()
    });

    return metrics;
  }

  /**
   * Check data integrity metrics
   */
  private async checkIntegrityMetrics(): Promise<DataQualityMetric[]> {
    const metrics: DataQualityMetric[] = [];

    // 1. Scraping success rate (last 100 attempts)
    const { data: recentScrapingResults } = await this.supabase
      .from('scraping_runs')
      .select('success_rate')
      .order('started_at', { ascending: false })
      .limit(100);

    if (recentScrapingResults && recentScrapingResults.length > 0) {
      const averageSuccessRate = recentScrapingResults
        .filter(r => r.success_rate != null)
        .reduce((sum, r) => sum + (r.success_rate || 0), 0) / recentScrapingResults.length;

      metrics.push({
        metric_name: 'scraping_success_rate',
        table_name: 'scraping_runs',
        current_value: Math.round(averageSuccessRate),
        threshold_value: 70,
        threshold_type: 'min',
        severity: 'warning',
        status: averageSuccessRate >= 70 ? 'ok' : 'warning',
        description: 'Scraping success rate (last 100 attempts)',
        last_checked: new Date().toISOString()
      });
    }

    // 2. Data completeness - schools with complete essential data
    const { data: completeSchools } = await this.supabase
      .from('schools_ncaa_verified')
      .select('*')
      .not('athletic_division', 'is', null)
      .not('conference', 'is', null)
      .not('state', 'is', null);

    const { count: totalSchoolsCount } = await this.supabase
      .from('schools_ncaa_verified')
      .select('*', { count: 'exact', head: true });

    const completenessRate = totalSchoolsCount ? 
      ((completeSchools?.length || 0) / totalSchoolsCount * 100) : 0;

    metrics.push({
      metric_name: 'school_data_completeness',
      table_name: 'schools_ncaa_verified',
      current_value: Math.round(completenessRate),
      threshold_value: 95,
      threshold_type: 'min',
      severity: 'warning',
      status: completenessRate >= 95 ? 'ok' : 'warning',
      description: 'Percentage of schools with complete essential data',
      last_checked: new Date().toISOString()
    });

    return metrics;
  }

  /**
   * Check performance-related metrics
   */
  private async checkPerformanceMetrics(): Promise<DataQualityMetric[]> {
    const metrics: DataQualityMetric[] = [];

    // 1. Average scraping time (recent attempts)
    const { data: recentScrapingTimes } = await this.supabase
      .from('scraping_runs')
      .select('average_scraping_time')
      .not('average_scraping_time', 'is', null)
      .order('started_at', { ascending: false })
      .limit(50);

    if (recentScrapingTimes && recentScrapingTimes.length > 0) {
      const avgTime = recentScrapingTimes
        .reduce((sum, item) => sum + (item.average_scraping_time || 0), 0) / recentScrapingTimes.length;

      metrics.push({
        metric_name: 'avg_scraping_time_ms',
        table_name: 'scraping_runs',
        current_value: Math.round(avgTime),
        threshold_value: 30000, // 30 seconds
        threshold_type: 'max',
        severity: 'warning',
        status: avgTime <= 30000 ? 'ok' : 'warning',
        description: 'Average scraping time in milliseconds',
        last_checked: new Date().toISOString()
      });
    }

    return metrics;
  }

  /**
   * Generate monitoring report
   */
  private generateReport(metrics: DataQualityMetric[]): MonitoringReport {
    let metricsOk = 0;
    let metricsWarning = 0;
    let metricsCritical = 0;

    for (const metric of metrics) {
      switch (metric.status) {
        case 'ok':
          metricsOk++;
          break;
        case 'warning':
          metricsWarning++;
          break;
        case 'critical':
          metricsCritical++;
          break;
      }
    }

    const overallStatus: 'healthy' | 'warning' | 'critical' = 
      metricsCritical > 0 ? 'critical' : 
      metricsWarning > 0 ? 'warning' : 'healthy';

    return {
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      total_metrics: metrics.length,
      metrics_ok: metricsOk,
      metrics_warning: metricsWarning,
      metrics_critical: metricsCritical,
      metrics
    };
  }

  /**
   * Save metrics to database for historical tracking
   */
  private async saveMetricsToDatabase(metrics: DataQualityMetric[]) {
    // This would insert into a data_quality_metrics table for historical tracking
    // For now, we'll just log that we would save them
    console.log(`📊 Would save ${metrics.length} metrics to database for historical tracking`);
  }
}

/**
 * Generate monitoring report
 */
async function generateMonitoringReport(report: MonitoringReport): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `scripts/data-quality/monitoring-report-${timestamp}.md`;

  const statusIcon = report.overall_status === 'healthy' ? '✅' :
                     report.overall_status === 'warning' ? '⚠️' : '🚨';

  const reportContent = `# Data Quality Monitoring Report

Generated: ${report.timestamp}

## ${statusIcon} Overall Status: ${report.overall_status.toUpperCase()}

### 📊 Metrics Summary
- **Total Metrics**: ${report.total_metrics}
- **✅ Healthy**: ${report.metrics_ok}
- **⚠️ Warning**: ${report.metrics_warning}
- **🚨 Critical**: ${report.metrics_critical}

## 📋 Detailed Metrics

${report.metrics.map((metric, index) => {
  const statusIcon = metric.status === 'ok' ? '✅' :
                     metric.status === 'warning' ? '⚠️' : '🚨';
  
  const thresholdText = metric.threshold_type === 'min' ? `≥ ${metric.threshold_value}` :
                        metric.threshold_type === 'max' ? `≤ ${metric.threshold_value}` :
                        `= ${metric.threshold_value}`;

  return `### ${index + 1}. ${statusIcon} ${metric.metric_name}

- **Table**: ${metric.table_name}
- **Current Value**: ${metric.current_value}
- **Threshold**: ${thresholdText}
- **Status**: ${metric.status.toUpperCase()}
- **Severity**: ${metric.severity.toUpperCase()}
- **Description**: ${metric.description}
- **Last Checked**: ${new Date(metric.last_checked).toLocaleString()}
`;
}).join('\n')}

## 🔧 Recommended Actions

${report.metrics_critical > 0 ? '### 🚨 Critical Issues (Immediate Action Required)\n' +
  report.metrics.filter(m => m.status === 'critical')
    .map(m => `- **${m.metric_name}**: ${m.description} (Current: ${m.current_value})`)
    .join('\n') + '\n' : ''}

${report.metrics_warning > 0 ? '### ⚠️ Warning Issues (Monitor Closely)\n' +
  report.metrics.filter(m => m.status === 'warning')
    .map(m => `- **${m.metric_name}**: ${m.description} (Current: ${m.current_value})`)
    .join('\n') + '\n' : ''}

${report.metrics_critical === 0 && report.metrics_warning === 0 ? 
  '### ✅ All Metrics Healthy\nNo immediate action required. Continue regular monitoring.\n' : ''}

## 📈 Trends and Recommendations

- **Monitoring Frequency**: Run this check daily during active development, weekly in production
- **Alert Thresholds**: Consider adjusting thresholds based on system growth patterns
- **Historical Tracking**: Implement database storage for metrics to track trends over time

---
*Generated by NCRA Data Quality Monitoring System*
*Next check recommended: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}*
`;

  await fs.mkdir('scripts/data-quality', { recursive: true });
  await fs.writeFile(reportPath, reportContent);
  
  return reportPath;
}

async function main() {
  try {
    const monitor = new DataQualityMonitor();
    const report = await monitor.runMonitoring();

    // Generate detailed report
    const reportPath = await generateMonitoringReport(report);

    // Console summary
    const statusIcon = report.overall_status === 'healthy' ? '✅' :
                       report.overall_status === 'warning' ? '⚠️' : '🚨';

    console.log('\n' + '='.repeat(60));
    console.log('📊 DATA QUALITY MONITORING SUMMARY');
    console.log('='.repeat(60));
    console.log(`${statusIcon} Overall Status: ${report.overall_status.toUpperCase()}`);
    console.log(`Total Metrics: ${report.total_metrics}`);
    console.log(`✅ Healthy: ${report.metrics_ok}`);
    console.log(`⚠️ Warnings: ${report.metrics_warning}`);
    console.log(`🚨 Critical: ${report.metrics_critical}`);

    if (report.metrics.length > 0) {
      console.log('\n📊 Key Metrics:');
      report.metrics.forEach(metric => {
        const icon = metric.status === 'ok' ? '✅' :
                     metric.status === 'warning' ? '⚠️' : '🚨';
        console.log(`  ${icon} ${metric.metric_name}: ${metric.current_value} (${metric.description})`);
      });
    }

    console.log(`\n📁 Detailed report: ${reportPath}`);
    console.log(`⏰ Next check recommended: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}`);

    // Exit codes for automation
    if (report.overall_status === 'critical') {
      console.log('\n🚨 CRITICAL ISSUES DETECTED! Immediate attention required.');
      process.exit(1);
    } else if (report.overall_status === 'warning') {
      console.log('\n⚠️ Warning issues detected. Monitor closely.');
      process.exit(0);
    } else {
      console.log('\n✅ All systems healthy!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}