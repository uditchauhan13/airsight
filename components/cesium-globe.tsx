"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as Cesium from "cesium"
import { satellites } from "@/lib/satellite-data"

// Serve Cesium static assets from public/Cesium
Cesium.buildModuleUrl.setBaseUrl("/Cesium/")

interface CesiumGlobeProps {
  selectedSatellite: string
  onSatelliteSelect: (satelliteId: string) => void
}

export function CesiumGlobe({ selectedSatellite, onSatelliteSelect }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer>()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addSatellites = useCallback((viewer: Cesium.Viewer) => {
    viewer.entities.removeAll()
    Object.entries(satellites).forEach(([id, sat]) => {
      const isSel = id === selectedSatellite
      viewer.entities.add({
        id,
        position: Cesium.Cartesian3.fromDegrees(
          sat.coordinates.longitude,
          sat.coordinates.latitude,
          sat.coordinates.altitude * 1000
        ),
        point: {
          pixelSize: isSel ? 15 : 8,
          color: sat.status === "active" ? Cesium.Color.LIME : Cesium.Color.RED,
          outlineColor: isSel ? Cesium.Color.PURPLE : Cesium.Color.WHITE,
          outlineWidth: 2
        },
        label: {
          text: `${id}\n${sat.coordinates.altitude}km`,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          scale: isSel ? 1.2 : 1.0,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM
        }
      })
    })
  }, [selectedSatellite])

  useEffect(() => {
    if (!containerRef.current) {
      setError("Container not found")
      return
    }
    let viewer: Cesium.Viewer
    try {
      viewer = new Cesium.Viewer(containerRef.current, {
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
      // Remove default imagery, add OpenStreetMap
      viewer.imageryLayers.removeAll()
      viewer.imageryLayers.addImageryProvider(
        new Cesium.TileMapServiceImageryProvider({
          url: "https://a.tile.openstreetmap.org/"
        })
      )
      // Use ellipsoid terrain
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 1e7)
      })

      viewer.selectedEntityChanged.addEventListener(() => {
        const sel = viewer.selectedEntity
        if (sel?.id && satellites[sel.id]) {
          onSatelliteSelect(sel.id)
        }
      })

      viewerRef.current = viewer
      setReady(true)
    } catch (e: any) {
      console.error("Cesium init failed", e)
      setError(e.message)
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) viewer.destroy()
    }
  }, [onSatelliteSelect, addSatellites])

  useEffect(() => {
    if (ready && viewerRef.current) {
      addSatellites(viewerRef.current)
    }
  }, [ready, selectedSatellite, addSatellites])

  if (error) {
    return <div className="text-red-400">Cesium Error: {error}</div>
  }
  if (!ready) {
    return <div>Loading 3D Globe...</div>
  }
  return <div ref={containerRef} className="w-full h-full" />
}
