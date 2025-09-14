"use client"

import { useEffect, useRef, useState } from "react"
import { satellites, orbitalTrajectories } from "@/lib/satellite-data"

interface OrbitalMapProps {
  selectedSatellite: string
}

export function OrbitalMap({ selectedSatellite }: OrbitalMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw world map outline (simplified)
    drawWorldMap(ctx, canvas.width, canvas.height)

    // Draw orbital trajectories
    drawOrbitalTrajectories(ctx, canvas.width, canvas.height)

    // Draw satellites
    drawSatellites(ctx, canvas.width, canvas.height, selectedSatellite)

    // Draw selected satellite details
    drawSatelliteDetails(ctx, selectedSatellite)

  }, [selectedSatellite, currentTime])

  const drawWorldMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 1

    // Simple continent outlines
    const continents = [
      // North America
      [[0.15, 0.2], [0.35, 0.2], [0.35, 0.45], [0.15, 0.45]],
      // Europe/Asia
      [[0.4, 0.15], [0.85, 0.15], [0.85, 0.5], [0.4, 0.5]],
      // Africa
      [[0.42, 0.35], [0.58, 0.35], [0.58, 0.7], [0.42, 0.7]],
      // Australia
      [[0.7, 0.65], [0.85, 0.65], [0.85, 0.75], [0.7, 0.75]]
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
      ctx.stroke()
    })
  }

  const drawOrbitalTrajectories = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    Object.entries(orbitalTrajectories).forEach(([satId, trajectory]) => {
      const isSelected = satId === selectedSatellite
      
      ctx.strokeStyle = isSelected ? "#a855f7" : "#6b21a8"
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.setLineDash(isSelected ? [] : [5, 5])

      ctx.beginPath()
      trajectory.forEach((point, i) => {
        const x = ((point.lng + 180) / 360) * width
        const y = ((90 - point.lat) / 180) * height
        
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
    })
  }

  const drawSatellites = (ctx: CanvasRenderingContext2D, width: number, height: number, selected: string) => {
    Object.entries(satellites).forEach(([satId, satellite]) => {
      const x = ((satellite.coordinates.longitude + 180) / 360) * width
      const y = ((90 - satellite.coordinates.latitude) / 180) * height
      
      const isSelected = satId === selected
      const radius = isSelected ? 8 : 5
      
      // Satellite dot
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = satellite.status === "active" ? "#10b981" : 
                      satellite.status === "maintenance" ? "#f59e0b" : "#ef4444"
      ctx.fill()
      
      if (isSelected) {
        ctx.strokeStyle = "#a855f7"
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // Satellite label
      ctx.fillStyle = "#ffffff"
      ctx.font = isSelected ? "bold 12px sans-serif" : "10px sans-serif"
      ctx.fillText(satellite.id, x + 12, y - 8)
    })
  }

  const drawSatelliteDetails = (ctx: CanvasRenderingContext2D, selected: string) => {
    const satellite = satellites[selected]
    if (!satellite) return

    // Details panel
    const panelX = 20
    const panelY = 20
    const panelWidth = 300
    const panelHeight = 120

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight)
    ctx.strokeStyle = "#a855f7"
    ctx.lineWidth = 1
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight)

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 14px sans-serif"
    ctx.fillText(`${satellite.name} (${satellite.id})`, panelX + 10, panelY + 25)
    
    ctx.font = "12px sans-serif"
    ctx.fillStyle = "#a855f7"
    ctx.fillText(`Lat: ${satellite.coordinates.latitude.toFixed(4)}°`, panelX + 10, panelY + 45)
    ctx.fillText(`Lng: ${satellite.coordinates.longitude.toFixed(4)}°`, panelX + 10, panelY + 60)
    ctx.fillText(`Alt: ${satellite.coordinates.altitude} km`, panelX + 10, panelY + 75)
    ctx.fillText(`Status: ${satellite.status.toUpperCase()}`, panelX + 10, panelY + 95)
    ctx.fillText(`Vel: ${satellite.orbital.velocity} km/s`, panelX + 150, panelY + 45)
  }

  return (
    <div className="relative w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full object-contain"
      />
      
      <div className="absolute top-4 right-4 bg-black/80 border border-purple-500/50 rounded p-2">
        <div className="text-purple-400 text-sm font-mono">
          {currentTime.toISOString().slice(0, 19)}Z
        </div>
      </div>
    </div>
  )
}
