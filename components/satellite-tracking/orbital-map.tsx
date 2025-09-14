"use client"

import { useEffect, useState } from "react"
import { satellites, orbitalTrajectories } from "@/lib/satellite-data"

interface OrbitalMapProps {
  selectedSatellite: string
}

export function OrbitalMap({ selectedSatellite }: OrbitalMapProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const satellite = satellites[selectedSatellite]
  if (!satellite) return null

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-black to-purple-900 overflow-hidden">
      {/* World Map Background */}
      <div className="absolute inset-0 opacity-30">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          {/* Continents - Simple outlines */}
          <g stroke="#333333" fill="none" strokeWidth="1">
            {/* North America */}
            <path d="M 120 80 L 280 80 L 280 180 L 120 180 Z" />
            {/* Europe/Asia */}
            <path d="M 320 60 L 680 60 L 680 200 L 320 200 Z" />
            {/* Africa */}
            <path d="M 336 140 L 464 140 L 464 280 L 336 280 Z" />
            {/* Australia */}
            <path d="M 560 260 L 680 260 L 680 300 L 560 300 Z" />
            {/* Grid lines */}
            <g stroke="#222" strokeWidth="0.5" opacity="0.5">
              {Array.from({length: 9}, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />
              ))}
              {Array.from({length: 17}, (_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" />
              ))}
            </g>
          </g>
        </svg>
      </div>

      {/* Orbital Trajectories */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          {Object.entries(orbitalTrajectories).map(([satId, trajectory]) => {
            const isSelected = satId === selectedSatellite
            
            return (
              <g key={satId}>
                {/* Orbital path */}
                <path
                  d={`M ${trajectory.map(point => {
                    const x = ((point.lng + 180) / 360) * 800
                    const y = ((90 - point.lat) / 180) * 400
                    return `${x},${y}`
                  }).join(' L ')}`}
                  stroke={isSelected ? "#a855f7" : "#6b21a8"}
                  strokeWidth={isSelected ? "3" : "2"}
                  fill="none"
                  strokeDasharray={isSelected ? "none" : "5,5"}
                  opacity={isSelected ? "1" : "0.6"}
                />
                
                {/* Trajectory points */}
                {trajectory.map((point, i) => {
                  const x = ((point.lng + 180) / 360) * 800
                  const y = ((90 - point.lat) / 180) * 400
                  
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isSelected ? "3" : "2"}
                      fill={isSelected ? "#a855f7" : "#6b21a8"}
                      opacity="0.8"
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Satellites */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          {Object.entries(satellites).map(([satId, sat]) => {
            const x = ((sat.coordinates.longitude + 180) / 360) * 800
            const y = ((90 - sat.coordinates.latitude) / 180) * 400
            const isSelected = satId === selectedSatellite
            
            const statusColor = sat.status === "active" ? "#10b981" : 
                               sat.status === "maintenance" ? "#f59e0b" : "#ef4444"
            
            return (
              <g key={satId}>
                {/* Satellite ring (if selected) */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="r"
                      values="15;25;15"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                
                {/* Satellite dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? "8" : "5"}
                  fill={statusColor}
                  stroke={isSelected ? "#a855f7" : "none"}
                  strokeWidth="2"
                />
                
                {/* Satellite label */}
                <text
                  x={x + 12}
                  y={y - 8}
                  fill="white"
                  fontSize={isSelected ? "12" : "10"}
                  fontWeight={isSelected ? "bold" : "normal"}
                  fontFamily="monospace"
                >
                  {sat.id}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected Satellite Details Panel */}
      <div className="absolute top-4 left-4 bg-black/80 border border-purple-500/50 rounded-lg p-4 text-white max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${
            satellite.status === "active" ? "bg-green-500" : 
            satellite.status === "maintenance" ? "bg-yellow-500" : "bg-red-500"
          }`}></div>
          <h3 className="text-lg font-bold text-purple-400">
            {satellite.name} ({satellite.id})
          </h3>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="mt-3 pt-2 border-t border-purple-500/30">
            <div className="text-gray-400 text-xs">Organization:</div>
            <div className="text-white text-xs">{satellite.organization}</div>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="absolute top-4 right-4 bg-black/80 border border-purple-500/50 rounded px-3 py-1 text-purple-300 font-mono text-sm">
        {currentTime.toISOString().slice(0, 19)}Z
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 bg-black/80 border border-purple-500/50 rounded px-3 py-2 text-white text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-1 bg-purple-500"></div>
          <span>Orbital Track</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Active Satellite</span>
        </div>
      </div>
    </div>
  )
}
