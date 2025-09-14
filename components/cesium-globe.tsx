"use client"

import { useEffect, useRef, useState } from "react"
import { satellites } from "@/lib/satellite-data"

interface CesiumGlobeProps {
  selectedSatellite: string
  onSatelliteSelect: (satelliteId: string) => void
}

export function CesiumGlobe({ selectedSatellite, onSatelliteSelect }: CesiumGlobeProps) {
  const cesiumContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let viewer: any = null

    const initCesium = async () => {
      try {
        // Import Cesium dynamically
        const Cesium = await import('cesium')
        
        if (!cesiumContainerRef.current) return

        // Create viewer
        viewer = new Cesium.Viewer(cesiumContainerRef.current, {
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
          infoBox: false
        })

        viewerRef.current = viewer

        // Set camera to India
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 10000000)
        })

        // Add satellites
        Object.entries(satellites).forEach(([satId, satellite]) => {
          const isSelected = satId === selectedSatellite
          
          viewer.entities.add({
            id: satId,
            position: Cesium.Cartesian3.fromDegrees(
              satellite.coordinates.longitude,
              satellite.coordinates.latitude,
              satellite.coordinates.altitude * 1000
            ),
            point: {
              pixelSize: isSelected ? 15 : 10,
              color: satellite.status === "active" ? Cesium.Color.LIME : Cesium.Color.RED,
              outlineColor: isSelected ? Cesium.Color.PURPLE : Cesium.Color.WHITE,
              outlineWidth: 2
            },
            label: {
              text: `${satId}\n${satellite.coordinates.altitude}km`,
              font: '12pt monospace',
              fillColor: isSelected ? Cesium.Color.PURPLE : Cesium.Color.WHITE,
              pixelOffset: new Cesium.Cartesian2(0, -40),
              scale: isSelected ? 1.2 : 1.0
            }
          })

          if (isSelected) {
            // Add orbital path
            const positions = []
            for (let i = 0; i <= 100; i++) {
              const angle = (i / 100) * 2 * Math.PI
              const lat = satellite.coordinates.latitude + Math.sin(angle) * 8
              const lng = satellite.coordinates.longitude + Math.cos(angle) * 12
              positions.push(Cesium.Cartesian3.fromDegrees(lng, lat, satellite.coordinates.altitude * 1000))
            }

            viewer.entities.add({
              polyline: {
                positions: positions,
                width: 3,
                material: Cesium.Color.PURPLE.withAlpha(0.8)
              }
            })
          }
        })

        // Handle clicks
        viewer.selectedEntityChanged.addEventListener(() => {
          const selected = viewer.selectedEntity
          if (selected && selected.id && satellites[selected.id]) {
            onSatelliteSelect(selected.id)
          }
        })

        setIsLoaded(true)
      } catch (error) {
        console.error('Cesium failed to load:', error)
      }
    }

    initCesium()

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
      }
    }
  }, [selectedSatellite, onSatelliteSelect])

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

  return <div ref={cesiumContainerRef} className="w-full h-full" />
}
