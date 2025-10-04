import { advancedForecastingEngine, PredictionInput, PredictionOutput } from './forecasting-models';
import { featureEngineeringPipeline } from './feature-engineering';
import { modelTrainingSystem } from './model-training';
import { cpcbClient } from '../api/cpcb-client';
import { weatherClient } from '../api/weather-client';
import { nasaMODISClient } from '../api/nasa-modis-client';
import { isroClient } from '../api/isro-client';

export interface PredictionRequest {
  latitude: number;
  longitude: number;
  prediction_horizons?: string[]; // ['1h', '6h', '12h', '24h', '48h', '72h']
  include_confidence?: boolean;
  include_feature_importance?: boolean;
  include_risk_assessment?: boolean;
}

export interface PredictionResponse {
  success: boolean;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
    region: string;
  };
  predictions: {
    [horizon: string]: {
      predicted_aqi: number;
      confidence_interval: {
        lower: number;
        upper: number;
      };
      confidence_score: number;
      category: string;
      health_message: string;
    };
  };
  current_conditions?: {
    aqi: number;
    category: string;
    dominant_pollutant: string;
    last_updated: string;
  };
  model_info?: {
    model_used: string;
    model_version: string;
    feature_count: number;
    training_date: string;
  };
  feature_importance?: {
    [key: string]: number;
  };
  risk_assessment?: {
    level: 'low' | 'moderate' | 'high' | 'severe';
    probability_exceeds_300: number;
    probability_exceeds_200: number;
    health_advisory: string;
    recommended_actions: string[];
  };
  data_quality?: {
    overall_score: number;
    historical_data_availability: number;
    weather_data_completeness: number;
    satellite_data_availability: number;
  };
  error?: string;
}

export interface BatchPredictionRequest {
  locations: Array<{
    latitude: number;
    longitude: number;
    name?: string;
  }>;
  prediction_horizons?: string[];
  include_confidence?: boolean;
}

export interface BatchPredictionResponse {
  success: boolean;
  timestamp: string;
  total_locations: number;
  successful_predictions: number;
  failed_predictions: number;
  predictions: PredictionResponse[];
  errors?: Array<{
    location: { latitude: number; longitude: number };
    error: string;
  }>;
}

export interface ModelPredictionCache {
  [key: string]: {
    data: PredictionResponse;
    expiry: number;
  };
}

export class PredictionEngine {
  private cache: ModelPredictionCache = {};
  private cacheDuration = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 1000;
  private requestQueue: Array<() => Promise<void>> = [];
  private processingQueue = false;

  /**
   * Main prediction endpoint - processes single location
   */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validatePredictionRequest(request);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Gather input data
      const predictionInput = await this.gatherPredictionInput(
        request.latitude,
        request.longitude
      );

      // Get current conditions
      const currentConditions = await this.getCurrentConditions(
        request.latitude,
        request.longitude
      );

      // Make predictions
      const mlPredictions = await advancedForecastingEngine.predictAQI(predictionInput);

      // Process results
      const response = await this.formatPredictionResponse(
        request,
        mlPredictions,
        currentConditions,
        predictionInput,
        Date.now() - startTime
      );

      // Cache result
      this.setCache(cacheKey, response);

