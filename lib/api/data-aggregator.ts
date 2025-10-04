// lib/api/data-aggregator.ts
import { cpcbClient, AQIReading, CPCBStation } from './cpcb-client';
import { nasaMODISClient, MODISAerosolData } from './nasa-modis-client';
import { isroClient, ISROAerosolData } from './isro-client';
import { weatherClient, WeatherData, AirQualityWeatherCorrelation } from './weather-client';

export interface AggregatedAQIData {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
    region: 'Delhi' | 'NCR';
  };
  groundTruth: {
    aqi: number;
    category: string;
    pollutants: AQIReading['pollutants'];
    dominantPollutant: string;
    dataSource: 'CPCB' | 'Mock';
  };
  satelliteData: {
    modis: MODISAerosolData | null;
    isro: ISROAerosolData | null;
    confidence: number;
  };
  weather: WeatherData['current'];
  correlationAnalysis: AirQualityWeatherCorrelation['correlation_factors'];
  hyperLocalPrediction?: {
    predictedAQI: number;
    confidence: number;
    factors: string[];
  };
}

export interface RegionalSnapshot {
  timestamp: string;
  region: 'Delhi_NCR';
  overview: {
    averageAQI: number;
    category: string;
    stationCount: number;
    dataQuality: number;
  };
  stations: AggregatedAQIData[];
  trends: {
    last24h: { timestamp: string; aqi: number }[];
    weekly: { date: string; avgAQI: number }[];
  };
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: string;
    affectedAreas: string[];
  }[];
}

