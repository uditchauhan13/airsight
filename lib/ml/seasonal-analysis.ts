export interface SeasonalPattern {
  season: 'winter' | 'spring' | 'summer' | 'monsoon';
  months: number[];
  characteristics: {
    average_aqi: number;
    aqi_range: { min: number; max: number };
    dominant_pollutants: string[];
    weather_patterns: {
      temperature_range: { min: number; max: number };
      humidity_range: { min: number; max: number };
      wind_speed_avg: number;
      precipitation_avg: number;
    };
  };
  emission_sources: {
    primary: string[];
    secondary: string[];
    enhanced_factors: string[];
    reduced_factors: string[];
  };
  health_impacts: {
    risk_level: 'low' | 'moderate' | 'high' | 'severe';
    vulnerable_groups: string[];
    common_symptoms: string[];
    recommendations: string[];
  };
}

export interface SeasonalTrend {
  year: number;
  season: string;
  metrics: {
    avg_aqi: number;
    max_aqi: number;
    min_aqi: number;
    days_above_200: number;
    days_above_300: number;
    improvement_rate: number; // % change from previous year
  };
  contributing_factors: {
    meteorology_score: number; // -1 to 1 (worse to better)
    emission_score: number;
    policy_impact_score: number;
  };
}

export interface SeasonalForecast {
  season: string;
  year: number;
  predicted_metrics: {
    avg_aqi: number;
    peak_aqi_period: { start_date: string; end_date: string };
    expected_poor_days: number;
    expected_severe_days: number;
  };
  risk_factors: {
    meteorological_risk: 'low' | 'moderate' | 'high';
    emission_risk: 'low' | 'moderate' | 'high';
    compound_events: string[]; // e.g., 'stubble_burning + low_wind'
  };
  confidence: number;
  recommendations: {
    policy_actions: string[];
    citizen_precautions: string[];
    timing_suggestions: string[];
  };
}

export interface ClimateImpact {
  factor: string;
  impact_type: 'meteorological' | 'emission' | 'dispersion';
  seasonal_variation: {
    [season: string]: {
      intensity: number; // 0-1 scale
      direction: 'positive' | 'negative'; // effect on AQI
      confidence: number;
    };
  };
  description: string;
  policy_relevance: string;
}

export class SeasonalAnalysisSystem {
  private seasonalPatterns: Map<string, SeasonalPattern> = new Map();
  private historicalTrends: SeasonalTrend[] = [];
  private climateFactors: ClimateImpact[] = [];

  constructor() {
    this.initializeSeasonalPatterns();
    this.initializeClimateFactors();
    this.loadHistoricalTrends();
  }

  /**
   * Get seasonal pattern analysis for a specific season
   */
  getSeasonalPattern(season: 'winter' | 'spring' | 'summer' | 'monsoon'): SeasonalPattern {
    const pattern = this.seasonalPatterns.get(season);
    if (!pattern) {
      throw new Error(`Seasonal pattern not found for ${season}`);
    }
    return pattern;
  }

  /**
   * Analyze current conditions in seasonal context
   */
  analyzeCurrentSeason(currentMonth: number, currentAQI: number): {
    season: string;
    seasonal_context: {
      compared_to_seasonal_avg: number; // % difference
      percentile_in_season: number; // 0-100
      typical_for_season: boolean;
    };
    expected_trend: {
      next_30_days: 'improving' | 'worsening' | 'stable';
      peak_period_approaching: boolean;
      seasonal_factors: string[];
    };
    recommendations: string[];
  } {
    const season = this.getSeasonFromMonth(currentMonth);
    const pattern = this.getSeasonalPattern(season);
    
    // Calculate seasonal context
    const avgDifference = ((currentAQI - pattern.characteristics.average_aqi) / pattern.characteristics.average_aqi) * 100;
    const percentile = this.calculateSeasonalPercentile(currentAQI, season);
    const typical = Math.abs(avgDifference) < 20; // Within 20% of seasonal average
    
    // Predict trend
    const nextMonthSeason = this.getSeasonFromMonth((currentMonth % 12) + 1);
    const trend = this.predictSeasonalTrend(season, nextMonthSeason, currentMonth);
    
    return {
      season,
      seasonal_context: {
        compared_to_seasonal_avg: Math.round(avgDifference),
        percentile_in_season: Math.round(percentile),
        typical_for_season: typical,
      },
      expected_trend: trend,
      recommendations: this.generateSeasonalRecommendations(season, currentAQI),
    };
  }

