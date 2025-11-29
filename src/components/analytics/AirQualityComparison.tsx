'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './AirQualityComparison.css';

// Types for Convex query results
interface DailyAverage {
  date: string;
  avgAqi: number;
  avgPm25: number | null;
  avgNo2: number | null;
  readings: number;
}

interface LocationComparison {
  locationName: string;
  avgAqi: number;
  minAqi: number;
  maxAqi: number;
  readings: number;
}

// Types for processed chart data
interface TrendDataPoint {
  date: string;
  fullDate: string;
  aqi: number;
  pm25: number | null;
  no2: number | null;
  readings: number;
}

interface ComparisonDataPoint {
  name: string;
  fullName: string;
  avgAqi: number;
  minAqi: number;
  maxAqi: number;
  readings: number;
}

interface TrendDay {
  day: string;
  average: number;
  samples: number;
}

interface AirQualityComparisonProps {
  userKey: string;
  currentAqi?: number;
  currentLocation?: string;
  currentLat?: number;
  currentLng?: number;
  currentPm25?: number;
  currentNo2?: number;
  currentSource?: string;
  passportTrend?: TrendDay[];
  passportSampleCount?: number;
}

type TimeRange = '24h' | '7d' | '30d';
type ChartType = 'trend' | 'comparison' | 'distribution';

const AQI_COLORS = {
  good: '#22c55e',
  moderate: '#eab308', 
  unhealthySensitive: '#f97316',
  unhealthy: '#ef4444',
  veryUnhealthy: '#8b5cf6',
  hazardous: '#991b1b',
};

const getAqiCategory = (aqi: number) => {
  if (aqi <= 50) return { label: 'Good', color: AQI_COLORS.good };
  if (aqi <= 100) return { label: 'Moderate', color: AQI_COLORS.moderate };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: AQI_COLORS.unhealthySensitive };
  if (aqi <= 200) return { label: 'Unhealthy', color: AQI_COLORS.unhealthy };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: AQI_COLORS.veryUnhealthy };
  return { label: 'Hazardous', color: AQI_COLORS.hazardous };
};

const getAqiColor = (aqi: number) => getAqiCategory(aqi).color;

