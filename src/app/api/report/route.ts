import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ReportData {
  userKey: string;
  currentAqi: number;
  currentLocation: string;
  currentPm25?: number;
  currentNo2?: number;
  currentCo?: number;
  currentO3?: number;
  currentSo2?: number;
  stats?: {
    last24h?: { avgAqi: number; count: number; minAqi: number; maxAqi: number };
    last7d?: { avgAqi: number; count: number; minAqi: number; maxAqi: number; locations: number };
    last30d?: { avgAqi: number; count: number; locations: number };
    total?: { count: number };
  };
  hourlyData?: Array<{
    hour: string;
    displayLabel: string;
    fullLabel: string;
    aqi: number;
    pm25: number | null;
    no2: number | null;
  }>;
  locationComparison?: Array<{
    locationName: string;
    avgAqi: number;
    minAqi: number;
    maxAqi: number;
    readings: number;
  }>;
  timeRange: string;
}

interface ReportSection {
  title: string;
  content: string;
}

interface AIReportResponse {
  executiveSummary: string;
  currentConditions: ReportSection;
  historicalAnalysis: ReportSection;
  hourlyTrends: ReportSection;
  locationComparison: ReportSection;
  healthRecommendations: ReportSection;
  conclusion: string;
}

const config: AIConfig = {
  baseUrl: process.env.OPENAI_BASE_URL || process.env.GEMINI_BASE_URL || 'https://apipro.maynor1024.live',
  apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '',
  model: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || 'gemini-3-pro-preview-11-2025'
};

const openai = new OpenAI({
  apiKey: config.apiKey,
  baseURL: `${config.baseUrl}/v1`,
  timeout: 60000,
  maxRetries: 2,
});

function getAqiCategory(aqi: number): { label: string; color: string; description: string } {
  if (aqi <= 50) return { 
    label: 'Good', 
    color: '#22c55e',
    description: 'Air quality is satisfactory, and air pollution poses little or no risk.'
  };
  if (aqi <= 100) return { 
    label: 'Moderate', 
    color: '#eab308',
    description: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.'
  };
  if (aqi <= 150) return { 
    label: 'Unhealthy for Sensitive Groups', 
    color: '#f97316',
    description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.'
  };
  if (aqi <= 200) return { 
    label: 'Unhealthy', 
    color: '#ef4444',
    description: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.'
  };
  if (aqi <= 300) return { 
    label: 'Very Unhealthy', 
    color: '#8b5cf6',
    description: 'Health alert: The risk of health effects is increased for everyone.'
  };
  return { 
    label: 'Hazardous', 
    color: '#991b1b',
    description: 'Health warning of emergency conditions: everyone is more likely to be affected.'
  };
}

function generateReportPrompt(data: ReportData): string {
  const category = getAqiCategory(data.currentAqi);
  const now = new Date();
  
  return `You are an expert environmental health analyst. Generate a comprehensive, professional Air Quality Report based on the following data.

CURRENT CONDITIONS:
- Location: ${data.currentLocation}
- Current AQI: ${data.currentAqi} (${category.label})
- PM2.5: ${data.currentPm25 ?? 'N/A'} µg/m³
- NO₂: ${data.currentNo2 ?? 'N/A'} ppb
- CO: ${data.currentCo ?? 'N/A'} ppm
- O₃: ${data.currentO3 ?? 'N/A'} ppb
- SO₂: ${data.currentSo2 ?? 'N/A'} ppb
- Report Generated: ${now.toLocaleString()}

STATISTICAL SUMMARY (${data.timeRange}):
${data.stats?.last24h ? `- Last 24 Hours: Avg AQI ${data.stats.last24h.avgAqi}, Range ${data.stats.last24h.minAqi}-${data.stats.last24h.maxAqi}, ${data.stats.last24h.count} readings` : '- Last 24 Hours: No data'}
${data.stats?.last7d ? `- Last 7 Days: Avg AQI ${data.stats.last7d.avgAqi}, Range ${data.stats.last7d.minAqi}-${data.stats.last7d.maxAqi}, ${data.stats.last7d.locations} locations monitored` : '- Last 7 Days: No data'}
${data.stats?.last30d ? `- Last 30 Days: Avg AQI ${data.stats.last30d.avgAqi}, ${data.stats.last30d.locations} locations` : '- Last 30 Days: No data'}
${data.stats?.total ? `- Total Readings in Database: ${data.stats.total.count}` : ''}

HOURLY DATA (Recent ${data.hourlyData?.length || 0} hours):
${data.hourlyData?.slice(0, 12).map(h => `  ${h.fullLabel}: AQI ${h.aqi}${h.pm25 ? `, PM2.5 ${h.pm25}` : ''}`).join('\n') || 'No hourly data available'}

LOCATION COMPARISON:
${data.locationComparison?.map(loc => `  ${loc.locationName}: Avg AQI ${loc.avgAqi} (${loc.minAqi}-${loc.maxAqi}), ${loc.readings} readings`).join('\n') || 'No location comparison data'}

Generate a professional report with the following JSON structure. Be specific, data-driven, and provide actionable insights:

{
  "executiveSummary": "<2-3 paragraph executive summary of overall air quality status, key findings, and primary recommendations>",
  "currentConditions": {
    "title": "Current Air Quality Assessment",
    "content": "<Detailed analysis of current pollutant levels, what they mean for health, and immediate recommendations. Include specific numbers and comparisons to WHO guidelines.>"
  },
  "historicalAnalysis": {
    "title": "Historical Trends Analysis",
    "content": "<Analysis of 24h, 7d, 30d trends. Identify patterns, improvements or deterioration. Compare current to historical averages.>"
  },
  "hourlyTrends": {
    "title": "Hourly Pattern Analysis",
    "content": "<Analysis of hourly patterns. Identify peak pollution hours, best times for outdoor activities, and any concerning spikes.>"
  },
  "locationComparison": {
    "title": "Location-Based Analysis",
    "content": "<Compare air quality across monitored locations. Identify hotspots, cleanest areas, and factors that might explain differences.>"
  },
  "healthRecommendations": {
    "title": "Health & Safety Recommendations",
    "content": "<Specific health recommendations for general population, sensitive groups (children, elderly, respiratory conditions), outdoor workers, and athletes. Include indoor/outdoor activity guidance.>"
  },
  "conclusion": "<Brief conclusion with key takeaways and outlook>"
}

Respond with ONLY the JSON object, no markdown code blocks.`;
}