  /**
   * Generate seasonal forecast for upcoming season
   */
  generateSeasonalForecast(
    targetSeason: string,
    year: number = new Date().getFullYear()
  ): SeasonalForecast {
    const pattern = this.seasonalPatterns.get(targetSeason);
    if (!pattern) {
      throw new Error(`Pattern not found for season: ${targetSeason}`);
    }

    // Analyze historical trends
    const recentTrends = this.getRecentSeasonalTrends(targetSeason, 3); // Last 3 years
    const trendDirection = this.calculateTrendDirection(recentTrends);
    
    // Predict metrics based on historical data and trends
    const baseAQI = pattern.characteristics.average_aqi;
    const trendAdjustment = trendDirection.improvement_rate;
    const predictedAQI = Math.max(50, baseAQI * (1 + trendAdjustment / 100));
    
    // Calculate peak period
    const peakPeriod = this.calculatePeakPeriod(targetSeason, year);
    
    // Assess risks
    const meteorologicalRisk = this.assessMeteorologicalRisk(targetSeason, year);
    const emissionRisk = this.assessEmissionRisk(targetSeason, year);
    
    // Generate compound event scenarios
    const compoundEvents = this.identifyCompoundEvents(targetSeason);
    
    return {
      season: targetSeason,
      year,
      predicted_metrics: {
        avg_aqi: Math.round(predictedAQI),
        peak_aqi_period: peakPeriod,
        expected_poor_days: this.estimatePoorDays(predictedAQI, targetSeason),
        expected_severe_days: this.estimateSevereDays(predictedAQI, targetSeason),
      },
      risk_factors: {
        meteorological_risk: meteorologicalRisk,
        emission_risk: emissionRisk,
        compound_events: compoundEvents,
      },
      confidence: this.calculateForecastConfidence(recentTrends),
      recommendations: {
        policy_actions: this.generatePolicyRecommendations(targetSeason, predictedAQI),
        citizen_precautions: this.generateCitizenRecommendations(targetSeason, predictedAQI),
        timing_suggestions: this.generateTimingRecommendations(targetSeason),
      },
    };
  }

  /**
   * Analyze long-term seasonal trends
   */
  analyzeLongTermTrends(years: number = 5): {
    overall_trend: 'improving' | 'worsening' | 'stable';
    seasonal_breakdown: {
      [season: string]: {
        trend: 'improving' | 'worsening' | 'stable';
        rate_of_change: number; // AQI units per year
        significance: 'high' | 'moderate' | 'low';
      };
    };
    key_insights: string[];
    policy_effectiveness: {
      [intervention: string]: {
        impact_score: number; // -1 to 1
        seasonal_effectiveness: string[];
        evidence: string;
      };
    };
  } {
    const recentYears = this.historicalTrends.filter(
      trend => trend.year >= new Date().getFullYear() - years
    );

    // Calculate overall trend
    const overallTrend = this.calculateOverallTrend(recentYears);
    
    // Analyze by season
    const seasonalBreakdown: any = {};
    const seasons = ['winter', 'spring', 'summer', 'monsoon'];
    
    seasons.forEach(season => {
      const seasonData = recentYears.filter(t => t.season === season);
      if (seasonData.length > 0) {
        const trend = this.calculateSeasonalTrendAnalysis(seasonData);
        seasonalBreakdown[season] = trend;
      }
    });

    return {
      overall_trend: overallTrend,
      seasonal_breakdown: seasonalBreakdown,
      key_insights: this.generateKeyInsights(recentYears),
      policy_effectiveness: this.analyzePolicyEffectiveness(recentYears),
    };
  }

