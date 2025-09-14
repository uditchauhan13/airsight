"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls, Sphere, Html, Stars } from "@react-three/drei"
import * as THREE from "three"
import { satellites } from "@/lib/satellite-data"
import { SatelliteControlPanel } from "./satellite-tracking/satellite-control-panel"
import { TechnicalReadouts } from "./satellite-tracking/technical-readouts"

// Professional Earth Globe with realistic textures
function EarthGlobe() {
  const earthRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  
  // Create realistic Earth texture
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    
    // Create Earth base
    const earthGradient = ctx.createRadialGradient(512, 256, 0, 512, 256, 512)
    earthGradient.addColorStop(0, '#4a90e2')
    earthGradient.addColorStop(0.7, '#2563eb')
    earthGradient.addColorStop(1, '#1e3a8a')
    
    ctx.fillStyle = earthGradient
    ctx.fillRect(0, 0, 2048, 1024)
    
    // Add realistic continents
    ctx.fillStyle = '#22c55e'
    ctx.globalAlpha = 1
    
    // North America
    ctx.beginPath()
    ctx.ellipse(300, 200, 150, 120, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // South America  
    ctx.beginPath()
    ctx.ellipse(400, 600, 80, 180, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Europe
    ctx.beginPath()
    ctx.ellipse(900, 180, 100, 80, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Africa
    ctx.beginPath()
    ctx.ellipse(950, 400, 120, 200, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Asia
    ctx.beginPath()
    ctx.ellipse(1300, 200, 200, 150, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Australia
    ctx.beginPath()
    ctx.ellipse(1500, 650, 100, 60, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Add mountain ranges (darker green)
    ctx.fillStyle = '#16a34a'
    ctx.globalAlpha = 0.8
    
    // Rocky Mountains
    ctx.fillRect(280, 180, 20, 100)
    // Andes
    ctx.fillRect(380, 500, 15, 200)
    // Himalayas  
    ctx.fillRect(1250, 180, 80, 20)
    // Alps
    ctx.fillRect(880, 160, 30, 15)
    
    // Add ice caps
    ctx.fillStyle = '#f0f9ff'
    ctx.globalAlpha = 0.9
    
    // North pole
    ctx.beginPath()
    ctx.ellipse(1024, 50, 200, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // South pole
    ctx.beginPath()  
    ctx.ellipse(1024, 974, 180, 25, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Add realistic cloud patterns
    ctx.fillStyle = 'white'
    ctx.globalAlpha = 0.4
    
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 2048
      const y = Math.random() * 1024
      const size = Math.random() * 80 + 40
      ctx.beginPath()
      ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [])

  // Create night lights texture
  const nightTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 2048, 1024)
    
    // Add city lights
    ctx.fillStyle = '#fbbf24'
    ctx.globalAlpha = 0.8
    
    // Major cities as light points
    const cities = [
      [300, 220], [350, 240], [420, 580], // Americas
      [900, 200], [920, 180], [940, 220], // Europe  
      [1300, 220], [1320, 200], [1280, 240], // Asia
      [1500, 650] // Australia
    ]
    
    cities.forEach(([x, y]) => {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Add glow around cities
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15)
      gradient.addColorStop(0, 'rgba(251, 191, 36, 0.6)')
      gradient.addColorStop(1, 'rgba(251, 191, 36, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fbbf24'
    })
    
    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.001
    }
  })

  return (
    <group>
      {/* Main Earth */}
      <Sphere ref={earthRef} args={[2, 128, 64]} position={[0, 0, 0]}>
        <meshPhongMaterial
          map={earthTexture}
          bumpMap={earthTexture}
          bumpScale={0.05}
          specularMap={nightTexture}
          shininess={100}
        />
      </Sphere>
      
      {/* Atmosphere glow */}
      <Sphere ref={atmosphereRef} args={[2.02, 64, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#87ceeb"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer atmosphere */}
      <Sphere args={[2.05, 32, 16]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#4da6ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  )
}

// Realistic satellite with detailed geometry
function RealisticSatellite({ position, isSelected, satellite, label }: {
  position: [number, number, number]
  isSelected: boolean
  satellite: any
  label: string
}) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (bodyRef.current && isSelected) {
      bodyRef.current.rotation.x += 0.01
      bodyRef.current.rotation.z += 0.005
    }
    if (groupRef.current) {
      // Always face Earth
      groupRef.current.lookAt(0, 0, 0)
    }
  })

  const statusColor = satellite.status === "active" ? "#10b981" : 
                     satellite.status === "maintenance" ? "#f59e0b" : "#ef4444"

  return (
    <group ref={groupRef} position={position}>
      {/* Main satellite body */}
      <mesh ref={bodyRef}>
        <boxGeometry args={[0.15, 0.1, 0.25]} />
        <meshStandardMaterial
          color={statusColor}
          metalness={0.7}
          roughness={0.3}
          emissive={isSelected ? "#a855f7" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Solar panels */}
      <mesh position={[-0.25, 0, 0]}>
        <boxGeometry args={[0.08, 0.35, 0.4]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.25, 0, 0]}>
        <boxGeometry args={[0.08, 0.35, 0.4]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Communication dish */}
      <mesh position={[0, 0.1, 0.15]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 0.15, -0.1]}>
        <cylinderGeometry args={[0.005, 0.005, 0.1, 8]} />
        <meshStandardMaterial color="#ffcc00" />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.45, 32]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
          </mesh>
          <pointLight color="#a855f7" intensity={0.5} distance={2} />
        </>
      )}

      {/* Satellite trail */}
      <mesh position={[0, 0, -0.5]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.6} />
      </mesh>

      {/* Label */}
      <Html position={[0, 0.6, 0]} center>
        <div className={`px-2 py-1 rounded text-xs font-mono whitespace-nowrap ${
          isSelected 
            ? 'bg-purple-600 text-white' 
            : 'bg-black/80 text-green-300 border border-green-500/50'
        }`}>
          {label}
          <div className="text-xs opacity-75">
            {satellite.coordinates.altitude}km
          </div>
        </div>
      </Html>
    </group>
  )
}

