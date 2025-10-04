// lib/api/isro-client.ts
import axios from 'axios';

export interface ISROAerosolData {
  date: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  aod: number;
  aerosol_index: number;
  surface_reflectance: number;
  cloud_fraction: number;
  pixel_quality: number;
}

export interface EOS6Data {
  timestamp: string;
  region: string;
  aod_1km: number[][];
  aerosol_type: string;
  quality_flags: number[][];
  processing_level: 'L2' | 'L3';
}

class ISROClient {
  private mosdacURL = 'https://www.mosdac.gov.in/data';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ISRO_API_KEY || 'demo-key';
  }

  async getOCM3AerosolData(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<ISROAerosolData[]> {
    try {
      // MOSDAC API endpoint for OCM-3 AOD data
      const response = await axios.get(`${this.mosdacURL}/ocm3/aod`, {
        params: {
          lat: latitude,
          lon: longitude,
          start_date: startDate,
          end_date: endDate,
          product: 'OCM3_L2_AOD',
          format: 'json',
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data.map((item: any) => ({
        date: item.acquisition_date,
        coordinates: {
          latitude: item.center_lat,
          longitude: item.center_lon,
        },
        aod: item.aod_550nm || 0,
        aerosol_index: item.aerosol_index || 0,
        surface_reflectance: item.surface_reflectance || 0,
        cloud_fraction: item.cloud_fraction || 0,
        pixel_quality: item.quality_flag || 0,
      }));
    } catch (error) {
      console.error('Error fetching ISRO OCM-3 data:', error);
      return this.getMockISROData();
    }
  }

  async getEOS6Data(region: string = 'Delhi_NCR'): Promise<EOS6Data> {
    try {
      const response = await axios.get(`${this.mosdacURL}/eos6/aerosol`, {
        params: {
          region,
          product: 'EOS6_L2_AOD',
          resolution: '1km',
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return {
        timestamp: response.data.acquisition_time,
        region: response.data.region,
        aod_1km: response.data.aod_grid,
        aerosol_type: response.data.aerosol_type,
        quality_flags: response.data.quality_grid,
        processing_level: response.data.processing_level,
      };
    } catch (error) {
      console.error('Error fetching EOS-6 data:', error);
      return this.getMockEOS6Data();
    }
  }

  async getDelhiNCRHotspots(): Promise<{
    latitude: number;
    longitude: number;
    fire_intensity: number;
    confidence: number;
    timestamp: string;
  }[]> {
    try {
      const response = await axios.get(`${this.mosdacURL}/fire-hotspots`, {
        params: {
          region: 'Delhi_NCR',
          satellite: 'EOS-6',
          time_range: '24h',
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data.hotspots || [];
    } catch (error) {
      console.error('Error fetching fire hotspots:', error);
      return this.getMockHotspots();
    }
  }

  private getMockISROData(): ISROAerosolData[] {
    return Array.from({ length: 7 }, (_, i) => {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - i);
      
      return {
        date: baseDate.toISOString().split('T'),
        coordinates: {
          latitude: 28.7041 + (Math.random() - 0.5) * 0.2,
          longitude: 77.1025 + (Math.random() - 0.5) * 0.2,
        },
        aod: Math.random() * 1.5 + 0.2,
        aerosol_index: Math.random() * 3 + 1,
        surface_reflectance: Math.random() * 0.3 + 0.1,
        cloud_fraction: Math.random() * 0.8,
        pixel_quality: Math.floor(Math.random() * 3),
      };
    });
  }

  private getMockEOS6Data(): EOS6Data {
    // Generate 50x50 grid for Delhi NCR region
    const gridSize = 50;
    const aod_grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => Math.random() * 2 + 0.1)
    );
    
    const quality_grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => Math.floor(Math.random() * 4))
    );

    return {
      timestamp: new Date().toISOString(),
      region: 'Delhi_NCR',
      aod_1km: aod_grid,
      aerosol_type: 'Mixed',
      quality_flags: quality_grid,
      processing_level: 'L2',
    };
  }

  private getMockHotspots() {
    return Array.from({ length: 15 }, () => ({
      latitude: 28.7041 + (Math.random() - 0.5) * 2,
      longitude: 77.1025 + (Math.random() - 0.5) * 2,
      fire_intensity: Math.random() * 100 + 10,
      confidence: Math.random() * 40 + 60,
      timestamp: new Date().toISOString(),
    }));
  }
}

export const isroClient = new ISROClient();