class DataAggregator {
  private cache = new Map<string, { data: any; expiry: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  async getAggregatedData(
    latitude: number,
    longitude: number,
    stationId?: string
  ): Promise<AggregatedAQIData> {
    const cacheKey = `agg_${latitude}_${longitude}_${stationId || 'auto'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Parallel data fetching
      const [aqiData, weatherData, modisData, isroData] = await Promise.all([
        stationId 
          ? cpcbClient.getRealtimeAQI(stationId) 
          : cpcbClient.getHyperLocalAQI(latitude, longitude),
        weatherClient.getCurrentWeather(latitude, longitude),
        this.getSatelliteData('modis', latitude, longitude),
        this.getSatelliteData('isro', latitude, longitude),
      ]);

      const primaryReading = aqiData || this.getDefaultReading(latitude, longitude);
      const correlation = weatherClient.calculateAQIWeatherCorrelation(
        primaryReading.aqi,
        weatherData.current
      );

      const aggregated: AggregatedAQIData = {
        timestamp: new Date().toISOString(),
        location: {
          latitude,
          longitude,
          name: primaryReading.stationName || weatherData.location.name,
          region: this.determineRegion(latitude, longitude),
        },
        groundTruth: {
          aqi: primaryReading.aqi,
          category: primaryReading.category,
          pollutants: primaryReading.pollutants,
          dominantPollutant: primaryReading.dominantPollutant,
          dataSource: primaryReading.stationId ? 'CPCB' : 'Mock',
        },
        satelliteData: {
          modis: modisData,
          isro: isroData,
          confidence: this.calculateSatelliteConfidence(modisData, isroData),
        },
        weather: weatherData.current,
        correlationAnalysis: correlation.correlation_factors,
        hyperLocalPrediction: this.generateHyperLocalPrediction(
          primaryReading,
          weatherData.current,
          modisData,
          isroData
        ),
      };

      this.setCache(cacheKey, aggregated);
      return aggregated;
    } catch (error) {
      console.error('Error aggregating data:', error);
      return this.getFallbackData(latitude, longitude);
    }
  }

  async getDelhiNCRSnapshot(): Promise<RegionalSnapshot> {
    const cacheKey = 'delhi_ncr_snapshot';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const stations = await cpcbClient.getDelhiNCRStations();
      const aggregatedPromises = stations.map(station =>
        this.getAggregatedData(
          station.location.latitude,
          station.location.longitude,
          station.id
        )
      );

      const aggregatedData = await Promise.all(aggregatedPromises);
      const validData = aggregatedData.filter(d => d.groundTruth.aqi > 0);

      const snapshot: RegionalSnapshot = {
        timestamp: new Date().toISOString(),
        region: 'Delhi_NCR',
        overview: {
          averageAQI: this.calculateAverage(validData.map(d => d.groundTruth.aqi)),
          category: this.getOverallCategory(validData.map(d => d.groundTruth.aqi)),
          stationCount: validData.length,
          dataQuality: this.calculateDataQuality(validData),
        },
        stations: validData,
        trends: await this.generateTrends(),
        alerts: this.generateAlerts(validData),
      };

      this.setCache(cacheKey, snapshot);
      return snapshot;
    } catch (error) {
      console.error('Error creating regional snapshot:', error);
      return this.getFallbackSnapshot();
    }
  }

  async getHyperLocalForecast(
    latitude: number,
    longitude: number,
    hours: number = 24
  ): Promise<{
    timestamp: string;
    location: { latitude: number; longitude: number };
    forecasts: Array<{
      datetime: string;
      predictedAQI: number;
      confidence: number;
      factors: string[];
      weather: {
        temperature: number;
        humidity: number;
        windSpeed: number;
      };
    }>;
  }> {
    try {
      const [currentData, weatherForecast] = await Promise.all([
        this.getAggregatedData(latitude, longitude),
        weatherClient.getWeatherForecast(latitude, longitude, Math.ceil(hours / 24)),
      ]);

      const forecasts = weatherForecast.slice(0, hours).map(forecast => {
        const predictedAQI = this.predictAQI(currentData, forecast);
        return {
          datetime: forecast.datetime,
          predictedAQI: predictedAQI.value,
          confidence: predictedAQI.confidence,
          factors: predictedAQI.factors,
          weather: {
            temperature: forecast.temperature.current,
            humidity: forecast.humidity,
            windSpeed: forecast.windSpeed,
          },
        };
      });

      return {
        timestamp: new Date().toISOString(),
        location: { latitude, longitude },
        forecasts,
      };
    } catch (error) {
      console.error('Error generating hyperlocal forecast:', error);
      throw error;
    }
  }

  private async getSatelliteData(
    source: 'modis' | 'isro',
    latitude: number,
    longitude: number
  ): Promise<MODISAerosolData | ISROAerosolData | null> {
    try {
      const today = new Date().toISOString().split('T');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T');

      if (source === 'modis') {
        const data = await nasaMODISClient.getAerosolData(latitude, longitude, yesterdayStr, today);
        return data || null;
      } else {
        const data = await isroClient.getOCM3AerosolData(latitude, longitude, yesterdayStr, today);
        return data || null;
      }
    } catch (error) {
      console.error(`Error fetching ${source} data:`, error);
      return null;
    }
  }

  private calculateSatelliteConfidence(
    modis: MODISAerosolData | null,
    isro: ISROAerosolData | null
  ): number {
    let confidence = 0;
    
    if (modis && modis.qualityFlag <= 2) confidence += 0.5;
    if (isro && isro.pixel_quality <= 1) confidence += 0.5;
    
    return confidence;
  }

  private generateHyperLocalPrediction(
    reading: AQIReading,
    weather: WeatherData['current'],
    modis: MODISAerosolData | null,
    isro: ISROAerosolData | null
  ) {
    const factors: string[] = [];
    let adjustedAQI = reading.aqi;

    // Weather-based adjustments
    if (weather.windSpeed < 2) {
      adjustedAQI *= 1.2;
      factors.push('Low wind dispersion');
    }
    if (weather.humidity > 80) {
      adjustedAQI *= 1.1;
      factors.push('High humidity');
    }
    if (weather.temperature < 10) {
      adjustedAQI *= 1.15;
      factors.push('Temperature inversion risk');
    }

    // Satellite data adjustments
    if (modis && modis.aod > 0.5) {
      adjustedAQI *= 1.1;
      factors.push('High aerosol optical depth');
    }

    const confidence = Math.max(0.3, Math.min(0.95, 
      0.8 - Math.abs(adjustedAQI - reading.aqi) / reading.aqi * 0.5
    ));

    return {
      predictedAQI: Math.round(adjustedAQI),
      confidence: Number(confidence.toFixed(2)),
      factors,
    };
  }

  private predictAQI(currentData: AggregatedAQIData, forecast: any) {
    let predicted = currentData.groundTruth.aqi;
    const factors: string[] = [];

    // Temperature effect
    if (forecast.temperature.current < 10) {
      predicted *= 1.2;
      factors.push('Cold temperature inversion');
    }

    // Wind effect
    if (forecast.windSpeed < 3) {
      predicted *= 1.15;
      factors.push('Low wind dispersion');
    } else if (forecast.windSpeed > 8) {
      predicted *= 0.85;
      factors.push('High wind clearing');
    }

    // Humidity effect
    if (forecast.humidity > 85) {
      predicted *= 1.1;
      factors.push('High humidity particulate formation');
    }

    // Precipitation effect
    if (forecast.precipitation.amount > 1) {
      predicted *= 0.7;
      factors.push('Rain washout effect');
    }

    return {
      value: Math.round(Math.max(0, Math.min(500, predicted))),
      confidence: 0.75,
      factors,
    };
  }

  private determineRegion(latitude: number, longitude: number): 'Delhi' | 'NCR' {
    // Delhi bounds: roughly 28.4-28.9 N, 76.8-77.3 E
    if (latitude >= 28.4 && latitude <= 28.9 && longitude >= 76.8 && longitude <= 77.3) {
      return 'Delhi';
    }
    return 'NCR';
  }

  private calculateAverage(values: number[]): number {
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  }

  private getOverallCategory(aqiValues: number[]): string {
    const avg = this.calculateAverage(aqiValues);
    if (avg <= 50) return 'Good';
    if (avg <= 100) return 'Satisfactory';
    if (avg <= 200) return 'Moderate';
    if (avg <= 300) return 'Poor';
    if (avg <= 400) return 'Very Poor';
    return 'Severe';
  }

  private calculateDataQuality(data: AggregatedAQIData[]): number {
    let quality = 0;
    data.forEach(d => {
      if (d.groundTruth.dataSource === 'CPCB') quality += 0.8;
      else quality += 0.4;
      
      if (d.satelliteData.confidence > 0.5) quality += 0.2;
    });
    return Number((quality / data.length).toFixed(2));
  }

  private async generateTrends() {
    // Mock implementation - in real app, query historical database
    const last24h = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      aqi: 150 + Math.random() * 100,
    }));

    const weekly = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T'),
      avgAQI: 140 + Math.random() * 80,
    }));

    return { last24h, weekly };
  }

  private generateAlerts(data: AggregatedAQIData[]) {
    const alerts = [];
    const highAQIStations = data.filter(d => d.groundTruth.aqi > 300);
    
    if (highAQIStations.length > 0) {
      alerts.push({
        level: 'critical' as const,
        message: `Severe air quality detected at ${highAQIStations.length} stations`,
        affectedAreas: highAQIStations.map(s => s.location.name),
      });
    }

    return alerts;
  }

  private getDefaultReading(latitude: number, longitude: number): AQIReading {
    return {
      stationId: 'default',
      stationName: 'Estimated Location',
      timestamp: new Date().toISOString(),
      aqi: 150,
      category: 'Moderate',
      pollutants: {
        pm25: { value: 60, unit: 'μg/m³' },
        pm10: { value: 100, unit: 'μg/m³' },
        no2: { value: 40, unit: 'μg/m³' },
        so2: { value: 15, unit: 'μg/m³' },
        co: { value: 2, unit: 'mg/m³' },
        o3: { value: 80, unit: 'μg/m³' },
      },
      dominantPollutant: 'PM2.5',
    };
  }

  private getFallbackData(latitude: number, longitude: number): AggregatedAQIData {
    return {
      timestamp: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        name: 'Fallback Location',
        region: this.determineRegion(latitude, longitude),
      },
      groundTruth: {
        aqi: 150,
        category: 'Moderate',
        pollutants: {
          pm25: { value: 60, unit: 'μg/m³' },
          pm10: { value: 100, unit: 'μg/m³' },
          no2: { value: 40, unit: 'μg/m³' },
          so2: { value: 15, unit: 'μg/m³' },
          co: { value: 2, unit: 'mg/m³' },
          o3: { value: 80, unit: 'μg/m³' },
        },
        dominantPollutant: 'PM2.5',
        dataSource: 'Mock',
      },
      satelliteData: {
        modis: null,
        isro: null,
        confidence: 0,
      },
      weather: {
        temperature: 25,
        humidity: 60,
        pressure: 1013,
        windSpeed: 3,
        windDirection: 180,
        visibility: 8,
        uvIndex: 5,
        cloudCover: 50,
      },
      correlationAnalysis: {
        wind_dispersion_index: 0.3,
        thermal_inversion_risk: 0.2,
        stagnation_index: 0.4,
        ventilation_coefficient: 0.6,
      },
    };
  }

  private getFallbackSnapshot(): RegionalSnapshot {
    return {
      timestamp: new Date().toISOString(),
      region: 'Delhi_NCR',
      overview: {
        averageAQI: 180,
        category: 'Moderate',
        stationCount: 0,
        dataQuality: 0,
      },
      stations: [],
      trends: {
        last24h: [],
        weekly: [],
      },
      alerts: [{
        level: 'warning',
        message: 'Data unavailable - using fallback',
        affectedAreas: ['All areas'],
      }],
    };
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheDuration,
    });
  }
}

export const dataAggregator = new DataAggregator();
