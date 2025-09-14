export interface Satellite {
  id: string
  name: string
  organization: string
  purpose: string
  coordinates: {
    latitude: number
    longitude: number
    altitude: number
  }
  orbital: {
    azimuth: number
    elevation: number
    range: number
    velocity: number
  }
  status: "active" | "inactive" | "maintenance"
  frequency: {
    uplink: string
    downlink: string
  }
}

export const satellites: Record<string, Satellite> = {
  "VO-52": {
    id: "VO-52",
    name: "HAMSAT",
    organization: "Indian Space Research Organization",
    purpose: "Support amateur radio operators and transponder",
    coordinates: { latitude: 28.7041, longitude: 77.1025, altitude: 637 },
    orbital: { azimuth: 234, elevation: 45, range: 2847, velocity: 7.65 },
    status: "active",
    frequency: { uplink: "145.950 MHz", downlink: "435.200 MHz" }
  },
  "HO-68": {
    id: "HO-68", 
    name: "Hope-1",
    organization: "AMSAT",
    purpose: "Educational amateur radio satellite",
    coordinates: { latitude: -15.7801, longitude: -47.9292, altitude: 695 },
    orbital: { azimuth: 156, elevation: 23, range: 1847, velocity: 7.45 },
    status: "active",
    frequency: { uplink: "145.825 MHz", downlink: "435.525 MHz" }
  },
  "SO-50": {
    id: "SO-50",
    name: "SaudiSat-1C", 
    organization: "King Abdulaziz City for Science and Technology",
    purpose: "Store and forward digital communications",
    coordinates: { latitude: 51.5074, longitude: -0.1278, altitude: 685 },
    orbital: { azimuth: 67, elevation: 12, range: 3241, velocity: 7.52 },
    status: "active",
    frequency: { uplink: "145.850 MHz", downlink: "436.795 MHz" }
  },
  "AO-27": {
    id: "AO-27",
    name: "EYESAT-A",
    organization: "AMSAT",
    purpose: "Amateur radio transponder", 
    coordinates: { latitude: 35.6762, longitude: 139.6503, altitude: 720 },
    orbital: { azimuth: 298, elevation: 34, range: 2156, velocity: 7.38 },
    status: "maintenance",
    frequency: { uplink: "145.850 MHz", downlink: "436.795 MHz" }
  }
}

export const orbitalTrajectories = {
  "VO-52": [
    { lat: 28.7041, lng: 77.1025, timestamp: "19:15" },
    { lat: 30.2654, lng: 85.4521, timestamp: "19:18" },
    { lat: 32.1547, lng: 93.7854, timestamp: "19:21" },
    { lat: 34.8745, lng: 102.156, timestamp: "19:24" }
  ],
  "HO-68": [
    { lat: -15.7801, lng: -47.9292, timestamp: "19:15" },
    { lat: -12.4521, lng: -39.6587, timestamp: "19:18" },
    { lat: -8.7854, lng: -31.2547, timestamp: "19:21" },
    { lat: -5.1254, lng: -22.8745, timestamp: "19:24" }
  ]
}
