"use client"

import { useEffect, useState } from "react"
import { satellites } from "@/lib/satellite-data"

interface TechnicalReadoutsProps {
  satellite: string
}

export function TechnicalReadouts({ satellite }: TechnicalReadoutsProps) {
  const [liveData, setLiveData] = useState({
    signalStrength: 0,
    doppler: 0,
    batteryLevel: 0,
    temperature: 0
  })

  useEffect(() => {
    // Simulate live data updates
    const interval = setInterval(() => {
      setLiveData({
        signalStrength: Math.random() * 100,
        doppler: (Math.random() - 0.5) * 20,
        batteryLevel: 70 + Math.random() * 30,
        temperature: -10 + Math.random() * 40
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [satellite])

  const sat = satellites[satellite]
  if (!sat) return null

  return (
    <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-purple-400">Technical Readouts</h3>

      {/* Live Telemetry */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Live Telemetry</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Signal Strength:</span>
            <span className="text-green-400 font-mono">{liveData.signalStrength.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Doppler Shift:</span>
            <span className="text-blue-400 font-mono">{liveData.doppler.toFixed(2)} kHz</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Battery Level:</span>
            <span className="text-yellow-400 font-mono">{liveData.batteryLevel.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Temperature:</span>
            <span className="text-red-400 font-mono">{liveData.temperature.toFixed(1)}°C</span>
          </div>
        </div>
      </div>

      {/* Satellite Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Satellite Details</h4>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Organization:</span>
            <div className="text-white">{sat.organization}</div>
          </div>
          <div>
            <span className="text-gray-400">Purpose:</span>
            <div className="text-white">{sat.purpose}</div>
          </div>
          <div>
            <span className="text-gray-400">Altitude:</span>
            <div className="text-white font-mono">{sat.coordinates.altitude} km</div>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-black/50 border border-green-500/30 rounded p-2 text-center">
          <div className="text-green-400 font-semibold">TLM</div>
          <div className="text-white">GOOD</div>
        </div>
        <div className="bg-black/50 border border-blue-500/30 rounded p-2 text-center">
          <div className="text-blue-400 font-semibold">CMD</div>
          <div className="text-white">READY</div>
        </div>
      </div>
    </div>
  )
}
