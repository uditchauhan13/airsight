"use client"

import { useState } from "react"
import { OrbitalMap } from "./satellite-tracking/orbital-map"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"
import { TrajectoryViewer } from "./satellite-tracking/trajectory-viewer"

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("map")

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-400">
          AirSight Mission Control
        </h1>
        
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          {/* Main Orbital View */}
          <div className="col-span-8 bg-gray-900/50 border border-purple-500/30 rounded-lg overflow-hidden">
            {viewMode === "map" ? (
              <OrbitalMap selectedSatellite={selectedSatellite} />
            ) : (
              <TrajectoryViewer selectedSatellite={selectedSatellite} />
            )}
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
