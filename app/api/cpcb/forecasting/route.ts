import { NextRequest, NextResponse } from 'next/server'
import { advancedForecastingEngine, PredictionInput } from '@/lib/ml/forecasting-models'
import { modelTrainingSystem, TrainingData, ModelConfig } from '@/lib/ml/model-training'
import { cpcbClient } from '@/lib/api/cpcb-client'
import { weatherClient } from '@/lib/api/weather-client'
import { nasaMODISClient } from '@/lib/api/nasa-modis-client'
import { isroClient } from '@/lib/api/isro-client'

// GET handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'predict':
        return handlePrediction(searchParams)
      case 'batch-predict':
        return handleBatchPrediction(request)
      case 'model-performance':
        return handleModelPerformance()
      case 'feature-importance':
        return handleFeatureImportance(searchParams)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Forecasting API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST handler
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    const body = await request.json()

    switch (action) {
      case 'train-model':
        return handleModelTraining(body)
      case 'cross-validate':
        return handleCrossValidation(body)
      case 'optimize-hyperparameters':
        return handleHyperparameterOptimization(body)
      case 'ensemble-training':
        return handleEnsembleTraining(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Forecasting POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/* ---------- Actions ---------- */

async function handlePrediction(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '28.7041')
  const lng = parseFloat(searchParams.get('lng') || '77.1025')
  const hours_back = parseInt(searchParams.get('hours_back') || '48')

  try {
    const predictionInput = await gatherPredictionInput(lat, lng, hours_back)
    const prediction = await advancedForecastingEngine.predictAQI(predictionInput)

    return NextResponse.json({
      success: true,
      prediction,
      input_data_quality: assessInputDataQuality(predictionInput),
    })
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      { error: 'Prediction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleBatchPrediction(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { locations, hours_back = 48 } = body

    if (!Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'locations must be an array of {lat, lng} objects' },
        { status: 400 }
      )
    }

    const predictionInputs = await Promise.all(
      locations.map(async (loc: { lat: number; lng: number }) =>
        gatherPredictionInput(loc.lat, loc.lng, hours_back)
      )
    )

    const predictions = await advancedForecastingEngine.batchPredict(predictionInputs)

    return NextResponse.json({
      success: true,
      predictions,
      total_locations: locations.length,
    })
  } catch (error) {
    console.error('Batch prediction error:', error)
    return NextResponse.json(
      { error: 'Batch prediction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleModelPerformance(): Promise<NextResponse> {
  try {
    const performance = await advancedForecastingEngine.getModelPerformance()
    return NextResponse.json({
      success: true,
      performance,
      total_models: performance.length,
    })
  } catch (error) {
    console.error('Model performance error:', error)
    return NextResponse.json(
      { error: 'Failed to get model performance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleFeatureImportance(searchParams: URLSearchParams): Promise<NextResponse> {
  const lat = parseFloat(searchParams.get('lat') || '28.7041')
  const lng = parseFloat(searchParams.get('lng') || '77.1025')

  try {
    const sampleInput = await gatherPredictionInput(lat, lng, 48)
    const prediction = await advancedForecastingEngine.predictAQI(sampleInput)

    return NextResponse.json({
      success: true,
      feature_importance: prediction.feature_importance,
      model_used: prediction.model_used,
      location: prediction.location,
    })
  } catch (error) {
    console.error('Feature importance error:', error)
    return NextResponse.json(
      { error: 'Failed to get feature importance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleModelTraining(body: any): Promise<NextResponse> {
  try {
    const { training_data, config, horizon = '24h' } = body

    if (!training_data || !config) {
      return NextResponse.json(
        { error: 'training_data and config are required' },
        { status: 400 }
      )
    }

    const trainingResult = await modelTrainingSystem.trainModel(
      training_data as TrainingData,
      config as ModelConfig,
      horizon
    )

    return NextResponse.json({
      success: true,
      training_result: trainingResult,
      message: 'Model training completed successfully',
    })
  } catch (error) {
    console.error('Model training error:', error)
    return NextResponse.json(
      { error: 'Model training failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleCrossValidation(body: any): Promise<NextResponse> {
  try {
    const { training_data, config, horizon = '24h' } = body

    if (!training_data || !config) {
      return NextResponse.json(
        { error: 'training_data and config are required' },
        { status: 400 }
      )
    }

    const cvResult = await modelTrainingSystem.crossValidateModel(
      training_data as TrainingData,
      config as ModelConfig,
      horizon
    )

    return NextResponse.json({
      success: true,
      cross_validation_result: cvResult,
      message: 'Cross-validation completed successfully',
    })
  } catch (error) {
    console.error('Cross-validation error:', error)
    return NextResponse.json(
      { error: 'Cross-validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleHyperparameterOptimization(body: any): Promise<NextResponse> {
  try {
    const { training_data, model_type, param_grid, horizon = '24h' } = body

    if (!training_data || !model_type || !param_grid) {
      return NextResponse.json(
        { error: 'training_data, model_type, and param_grid are required' },
        { status: 400 }
      )
    }

    const optimization = await modelTrainingSystem.optimizeHyperparameters(
      training_data as TrainingData,
      model_type,
      param_grid,
      horizon
    )

    return NextResponse.json({
      success: true,
      optimization_result: optimization,
      message: 'Hyperparameter optimization completed successfully',
    })
  } catch (error) {
    console.error('Hyperparameter optimization error:', error)
    return NextResponse.json(
      { error: 'Hyperparameter optimization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleEnsembleTraining(body: any): Promise<NextResponse> {
  try {
    const { training_data, base_configs, ensemble_method = 'weighted', horizon = '24h' } = body

    if (!training_data || !base_configs) {
      return NextResponse.json(
        { error: 'training_data and base_configs are required' },
        { status: 400 }
      )
    }

    const ensembleResult = await modelTrainingSystem.trainEnsemble(
      training_data as TrainingData,
      base_configs as ModelConfig[],
      ensemble_method,
      horizon
    )

    return NextResponse.json({
      success: true,
      ensemble_result: ensembleResult,
      message: 'Ensemble training completed successfully',
    })
  } catch (error) {
    console.error('Ensemble training error:', error)
    return NextResponse.json(
      { error: 'Ensemble training failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/* ---------- Data gathering & helpers ---------- */

async function gatherPredictionInput(
  latitude: number,
  longitude: number,
  hours_back: number = 48
): Promise<PredictionInput> {
  try {
    // Fetch in parallel with internal error handling
    const [aqiData, weatherData, satelliteData] = await Promise.all([
      cpcbClient.getHyperLocalAQI(latitude, longitude).catch(() => []),
      weatherClient.getCurrentWeather(latitude, longitude).catch(() => null),
      Promise.all([
        nasaMODISClient.getRealtimeAerosolData().catch(() => []),
        isroClient.getDelhiNCRHotspots().catch(() => []),
      ]),
    ])

    const [modisData, fireData] = satelliteData

    // AQI time series (limit to hours_back)
    const historical_aqi = Array.isArray(aqiData)
      ? aqiData.slice(-hours_back).map((r: any) => r.aqi).filter((n: any) => typeof n === 'number')
      : []

    // Weather features (always arrays, even if empty)
    const weather_features = {
      temperature: weatherData ? [weatherData.current.temperature] : [],
      humidity: weatherData ? [weatherData.current.humidity] : [],
      wind_speed: weatherData ? [weatherData.current.windSpeed] : [],
      wind_direction: weatherData ? [weatherData.current.windDirection] : [],
      pressure: weatherData ? [weatherData.current.pressure] : [],
      precipitation: [], // default empty (no precip)
      cloud_cover: weatherData ? [weatherData.current.cloudCover] : [],
    }

    // Satellite features (always arrays)
    const satellite_features = {
      aod: Array.isArray(modisData) ? modisData.map((d: any) => d.aod ?? 0).filter((n: any) => typeof n === 'number') : [],
      aerosol_index: Array.isArray(modisData)
        ? modisData.map((d: any) => d.angstromExponent ?? 0).filter((n: any) => typeof n === 'number')
        : [],
      fire_count: [Array.isArray(fireData) ? fireData.length : 0],
    }

    // Temporal
    const now = new Date()
    const temporal_features = {
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      day_of_year: Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)),
      month: now.getMonth() + 1,
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      is_holiday: false,
      season: getSeason(now.getMonth() + 1) as 'winter' | 'spring' | 'summer' | 'monsoon',
    }

    // Location
    const location_features = {
      latitude,
      longitude,
      elevation: 200,
      urban_density: calculateUrbanDensity(latitude, longitude),
      traffic_density: calculateTrafficDensity(latitude, longitude),
      industrial_proximity: calculateIndustrialProximity(latitude, longitude),
    }

    // Emissions (simplified estimations)
    const emission_features = {
      vehicular_activity: calculateVehicularActivity(temporal_features.hour_of_day, temporal_features.day_of_week),
      industrial_activity: calculateIndustrialActivity(temporal_features.hour_of_day, temporal_features.day_of_week),
      construction_activity: 0.6,
      stubble_burning: calculateStubbleBurning(temporal_features.month, satellite_features.fire_count[0] || 0),
    }

    return {
      historical_aqi,
      weather_features,
      satellite_features,
      temporal_features,
      location_features,
      emission_features,
    }
  } catch (error) {
    console.error('Error gathering prediction input:', error)
    return getFallbackPredictionInput(latitude, longitude)
  }
}

/* ----- Utilities ----- */

function getSeason(month: number): string {
  if (month >= 12 || month <= 2) return 'winter'
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 9) return 'monsoon'
  return 'summer'
}

function calculateUrbanDensity(lat: number, lng: number): number {
  const delhi_lat = 28.7041
  const delhi_lng = 77.1025
  const distance = Math.sqrt(Math.pow(lat - delhi_lat, 2) + Math.pow(lng - delhi_lng, 2))
  return Math.max(0.2, Math.min(1.0, 1 - distance * 10))
}

function calculateTrafficDensity(lat: number, lng: number): number {
  const urban_density = calculateUrbanDensity(lat, lng)
  return Math.max(0.3, urban_density * 0.8 + Math.random() * 0.2)
}

function calculateIndustrialProximity(_lat: number, _lng: number): number {
  return Math.random() * 20 + 5
}

function calculateVehicularActivity(hour: number, dayOfWeek: number): number {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)
  let activity = 0.5
  if (isWeekday) activity += 0.3
  if (isRushHour) activity += 0.2
  return Math.min(1.0, activity)
}

function calculateIndustrialActivity(hour: number, dayOfWeek: number): number {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isDaytime = hour >= 6 && hour <= 18
  let activity = 0.4
  if (isWeekday) activity += 0.3
  if (isDaytime) activity += 0.2
  return Math.min(1.0, activity)
}

function calculateStubbleBurning(month: number, fireCount: number): number {
  const isStubbleSeason = month >= 10 || month <= 1 // Oct–Jan
  let activity = isStubbleSeason ? 0.6 : 0.1
  activity += Math.min(0.4, (fireCount || 0) / 100)
  return Math.min(1.0, activity)
}

function assessInputDataQuality(input: PredictionInput): any {
  const weatherArrays = [
    input.weather_features.temperature,
    input.weather_features.humidity,
    input.weather_features.wind_speed,
    input.weather_features.wind_direction,
    input.weather_features.pressure,
    input.weather_features.precipitation,
    input.weather_features.cloud_cover,
  ]

  const quality = {
    historical_aqi_availability: Math.min(1, input.historical_aqi.length / 48),
    weather_data_completeness: weatherArrays.filter(arr => Array.isArray(arr) && arr.length > 0).length / 7,
    satellite_data_availability:
      (Array.isArray(input.satellite_features.aod) && input.satellite_features.aod.length > 0 ? 0.5 : 0) +
      ((Array.isArray(input.satellite_features.fire_count) &&
        (input.satellite_features.fire_count[0] || 0) > 0)
        ? 0.5
        : 0),
    overall_score: 0,
  }

  quality.overall_score =
    quality.historical_aqi_availability * 0.4 +
    quality.weather_data_completeness * 0.4 +
    quality.satellite_data_availability * 0.2

  return quality
}

function getFallbackPredictionInput(latitude: number, longitude: number): PredictionInput {
  const now = new Date()
  return {
    historical_aqi: [150, 145, 160, 155],
    weather_features: {
      temperature: [],
      humidity: [],
      wind_speed: [],
      wind_direction: [],
      pressure: [],
      precipitation: [], // no precipitation by default
      cloud_cover: [],
    },
    satellite_features: {
      aod: [0.5],
      aerosol_index: [1.2],
      fire_count: [0],
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
  }
}
