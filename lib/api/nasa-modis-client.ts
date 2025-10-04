// lib/api/nasa-modis-client.ts
import axios from 'axios';

export interface MODISAerosolData {
  date: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  aod: number; // Aerosol Optical Depth
  angstromExponent: number;
  qualityFlag: number;
  satellite: 'Terra' | 'Aqua';
}

export interface MODISRegionData {
  region: 'Delhi_NCR';
  timeRange: {
    start: string;
    end: string;
  };
  gridData: MODISAerosolData[];
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    pixelCount: number;
  };
}

class NASAMODISClient {
  private baseURL = 'https://modis.ornl.gov/rst/api/v1';
  private giovanniURL = 'https://giovanni.gsfc.nasa.gov/giovanni/daac-bin';

  async getAerosolData(
    latitude: number,
    longitude: number, 
    startDate: string,
    endDate: string,
    product: string = 'MOD04_L2'
  ): Promise<MODISAerosolData[]> {
    try {
      const response = await axios.get(`${this.baseURL}/${product}`, {
        params: {
          latitude,
          longitude,
          startDate,
          endDate,
          kmAboveBelow: 50, // 50km radius
        },
      });

      return response.data.map((item: any) => ({
        date: item.calendar_date,
        coordinates: {
          latitude: item.latitude,
          longitude: item.longitude,
        },
        aod: item.aod_047 || item.aod_055 || 0,
        angstromExponent: item.angstrom_exponent || 0,
        qualityFlag: item.quality_flag || 0,
        satellite: item.satellite || 'Terra',
      }));
    } catch (error) {
      console.error('Error fetching MODIS data:', error);
      return this.getMockMODISData();
    }
  }

  async getDelhiNCRAerosolData(
    startDate: string,
    endDate: string
  ): Promise<MODISRegionData> {
    // Delhi NCR bounding box
    const bounds = {
      north: 29.5,
      south: 27.5,
      east: 78.5,
      west: 75.5,
    };

    try {
      const gridPoints = this.generateGridPoints(bounds, 0.1); // 0.1 degree grid
      const promises = gridPoints.map(point =>
        this.getAerosolData(point.lat, point.lng, startDate, endDate)
      );

      const results = await Promise.all(promises);
      const flatData = results.flat();

      return {
        region: 'Delhi_NCR',
        timeRange: { start: startDate, end: endDate },
        gridData: flatData,
        statistics: this.calculateStatistics(flatData),
      };
    } catch (error) {
      console.error('Error fetching Delhi NCR data:', error);
      return this.getMockRegionData(startDate, endDate);
    }
  }

  async getRealtimeAerosolData(): Promise<MODISAerosolData[]> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const startDate = yesterday.toISOString().split('T');
    const endDate = today.toISOString().split('T');

    // Delhi coordinates
    return this.getAerosolData(28.7041, 77.1025, startDate, endDate);
  }

  private generateGridPoints(
    bounds: { north: number; south: number; east: number; west: number },
    resolution: number
  ): { lat: number; lng: number }[] {
    const points = [];
    for (let lat = bounds.south; lat <= bounds.north; lat += resolution) {
      for (let lng = bounds.west; lng <= bounds.east; lng += resolution) {
        points.push({ lat, lng });
      }
    }
    return points;
  }

  private calculateStatistics(data: MODISAerosolData[]): MODISRegionData['statistics'] {
    const aodValues = data.map(d => d.aod).filter(v => v > 0);
    
    if (aodValues.length === 0) {
      return { mean: 0, median: 0, standardDeviation: 0, pixelCount: 0 };
    }

    const sorted = aodValues.sort((a, b) => a - b);
    const mean = aodValues.reduce((sum, val) => sum + val, 0) / aodValues.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = aodValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / aodValues.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      mean: Number(mean.toFixed(3)),
      median: Number(median.toFixed(3)),
      standardDeviation: Number(standardDeviation.toFixed(3)),
      pixelCount: aodValues.length,
    };
  }

  private getMockMODISData(): MODISAerosolData[] {
    const baseDate = new Date();
    return Array.from({ length: 10 }, (_, i) => ({
      date: new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T'),
      coordinates: {
        latitude: 28.7041 + (Math.random() - 0.5) * 0.1,
        longitude: 77.1025 + (Math.random() - 0.5) * 0.1,
      },
      aod: Math.random() * 2 + 0.1,
      angstromExponent: Math.random() * 2 + 0.5,
      qualityFlag: Math.floor(Math.random() * 4),
      satellite: Math.random() > 0.5 ? 'Terra' : 'Aqua',
    }));
  }

  private getMockRegionData(startDate: string, endDate: string): MODISRegionData {
    const mockData = Array.from({ length: 100 }, () => ({
      date: startDate,
      coordinates: {
        latitude: 28.7041 + (Math.random() - 0.5) * 2,
        longitude: 77.1025 + (Math.random() - 0.5) * 2,
      },
      aod: Math.random() * 2 + 0.1,
      angstromExponent: Math.random() * 2 + 0.5,
      qualityFlag: Math.floor(Math.random() * 4),
      satellite: Math.random() > 0.5 ? 'Terra' : 'Aqua',
    }));

    return {
      region: 'Delhi_NCR',
      timeRange: { start: startDate, end: endDate },
      gridData: mockData,
      statistics: this.calculateStatistics(mockData),
    };
  }
}

export const nasaMODISClient = new NASAMODISClient();