  /**
   * Get climate change impact assessment
   */
  getClimateImpactAssessment(): {
    temperature_effects: ClimateImpact[];
    precipitation_effects: ClimateImpact[];
    wind_pattern_effects: ClimateImpact[];
    extreme_event_risks: {
      event_type: string;
      probability: number;
      impact_severity: 'low' | 'moderate' | 'high';
      affected_seasons: string[];
    }[];
    adaptation_strategies: string[];
  } {
    const temperatureEffects = this.climateFactors.filter(f => f.factor.includes('temperature'));
    const precipitationEffects = this.climateFactors.filter(f => f.factor.includes('precipitation'));
    const windEffects = this.climateFactors.filter(f => f.factor.includes('wind'));
    
    return {
      temperature_effects: temperatureEffects,
      precipitation_effects: precipitationEffects,
      wind_pattern_effects: windEffects,
      extreme_event_risks: this.assessExtremeEventRisks(),
      adaptation_strategies: this.generateAdaptationStrategies(),
    };
  }

  private initializeSeasonalPatterns(): void {
    // Winter Pattern (December, January, February)
    this.seasonalPatterns.set('winter', {
      season: 'winter',
      months: [12, 1, 2],
      characteristics: {
        average_aqi: 280,
        aqi_range: { min: 180, max: 450 },
        dominant_pollutants: ['PM2.5', 'PM10', 'CO'],
        weather_patterns: {
          temperature_range: { min: 5, max: 25 },
          humidity_range: { min: 40, max: 80 },
          wind_speed_avg: 2.5,
          precipitation_avg: 15,
        },
      },
      emission_sources: {
        primary: ['stubble_burning', 'residential_heating', 'vehicular_emissions'],
        secondary: ['industrial_emissions', 'construction_dust'],
        enhanced_factors: ['thermal_inversion', 'low_wind_speeds', 'crop_burning'],
        reduced_factors: ['wet_deposition', 'convective_mixing'],
      },
      health_impacts: {
        risk_level: 'severe',
        vulnerable_groups: ['children', 'elderly', 'respiratory_patients', 'heart_patients'],
        common_symptoms: ['cough', 'shortness_of_breath', 'eye_irritation', 'fatigue'],
        recommendations: ['stay_indoors', 'use_air_purifiers', 'wear_n95_masks', 'avoid_outdoor_exercise'],
      },
    });

    // Spring Pattern (March, April, May)
    this.seasonalPatterns.set('spring', {
      season: 'spring',
      months: [3, 4, 5],
      characteristics: {
        average_aqi: 180,
        aqi_range: { min: 120, max: 280 },
        dominant_pollutants: ['PM10', 'O3', 'NO2'],
        weather_patterns: {
          temperature_range: { min: 15, max: 35 },
          humidity_range: { min: 30, max: 60 },
          wind_speed_avg: 4.2,
          precipitation_avg: 30,
        },
      },
      emission_sources: {
        primary: ['vehicular_emissions', 'construction_dust', 'industrial_emissions'],
        secondary: ['road_dust', 'waste_burning'],
        enhanced_factors: ['dust_storms', 'high_temperatures', 'photochemical_reactions'],
        reduced_factors: ['better_dispersion', 'occasional_rains'],
      },
      health_impacts: {
        risk_level: 'moderate',
        vulnerable_groups: ['respiratory_patients', 'outdoor_workers'],
        common_symptoms: ['throat_irritation', 'allergies', 'eye_watering'],
        recommendations: ['limit_outdoor_activities', 'use_masks_during_dust_storms', 'stay_hydrated'],
      },
    });

    // Summer Pattern (June, July, August, September)
    this.seasonalPatterns.set('summer', {
      season: 'summer',
      months: [6, 7, 8, 9],
      characteristics: {
        average_aqi: 150,
        aqi_range: { min: 100, max: 220 },
        dominant_pollutants: ['O3', 'NO2', 'SO2'],
        weather_patterns: {
          temperature_range: { min: 25, max: 45 },
          humidity_range: { min: 60, max: 90 },
          wind_speed_avg: 3.8,
          precipitation_avg: 200,
        },
      },
      emission_sources: {
        primary: ['vehicular_emissions', 'power_generation', 'industrial_emissions'],
        secondary: ['photochemical_reactions', 'evaporative_emissions'],
        enhanced_factors: ['high_solar_radiation', 'ozone_formation', 'heat_island_effect'],
        reduced_factors: ['monsoon_washout', 'increased_convection'],
      },
      health_impacts: {
        risk_level: 'moderate',
        vulnerable_groups: ['outdoor_workers', 'athletes', 'elderly'],
        common_symptoms: ['heat_exhaustion', 'respiratory_issues', 'dehydration'],
        recommendations: ['avoid_peak_sun_hours', 'stay_indoors_during_hottest_part', 'drink_water_frequently'],
      },
    });

    // Monsoon Pattern (July, August, September)
    this.seasonalPatterns.set('monsoon', {
      season: 'monsoon',
      months: [7, 8, 9],
      characteristics: {
        average_aqi: 120,
        aqi_range: { min: 80, max: 180 },
        dominant_pollutants: ['NO2', 'SO2', 'CO'],
        weather_patterns: {
          temperature_range: { min: 22, max: 35 },
          humidity_range: { min: 70, max: 95 },
          wind_speed_avg: 4.5,
          precipitation_avg: 300,
        },
      },
      emission_sources: {
        primary: ['vehicular_emissions', 'industrial_emissions'],
        secondary: ['residential_cooking', 'waste_burning'],
        enhanced_factors: ['increased_humidity', 'reduced_solar_radiation'],
        reduced_factors: ['wet_scavenging', 'improved_dispersion', 'reduced_dust'],
      },
      health_impacts: {
        risk_level: 'low',
        vulnerable_groups: ['people_with_allergies', 'asthma_patients'],
        common_symptoms: ['humidity_discomfort', 'mold_allergies', 'skin_issues'],
        recommendations: ['ensure_good_ventilation', 'control_indoor_humidity', 'prevent_mold_growth'],
      },
    });
  }