// Orbital path visualization
function OrbitalPath({ radius, isSelected, inclination = 0, satelliteId }: {
  radius: number
  isSelected: boolean
  inclination?: number
  satelliteId: string
}) {
  const points = []
  const numPoints = 128
  
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius * Math.sin(inclination)
    const z = Math.sin(angle) * radius * Math.cos(inclination)
    points.push(new THREE.Vector3(x, y, z))
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
        opacity={isSelected ? 0.9 : 0.3}
      />
    </line>
  )
}

// Main scene component
function Scene({ selectedSatellite }: { selectedSatellite: string }) {
  const [time, setTime] = useState(0)

  useFrame((_, delta) => {
    setTime(prev => prev + delta * 0.5)
  })

  return (
    <>
      {/* Professional lighting setup */}
      <ambientLight intensity={0.2} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, -5, -5]} intensity={0.3} color="#4da6ff" />

      {/* Earth */}
      <EarthGlobe />

      {/* Stars background */}
      <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} />

      {/* Satellites and orbital paths */}
      {Object.entries(satellites).map(([satId, satellite], index) => {
        const isSelected = satId === selectedSatellite
        const baseRadius = 2.8
        const radius = baseRadius + (index * 0.4)
        const inclination = (index * 20 - 30) * (Math.PI / 180) // Different orbital inclinations
        const speed = 0.3 + (index * 0.1)
        
        // Calculate satellite position
        const angle = time * speed + (index * Math.PI * 0.5)
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius * Math.sin(inclination)  
        const z = Math.sin(angle) * radius * Math.cos(inclination)

        return (
          <group key={satId}>
            {/* Orbital path */}
            <OrbitalPath
              radius={radius}
              isSelected={isSelected}
              inclination={inclination}
              satelliteId={satId}
            />
            
            {/* Satellite */}
            <RealisticSatellite
              position={[x, y, z]}
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
        minDistance={4}
        maxDistance={15}
        autoRotate={false}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </>
  )
}

export function SatelliteTrackingDashboard() {
  const [selectedSatellite, setSelectedSatellite] = useState("VO-52")
  const [viewMode, setViewMode] = useState<"map" | "3d">("3d")

  const satellite = satellites[selectedSatellite]

  return (
    <div className="h-screen bg-black text-white flex">
      {/* Main 3D View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 border-b border-purple-500/30 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <h1 className="text-lg font-mono tracking-wider text-purple-300 font-bold">
              AIRSIGHT ORBITAL TRACKING SYSTEM
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">
              NOMINAL
            </div>
            <div className="text-xs font-mono text-gray-300">
              {new Date().toISOString().slice(0, 19)}Z
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [6, 3, 6], fov: 50 }}
            style={{ background: "radial-gradient(ellipse at center, #0f0820 0%, #000000 70%)" }}
            shadows
            gl={{ antialias: true, alpha: false }}
          >
            <Scene selectedSatellite={selectedSatellite} />
          </Canvas>

          {/* Professional overlays */}
          {satellite && (
            <div className="absolute top-4 left-4 bg-black/90 backdrop-blur border border-purple-500/50 rounded-lg p-4 font-mono text-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${
                  satellite.status === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}></div>
                <div className="text-purple-300 font-bold tracking-wider">
                  {satellite.name} ({satellite.id})
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-gray-400">LATITUDE:</span>
                  <div className="text-green-300 font-mono">{satellite.coordinates.latitude.toFixed(6)}°</div>
                </div>
                <div>
                  <span className="text-gray-400">LONGITUDE:</span>
                  <div className="text-green-300 font-mono">{satellite.coordinates.longitude.toFixed(6)}°</div>
                </div>
                <div>
                  <span className="text-gray-400">ALTITUDE:</span>
                  <div className="text-blue-300 font-mono">{satellite.coordinates.altitude} km</div>
                </div>
                <div>
                  <span className="text-gray-400">VELOCITY:</span>
                  <div className="text-yellow-300 font-mono">{satellite.orbital.velocity} km/s</div>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-purple-500/30 text-xs">
                <div className="text-gray-400">ORGANIZATION:</div>
                <div className="text-white">{satellite.organization}</div>
              </div>
            </div>
          )}

          {/* Controls info */}
          <div className="absolute top-4 right-4 bg-black/90 backdrop-blur border border-purple-500/50 rounded-lg p-3 font-mono text-xs">
            <div className="text-purple-300 font-bold mb-2">NAVIGATION</div>
            <div className="space-y-1 text-gray-300">
              <div>• MOUSE DRAG: Rotate View</div>
              <div>• SCROLL: Zoom In/Out</div>
              <div>• RIGHT CLICK: Pan Camera</div>
            </div>
          </div>

          {/* Status bar */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/90 backdrop-blur border border-purple-500/50 rounded-lg p-3 font-mono text-xs flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300">TRACKING {Object.keys(satellites).length} SATELLITES</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-300">REAL-TIME 3D RENDER</span>
                </div>
              </div>
              <div className="text-purple-300">
                EARTH ROTATION: ACTIVE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 bg-gradient-to-b from-gray-900 to-black border-l border-purple-500/30 flex flex-col">
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
