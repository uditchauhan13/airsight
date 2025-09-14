"use client"

import { useRef, useEffect } from "react"
import { satellites } from "@/lib/satellite-data"

interface TrajectoryViewerProps {
  selectedSatellite: string
}

export function TrajectoryViewer({ selectedSatellite }: TrajectoryViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    let rotation = 0

    const animate = () => {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, width, height)

      // Draw 3D-style Earth
      const centerX = width / 2
      const centerY = height / 2
      const radius = 120

      // Earth sphere
      const gradient = ctx.createRadialGradient(
        centerX - 30, centerY - 30, 0,
        centerX, centerY, radius
      )
      gradient.addColorStop(0, "#4ade80")
      gradient.addColorStop(0.7, "#1e40af")
      gradient.addColorStop(1, "#0c1844")

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fillStyle = gradient
      ctx.fill()

      // Orbital rings
      Object.entries(satellites).forEach(([satId, sat], index) => {
        const isSelected = satId === selectedSatellite
        const ringRadius = radius + 40 + (index * 25)
        
        ctx.strokeStyle = isSelected ? "#a855f7" : "#374151"
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.beginPath()
        ctx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI)
        ctx.stroke()

        // Satellite on ring
        const angle = rotation + (index * Math.PI / 2)
        const satX = centerX + ringRadius * Math.cos(angle)
        const satY = centerY + ringRadius * Math.sin(angle)

        ctx.beginPath()
        ctx.arc(satX, satY, isSelected ? 5 : 3, 0, 2 * Math.PI)
        ctx.fillStyle = sat.status === "active" ? "#10b981" : "#ef4444"
        ctx.fill()

        if (isSelected) {
          ctx.strokeStyle = "#a855f7"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Label
        ctx.fillStyle = "#ffffff"
        ctx.font = "10px monospace"
        ctx.fillText(satId, satX + 8, satY - 6)
      })

      rotation += 0.01
      requestAnimationFrame(animate)
    }

    animate()
  }, [selectedSatellite])

  const satellite = satellites[selectedSatellite]

  return (
    <div className="w-full h-full bg-black relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full"
      />
      
      {/* 3D Controls */}
      <div className="absolute top-4 left-4 bg-black/90 border border-gray-600 p-3 text-white font-mono text-xs">
        <div className="text-purple-400 mb-2">3D ORBITAL VIEW</div>
        <div>• Auto-rotating perspective</div>
        <div>• Real-time positioning</div>
      </div>

      {/* Satellite Info */}
      {satellite && (
        <div className="absolute bottom-4 left-4 bg-black/90 border border-gray-600 p-3 text-white font-mono text-xs">
          <div className="text-purple-400">{satellite.name}</div>
          <div>ALT: {satellite.coordinates.altitude} km</div>
          <div>VEL: {satellite.orbital.velocity} km/s</div>
        </div>
      )}
    </div>
  )
}
