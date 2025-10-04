// File: app/api/policy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sourceApportionmentEngine } from '@/lib/delhi-ncr/source-apportionment';
import { stationManager } from '@/lib/delhi-ncr/monitoring-stations';
import { seasonalAnalysisSystem } from '@/lib/ml/seasonal-analysis';
import { predictionEngine } from '@/lib/ml/prediction-engine';
import { cpcbClient } from '@/lib/api/cpcb-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'regional-snapshot':
        return handleRegionalSnapshot(searchParams);

      case 'source-analysis':
        return handleSourceAnalysis(searchParams);

      case 'intervention-tracking':
        return handleInterventionTracking(searchParams);

      case 'policy-effectiveness':
        return handlePolicyEffectiveness(searchParams);

      case 'economic-impact':
        return handleEconomicImpact(searchParams);

      case 'hotspot-analysis':
        return handleHotspotAnalysis(searchParams);

      case 'seasonal-planning':
        return handleSeasonalPlanning(searchParams);

      case 'real-time-monitoring':
        return handleRealTimeMonitoring();

      case 'compliance-tracking':
        return handleComplianceTracking(searchParams);

      case 'health-impact-assessment':
        return handleHealthImpactAssessment(searchParams);

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Policy API error:', error);
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
      case 'simulate-intervention':
        return handleSimulateIntervention(body);

      case 'scenario-planning':
        return handleScenarioPlanning(body);

      case 'policy-recommendation':
        return handlePolicyRecommendation(body);

      case 'cost-benefit-analysis':
        return handleCostBenefitAnalysis(body);

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Policy POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* =========================
   Handlers (GET endpoints)
   ========================= */

