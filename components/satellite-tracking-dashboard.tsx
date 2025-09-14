"use client"

import { useMemo } from "react"
import { useState, useEffect, useRef } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls, Sphere, Html } from "@react-three/drei"
import * as THREE from "three"
import { satellites } from "@/lib/satellite-data"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"
import { Button } from "@/components/ui/button"

// Professional Earth component with textures
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Create Earth texture programmatically
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Create gradient for Earth
    const gradient = ctx.createLinearGradient(0, 0, 1024, 512)
    gradient.addColorStop(0, '#1e40af')
    gradient.addColorStop(0.3, '#2563eb')
    gradient.addColorStop(0.5, '#22c55e')
    gradient.addColorStop(0.7, '#16a34a')
    gradient.addColorStop(1, '#1e40af')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 512)
    
    // Add continent shapes
    ctx.fillStyle = '#15803d'
    ctx.globalAlpha = 0.8
    
    // North America
    ctx.fillRect(100, 120, 200, 150)
    // Europe/Asia
    ctx.fillRect(400, 100, 400, 200)
    // Africa
    ctx.fillRect(450, 200, 120, 200)
    // South America
    ctx.fillRect(200, 250, 100, 200)
    // Australia
    ctx.fillRect(650, 350, 120, 80)
    
    // Add clouds
    ctx.fillStyle = 'white'
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      const size = Math.random() * 50 + 20
      ctx.beginPath()
      ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <group>
      {/* Main Earth sphere */}
      <Sphere ref={meshRef} args={[2, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial
          map={earthTexture}
          transparent={false}
        />
      </Sphere>
      
      {/* Atmosphere */}
      <Sphere args={[2.05, 64, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.1}
        />
      </Sphere>
    </group>
  )
}

// Professional satellite component
function SatelliteModel({ position, isSelected, satellite, label }: {
  position: [number, number, number]
  isSelected: boolean
  satellite: any
  label: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.x += 0.02
      meshRef.current.rotation.z += 0.01
    }
  })

  const color = satellite.status === "active" ? "#10b981" : 
               satellite.status === "maintenance" ? "#f59e0b" : "#ef4444"

  return (
    <group ref={groupRef} position={position}>
      {/* Satellite body */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.1, 0.1, 0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? "#a855f7" : "#000000"}
          emissiveIntensity={isSelected ? 0.3 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Solar panels */}
      <mesh position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.05, 0.2, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.15, 0, 0]}>
        <boxGeometry args={[0.05, 0.2, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 0.4, 0]} center>
        <div className={`text-white text-xs font-mono whitespace-nowrap px-2 py-1 rounded ${
          isSelected ? 'bg-purple-600' : 'bg-black/70'
        }`}>
          {label}
        </div>
      </Html>
    </group>
  )
}

// Orbital path component
function OrbitalPath({ radius, isSelected, inclination = 0 }: {
  radius: number
  isSelected: boolean
  inclination?: number
}) {
  const points = []
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * Math.sin(inclination),
      Math.sin(angle) * radius * Math.cos(inclination)
    ))
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={isSelected ? "#a855f7" : "#4c1d95"}
        transparent
        opacity={isSelected ? 0.8 : 0.4}
        linewidth={isSelected ? 3 : 1}
      />
    </line>
  )
}

