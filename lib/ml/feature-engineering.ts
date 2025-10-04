import { PredictionInput } from './forecasting-models';

export interface FeatureConfig {
  include_lag_features: boolean;
  include_rolling_stats: boolean;
  include_fourier_features: boolean;
  include_interaction_features: boolean;
  lag_periods: number[];
  rolling_windows: number[];
  fourier_terms: number;
}

export interface ProcessedFeatures {
  features: number[];
  feature_names: string[];
  feature_importance_weights: number[];
  preprocessing_metadata: {
    scalers: { [key: string]: { mean: number; std: number } };
    categorical_encoders: { [key: string]: string[] };
    feature_selection_mask: boolean[];
  };
}

export class FeatureEngineeringPipeline {
  private config: FeatureConfig;
  private scaler_cache: Map<string, { mean: number; std: number }> = new Map();

  constructor(config?: Partial<FeatureConfig>) {
    this.config = {
      include_lag_features: true,
      include_rolling_stats: true,
      include_fourier_features: true,
      include_interaction_features: true,
      lag_periods: [1, 3, 6, 12, 24, 48],
      rolling_windows: [3, 6, 12, 24],
      fourier_terms: 6,
      ...config,
    };
  }

  /**
   * Process raw input into engineered features
   */
  processFeatures(input: PredictionInput): ProcessedFeatures {
    const features: number[] = [];
    const feature_names: string[] = [];
    const importance_weights: number[] = [];

    // 1. Basic AQI features
    this.addAQIFeatures(input, features, feature_names, importance_weights);

    // 2. Weather features
    this.addWeatherFeatures(input, features, feature_names, importance_weights);

    // 3. Satellite features
    this.addSatelliteFeatures(input, features, feature_names, importance_weights);

    // 4. Temporal features
    this.addTemporalFeatures(input, features, feature_names, importance_weights);

    // 5. Location features
    this.addLocationFeatures(input, features, feature_names, importance_weights);

    // 6. Emission features
    this.addEmissionFeatures(input, features, feature_names, importance_weights);

    // 7. Advanced engineered features
    if (this.config.include_lag_features) {
      this.addLagFeatures(input, features, feature_names, importance_weights);
    }

    if (this.config.include_rolling_stats) {
      this.addRollingStatFeatures(input, features, feature_names, importance_weights);
    }

    if (this.config.include_fourier_features) {
      this.addFourierFeatures(input, features, feature_names, importance_weights);
    }

    if (this.config.include_interaction_features) {
      this.addInteractionFeatures(input, features, feature_names, importance_weights);
    }

    // 8. Normalize features
    const normalized_features = this.normalizeFeatures(features, feature_names);

    // 9. Feature selection
    const selected_features = this.selectFeatures(
      normalized_features, 
      feature_names, 
      importance_weights
    );

    return {
      features: selected_features.features,
      feature_names: selected_features.names,
      feature_importance_weights: selected_features.weights,
      preprocessing_metadata: {
        scalers: Object.fromEntries(this.scaler_cache),
        categorical_encoders: this.getCategoricalEncoders(),
        feature_selection_mask: selected_features.mask,
      },
    };
  }

  private addAQIFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const aqi_data = input.historical_aqi;
    
    if (aqi_data.length === 0) {
      // Add default features if no data
      features.push(0, 0, 0, 0, 0);
      names.push('aqi_mean', 'aqi_std', 'aqi_last', 'aqi_trend', 'aqi_volatility');
      weights.push(0.2, 0.1, 0.25, 0.2, 0.15);
      return;
    }

    // Basic statistics
    const mean = this.calculateMean(aqi_data);
    const std = this.calculateStd(aqi_data);
    const last = aqi_data[aqi_data.length - 1];
    const trend = this.calculateTrend(aqi_data);
    const volatility = this.calculateVolatility(aqi_data);

    features.push(mean, std, last, trend, volatility);
    names.push('aqi_mean', 'aqi_std', 'aqi_last', 'aqi_trend', 'aqi_volatility');
    weights.push(0.2, 0.1, 0.25, 0.2, 0.15);