function parseAIResponse(content: string): AIReportResponse | null {
  try {
    let jsonStr = content;
    
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Find JSON object
    const jsonStartIndex = jsonStr.indexOf('{');
    const jsonEndIndex = jsonStr.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

function generateFallbackReport(data: ReportData): AIReportResponse {
  const category = getAqiCategory(data.currentAqi);
  
  return {
    executiveSummary: `This Air Quality Report provides a comprehensive analysis of air quality conditions for ${data.currentLocation}. The current Air Quality Index (AQI) stands at ${data.currentAqi}, classified as "${category.label}". ${category.description}\n\nBased on the collected data over the ${data.timeRange} period, this report analyzes current pollutant levels, historical trends, and provides health recommendations tailored to different population groups.`,
    currentConditions: {
      title: "Current Air Quality Assessment",
      content: `The current AQI of ${data.currentAqi} indicates ${category.label.toLowerCase()} air quality conditions. PM2.5 levels are at ${data.currentPm25 ?? 'N/A'} µg/m³, NO₂ at ${data.currentNo2 ?? 'N/A'} ppb, and CO at ${data.currentCo ?? 'N/A'} ppm. ${data.currentAqi <= 50 ? 'These levels are within acceptable ranges for most outdoor activities.' : data.currentAqi <= 100 ? 'Sensitive individuals should consider limiting prolonged outdoor exposure.' : 'Significant health precautions are recommended for outdoor activities.'}`
    },
    historicalAnalysis: {
      title: "Historical Trends Analysis",
      content: `Over the past 24 hours, the average AQI was ${data.stats?.last24h?.avgAqi ?? 'N/A'} with readings ranging from ${data.stats?.last24h?.minAqi ?? 'N/A'} to ${data.stats?.last24h?.maxAqi ?? 'N/A'}. The 7-day average AQI of ${data.stats?.last7d?.avgAqi ?? 'N/A'} across ${data.stats?.last7d?.locations ?? 0} monitored locations provides context for longer-term air quality patterns in the region.`
    },
    hourlyTrends: {
      title: "Hourly Pattern Analysis",
      content: `Analysis of ${data.hourlyData?.length ?? 0} hourly readings reveals air quality fluctuations throughout the day. ${data.hourlyData && data.hourlyData.length > 0 ? `Recent readings show AQI values ranging from the recorded data points.` : 'Insufficient hourly data for detailed pattern analysis.'} Peak pollution hours typically coincide with morning and evening rush hours.`
    },
    locationComparison: {
      title: "Location-Based Analysis",
      content: `${data.locationComparison && data.locationComparison.length > 0 ? `Data from ${data.locationComparison.length} monitored locations shows varying air quality levels. ${data.locationComparison[0]?.locationName} recorded an average AQI of ${data.locationComparison[0]?.avgAqi}.` : 'Location comparison data is currently limited. Continue monitoring to build a comprehensive location-based analysis.'}`
    },
    healthRecommendations: {
      title: "Health & Safety Recommendations",
      content: `Based on current AQI of ${data.currentAqi} (${category.label}):\n\n• General Population: ${data.currentAqi <= 50 ? 'Normal outdoor activities are safe.' : data.currentAqi <= 100 ? 'Unusually sensitive individuals should consider reducing prolonged outdoor exertion.' : 'Reduce prolonged outdoor exertion.'}\n• Sensitive Groups (elderly, children, respiratory conditions): ${data.currentAqi <= 50 ? 'No special precautions needed.' : 'Limit outdoor activities and keep rescue medications accessible.'}\n• Outdoor Workers: ${data.currentAqi <= 100 ? 'Standard precautions apply.' : 'Consider wearing N95 masks and take regular breaks indoors.'}\n• Athletes: ${data.currentAqi <= 50 ? 'Conditions are favorable for outdoor exercise.' : 'Consider indoor alternatives or reduce intensity of outdoor workouts.'}`
    },
    conclusion: `This report provides a snapshot of air quality conditions for ${data.currentLocation} based on ${data.stats?.total?.count ?? 0} total readings. Continued monitoring and data collection will improve the accuracy of trend analysis and location comparisons. For the most current conditions, please refer to real-time monitoring data.`
  };
}

function generateHTMLReport(data: ReportData, aiReport: AIReportResponse): string {
  const category = getAqiCategory(data.currentAqi);
  const now = new Date();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Air Quality Report - ${data.currentLocation}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 40px;
    }
    
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    
    .report-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .report-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .report-header .subtitle {
      font-size: 14px;
      opacity: 0.8;
    }
    
    .report-header .location {
      font-size: 18px;
      margin-top: 16px;
      padding: 8px 20px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      display: inline-block;
    }
    
    .aqi-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding: 16px 32px;
      background: white;
      border-radius: 12px;
      color: #1e293b;
    }
    
    .aqi-value {
      font-size: 48px;
      font-weight: 700;
      color: ${category.color};
    }
    
    .aqi-info {
      text-align: left;
    }
    
    .aqi-label {
      font-size: 18px;
      font-weight: 600;
      color: ${category.color};
    }
    
    .aqi-category {
      font-size: 12px;
      color: #64748b;
    }
    
    .report-meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 20px;
      font-size: 12px;
      opacity: 0.7;
    }
    
    .report-content {
      padding: 40px;
    }
    
    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .section-content {
      font-size: 14px;
      color: #475569;
      white-space: pre-wrap;
    }
    
    .executive-summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 24px;
      border-radius: 12px;
      border-left: 4px solid #0ea5e9;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    
    .stat-card {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .pollutant-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    
    .pollutant-card {
      background: #f1f5f9;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    
    .pollutant-name {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    
    .pollutant-value {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 4px;
    }
    
    .pollutant-unit {
      font-size: 10px;
      color: #94a3b8;
    }
    
    .hourly-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin: 16px 0;
    }
    
    .hourly-table th {
      background: #f1f5f9;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #475569;
    }
    
    .hourly-table td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .aqi-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      color: white;
      font-size: 11px;
    }
    
    .report-footer {
      background: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    
    .disclaimer {
      font-style: italic;
      margin-top: 8px;
      font-size: 11px;
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .report-container {
        box-shadow: none;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>🌬️ Air Quality Report</h1>
      <p class="subtitle">Comprehensive Environmental Health Analysis</p>
      <div class="location">📍 ${data.currentLocation}</div>
      
      <div class="aqi-badge">
        <span class="aqi-value">${data.currentAqi}</span>
        <div class="aqi-info">
          <div class="aqi-label">${category.label}</div>
          <div class="aqi-category">Air Quality Index</div>
        </div>
      </div>
      
      <div class="report-meta">
        <span>📅 ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span>🕐 ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>📊 ${data.timeRange} Analysis</span>
      </div>
    </div>
    
    <div class="report-content">
      <!-- Current Pollutant Levels -->
      <div class="pollutant-grid">
        <div class="pollutant-card">
          <div class="pollutant-name">PM2.5</div>
          <div class="pollutant-value">${data.currentPm25 ?? '—'}</div>
          <div class="pollutant-unit">µg/m³</div>
        </div>
        <div class="pollutant-card">
          <div class="pollutant-name">NO₂</div>
          <div class="pollutant-value">${data.currentNo2 ?? '—'}</div>
          <div class="pollutant-unit">ppb</div>
        </div>
        <div class="pollutant-card">
          <div class="pollutant-name">CO</div>
          <div class="pollutant-value">${data.currentCo ?? '—'}</div>
          <div class="pollutant-unit">ppm</div>
        </div>
        <div class="pollutant-card">
          <div class="pollutant-name">O₃</div>
          <div class="pollutant-value">${data.currentO3 ?? '—'}</div>
          <div class="pollutant-unit">ppb</div>
        </div>
        <div class="pollutant-card">
          <div class="pollutant-name">SO₂</div>
          <div class="pollutant-value">${data.currentSo2 ?? '—'}</div>
          <div class="pollutant-unit">ppb</div>
        </div>
        <div class="pollutant-card">
          <div class="pollutant-name">Total Readings</div>
          <div class="pollutant-value">${data.stats?.total?.count ?? 0}</div>
          <div class="pollutant-unit">data points</div>
        </div>
      </div>
      
      <!-- Statistics Summary -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.stats?.last24h?.avgAqi ?? '—'}</div>
          <div class="stat-label">24h Average AQI</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.stats?.last7d?.avgAqi ?? '—'}</div>
          <div class="stat-label">7 Day Average</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.stats?.last30d?.avgAqi ?? '—'}</div>
          <div class="stat-label">30 Day Average</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.stats?.last7d?.locations ?? 0}</div>
          <div class="stat-label">Locations Monitored</div>
        </div>
      </div>
      
      <!-- Executive Summary -->
      <div class="section">
        <h2 class="section-title">📋 Executive Summary</h2>
        <div class="executive-summary">
          <div class="section-content">${aiReport.executiveSummary}</div>
        </div>
      </div>
      
      <!-- Current Conditions -->
      <div class="section">
        <h2 class="section-title">🌡️ ${aiReport.currentConditions.title}</h2>
        <div class="section-content">${aiReport.currentConditions.content}</div>
      </div>
      
      <!-- Historical Analysis -->
      <div class="section">
        <h2 class="section-title">📈 ${aiReport.historicalAnalysis.title}</h2>
        <div class="section-content">${aiReport.historicalAnalysis.content}</div>
      </div>
      
      <!-- Hourly Data Table -->
      ${data.hourlyData && data.hourlyData.length > 0 ? `
      <div class="section">
        <h2 class="section-title">⏰ ${aiReport.hourlyTrends.title}</h2>
        <div class="section-content">${aiReport.hourlyTrends.content}</div>
        <table class="hourly-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>AQI</th>
              <th>PM2.5</th>
              <th>NO₂</th>
            </tr>
          </thead>
          <tbody>
            ${data.hourlyData.slice(0, 12).map(h => `
              <tr>
                <td>${h.fullLabel}</td>
                <td><span class="aqi-pill" style="background: ${getAqiCategory(h.aqi).color}">${h.aqi}</span></td>
                <td>${h.pm25 ?? '—'}</td>
                <td>${h.no2 ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Location Comparison -->
      ${data.locationComparison && data.locationComparison.length > 0 ? `
      <div class="section">
        <h2 class="section-title">📍 ${aiReport.locationComparison.title}</h2>
        <div class="section-content">${aiReport.locationComparison.content}</div>
        <table class="hourly-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Avg AQI</th>
              <th>Range</th>
              <th>Readings</th>
            </tr>
          </thead>
          <tbody>
            ${data.locationComparison.slice(0, 8).map(loc => `
              <tr>
                <td>${loc.locationName}</td>
                <td><span class="aqi-pill" style="background: ${getAqiCategory(loc.avgAqi).color}">${loc.avgAqi}</span></td>
                <td>${loc.minAqi} - ${loc.maxAqi}</td>
                <td>${loc.readings}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Health Recommendations -->
      <div class="section">
        <h2 class="section-title">💚 ${aiReport.healthRecommendations.title}</h2>
        <div class="section-content">${aiReport.healthRecommendations.content}</div>
      </div>
      
      <!-- Conclusion -->
      <div class="section">
        <h2 class="section-title">🎯 Conclusion</h2>
        <div class="section-content">${aiReport.conclusion}</div>
      </div>
    </div>
    
    <div class="report-footer">
      <p>Generated by <strong>Air Quality Passport</strong> — Your Personal Air Quality Companion</p>
      <p class="disclaimer">This report is for informational purposes only. For health concerns, please consult a medical professional.</p>
      <p style="margin-top: 8px;">Data Sources: DOE Malaysia, WAQI • Report ID: ${data.userKey.slice(-8)}-${Date.now().toString(36)}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportData = await request.json();
    
    if (!body.userKey || !body.currentLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: userKey and currentLocation' },
        { status: 400 }
      );
    }
    
    // Generate AI report content
    let aiReport: AIReportResponse;
    
    try {
      const prompt = generateReportPrompt(body);
      
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert environmental health analyst. Generate detailed, professional air quality reports with specific, data-driven insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      
      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = parseAIResponse(content);
        if (parsed) {
          aiReport = parsed;
        } else {
          aiReport = generateFallbackReport(body);
        }
      } else {
        aiReport = generateFallbackReport(body);
      }
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      aiReport = generateFallbackReport(body);
    }
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(body, aiReport);
    
    return new NextResponse(htmlReport, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="air-quality-report-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
