"use client"

import { useEffect, useRef, useState, useCallback } from "react"
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

  const addSatellites = useCallback((viewer: any) => {
    if (!viewer || !satellites) return

    viewer.entities.removeAll()

    Object.entries(satellites).forEach(([satId, satellite]) => {
      const isSelected = satId === selectedSatellite
      
      viewer.entities.add({
        id: satId,
        position: window.Cesium.Cartesian3.fromDegrees(
          satellite.coordinates.longitude,
          satellite.coordinates.latitude,
          satellite.coordinates.altitude * 1000
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
  }, [selectedSatellite])

  const initializeCesium = useCallback(() => {
    if (!cesiumContainerRef.current || !window.Cesium) {
      console.error('Cesium container or Cesium library not available')
      return
    }

    try {
      console.log('Initializing Cesium viewer...')
      
      // Use default Cesium imagery without Ion token
      window.Cesium.Ion.defaultAccessToken = undefined

      const viewer = new window.Cesium.Viewer(cesiumContainerRef.current, {
        // Use OpenStreetMap instead of Cesium Ion imagery
        imageryProvider: new window.Cesium.OpenStreetMapImageryProvider({
          url: 'https://a.tile.openstreetmap.org/'
        }),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        vrButton: false,
        selectionIndicator: false,
        infoBox: false,
        creditContainer: 'cesium-credit-container'
      })

      // Remove default terrain to avoid Ion dependency
      viewer.terrainProvider = new window.Cesium.EllipsoidTerrainProvider()

      viewerRef.current = viewer

      // Set camera to India
      viewer.camera.setView({
        destination: window.Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 10000000)
      })

      // Handle satellite selection
      viewer.selectedEntityChanged.addEventListener(() => {
        const selected = viewer.selectedEntity
        if (selected && selected.id && satellites[selected.id]) {
          onSatelliteSelect(selected.id)
        }
      })

      addSatellites(viewer)
      setIsLoaded(true)
      console.log('Cesium initialized successfully!')

    } catch (err) {
      console.error('Cesium initialization failed:', err)
      setError(`Cesium initialization failed: ${err}`)
    }
  }, [addSatellites, onSatelliteSelect])

  useEffect(() => {
    const loadCesium = async () => {
      try {
        // Check if already loaded
        if (window.Cesium) {
          console.log('Cesium already loaded')
          setTimeout(initializeCesium, 100)
          return
        }

        console.log('Loading Cesium from CDN...')

        // Load CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Widgets/widgets.css'
        document.head.appendChild(cssLink)

        // Load JS with promise
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Cesium.js'
          script.onload = () => {
            console.log('Cesium script loaded')
            resolve()
          }
          script.onerror = (e) => {
            console.error('Failed to load Cesium script:', e)
            reject(new Error('Failed to load Cesium'))
          }
          document.head.appendChild(script)
        })

        // Wait a bit for Cesium to initialize
        setTimeout(initializeCesium, 500)

      } catch (err) {
        console.error('Error loading Cesium:', err)
        setError(`Failed to load Cesium: ${err}`)
      }
    }

    loadCesium()

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy()
        } catch (e) {
          console.warn('Error destroying Cesium viewer:', e)
        }
      }
    }
  }, [initializeCesium])

  useEffect(() => {
    if (viewerRef.current && isLoaded) {
      addSatellites(viewerRef.current)
    }
  }, [selectedSatellite, isLoaded, addSatellites])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center font-mono max-w-md">
          <div className="text-red-400 text-xl mb-4">⚠ Cesium Load Error</div>
          <div className="text-gray-400 text-sm mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm"
          >
            Refresh Page
          </button>
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
          <div className="text-sm text-gray-400">Loading 3D Globe...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <div ref={cesiumContainerRef} className="w-full h-full" />
      <div id="cesium-credit-container" className="absolute bottom-0 left-0 text-xs opacity-50" />
    </div>
  )
}