async function handleRegionalSnapshot(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  const time_period = searchParams.get('period') || '24h';

  try {
    const [stationData, sourceAnalysis, seasonalContext, predictions] = await Promise.all([
      getRegionalStationSummary(region),
      sourceApportionmentEngine.getRegionalSourceBreakdown(region),
      getSeasonalContext(),
      getRegionalPredictions(region),
    ]);

    const regionalStats = calculateRegionalStatistics(stationData);
    const priorityAreas = identifyPriorityAreas(stationData, sourceAnalysis);
    const executiveSummary = generateExecutiveSummary(regionalStats, sourceAnalysis, seasonalContext, priorityAreas);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region,
      time_period,
      executive_summary: executiveSummary,
      regional_statistics: regionalStats,
      source_contribution: sourceAnalysis.current_breakdown,
      seasonal_context: seasonalContext,
      predictions: { next_24h: predictions.short_term, seasonal_outlook: predictions.seasonal },
      priority_areas: priorityAreas,
      monitoring_network: {
        total_stations: stationData.total_stations,
        active_stations: stationData.active_stations,
        coverage_percentage: stationData.total_stations ? (stationData.active_stations / stationData.total_stations) * 100 : 0,
        data_quality_score: calculateDataQualityScore(stationData),
      },
      alerts_and_warnings: generatePolicyAlerts(regionalStats, sourceAnalysis),
    });
  } catch (error) {
    console.error('Error generating regional snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to generate regional snapshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleSourceAnalysis(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  const detailed = searchParams.get('detailed') === 'true';
  const time_range = searchParams.get('time_range') || '7d';

  try {
    const sourceAnalysis = detailed
      ? await sourceApportionmentEngine.getDetailedAnalysis(region, time_range)
      : await sourceApportionmentEngine.getRegionalSourceBreakdown(region);

    const temporalPatterns = await sourceApportionmentEngine.getTemporalPatterns(region);
    const sectorAnalysis = await sourceApportionmentEngine.getSectorAnalysis(region);
    const interventionPriorities = calculateInterventionPriorities(sourceAnalysis, sectorAnalysis);
    const benchmarkData = await getBenchmarkData(region);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region,
      analysis_period: time_range,
      source_contribution: sourceAnalysis.current_breakdown,
      temporal_patterns: temporalPatterns,
      sector_analysis: sectorAnalysis,
      intervention_priorities: interventionPriorities,
      trends: {
        monthly_trends: sourceAnalysis.monthly_trends,
        seasonal_variations: sourceAnalysis.seasonal_variations,
        year_over_year: sourceAnalysis.yearly_comparison,
      },
      benchmark_comparison: benchmarkData,
      policy_insights: {
        key_findings: generateKeyFindings(sourceAnalysis),
        recommended_actions: generateRecommendedActions(interventionPriorities),
        success_metrics: defineSuccessMetrics(interventionPriorities),
      },
      uncertainty_analysis: {
        data_confidence: sourceAnalysis.confidence_score,
        uncertainty_sources: sourceAnalysis.uncertainty_factors,
        sensitivity_analysis: sourceAnalysis.sensitivity_results,
      },
    });
  } catch (error) {
    console.error('Error performing source analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform source analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleInterventionTracking(searchParams: URLSearchParams): Promise<NextResponse> {
  const intervention_id = searchParams.get('intervention_id');
  const region = searchParams.get('region') || 'Delhi_NCR';
  const metrics = searchParams.get('metrics')?.split(',') || ['aqi', 'pollutant_levels', 'health_impact'];

  try {
    const interventionData = intervention_id
      ? await trackSpecificIntervention(intervention_id, metrics)
      : await trackAllActiveInterventions(region, metrics);

    const effectiveness = calculateInterventionEffectiveness(interventionData);
    const impactAssessment = generateImpactAssessment(interventionData, effectiveness);
    const baselineComparison = await getBaselineComparison(interventionData);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region,
      intervention_id: intervention_id || 'all_active',
      tracking_period: interventionData.tracking_period,
      interventions_tracked: interventionData.interventions.length,
      effectiveness_summary: {
        overall_effectiveness: effectiveness.overall_score,
        air_quality_improvement: effectiveness.aqi_improvement,
        pollutant_reduction: effectiveness.pollutant_reduction,
        health_benefits: effectiveness.health_benefits,
        economic_impact: effectiveness.economic_impact,
      },
      detailed_results: interventionData.interventions.map((intervention: any) => ({
        id: intervention.id,
        name: intervention.name,
        type: intervention.type,
        implementation_date: intervention.start_date,
        current_status: intervention.status,
        effectiveness_score: intervention.effectiveness_score,
        key_metrics: intervention.metrics,
        challenges: intervention.challenges,
        success_factors: intervention.success_factors,
      })),
      impact_assessment: impactAssessment,
      baseline_comparison: baselineComparison,
      recommendations: {
        continue_interventions: effectiveness.successful_interventions,
        modify_interventions: effectiveness.underperforming_interventions,
        discontinue_interventions: effectiveness.ineffective_interventions,
        new_intervention_suggestions: generateNewInterventionSuggestions(effectiveness),
      },
    });
  } catch (error) {
    console.error('Error tracking interventions:', error);
    return NextResponse.json(
      { error: 'Failed to track interventions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePolicyEffectiveness(searchParams: URLSearchParams): Promise<NextResponse> {
  const policy_type = searchParams.get('policy_type'); // 'transport', 'industrial', 'construction', etc.
  const time_period = searchParams.get('period') || '1y';
  const region = searchParams.get('region') || 'Delhi_NCR';

  try {
    const policyData = await analyzePolicyEffectiveness(policy_type, time_period, region);
    const comparativeAnalysis = await getComparativePolicyAnalysis(policy_type, region);
    const roiAnalysis = calculatePolicyROI(policyData);
    const lessonsLearned = extractLessonsLearned(policyData);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      policy_type: policy_type || 'all',
      region,
      analysis_period: time_period,
      effectiveness_overview: {
        overall_rating: policyData.overall_effectiveness,
        air_quality_impact: policyData.aqi_impact,
        pollutant_reduction: policyData.pollutant_impact,
        compliance_rate: policyData.compliance_rate,
        public_acceptance: policyData.public_acceptance,
      },
      detailed_analysis: policyData.detailed_metrics,
      comparative_analysis: comparativeAnalysis,
      roi_analysis: roiAnalysis,
      implementation_challenges: policyData.challenges,
      success_factors: policyData.success_factors,
      lessons_learned: lessonsLearned,
      recommendations: {
        policy_improvements: generatePolicyImprovements(policyData),
        implementation_strategies: generateImplementationStrategies(policyData),
        monitoring_enhancements: generateMonitoringEnhancements(policyData),
      },
    });
  } catch (error) {
    console.error('Error analyzing policy effectiveness:', error);
    return NextResponse.json(
      { error: 'Failed to analyze policy effectiveness', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleEconomicImpact(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  const scenario = searchParams.get('scenario') || 'current';
  const time_horizon = searchParams.get('horizon') || '5y';

  try {
    const pollutionCosts = await calculatePollutionCosts(region, scenario, time_horizon);
    const interventionBenefits = await calculateInterventionBenefits(region, time_horizon);
    const costBenefitAnalysis = performCostBenefitAnalysis(pollutionCosts, interventionBenefits);
    const sectorImpacts = calculateSectorwiseEconomicImpact(pollutionCosts);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region,
      scenario,
      time_horizon,
      economic_costs: {
        total_annual_cost: pollutionCosts.total_cost,
        health_costs: pollutionCosts.health_costs,
        productivity_losses: pollutionCosts.productivity_losses,
        tourism_impact: pollutionCosts.tourism_impact,
        property_value_impact: pollutionCosts.property_impact,
        agricultural_losses: pollutionCosts.agricultural_losses,
      },
      intervention_benefits: {
        total_annual_benefit: interventionBenefits.total_benefit,
        health_savings: interventionBenefits.health_savings,
        productivity_gains: interventionBenefits.productivity_gains,
        tourism_recovery: interventionBenefits.tourism_gains,
        property_value_increase: interventionBenefits.property_gains,
      },
      cost_benefit_analysis: costBenefitAnalysis,
      sector_impacts: sectorImpacts,
      financing_mechanisms: suggestFinancingMechanisms(costBenefitAnalysis),
      investment_priorities: rankInvestmentPriorities(interventionBenefits),
    });
  } catch (error) {
    console.error('Error calculating economic impact:', error);
    return NextResponse.json(
      { error: 'Failed to calculate economic impact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleHotspotAnalysis(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  const threshold = parseInt(searchParams.get('threshold') || '200', 10);
  const time_period = searchParams.get('period') || '30d';

  try {
    const hotspots = await identifyPollutionHotspots(region, threshold, time_period);
    const hotspotAnalysis = await analyzeHotspotCharacteristics(hotspots);
    const demographicData = await getHotspotDemographics(hotspots);
    const vulnerabilityAssessment = calculateHealthVulnerability(hotspots, demographicData);
    const interventionPriorities = prioritizeHotspotInterventions(hotspots, vulnerabilityAssessment);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region,
      analysis_parameters: {
        aqi_threshold: threshold,
        time_period,
        total_hotspots_identified: hotspots.length,
      },
      hotspot_summary: {
        critical_hotspots: hotspots.filter((h: any) => h.severity === 'critical').length,
        high_priority_hotspots: hotspots.filter((h: any) => h.priority === 'high').length,
        total_population_affected: hotspots.reduce((sum: number, h: any) => sum + (h.population_affected || 0), 0),
      },
      detailed_hotspots: hotspots.map((hotspot: any) => ({
        id: hotspot.id,
        name: hotspot.name,
        location: hotspot.coordinates,
        average_aqi: hotspot.avg_aqi,
        peak_aqi: hotspot.peak_aqi,
        dominant_pollutants: hotspot.dominant_pollutants,
        primary_sources: hotspot.pollution_sources,
        population_affected: hotspot.population_affected,
        vulnerability_score: hotspot.vulnerability_score,
        recommended_interventions: hotspot.interventions,
      })),
      spatial_analysis: hotspotAnalysis.spatial_patterns,
      temporal_analysis: hotspotAnalysis.temporal_patterns,
      vulnerability_assessment: vulnerabilityAssessment,
      intervention_roadmap: interventionPriorities,
    });
  } catch (error) {
    console.error('Error performing hotspot analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform hotspot analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleSeasonalPlanning(searchParams: URLSearchParams): Promise<NextResponse> {
  const season = searchParams.get('season') || getCurrentSeason();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
  const region = searchParams.get('region') || 'Delhi_NCR';

  try {
    const seasonalForecast = seasonalAnalysisSystem.generateSeasonalForecast(season, year);
    const historicalData = await getSeasonalHistoricalData(season, region, 3);
    const actionPlan = generateSeasonalActionPlan(seasonalForecast, historicalData);
    const resourceRequirements = calculateSeasonalResourceRequirements(actionPlan);
    const sectorPreparations = generateSectorSpecificPreparations(season, seasonalForecast);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      season,
      year,
      region,
      seasonal_forecast: {
        expected_air_quality: seasonalForecast.predicted_metrics.avg_aqi,
        peak_pollution_period: seasonalForecast.predicted_metrics.peak_aqi_period,
        expected_severe_days: seasonalForecast.predicted_metrics.expected_severe_days,
        risk_factors: seasonalForecast.risk_factors,
        confidence_level: seasonalForecast.confidence,
      },
      historical_context: {
        average_seasonal_aqi: calculateHistoricalAverage(historicalData),
        worst_year_comparison: getWorstYearComparison(historicalData),
        improvement_trends: calculateImprovementTrends(historicalData),
      },
      action_plan: actionPlan,
      resource_requirements: resourceRequirements,
      sector_preparations: sectorPreparations,
      emergency_protocols: generateEmergencyProtocols(seasonalForecast),
      public_communication_strategy: generatePublicCommunicationStrategy(season, seasonalForecast),
    });
  } catch (error) {
    console.error('Error generating seasonal planning:', error);
    return NextResponse.json(
      { error: 'Failed to generate seasonal planning', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleRealTimeMonitoring(): Promise<NextResponse> {
  try {
    const systemStatus = await predictionEngine.healthCheck();
    const regionalData = await getRegionalStationSummary('Delhi_NCR');
    const activeAlerts = await getActiveSystemAlerts();
    const performanceMetrics = await calculateSystemPerformance();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system_status: systemStatus.status,
      services_health: systemStatus.services,
      monitoring_network: {
        total_stations: regionalData.total_stations,
        online_stations: regionalData.active_stations,
        data_latency: regionalData.avg_data_latency,
        coverage_gaps: regionalData.coverage_gaps,
      },
      current_conditions: {
        regional_average_aqi: regionalData.avg_aqi,
        highest_aqi_location: regionalData.hotspot,
        lowest_aqi_location: regionalData.cleanest_area,
        dominant_pollutant: regionalData.dominant_pollutant,
      },
      active_alerts: activeAlerts,
      performance_metrics: performanceMetrics,
      data_quality: {
        completeness: performanceMetrics.data_completeness,
        accuracy: performanceMetrics.data_accuracy,
        timeliness: performanceMetrics.data_timeliness,
      },
      system_recommendations: generateSystemRecommendations(systemStatus, performanceMetrics),
    });
  } catch (error) {
    console.error('Error in real-time monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to get monitoring status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleComplianceTracking(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  try {
    const summary = await getComplianceSummary(region);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), region, summary });
  } catch (error) {
    console.error('Error in compliance tracking:', error);
    return NextResponse.json(
      { error: 'Failed to get compliance tracking', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleHealthImpactAssessment(searchParams: URLSearchParams): Promise<NextResponse> {
  const region = searchParams.get('region') || 'Delhi_NCR';
  try {
    const assessment = await getHealthImpactAssessment(region);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), region, assessment });
  } catch (error) {
    console.error('Error in health impact assessment:', error);
    return NextResponse.json(
      { error: 'Failed to get health impact assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* =========================
   Handlers (POST endpoints)
   ========================= */

async function handleSimulateIntervention(body: any): Promise<NextResponse> {
  const { region = 'Delhi_NCR', intervention, intensity = 0.2 } = body || {};
  try {
    const result = await simulateIntervention(region, intervention, intensity);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), region, result });
  } catch (error) {
    console.error('Error simulating intervention:', error);
    return NextResponse.json(
      { error: 'Failed to simulate intervention', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleScenarioPlanning(body: any): Promise<NextResponse> {
  const { region = 'Delhi_NCR', scenarios = [] } = body || {};
  try {
    const plan = await buildScenarioPlan(region, scenarios);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), region, plan });
  } catch (error) {
    console.error('Error in scenario planning:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenario planning', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePolicyRecommendation(body: any): Promise<NextResponse> {
  const { region = 'Delhi_NCR', targets = { pm25: 20 } } = body || {};
  try {
    const recs = await generatePolicyRecommendations(region, targets);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), region, recommendations: recs });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleCostBenefitAnalysis(body: any): Promise<NextResponse> {
  const { region = 'Delhi_NCR', interventions = [] } = body || {};
  try {
    const analysis = await runCostBenefitAnalysis(region, interventions);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), region, analysis });
  } catch (error) {
    console.error('Error in cost-benefit analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run cost-benefit analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* =========================
   Helper implementations
   ========================= */

function calculateRegionalStatistics(stationData: any) {
  const aqiValues = stationData.stations.map((s: any) => s.current_aqi);
  return {
    total_stations: stationData.stations.length,
    active_stations: stationData.stations.filter((s: any) => s.status === 'active').length,
    avg_aqi: aqiValues.length ? Math.round(aqiValues.reduce((sum: number, v: number) => sum + v, 0) / aqiValues.length) : 0,
    max_aqi: aqiValues.length ? Math.max(...aqiValues) : 0,
    min_aqi: aqiValues.length ? Math.min(...aqiValues) : 0,
    category_distribution: calculateCategoryDistribution(aqiValues),
  };
}

function calculateCategoryDistribution(aqiValues: number[]) {
  return {
    good: aqiValues.filter((aqi) => aqi <= 50).length,
    satisfactory: aqiValues.filter((aqi) => aqi > 50 && aqi <= 100).length,
    moderate: aqiValues.filter((aqi) => aqi > 100 && aqi <= 200).length,
    poor: aqiValues.filter((aqi) => aqi > 200 && aqi <= 300).length,
    very_poor: aqiValues.filter((aqi) => aqi > 300 && aqi <= 400).length,
    severe: aqiValues.filter((aqi) => aqi > 400).length,
  };
}

function generateExecutiveSummary(regionalStats: any, sourceAnalysis: any, seasonalContext: any, priorityAreas: any[]) {
  return {
    overall_status:
      regionalStats.avg_aqi > 300 ? 'critical' :
      regionalStats.avg_aqi > 200 ? 'poor' :
      regionalStats.avg_aqi > 100 ? 'moderate' : 'acceptable',
    key_concerns: [
      ...priorityAreas.map((a) => `High pollution in ${a.name}`),
      ...(sourceAnalysis.top_sources?.slice(0, 2).map((s: any) => `${s.name} contributing ${s.percentage}%`) || []),
    ],
    immediate_actions_required: generateImmediateActions(regionalStats, sourceAnalysis),
    seasonal_context: `${seasonalContext.season} season - ${seasonalContext.trend}`,
  };
}

async function getRegionalStationSummary(region: string) {
  const stations = region === 'Delhi_NCR' ? stationManager.getActiveStations() : stationManager.getStationsByRegion(region);
  return {
    total_stations: stations.length,
    active_stations: stations.length,
    stations: stations.map((station) => ({
      id: station.id,
      name: station.name,
      location: station.location,
      current_aqi: Math.round(130 + (Math.random() - 0.5) * 120),
      status: 'active',
    })),
    avg_data_latency: 15,
    coverage_gaps: [],
    avg_aqi: 165,
    hotspot: { name: 'Anand Vihar', aqi: 285 },
    cleanest_area: { name: 'Lodhi Road', aqi: 95 },
    dominant_pollutant: 'PM2.5',
  };
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'summer';
}

/* -------- Additional concrete helpers (safe mocks) -------- */

async function getSeasonalContext() {
  return { season: getCurrentSeason(), trend: 'stable', risk_level: 'moderate' };
}

async function getRegionalPredictions(_region: string) {
  return {
    short_term: { avg_aqi_next_24h: 170, probability_exceeds_300: 0.12 },
    seasonal: { expected_avg_aqi: 155, expected_severe_days: 8 },
  };
}

function calculateDataQualityScore(stationData: any) {
  if (!stationData.total_stations) return 0;
  const completeness = stationData.active_stations / stationData.total_stations;
  const latencyScore = stationData.avg_data_latency <= 30 ? 1 : 0.7;
  return Math.round((completeness * 0.7 + latencyScore * 0.3) * 100) / 100;
}

function generatePolicyAlerts(regionalStats: any, _sourceAnalysis: any) {
  const alerts: string[] = [];
  if (regionalStats.avg_aqi > 300) alerts.push('Regional AQI is critical—issue red alert');
  if (regionalStats.max_aqi > 350) alerts.push('Some localities show severe AQI—deploy rapid response');
  return alerts;
}

function identifyPriorityAreas(stationData: any, _sourceAnalysis: any) {
  const sorted = [...stationData.stations].sort((a: any, b: any) => b.current_aqi - a.current_aqi);
  return sorted.slice(0, 5).map((s: any) => ({ name: s.name, aqi: s.current_aqi, location: s.location }));
}

function generateImmediateActions(_regionalStats: any, _sourceAnalysis: any) {
  return [
    'Enhance roadside dust suppression near hotspots',
    'Limit heavy-duty vehicle entry during peak hours',
    'Intensify construction dust control measures',
  ];
}

async function getBenchmarkData(_region: string) {
  return { peers: [{ city: 'Mumbai', avg_aqi: 145 }, { city: 'Bengaluru', avg_aqi: 110 }] };
}

function generateKeyFindings(_sa: any) {
  return ['Vehicular and construction sectors dominate short-term spikes', 'Seasonal biomass burning elevates winter baselines'];
}

function generateRecommendedActions(_pri: any) {
  return ['Scale EV public transport corridors', 'Enforce C&D waste on-site processing', 'Expand industrial emissions monitoring'];
}

function defineSuccessMetrics(_pri: any) {
  return ['PM2.5 annual mean reduction ≥ 10%', 'Severe days reduced by ≥ 30%', 'Compliance rate ≥ 90% in 12 months'];
}

function calculateInterventionPriorities(_sa: any, _sector: any) {
  return [
    { source_id: 'vehicular', priority_score: 0.88, potential_reduction: 22, cost_effectiveness: 0.75 },
    { source_id: 'construction', priority_score: 0.81, potential_reduction: 18, cost_effectiveness: 0.82 },
  ];
}

/* ----- Intervention tracking helpers ----- */

async function trackSpecificIntervention(id: string, metrics: string[]) {
  return {
    tracking_period: '90d',
    interventions: [
      {
        id,
        name: 'Odd-Even Traffic Control',
        type: 'transport',
        start_date: '2025-09-01',
        status: 'active',
        effectiveness_score: 0.68,
        metrics,
        challenges: ['Public compliance', 'Peak-hour exceptions'],
        success_factors: ['Media communication', 'Public transport readiness'],
      },
    ],
  };
}

async function trackAllActiveInterventions(region: string, metrics: string[]) {
  return {
    tracking_period: '90d',
    interventions: [
      ...(await trackSpecificIntervention('INT-TR-001', metrics)).interventions,
      {
        id: 'INT-CD-002',
        name: 'C&D Dust Control Taskforce',
        type: 'construction',
        start_date: '2025-08-10',
        status: 'active',
        effectiveness_score: 0.62,
        metrics,
        challenges: ['Site monitoring coverage'],
        success_factors: ['Mobile inspection teams'],
      },
    ],
  };
}

function calculateInterventionEffectiveness(data: any) {
  const overall = Math.round(
    (data.interventions.reduce((s: number, i: any) => s + i.effectiveness_score, 0) / Math.max(1, data.interventions.length)) * 100
  ) / 100;
  return {
    overall_score: overall,
    aqi_improvement: 7.5,
    pollutant_reduction: { pm25: 9.2, pm10: 6.8 },
    health_benefits: { hospital_visits_averted: 1200 },
    economic_impact: { net_benefit_crore: 15.4 },
    successful_interventions: data.interventions.filter((i: any) => i.effectiveness_score >= 0.7).map((i: any) => i.id),
    underperforming_interventions: data.interventions.filter((i: any) => i.effectiveness_score < 0.5).map((i: any) => i.id),
    ineffective_interventions: data.interventions.filter((i: any) => i.effectiveness_score < 0.3).map((i: any) => i.id),
  };
}

function generateImpactAssessment(data: any, eff: any) {
  return {
    summary: `Overall effectiveness score ${eff.overall_score}`,
    distribution: data.interventions.map((i: any) => ({ id: i.id, score: i.effectiveness_score })),
  };
}

async function getBaselineComparison(_data: any) {
  return { baseline_aqi: 180, current_aqi: 165, change: -8.3 };
}

function generateNewInterventionSuggestions(_eff: any) {
  return ['Low-emission zones in core corridors', 'Targeted street sweeping on high-dust arterials'];
}

/* ----- Policy effectiveness helpers ----- */

async function analyzePolicyEffectiveness(_type: string | null, _period: string, _region: string) {
  return {
    overall_effectiveness: 'moderate',
    aqi_impact: -8.5,
    pollutant_impact: { pm25: -10.2, pm10: -6.1 },
    compliance_rate: 0.82,
    public_acceptance: 0.7,
    detailed_metrics: [],
    challenges: ['Resource constraints'],
    success_factors: ['Inter-agency coordination'],
  };
}

async function getComparativePolicyAnalysis(_type: string | null, _region: string) {
  return { peers: [{ city: 'Chandigarh', compliance_rate: 0.86 }, { city: 'Pune', compliance_rate: 0.8 }] };
}

function calculatePolicyROI(_policyData: any) {
  return { benefit_cost_ratio: 2.4, payback_years: 1.8 };
}

function extractLessonsLearned(_policyData: any) {
  return ['Phased rollouts improve compliance', 'Public dashboards increase transparency'];
}

function generatePolicyImprovements(_policyData: any) {
  return ['Automate compliance audits', 'Introduce dynamic congestion pricing'];
}

function generateImplementationStrategies(_policyData: any) {
  return ['Quarterly milestones with KPIs', 'Stakeholder workshops each phase'];
}

function generateMonitoringEnhancements(_policyData: any) {
  return ['Expand CEMS network', 'Real-time public dashboards'];
}

/* ----- Economic helpers ----- */

async function calculatePollutionCosts(_region: string, _scenario: string, _horizon: string) {
  return {
    total_cost: 5200,
    health_costs: 2400,
    productivity_losses: 1700,
    tourism_impact: 450,
    property_impact: 350,
    agricultural_losses: 300,
  };
}

async function calculateInterventionBenefits(_region: string, _horizon: string) {
  return {
    total_benefit: 6900,
    health_savings: 3100,
    productivity_gains: 2300,
    tourism_gains: 700,
    property_gains: 800,
  };
}

function performCostBenefitAnalysis(costs: any, benefits: any) {
  const net = benefits.total_benefit - costs.total_cost;
  const bcr = costs.total_cost ? benefits.total_benefit / costs.total_cost : 0;
  return { net_benefit: net, benefit_cost_ratio: Math.round(bcr * 100) / 100 };
}

function calculateSectorwiseEconomicImpact(costs: any) {
  return [
    { sector: 'health', share: Math.round((costs.health_costs / costs.total_cost) * 100) },
    { sector: 'productivity', share: Math.round((costs.productivity_losses / costs.total_cost) * 100) },
  ];
}

function suggestFinancingMechanisms(_cba: any) {
  return ['Green municipal bonds', 'Pollution levy earmarking', 'Viability gap funding'];
}

function rankInvestmentPriorities(_benefits: any) {
  return ['Public transport electrification', 'Industrial retrofits', 'Dust suppression infrastructure'];
}

/* ----- Hotspot helpers ----- */

async function identifyPollutionHotspots(_region: string, threshold: number, _period: string) {
  const stations = stationManager.getActiveStations();
  const enriched = stations.map((s) => ({
    id: s.id,
    name: s.name,
    coordinates: s.location,
    avg_aqi: Math.round(140 + Math.random() * 120),
    peak_aqi: Math.round(180 + Math.random() * 180),
    dominant_pollutants: ['PM2.5', 'PM10'],
    pollution_sources: ['vehicular', 'construction'],
    population_affected: Math.round(50000 + Math.random() * 200000),
    vulnerability_score: Math.round(50 + Math.random() * 50),
    severity: Math.random() > 0.7 ? 'critical' : 'high',
    priority: Math.random() > 0.5 ? 'high' : 'medium',
    interventions: ['Ramp up dust control', 'Traffic rerouting'],
  }));
  return enriched.filter((h) => h.avg_aqi >= threshold);
}

async function analyzeHotspotCharacteristics(hotspots: any[]) {
  return {
    spatial_patterns: { cluster_count: Math.max(1, Math.round(hotspots.length / 5)) },
    temporal_patterns: { evening_peaks: true, winter_amplification: true },
  };
}

async function getHotspotDemographics(_hotspots: any[]) {
  return { vulnerable_population_share: 0.22, income_index: 0.54 };
}

function calculateHealthVulnerability(hotspots: any[], demo: any) {
  const scores = hotspots.map((h) => ({
    id: h.id,
    score: Math.round((h.vulnerability_score * (1 + demo.vulnerable_population_share)) * 100) / 100,
  }));
  return { scores };
}

function prioritizeHotspotInterventions(hotspots: any[], _vuln: any) {
  return hotspots
    .map((h) => ({ id: h.id, name: h.name, priority: h.priority, recommended: h.interventions }))
    .slice(0, 10);
}

/* ----- Seasonal planning helpers ----- */

async function getSeasonalHistoricalData(_season: string, _region: string, years: number) {
  return Array.from({ length: years }, (_, i) => ({ year: new Date().getFullYear() - i, avg_aqi: 160 + Math.round(Math.random() * 30) }));
}

function generateSeasonalActionPlan(_forecast: any, _history: any) {
  return [
    { action: 'Scale anti-dust operations', window: 'Weeks 1-4' },
    { action: 'Enhance public advisories', window: 'Continuous' },
  ];
}

function calculateSeasonalResourceRequirements(_plan: any[]) {
  return { budget_crore: 22.5, teams_required: 18 };
}

function generateSectorSpecificPreparations(_season: string, _forecast: any) {
  return {
    transport: ['Promote off-peak travel', 'Expand bus fleet electrification'],
    construction: ['Mandatory sprinkling & covers', 'On-site debris processing'],
  };
}

function generateEmergencyProtocols(_forecast: any) {
  return ['Issue alerts for severe days', 'Activate school advisories', 'Set up urban clinics'];
}

function generatePublicCommunicationStrategy(season: string, _forecast: any) {
  return { theme: `${season} air quality preparedness`, channels: ['SMS', 'Radio', 'Social'] };
}

/* ----- System health helpers ----- */

async function getActiveSystemAlerts() {
  return ['Data latency within norms', 'All services healthy'];
}

async function calculateSystemPerformance() {
  return { data_completeness: 0.93, data_accuracy: 0.9, data_timeliness: 0.88 };
}

function generateSystemRecommendations(_status: any, perf: any) {
  const recs = [];
  if (perf.data_timeliness < 0.9) recs.push('Increase station ping frequency');
  if (perf.data_accuracy < 0.9) recs.push('Run calibration checks on outliers');
  return recs;
}

async function getComplianceSummary(_region: string) {
  return { inspected_sites: 120, violations: 14, compliance_rate: 0.883 };
}

async function getHealthImpactAssessment(_region: string) {
  return { estimated_asthma_cases_averted: 350, working_days_gained: 22000 };
}

/* ===== End of file ===== */
