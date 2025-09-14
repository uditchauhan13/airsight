"use client"

import { useEffect, useRef, useState } from "react"
import { satellites } from "@/lib/satellite-data"

interface CesiumGlobeProps {
  selectedSatellite: string
  onSatelliteSelect: (satelliteId: string) => void
}

declare global {
  interface Window {
    Cesium: any
  }
}

export function CesiumGlobe({ selectedSatellite, onSatelliteSelect }: CesiumGlobeProps) {
  const cesiumContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCesium = async () => {
      try {
        if (window.Cesium) {
          initializeCesium()
          return
        }

        // Load Cesium CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://cesium.com/downloads/cesiumjs/releases/1.111/Build/Cesium/Widgets/widgets.css'
        document.head.appendChild(cssLink)

        // Load Cesium JS
        const script = document.createElement('script')
        script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.111/Build/Cesium/Cesium.js'
        script.onload = () => {
          initializeCesium()
        }
        script.onerror = () => {
          setError('Failed to load Cesium')
        }
        document.head.appendChild(script)
      } catch (err) {
        setError('Error initializing Cesium')
      }
    }

    const initializeCesium = () => {
      if (!cesiumContainerRef.current || !window.Cesium) return

      try {
        // Set Cesium Ion access token
        window.Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk'

        // Create Cesium viewer
        const viewer = new window.Cesium.Viewer(cesiumContainerRef.current, {
          timeline: false,
          animation: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          baseLayerPicker: false,
          geocoder: false,
          fullscreenButton: false,
          vrButton: false,
          selectionIndicator: false,
          infoBox: false,
          creditContainer: 'cesium-credit-container'
        })

        // Try to set terrain (with fallback)
        try {
          viewer.terrainProvider = window.Cesium.createWorldTerrainAsync()
        } catch (terrainError) {
          console.log('Terrain loading fallback - using basic terrain')
        }

        viewerRef.current = viewer

        // Set initial camera position (focus on India)
        viewer.camera.setView({
          destination: window.Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 15000000)
        })

        // Add satellites
        addSatellites(viewer)

        setIsLoaded(true)
      } catch (err) {
        console.error('Cesium initialization error:', err)
        setError('Failed to initialize Cesium viewer')
      }
    }

    loadCesium()

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
    }
  }, [])

  const addSatellites = (viewer: any) => {
    Object.entries(satellites).forEach(([satId, satellite]) => {
      const isSelected = satId === selectedSatellite
      
      // Create satellite entity
      const entity = viewer.entities.add({
        id: satId,
        position: window.Cesium.Cartesian3.fromDegrees(
          satellite.coordinates.longitude,
          satellite.coordinates.latitude,
          satellite.coordinates.altitude * 1000 // Convert km to meters
        ),
        point: {
          pixelSize: isSelected ? 15 : 10,
          color: satellite.status === "active" ? window.Cesium.Color.LIME : 
                 satellite.status === "maintenance" ? window.Cesium.Color.YELLOW : 
                 window.Cesium.Color.RED,
          outlineColor: isSelected ? window.Cesium.Color.PURPLE : window.Cesium.Color.WHITE,
          outlineWidth: isSelected ? 3 : 2
        },
        label: {
          text: `${satId}\n${satellite.coordinates.altitude}km`,
          font: '12pt monospace',
          fillColor: isSelected ? window.Cesium.Color.PURPLE : window.Cesium.Color.WHITE,
          outlineColor: window.Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new window.Cesium.Cartesian2(0, -40),
          scale: isSelected ? 1.2 : 1.0
        }
      })

      // Add orbital path for selected satellite
      if (isSelected) {
        const positions = []
        for (let i = 0; i <= 100; i++) {
          const angle = (i / 100) * 2 * Math.PI
          const radius = satellite.coordinates.altitude * 1000
          const lat = satellite.coordinates.latitude + Math.sin(angle) * 8
          const lng = satellite.coordinates.longitude + Math.cos(angle) * 12
          positions.push(window.Cesium.Cartesian3.fromDegrees(lng, lat, radius))
        }

        viewer.entities.add({
          id: `${satId}-orbit`,
          polyline: {
            positions: positions,
            width: 3,
            material: window.Cesium.Color.PURPLE.withAlpha(0.8)
          }
        })
      }
    })

    // Handle satellite clicks
    viewer.selectedEntityChanged.addEventListener(() => {
      const selected = viewer.selectedEntity
      if (selected && selected.id && satellites[selected.id]) {
        onSatelliteSelect(selected.id)
      }
    })
  }

  // Update satellites when selection changes
  useEffect(() => {
    if (viewerRef.current && isLoaded) {
      viewerRef.current.entities.removeAll()
      addSatellites(viewerRef.current)
    }
  }, [selectedSatellite, isLoaded])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center font-mono">
          <div className="text-red-400 text-xl mb-4">⚠ Cesium Load Error</div>
          <div className="text-gray-400">{error}</div>
          <div className="text-sm text-gray-500 mt-2">
            Check network connection and try refreshing
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center font-mono">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-xl text-purple-300 mb-2">CESIUM EARTH ENGINE</div>
          <div className="text-sm text-gray-400">Loading Professional 3D Globe...</div>
          <div className="text-xs text-gray-500 mt-2">Initializing Terrain & Satellite Data</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <div ref={cesiumContainerRef} className="w-full h-full" />
      <div id="cesium-credit-container" className="absolute bottom-0 left-0 text-xs opacity-30 pointer-events-none" />
    </div>
  )
}
