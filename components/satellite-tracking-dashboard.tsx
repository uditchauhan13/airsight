"use client"

import { useState, useEffect } from "react"
import { satellites } from "@/lib/satellite-data"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"
import { Button } from "@/components/ui/button"

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("map")
  const [time, setTime] = useState(0)

  // Animation timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev + 1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const satellite = satellites[selectedSatellite]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-screen flex">
        {/* Main Display */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-16 bg-gray-900 border-b border-gray-700 flex items-center px-6">
            <h1 className="text-xl font-mono text-purple-400">AIRSIGHT MISSION CONTROL</h1>
            <div className="ml-auto text-sm font-mono text-gray-400">
              {new Date().toISOString().slice(0, 19)}Z
            </div>
          </div>

          {/* Main View */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {viewMode === "map" ? (
              /* Map View - SVG Based */
              <div className="w-full h-full relative">
                <svg viewBox="0 0 1200 600" className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1a1a1a" strokeWidth="1"/>
                    </pattern>
                    <radialGradient id="earthGrad" cx="0.3" cy="0.3">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="70%" stopColor="#1e40af" />
                      <stop offset="100%" stopColor="#0c1844" />
                    </radialGradient>
                  </defs>
                  
                  {/* Background grid */}
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Continents */}
                  <g fill="#111111" stroke="#333333" strokeWidth="1">
                    {/* North America */}
                    <path d="M 140 90 L 380 90 L 420 270 L 100 290 Z" />
                    {/* Europe */}
                    <path d="M 540 70 L 700 70 L 720 210 L 500 230 Z" />
                    {/* Asia */}
                    <path d="M 700 50 L 1020 50 L 1050 270 L 720 290 Z" />
                    {/* Africa */}
                    <path d="M 550 210 L 740 210 L 700 450 L 600 470 Z" />
                    {/* South America */}
                    <path d="M 300 270 L 460 270 L 420 510 L 340 530 Z" />
                    {/* Australia */}
                    <path d="M 860 390 L 1020 390 L 1050 470 L 900 480 Z" />
                  </g>
                  
                  {/* Central Earth Globe */}
                  <g transform="translate(600, 300)">
                    <circle r="80" fill="url(#earthGrad)" stroke="#4ade80" strokeWidth="2" opacity="0.9">
                      <animateTransform attributeName="transform" type="rotate" values="0;360" dur="20s" repeatCount="indefinite"/>
                    </circle>
                    
                    {/* Continents on globe */}
                    <g fill="#15803d" opacity="0.7">
                      <ellipse cx="-20" cy="-30" rx="25" ry="15" transform="rotate(-20)"/>
                      <ellipse cx="30" cy="-10" rx="30" ry="20" transform="rotate(10)"/>
                      <ellipse cx="-10" cy="20" rx="20" ry="25" transform="rotate(30)"/>
                      <ellipse cx="25" cy="35" rx="15" ry="10" transform="rotate(-15)"/>
                    </g>
                    
                    {/* Atmospheric glow */}
                    <circle r="85" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.6">
                      <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/>
                    </circle>
                  </g>
                  
                  {/* Orbital Paths */}
                  {Object.entries(satellites).map(([satId, sat], index) => {
                    const isSelected = satId === selectedSatellite
                    const centerX = 600
                    const centerY = 300
                    const radiusX = 150 + (index * 40)
                    const radiusY = 100 + (index * 25)
                    const rotation = index * 30
                    
                    // Satellite position
                    const angle = (time * 2 + index * 90) * Math.PI / 180
                    const satX = centerX + radiusX * Math.cos(angle) * Math.cos(rotation * Math.PI / 180)
                    const satY = centerY + radiusY * Math.sin(angle)
                    
                    return (
                      <g key={satId}>
                        {/* Orbital ellipse */}
                        <ellipse
                          cx={centerX}
                          cy={centerY}
                          rx={radiusX}
                          ry={radiusY}
                          fill="none"
                          stroke={isSelected ? "#a855f7" : "#4c1d95"}
                          strokeWidth={isSelected ? 2 : 1}
                          strokeDasharray={isSelected ? "none" : "5,3"}
                          opacity={isSelected ? 1 : 0.6}
                          transform={`rotate(${rotation} ${centerX} ${centerY})`}
                        />
                        
                        {/* Satellite */}
                        <g transform={`rotate(${rotation} ${centerX} ${centerY})`}>
                          <circle
                            cx={centerX + radiusX * Math.cos(angle)}
                            cy={centerY + radiusY * Math.sin(angle)}
                            r={isSelected ? 6 : 4}
                            fill={sat.status === "active" ? "#10b981" : "#ef4444"}
                            stroke={isSelected ? "#a855f7" : "white"}
                            strokeWidth={isSelected ? 2 : 1}
                          >
                            {isSelected && (
                              <animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite" />
                            )}
                          </circle>
                          
                          {/* Satellite label */}
                          <text
                            x={centerX + radiusX * Math.cos(angle) + 10}
                            y={centerY + radiusY * Math.sin(angle) - 8}
                            fill="white"
                            fontSize="12"
                            fontFamily="monospace"
                            fontWeight={isSelected ? "bold" : "normal"}
                          >
                            {satId}
                          </text>
                        </g>
                      </g>
                    )
                  })}
                </svg>
              </div>
            ) : (
              /* 3D View - CSS Based */
              <div className="w-full h-full relative bg-gradient-to-b from-black via-purple-950 to-black flex items-center justify-center">
                {/* 3D Earth */}
                <div className="relative">
                  <div 
                    className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-blue-800 relative overflow-hidden shadow-2xl border-4 border-blue-400/30"
                    style={{
                      boxShadow: "0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3)",
                      animation: "rotate 30s linear infinite"
                    }}
                  >
                    {/* Continents */}
                    <div className="absolute inset-0">
                      <div className="absolute top-8 left-8 w-12 h-8 bg-green-700 rounded-full opacity-80"></div>
                      <div className="absolute top-6 right-6 w-16 h-10 bg-green-600 rounded-lg opacity-80"></div>
                      <div className="absolute bottom-12 left-12 w-8 h-12 bg-green-700 rounded-full opacity-80"></div>
                      <div className="absolute bottom-8 right-10 w-6 h-4 bg-green-600 rounded-full opacity-80"></div>
                    </div>
                    
                    {/* Atmosphere */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-blue-200/20 to-transparent"></div>
                  </div>
                  
                  {/* Orbital Rings */}
                  {Object.entries(satellites).map(([satId, sat], index) => {
                    const isSelected = satId === selectedSatellite
                    const radius = 120 + (index * 30)
                    const angle = (time * 3 + index * 90) * Math.PI / 180
                    const satX = radius * Math.cos(angle)
                    const satY = radius * Math.sin(angle) * 0.3 // Perspective effect
                    
                    return (
                      <div key={satId}>
                        {/* Ring */}
                        <div 
                          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                            isSelected ? 'border-purple-500' : 'border-gray-600'
                          }`}
                          style={{
                            width: `${radius * 2}px`,
                            height: `${radius * 0.6}px`, // Elliptical perspective
                            opacity: isSelected ? 0.8 : 0.4
                          }}
                        ></div>
                        
                        {/* Satellite */}
                        <div
                          className={`absolute w-3 h-3 rounded-full ${
                            sat.status === "active" ? "bg-green-400" : "bg-red-400"
                          } ${isSelected ? "ring-2 ring-purple-500" : ""}`}
                          style={{
                            left: `calc(50% + ${satX}px)`,
                            top: `calc(50% + ${satY}px)`,
                            transform: "translate(-50%, -50%)",
                            boxShadow: isSelected ? "0 0 12px rgba(168, 85, 247, 0.8)" : "none"
                          }}
                        >
                          {/* Label */}
                          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-xs font-mono whitespace-nowrap">
                            {satId}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* 3D Info */}
                <div className="absolute top-4 left-4 bg-black/90 border border-gray-600 p-3 text-white font-mono text-xs">
                  <div className="text-purple-400 mb-2">3D ORBITAL VIEW</div>
                  <div>• Perspective projection</div>
                  <div>• Real-time tracking</div>
                  <div>• Orbital mechanics</div>
                </div>
              </div>
            )}

            {/* Target Info Overlay */}
            {satellite && (
              <div className="absolute top-4 left-4 bg-black/90 border border-gray-600 p-3 font-mono text-sm">
                <div className="text-purple-400 mb-2">TARGET: {satellite.id}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>LAT: {satellite.coordinates.latitude.toFixed(4)}°</div>
                  <div>LNG: {satellite.coordinates.longitude.toFixed(4)}°</div>
                  <div>ALT: {satellite.coordinates.altitude} km</div>
                  <div>VEL: {satellite.orbital.velocity} km/s</div>
                  <div>AZ: {satellite.orbital.azimuth}°</div>
                  <div>EL: {satellite.orbital.elevation}°</div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text
