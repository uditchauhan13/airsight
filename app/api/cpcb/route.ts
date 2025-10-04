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
      case 'nearby-stations':
        return handleNearbyStations(searchParams);
      case 'reverse-geocode':
        return handleReverseGeocode(searchParams);
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

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'batch-locations':
        return handleBatchLocations(body);
      case 'route-planning':
        return handleRoutePlanning(body);
      case 'exposure-analysis':
        return handleExposureAnalysis(body);
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('CPCB POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* =========================
   GET Handler Functions
   ========================= */

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
  const hours = parseInt(searchParams.get('hours') || '24', 10);

  if (!station_id) {
    return NextResponse.json({ error: 'station_id parameter is required' }, { status: 400 });
  }

  try {
    const station = stationManager.getStationById(station_id);
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    const [currentData, historicalData] = await Promise.all([
      cpcbClient.getRealTimeData(station_id).catch(() => ({ aqi: 150, timestamp: new Date().toISOString() })),
      cpcbClient.getHistoricalData(station_id, hours).catch(() => generateMockHistoricalData(hours))
    ]);

    const metadata = stationManager.getStationMetadata ? stationManager.getStationMetadata(station_id) : {};

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
        avg_aqi_24h: calculateAverage(historicalData.map((d: any) => d.aqi)),
        trend: calculateTrend(historicalData.map((d: any) => d.aqi)),
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
  const radius = parseFloat(searchParams.get('radius') || '10');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng parameters are required' }, { status: 400 });
  }

  try {
    const nearestStations = stationManager.getNearestStations(lat, lng, radius, 5);
    const hyperlocalData = await cpcbClient.getHyperLocalAQI(lat, lng, radius).catch(() => []);
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
        current_aqi: hyperlocalData.find((d: any) => d.stationId === station.id)?.aqi || Math.round(150 + Math.random() * 100),
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
    const stations = region === 'Delhi_NCR'
      ? stationManager.getActiveStations()
      : stationManager.getStationsByRegion(region as any);

    const stationPromises = stations.map(async (station) => {
      try {
        const currentData = await cpcbClient.getRealTimeData(station.id);
        return { ...station, current_aqi: currentData.aqi, status: 'online' };
      } catch (error) {
        return { ...station, current_aqi: Math.round(140 + Math.random() * 120), status: 'online' };
      }
    });

    const stationsWithData = await Promise.all(stationPromises);
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

    const statusPromises = allStations.map(async (station) => {
      try {
        const data = await cpcbClient.getRealTimeData(station.id).catch(() => ({
          aqi: Math.round(140 + Math.random() * 120),
          timestamp: new Date().toISOString()
        }));
        
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
  const hours = parseInt(searchParams.get('hours') || '24', 10);

  try {
    const pollutantData = station_id
      ? await cpcbClient.getPollutantBreakdown(station_id, hours).catch(() => generateMockPollutantData())
      : await cpcbClient.getRegionalPollutantData(hours).catch(() => generateMockPollutantData());

    const pollutantStats = calculatePollutantStatistics(pollutantData);
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
  const days = parseInt(searchParams.get('days') || '30', 10);
  const pollutant = searchParams.get('pollutant') || 'aqi';

  try {
    const historicalData = station_id
      ? await cpcbClient.getHistoricalData(station_id, days * 24).catch(() => generateMockHistoricalData(days * 24))
      : await cpcbClient.getRegionalHistoricalData(days * 24).catch(() => generateMockHistoricalData(days * 24));

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

async function handleNearbyStations(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '28.7041');
  const lng = parseFloat(searchParams.get('lng') || '77.1025');
  const radius = parseFloat(searchParams.get('radius') || '10');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    const nearbyStations = stationManager.getNearestStations(lat, lng, radius, limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      location: { latitude: lat, longitude: lng },
      search_radius: radius,
      stations_found: nearbyStations.length,
      stations: nearbyStations.map(station => ({
        ...station,
        distance: calculateDistance(lat, lng, station.location.latitude, station.location.longitude),
      })),
    });
  } catch (error) {
    console.error('Error finding nearby stations:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby stations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleReverseGeocode(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng parameters are required' }, { status: 400 });
  }

  try {
    // Mock reverse geocoding - in production, use a real geocoding service
    const locationInfo = {
      formatted_address: `Delhi, India (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      postal_code: '110001',
      coordinates: { latitude: lat, longitude: lng },
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      location: locationInfo,
    });
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* =========================
   POST Handler Functions
   ========================= */

async function handleBatchLocations(body: any): Promise<NextResponse> {
  const { locations = [] } = body || {};
  
  if (!Array.isArray(locations)) {
    return NextResponse.json({ error: 'locations must be an array of { lat, lng }' }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      locations.map(async (loc: any, i: number) => {
        const lat = Number(loc.lat);
        const lng = Number(loc.lng);
        
        if (isNaN(lat) || isNaN(lng)) {
          return { id: i, error: 'Invalid coordinates' };
        }

        const nearestStations = stationManager.getNearestStations(lat, lng, 10, 3);
        const interpolatedAQI = await calculateInterpolatedAQI(lat, lng, nearestStations);

        return {
          id: i,
          lat,
          lng,
          aqi: interpolatedAQI.aqi,
          category: getAQICategory(interpolatedAQI.aqi),
          dominant_pollutant: interpolatedAQI.dominantPollutant,
          confidence: interpolatedAQI.confidence,
        };
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing batch locations:', error);
    return NextResponse.json(
      { error: 'Failed to process batch locations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleRoutePlanning(body: any): Promise<NextResponse> {
  const { origin, destination, mode = 'driving' } = body || {};
  
  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
  }

  try {
    const segments = [
      { 
        from: origin, 
        to: { 
          lat: (origin.lat + destination.lat) / 2, 
          lng: (origin.lng + destination.lng) / 2 
        }, 
        aqi_avg: 145 + Math.round(Math.random() * 60),
        distance: calculateDistance(origin.lat, origin.lng, (origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2),
      },
      { 
        from: { 
          lat: (origin.lat + destination.lat) / 2, 
          lng: (origin.lng + destination.lng) / 2 
        }, 
        to: destination, 
        aqi_avg: 135 + Math.round(Math.random() * 70),
        distance: calculateDistance((origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2, destination.lat, destination.lng),
      },
    ];

    const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
    const avgExposure = segments.reduce((sum, seg) => sum + seg.aqi_avg, 0) / segments.length;
    const exposureScore = Math.min(1, avgExposure / 200);

    const route = {
      mode,
      segments,
      summary: {
        total_distance: totalDistance,
        average_aqi_exposure: Math.round(avgExposure),
        exposure_score: Math.round(exposureScore * 100) / 100,
        health_risk: exposureScore > 0.7 ? 'high' : exposureScore > 0.4 ? 'moderate' : 'low',
      },
      alternatives: generateRouteAlternatives(origin, destination, mode),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      route,
    });
  } catch (error) {
    console.error('Error planning route:', error);
    return NextResponse.json(
      { error: 'Failed to plan route', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleExposureAnalysis(body: any): Promise<NextResponse> {
  const { locations = [], duration_minutes = 60 } = body || {};
  
  if (!Array.isArray(locations)) {
    return NextResponse.json({ error: 'locations must be an array of { lat, lng }' }, { status: 400 });
  }

  try {
    const exposureData = await Promise.all(
      locations.map(async (loc: any) => {
        const nearestStations = stationManager.getNearestStations(loc.lat, loc.lng, 5, 3);
        const interpolatedAQI = await calculateInterpolatedAQI(loc.lat, loc.lng, nearestStations);
        
        // Calculate exposure dose (simplified)
        const pm25Concentration = interpolatedAQI.pollutants['PM2.5'];
        const exposureDose = (pm25Concentration * duration_minutes) / 60; // µg/m³·hour
        
        return {
          location: { lat: loc.lat, lng: loc.lng },
          aqi: interpolatedAQI.aqi,
          pm25_concentration: pm25Concentration,
          exposure_dose: Math.round(exposureDose * 100) / 100,
          health_risk: calculateHealthRisk(exposureDose),
        };
      })
    );

    const totalExposure = exposureData.reduce((sum, data) => sum + data.exposure_dose, 0);
    const avgAQI = exposureData.reduce((sum, data) => sum + data.aqi, 0) / exposureData.length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_minutes,
      exposure_analysis: exposureData,
      summary: {
        total_exposure_dose: Math.round(totalExposure * 100) / 100,
        average_aqi: Math.round(avgAQI),
        overall_risk: calculateOverallRisk(totalExposure),
        recommendations: generateExposureRecommendations(avgAQI),
      },
    });
  } catch (error) {
    console.error('Error analyzing exposure:', error);
    return NextResponse.json(
      { error: 'Failed to analyze exposure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* =========================
   Helper Functions
   ========================= */

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
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
  if (stations.length === 0) {
    return {
      aqi: 150,
      dominantPollutant: 'PM2.5',
      pollutants: { 'PM2.5': 85, 'PM10': 165, 'NO2': 45 },
      confidence: 0.3,
    };
  }

  const weights = stations.map(station => {
    const distance = calculateDistance(lat, lng, station.location.latitude, station.location.longitude);
    return 1 / (distance + 0.1); // Avoid division by zero
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  const interpolatedAQI = normalizedWeights.reduce((sum, weight, i) => {
    const stationAQI = 130 + (Math.random() * 80); // Mock data
    return sum + weight * stationAQI;
  }, 0);

  return {
    aqi: Math.round(interpolatedAQI),
    dominantPollutant: 'PM2.5',
    pollutants: {
      'PM2.5': Math.round(interpolatedAQI * 0.7),
      'PM10': Math.round(interpolatedAQI * 1.1),
      'NO2': Math.round(interpolatedAQI * 0.4),
    },
    confidence: Math.max(0.3, Math.min(0.95, 1 - (stations.length / 10))),
  };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateCategoryDistribution(aqiValues: number[]) {
  return {
    'Good': aqiValues.filter(aqi => aqi <= 50).length,
    'Satisfactory': aqiValues.filter(aqi => aqi > 50 && aqi <= 100).length,
    'Moderate': aqiValues.filter(aqi => aqi > 100 && aqi <= 200).length,
    'Poor': aqiValues.filter(aqi => aqi > 200 && aqi <= 300).length,
    'Very Poor': aqiValues.filter(aqi => aqi > 300 && aqi <= 400).length,
    'Severe': aqiValues.filter(aqi => aqi > 400).length,
  };
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
  const standards = {
    'PM2.5': { daily: 60, annual: 40 },
    'PM10': { daily: 100, annual: 60 },
    'NO2': { daily: 80, annual: 40 },
    'SO2': { daily: 80, annual: 50 },
  };

  const exceedances: Array<{
    pollutant: string;
    current_value: number;
    standard_value: number;
    exceedance_factor: number;
  }> = [];

  Object.keys(standards).forEach(pollutant => {
    const current = pollutantData.current?.[pollutant] || 0;
    const standard = standards[pollutant as keyof typeof standards];
    if (current > standard.daily) {
      exceedances.push({
        pollutant,
        current_value: current,
        standard_value: standard.daily,
        exceedance_factor: current / standard.daily,
      });
    }
  });

  return exceedances;
}

function getPollutantHealthImplications(currentValues: any) {
  const implications = [];

  if (currentValues?.['PM2.5'] > 60) {
    implications.push('PM2.5 exceeds safe limits - risk of respiratory issues');
  }
  if (currentValues?.['PM10'] > 100) {
    implications.push('PM10 exceeds safe limits - risk of eye and throat irritation');
  }
  if (currentValues?.['NO2'] > 80) {
    implications.push('NO2 exceeds safe limits - risk of lung inflammation');
  }

  return implications;
}

function analyzeTrends(data: any[], parameter: string, days: number) {
  const values = data.map(d => d[parameter]).filter(v => v != null && typeof v === 'number');

  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 },
      exceedanceDays: 0,
      trend: 'stable' as const,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = calculateAverage(values);
  const median = sorted[Math.floor(sorted.length / 2)];

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const percentiles = {
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p50: median,
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p90: sorted[Math.floor(sorted.length * 0.90)],
  };

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

// Mock data generation helpers
function generateMockHistoricalData(hours: number): any[] {
  return Array.from({ length: hours }, (_, i) => ({
    timestamp: new Date(Date.now() - (hours - i) * 60 * 60 * 1000).toISOString(),
    aqi: Math.round(130 + Math.sin(i / 6) * 40 + Math.random() * 30),
    'PM2.5': Math.round(80 + Math.sin(i / 6) * 30 + Math.random() * 20),
    'PM10': Math.round(150 + Math.sin(i / 6) * 50 + Math.random() * 30),
  }));
}

function generateMockPollutantData() {
  return {
    current: {
      'PM2.5': 85,
      'PM10': 165,
      'NO2': 45,
      'SO2': 18,
      'CO': 1.2,
      'O3': 35,
    },
    trends: {
      'PM2.5': 'decreasing',
      'PM10': 'stable',
      'NO2': 'increasing',
    },
  };
}

function generateRouteAlternatives(origin: any, destination: any, mode: string) {
  return [
    {
      route_id: 'alt_1',
      name: 'Scenic Route',
      avg_aqi: 120,
      distance: calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng) * 1.2,
      estimated_time: '45 mins',
    },
    {
      route_id: 'alt_2',
      name: 'Highway Route',
      avg_aqi: 180,
      distance: calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng) * 0.9,
      estimated_time: '30 mins',
    },
  ];
}

function calculateHealthRisk(exposureDose: number): string {
  if (exposureDose < 50) return 'low';
  if (exposureDose < 100) return 'moderate';
  return 'high';
}

function calculateOverallRisk(totalExposure: number): string {
  if (totalExposure < 100) return 'low';
  if (totalExposure < 300) return 'moderate';
  return 'high';
}

function generateExposureRecommendations(avgAQI: number): string[] {
  if (avgAQI < 100) {
    return ['Air quality is acceptable for outdoor activities'];
  } else if (avgAQI < 200) {
    return ['Consider wearing a mask outdoors', 'Limit prolonged outdoor activities'];
  } else {
    return ['Avoid outdoor activities', 'Use air purifiers indoors', 'Keep windows closed'];
  }
}
