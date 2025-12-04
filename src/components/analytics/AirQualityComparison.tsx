'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
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
  ReferenceLine,
  Brush,
  ComposedChart,
} from 'recharts';
import './AirQualityComparison.css';
import { formatTimeGMT8, formatDuration } from '@/lib/timeUtils';

// Types for Convex query results
interface DailyAverage {
  date: string;
  avgAqi: number;
  avgPm25: number | null;
  avgNo2: number | null;
  readings: number;
}

interface HourlyAverage {
  hour: string;
  timestamp: number;
  displayHour: string;
  displayDate: string;
  avgAqi: number;
  minAqi: number | null;
  maxAqi: number | null;
  avgPm25: number | null;
  avgNo2: number | null;
  avgCo: number | null;
  avgO3: number | null;
  avgSo2: number | null;
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

interface HourlyDataPoint {
  hour: string;
  displayLabel: string;
  fullLabel: string;
  aqi: number;
  pm25: number | null;
  no2: number | null;
  co: number | null;
  o3: number | null;
  so2: number | null;
  minAqi: number | null;
  maxAqi: number | null;
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
  onAutoRefresh?: () => void;
}

type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d';
type ChartType = 'trend' | 'hourly' | 'comparison' | 'distribution';
type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

const AQI_COLORS = {
  good: '#22c55e',
  moderate: '#eab308', 
  unhealthySensitive: '#f97316',
  unhealthy: '#ef4444',
  veryUnhealthy: '#8b5cf6',
  hazardous: '#991b1b',
};

const AQI_THRESHOLDS = [
  { value: 50, label: 'Good', color: AQI_COLORS.good },
  { value: 100, label: 'Moderate', color: AQI_COLORS.moderate },
  { value: 150, label: 'Unhealthy for Sensitive', color: AQI_COLORS.unhealthySensitive },
  { value: 200, label: 'Unhealthy', color: AQI_COLORS.unhealthy },
  { value: 300, label: 'Very Unhealthy', color: AQI_COLORS.veryUnhealthy },
];

const getAqiCategory = (aqi: number) => {
  if (aqi <= 50) return { label: 'Good', color: AQI_COLORS.good };
  if (aqi <= 100) return { label: 'Moderate', color: AQI_COLORS.moderate };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: AQI_COLORS.unhealthySensitive };
  if (aqi <= 200) return { label: 'Unhealthy', color: AQI_COLORS.unhealthy };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: AQI_COLORS.veryUnhealthy };
  return { label: 'Hazardous', color: AQI_COLORS.hazardous };
};

const getAqiColor = (aqi: number) => getAqiCategory(aqi).color;

// Auto-refresh interval (1 hour in milliseconds)
const AUTO_REFRESH_INTERVAL = 60 * 60 * 1000;