    // Percentiles
    const percentiles = [0.25, 0.5, 0.75, 0.9];
    percentiles.forEach(p => {
      features.push(this.calculatePercentile(aqi_data, p));
      names.push(`aqi_p${Math.round(p * 100)}`);
      weights.push(0.05);
    });

    // Rate of change
    if (aqi_data.length >= 2) {
      const rate_of_change = (last - aqi_data[aqi_data.length - 2]) / aqi_data[aqi_data.length - 2];
      features.push(rate_of_change);
      names.push('aqi_rate_of_change');
      weights.push(0.15);
    } else {
      features.push(0);
      names.push('aqi_rate_of_change');
      weights.push(0.15);
    }

    // Exceedance indicators
    const exceedances = [50, 100, 150, 200, 300];
    exceedances.forEach(threshold => {
      const exceedance_rate = aqi_data.filter(x => x > threshold).length / aqi_data.length;
      features.push(exceedance_rate);
      names.push(`aqi_exceed_${threshold}_rate`);
      weights.push(0.08);
    });
  }

  private addWeatherFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const weather = input.weather_features;
    
    // Process each weather parameter
    const weather_params = [
      { data: weather.temperature, name: 'temp', weight: 0.12 },
      { data: weather.humidity, name: 'humidity', weight: 0.10 },
      { data: weather.wind_speed, name: 'wind_speed', weight: 0.15 },
      { data: weather.pressure, name: 'pressure', weight: 0.08 },
      { data: weather.precipitation, name: 'precip', weight: 0.12 },
      { data: weather.cloud_cover, name: 'cloud', weight: 0.06 },
    ];

    weather_params.forEach(param => {
      if (param.data.length > 0) {
        const mean = this.calculateMean(param.data);
        const std = this.calculateStd(param.data);
        const last = param.data[param.data.length - 1];
        const trend = this.calculateTrend(param.data);

        features.push(mean, std, last, trend);
        names.push(
          `${param.name}_mean`,
          `${param.name}_std`, 
          `${param.name}_last`,
          `${param.name}_trend`
        );
        weights.push(param.weight, param.weight * 0.5, param.weight * 0.8, param.weight * 0.6);
      } else {
        features.push(0, 0, 0, 0);
        names.push(
          `${param.name}_mean`,
          `${param.name}_std`,
          `${param.name}_last`, 
          `${param.name}_trend`
        );
        weights.push(0, 0, 0, 0);
      }
    });

    // Wind direction (circular statistics)
    if (weather.wind_direction.length > 0) {
      const circular_mean = this.calculateCircularMean(weather.wind_direction);
      const circular_std = this.calculateCircularStd(weather.wind_direction);
      
      features.push(
        Math.sin(circular_mean * Math.PI / 180),
        Math.cos(circular_mean * Math.PI / 180),
        circular_std
      );
      names.push('wind_dir_sin', 'wind_dir_cos', 'wind_dir_std');
      weights.push(0.07, 0.07, 0.05);
    } else {
      features.push(0, 0, 0);
      names.push('wind_dir_sin', 'wind_dir_cos', 'wind_dir_std');
      weights.push(0, 0, 0);
    }

    // Derived weather features
    if (weather.temperature.length > 0 && weather.humidity.length > 0) {
      const temp_mean = this.calculateMean(weather.temperature);
      const humidity_mean = this.calculateMean(weather.humidity);
      
      // Heat index approximation
      const heat_index = temp_mean + 0.5 * (humidity_mean - 50) / 100 * temp_mean;
      features.push(heat_index);
      names.push('heat_index');
      weights.push(0.08);

      // Comfort index
      const comfort_index = temp_mean - (humidity_mean - 40) / 10;
      features.push(comfort_index);
      names.push('comfort_index');
      weights.push(0.06);
    } else {
      features.push(0, 0);
      names.push('heat_index', 'comfort_index');
      weights.push(0, 0);
    }

    // Atmospheric stability indicators
    if (weather.wind_speed.length > 0 && weather.temperature.length > 0) {
      const wind_mean = this.calculateMean(weather.wind_speed);
      const temp_std = this.calculateStd(weather.temperature);
      
      // Stability parameter (low wind + low temp variation = stable = bad for dispersion)
      const stability = 1 / (wind_mean + 1) * (1 / (temp_std + 1));
      features.push(stability);
      names.push('atmospheric_stability');
      weights.push(0.12);
    } else {
      features.push(0);
      names.push('atmospheric_stability');
      weights.push(0);
    }
  }

  private addSatelliteFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const satellite = input.satellite_features;
    
    // AOD features
    if (satellite.aod.length > 0) {
      const aod_mean = this.calculateMean(satellite.aod);
      const aod_max = Math.max(...satellite.aod);
      const aod_trend = this.calculateTrend(satellite.aod);
      
      features.push(aod_mean, aod_max, aod_trend);
      names.push('aod_mean', 'aod_max', 'aod_trend');
      weights.push(0.15, 0.12, 0.10);
    } else {
      features.push(0, 0, 0);
      names.push('aod_mean', 'aod_max', 'aod_trend');
      weights.push(0, 0, 0);
    }

    // Aerosol Index features
    if (satellite.aerosol_index.length > 0) {
      const ai_mean = this.calculateMean(satellite.aerosol_index);
      const ai_std = this.calculateStd(satellite.aerosol_index);
      
      features.push(ai_mean, ai_std);
      names.push('aerosol_index_mean', 'aerosol_index_std');
      weights.push(0.12, 0.08);
    } else {
      features.push(0, 0);
      names.push('aerosol_index_mean', 'aerosol_index_std');
      weights.push(0, 0);
    }

    // Fire count features
    const fire_total = this.calculateSum(satellite.fire_count);
    const fire_max = satellite.fire_count.length > 0 ? Math.max(...satellite.fire_count) : 0;
    const fire_trend = this.calculateTrend(satellite.fire_count);
    
    features.push(fire_total, fire_max, fire_trend);
    names.push('fire_total', 'fire_max', 'fire_trend');
    weights.push(0.18, 0.15, 0.12);

    // Fire intensity categories
    const fire_categories = [0, 10, 50, 100];
    fire_categories.forEach((threshold, idx) => {
      const next_threshold = fire_categories[idx + 1] || Infinity;
      const count = satellite.fire_count.filter(f => f >= threshold && f < next_threshold).length;
      features.push(count);
      names.push(`fire_count_${threshold}_${next_threshold === Infinity ? 'plus' : next_threshold}`);
      weights.push(0.05);
    });
  }

  private addTemporalFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const temporal = input.temporal_features;

    // Cyclical encoding of temporal features
    const cyclical_features = [
      { value: temporal.hour_of_day, period: 24, name: 'hour', weight: 0.15 },
      { value: temporal.day_of_week, period: 7, name: 'dow', weight: 0.08 },
      { value: temporal.day_of_year, period: 365, name: 'doy', weight: 0.12 },
      { value: temporal.month, period: 12, name: 'month', weight: 0.10 },
    ];

    cyclical_features.forEach(feature => {
      const sin_val = Math.sin(2 * Math.PI * feature.value / feature.period);
      const cos_val = Math.cos(2 * Math.PI * feature.value / feature.period);
      
      features.push(sin_val, cos_val);
      names.push(`${feature.name}_sin`, `${feature.name}_cos`);
      weights.push(feature.weight, feature.weight);
    });

    // Binary features
    features.push(
      temporal.is_weekend ? 1 : 0,
      temporal.is_holiday ? 1 : 0,
      this.isRushHour(temporal.hour_of_day) ? 1 : 0,
      this.isNightTime(temporal.hour_of_day) ? 1 : 0,
      this.isDaylightHours(temporal.hour_of_day) ? 1 : 0,
    );
    
    names.push('is_weekend', 'is_holiday', 'is_rush_hour', 'is_night', 'is_daylight');
    weights.push(0.08, 0.06, 0.12, 0.07, 0.05);

    // Season one-hot encoding
    const seasons = ['winter', 'spring', 'summer', 'monsoon'];
    seasons.forEach(season => {
      features.push(temporal.season === season ? 1 : 0);
      names.push(`season_${season}`);
      weights.push(0.08);
    });

    // Special time periods
    const is_winter_peak = temporal.season === 'winter' && 
                          (temporal.month === 12 || temporal.month === 1);
    const is_monsoon_active = temporal.season === 'monsoon' && 
                             temporal.month >= 6 && temporal.month <= 9;
    
    features.push(is_winter_peak ? 1 : 0, is_monsoon_active ? 1 : 0);
    names.push('is_winter_peak', 'is_monsoon_active');
    weights.push(0.15, 0.10);
  }

  private addLocationFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const location = input.location_features;

    // Raw location features
    features.push(
      location.latitude,
      location.longitude,
      location.elevation / 1000, // Normalize to km
      location.urban_density,
      location.traffic_density,
      location.industrial_proximity / 10, // Normalize
    );

    names.push(
      'latitude',
      'longitude', 
      'elevation_km',
      'urban_density',
      'traffic_density',
      'industrial_proximity_norm'
    );

    weights.push(0.05, 0.05, 0.08, 0.12, 0.15, 0.10);

    // Derived location features
    const distance_from_center = this.calculateDistanceFromDelhi(
      location.latitude, 
      location.longitude
    );
    
    features.push(distance_from_center / 50); // Normalize
    names.push('distance_from_delhi_center_norm');
    weights.push(0.08);

    // Location type indicators
    const is_urban_core = location.urban_density > 0.8 && distance_from_center < 20;
    const is_peripheral = distance_from_center > 30;
    const is_high_traffic = location.traffic_density > 0.7;
    const is_near_industrial = location.industrial_proximity < 5;

    features.push(
      is_urban_core ? 1 : 0,
      is_peripheral ? 1 : 0,
      is_high_traffic ? 1 : 0,
      is_near_industrial ? 1 : 0
    );

    names.push('is_urban_core', 'is_peripheral', 'is_high_traffic', 'is_near_industrial');
    weights.push(0.10, 0.08, 0.12, 0.15);
  }

  private addEmissionFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const emissions = input.emission_features;

    // Direct emission features
    features.push(
      emissions.vehicular_activity,
      emissions.industrial_activity,
      emissions.construction_activity,
      emissions.stubble_burning
    );

    names.push(
      'vehicular_activity',
      'industrial_activity', 
      'construction_activity',
      'stubble_burning'
    );

    weights.push(0.18, 0.15, 0.10, 0.20);

    // Combined emission index
    const total_emission_activity = emissions.vehicular_activity + 
                                  emissions.industrial_activity + 
                                  emissions.construction_activity + 
                                  emissions.stubble_burning;
    
    features.push(total_emission_activity / 4);
    names.push('total_emission_activity');
    weights.push(0.12);

    // Emission activity categories
    const high_emission_sources = [
      emissions.vehicular_activity > 0.7,
      emissions.industrial_activity > 0.7,
      emissions.stubble_burning > 0.5
    ].filter(Boolean).length;

    features.push(high_emission_sources);
    names.push('high_emission_source_count');
    weights.push(0.08);
  }

  private addLagFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const aqi_data = input.historical_aqi;
    
    this.config.lag_periods.forEach(lag => {
      if (aqi_data.length > lag) {
        const lag_value = aqi_data[aqi_data.length - 1 - lag];
        features.push(lag_value);
        names.push(`aqi_lag_${lag}`);
        weights.push(Math.max(0.02, 0.15 * Math.exp(-lag / 24))); // Exponential decay
      } else {
        features.push(0);
        names.push(`aqi_lag_${lag}`);
        weights.push(0);
      }
    });
  }

  private addRollingStatFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const aqi_data = input.historical_aqi;
    
    this.config.rolling_windows.forEach(window => {
      if (aqi_data.length >= window) {
        const window_data = aqi_data.slice(-window);
        const rolling_mean = this.calculateMean(window_data);
        const rolling_std = this.calculateStd(window_data);
        const rolling_max = Math.max(...window_data);
        const rolling_min = Math.min(...window_data);
        
        features.push(rolling_mean, rolling_std, rolling_max, rolling_min);
        names.push(
          `aqi_rolling_mean_${window}`,
          `aqi_rolling_std_${window}`,
          `aqi_rolling_max_${window}`,
          `aqi_rolling_min_${window}`
        );
        weights.push(0.08, 0.05, 0.06, 0.04);
      } else {
        features.push(0, 0, 0, 0);
        names.push(
          `aqi_rolling_mean_${window}`,
          `aqi_rolling_std_${window}`,
          `aqi_rolling_max_${window}`,
          `aqi_rolling_min_${window}`
        );
        weights.push(0, 0, 0, 0);
      }
    });
  }

  private addFourierFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    const aqi_data = input.historical_aqi;
    
    if (aqi_data.length < 12) {
      // Not enough data for Fourier features
      for (let k = 1; k <= this.config.fourier_terms; k++) {
        features.push(0, 0);
        names.push(`fourier_sin_${k}`, `fourier_cos_${k}`);
        weights.push(0, 0);
      }
      return;
    }

    // Calculate Fourier coefficients
    for (let k = 1; k <= this.config.fourier_terms; k++) {
      let sin_sum = 0;
      let cos_sum = 0;
      
      for (let t = 0; t < aqi_data.length; t++) {
        const angle = 2 * Math.PI * k * t / aqi_data.length;
        sin_sum += aqi_data[t] * Math.sin(angle);
        cos_sum += aqi_data[t] * Math.cos(angle);
      }
      
      sin_sum /= aqi_data.length;
      cos_sum /= aqi_data.length;
      
      features.push(sin_sum, cos_sum);
      names.push(`fourier_sin_${k}`, `fourier_cos_${k}`);
      
      // Higher frequency terms get lower weights
      const weight = 0.05 / k;
      weights.push(weight, weight);
    }
  }

  private addInteractionFeatures(
    input: PredictionInput,
    features: number[],
    names: string[],
    weights: number[]
  ): void {
    // Key interaction features based on domain knowledge
    
    // Weather interactions
    const temp_mean = input.weather_features.temperature.length > 0 ? 
                     this.calculateMean(input.weather_features.temperature) : 20;
    const humidity_mean = input.weather_features.humidity.length > 0 ?
                         this.calculateMean(input.weather_features.humidity) : 60;
    const wind_mean = input.weather_features.wind_speed.length > 0 ?
                     this.calculateMean(input.weather_features.wind_speed) : 3;
    
    // Temperature-humidity interaction
    features.push(temp_mean * humidity_mean / 100);
    names.push('temp_humidity_interaction');
    weights.push(0.08);

    // Wind-emission interaction (wind disperses emissions)
    features.push(wind_mean * input.emission_features.vehicular_activity);
    names.push('wind_vehicular_interaction');
    weights.push(0.10);

    // Stubble burning-wind interaction
    features.push(input.emission_features.stubble_burning / (wind_mean + 1));
    names.push('stubble_wind_interaction');
    weights.push(0.15);

    // Urban density-traffic interaction
    features.push(input.location_features.urban_density * input.location_features.traffic_density);
    names.push('urban_traffic_interaction');
    weights.push(0.12);

    // Season-emission interactions
    const is_winter = input.temporal_features.season === 'winter' ? 1 : 0;
    const is_monsoon = input.temporal_features.season === 'monsoon' ? 1 : 0;

    features.push(is_winter * input.emission_features.stubble_burning);
    names.push('winter_stubble_interaction');
    weights.push(0.18);

    features.push(is_monsoon * temp_mean * humidity_mean / 1000);
    names.push('monsoon_weather_interaction');
    weights.push(0.08);

    // Time-emission interactions
    const hour_sin = Math.sin(2 * Math.PI * input.temporal_features.hour_of_day / 24);
    features.push(hour_sin * input.emission_features.vehicular_activity);
    names.push('hour_vehicular_interaction');
    weights.push(0.10);
  }

  private normalizeFeatures(features: number[], names: string[]): number[] {
    const normalized = [...features];
    
    names.forEach((name, idx) => {
      const cache_key = `scaler_${name}`;
      let scaler = this.scaler_cache.get(cache_key);
      
      if (!scaler) {
        // Create new scaler with default values
        scaler = { mean: 0, std: 1 };
        
        // Update based on feature type
        if (name.includes('aqi')) {
          scaler = { mean: 150, std: 80 };
        } else if (name.includes('temp')) {
          scaler = { mean: 25, std: 10 };
        } else if (name.includes('humidity')) {
          scaler = { mean: 60, std: 20 };
        } else if (name.includes('wind')) {
          scaler = { mean: 3, std: 2 };
        }
        
        this.scaler_cache.set(cache_key, scaler);
      }
      
      // Apply normalization
      normalized[idx] = (features[idx] - scaler.mean) / Math.max(scaler.std, 1e-8);
    });
    
    return normalized;
  }

  private selectFeatures(
    features: number[],
    names: string[],
    weights: number[]
  ): { features: number[]; names: string[]; weights: number[]; mask: boolean[] } {
    
    // Feature selection based on importance weights
    const feature_importance_threshold = 0.01;
    const selected_indices: number[] = [];
    const mask: boolean[] = [];
    
    weights.forEach((weight, idx) => {
      if (weight >= feature_importance_threshold) {
        selected_indices.push(idx);
        mask.push(true);
      } else {
        mask.push(false);
      }
    });
    
    return {
      features: selected_indices.map(idx => features[idx]),
      names: selected_indices.map(idx => names[idx]),
      weights: selected_indices.map(idx => weights[idx]),
      mask,
    };
  }

  // Utility functions
  private calculateMean(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  private calculateStd(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = this.calculateMean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private calculateSum(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  private calculateTrend(arr: number[]): number {
    if (arr.length < 2) return 0;
    
    const n = arr.length;
    const x_mean = (n - 1) / 2;
    const y_mean = this.calculateMean(arr);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - x_mean) * (arr[i] - y_mean);
      denominator += Math.pow(i - x_mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVolatility(arr: number[]): number {
    if (arr.length < 2) return 0;
    const differences = arr.slice(1).map((val, i) => Math.abs(val - arr[i]));
    return this.calculateMean(differences);
  }

  private calculatePercentile(arr: number[], percentile: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(percentile * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)] || 0;
  }

  private calculateCircularMean(angles: number[]): number {
    if (angles.length === 0) return 0;
    const radians = angles.map(angle => angle * Math.PI / 180);
    const sin_sum = radians.reduce((sum, angle) => sum + Math.sin(angle), 0);
    const cos_sum = radians.reduce((sum, angle) => sum + Math.cos(angle), 0);
    return Math.atan2(sin_sum, cos_sum) * 180 / Math.PI;
  }

  private calculateCircularStd(angles: number[]): number {
    if (angles.length === 0) return 0;
    const mean_angle = this.calculateCircularMean(angles);
    const differences = angles.map(angle => {
      const diff = Math.abs(angle - mean_angle);
      return Math.min(diff, 360 - diff);
    });
    return this.calculateStd(differences);
  }

  private calculateDistanceFromDelhi(lat: number, lon: number): number {
    // Delhi center coordinates
    const delhi_lat = 28.7041;
    const delhi_lon = 77.1025;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat - delhi_lat) * Math.PI / 180;
    const dLon = (lon - delhi_lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(delhi_lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private isRushHour(hour: number): boolean {
    return (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
  }

  private isNightTime(hour: number): boolean {
    return hour >= 22 || hour <= 6;
  }

  private isDaylightHours(hour: number): boolean {
    return hour >= 6 && hour <= 18;
  }

  private getCategoricalEncoders(): { [key: string]: string[] } {
    return {
      season: ['winter', 'spring', 'summer', 'monsoon'],
      day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    };
  }
}

export const featureEngineeringPipeline = new FeatureEngineeringPipeline();
