import { NextRequest, NextResponse } from 'next/server';
import { cpcbClient } from '@/lib/api/cpcb-client';
import { stationManager } from '@/lib/delhi-ncr/monitoring-stations';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'stations':
        return handleGetStations(searchParams);
        
      case 'station-data':
        return handleGetStationData(searchParams);
        
      case 'hyperlocal-aqi':
        return handleHyperlocalAQI(searchParams);
        
      case 'regional-overview':
        return handleRegionalOverview(searchParams);
        
      case 'station-status':
        return handleStationStatus();
        
      case 'pollutant-breakdown':
        return handlePollutantBreakdown(searchParams);
        
      case 'historical-trends':
        return handleHistoricalTrends(searchParams);
        
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('CPCB API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleGetStations(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') as any;
  const active_only = searchParams.get('active_only') === 'true';
  
  try {
    let stations;
    
    if (region) {
      stations = stationManager.getStationsByRegion(region);
    } else {
      stations = active_only ? stationManager.getActiveStations() : stationManager.getNetworkSummary().stations;
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_stations: stations.length,
      stations: stations,
      network_summary: stationManager.getNetworkSummary(),
    });
    
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleGetStationData(searchParams: URLSearchParams): Promise<NextResponse> {
  const station_id = searchParams.get('station_id');
  const hours = parseInt(searchParams.get('hours') || '24');
  
  if (!station_id) {
    return NextResponse.json({ error: 'station_id parameter is required' }, { status: 400 });
  }
  
  try {
    const station = stationManager.getStationById(station_id);
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }
    
    // Get real-time and historical data for the station
    const [currentData, historicalData] = await Promise.all([
      cpcbClient.getRealTimeData(station_id),
      cpcbClient.getHistoricalData(station_id, hours)
    ]);
    
    // Get station metadata
    const metadata = stationManager.getStationMetadata(station_id);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      station: {
        ...station,
        metadata,
      },
      current_data: currentData,
      historical_data: historicalData,
      data_summary: {
        total_readings: historicalData.length,
        latest_aqi: currentData.aqi,
        avg_aqi_24h: calculateAverage(historicalData.map(d => d.aqi)),
        trend: calculateTrend(historicalData.map(d => d.aqi)),
      },
    });
    
  } catch (error) {
    console.error('Error fetching station data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleHyperlocalAQI(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km
  
  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng parameters are required' }, { status: 400 });
  }
  
  try {
    // Get hyperlocal AQI using nearest stations and interpolation
    const hyperlocalData = await cpcbClient.getHyperLocalAQI(lat, lng, radius);
    
    // Get nearest stations for context
    const nearestStations = stationManager.getNearestStations(lat, lng, radius, 5);
    
    // Calculate interpolated values
    const interpolatedAQI = await calculateInterpolatedAQI(lat, lng, nearestStations);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      location: { latitude: lat, longitude: lng },
      hyperlocal_aqi: {
        aqi: interpolatedAQI.aqi,
        category: getAQICategory(interpolatedAQI.aqi),
        dominant_pollutant: interpolatedAQI.dominantPollutant,
        pollutant_concentrations: interpolatedAQI.pollutants,
        confidence_score: interpolatedAQI.confidence,
      },
      nearby_stations: nearestStations.map(station => ({
        ...station,
        current_aqi: hyperlocalData.find(d => d.stationId === station.id)?.aqi || null,
      })),
      data_sources: {
        stations_used: nearestStations.length,
        interpolation_method: 'inverse_distance_weighting',
        max_distance: radius,
      },
    });
    
  } catch (error) {
    console.error('Error calculating hyperlocal AQI:', error);
    return NextResponse.json(
      { error: 'Failed to calculate hyperlocal AQI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleRegionalOverview(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  
  try {
    // Get all stations in the region
    const stations = region === 'Delhi_NCR' 
      ? stationManager.getActiveStations() 
      : stationManager.getStationsByRegion(region as any);
    
    // Get current data for all stations
    const stationPromises = stations.map(async (station) => {
      try {
        const currentData = await cpcbClient.getRealTimeData(station.id);
        return { ...station, current_aqi: currentData.aqi, status: 'online' };
      } catch (error) {
        return { ...station, current_aqi: null, status: 'offline' };
      }
    });
    
    const stationsWithData = await Promise.all(stationPromises);
    
    // Calculate regional statistics
    const onlineStations = stationsWithData.filter(s => s.status === 'online' && s.current_aqi !== null);
    const aqiValues = onlineStations.map(s => s.current_aqi!).filter(aqi => aqi > 0);
    
    const regionalStats = {
      total_stations: stations.length,
      online_stations: onlineStations.length,
      offline_stations: stations.length - onlineStations.length,
      average_aqi: aqiValues.length > 0 ? Math.round(calculateAverage(aqiValues)) : null,
      max_aqi: aqiValues.length > 0 ? Math.max(...aqiValues) : null,
      min_aqi: aqiValues.length > 0 ? Math.min(...aqiValues) : null,
      category_distribution: calculateCategoryDistribution(aqiValues),
    };
    
    // Identify hotspots and clean areas
    const hotspots = onlineStations.filter(s => s.current_aqi! > 200).slice(0, 5);
    const cleanAreas = onlineStations.filter(s => s.current_aqi! < 100).slice(0, 5);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region,
      regional_statistics: regionalStats,
      stations_overview: stationsWithData,
      hotspots: hotspots.map(s => ({ 
        name: s.name, 
        location: s.location, 
        aqi: s.current_aqi,
        category: getAQICategory(s.current_aqi!)
      })),
      clean_areas: cleanAreas.map(s => ({ 
        name: s.name, 
        location: s.location, 
        aqi: s.current_aqi,
        category: getAQICategory(s.current_aqi!)
      })),
      data_quality: {
        coverage: (onlineStations.length / stations.length) * 100,
        data_freshness: 'real-time',
        reliability: onlineStations.length > stations.length * 0.8 ? 'high' : 'moderate',
      },
    });
    
  } catch (error) {
    console.error('Error fetching regional overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional overview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleStationStatus(): Promise<NextResponse> {
  try {
    const allStations = stationManager.getNetworkSummary().stations;
    
    // Check status of each station
    const statusPromises = allStations.map(async (station) => {
      try {
        const data = await cpcbClient.getRealTimeData(station.id);
        const lastUpdate = new Date(data.timestamp);
        const hoursOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        let status: 'online' | 'delayed' | 'offline';
        if (hoursOld < 2) status = 'online';
        else if (hoursOld < 24) status = 'delayed';
        else status = 'offline';
        
        return {
          station_id: station.id,
          station_name: station.name,
          status,
          last_update: data.timestamp,
          hours_since_update: Math.round(hoursOld * 10) / 10,
          current_aqi: data.aqi,
        };
      } catch (error) {
        return {
          station_id: station.id,
          station_name: station.name,
          status: 'offline' as const,
          last_update: null,
          hours_since_update: null,
          current_aqi: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const stationStatuses = await Promise.all(statusPromises);
    
    // Calculate network health metrics
    const onlineCount = stationStatuses.filter(s => s.status === 'online').length;
    const delayedCount = stationStatuses.filter(s => s.status === 'delayed').length;
    const offlineCount = stationStatuses.filter(s => s.status === 'offline').length;
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      network_health: {
        total_stations: allStations.length,
        online_stations: onlineCount,
        delayed_stations: delayedCount,
        offline_stations: offlineCount,
        uptime_percentage: (onlineCount / allStations.length) * 100,
        health_score: calculateHealthScore(onlineCount, delayedCount, offlineCount),
      },
      station_statuses: stationStatuses,
      alerts: generateStationAlerts(stationStatuses),
    });
    
  } catch (error) {
    console.error('Error checking station status:', error);
    return NextResponse.json(
      { error: 'Failed to check station status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePollutantBreakdown(searchParams: URLSearchParams): Promise<NextResponse> {
  const station_id = searchParams.get('station_id');
  const hours = parseInt(searchParams.get('hours') || '24');
  
  try {
    let pollutantData;
    
    if (station_id) {
      // Get data for specific station
      pollutantData = await cpcbClient.getPollutantBreakdown(station_id, hours);
    } else {
      // Get regional average
      pollutantData = await cpcbClient.getRegionalPollutantData(hours);
    }
    
    // Calculate pollutant statistics
    const pollutantStats = calculatePollutantStatistics(pollutantData);
    
    // Identify exceedances
    const exceedances = identifyPollutantExceedances(pollutantData);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      station_id: station_id || 'regional_average',
      time_period: `${hours} hours`,
      pollutant_breakdown: pollutantStats,
      current_concentrations: pollutantData.current,
      trends: pollutantData.trends,
      standard_exceedances: exceedances,
      health_implications: getPollutantHealthImplications(pollutantData.current),
    });
    
  } catch (error) {
    console.error('Error fetching pollutant breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pollutant breakdown', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleHistoricalTrends(searchParams: URLSearchParams): Promise<NextResponse> {
  const station_id = searchParams.get('station_id');
  const days = parseInt(searchParams.get('days') || '30');
  const pollutant = searchParams.get('pollutant') || 'aqi';
  
  try {
    const historicalData = station_id
      ? await cpcbClient.getHistoricalData(station_id, days * 24)
      : await cpcbClient.getRegionalHistoricalData(days * 24);
    
    // Process trend data
    const trendAnalysis = analyzeTrends(historicalData, pollutant, days);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      station_id: station_id || 'regional_average',
      parameter: pollutant,
      time_period: `${days} days`,
      trend_analysis: trendAnalysis,
      historical_data: historicalData,
      statistical_summary: {
        mean: trendAnalysis.mean,
        median: trendAnalysis.median,
        std_deviation: trendAnalysis.stdDev,
        percentiles: trendAnalysis.percentiles,
        exceedance_days: trendAnalysis.exceedanceDays,
      },
    });
    
  } catch (error) {
    console.error('Error fetching historical trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical trends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateAverage(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = calculateAverage(firstHalf);
  const secondAvg = calculateAverage(secondHalf);
  
  const change = (secondAvg - firstAvg) / firstAvg;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

async function calculateInterpolatedAQI(lat: number, lng: number, stations: any[]) {
  // Mock interpolation - in production, use IDW or kriging
  const weights = stations.map(station => {
    const distance = Math.sqrt(
      Math.pow(station.location.latitude - lat, 2) + 
      Math.pow(station.location.longitude - lng, 2)
    );
    return 1 / (distance + 0.001); // Inverse distance weighting
  });
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  // Mock AQI calculation
  const interpolatedAQI = normalizedWeights.reduce((sum, weight, i) => {
    const stationAQI = 150 + (Math.random() - 0.5) * 100; // Mock data
    return sum + weight * stationAQI;
  }, 0);
  
  return {
    aqi: Math.round(interpolatedAQI),
    dominantPollutant: 'PM2.5',
    pollutants: {
      'PM2.5': Math.round(interpolatedAQI * 0.8),
      'PM10': Math.round(interpolatedAQI * 1.2),
      'NO2': Math.round(interpolatedAQI * 0.6),
    },
    confidence: Math.max(0.3, 1 - stations.length / 10),
  };
}

function calculateCategoryDistribution(aqiValues: number[]) {
  const categories = {
    'Good': aqiValues.filter(aqi => aqi <= 50).length,
    'Satisfactory': aqiValues.filter(aqi => aqi > 50 && aqi <= 100).length,
    'Moderate': aqiValues.filter(aqi => aqi > 100 && aqi <= 200).length,
    'Poor': aqiValues.filter(aqi => aqi > 200 && aqi <= 300).length,
    'Very Poor': aqiValues.filter(aqi => aqi > 300 && aqi <= 400).length,
    'Severe': aqiValues.filter(aqi => aqi > 400).length,
  };
  
  return categories;
}

function calculateHealthScore(online: number, delayed: number, offline: number): number {
  const total = online + delayed + offline;
  if (total === 0) return 0;
  
  return Math.round(((online * 1.0 + delayed * 0.5 + offline * 0.0) / total) * 100);
}

function generateStationAlerts(statuses: any[]): string[] {
  const alerts = [];
  const offlineStations = statuses.filter(s => s.status === 'offline');
  const delayedStations = statuses.filter(s => s.status === 'delayed');
  
  if (offlineStations.length > 0) {
    alerts.push(`${offlineStations.length} stations are offline`);
  }
  
  if (delayedStations.length > 5) {
    alerts.push(`${delayedStations.length} stations have delayed data`);
  }
  
  const highAQIStations = statuses.filter(s => s.current_aqi && s.current_aqi > 300);
  if (highAQIStations.length > 0) {
    alerts.push(`${highAQIStations.length} stations reporting severe air quality`);
  }
  
  return alerts;
}

function calculatePollutantStatistics(pollutantData: any) {
  // Mock implementation - calculate actual statistics from real data
  return {
    'PM2.5': { current: 85, avg_24h: 92, trend: 'decreasing' },
    'PM10': { current: 165, avg_24h: 158, trend: 'increasing' },
    'NO2': { current: 45, avg_24h: 52, trend: 'stable' },
    'SO2': { current: 18, avg_24h: 22, trend: 'decreasing' },
    'CO': { current: 1.2, avg_24h: 1.4, trend: 'stable' },
    'O3': { current: 35, avg_24h: 42, trend: 'decreasing' },
  };
}

function identifyPollutantExceedances(pollutantData: any) {
  // Check against NAAQS standards
  const standards = {
    'PM2.5': { daily: 60, annual: 40 },
    'PM10': { daily: 100, annual: 60 },
    'NO2': { daily: 80, annual: 40 },
    'SO2': { daily: 80, annual: 50 },
  };
  
  const exceedances = [];
  Object.keys(standards).forEach(pollutant => {
    const current = pollutantData.current[pollutant];
    if (current > standards[pollutant as keyof typeof standards].daily) {
      exceedances.push({
        pollutant,
        current_value: current,
        standard_value: standards[pollutant as keyof typeof standards].daily,
        exceedance_factor: current / standards[pollutant as keyof typeof standards].daily,
      });
    }
  });
  
  return exceedances;
}

function getPollutantHealthImplications(currentValues: any) {
  const implications = [];
  
  if (currentValues['PM2.5'] > 60) {
    implications.push('PM2.5 exceeds safe limits - risk of respiratory issues');
  }
  
  if (currentValues['PM10'] > 100) {
    implications.push('PM10 exceeds safe limits - risk of eye and throat irritation');
  }
  
  if (currentValues['NO2'] > 80) {
    implications.push('NO2 exceeds safe limits - risk of lung inflammation');
  }
  
  return implications;
}

function analyzeTrends(data: any[], parameter: string, days: number) {
  const values = data.map(d => d[parameter]).filter(v => v != null);
  
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 },
      exceedanceDays: 0,
      trend: 'stable',
    };
  }
  
  const sorted = values.sort((a, b) => a - b);
  const mean = calculateAverage(values);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Percentiles
  const percentiles = {
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p50: median,
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p90: sorted[Math.floor(sorted.length * 0.90)],
  };
  
  // Exceedance days (AQI > 200)
  const exceedanceDays = parameter === 'aqi' ? values.filter(v => v > 200).length : 0;
  
  return {
    mean: Math.round(mean),
    median: Math.round(median),
    stdDev: Math.round(stdDev),
    percentiles,
    exceedanceDays,
    trend: calculateTrend(values),
  };
}