  private initializeClimateFactors(): void {
    this.climateFactors = [
      {
        factor: 'rising_temperatures',
        impact_type: 'meteorological',
        seasonal_variation: {
          winter: { intensity: 0.3, direction: 'negative', confidence: 0.7 },
          spring: { intensity: 0.6, direction: 'positive', confidence: 0.8 },
          summer: { intensity: 0.8, direction: 'positive', confidence: 0.9 },
          monsoon: { intensity: 0.4, direction: 'positive', confidence: 0.6 },
        },
        description: 'Rising temperatures increase photochemical reactions and heat island effects',
        policy_relevance: 'Need for cooling strategies and emission reductions',
      },
      {
        factor: 'changing_precipitation',
        impact_type: 'dispersion',
        seasonal_variation: {
          winter: { intensity: 0.4, direction: 'positive', confidence: 0.6 },
          spring: { intensity: 0.3, direction: 'negative', confidence: 0.7 },
          summer: { intensity: 0.2, direction: 'negative', confidence: 0.5 },
          monsoon: { intensity: 0.7, direction: 'negative', confidence: 0.8 },
        },
        description: 'Changes in rainfall patterns affect wet scavenging of pollutants',
        policy_relevance: 'Water management and emergency preparedness',
      },
      {
        factor: 'wind_pattern_shifts',
        impact_type: 'dispersion',
        seasonal_variation: {
          winter: { intensity: 0.6, direction: 'positive', confidence: 0.7 },
          spring: { intensity: 0.4, direction: 'negative', confidence: 0.6 },
          summer: { intensity: 0.5, direction: 'negative', confidence: 0.6 },
          monsoon: { intensity: 0.3, direction: 'negative', confidence: 0.5 },
        },
        description: 'Shifting wind patterns affect pollutant dispersion and transport',
        policy_relevance: 'Regional cooperation and emission source management',
      },
    ];
  }

