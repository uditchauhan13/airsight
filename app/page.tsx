"use client"

import { useState } from 'react'
import { HyperLocalAQI } from '@/components/citizen/hyperlocal-aqi'
import { SourceBreakdown } from '@/components/policy/source-breakdown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MapPin, Satellite, Brain, TrendingUp, Users, Building2, LineChart, AlertTriangle } from 'lucide-react'

export default function AirSightDashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 dark:bg-slate-900/80 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Satellite className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AirSight Delhi NCR</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI-Powered Air Quality Management System</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Badge variant="outline" className="text-green-700 border-green-200 dark:text-green-400 dark:border-green-700">
                <Brain className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-700">
                <TrendingUp className="h-3 w-3 mr-1" />
                Real-time
              </Badge>
              <Badge variant="outline" className="text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-700">
                <Satellite className="h-3 w-3 mr-1" />
                Satellite Data
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Advanced Air Quality
            <span className="block text-blue-600 dark:text-blue-400">Intelligence System</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Combining government data (CPCB), satellite imagery (ISRO, NASA), and advanced ML models 
            to provide hyperlocal air quality predictions and policy insights for Delhi NCR.
          </p>
          
          {/* Key Metrics Cards */}
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 dark:text-white">Hyperlocal</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">GPS-based predictions</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <Satellite className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 dark:text-white">Satellite Data</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">ISRO + NASA integration</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 dark:text-white">AI Forecasting</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">72h predictions</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-900 dark:text-white">Policy Insights</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Source apportionment</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="citizen" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="citizen" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Citizen Portal</span>
              </TabsTrigger>
              <TabsTrigger value="policy" className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Policy Dashboard</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="citizen" className="mt-8">
              <div className="max-w-4xl mx-auto">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span>Hyperlocal Air Quality Monitor</span>
                    </CardTitle>
                    <CardDescription>
                      Get real-time air quality data and predictions for your exact location using GPS-based interpolation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HyperLocalAQI />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="policy" className="mt-8">
              <div className="max-w-7xl mx-auto">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <LineChart className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span>Emission Source Analysis</span>
                    </CardTitle>
                    <CardDescription>
                      Comprehensive breakdown of pollution sources for evidence-based policy interventions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SourceBreakdown />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* System Features */}
      <section className="py-16 bg-gray-50 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">System Capabilities</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center">
                  <Satellite className="h-5 w-5 mr-2" />
                  Multi-Source Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> CPCB real-time monitoring stations</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> NASA MODIS aerosol data</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> ISRO OCM-3 & EOS-6 satellites</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Weather correlation analysis</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Fire hotspot detection</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-green-600 dark:text-green-400 flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Advanced ML Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> XGBoost ensemble predictions</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> LSTM temporal modeling</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Multi-horizon forecasting (1h-72h)</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Feature importance analysis</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Uncertainty quantification</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-purple-600 dark:text-purple-400 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Policy Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Source apportionment analysis</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Intervention effectiveness tracking</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Health risk assessment</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Economic impact evaluation</li>
                  <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Real-time alert systems</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Alert Banner */}
      <section className="py-8 bg-blue-50 dark:bg-blue-950 border-t border-blue-200 dark:border-blue-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-4 text-center">
            <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-blue-900 dark:text-blue-100 font-semibold">
                Live System Status: All data sources operational
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Real-time updates from 50+ monitoring stations across Delhi NCR
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Satellite className="h-6 w-6 text-blue-400" />
                <h4 className="text-lg font-bold">AirSight Delhi NCR</h4>
              </div>
              <p className="text-gray-400 mb-4">
                Advanced air quality management system combining government data, 
                satellite imagery, and AI predictions for Delhi NCR.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Data Sources</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-gray-300 border-gray-600">CPCB</Badge>
                <Badge variant="outline" className="text-gray-300 border-gray-600">ISRO</Badge>
                <Badge variant="outline" className="text-gray-300 border-gray-600">NASA</Badge>
                <Badge variant="outline" className="text-gray-300 border-gray-600">OpenWeather</Badge>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">System Info</h4>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>Built for Smart India Hackathon 2025</li>
                <li>Real-time ML predictions</li>
                <li>Policy-grade source analysis</li>
                <li>Open-source architecture</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 AirSight Delhi NCR. Advanced Air Quality Intelligence System.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Powered by CPCB, ISRO, NASA data • ML forecasting • Policy insights
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
