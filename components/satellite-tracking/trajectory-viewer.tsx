"use client"

import { useEffect, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Sphere, Line } from "@react-three/drei"
import * as THREE from "three"
import { satellites, orbitalTrajectories } from "@/lib/satellite-data"

interface TrajectoryViewerProps {
  selectedSatellite: string
}

// Earth component
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <Sphere ref={meshRef} args={[2, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial
        map={undefined}
        color="#1e40af"
        transparent
        opacity={0.8}
      />
    </Sphere>
  )
}

// Satellite component
function SatelliteModel({ position, isSelected, satellite }: {
  position: [number, number, number]
  isSelected: boolean
  satellite: any
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.x += 0.02
      meshRef.current.rotation.y += 0.02
    }
  })

  const color = satellite.status === "active" ? "#10b981" : 
               satellite.status === "maintenance" ? "#f59e0b" : "#ef4444"

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[isSelected ? 0.15 : 0.1, 16, 16]}>
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? "#a855f7" : "#000000"}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </Sphere>
      {isSelected && (
        <Sphere args={[0.25, 16, 16] as [number, number, number]}>
          <meshBasicMaterial
            color="#a855f7"
            transparent
            opacity={0.2}
            wireframe
          />
        </Sphere>
      )}
    </group>
  )
}

// Orbital path component
function OrbitalPath({ trajectoryPoints, isSelected }: {
  trajectoryPoints: THREE.Vector3[]
  isSelected: boolean
}) {
  return (
    <Line
      points={trajectoryPoints}
      color={isSelected ? "#a855f7" : "#6b21a8"}
      lineWidth={isSelected ? 3 : 1}
      transparent
      opacity={isSelected ? 1 : 0.6}
    />
  )
}

// Main 3D scene
function Scene({ selectedSatellite }: { selectedSatellite: string }) {
  // Convert lat/lng to 3D coordinates
  const latLngTo3D = (lat: number, lng: number, radius: number = 3) => {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta))
    const z = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    
    return [x, y, z] as [number, number, number]
  }

  // Generate orbital paths
  const orbitalPaths = Object.entries(orbitalTrajectories).map(([satId, trajectory]) => {
    const points = trajectory.map(point => {
      const [x, y, z] = latLngTo3D(point.lat, point.lng, 3.2)
      return new THREE.Vector3(x, y, z)
    })
    
    // Add more points for smoother curves
    const smoothPoints = []
    for (let i = 0; i < points.length - 1; i++) {
      smoothPoints.push(points[i])
      // Interpolate between points
      for (let j = 1; j < 5; j++) {
        const alpha = j / 5
        const interpolated = new THREE.Vector3().lerpVectors(points[i], points[i + 1], alpha)
        interpolated.normalize().multiplyScalar(3.2)
        smoothPoints.push(interpolated)
      }
    }
    smoothPoints.push(points[points.length - 1])
    
    return { satId, points: smoothPoints }
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Earth */}
      <Earth />

      {/* Orbital paths */}
      {orbitalPaths.map(({ satId, points }) => (
        <OrbitalPath
          key={satId}
          trajectoryPoints={points}
          isSelected={satId === selectedSatellite}
        />
      ))}

      {/* Satellites */}
      {Object.entries(satellites).map(([satId, satellite]) => {
        const position = latLngTo3D(
          satellite.coordinates.latitude,
          satellite.coordinates.longitude,
          3.2
        )
        
        return (
          <SatelliteModel
            key={satId}
            position={position}
            isSelected={satId === selectedSatellite}
            satellite={satellite}
          />
        )
      })}

      {/* Grid reference */}
      <gridHelper args={[10, 20, "#333333", "#111111"]} />
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
      />
    </>
  )
}

export function TrajectoryViewer({ selectedSatellite }: TrajectoryViewerProps) {
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas
        camera={{ position: [8, 8, 8], fov: 60 }}
        style={{ background: "#000000" }}
      >
        <Scene selectedSatellite={selectedSatellite} />
      </Canvas>
      
      {/* 3D View Info Panel */}
      <div className="absolute top-4 left-4 bg-black/80 border border-purple-500/50 rounded p-3 text-white">
        <h4 className="text-purple-400 font-semibold mb-2">3D Orbital View</h4>
        <div className="text-sm space-y-1">
          <div>• Mouse: Rotate view</div>
          <div>• Scroll: Zoom in/out</div>
          <div>• Drag: Pan camera</div>
        </div>
      </div>

      {/* Satellite Info */}
      <div className="absolute bottom-4 left-4 bg-black/80 border border-purple-500/50 rounded p-3 text-white">
        <div className="text-purple-400 font-semibold">{satellites[selectedSatellite]?.name}</div>
        <div className="text-sm text-gray-300">
          Alt: {satellites[selectedSatellite]?.coordinates.altitude} km
        </div>
        <div className="text-sm text-gray-300">
          Vel: {satellites[selectedSatellite]?.orbital.velocity} km/s
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/80 border border-purple-500/50 rounded p-3 text-white">
        <h4 className="text-purple-400 font-semibold mb-2">Status Legend</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Inactive</span>
          </div>
        </div>
      </div>
    </div>
  )
}