  private loadHistoricalTrends(): void {
    // Mock historical data - in production, load from database
    const currentYear = new Date().getFullYear();
    const seasons = ['winter', 'spring', 'summer', 'monsoon'];
    
    for (let year = currentYear - 5; year < currentYear; year++) {
      seasons.forEach(season => {
        this.historicalTrends.push({
          year,
          season,
          metrics: {
            avg_aqi: this.generateHistoricalAQI(season, year),
            max_aqi: this.generateHistoricalAQI(season, year) + 100,
            min_aqi: Math.max(50, this.generateHistoricalAQI(season, year) - 80),
            days_above_200: Math.floor(Math.random() * 60) + 10,
            days_above_300: Math.floor(Math.random() * 30) + 5,
            improvement_rate: (Math.random() - 0.5) * 10, // -5% to +5%
          },
          contributing_factors: {
            meteorology_score: (Math.random() - 0.5) * 2,
            emission_score: (Math.random() - 0.5) * 2,
            policy_impact_score: Math.random() - 0.3, // Slight positive bias for policy
          },
        });
      });
    }
  }

  // Helper methods
  private getSeasonFromMonth(month: number): 'winter' | 'spring' | 'summer' | 'monsoon' {
    if (month === 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 9) return 'summer';
    return 'monsoon';
  }

  private calculateSeasonalPercentile(aqi: number, season: string): number {
    const pattern = this.seasonalPatterns.get(season);
    if (!pattern) return 50;
    
    const { min, max } = pattern.characteristics.aqi_range;
    return Math.max(0, Math.min(100, ((aqi - min) / (max - min)) * 100));
  }

  private predictSeasonalTrend(
    currentSeason: string,
    nextSeason: string,
    currentMonth: number
  ): {
    next_30_days: 'improving' | 'worsening' | 'stable';
    peak_period_approaching: boolean;
    seasonal_factors: string[];
  } {
    const currentPattern = this.seasonalPatterns.get(currentSeason);
    const nextPattern = this.seasonalPatterns.get(nextSeason);
    
    if (!currentPattern || !nextPattern) {
      return {
        next_30_days: 'stable',
        peak_period_approaching: false,
        seasonal_factors: [],
      };
    }
    
    const currentAvg = currentPattern.characteristics.average_aqi;
    const nextAvg = nextPattern.characteristics.average_aqi;
    
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (nextAvg < currentAvg * 0.9) trend = 'improving';
    else if (nextAvg > currentAvg * 1.1) trend = 'worsening';
    
    // Check if approaching peak period (winter for Delhi NCR)
    const peakApproaching = nextSeason === 'winter' || 
                           (currentSeason === 'summer' && nextSeason === 'winter');
    
    return {
      next_30_days: trend,
      peak_period_approaching: peakApproaching,
      seasonal_factors: nextPattern.emission_sources.enhanced_factors,
    };
  }

  private generateSeasonalRecommendations(season: string, currentAQI: number): string[] {
    const pattern = this.seasonalPatterns.get(season);
    if (!pattern) return ['Monitor air quality conditions'];
    
    const baseRecommendations = [...pattern.health_impacts.recommendations];
    
    // Add AQI-specific recommendations
    if (currentAQI > 300) {
      baseRecommendations.push('Consider temporary relocation', 'Seek medical attention for symptoms');
    } else if (currentAQI > 200) {
      baseRecommendations.push('Use air purifiers continuously', 'Avoid all outdoor exercise');
    }
    
    return baseRecommendations;
  }

