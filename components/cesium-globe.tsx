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
    const script = document.createElement('script')
    script.innerHTML = `
      (function() {
        if (window.Cesium) return;
        
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/cesium@1.108.0/Build/Cesium/Widgets/widgets.css';
        document.head.appendChild(link);
        
        // Load JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/cesium@1.108.0/Build/Cesium/Cesium.js';
        script.onload = function() {
          // Initialize Cesium
          const container = document.getElementById('cesium-container-${Date.now()}');
          if (!container || !window.Cesium) return;
          
          try {
            const viewer = new window.Cesium.Viewer(container, {
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
              imageryProvider: new window.Cesium.TileMapServiceImageryProvider({
                url: window.Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
              }),
              terrainProvider: new window.Cesium.EllipsoidTerrainProvider()
            });
            
            viewer.camera.setView({
              destination: window.Cesium.Cartesian3.fromDegrees(77.1025, 28.7041, 15000000)
            });
            
            // Add satellites
            const satellites = ${JSON.stringify(satellites)};
            const selectedSatellite = "${selectedSatellite}";
            
            Object.entries(satellites).forEach(([satId, satellite]) => {
              const isSelected = satId === selectedSatellite;
              
              viewer.entities.add({
                id: satId,
                position: window.Cesium.Cartesian3.fromDegrees(
                  satellite.coordinates.longitude,
                  satellite.coordinates.latitude,
                  satellite.coordinates.altitude * 1000
                ),
                point: {
                  pixelSize: isSelected ? 15 : 10,
                  color: satellite.status === "active" ? window.Cesium.Color.LIME : window.Cesium.Color.RED,
                  outlineColor: isSelected ? window.Cesium.Color.PURPLE : window.Cesium.Color.WHITE,
                  outlineWidth: 2
                },
                label: {
                  text: satId + '\\n' + satellite.coordinates.altitude + 'km',
                  font: '12pt monospace',
                  fillColor: isSelected ? window.Cesium.Color.PURPLE : window.Cesium.Color.WHITE,
                  pixelOffset: new window.Cesium.Cartesian2(0, -40),
                  scale: isSelected ? 1.2 : 1.0
                }
              });
              
              if (isSelected) {
                const positions = [];
                for (let i = 0; i <= 100; i++) {
                  const angle = (i / 100) * 2 * Math.PI;
                  const lat = satellite.coordinates.latitude + Math.sin(angle) * 8;
                  const lng = satellite.coordinates.longitude + Math.cos(angle) * 12;
                  positions.push(window.Cesium.Cartesian3.fromDegrees(lng, lat, satellite.coordinates.altitude * 1000));
                }
                
                viewer.entities.add({
                  polyline: {
                    positions: positions,
                    width: 3,
                    material: window.Cesium.Color.PURPLE.withAlpha(0.8)
                  }
                });
              }
            });
            
            // Signal success
            window.cesiumReady = true;
            
          } catch (err) {
            console.error('Cesium init error:', err);
            window.cesiumError = err.toString();
          }
        };
        
        script.onerror = function() {
          window.cesiumError = 'Failed to load Cesium';
        };
        
        document.head.appendChild(script);
      })();
    `
    
    document.head.appendChild(script)

    // Check for completion
    const checkInterval = setInterval(() => {
      if ((window as any).cesiumReady) {
        clearInterval(checkInterval)
        setIsLoaded(true)
      } else if ((window as any).cesiumError) {
        clearInterval(checkInterval)
        setError((window as any).cesiumError)
      }
    }, 100)

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      if (!isLoaded) {
        setError('Cesium loading timeout')
      }
    }, 15000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [selectedSatellite])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center font-mono">
          <div className="text-red-400 text-xl mb-4">⚠ Cesium Error</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 px-4 py-2 rounded text-sm"
          >
            Reload Page
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
    <div className="w-full h-full">
      <div 
        id={`cesium-container-${Date.now()}`}
        ref={cesiumContainerRef} 
        className="w-full h-full"
      />
    </div>
  )
}