export default function AirQualityComparison({
  userKey,
  currentAqi,
  currentLocation,
  currentLat,
  currentLng,
  currentPm25,
  currentNo2,
  currentSource,
  passportTrend,
  passportSampleCount,
}: AirQualityComparisonProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [chartType, setChartType] = useState<ChartType>('trend');
  const [isExpanded, setIsExpanded] = useState(true);

  // Convex queries - using wrapper functions that expose air component
  const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
  
  const dailyAverages = useQuery(api.airHistory.getDailyAverages, { userKey, days }) as DailyAverage[] | undefined;
  const locationComparison = useQuery(api.airHistory.compareLocations, { userKey, days }) as LocationComparison[] | undefined;
  const statsSummary = useQuery(api.airHistory.getStatsSummary, { userKey });
  
  // Mutation to store readings
  const storeReading = useMutation(api.airHistory.storeReading);

  // Store current reading when data is available
  useEffect(() => {
    if (currentAqi && currentLocation && currentLat && currentLng && currentSource) {
      storeReading({
        userKey,
        lat: currentLat,
        lng: currentLng,
        locationName: currentLocation,
        aqi: currentAqi,
        pm25: currentPm25,
        no2: currentNo2,
        source: currentSource,
        riskLevel: getAqiCategory(currentAqi).label.toLowerCase().replace(/ /g, '-'),
      }).catch(console.error);
    }
  }, [currentAqi, currentLocation, currentLat, currentLng, currentSource, currentPm25, currentNo2, userKey, storeReading]);

  // Process data for charts - merge passport trend with air history data
  const trendData: TrendDataPoint[] = useMemo(() => {
    // Create a map to combine data from both sources by date
    const dataByDate: Record<string, TrendDataPoint> = {};
    
    // Add data from dailyAverages (airQualityHistory)
    if (dailyAverages) {
      dailyAverages.forEach((day: DailyAverage) => {
        const dateKey = day.date;
        dataByDate[dateKey] = {
          date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: day.date,
          aqi: day.avgAqi,
          pm25: day.avgPm25,
          no2: day.avgNo2,
          readings: day.readings,
        };
      });
    }
    
    // Merge/override with passport trend data (exposures) - this is the "score" which maps to AQI-like values
    if (passportTrend) {
      passportTrend.forEach((day: TrendDay) => {
        const dateKey = day.day; // format: YYYY-MM-DD
        if (dataByDate[dateKey]) {
          // Combine readings count, but use passport average as it has more samples
          dataByDate[dateKey] = {
            ...dataByDate[dateKey],
            aqi: day.average, // Use passport score as it's more comprehensive
            readings: dataByDate[dateKey].readings + day.samples,
          };
        } else {
          // Add new entry from passport data
          dataByDate[dateKey] = {
            date: new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: day.day,
            aqi: day.average,
            pm25: null,
            no2: null,
            readings: day.samples,
          };
        }
      });
    }
    
    // Sort by date and return
    return Object.values(dataByDate).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [dailyAverages, passportTrend]);

  const comparisonData: ComparisonDataPoint[] = useMemo(() => {
    if (!locationComparison) return [];
    return locationComparison.slice(0, 5).map((loc: LocationComparison) => ({
      name: loc.locationName.length > 15 
        ? loc.locationName.substring(0, 15) + '...' 
        : loc.locationName,
      fullName: loc.locationName,
      avgAqi: loc.avgAqi,
      minAqi: loc.minAqi,
      maxAqi: loc.maxAqi,
      readings: loc.readings,
    }));
  }, [locationComparison]);

  const distributionData = useMemo(() => {
    if (!locationComparison) return [];
    
    const categories = {
      good: 0,
      moderate: 0,
      unhealthy: 0,
    };
    
    locationComparison.forEach((loc: LocationComparison) => {
      if (loc.avgAqi <= 50) categories.good++;
      else if (loc.avgAqi <= 100) categories.moderate++;
      else categories.unhealthy++;
    });
    
    return [
      { name: 'Good (0-50)', value: categories.good, color: AQI_COLORS.good },
      { name: 'Moderate (51-100)', value: categories.moderate, color: AQI_COLORS.moderate },
      { name: 'Unhealthy (100+)', value: categories.unhealthy, color: AQI_COLORS.unhealthy },
    ].filter(d => d.value > 0);
  }, [locationComparison]);

  const stats = statsSummary;

  if (!isExpanded) {
    return (
      <div className="aq-comparison-collapsed">
        <button 
          className="aq-expand-btn"
          onClick={() => setIsExpanded(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3V9H3.01M21 21V15H21.01M3 9C3.5 5.5 6.5 3 10 3C13.5 3 16.5 5.5 17 9M21 15C20.5 18.5 17.5 21 14 21C10.5 21 7.5 18.5 7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9H15V15H9V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Air Quality Analytics</span>
          {stats?.last7d && (
            <span className="aq-mini-stat">
              7d avg: <strong style={{ color: getAqiColor(stats.last7d.avgAqi) }}>{stats.last7d.avgAqi}</strong>
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="aq-comparison-panel">
      {/* Header */}
      <div className="aq-comparison-header">
        <div className="aq-header-left">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Air Quality Analytics
          </h3>
          <p className="aq-subtitle">Historical data and trends</p>
        </div>
        <button 
          className="aq-close-btn"
          onClick={() => setIsExpanded(false)}
          aria-label="Close analytics"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Passport Trend Section - Last 7 Days */}
      {passportTrend && passportTrend.length > 0 && (
        <div className="aq-trend-section">
          <div className="aq-trend-header">
            <div>
              <span className="aq-trend-label">Trend (Last 7 Days)</span>
              <span className="aq-trend-avg">
                Average score: {Math.round(passportTrend.reduce((acc, d) => acc + d.average, 0) / passportTrend.length)}
              </span>
            </div>
            <span className="aq-trend-samples">Samples: {passportSampleCount ?? 0}</span>
          </div>
          <div className="aq-trend-grid">
            {passportTrend.map((day) => (
              <div key={day.day} className="aq-trend-day">
                <span className="aq-trend-day-date">{new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span className="aq-trend-day-value" style={{ color: getAqiColor(day.average) }}>{day.average}</span>
                <span className="aq-trend-day-samples">{day.samples} samples</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="aq-stats-grid">
          <div className="aq-stat-card">
            <span className="aq-stat-label">Last 24h</span>
            {stats.last24h ? (
              <>
                <span className="aq-stat-value" style={{ color: getAqiColor(stats.last24h.avgAqi) }}>
                  {stats.last24h.avgAqi}
                </span>
                <span className="aq-stat-sub">{stats.last24h.count} readings</span>
              </>
            ) : (
              <span className="aq-stat-empty">No data</span>
            )}
          </div>
          <div className="aq-stat-card">
            <span className="aq-stat-label">7 Day Avg</span>
            {stats.last7d ? (
              <>
                <span className="aq-stat-value" style={{ color: getAqiColor(stats.last7d.avgAqi) }}>
                  {stats.last7d.avgAqi}
                </span>
                <span className="aq-stat-sub">
                  {stats.last7d.minAqi} - {stats.last7d.maxAqi} range
                </span>
              </>
            ) : (
              <span className="aq-stat-empty">No data</span>
            )}
          </div>
          <div className="aq-stat-card">
            <span className="aq-stat-label">30 Day Avg</span>
            {stats.last30d ? (
              <>
                <span className="aq-stat-value" style={{ color: getAqiColor(stats.last30d.avgAqi) }}>
                  {stats.last30d.avgAqi}
                </span>
                <span className="aq-stat-sub">{stats.last30d.locations} locations</span>
              </>
            ) : (
              <span className="aq-stat-empty">No data</span>
            )}
          </div>
          <div className="aq-stat-card">
            <span className="aq-stat-label">Total</span>
            {stats.total ? (
              <>
                <span className="aq-stat-value">{stats.total.count}</span>
                <span className="aq-stat-sub">readings stored</span>
              </>
            ) : (
              <span className="aq-stat-empty">No data</span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="aq-controls">
        <div className="aq-time-selector">
          <button 
            className={timeRange === '24h' ? 'active' : ''} 
            onClick={() => setTimeRange('24h')}
          >
            24h
          </button>
          <button 
            className={timeRange === '7d' ? 'active' : ''} 
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </button>
          <button 
            className={timeRange === '30d' ? 'active' : ''} 
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </button>
        </div>
        <div className="aq-chart-selector">
          <button 
            className={chartType === 'trend' ? 'active' : ''} 
            onClick={() => setChartType('trend')}
            title="Trend over time"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className={chartType === 'comparison' ? 'active' : ''} 
            onClick={() => setChartType('comparison')}
            title="Location comparison"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className={chartType === 'distribution' ? 'active' : ''} 
            onClick={() => setChartType('distribution')}
            title="AQI distribution"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 2C12 2 12 12 12 12L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="aq-chart-container">
        {chartType === 'trend' && (
          <div className="aq-chart">
            <h4>AQI Trend</h4>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'aqi') return [value, 'AQI'];
                      if (name === 'pm25') return [value ? `${value} μg/m³` : 'N/A', 'PM2.5'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="aqi" 
                    stroke="#3B82F6" 
                    fill="url(#aqiGradient)"
                    strokeWidth={2}
                    name="AQI"
                  />
                  {trendData.some(d => d.pm25) && (
                    <Line 
                      type="monotone" 
                      dataKey="pm25" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={false}
                      name="PM2.5"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="aq-no-data">
                <p>No data available for this time range</p>
                <p className="aq-no-data-hint">Keep using the app to collect air quality data!</p>
              </div>
            )}
          </div>
        )}

        {chartType === 'comparison' && (
          <div className="aq-chart">
            <h4>Location Comparison</h4>
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    stroke="#9CA3AF"
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [value, 'Avg AQI']}
                    labelFormatter={(label) => {
                      const item = comparisonData.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar 
                    dataKey="avgAqi" 
                    name="Avg AQI"
                    radius={[0, 4, 4, 0]}
                  >
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getAqiColor(entry.avgAqi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="aq-no-data">
                <p>No location data available</p>
                <p className="aq-no-data-hint">Visit different locations to see comparisons!</p>
              </div>
            )}
          </div>
        )}

        {chartType === 'distribution' && (
          <div className="aq-chart">
            <h4>Air Quality Distribution</h4>
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value} locations`, '']}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value) => <span style={{ fontSize: '11px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="aq-no-data">
                <p>No distribution data available</p>
                <p className="aq-no-data-hint">Collect more data to see distribution!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location List */}
      {locationComparison && locationComparison.length > 0 && (
        <div className="aq-location-list">
          <h4>Recent Locations ({timeRange})</h4>
          <div className="aq-locations-scroll">
            {locationComparison.slice(0, 8).map((loc, index) => (
              <div key={index} className="aq-location-item">
                <div className="aq-location-info">
                  <span className="aq-location-name">{loc.locationName}</span>
                  <span className="aq-location-readings">{loc.readings} readings</span>
                </div>
                <div className="aq-location-aqi">
                  <span 
                    className="aq-aqi-badge"
                    style={{ backgroundColor: getAqiColor(loc.avgAqi) }}
                  >
                    {loc.avgAqi}
                  </span>
                  {loc.minAqi !== null && loc.maxAqi !== null && loc.minAqi !== loc.maxAqi && (
                    <span className="aq-aqi-range">
                      {loc.minAqi} - {loc.maxAqi}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
