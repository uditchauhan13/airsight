import { NextRequest, NextResponse } from 'next/server';
import { advancedForecastingEngine, PredictionInput } from '@/lib/ml/forecasting-models';
import { modelTrainingSystem, TrainingData, ModelConfig } from '@/lib/ml/model-training';
import { cpcbClient } from '@/lib/api/cpcb-client';
import { weatherClient } from '@/lib/api/weather-client';
import { nasaMODISClient } from '@/lib/api/nasa-modis-client';
import { isroClient } from '@/lib/api/isro-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    switch (action) {
      case 'predict':
        return handlePrediction(searchParams);
        
      case 'batch-predict':
        return handleBatchPrediction(request);
        
      case 'model-performance':
        return handleModelPerformance();
        
      case 'feature-importance':
        return handleFeatureImportance(searchParams);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Forecasting API error:', error);
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
      case 'train-model':
        return handleModelTraining(body);
        
      case 'cross-validate':
        return handleCrossValidation(body);
        
      case 'optimize-hyperparameters':
        return handleHyperparameterOptimization(body);
        
      case 'ensemble-training':
        return handleEnsembleTraining(body);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Forecasting POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePrediction(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '28.7041');
  const lng = parseFloat(searchParams.get('lng') || '77.1025');
  const hours_back = parseInt(searchParams.get('hours_back') || '48');
  
  try {
    // Gather input data
    const predictionInput = await gatherPredictionInput(lat, lng, hours_back);
    
    // Make prediction
    const prediction = await advancedForecastingEngine.predictAQI(predictionInput);
    
    return NextResponse.json({
      success: true,
      prediction,
      input_data_quality: assessInputDataQuality(predictionInput),
    });
    
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { error: 'Prediction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleBatchPrediction(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { locations, hours_back = 48 } = body;
    
    if (!Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'locations must be an array of {lat, lng} objects' },
        { status: 400 }
      );
    }
    
    // Gather input data for all locations
    const predictionInputs = await Promise.all(
      locations.map(async (loc: { lat: number; lng: number }) => {
        return await gatherPredictionInput(loc.lat, loc.lng, hours_back);
      })
    );
    
    // Make batch predictions
    const predictions = await advancedForecastingEngine.batchPredict(predictionInputs);
    
    return NextResponse.json({
      success: true,
      predictions,
      total_locations: locations.length,
    });
    
  } catch (error) {
    console.error('Batch prediction error:', error);
    return NextResponse.json(
      { error: 'Batch prediction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleModelPerformance(): Promise<NextResponse> {
  try {
    const performance = await advancedForecastingEngine.getModelPerformance();
    
    return NextResponse.json({
      success: true,
      performance,
      total_models: performance.length,
    });
    
  } catch (error) {
    console.error('Model performance error:', error);
    return NextResponse.json(
      { error: 'Failed to get model performance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleFeatureImportance(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '28.7041');
  const lng = parseFloat(searchParams.get('lng') || '77.1025');
  
  try {
    // Get sample input for feature importance analysis
    const sampleInput = await gatherPredictionInput(lat, lng, 48);
    const prediction = await advancedForecastingEngine.predictAQI(sampleInput);
    
    return NextResponse.json({
      success: true,
      feature_importance: prediction.feature_importance,
      model_used: prediction.model_used,
      location: prediction.location,
    });
    
  } catch (error) {
    console.error('Feature importance error:', error);
    return NextResponse.json(
      { error: 'Failed to get feature importance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleModelTraining(body: any): Promise<NextResponse> {
  try {
    const { training_data, config, horizon = '24h' } = body;
    
    // Validate input
    if (!training_data || !config) {
      return NextResponse.json(
        { error: 'training_data and config are required' },
        { status: 400 }
      );
    }
    
    // Start training (this would typically be a background job)
    const trainingResult = await modelTrainingSystem.trainModel(
      training_data as TrainingData,
      config as ModelConfig,
      horizon
    );
    
    return NextResponse.json({
      success: true,
      training_result: trainingResult,
      message: 'Model training completed successfully',
    });
    
  } catch (error) {
    console.error('Model training error:', error);
    return NextResponse.json(
      { error: 'Model training failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleCrossValidation(body: any): Promise<NextResponse> {
  try {
    const { training_data, config, horizon = '24h' } = body;
    
    if (!training_data || !config) {
      return NextResponse.json(
        { error: 'training_data and config are required' },
        { status: 400 }
      );
    }
    
    const cvResult = await modelTrainingSystem.crossValidateModel(
      training_data as TrainingData,
      config as ModelConfig,
      horizon
    );
    
    return NextResponse.json({
      success: true,
      cross_validation_result: cvResult,
      message: 'Cross-validation completed successfully',
    });
    
  } catch (error) {
    console.error('Cross-validation error:', error);
    return NextResponse.json(
      { error: 'Cross-validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleHyperparameterOptimization(body: any): Promise<NextResponse> {
  try {
    const { training_data, model_type, param_grid, horizon = '24h' } = body;
    
    if (!training_data || !model_type || !param_grid) {
      return NextResponse.json(
        { error: 'training_data, model_type, and param_grid are required' },
        { status: 400 }
      );
    }
    
    const optimization = await modelTrainingSystem.optimizeHyperparameters(
      training_data as TrainingData,
      model_type,
      param_grid,
      horizon
    );
    
    return NextResponse.json({
      success: true,
      optimization_result: optimization,
      message: 'Hyperparameter optimization completed successfully',
    });
    
  } catch (error) {
    console.error('Hyperparameter optimization error:', error);
    return NextResponse.json(
      { error: 'Hyperparameter optimization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleEnsembleTraining(body: any): Promise<NextResponse> {
  try {
    const { training_data, base_configs, ensemble_method = 'weighted', horizon = '24h' } = body;
    
    if (!training_data || !base_configs) {
      return NextResponse.json(
        { error: 'training_data and base_configs are required' },
        { status: 400 }
      );
    }
    
    const ensembleResult = await modelTrainingSystem.trainEnsemble(
      training_data as TrainingData,
      base_configs as ModelConfig[],
      ensemble_method,
      horizon
    );
    
    return NextResponse.json({
      success: true,
      ensemble_result: ensembleResult,
      message: 'Ensemble training completed successfully',
    });
    
  } catch (error) {
    console.error('Ensemble training error:', error);
    return NextResponse.json(
      { error: 'Ensemble training failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to gather prediction input data
async function gatherPredictionInput(
  latitude: number, 
  longitude: number, 
  hours_back: number = 48
): Promise<PredictionInput> {
  
  try {
    // Parallel data fetching
    const [aqiData, weatherData, satelliteData] = await Promise.all([
      // AQI historical data
      cpcbClient.getHyperLocalAQI(latitude, longitude).catch(() => []),
      
      // Weather data
      weatherClient.getCurrentWeather(latitude, longitude).catch(() => null),
      
      // Satellite data
      Promise.all([
        nasaMODISClient.getRealtimeAerosolData().catch(() => []),
        isroClient.getDelhiNCRHotspots().catch(() => [])
      ])
    ]);
    
    const [modisData, fireData] = satelliteData;
    
    // Process AQI data
    const historical_aqi = aqiData.slice(-hours_back).map(reading => reading.aqi);
    
    // Process weather data
    const weather_features = {
      temperature: weatherData ? [weatherData.current.temperature] : [],
      humidity: weatherData ? [weatherData.current.humidity] : [],
      wind_speed: weatherData ? [weatherData.current.windSpeed] : [],
      wind_direction: weatherData ? [weatherData.current.windDirection] : [],
      pressure: weatherData ? [weatherData.current.pressure] : [],
      precipitation: , // Default no precipitation
      cloud_cover: weatherData ? [weatherData.current.cloudCover] : [],
    };
    
    // Process satellite data
    const satellite_features = {
      aod: modisData.map(d => d.aod),
      aerosol_index: modisData.map(d => d.angstromExponent),
      fire_count: [fireData.length],
    };
    
    // Temporal features
    const now = new Date();
    const temporal_features = {
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      day_of_year: Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)),
      month: now.getMonth() + 1,
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      is_holiday: false, // Would check holiday calendar in production
      season: getSeason(now.getMonth() + 1) as 'winter' | 'spring' | 'summer' | 'monsoon',
    };
    
    // Location features
    const location_features = {
      latitude,
      longitude,
      elevation: 200, // Default elevation for Delhi NCR
      urban_density: calculateUrbanDensity(latitude, longitude),
      traffic_density: calculateTrafficDensity(latitude, longitude),
      industrial_proximity: calculateIndustrialProximity(latitude, longitude),
    };
    
    // Emission features (simplified estimation)
    const emission_features = {
      vehicular_activity: calculateVehicularActivity(now.getHours(), now.getDay()),
      industrial_activity: calculateIndustrialActivity(now.getHours(), now.getDay()),
      construction_activity: 0.6, // Default medium construction activity
      stubble_burning: calculateStubbleBurning(now.getMonth() + 1, fireData.length),
    };
    
    return {
      historical_aqi,
      weather_features,
      satellite_features,
      temporal_features,
      location_features,
      emission_features,
    };
    
  } catch (error) {
    console.error('Error gathering prediction input:', error);
    
    // Return fallback input
    return getFallbackPredictionInput(latitude, longitude);
  }
}

// Helper functions
function getSeason(month: number): string {
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'summer';
}

function calculateUrbanDensity(lat: number, lng: number): number {
  // Distance from Delhi center
  const delhi_lat = 28.7041;
  const delhi_lng = 77.1025;
  const distance = Math.sqrt(Math.pow(lat - delhi_lat, 2) + Math.pow(lng - delhi_lng, 2));
  
  // Urban density decreases with distance
  return Math.max(0.2, Math.min(1.0, 1 - distance * 10));
}

function calculateTrafficDensity(lat: number, lng: number): number {
  // Simplified traffic density based on location
  const urban_density = calculateUrbanDensity(lat, lng);
  return Math.max(0.3, urban_density * 0.8 + Math.random() * 0.2);
}

function calculateIndustrialProximity(lat: number, lng: number): number {
  // Simplified industrial proximity (km to nearest industrial area)
  // Would use actual industrial zone data in production
  return Math.random() * 20 + 5;
}

function calculateVehicularActivity(hour: number, dayOfWeek: number): number {
  // Higher during rush hours and weekdays
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
  
  let activity = 0.5; // Base activity
  if (isWeekday) activity += 0.3;
  if (isRushHour) activity += 0.2;
  
  return Math.min(1.0, activity);
}

function calculateIndustrialActivity(hour: number, dayOfWeek: number): number {
  // Lower during nights and weekends
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isDaytime = hour >= 6 && hour <= 18;
  
  let activity = 0.4; // Base activity
  if (isWeekday) activity += 0.3;
  if (isDaytime) activity += 0.2;
  
  return Math.min(1.0, activity);
}

function calculateStubbleBurning(month: number, fireCount: number): number {
  // High during winter months (Oct-Jan) and based on fire detections
  const isStubbleSeeason = month >= 10 || month <= 1;
  let activity = isStubbleSeasan ? 0.6 : 0.1;
  
  // Adjust based on fire count
  activity += Math.min(0.4, fireCount / 100);
  
  return Math.min(1.0, activity);
}

function assessInputDataQuality(input: PredictionInput): any {
  const quality = {
    historical_aqi_availability: input.historical_aqi.length / 48, // Expected 48 hours
    weather_data_completeness: Object.values(input.weather_features).filter(arr => arr.length > 0).length / 7,
    satellite_data_availability: (input.satellite_features.aod.length > 0 ? 0.5 : 0) + 
                                (input.satellite_features.fire_count > 0 ? 0.5 : 0),
    overall_score: 0,
  };
  
  quality.overall_score = (
    quality.historical_aqi_availability * 0.4 +
    quality.weather_data_completeness * 0.4 +
    quality.satellite_data_availability * 0.2
  );
  
  return quality;
}

function getFallbackPredictionInput(latitude: number, longitude: number): PredictionInput {
  const now = new Date();
  
  return {
    historical_aqi: [150, 145, 160, 155], // Fallback historical data
    weather_features: {
      temperature: ,
      humidity: ,
      wind_speed: ,
      wind_direction: ,
      pressure: [1013],
      precipitation: ,
      cloud_cover: ,
    },
    satellite_features: {
      aod: [0.5],
      aerosol_index: [1.2],
      fire_count: ,
    },
    temporal_features: {
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      day_of_year: Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)),
      month: now.getMonth() + 1,
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      is_holiday: false,
      season: getSeason(now.getMonth() + 1) as 'winter' | 'spring' | 'summer' | 'monsoon',
    },
    location_features: {
      latitude,
      longitude,
      elevation: 200,
      urban_density: 0.7,
      traffic_density: 0.6,
      industrial_proximity: 10,
    },
    emission_features: {
      vehicular_activity: 0.6,
      industrial_activity: 0.5,
      construction_activity: 0.4,
      stubble_burning: 0.2,
    },
  };
}
    