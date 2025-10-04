"use client"

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, TrendingDown, Factory, Car, Home, Truck, AlertTriangle, Info } from 'lucide-react';

interface SourceData {
  source_id: string;
  name: string;
  category: string;
  pm25_contribution: number;
  pm10_contribution: number;
  percentage_pm25: number;
  percentage_pm10: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonal_variation: number;
}

interface SourceBreakdownData {
  timestamp: string;
  location: {
    name: string;
    region: string;
  };
  total_pm25: number;
  total_pm10: number;
  source_contributions: SourceData[];
  dominant_sources: {
    pm25: string[];
    pm10: string[];
  };
  seasonal_analysis: {
    season: string;
    enhanced_sources: string[];
    reduced_sources: string[];
  };
  intervention_priorities: {
    source_id: string;
    priority_score: number;
    potential_reduction: number;
    cost_effectiveness: number;
  }[];
  temporal_trends: {
    hourly_pattern: { hour: number; contribution: number }[];
    monthly_trends: { month: string; value: number }[];
  };
}

const COLORS = {
  vehicular: '#ef4444',
  industrial: '#f97316', 
  residential: '#eab308',
  agriculture: '#22c55e',
  construction: '#a855f7',
  power: '#3b82f6',
  waste: '#8b5cf6',
  others: '#6b7280'
};

const SOURCE_ICONS = {
  vehicular: Car,
  industrial: Factory,
  residential: Home,
  agriculture: Truck,
  construction: AlertTriangle,
  power: TrendingUp,
  waste: AlertTriangle,
  others: Info
};

