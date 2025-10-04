"use client"

import { useState, useEffect } from 'react';
import { MapPin, Loader2, RefreshCw, AlertTriangle, Wind, Droplets, Thermometer, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AQIData {
  aqi: number;
  category: string;
  dominant_pollutant: string;
  confidence_score: number;
  last_updated: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  pollutant_details: {
    'PM2.5': number | null;
    'PM10': number | null;
    'NO2': number | null;
    'SO2': number | null;
    'CO': number | null;
    'O3': number | null;
  };
  weather_context: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    conditions: string;
  };
  predictions: {
    [key: string]: {
      predicted_aqi: number;
      category: string;
      confidence: number;
    };
  } | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function HyperLocalAQI() {
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Unable to get your location. Using default location (Delhi Central).');
        // Default to Delhi Central
        setLocation({
          latitude: 28.7041,
          longitude: 77.1025,
          accuracy: 1000,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Fetch AQI data
  const fetchAQIData = async (lat: number, lng: number, includeForecast: boolean = true) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/citizen?action=hyperlocal-aqi&lat=${lat}&lng=${lng}&include_forecast=${includeForecast}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAqiData(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch AQI data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching AQI data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !location) return;

    const interval = setInterval(() => {
      fetchAQIData(location.latitude, location.longitude, false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, location]);

  // Initial load
  useEffect(() => {
    getUserLocation();
  }, []);

  // Fetch data when location changes
  useEffect(() => {
    if (location) {
      fetchAQIData(location.latitude, location.longitude);
    }
  }, [location]);

  const handleRefresh = () => {
    if (location) {
      fetchAQIData(location.latitude, location.longitude);
    }
  };

  const getAQIColor = (aqi: number): string => {
    if (aqi <= 50) return 'text-green-600 bg-green-50 border-green-200';
    if (aqi <= 100) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (aqi <= 200) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (aqi <= 300) return 'text-red-600 bg-red-50 border-red-200';
    if (aqi <= 400) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-red-900 bg-red-100 border-red-300';
  };

  const getBadgeVariant = (category: string): 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very_poor' | 'severe' => {
    switch (category.toLowerCase()) {
      case 'good': return 'good';
      case 'satisfactory': return 'satisfactory';
      case 'moderate': return 'moderate';
      case 'poor': return 'poor';
      case 'very poor': return 'very_poor';
      case 'severe': return 'severe';
      default: return 'moderate';
    }
  };

  const getHealthMessage = (aqi: number): string => {
    if (aqi <= 50) return 'Air quality is good. Ideal for outdoor activities.';
    if (aqi <= 100) return 'Air quality is acceptable. Sensitive individuals should be cautious.';
    if (aqi <= 200) return 'Air quality is moderate. Limit outdoor activities if sensitive.';
    if (aqi <= 300) return 'Air quality is poor. Avoid outdoor activities. Wear masks when outside.';
    if (aqi <= 400) return 'Air quality is very poor. Stay indoors. Use air purifiers.';
    return 'Air quality is severe. Health emergency. Avoid all outdoor exposure.';
  };

  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (error && !aqiData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={getUserLocation}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium">
              {aqiData?.location.name || 'Getting location...'}
            </p>
            {location && (
              <p className="text-sm text-gray-500">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Main AQI Display */}
      {aqiData && (
        <Card className={`${getAQIColor(aqiData.current_aqi.value)} border-2`}>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Badge variant={getBadgeVariant(aqiData.current_aqi.category)}>
                {aqiData.current_aqi.category}
              </Badge>
              <Badge variant="outline">
                {Math.round(aqiData.current_aqi.confidence_score * 100)}% confidence
              </Badge>
            </div>
            <CardTitle className="text-6xl font-bold">
              {aqiData.current_aqi.value || '--'}
            </CardTitle>
            <CardDescription className="text-lg font-medium">
              Air Quality Index
            </CardDescription>
            <p className="text-sm">
              Dominant pollutant: {aqiData.current_aqi.dominant_pollutant}
            </p>
          </CardHeader>
          
          <CardContent>
            <Alert variant={aqiData.current_aqi.value > 200 ? "warning" : "info"}>
              <AlertDescription>
                {getHealthMessage(aqiData.current_aqi.value)}
              </AlertDescription>
            </Alert>

            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Last updated: {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pollutant Details */}
      {aqiData?.pollutant_details && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pollutant Concentrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(aqiData.pollutant_details).map(([pollutant, value]) => (
                <div key={pollutant} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-lg">
                    {value !== null ? Math.round(value) : '--'}
                  </p>
                  <p className="text-sm text-gray-600">{pollutant}</p>
                  <p className="text-xs text-gray-500">
                    {pollutant.includes('CO') ? 'mg/m³' : 'µg/m³'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weather Context */}
      {aqiData?.weather_context && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Wind className="h-5 w-5 mr-2" />
              Weather Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-semibold">{Math.round(aqiData.weather_context.temperature)}°C</p>
                  <p className="text-sm text-gray-600">Temperature</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-semibold">{Math.round(aqiData.weather_context.humidity)}%</p>
                  <p className="text-sm text-gray-600">Humidity</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-semibold">{aqiData.weather_context.wind_speed} m/s</p>
                  <p className="text-sm text-gray-600">Wind Speed</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="font-semibold text-sm">{aqiData.weather_context.conditions}</p>
                  <p className="text-sm text-gray-600">Conditions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      {aqiData?.predictions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Forecast</CardTitle>
            <CardDescription>
              Predicted air quality for the next 48 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(aqiData.predictions).map(([horizon, prediction]) => (
                <div key={horizon} className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">{horizon}</p>
                  <p className="text-2xl font-bold mb-1">{prediction.predicted_aqi}</p>
                  <Badge 
                    variant={getBadgeVariant(prediction.category)}
                    className="text-xs"
                  >
                    {prediction.category}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(prediction.confidence)}% confidence
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seasonal Context */}
      {aqiData?.seasonal_context && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seasonal Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Season:</strong> {aqiData.seasonal_context.season}</p>
              <p><strong>Compared to seasonal average:</strong> 
                <span className={aqiData.seasonal_context.seasonal_context.compared_to_seasonal_avg > 0 ? 'text-red-600' : 'text-green-600'}>
                  {aqiData.seasonal_context.seasonal_context.compared_to_seasonal_avg > 0 ? '+' : ''}
                  {aqiData.seasonal_context.seasonal_context.compared_to_seasonal_avg}%
                </span>
              </p>
              <p><strong>Expected trend:</strong> {aqiData.seasonal_context.expected_trend.next_30_days}</p>
              {aqiData.seasonal_context.recommendations && (
                <div>
                  <strong>Recommendations:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {aqiData.seasonal_context.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !aqiData && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Loading air quality data...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
