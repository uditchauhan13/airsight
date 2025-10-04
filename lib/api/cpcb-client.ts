// lib/api/cpcb-client.ts
import axios from 'axios';

export interface CPCBStation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  state: string;
  city: string;
  lastUpdate: string;
}

export interface AQIReading {
  stationId: string;
  stationName: string;
  timestamp: string;
  aqi: number;
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  pollutants: {
    pm25: { value: number; unit: string; };
    pm10: { value: number; unit: string; };
    no2: { value: number; unit: string; };
    so2: { value: number; unit: string; };
    co: { value: number; unit: string; };
    o3: { value: number; unit: string; };
  };
  dominantPollutant: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
}

class CPCBClient {
  private baseURL = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDelhiNCRStations(): Promise<CPCBStation[]> {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        params: {
          'api-key': this.apiKey,
          format: 'json',
          filters: JSON.stringify({
            state: 'Delhi',
          }),
        },
      });

      return response.data.records.map((record: any) => ({
        id: record.id || record.station_id,
        name: record.station,
        location: {
          latitude: parseFloat(record.latitude) || 0,
          longitude: parseFloat(record.longitude) || 0,
        },
        address: record.address || '',
        state: record.state,
        city: record.city,
        lastUpdate: record.last_update || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching Delhi NCR stations:', error);
      return this.getMockDelhiStations();
    }
  }

  async getRealtimeAQI(stationId?: string): Promise<AQIReading[]> {
    try {
      const response = await axios.get(`${this.baseURL}`, {
        params: {
          'api-key': this.apiKey,
          format: 'json',
          filters: stationId ? JSON.stringify({ station_id: stationId }) : undefined,
        },
      });

      return response.data.records.map((record: any) => ({
        stationId: record.station_id || record.id,
        stationName: record.station,
        timestamp: record.last_update || new Date().toISOString(),
        aqi: parseInt(record.aqi) || 0,
        category: this.getAQICategory(parseInt(record.aqi) || 0),
        pollutants: {
          pm25: { value: parseFloat(record.pm2_5) || 0, unit: 'μg/m³' },
          pm10: { value: parseFloat(record.pm10) || 0, unit: 'μg/m³' },
          no2: { value: parseFloat(record.no2) || 0, unit: 'μg/m³' },
          so2: { value: parseFloat(record.so2) || 0, unit: 'μg/m³' },
          co: { value: parseFloat(record.co) || 0, unit: 'mg/m³' },
          o3: { value: parseFloat(record.o3) || 0, unit: 'μg/m³' },
        },
        dominantPollutant: record.dominant_pollutant || 'PM2.5',
      }));
    } catch (error) {
      console.error('Error fetching real-time AQI:', error);
      return this.getMockAQIData();
    }
  }

  async getHyperLocalAQI(latitude: number, longitude: number, radius: number = 5): Promise<AQIReading[]> {
    // Find nearest stations within radius
    const stations = await this.getDelhiNCRStations();
    const nearbyStations = stations.filter(station => {
      const distance = this.calculateDistance(latitude, longitude, station.location.latitude, station.location.longitude);
      return distance <= radius;
    });

    const readings = await Promise.all(
      nearbyStations.map(station => this.getRealtimeAQI(station.id))
    );

    return readings.flat();
  }

  private getAQICategory(aqi: number): AQIReading['category'] {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getMockDelhiStations(): CPCBStation[] {
    return [
      {
        id: 'DL001',
        name: 'Anand Vihar',
        location: { latitude: 28.6469, longitude: 77.3152 },
        address: 'Anand Vihar, Delhi',
        state: 'Delhi',
        city: 'Delhi',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'DL002', 
        name: 'RK Puram',
        location: { latitude: 28.5636, longitude: 77.1733 },
        address: 'RK Puram, Delhi',
        state: 'Delhi',
        city: 'Delhi',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'DL003',
        name: 'Punjabi Bagh',
        location: { latitude: 28.6742, longitude: 77.1311 },
        address: 'Punjabi Bagh, Delhi',
        state: 'Delhi',
        city: 'Delhi', 
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'DL004',
        name: 'ITO',
        location: { latitude: 28.6289, longitude: 77.2492 },
        address: 'ITO, Delhi',
        state: 'Delhi',
        city: 'Delhi',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'GZ001',
        name: 'Ghaziabad',
        location: { latitude: 28.6692, longitude: 77.4538 },
        address: 'Ghaziabad, UP',
        state: 'Uttar Pradesh',
        city: 'Ghaziabad',
        lastUpdate: new Date().toISOString(),
      },
      {
        id: 'GG001',
        name: 'Gurugram',
        location: { latitude: 28.4595, longitude: 77.0266 },
        address: 'Gurugram, Haryana',
        state: 'Haryana',
        city: 'Gurugram',
        lastUpdate: new Date().toISOString(),
      }
    ];
  }

  private getMockAQIData(): AQIReading[] {
    const stations = this.getMockDelhiStations();
    return stations.map(station => ({
      stationId: station.id,
      stationName: station.name,
      timestamp: new Date().toISOString(),
      aqi: Math.floor(Math.random() * 400) + 50,
      category: this.getAQICategory(Math.floor(Math.random() * 400) + 50),
      pollutants: {
        pm25: { value: Math.floor(Math.random() * 200) + 10, unit: 'μg/m³' },
        pm10: { value: Math.floor(Math.random() * 300) + 20, unit: 'μg/m³' },
        no2: { value: Math.floor(Math.random() * 80) + 5, unit: 'μg/m³' },
        so2: { value: Math.floor(Math.random() * 40) + 2, unit: 'μg/m³' },
        co: { value: Math.floor(Math.random() * 5) + 0.5, unit: 'mg/m³' },
        o3: { value: Math.floor(Math.random() * 150) + 10, unit: 'μg/m³' },
      },
      dominantPollutant: ['PM2.5', 'PM10', 'NO2'][Math.floor(Math.random() * 3)],
    }));
  }
}

export const cpcbClient = new CPCBClient(process.env.NEXT_PUBLIC_DATA_GOV_API_KEY || 'demo-key');
