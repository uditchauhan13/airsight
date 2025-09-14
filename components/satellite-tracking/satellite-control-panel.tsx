"use client"

import { satellites } from "@/lib/satellite-data"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface SatelliteControlPanelProps {
  selectedSatellite: string
  onSatelliteChange: (satelliteId: string) => void
  viewMode: "map" | "3d"
  onViewModeChange: (mode: "map" | "3d") => void
}

export function SatelliteControlPanel({
  selectedSatellite,
  onSatelliteChange,
  viewMode,
  onViewModeChange
}: SatelliteControlPanelProps) {
  const satellite = satellites[selectedSatellite]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500"
      case "maintenance": return "bg-yellow-500"
      case "inactive": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  return (
    <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-purple-400">Mission Control</h3>
        <Badge className={`${getStatusColor(satellite?.status || "")} text-white`}>
          {satellite?.status?.toUpperCase()}
        </Badge>
      </div>

      {/* Satellite Selection */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300">Target Satellite</label>
        <Select value={selectedSatellite} onValueChange={onSatelliteChange}>
          <SelectTrigger className="bg-black border-purple-500/50 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black border-purple-500/50">
            {Object.entries(satellites).map(([id, sat]) => (
              <SelectItem key={id} value={id} className="text-white hover:bg-purple-500/20">
                {sat.name} ({id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300">View Mode</label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "map" ? "default" : "outline"}
            onClick={() => onViewModeChange("map")}
            className="flex-1"
          >
            Map View
          </Button>
          <Button
            size="sm"
            variant={viewMode === "3d" ? "default" : "outline"}
            onClick={() => onViewModeChange("3d")}
            className="flex-1"
          >
            3D View
          </Button>
        </div>
      </div>

      {/* Orbital Parameters */}
      {satellite && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-purple-400">Orbital Parameters</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Azimuth:</span>
              <div className="text-white font-mono">{satellite.orbital.azimuth}°</div>
            </div>
            <div>
              <span className="text-gray-400">Elevation:</span>
              <div className="text-white font-mono">{satellite.orbital.elevation}°</div>
            </div>
            <div>
              <span className="text-gray-400">Range:</span>
              <div className="text-white font-mono">{satellite.orbital.range} km</div>
            </div>
            <div>
              <span className="text-gray-400">Velocity:</span>
              <div className="text-white font-mono">{satellite.orbital.velocity} km/s</div>
            </div>
          </div>
        </div>
      )}

      {/* Frequency Data */}
      {satellite && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-purple-400">Communication</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Uplink:</span>
              <div className="text-white font-mono">{satellite.frequency.uplink}</div>
            </div>
            <div>
              <span className="text-gray-400">Downlink:</span>
              <div className="text-white font-mono">{satellite.frequency.downlink}</div>
            </div>
          </div>
        </div>
      )}

      {/* Control Actions */}
      <div className="space-y-2">
        <Button className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
          Engage Tracking
        </Button>
        <Button variant="outline" className="w-full border-purple-500/50 text-purple-400" size="sm">
          Download TLE Data
        </Button>
      </div>
    </div>
  )
}
