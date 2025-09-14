"use client"

import { useState, useEffect, useRef } from "react"
import { satellites } from "@/lib/satellite-data"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"
import { Button } from "@/components/ui/button"

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("map")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const satellite = satellites[selectedSatellite]

  // Professional orbital map rendering
  useEffect(() => {
    if (viewMode !== "map") return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, width, height)

      // Draw world map - professional style
      drawWorldMap(ctx, width, height)
      
      // Draw grid system
      drawGridSystem(ctx, width, height)
      
      // Draw orbital paths
      drawOrbitalPaths(ctx, width, height, selectedSatellite)
      
      // Draw satellites
      drawSatellites(ctx, width, height, selectedSatellite)
      
      requestAnimationFrame(animate)
    }
    
    animate()
  }, [viewMode, selectedSatellite])

  const drawWorldMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#1a1a1a"
    ctx.lineWidth = 1
    ctx.fillStyle = "#0f0f0f"

    // Continents - realistic outlines
    const continents = [
      // North America
      [[0.12, 0.15], [0.32, 0.15], [0.35, 0.45], [0.08, 0.48], [0.12, 0.15]],
      // Europe
      [[0.45, 0.12], [0.58, 0.12], [0.60, 0.35], [0.42, 0.38], [0.45, 0.12]],
      // Asia
      [[0.58, 0.08], [0.85, 0.08], [0.88, 0.45], [0.60, 0.48], [0.58, 0.08]],
      // Africa
      [[0.46, 0.35], [0.62, 0.35], [0.58, 0.75], [0.50, 0.78], [0.46, 0.35]],
      // South America
      [[0.25, 0.45], [0.38, 0.45], [0.35, 0.85], [0.28, 0.88], [0.25, 0.45]],
      // Australia
      [[0.72, 0.65], [0.85, 0.65], [0.88, 0.78], [0.75, 0.80], [0.72, 0.65]]
    ]

    continents.forEach(continent => {
      ctx.beginPath()
      continent.forEach(([x, y], i) => {
        const pixelX = x * width
        const pixelY = y * height
        if (i === 0) ctx.moveTo(pixelX, pixelY)
        else ctx.lineTo(pixelX, pixelY)
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    })
  }

  const drawGridSystem = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#1a1a1a"
    ctx.lineWidth = 0.5
    
    // Latitude lines
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Longitude lines
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  }

  const drawOrbitalPaths = (ctx: CanvasRenderingContext2D, width: number, height: number, selected: string) => {
    Object.entries(satellites).forEach(([satId, sat]) => {
      const isSelected = satId === selected
      
      ctx.strokeStyle = isSelected ? "#a855f7" : "#4c1d95"
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.setLineDash(isSelected ? [] : [5, 3])
      
      // Draw realistic orbital ellipse
      const centerX = width / 2
      const centerY = height / 2
      const radiusX = width * 0.3 + (Object.keys(satellites).indexOf(satId) * 30)
      const radiusY = height * 0.2 + (Object.keys(satellites).indexOf(satId) * 20)
      
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([])
    })
  }

  const drawSatellites = (ctx: CanvasRenderingContext2D, width: number, height: number, selected: string) => {
    Object.entries(satellites).forEach(([satId, sat]) => {
      const isSelected = satId === selected
      
      // Calculate satellite position
      const time = Date.now() * 0.001
      const index = Object.keys(satellites).indexOf(satId)
      const centerX = width / 2
      const centerY = height / 2
      const radiusX = width * 0.3 + (index * 30)
      const radiusY = height * 0.2 + (index * 20)
      
      const x = centerX + radiusX * Math.cos(time * 0.5 + index * Math.PI / 2)
      const y = centerY + radiusY * Math.sin(time * 0.5 + index * Math.PI / 2)
      
      // Satellite dot
      ctx.beginPath()
      ctx.arc(x, y, isSelected ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = sat.status === "active" ? "#10b981" : "#ef4444"
      ctx.fill()
      
      if (isSelected) {
        ctx.strokeStyle = "#a855f7"
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // Label
      ctx.fillStyle = "#ffffff"
      ctx.font = isSelected ? "bold 11px monospace" : "10px monospace"
      ctx.fillText(satId, x + 8, y - 6)
    })
  }

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
          <div className="flex-1 relative bg-black">
            {viewMode === "map" ? (
              <canvas
                ref={canvasRef}
                width={1200}
                height={600}
                className="w-full h-full"
                style={{ backgroundColor: "#0a0a0a" }}
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">🛰️</div>
                  <div className="font-mono">3D VIEW LOADING...</div>
                  <div className="mt-2 text-sm">WebGL Initialization Required</div>
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
                  <div className="text-gray-400">STATUS:</div>
                  <div className={`${satellite.status === "active" ? "text-green-400" : "text-red-400"}`}>
                    {satellite.status.toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "map" ? "default" : "outline"}
                onClick={() => setViewMode("map")}
                className="font-mono text-xs"
              >
                MAP
              </Button>
              <Button
                size="sm"
                variant={viewMode === "3d" ? "default" : "outline"}
                onClick={() => setViewMode("3d")}
                className="font-mono text-xs"
              >
                3D
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
          <SatelliteControlPanel 
            selectedSatellite={selectedSatellite}
            onSatelliteChange={setSelectedSatellite}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <div className="flex-1 overflow-y-auto">
            <TechnicalReadouts satellite={selectedSatellite} />
          </div>
        </div>
      </div>
    </div>
  )
}