// Custom tooltip for better readability - defined outside component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  
  return (
    <div className="aq-custom-tooltip">
      <p className="aq-tooltip-label">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="aq-tooltip-entry" style={{ color: entry.color }}>
          <span className="aq-tooltip-name">{entry.name}:</span>
          <span className="aq-tooltip-value">
            {entry.value}
            {entry.name === 'AQI' && (
              <span 
                className="aq-tooltip-badge"
                style={{ backgroundColor: getAqiColor(entry.value) }}
              >
                {getAqiCategory(entry.value).label}
              </span>
            )}
          </span>
        </p>
      ))}
    </div>
  );
};

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
  passportSampleCount: _passportSampleCount,
  onAutoRefresh,
}: AirQualityComparisonProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartType, setChartType] = useState<ChartType>('hourly');
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());
  const [nextRefreshTime, setNextRefreshTime] = useState<number>(() => Date.now() + AUTO_REFRESH_INTERVAL);
  const [showPollutantDetails, setShowPollutantDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Suppress unused variable warning
  void _passportSampleCount;

  // Calculate query parameters based on time range
  const getQueryParams = useCallback(() => {
    switch (timeRange) {
      case '1h': return { hours: 1, days: 1 };
      case '6h': return { hours: 6, days: 1 };
      case '12h': return { hours: 12, days: 1 };
      case '24h': return { hours: 24, days: 1 };
      case '7d': return { hours: 168, days: 7 };
      case '30d': return { hours: 720, days: 30 };
      default: return { hours: 24, days: 1 };
    }
  }, [timeRange]);

  const { hours, days } = getQueryParams();
  
  // Convex queries
  const dailyAverages = useQuery(api.airHistory.getDailyAverages, { userKey, days }) as DailyAverage[] | undefined;
  const locationComparison = useQuery(api.airHistory.compareLocations, { userKey, days }) as LocationComparison[] | undefined;
  const statsSummary = useQuery(api.airHistory.getStatsSummary, { userKey });
  const hourlyAverages = useQuery(api.airHistory.getHourlyAverages, { userKey, hours }) as HourlyAverage[] | undefined;
  
  // Mutation to store readings
  const storeReading = useMutation(api.airHistory.storeReading);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const refreshInterval = setInterval(() => {
      setLastRefresh(new Date());
      setNextRefreshTime(Date.now() + AUTO_REFRESH_INTERVAL);
      
      // Trigger parent refresh callback if provided
      if (onAutoRefresh) {
        onAutoRefresh();
      }
    }, AUTO_REFRESH_INTERVAL);

    // Update countdown timer every minute to trigger re-render
    const countdownInterval = setInterval(() => {
      setNextRefreshTime(prev => prev); // Force re-render for countdown
    }, 60000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [autoRefreshEnabled, onAutoRefresh]);

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

  // Process hourly data
  const hourlyData: HourlyDataPoint[] = useMemo(() => {
    if (!hourlyAverages) return [];
    
    let data = hourlyAverages.map((hour: HourlyAverage) => ({
      hour: hour.hour,
      displayLabel: hour.displayHour,
      fullLabel: `${hour.displayDate} ${hour.displayHour}`,
      aqi: hour.avgAqi,
      pm25: hour.avgPm25,
      no2: hour.avgNo2,
      co: hour.avgCo,
      o3: hour.avgO3,
      so2: hour.avgSo2,
      minAqi: hour.minAqi,
      maxAqi: hour.maxAqi,
      readings: hour.readings,
    }));

    // Sort based on selected order
    switch (sortOrder) {
      case 'newest':
        data = data.sort((a, b) => b.hour.localeCompare(a.hour));
        break;
      case 'oldest':
        data = data.sort((a, b) => a.hour.localeCompare(b.hour));
        break;
      case 'highest':
        data = data.sort((a, b) => b.aqi - a.aqi);
        break;
      case 'lowest':
        data = data.sort((a, b) => a.aqi - b.aqi);
        break;
    }

    return data;
  }, [hourlyAverages, sortOrder]);

  // Process daily trend data
  const trendData: TrendDataPoint[] = useMemo(() => {
    const dataByDate: Record<string, TrendDataPoint> = {};
    
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
    
    if (passportTrend) {
      passportTrend.forEach((day: TrendDay) => {
        const dateKey = day.day;
        if (dataByDate[dateKey]) {
          dataByDate[dateKey] = {
            ...dataByDate[dateKey],
            aqi: day.average,
            readings: dataByDate[dateKey].readings + day.samples,
          };
        } else {
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

  // Calculate time until next refresh using GMT+8 consistent formatting
  const getTimeUntilRefresh = useCallback(() => {
    const diff = nextRefreshTime - Date.now();
    if (diff <= 0) return 'Refreshing...';
    return formatDuration(diff);
  }, [nextRefreshTime]);

  // Export to PDF handler
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Prepare data for report
      const reportData = {
        userKey,
        currentLocation: currentLocation || 'Unknown Location',
        currentAqi: currentAqi || 0,
        currentPm25: currentPm25,
        currentNo2: currentNo2,
        currentSource: currentSource,
        stats: stats ? {
          last24h: stats.last24h,
          last7d: stats.last7d,
          last30d: stats.last30d,
          total: stats.total,
        } : null,
        hourlyData: hourlyData.map(d => ({
          hour: d.hour,
          displayLabel: d.displayLabel,
          fullLabel: d.fullLabel,
          aqi: d.aqi,
          pm25: d.pm25,
          no2: d.no2,
        })),
        dailyData: trendData.map(d => ({
          date: d.fullDate,
          aqi: d.aqi,
          pm25: d.pm25,
          no2: d.no2,
          readings: d.readings,
        })),
        locationComparison: comparisonData.map(d => ({
          locationName: d.fullName,
          avgAqi: d.avgAqi,
          minAqi: d.minAqi,
          maxAqi: d.maxAqi,
          readings: d.readings,
        })),
        aqiDistribution: distributionData,
        timeRange,
        generatedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const locationName = (currentLocation || 'location').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `AQI_Report_${locationName}_${timestamp}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  }, [userKey, currentLocation, currentAqi, currentPm25, currentNo2, currentSource, stats, hourlyData, trendData, comparisonData, distributionData, timeRange]);

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
          {autoRefreshEnabled && (
            <span className="aq-mini-refresh">
              🔄 {getTimeUntilRefresh()}
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
          <p className="aq-subtitle">Historical data, trends & hourly breakdown</p>
        </div>
        <div className="aq-header-right">
          <button 
            className={`aq-export-btn ${isExporting ? 'exporting' : ''}`}
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Export as PDF Report"
          >
            {isExporting ? (
              <>
                <svg className="aq-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4 31.4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export PDF
              </>
            )}
          </button>
          <div className="aq-auto-refresh">
            <label className="aq-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              />
              <span className="aq-toggle-slider"></span>
            </label>
            <span className="aq-refresh-label">
              Auto-refresh (1hr)
              {autoRefreshEnabled && <span className="aq-next-refresh">Next: {getTimeUntilRefresh()}</span>}
            </span>
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
      </div>

      {/* Last Refresh Indicator */}
      <div className="aq-refresh-indicator">
        <span className="aq-last-refresh">
          Last updated: {formatTimeGMT8(lastRefresh)} (GMT+8)
        </span>
        <button 
          className="aq-manual-refresh"
          onClick={() => {
            setLastRefresh(new Date());
            setNextRefreshTime(Date.now() + AUTO_REFRESH_INTERVAL);
            if (onAutoRefresh) onAutoRefresh();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh Now
        </button>
      </div>

      {/* Export Error Message */}
      {exportError && (
        <div className="aq-export-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="aq-error-dismiss">×</button>
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
            className={timeRange === '1h' ? 'active' : ''} 
            onClick={() => setTimeRange('1h')}
          >
            1h
          </button>
          <button 
            className={timeRange === '6h' ? 'active' : ''} 
            onClick={() => setTimeRange('6h')}
          >
            6h
          </button>
          <button 
            className={timeRange === '12h' ? 'active' : ''} 
            onClick={() => setTimeRange('12h')}
          >
            12h
          </button>
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
            className={chartType === 'hourly' ? 'active' : ''} 
            onClick={() => setChartType('hourly')}
            title="Hourly breakdown"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className={chartType === 'trend' ? 'active' : ''} 
            onClick={() => setChartType('trend')}
            title="Daily trend"
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

      {/* Sort Controls - Only show for hourly view */}
      {chartType === 'hourly' && (
        <div className="aq-sort-controls">
          <span className="aq-sort-label">Sort by:</span>
          <div className="aq-sort-buttons">
            <button 
              className={sortOrder === 'newest' ? 'active' : ''} 
              onClick={() => setSortOrder('newest')}
            >
              Newest First
            </button>
            <button 
              className={sortOrder === 'oldest' ? 'active' : ''} 
              onClick={() => setSortOrder('oldest')}
            >
              Oldest First
            </button>
            <button 
              className={sortOrder === 'highest' ? 'active' : ''} 
              onClick={() => setSortOrder('highest')}
            >
              Highest AQI
            </button>
            <button 
              className={sortOrder === 'lowest' ? 'active' : ''} 
              onClick={() => setSortOrder('lowest')}
            >
              Lowest AQI
            </button>
          </div>
          <label className="aq-pollutant-toggle">
            <input
              type="checkbox"
              checked={showPollutantDetails}
              onChange={(e) => setShowPollutantDetails(e.target.checked)}
            />
            Show Pollutant Details
          </label>
        </div>
      )}

      {/* Chart Area */}
      <div className="aq-chart-container">
        {chartType === 'hourly' && (
          <div className="aq-chart">
            <h4>Hourly Air Quality Breakdown</h4>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={hourlyData}>
                  <defs>
                    <linearGradient id="aqiHourlyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="displayLabel" 
                    tick={{ fontSize: 10 }}
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    domain={[0, 'auto']}
                    label={{ value: 'AQI', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  
                  {/* AQI Threshold Reference Lines */}
                  {AQI_THRESHOLDS.map((threshold) => (
                    <ReferenceLine 
                      key={threshold.value}
                      y={threshold.value} 
                      stroke={threshold.color} 
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                      label={{ 
                        value: threshold.label, 
                        position: 'right',
                        fontSize: 9,
                        fill: threshold.color,
                      }}
                    />
                  ))}
                  
                  <Area 
                    type="monotone" 
                    dataKey="aqi" 
                    stroke="#3B82F6" 
                    fill="url(#aqiHourlyGradient)"
                    strokeWidth={2}
                    name="AQI"
                    dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                  />
                  
                  {showPollutantDetails && (
                    <>
                      {hourlyData.some(d => d.pm25) && (
                        <Line 
                          type="monotone" 
                          dataKey="pm25" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={false}
                          name="PM2.5"
                        />
                      )}
                      {hourlyData.some(d => d.no2) && (
                        <Line 
                          type="monotone" 
                          dataKey="no2" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          dot={false}
                          name="NO₂"
                        />
                      )}
                    </>
                  )}
                  
                  {hourlyData.length > 12 && (
                    <Brush 
                      dataKey="displayLabel" 
                      height={30} 
                      stroke="#3B82F6"
                      fill="#F1F5F9"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="aq-no-data">
                <p>No hourly data available for this time range</p>
                <p className="aq-no-data-hint">Data is collected automatically every hour!</p>
              </div>
            )}
          </div>
        )}

        {chartType === 'trend' && (
          <div className="aq-chart">
            <h4>Daily AQI Trend</h4>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* AQI Threshold Reference Lines */}
                  <ReferenceLine y={50} stroke={AQI_COLORS.good} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={100} stroke={AQI_COLORS.moderate} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={150} stroke={AQI_COLORS.unhealthySensitive} strokeDasharray="3 3" strokeOpacity={0.5} />
                  
                  <Area 
                    type="monotone" 
                    dataKey="aqi" 
                    stroke="#3B82F6" 
                    fill="url(#aqiGradient)"
                    strokeWidth={2}
                    name="AQI"
                    dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
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
              <ResponsiveContainer width="100%" height={280}>
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
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${(name ?? '').split(' ')[0]}: ${value}`}
                    labelLine={true}
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

      {/* Hourly Data Table - For detailed view */}
      {chartType === 'hourly' && hourlyData.length > 0 && (
        <div className="aq-hourly-table">
          <h4>Hourly Readings Detail</h4>
          <div className="aq-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>AQI</th>
                  <th>Status</th>
                  {showPollutantDetails && (
                    <>
                      <th>PM2.5</th>
                      <th>NO₂</th>
                      <th>CO</th>
                    </>
                  )}
                  <th>Readings</th>
                </tr>
              </thead>
              <tbody>
                {hourlyData.slice(0, 12).map((hour, index) => (
                  <tr key={index}>
                    <td className="aq-table-time">{hour.fullLabel}</td>
                    <td>
                      <span 
                        className="aq-table-aqi"
                        style={{ backgroundColor: getAqiColor(hour.aqi), color: '#fff' }}
                      >
                        {hour.aqi}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="aq-table-status"
                        style={{ color: getAqiColor(hour.aqi) }}
                      >
                        {getAqiCategory(hour.aqi).label}
                      </span>
                    </td>
                    {showPollutantDetails && (
                      <>
                        <td>{hour.pm25 ?? '—'}</td>
                        <td>{hour.no2 ?? '—'}</td>
                        <td>{hour.co ?? '—'}</td>
                      </>
                    )}
                    <td>{hour.readings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AQI Legend */}
      <div className="aq-legend">
        <h5>AQI Index Guide</h5>
        <div className="aq-legend-items">
          {AQI_THRESHOLDS.map((threshold) => (
            <div key={threshold.value} className="aq-legend-item">
              <span 
                className="aq-legend-color" 
                style={{ backgroundColor: threshold.color }}
              ></span>
              <span className="aq-legend-label">
                {threshold.label} (0-{threshold.value})
              </span>
            </div>
          ))}
        </div>
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
