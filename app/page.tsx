import React from 'react';

export default function HomePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>🏈 School Stats Platform</h1>
        <p style={{ color: '#666', fontSize: '18px' }}>
          NCAA Athletic Program Data Collection & API Service
        </p>
      </header>

      <main>
        <section style={{ marginBottom: '40px' }}>
          <h2>🚀 API Endpoints</h2>
          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
            <h3>Authentication Required</h3>
            <p>Include API key in Authorization header:</p>
            <code style={{ background: '#e0e0e0', padding: '4px 8px', borderRadius: '4px' }}>
              Authorization: Bearer your-api-key
            </code>
            
            <h3 style={{ marginTop: '20px' }}>Test Keys</h3>
            <ul>
              <li><strong>Read-only:</strong> <code>school_stats_test_key_12345678901234567890</code></li>
              <li><strong>Admin:</strong> <code>school_stats_admin_key_98765432109876543210</code></li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2>📚 API Documentation</h2>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
              <h3>GET /api/schools</h3>
              <p>Get all NCAA schools with optional filtering</p>
              <code style={{ background: '#f9f9f9', padding: '10px', display: 'block', borderRadius: '4px' }}>
                GET /api/schools?conference=SEC&state=Alabama
              </code>
            </div>

            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
              <h3>GET /api/schools/[id]/staff</h3>
              <p>Get athletic staff for a specific school</p>
              <code style={{ background: '#f9f9f9', padding: '10px', display: 'block', borderRadius: '4px' }}>
                GET /api/schools/8/staff?sport=Football&title=head-coach
              </code>
            </div>

            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
              <h3>GET /api/staff/search</h3>
              <p>Search coaches across all schools</p>
              <code style={{ background: '#f9f9f9', padding: '10px', display: 'block', borderRadius: '4px' }}>
                GET /api/staff/search?name=john&sport=basketball
              </code>
            </div>

            <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
              <h3>POST /api/admin/scrape</h3>
              <p>Trigger data scraping (Admin only)</p>
              <code style={{ background: '#f9f9f9', padding: '10px', display: 'block', borderRadius: '4px' }}>
                POST /api/admin/scrape<br />
                {JSON.stringify({ method: "hybrid", school_ids: [8, 15, 23] })}
              </code>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2>🎯 Features</h2>
          <ul style={{ fontSize: '16px', lineHeight: '1.8' }}>
            <li><strong>Hybrid Scraping System:</strong> Firecrawl + Puppeteer for maximum coverage</li>
            <li><strong>Anti-Bot Evasion:</strong> Advanced techniques for blocked major programs</li>
            <li><strong>Real-time Data Quality:</strong> Continuous monitoring and validation</li>
            <li><strong>Comprehensive Coverage:</strong> 27+ NCAA Division I schools</li>
            <li><strong>Contact Information:</strong> Email and phone extraction when available</li>
            <li><strong>Rate Limiting:</strong> Built-in API protection and usage tracking</li>
          </ul>
        </section>

        <section>
          <h2>📊 Data Coverage</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4>Scraping Success Rates</h4>
              <ul>
                <li>Small/Mid Schools: 90%+ (Firecrawl)</li>
                <li>Major Programs: 75%+ (Puppeteer)</li>
                <li>Overall Hybrid: ~87% expected</li>
              </ul>
            </div>
            <div>
              <h4>Data Quality Targets</h4>
              <ul>
                <li>Name Accuracy: 95%+</li>
                <li>Contact Coverage: 60%+</li>
                <li>Sport Classification: 90%+</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', marginTop: '60px', padding: '20px', borderTop: '1px solid #eee' }}>
        <p style={{ color: '#888' }}>
          School Stats Platform - Dedicated NCAA Athletic Data Service
        </p>
        <p style={{ color: '#888', fontSize: '14px' }}>
          See <a href="https://github.com/your-repo/school-stats" style={{ color: '#0066cc' }}>README.md</a> for complete documentation
        </p>
      </footer>
    </div>
  );
}