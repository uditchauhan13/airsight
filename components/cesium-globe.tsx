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
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // Add timeout for loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        setLoadingTimeout(true)
        setError('Cesium failed to load - using fallback visualization')
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoaded])

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
          outlineWidth: isSelected ? 3 : 2,
          heightReference: window.Cesium.HeightReference.NONE
        },
        label: {
          text: `${satId}\n${satellite.coordinates.altitude}km`,
          font: '12pt monospace',
          fillColor: isSelected ? window.Cesium.Color.PURPLE : window.Cesium.Color.WHITE,
          outlineColor: window.Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new window.Cesium.Cartesian2(0, -40),
          scale: isSelected ? 1.2 : 1.0,
          horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM
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
            material: window.Cesium.Color.PURPLE.withAlpha(0.8),
            clampToGround: false
          }
        })
      }
    })
  }, [selectedSatellite])

  const initializeCesium = useCallback(() => {
    if (!cesiumContainerRef.current || !window.Cesium) return

    try {
      // Updated Ion token (more recent)
      window.Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk'

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
        creditContainer: 'cesium-credit-container',
        terrainProvider: window.Cesium.createWorldTerrain ? window.Cesium.createWorldTerrain() : undefined
      })

      viewerRef.current = viewer

      viewer.camera.setView({
        destination: window.Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 15000000)
      })

      viewer.selectedEntityChanged.addEventListener(() => {
        const selected = viewer.selectedEntity
        if (selected && selected.id && satellites[selected.id]) {
          onSatelliteSelect(selected.id)
        }
      })

      addSatellites(viewer)
      setIsLoaded(true)
      console.log('Cesium initialized successfully')
    } catch (err) {
      console.error('Cesium initialization error:', err)
      setError('Failed to initialize Cesium viewer')
    }
  }, [addSatellites, onSatelliteSelect])

  useEffect(() => {
    const loadCesium = async () => {
      try {
        if (window.Cesium) {
          initializeCesium()
          return
        }

        console.log('Loading Cesium from CDN...')

        // Load CSS first
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://cesium.com/downloads/cesiumjs/releases/1.111/Build/Cesium/Widgets/widgets.css'
        cssLink.onload = () => console.log('Cesium CSS loaded')
        cssLink.onerror = () => console.error('Failed to load Cesium CSS')
        document.head.appendChild(cssLink)

        // Load JS
        const script = document.createElement('script')
        script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.111/Build/Cesium/Cesium.js'
        script.onload = () => {
          console.log('Cesium JS loaded successfully')
          setTimeout(initializeCesium, 100) // Small delay to ensure Cesium is ready
        }
        script.onerror = (e) => {
          console.error('Failed to load Cesium JS:', e)
          setError('Failed to load Cesium from CDN')
        }
        document.head.appendChild(script)
      } catch (err) {
        console.error('Error loading Cesium:', err)
        setError('Error initializing Cesium')
      }
    }

    loadCesium()

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
    }
  }, [initializeCesium])

  useEffect(() => {
    if (viewerRef.current && isLoaded) {
      addSatellites(viewerRef.current)
    }
  }, [selectedSatellite, isLoaded, addSatellites])

  // Fallback SVG visualization if Cesium fails
  if (error || loadingTimeout) {
    return (
      <div className="w-full h-full relative bg-gradient-to-br from-gray-900 via-black to-purple-900">
        {/* Fallback SVG Globe */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 800 800" className="w-full h-full max-w-md max-h-md">
            <defs>
              <radialGradient id="earthGrad" cx="0.3" cy="0.3">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="70%" stopColor="#1e40af" />
                <stop offset="100%" stopColor="#0c1844" />
              </radialGradient>
            </defs>
            
            {/* Earth */}
            <circle cx="400" cy="400" r="200" fill="url(#earthGrad)" stroke="#60a5fa" strokeWidth="2">
              <animateTransform attributeName="transform" type="rotate" values="0 400 400;360 400 400" dur="20s" repeatCount="indefinite"/>
            </circle>
            
            {/* Continents */}
            <g fill="#15803d" opacity="0.8">
              <ellipse cx="350" cy="350" rx="40" ry="25" transform="rotate(-20 350 350)"/>
              <ellipse cx="450" cy="380" rx="50" ry="30" transform="rotate(10 450 380)"/>
              <ellipse cx="380" cy="450" rx="30" ry="40" transform="rotate(30 380 450)"/>
            </g>
            
            {/* Orbital paths and satellites */}
            {Object.entries(satellites).map(([satId, satellite], index) => {
              const isSelected = satId === selectedSatellite
              const radius = 250 + (index * 40)
              const angle = (Date.now() * 0.001 + index * Math.PI / 2) % (2 * Math.PI)
              const x = 400 + radius * Math.cos(angle)
              const y = 400 + radius * Math.sin(angle)
              
              return (
                <g key={satId}>
                  <circle cx="400" cy="400" r={radius} fill="none" 
                         stroke={isSelected ? "#a855f7" : "#4c1d95"} 
                         strokeWidth={isSelected ? 3 : 1} 
                         opacity={isSelected ? 0.8 : 0.4} />
                  <circle cx={x} cy={y} r={isSelected ? 8 : 5}
                         fill={satellite.status === "active" ? "#10b981" : "#ef4444"}
                         stroke={isSelected ? "#a855f7" : "white"} strokeWidth="2">
                    {isSelected && <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />}
                  </circle>
                  <text x={x + 15} y={y - 10} fill="white" fontSize="12" fontFamily="monospace">
                    {satId}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        
        <div className="absolute bottom-4 left-4 bg-red-900/80 border border-red-500 rounded p-3 text-white font-mono text-sm">
          <div className="text-red-300 mb-1">⚠ Cesium Fallback Mode</div>
          <div className="text-xs">Using SVG visualization - Cesium CDN unavailable</div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center font-mono">
          <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <div className="text-2xl text-purple-300 mb-3">CESIUM EARTH ENGINE</div>
          <div className="text-sm text-gray-400 mb-2">Loading Professional 3D Globe...</div>
          <div className="text-xs text-gray-500">Initializing Terrain & Satellite Data</div>
          
          {/* Progress indicator */}
          <div className="mt-4 w-48 bg-gray-700 rounded-full h-2 mx-auto">
            <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
          </div>
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
