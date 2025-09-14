"use client"

import { useEffect, useRef } from "react"
import { Viewer, Entity, PointGraphics, LabelGraphics, PathGraphics } from "resium"
import { 
  Cartesian3, 
  Color, 
  JulianDate, 
  TimeIntervalCollection, 
  TimeInterval,
  SampledPositionProperty,
  PolylineGlowMaterialProperty,
  HeightReference,
  HorizontalOrigin,
  VerticalOrigin,
  LabelStyle,
  Terrain,
  createWorldTerrain,
  Ion
} from "cesium"
import { satellites } from "@/lib/satellite-data"

// Set Cesium Ion access token (you can use Cesium's default for development)
Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk"

interface CesiumGlobeProps {
  selectedSatellite: string
  onSatelliteSelect: (satelliteId: string) => void
}

export function CesiumGlobe({ selectedSatellite, onSatelliteSelect }: CesiumGlobeProps) {
  const viewerRef = useRef<any>(null)

  // Convert lat/lng to Cartesian3
  const degreesToCartesian = (latitude: number, longitude: number, height: number = 0) => {
    return Cartesian3.fromDegrees(longitude, latitude, height * 1000) // Convert km to meters
  }

  // Generate orbital path for satellite
  const generateOrbitPath = (satellite: any, satelliteId: string) => {
    const positions = new SampledPositionProperty()
    const start = JulianDate.now()
    
    // Generate orbital positions over time
    for (let i = 0; i <= 120; i++) {
      const time = JulianDate.addMinutes(start, i * 1.5, new JulianDate())
      
      // Simulate orbital motion
      const angle = (i * 3) * Math.PI / 180
      const orbitRadius = satellite.coordinates.altitude
      
      // Calculate position based on orbital mechanics
      const lat = satellite.coordinates.latitude + Math.sin(angle) * 10
      const lng = satellite.coordinates.longitude + Math.cos(angle) * 15
      const alt = orbitRadius + Math.sin(angle * 0.5) * 50
      
      const position = degreesToCartesian(lat, lng, alt)
      positions.addSample(time, position)
    }
    
    return positions
  }

  return (
    <div className="w-full h-full">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        baseLayerPicker={false}
        geocoder={false}
        fullscreenButton={false}
        vrButton={false}
        selectionIndicator={false}
        infoBox={false}
        terrain={createWorldTerrain()}
        style={{ 
          width: "100%", 
          height: "100%",
          backgroundColor: "#000000"
        }}
        cesiumWidget={{
          creditContainer: "cesium-credit"
        }}
      >
        {/* Render each satellite */}
        {Object.entries(satellites).map(([satId, satellite]) => {
          const isSelected = satId === selectedSatellite
          const position = degreesToCartesian(
            satellite.coordinates.latitude,
            satellite.coordinates.longitude,
            satellite.coordinates.altitude
          )
          
          const orbitPath = generateOrbitPath(satellite, satId)
          
          const satelliteColor = satellite.status === "active" ? Color.LIME : 
                                 satellite.status === "maintenance" ? Color.YELLOW : Color.RED
          
          return (
            <Entity
              key={satId}
              id={satId}
              position={position}
              onClick={() => onSatelliteSelect(satId)}
            >
              {/* Satellite point */}
              <PointGraphics
                pixelSize={isSelected ? 12 : 8}
                color={satelliteColor}
                outlineColor={isSelected ? Color.PURPLE : Color.WHITE}
                outlineWidth={isSelected ? 3 : 1}
                heightReference={HeightReference.NONE}
                scaleByDistance={{
                  near: 1000000,
                  nearValue: 1.0,
                  far: 10000000,
                  farValue: 0.5
                }}
              />
              
              {/* Satellite label */}
              <LabelGraphics
                text={`${satId}\n${satellite.coordinates.altitude}km`}
                font="12pt monospace"
                fillColor={isSelected ? Color.PURPLE : Color.WHITE}
                outlineColor={Color.BLACK}
                outlineWidth={2}
                style={LabelStyle.FILL_AND_OUTLINE}
                pixelOffset={{ x: 0, y: -40 }}
                horizontalOrigin={HorizontalOrigin.CENTER}
                verticalOrigin={VerticalOrigin.BOTTOM}
                scale={isSelected ? 1.2 : 1.0}
                show={true}
              />
              
              {/* Orbital path */}
              {isSelected && (
                <PathGraphics
                  positions={orbitPath}
                  width={3}
                  material={new PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    color: Color.PURPLE.withAlpha(0.8)
                  })}
                  show={true}
                />
              )}
            </Entity>
          )
        })}
      </Viewer>
      
      {/* Hidden credit container */}
      <div id="cesium-credit" style={{ display: "none" }}></div>
    </div>
  )
}
