"use client"

import dynamic from "next/dynamic"

// Dynamically import the dashboard to avoid SSR issues with Cesium
const SatelliteTrackingDashboard = dynamic(
  () => import("@/components/satellite-tracking-dashboard").then(mod => ({ 
    default: mod.SatelliteTrackingDashboard 
  })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white font-mono">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-xl text-purple-300 mb-2">AIRSIGHT MISSION CONTROL</div>
          <div className="text-sm text-gray-400">Initializing Cesium Earth Engine...</div>
          <div className="text-xs text-gray-500 mt-2">Loading 3D Globe and Satellite Data</div>
        </div>
      </div>
    )
  }
)

export default function SatelliteTrackingPage() {
  return (
    <div className="h-screen bg-black overflow-hidden">
      <SatelliteTrackingDashboard />
    </div>
  )
}
