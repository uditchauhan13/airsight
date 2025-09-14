"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { satellites } from "@/lib/satellite-data"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"

// Fixed dynamic import - extract named export correctly
const CesiumGlobe = dynamic(
  () => import('./cesium-globe').then(mod => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-white font-mono text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-xl text-purple-300 mb-2">CESIUM EARTH ENGINE</div>
          <div className="text-sm text-gray-400">Loading Professional 3D Globe...</div>
        </div>
      </div>
    )
  }
)

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("3d")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const satellite = satellites[selectedSatellite]

  if (!isClient) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white font-mono text-center">
          <div className="animate-pulse text-purple-400 text-xl mb-4">AIRSIGHT MISSION CONTROL</div>
          <div>Initializing 3D Earth Systems...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-white flex">
      {/* Main Globe View */}
      <div className="flex-1 flex flex-col">
        {/* Professional Header */}
        <div className="h-16 bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 border-b border-purple-500/50 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <h1 className="text-xl font-mono tracking-wider text-purple-300 font-bold">
              AIRSIGHT CESIUM ORBITAL TRACKING
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-xs font-mono text-blue-300">CESIUM ENGINE</span>
            </div>
            <div className="text-sm font-mono text-green-400 bg-green-400/10 px-3 py-1 rounded">
              OPERATIONAL
            </div>
            <div className="text-sm font-mono text-gray-300">
              {new Date().toISOString().slice(0, 19)}Z
            </div>
          </div>
        </div>

        {/* Cesium Globe Container */}
        <div className="flex-1 relative">
          <CesiumGlobe 
            selectedSatellite={selectedSatellite}
            onSatelliteSelect={setSelectedSatellite}
          />

          {/* Professional Overlays */}
          {satellite && (
            <div className="absolute top-6 left-6 bg-black/95 backdrop-blur border border-purple-500/70 rounded-lg p-4 font-mono text-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  satellite.status === "active" ? "bg-green-400 animate-pulse" : 
                  satellite.status === "maintenance" ? "bg-yellow-400 animate-pulse" : "bg-red-400"
                }`}></div>
                <div className="text-purple-300 font-bold tracking-wider">
                  {satellite.name} ({satellite.id})
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-gray-400">LATITUDE:</span>
                  <div className="text-green-300 font-mono text-sm">{satellite.coordinates.latitude.toFixed(6)}°</div>
                </div>
                <div>
                  <span className="text-gray-400">LONGITUDE:</span>
                  <div className="text-green-300 font-mono text-sm">{satellite.coordinates.longitude.toFixed(6)}°</div>
                </div>
                <div>
                  <span className="text-gray-400">ALTITUDE:</span>
                  <div className="text-blue-300 font-mono text-sm">{satellite.coordinates.altitude} km</div>
                </div>
                <div>
                  <span className="text-gray-400">VELOCITY:</span>
                  <div className="text-yellow-300 font-mono text-sm">{satellite.orbital.velocity} km/s</div>
                </div>
                <div>
                  <span className="text-gray-400">AZIMUTH:</span>
                  <div className="text-purple-300 font-mono text-sm">{satellite.orbital.azimuth}°</div>
                </div>
                <div>
                  <span className="text-gray-400">ELEVATION:</span>
                  <div className="text-purple-300 font-mono text-sm">{satellite.orbital.elevation}°</div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-purple-500/30">
                <div className="text-gray-400 text-xs">ORGANIZATION:</div>
                <div className="text-white text-sm">{satellite.organization}</div>
                <div className="text-gray-400 text-xs mt-2">PURPOSE:</div>
                <div className="text-gray-200 text-xs">{satellite.purpose}</div>
              </div>
            </div>
          )}

          {/* Cesium Controls Info */}
          <div className="absolute top-6 right-6 bg-black/95 backdrop-blur border border-purple-500/70 rounded-lg p-4 font-mono text-xs shadow-2xl">
            <div className="text-purple-300 font-bold mb-3 tracking-wider">CESIUM CONTROLS</div>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>LEFT CLICK + DRAG: Rotate Globe</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>RIGHT CLICK + DRAG: Pan View</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>SCROLL: Zoom In/Out</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>CLICK SATELLITE: Select</span>
              </div>
            </div>
          </div>

          {/* Professional Status Bar */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-black/95 backdrop-blur border border-purple-500/70 rounded-lg p-4 font-mono text-sm flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300">REAL EARTH IMAGERY</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-blue-300">CESIUM TERRAIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-purple-300">ORBITAL TRACKING</span>
                </div>
              </div>
              
              <div className="text-gray-300 text-xs">
                TRACKING {Object.keys(satellites).length} SATELLITES | CESIUM v1.111
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Control Panel */}
      <div className="w-96 bg-gradient-to-b from-gray-900 via-gray-800 to-black border-l border-purple-500/50 flex flex-col shadow-2xl">
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
  )
}