  private generateHistoricalAQI(season: string, year: number): number {
    const pattern = this.seasonalPatterns.get(season);
    const baseAQI = pattern ? pattern.characteristics.average_aqi : 150;
    
    // Add year-over-year improvement trend
    const improvementRate = -2; // 2% improvement per year
    const yearDiff = new Date().getFullYear() - year;
    const trendAdjustment = 1 + (improvementRate * yearDiff) / 100;
    
    return Math.round(baseAQI * trendAdjustment * (0.8 + Math.random() * 0.4));
  }

  private getRecentSeasonalTrends(season: string, years: number): SeasonalTrend[] {
    return this.historicalTrends
      .filter(trend => trend.season === season)
      .slice(-years)
      .sort((a, b) => b.year - a.year);
  }

  private calculateTrendDirection(trends: SeasonalTrend[]): { improvement_rate: number } {
    if (trends.length < 2) return { improvement_rate: 0 };
    
    const rates = trends.map(t => t.metrics.improvement_rate);
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    return { improvement_rate: avgRate };
  }

  private calculatePeakPeriod(season: string, year: number): { start_date: string; end_date: string } {
    // Mock implementation - in production, use historical analysis
    const seasonMonths = {
      winter: [12, 1, 2],
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      monsoon: [7, 8, 9],
    };
    
    const months = seasonMonths[season as keyof typeof seasonMonths] || [1, 2, 3];
    const peakMonth = months; // Middle month typically peak
    
    return {
      start_date: `${year}-${String(peakMonth).padStart(2, '0')}-01`,
      end_date: `${year}-${String(peakMonth).padStart(2, '0')}-28`,
    };
  }

  private assessMeteorologicalRisk(season: string, year: number): 'low' | 'moderate' | 'high' {
    // Mock assessment based on climate factors
    const riskScores = this.climateFactors
      .map(factor => factor.seasonal_variation[season]?.intensity || 0)
      .filter(score => score > 0);
    
    const avgRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    if (avgRisk > 0.6) return 'high';
    if (avgRisk > 0.3) return 'moderate';
    return 'low';
  }

  private assessEmissionRisk(season: string, year: number): 'low' | 'moderate' | 'high' {
    const pattern = this.seasonalPatterns.get(season);
    if (!pattern) return 'moderate';
    
    const primarySources = pattern.emission_sources.primary.length;
    const enhancedFactors = pattern.emission_sources.enhanced_factors.length;
    
    const riskScore = (primarySources * 0.6 + enhancedFactors * 0.4) / 7; // Normalize
    
    if (riskScore > 0.7) return 'high';
    if (riskScore > 0.4) return 'moderate';
    return 'low';
  }

  private identifyCompoundEvents(season: string): string[] {
    const compoundEvents = {
      winter: ['stubble_burning + thermal_inversion', 'low_wind + high_emissions', 'fog + pollution_trapping'],
      spring: ['dust_storm + vehicular_emissions', 'heat_wave + ozone_formation'],
      summer: ['heat_dome + industrial_emissions', 'drought + dust_storms'],
      monsoon: ['flooding + waste_burning', 'high_humidity + mold_growth'],
    };
    
    return compoundEvents[season as keyof typeof compoundEvents] || [];
  }

  private estimatePoorDays(avgAQI: number, season: string): number {
    // Days with AQI > 200
    const baseRate = avgAQI > 200 ? 0.6 : avgAQI > 150 ? 0.3 : 0.1;
    const seasonalDays = { winter: 90, spring: 92, summer: 92, monsoon: 91 }[season] || 90;
    return Math.round(seasonalDays * baseRate);
  }

