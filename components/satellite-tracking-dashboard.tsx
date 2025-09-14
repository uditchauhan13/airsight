"use client"

import { useState } from "react"
import { satellites } from "@/lib/satellite-data"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"
import { Button } from "@/components/ui/button"

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("map")

  const satellite = satellites[selectedSatellite]

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-400">
          AirSight Mission Control
        </h1>
        
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          {/* Main Orbital View */}
          <div className="col-span-8 bg-gray-900/50 border border-purple-500/30 rounded-lg overflow-hidden relative">
            {/* Enhanced Orbital Map with Globe */}
            <div className="w-full h-full relative bg-gradient-to-br from-gray-900 via-black to-purple-900">
              
              {/* Stars Background */}
              <div className="absolute inset-0">
                <svg viewBox="0 0 1000 500" className="w-full h-full">
                  {/* Random stars */}
                  {Array.from({length: 100}, (_, i) => (
                    <circle
                      key={i}
                      cx={Math.random() * 1000}
                      cy={Math.random() * 500}
                      r={Math.random() * 1.5}
                      fill="white"
                      opacity={Math.random() * 0.8 + 0.2}
                    />
                  ))}
                </svg>
              </div>

              {/* Central Earth Globe */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Main Earth sphere */}
                  <div className="w-48 h-48 rounded-full relative overflow-hidden border-4 border-blue-400/30">
                    {/* Earth gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-green-600 to-blue-800"></div>
                    
                    {/* Continents overlay */}
                    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full opacity-80">
                      <defs>
                        <radialGradient id="earthGradient" cx="0.3" cy="0.3">
                          <stop offset="0%" stopColor="#4ade80" />
                          <stop offset="40%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#1e40af" />
                        </radialGradient>
                      </defs>
                      
                      {/* Earth background */}
                      <circle cx="100" cy="100" r="95" fill="url(#earthGradient)" />
                      
                      {/* Continents */}
                      <g fill="#15803d" opacity="0.9">
                        {/* North America */}
                        <path d="M 30 60 Q 50 50 70 65 L 75 90 Q 60 95 45 85 Z" />
                        {/* Europe/Asia */}
                        <path d="M 85 45 Q 120 40 150 55 L 160 80 Q 140 85 110 75 Z" />
                        {/* Africa */}
                        <path d="M 90 85 Q 105 80 115 95 L 110 130 Q 100 135 95 120 Z" />
                        {/* South America */}
                        <path d="M 50 110 Q 60 105 65 120 L 60 150 Q 55 155 50 140 Z" />
                        {/* Australia */}
                        <path d="M 140 130 Q 155 125 165 135 L 160 145 Q 150 148 145 140 Z" />
                      </g>
                      
                      {/* Cloud layer */}
                      <g fill="white" opacity="0.3">
                        <ellipse cx="70" cy="50" rx="15" ry="8" />
                        <ellipse cx="130" cy="70" rx="20" ry="10" />
                        <ellipse cx="90" cy="120" rx="18" ry="9" />
                        <ellipse cx="140" cy="40" rx="12" ry="6" />
                      </g>
                    </svg>
                    
                    {/* Atmospheric glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-blue-300/20 to-transparent"></div>
                  </div>
                  
                  {/* Earth rotation animation */}
                  <div className="absolute inset-0 w-48 h-48 rounded-full animate-spin" style={{ animationDuration: '30s' }}>
                    <div className="w-full h-full rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                  </div>
                </div>
              </div>

              {/* Orbital Trajectories around Globe */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 1000 500" className="w-full h-full">
                  {Object.entries(satellites).map(([satId, sat]) => {
                    const isSelected = satId === selectedSatellite
                    const centerX = 500
                    const centerY = 250
                    
                    // Different orbital parameters for each satellite
                    const orbitalData = {
                      'VO-52': { radiusX: 180, radiusY: 120, rotation: 15, speed: 0.8 },
                      'HO-68': { radiusX: 200, radiusY: 100, rotation: -25, speed: 1.2 },
                      'SO-50': { radiusX: 160, radiusY: 140, rotation: 45, speed: 0.6 },
                      'AO-27': { radiusX: 220, radiusY: 80, rotation: -10, speed: 1.0 }
                    }
                    
                    const orbital = orbitalData[satId as keyof typeof orbitalData] || orbitalData['VO-52']
                    const time = Date.now() * 0.001 * orbital.speed
                    const satIndex = Object.keys(satellites).indexOf(satId)
                    const phaseOffset = satIndex * Math.PI / 2
                    
                    // Satellite position
                    const satX = centerX + orbital.radiusX * Math.cos(time + phaseOffset)
                    const satY = centerY + orbital.radiusY * Math.sin(time + phaseOffset)
                    
                    return (
                      <g key={satId}>
                        {/* Orbital path */}
                        <ellipse
                          cx={centerX}
                          cy={centerY}
                          rx={orbital.radiusX}
                          ry={orbital.radiusY}
                          fill="none"
                          stroke={isSelected ? "#a855f7" : "#6b21a8"}
                          strokeWidth={isSelected ? 3 : 2}
                          strokeDasharray={isSelected ? "none" : "8,4"}
                          opacity={isSelected ? 0.9 : 0.4}
                          transform={`rotate(${orbital.rotation} ${centerX} ${centerY})`}
                        />
                        
                        {/* Satellite trail */}
                        <g transform={`rotate(${orbital.rotation} ${centerX} ${centerY})`}>
                          {Array.from({length: 20}, (_, i) => {
                            const trailTime = time + phaseOffset - (i * 0.1)
                            const trailX = centerX + orbital.radiusX * Math.cos(trailTime)
                            const trailY = centerY + orbital.radiusY * Math.sin(trailTime)
                            const opacity = (20 - i) / 30
                            
                            return (
                              <circle
                                key={i}
                                cx={trailX}
                                cy={trailY}
                                r="1.5"
                                fill={isSelected ? "#a855f7" : "#6b21a8"}
                                opacity={opacity * (isSelected ? 0.8 : 0.3)}
                              />
                            )
                          })}
                        </g>
                        
                        {/* Satellite */}
                        <g transform={`rotate(${orbital.rotation} ${centerX} ${centerY})`}>
                          <circle
                            cx={centerX + orbital.radiusX * Math.cos(time + phaseOffset)}
                            cy={centerY + orbital.radiusY * Math.sin(time + phaseOffset)}
                            r={isSelected ? 8 : 5}
                            fill={sat.status === "active" ? "#10b981" : 
                                  sat.status === "maintenance" ? "#f59e0b" : "#ef4444"}
                            stroke={isSelected ? "#a855f7" : "#ffffff"}
                            strokeWidth={isSelected ? 3 : 1}
                          >
                            {isSelected && (
                              <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                            )}
                          </circle>
                          
                          {/* Satellite label */}
                          <text
                            x={centerX + orbital.radiusX * Math.cos(time + phaseOffset) + 15}
                            y={centerY + orbital.radiusY * Math.sin(time + phaseOffset) - 10}
                            fill="white"
                            fontSize={isSelected ? "14" : "12"}
                            fontWeight={isSelected ? "bold" : "normal"}
                            fontFamily="monospace"
                            textShadow="2px 2px 4px rgba(0,0,0,0.8)"
                          >
                            {satId}
                          </text>
                        </g>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Selected Satellite Info Panel */}
              {satellite && (
                <div className="absolute top-4 left-4 bg-black/90 border border-purple-500/70 rounded-lg p-4 text-white max-w-sm backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${
                      satellite.status === "active" ? "bg-green-500" : 
                      satellite.status === "maintenance" ? "bg-yellow-500" : "bg-red-500"
                    } animate-pulse`}></div>
                    <h3 className="text-lg font-bold text-purple-400">
                      {satellite.name} ({satellite.id})
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Latitude:</span>
                      <div className="text-purple-300 font-mono">
                        {satellite.coordinates.latitude.toFixed(4)}°
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Longitude:</span>
                      <div className="text-purple-300 font-mono">
                        {satellite.coordinates.longitude.toFixed(4)}°
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Altitude:</span>
                      <div className="text-purple-300 font-mono">
                        {satellite.coordinates.altitude} km
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Velocity:</span>
                      <div className="text-purple-300 font-mono">
                        {satellite.orbital.velocity} km/s
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-purple-500/30 text-xs">
                    <div className="text-gray-400">Organization:</div>
                    <div className="text-white">{satellite.organization}</div>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="absolute top-4 right-4 bg-black/90 border border-purple-500/70 rounded px-3 py-1 text-purple-300 font-mono text-sm backdrop-blur-sm">
                {new Date().toISOString().slice(0, 19)}Z
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-black/90 border border-purple-500/70 rounded px-3 py-2 text-white text-xs backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-1 bg-purple-500"></div>
                  <span>Orbital Track</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Active Satellite</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-full border border-blue-400/50"></div>
                  <span>Earth</span>
                </div>
              </div>

              {/* View Mode Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "map" ? "default" : "outline"}
                  onClick={() => setViewMode("map")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Globe View
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "3d" ? "default" : "outline"}
                  onClick={() => setViewMode("3d")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  3D View
                </Button>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="col-span-4 space-y-4">
            <SatelliteControlPanel 
              selectedSatellite={selectedSatellite}
              onSatelliteChange={setSelectedSatellite}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <TechnicalReadouts satellite={selectedSatellite} />
          </div>
        </div>
      </div>
    </div>
  )
}
