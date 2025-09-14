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
            {/* Simplified Orbital Map */}
            <div className="w-full h-full relative bg-gradient-to-br from-gray-900 via-black to-purple-900">
              
              {/* World Map Background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 1000 500" className="w-full h-full opacity-30">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#333" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  
                  {/* Grid */}
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Continents */}
                  <g stroke="#444" fill="#1a1a1a" strokeWidth="2">
                    {/* North America */}
                    <rect x="100" y="100" width="200" height="150" rx="20"/>
                    {/* Europe/Asia */}
                    <rect x="400" y="80" width="350" height="200" rx="20"/>
                    {/* Africa */}
                    <rect x="420" y="200" width="120" height="180" rx="15"/>
                    {/* Australia */}
                    <rect x="700" y="320" width="100" height="60" rx="10"/>
                  </g>
                </svg>
              </div>

              {/* Orbital Trajectories */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 1000 500" className="w-full h-full">
                  {/* Orbital paths for each satellite */}
                  {Object.entries(satellites).map(([satId, sat]) => {
                    const isSelected = satId === selectedSatellite
                    
                    // Create orbital ellipse path
                    const centerX = 500
                    const centerY = 250
                    const radiusX = 300 + (Math.random() * 100)
                    const radiusY = 150 + (Math.random() * 50)
                    const rotation = Math.random() * 45
                    
                    return (
                      <g key={satId}>
                        {/* Orbital path */}
                        <ellipse
                          cx={centerX}
                          cy={centerY}
                          rx={radiusX}
                          ry={radiusY}
                          fill="none"
                          stroke={isSelected ? "#a855f7" : "#6b21a8"}
                          strokeWidth={isSelected ? 3 : 2}
                          strokeDasharray={isSelected ? "none" : "10,5"}
                          opacity={isSelected ? 1 : 0.4}
                          transform={`rotate(${rotation} ${centerX} ${centerY})`}
                        />
                        
                        {/* Satellite position on orbit */}
                        <circle
                          cx={centerX + radiusX * Math.cos(Date.now() * 0.001 + Object.keys(satellites).indexOf(satId))}
                          cy={centerY + radiusY * Math.sin(Date.now() * 0.001 + Object.keys(satellites).indexOf(satId))}
                          r={isSelected ? 8 : 5}
                          fill={sat.status === "active" ? "#10b981" : 
                                sat.status === "maintenance" ? "#f59e0b" : "#ef4444"}
                          stroke={isSelected ? "#a855f7" : "none"}
                          strokeWidth="2"
                        >
                          {/* Pulsing animation for selected satellite */}
                          {isSelected && (
                            <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                          )}
                        </circle>
                        
                        {/* Satellite label */}
                        <text
                          x={centerX + radiusX * Math.cos(Date.now() * 0.001 + Object.keys(satellites).indexOf(satId)) + 15}
                          y={centerY + radiusY * Math.sin(Date.now() * 0.001 + Object.keys(satellites).indexOf(satId)) - 10}
                          fill="white"
                          fontSize={isSelected ? "14" : "12"}
                          fontWeight={isSelected ? "bold" : "normal"}
                          fontFamily="monospace"
                        >
                          {satId}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Selected Satellite Info Panel */}
              {satellite && (
                <div className="absolute top-4 left-4 bg-black/90 border border-purple-500/70 rounded-lg p-4 text-white max-w-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${
                      satellite.status === "active" ? "bg-green-500" : 
                      satellite.status === "maintenance" ? "bg-yellow-500" : "bg-red-500"
                    }`}></div>
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
              <div className="absolute top-4 right-4 bg-black/90 border border-purple-500/70 rounded px-3 py-1 text-purple-300 font-mono text-sm">
                {new Date().toISOString().slice(0, 19)}Z
              </div>

              {/* Scale indicator */}
              <div className="absolute bottom-4 left-4 bg-black/90 border border-purple-500/70 rounded px-3 py-2 text-white text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-1 bg-purple-500"></div>
                  <span>Orbital Track</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active Satellite</span>
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
                  Map View
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