// Main 3D scene
function Scene({ selectedSatellite, viewMode }: { selectedSatellite: string; viewMode: string }) {
  const [time, setTime] = useState(0)

  useFrame(() => {
    setTime(prev => prev + 0.01)
  })

  // Convert lat/lng to 3D coordinates
  const latLngTo3D = (lat: number, lng: number, radius: number = 3.2) => {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta))
    const z = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    
    return [x, y, z] as [number, number, number]
  }

  return (
    <>
      {/* Professional lighting setup */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Earth */}
      <Earth />

      {/* Stars */}
      {Array.from({length: 200}, (_, i) => (
        <mesh key={i} position={[
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100
        ]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}

      {/* Orbital paths and satellites */}
      {Object.entries(satellites).map(([satId, satellite], index) => {
        const isSelected = satId === selectedSatellite
        const radius = 3.2 + (index * 0.3)
        const inclination = (index * 15) * (Math.PI / 180)
        const speed = 0.5 + (index * 0.1)
        
        // Orbital position
        const angle = time * speed + (index * Math.PI / 2)
        const position: [number, number, number] = [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * Math.sin(inclination),
          Math.sin(angle) * radius * Math.cos(inclination)
        ]

        return (
          <group key={satId}>
            {/* Orbital path */}
            <OrbitalPath
              radius={radius}
              isSelected={isSelected}
              inclination={inclination}
            />
            
            {/* Satellite */}
            <SatelliteModel
              position={position}
              isSelected={isSelected}
              satellite={satellite}
              label={satId}
            />
          </group>
        )
      })}

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={6}
        maxDistance={20}
        autoRotate={false}
      />
    </>
  )
}

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("3d")

  const satellite = satellites[selectedSatellite]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-screen flex">
        {/* Main Display */}
        <div className="flex-1 flex flex-col">
          {/* Professional header */}
          <div className="h-16 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-purple-500/30 flex items-center px-6">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h1 className="text-xl font-mono tracking-wider text-purple-300">
                AIRSIGHT MISSION CONTROL
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="text-sm font-mono text-green-400">
                SYSTEM NOMINAL
              </div>
              <div className="text-sm font-mono text-gray-400">
                {new Date().toISOString().slice(0, 19)}Z
              </div>
            </div>
          </div>

          {/* Main 3D View */}
          <div className="flex-1 relative bg-black">
            <Canvas
              camera={{ position: [8, 5, 8], fov: 60 }}
              style={{ background: "radial-gradient(circle, #0a0a0a 0%, #000000 100%)" }}
              shadows
            >
              <Scene selectedSatellite={selectedSatellite} viewMode={viewMode} />
            </Canvas>

            {/* Professional overlays */}
            {satellite && (
              <div className="absolute top-6 left-6 bg-black/90 border border-purple-500/50 backdrop-blur-sm rounded-lg p-4 font-mono">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${
                    satellite.status === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"
                  }`}></div>
                  <div className="text-purple-300 font-bold">TARGET: {satellite.id}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-400">LAT:</span>
                    <span className="text-green-300 ml-2">{satellite.coordinates.latitude.toFixed(4)}°</span>
                  </div>
                  <div>
                    <span className="text-gray-400">LNG:</span>
                    <span className="text-green-300 ml-2">{satellite.coordinates.longitude.toFixed(4)}°</span>
                  </div>
                  <div>
                    <span className="text-gray-400">ALT:</span>
                    <span className="text-blue-300 ml-2">{satellite.coordinates.altitude} km</span>
                  </div>
                  <div>
                    <span className="text-gray-400">VEL:</span>
                    <span className="text-yellow-300 ml-2">{satellite.orbital.velocity} km/s</span>
                  </div>
                  <div>
                    <span className="text-gray-400">AZ:</span>
                    <span className="text-purple-300 ml-2">{satellite.orbital.azimuth}°</span>
                  </div>
                  <div>
                    <span className="text-gray-400">EL:</span>
                    <span className="text-purple-300 ml-2">{satellite.orbital.elevation}°</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3D Controls Info */}
            <div className="absolute top-6 right-6 bg-black/90 border border-purple-500/50 backdrop-blur-sm rounded-lg p-4 font-mono text-xs">
              <div className="text-purple-300 font-bold mb-2">3D CONTROLS</div>
              <div className="space-y-1 text-gray-300">
                <div>• LEFT CLICK + DRAG: Rotate</div>
                <div>• RIGHT CLICK + DRAG: Pan</div>
                <div>• SCROLL: Zoom In/Out</div>
                <div>• MOUSE WHEEL: Distance</div>
              </div>
            </div>

            {/* Status bar */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-black/90 border border-purple-500/50 backdrop-blur-sm rounded-lg p-3 font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-300">TRACKING ACTIVE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-300">3D RENDER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-purple-300">REAL-TIME DATA</span>
                  </div>
                </div>
                
                <div className="text-gray-400">
                  Tracking {Object.keys(satellites).length} satellites
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional side panel */}
        <div className="w-96 bg-gradient-to-b from-gray-900 to-gray-800 border-l border-purple-500/30 flex flex-col">
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
    </div>
  )
}