  private estimateSevereDays(avgAQI: number, season: string): number {
    // Days with AQI > 300
    const baseRate = avgAQI > 300 ? 0.3 : avgAQI > 250 ? 0.15 : avgAQI > 200 ? 0.05 : 0;
    const seasonalDays = { winter: 90, spring: 92, summer: 92, monsoon: 91 }[season] || 90;
    return Math.round(seasonalDays * baseRate);
  }

  private calculateForecastConfidence(trends: SeasonalTrend[]): number {
    if (trends.length < 3) return 0.5;
    
    // Calculate consistency in trends
    const improvements = trends.map(t => t.metrics.improvement_rate);
    const variance = this.calculateVariance(improvements);
    const consistency = Math.max(0, 1 - variance / 100); // Normalize variance
    
    return Math.min(0.95, Math.max(0.3, consistency));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private generatePolicyRecommendations(season: string, predictedAQI: number): string[] {
    const recommendations = [];
    
    if (season === 'winter' && predictedAQI > 250) {
      recommendations.push(
        'Implement emergency measures (odd-even, construction ban)',
        'Enhance public transport capacity',
        'Deploy air purifiers in schools',
        'Issue health advisories'
      );
    }
    
    if (season === 'spring' && predictedAQI > 200) {
      recommendations.push(
        'Control construction dust',
        'Water sprinkling on roads',
        'Monitor industrial emissions',
        'Prepare for dust storms'
      );
    }
    
    recommendations.push('Strengthen monitoring network', 'Update emergency response plans');
    return recommendations;
  }

  private generateCitizenRecommendations(season: string, predictedAQI: number): string[] {
    const pattern = this.seasonalPatterns.get(season);
    if (!pattern) return ['Monitor air quality regularly'];
    
    const recommendations = [...pattern.health_impacts.recommendations];
    
    if (predictedAQI > 250) {
      recommendations.push('Plan indoor activities', 'Stock up on masks and medications');
    }
    
    return recommendations;
  }

  private generateTimingRecommendations(season: string): string[] {
    const timing = {
      winter: ['Avoid early morning hours (6-9 AM)', 'Plan activities post-noon when possible'],
      spring: ['Be alert for dust storm warnings', 'Plan outdoor activities for early morning'],
      summer: ['Avoid peak sun hours (11 AM - 4 PM)', 'Plan activities for early morning or evening'],
      monsoon: ['Take advantage of post-rain clean air', 'Be prepared for sudden weather changes'],
    };
    
    return timing[season as keyof typeof timing] || ['Monitor hourly forecasts'];
  }

  private calculateOverallTrend(trends: SeasonalTrend[]): 'improving' | 'worsening' | 'stable' {
    const rates = trends.map(t => t.metrics.improvement_rate);
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    if (avgRate > 2) return 'improving';
    if (avgRate < -2) return 'worsening';
    return 'stable';
  }

  private calculateSeasonalTrendAnalysis(seasonData: SeasonalTrend[]): {
    trend: 'improving' | 'worsening' | 'stable';
    rate_of_change: number;
    significance: 'high' | 'moderate' | 'low';
  } {
    const rates = seasonData.map(t => t.metrics.improvement_rate);
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (avgRate > 1) trend = 'improving';
    else if (avgRate < -1) trend = 'worsening';
    
    const significance = Math.abs(avgRate) > 3 ? 'high' : Math.abs(avgRate) > 1 ? 'moderate' : 'low';
    
    return {
      trend,
      rate_of_change: avgRate,
      significance,
    };
  }

  private generateKeyInsights(trends: SeasonalTrend[]): string[] {
    const insights = [];
    
    // Analyze winter trends
    const winterTrends = trends.filter(t => t.season === 'winter');
    if (winterTrends.length > 0) {
      const avgWinterImprovement = winterTrends.reduce((sum, t) => sum + t.metrics.improvement_rate, 0) / winterTrends.length;
      if (avgWinterImprovement > 2) {
        insights.push('Winter air quality shows significant improvement trend');
      } else if (avgWinterImprovement < -2) {
        insights.push('Winter air quality deteriorating, requiring urgent intervention');
      }
    }
    
    // Analyze seasonal variations
    const seasonalAvgs = this.calculateSeasonalAverages(trends);
    const maxSeason = Object.keys(seasonalAvgs).reduce((a, b) => seasonalAvgs[a] > seasonalAvgs[b] ? a : b);
    const minSeason = Object.keys(seasonalAvgs).reduce((a, b) => seasonalAvgs[a] < seasonalAvgs[b] ? a : b);
    
    insights.push(`${maxSeason} shows highest average AQI, ${minSeason} shows lowest`);
    
    return insights;
  }

  private analyzePolicyEffectiveness(trends: SeasonalTrend[]): {
    [intervention: string]: {
      impact_score: number;
      seasonal_effectiveness: string[];
      evidence: string;
    };
  } {
    // Mock policy effectiveness analysis
    return {
      'odd_even_policy': {
        impact_score: 0.3,
        seasonal_effectiveness: ['winter'],
        evidence: 'Modest reduction in winter AQI levels during implementation periods',
      },
      'construction_ban': {
        impact_score: 0.4,
        seasonal_effectiveness: ['winter', 'spring'],
        evidence: 'Measurable reduction in PM10 levels during enforcement periods',
      },
      'bs6_implementation': {
        impact_score: 0.6,
        seasonal_effectiveness: ['winter', 'spring', 'summer', 'monsoon'],
        evidence: 'Consistent improvement across all seasons post-implementation',
      },
    };
  }

  private calculateSeasonalAverages(trends: SeasonalTrend[]): { [season: string]: number } {
    const seasonalSums: { [season: string]: { sum: number; count: number } } = {};
    
    trends.forEach(trend => {
      if (!seasonalSums[trend.season]) {
        seasonalSums[trend.season] = { sum: 0, count: 0 };
      }
      seasonalSums[trend.season].sum += trend.metrics.avg_aqi;
      seasonalSums[trend.season].count++;
    });
    
    const averages: { [season: string]: number } = {};
    Object.keys(seasonalSums).forEach(season => {
      averages[season] = seasonalSums[season].sum / seasonalSums[season].count;
    });
    
    return averages;
  }

  private assessExtremeEventRisks(): {
    event_type: string;
    probability: number;
    impact_severity: 'low' | 'moderate' | 'high';
    affected_seasons: string[];
  }[] {
    return [
      {
        event_type: 'severe_winter_smog_episode',
        probability: 0.7,
        impact_severity: 'high',
        affected_seasons: ['winter'],
      },
      {
        event_type: 'dust_storm_with_high_pollution',
        probability: 0.5,
        impact_severity: 'moderate',
        affected_seasons: ['spring', 'summer'],
      },
      {
        event_type: 'heat_dome_ozone_event',
        probability: 0.4,
        impact_severity: 'moderate',
        affected_seasons: ['summer'],
      },
      {
        event_type: 'monsoon_failure_dust_accumulation',
        probability: 0.3,
        impact_severity: 'high',
        affected_seasons: ['monsoon'],
      },
    ];
  }

  private generateAdaptationStrategies(): string[] {
    return [
      'Develop climate-resilient air quality monitoring networks',
      'Implement dynamic emission reduction strategies',
      'Enhance early warning systems for extreme events',
      'Build community resilience through education and preparedness',
      'Integrate air quality considerations into urban planning',
      'Develop seasonal response protocols',
      'Strengthen regional cooperation for transboundary pollution',
      'Invest in clean technology and renewable energy',
      'Create green infrastructure for natural air filtration',
      'Develop adaptive health service capacity',
    ];
  }
}

export const seasonalAnalysisSystem = new SeasonalAnalysisSystem();