export function SourceBreakdown() {
  const [data, setData] = useState<SourceBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('Delhi_NCR');
  const [selectedPollutant, setSelectedPollutant] = useState<'PM2.5' | 'PM10'>('PM2.5');
  const [timeRange, setTimeRange] = useState('7d');
  const [viewType, setViewType] = useState<'current' | 'trends' | 'interventions'>('current');

  const fetchSourceBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/policy?action=source-analysis&region=${selectedRegion}&detailed=true&time_range=${timeRange}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Transform API data to component format
        const transformedData: SourceBreakdownData = {
          timestamp: result.timestamp,
          location: {
            name: result.region,
            region: result.region
          },
          total_pm25: result.source_contribution?.total_pm25 || 0,
          total_pm10: result.source_contribution?.total_pm10 || 0,
          source_contributions: transformSourceContributions(result.source_contribution?.breakdown || []),
          dominant_sources: result.source_contribution?.dominant_sources || { pm25: [], pm10: [] },
          seasonal_analysis: result.seasonal_context || {
            season: 'winter',
            enhanced_sources: [],
            reduced_sources: []
          },
          intervention_priorities: result.intervention_priorities || [],
          temporal_trends: result.temporal_patterns || {
            hourly_pattern: [],
            monthly_trends: []
          }
        };
        
        setData(transformedData);
      } else {
        throw new Error(result.error || 'Failed to fetch source breakdown data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching source breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSourceBreakdown();
  }, [selectedRegion, timeRange]);

  const transformSourceContributions = (breakdown: any[]): SourceData[] => {
    return breakdown.map(item => ({
      source_id: item.id || item.source_id,
      name: item.name,
      category: item.category || 'others',
      pm25_contribution: item.pm25_contribution || 0,
      pm10_contribution: item.pm10_contribution || 0,
      percentage_pm25: item.percentage_pm25 || 0,
      percentage_pm10: item.percentage_pm10 || 0,
      confidence: item.confidence || 0.75,
      trend: item.trend || 'stable',
      seasonal_variation: item.seasonal_variation || 0
    }));
  };

  const getPollutantData = () => {
    if (!data) return [];
    
    return data.source_contributions.map(source => ({
      name: source.name,
      category: source.category,
      contribution: selectedPollutant === 'PM2.5' ? source.pm25_contribution : source.pm10_contribution,
      percentage: selectedPollutant === 'PM2.5' ? source.percentage_pm25 : source.percentage_pm10,
      confidence: source.confidence,
      trend: source.trend
    })).sort((a, b) => b.contribution - a.contribution);
  };

  const getPieChartData = () => {
    const pollutantData = getPollutantData();
    return pollutantData.map(item => ({
      name: item.name,
      value: item.percentage,
      color: COLORS[item.category as keyof typeof COLORS] || COLORS.others
    }));
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getSourceIcon = (category: string) => {
    const IconComponent = SOURCE_ICONS[category as keyof typeof SOURCE_ICONS] || Info;
    return <IconComponent className="h-5 w-5" />;
  };

  const handleRefresh = () => {
    fetchSourceBreakdown();
  };

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <p>Loading source breakdown analysis...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Delhi_NCR">Delhi NCR</SelectItem>
              <SelectItem value="Delhi">Delhi</SelectItem>
              <SelectItem value="Ghaziabad">Ghaziabad</SelectItem>
              <SelectItem value="Gurugram">Gurugram</SelectItem>
              <SelectItem value="Noida">Noida</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPollutant} onValueChange={(value: 'PM2.5' | 'PM10') => setSelectedPollutant(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PM2.5">PM2.5</SelectItem>
              <SelectItem value="PM10">PM10</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.total_pm25.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Total PM2.5 (µg/m³)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.total_pm10.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Total PM10 (µg/m³)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.source_contributions.length}</p>
              <p className="text-sm text-gray-600">Sources Identified</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.seasonal_analysis.season}</p>
              <p className="text-sm text-gray-600">Current Season</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis */}
      <Tabs value={viewType} onValueChange={(value: any) => setViewType(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Temporal Trends</TabsTrigger>
          <TabsTrigger value="interventions">Intervention Priorities</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Pie Chart and Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Source Contribution - {selectedPollutant}</CardTitle>
                <CardDescription>
                  Percentage contribution by emission source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Contribution']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Absolute Contributions</CardTitle>
                <CardDescription>
                  {selectedPollutant} concentration by source (µg/m³)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPollutantData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} µg/m³`, 'Contribution']}
                      labelFormatter={(label) => `Source: ${label}`}
                    />
                    <Bar 
                      dataKey="contribution" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Source List */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Source Analysis</CardTitle>
              <CardDescription>
                Comprehensive breakdown of all emission sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getPollutantData().map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-lg bg-gray-100">
                        {getSourceIcon(source.category)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{source.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{source.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="font-semibold">{source.contribution.toFixed(1)} µg/m³</p>
                        <p className="text-sm text-gray-600">{source.percentage.toFixed(1)}%</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(source.trend)}
                        <Badge variant="outline">
                          {Math.round(source.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dominant Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top PM2.5 Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.dominant_sources.pm25.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{source}</span>
                      <Badge variant="destructive">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top PM10 Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.dominant_sources.pm10.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{source}</span>
                      <Badge variant="destructive">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Hourly Pattern */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Pattern</CardTitle>
              <CardDescription>
                Average hourly contribution pattern
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.temporal_trends.hourly_pattern}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="contribution" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>
                Source contribution trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.temporal_trends.monthly_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-6">
          {/* Intervention Priorities */}
          <Card>
            <CardHeader>
              <CardTitle>Intervention Priority Matrix</CardTitle>
              <CardDescription>
                Sources ranked by priority score and potential impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.intervention_priorities
                  .sort((a, b) => b.priority_score - a.priority_score)
                  .map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">
                        {data.source_contributions.find(s => s.source_id === item.source_id)?.name || item.source_id}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Priority Score: {item.priority_score.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <p className="text-sm">
                        <strong>Potential Reduction:</strong> {item.potential_reduction.toFixed(1)}%
                      </p>
                      <p className="text-sm">
                        <strong>Cost Effectiveness:</strong> {item.cost_effectiveness.toFixed(2)}
                      </p>
                      <Badge 
                        variant={index < 3 ? "destructive" : index < 6 ? "default" : "secondary"}
                      >
                        {index < 3 ? "High Priority" : index < 6 ? "Medium Priority" : "Low Priority"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Seasonal Context */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Context</CardTitle>
          <CardDescription>
            Current season: {data.seasonal_analysis.season}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">Enhanced Sources</h4>
              <ul className="list-disc list-inside space-y-1">
                {data.seasonal_analysis.enhanced_sources.map((source, index) => (
                  <li key={index} className="text-sm">{source}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">Reduced Sources</h4>
              <ul className="list-disc list-inside space-y-1">
                {data.seasonal_analysis.reduced_sources.map((source, index) => (
                  <li key={index} className="text-sm">{source}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