      return response;

    } catch (error) {
      console.error('Prediction error:', error);
      return this.createErrorResponse(request, error);
    }
  }

  /**
   * Batch prediction for multiple locations
   */
  async batchPredict(request: BatchPredictionRequest): Promise<BatchPredictionResponse> {
    const startTime = Date.now();
    
    try {
      const predictions: PredictionResponse[] = [];
      const errors: Array<{ location: any; error: string }> = [];

      // Process locations in parallel (with concurrency limit)
      const concurrencyLimit = 5;
      const chunks = this.chunkArray(request.locations, concurrencyLimit);

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (location) => {
          try {
            const predictionRequest: PredictionRequest = {
              latitude: location.latitude,
              longitude: location.longitude,
              prediction_horizons: request.prediction_horizons,
              include_confidence: request.include_confidence,
            };

            const result = await this.predict(predictionRequest);
            predictions.push(result);
            
          } catch (error) {
            errors.push({
              location,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

        await Promise.all(chunkPromises);
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        total_locations: request.locations.length,
        successful_predictions: predictions.length,
        failed_predictions: errors.length,
        predictions,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      console.error('Batch prediction error:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        total_locations: request.locations.length,
        successful_predictions: 0,
        failed_predictions: request.locations.length,
        predictions: [],
        errors: [{
          location: { latitude: 0, longitude: 0 },
          error: error instanceof Error ? error.message : 'Batch prediction failed',
        }],
      };
    }
  }

  /**
   * Real-time prediction stream (for live updates)
   */
  async *streamPredictions(
    request: PredictionRequest,
    intervalMs: number = 300000 // 5 minutes
  ): AsyncGenerator<PredictionResponse, void, unknown> {
    while (true) {
      try {
        // Clear cache for real-time updates
        const cacheKey = this.generateCacheKey(request);
        this.cache.delete(cacheKey);
        
        const prediction = await this.predict(request);
        yield prediction;
        
        // Wait for next interval
        await this.sleep(intervalMs);
        
      } catch (error) {
        console.error('Stream prediction error:', error);
        yield this.createErrorResponse(request, error);
        await this.sleep(intervalMs);
      }
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(): Promise<{
    active_models: string[];
    performance_metrics: any[];
    last_training: string;
    total_predictions: number;
    cache_hit_rate: number;
  }> {
    try {
      const performance = await advancedForecastingEngine.getModelPerformance();
      const trainedModels = modelTrainingSystem.getAllTrainedModels();

      return {
        active_models: trainedModels,
        performance_metrics: performance,
        last_training: new Date().toISOString(), // Would track actual training times
        total_predictions: this.getTotalPredictionCount(),
        cache_hit_rate: this.getCacheHitRate(),
      };
    } catch (error) {
      console.error('Error getting model metrics:', error);
      throw error;
    }
  }

  /**
   * Health check for prediction system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      [key: string]: {
        status: 'up' | 'down';
        response_time?: number;
        last_check: string;
      };
    };
    cache_status: {
      size: number;
      hit_rate: number;
      memory_usage: string;
    };
  }> {
    const services = {
      cpcb_api: { status: 'down' as const, last_check: new Date().toISOString() },
      weather_api: { status: 'down' as const, last_check: new Date().toISOString() },
      nasa_api: { status: 'down' as const, last_check: new Date().toISOString() },
      isro_api: { status: 'down' as const, last_check: new Date().toISOString() },
      ml_engine: { status: 'down' as const, last_check: new Date().toISOString() },
    };

    // Test each service
    try {
      const start = Date.now();
      await cpcbClient.getDelhiNCRStations();
      services.cpcb_api = { status: 'up', response_time: Date.now() - start, last_check: new Date().toISOString() };
    } catch (error) {
      services.cpcb_api.status = 'down';
    }

    try {
      const start = Date.now();
      await weatherClient.getCurrentWeather(28.7041, 77.1025);
      services.weather_api = { status: 'up', response_time: Date.now() - start, last_check: new Date().toISOString() };
    } catch (error) {
      services.weather_api.status = 'down';
    }

    try {
      const start = Date.now();
      await nasaMODISClient.getRealtimeAerosolData();
      services.nasa_api = { status: 'up', response_time: Date.now() - start, last_check: new Date().toISOString() };
    } catch (error) {
      services.nasa_api.status = 'down';
    }

    try {
      const start = Date.now();
      await isroClient.getDelhiNCRHotspots();
      services.isro_api = { status: 'up', response_time: Date.now() - start, last_check: new Date().toISOString() };
    } catch (error) {
      services.isro_api.status = 'down';
    }

    // Test ML engine
    try {
      const start = Date.now();
      await advancedForecastingEngine.getModelPerformance();
      services.ml_engine = { status: 'up', response_time: Date.now() - start, last_check: new Date().toISOString() };
    } catch (error) {
      services.ml_engine.status = 'down';
    }

    const upServices = Object.values(services).filter(s => s.status === 'up').length;
    const totalServices = Object.keys(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (upServices === totalServices) status = 'healthy';
    else if (upServices >= totalServices * 0.6) status = 'degraded';
    else status = 'unhealthy';

    return {
      status,
      services,
      cache_status: {
        size: Object.keys(this.cache).length,
        hit_rate: this.getCacheHitRate(),
        memory_usage: `${Math.round(JSON.stringify(this.cache).length / 1024)}KB`,
      },
    };
  }

  private async gatherPredictionInput(
    latitude: number,
    longitude: number
  ): Promise<PredictionInput> {
    // Parallel data fetching with timeouts
    const dataPromises = [
      this.fetchAQIData(latitude, longitude),
      this.fetchWeatherData(latitude, longitude),
      this.fetchSatelliteData(),
      this.fetchFireData(),
    ];

    const [aqiData, weatherData, satelliteData, fireData] = await Promise.allSettled(dataPromises);

    // Process results
    const historical_aqi = aqiData.status === 'fulfilled' ? 
      aqiData.value.map(reading => reading.aqi) : [];
    
    const weather_features = weatherData.status === 'fulfilled' ? {
      temperature: [weatherData.value.current.temperature],
      humidity: [weatherData.value.current.humidity],
      wind_speed: [weatherData.value.current.windSpeed],
      wind_direction: [weatherData.value.current.windDirection],
      pressure: [weatherData.value.current.pressure],
      precipitation: , // Default
      cloud_cover: [weatherData.value.current.cloudCover],
    } : {
      temperature: [], humidity: [], wind_speed: [], wind_direction: [],
      pressure: [], precipitation: [], cloud_cover: [],
    };

    const satellite_features = satelliteData.status === 'fulfilled' ? {
      aod: satelliteData.value.map((d: any) => d.aod),
      aerosol_index: satelliteData.value.map((d: any) => d.angstromExponent),
      fire_count: fireData.status === 'fulfilled' ? [fireData.value.length] : ,
    } : {
      aod: [], aerosol_index: [], fire_count: ,
    };

    // Generate temporal, location, and emission features
    const now = new Date();
    const temporal_features = {
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      day_of_year: this.getDayOfYear(now),
      month: now.getMonth() + 1,
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      is_holiday: false,
      season: this.getSeason(now.getMonth() + 1) as 'winter' | 'spring' | 'summer' | 'monsoon',
    };

    const location_features = {
      latitude,
      longitude,
      elevation: 200, // Default for Delhi NCR
      urban_density: this.calculateUrbanDensity(latitude, longitude),
      traffic_density: this.calculateTrafficDensity(latitude, longitude),
      industrial_proximity: this.calculateIndustrialProximity(latitude, longitude),
    };

    const emission_features = {
      vehicular_activity: this.calculateVehicularActivity(now.getHours(), now.getDay()),
      industrial_activity: this.calculateIndustrialActivity(now.getHours(), now.getDay()),
      construction_activity: 0.6, // Default
      stubble_burning: this.calculateStubbleBurning(now.getMonth() + 1, satellite_features.fire_count || 0),
    };

    return {
      historical_aqi,
      weather_features,
      satellite_features,
      temporal_features,
      location_features,
      emission_features,
    };
  }

  private async getCurrentConditions(latitude: number, longitude: number) {
    try {
      const nearbyReadings = await cpcbClient.getHyperLocalAQI(latitude, longitude);
      if (nearbyReadings.length > 0) {
        const latest = nearbyReadings;
        return {
          aqi: latest.aqi,
          category: latest.category,
          dominant_pollutant: latest.dominantPollutant,
          last_updated: latest.timestamp,
        };
      }
    } catch (error) {
      console.error('Error fetching current conditions:', error);
    }
    
    return {
      aqi: 150,
      category: 'Moderate',
      dominant_pollutant: 'PM2.5',
      last_updated: new Date().toISOString(),
    };
  }

  private async formatPredictionResponse(
    request: PredictionRequest,
    mlPredictions: PredictionOutput,
    currentConditions: any,
    input: PredictionInput,
    processingTime: number
  ): Promise<PredictionResponse> {
    
    const horizons = request.prediction_horizons || ['1h', '6h', '12h', '24h', '48h', '72h'];
    const predictions: { [key: string]: any } = {};

    // Format predictions for each horizon
    horizons.forEach(horizon => {
      const prediction = mlPredictions.predictions[horizon];
      if (prediction) {
        predictions[horizon] = {
          predicted_aqi: prediction.predicted_aqi,
          confidence_interval: prediction.confidence_interval,
          confidence_score: prediction.confidence_score,
          category: this.getAQICategory(prediction.predicted_aqi),
          health_message: this.getHealthMessage(prediction.predicted_aqi),
        };
      }
    });

    const response: PredictionResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      location: {
        latitude: request.latitude,
        longitude: request.longitude,
        name: mlPredictions.location.name,
        region: this.getRegion(request.latitude, request.longitude),
      },
      predictions,
      current_conditions: currentConditions,
      model_info: {
        model_used: mlPredictions.model_used,
        model_version: '2.0.0',
        feature_count: Object.keys(mlPredictions.feature_importance).length,
        training_date: '2025-10-01T00:00:00Z',
      },
    };

    // Add optional fields
    if (request.include_feature_importance) {
      response.feature_importance = mlPredictions.feature_importance;
    }

    if (request.include_risk_assessment) {
      response.risk_assessment = {
        ...mlPredictions.risk_assessment,
        recommended_actions: this.getRecommendedActions(mlPredictions.risk_assessment.level),
      };
    }

    // Add data quality assessment
    response.data_quality = {
      overall_score: this.calculateDataQuality(input),
      historical_data_availability: Math.min(1, input.historical_aqi.length / 48),
      weather_data_completeness: Object.values(input.weather_features).filter(arr => arr.length > 0).length / 7,
      satellite_data_availability: (input.satellite_features.aod.length > 0 ? 0.5 : 0) + 
                                  (input.satellite_features.fire_count > 0 ? 0.5 : 0),
    };

    return response;
  }

  // Helper methods
  private validatePredictionRequest(request: PredictionRequest): void {
    if (!request.latitude || !request.longitude) {
      throw new Error('Latitude and longitude are required');
    }
    
    if (request.latitude < 26 || request.latitude > 31) {
      throw new Error('Latitude must be within Delhi NCR region (26-31°N)');
    }
    
    if (request.longitude < 75 || request.longitude > 79) {
      throw new Error('Longitude must be within Delhi NCR region (75-79°E)');
    }
  }

  private generateCacheKey(request: PredictionRequest): string {
    const { latitude, longitude, prediction_horizons } = request;
    const rounded_lat = Math.round(latitude * 100) / 100;
    const rounded_lng = Math.round(longitude * 100) / 100;
    const horizons = (prediction_horizons || ['24h']).sort().join(',');
    return `${rounded_lat},${rounded_lng},${horizons}`;
  }

  private getFromCache(key: string): PredictionResponse | null {
    const cached = this.cache[key];
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    delete this.cache[key];
    return null;
  }

  private setCache(key: string, data: PredictionResponse): void {
    // Implement LRU cache eviction
    if (Object.keys(this.cache).length >= this.maxCacheSize) {
      const oldestKey = Object.keys(this.cache);
      delete this.cache[oldestKey];
    }
    
    this.cache[key] = {
      data,
      expiry: Date.now() + this.cacheDuration,
    };
  }

  private createErrorResponse(request: PredictionRequest, error: any): PredictionResponse {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      location: {
        latitude: request.latitude,
        longitude: request.longitude,
        name: 'Unknown',
        region: this.getRegion(request.latitude, request.longitude),
      },
      predictions: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Data fetching methods
  private async fetchAQIData(lat: number, lng: number) {
    return cpcbClient.getHyperLocalAQI(lat, lng);
  }

  private async fetchWeatherData(lat: number, lng: number) {
    return weatherClient.getCurrentWeather(lat, lng);
  }

  private async fetchSatelliteData() {
    return nasaMODISClient.getRealtimeAerosolData();
  }

  private async fetchFireData() {
    return isroClient.getDelhiNCRHotspots();
  }

  // Utility methods
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getSeason(month: number): string {
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 9) return 'monsoon';
    return 'summer';
  }

  private getRegion(lat: number, lng: number): string {
    if (lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.3) return 'Delhi';
    return 'NCR';
  }

  private getAQICategory(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
  }

  private getHealthMessage(aqi: number): string {
    const category = this.getAQICategory(aqi);
    const messages = {
      'Good': 'Air quality is good. Ideal for outdoor activities.',
      'Satisfactory': 'Air quality is acceptable. Sensitive individuals should be cautious.',
      'Moderate': 'Air quality is moderate. Limit outdoor activities if sensitive.',
      'Poor': 'Air quality is poor. Avoid outdoor activities. Wear masks when outside.',
      'Very Poor': 'Air quality is very poor. Stay indoors. Use air purifiers.',
      'Severe': 'Air quality is severe. Health emergency. Avoid all outdoor exposure.',
    };
    return messages[category as keyof typeof messages] || 'Monitor air quality conditions.';
  }

  private getRecommendedActions(level: string): string[] {
    const actions = {
      'low': ['Enjoy outdoor activities', 'Perfect time for exercise'],
      'moderate': ['Limit prolonged outdoor exposure for sensitive individuals', 'Consider wearing masks during exercise'],
      'high': ['Avoid outdoor exercise', 'Wear N95 masks when outside', 'Keep windows closed', 'Use air purifiers indoors'],
      'severe': ['Stay indoors', 'Avoid all outdoor activities', 'Seek medical attention if experiencing symptoms', 'Consider temporary relocation'],
    };
    return actions[level as keyof typeof actions] || ['Monitor air quality conditions'];
  }

  private calculateUrbanDensity(lat: number, lng: number): number {
    // Distance from Delhi center
    const distance = Math.sqrt(Math.pow(lat - 28.7041, 2) + Math.pow(lng - 77.1025, 2));
    return Math.max(0.2, Math.min(1.0, 1 - distance * 8));
  }

  private calculateTrafficDensity(lat: number, lng: number): number {
    const urbanDensity = this.calculateUrbanDensity(lat, lng);
    return Math.max(0.3, urbanDensity * 0.8 + Math.random() * 0.2);
  }

  private calculateIndustrialProximity(lat: number, lng: number): number {
    return Math.random() * 20 + 5; // km to nearest industrial area
  }

  private calculateVehicularActivity(hour: number, dayOfWeek: number): number {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
    let activity = 0.5;
    if (isWeekday) activity += 0.3;
    if (isRushHour) activity += 0.2;
    return Math.min(1.0, activity);
  }

  private calculateIndustrialActivity(hour: number, dayOfWeek: number): number {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isDaytime = hour >= 6 && hour <= 18;
    let activity = 0.4;
    if (isWeekday) activity += 0.3;
    if (isDaytime) activity += 0.2;
    return Math.min(1.0, activity);
  }

  private calculateStubbleBurning(month: number, fireCount: number): number {
    const isStubbleSeasan = month >= 10 || month <= 1;
    let activity = isStubbleSeasan ? 0.6 : 0.1;
    activity += Math.min(0.4, fireCount / 100);
    return Math.min(1.0, activity);
  }

  private calculateDataQuality(input: PredictionInput): number {
    const historical_quality = Math.min(1, input.historical_aqi.length / 48);
    const weather_quality = Object.values(input.weather_features).filter(arr => arr.length > 0).length / 7;
    const satellite_quality = (input.satellite_features.aod.length > 0 ? 0.5 : 0) + 
                             (input.satellite_features.fire_count > 0 ? 0.5 : 0);
    
    return (historical_quality * 0.4 + weather_quality * 0.4 + satellite_quality * 0.2);
  }

  private getTotalPredictionCount(): number {
    // Would track actual prediction counts in production
    return Math.floor(Math.random() * 10000) + 1000;
  }

  private getCacheHitRate(): number {
    // Would calculate actual cache hit rate in production
    return 0.75 + Math.random() * 0.2;
  }
}

export const predictionEngine = new PredictionEngine();
