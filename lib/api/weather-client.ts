// lib/api/weather-client.ts
import axios from 'axios';

export interface WeatherData {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  current: {
    temperature: number; // Celsius
    humidity: number; // %
    pressure: number; // hPa
    windSpeed: number; // m/s
    windDirection: number; // degrees
    windGust?: number; // m/s
    visibility: number; // km
    uvIndex: number;
    cloudCover: number; // %
  };
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  datetime: string;
  temperature: {
    min: number;
    max: number;
    current: number;
  };
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: {
    probability: number; // %
    amount: number; // mm
  };
  conditions: string;
}

export interface AirQualityWeatherCorrelation {
  timestamp: string;
  aqi: number;
  weather: WeatherData['current'];
  correlation_factors: {
    wind_dispersion_index: number;
    thermal_inversion_risk: number;
    stagnation_index: number;
    ventilation_coefficient: number;
  };
}

class WeatherClient {
  private openWeatherURL = 'https://api.openweathermap.org/data/2.5';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'demo-key';
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.openWeatherURL}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      const data = response.data;
      return {
        timestamp: new Date().toISOString(),
        location: {
          latitude,
          longitude,
          name: data.name || 'Unknown',
        },
        current: {
          temperature: data.main.temp,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: data.wind?.speed || 0,
          windDirection: data.wind?.deg || 0,
          windGust: data.wind?.gust,
          visibility: (data.visibility || 10000) / 1000, // Convert to km
          uvIndex: 0, // Need separate UV API call
          cloudCover: data.clouds?.all || 0,
        },
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.getMockWeatherData(latitude, longitude);
    }
  }

  async getWeatherForecast(
    latitude: number, 
    longitude: number, 
    days: number = 5
  ): Promise<WeatherForecast[]> {
    try {
      const response = await axios.get(`${this.openWeatherURL}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
          cnt: days * 8, // 8 forecasts per day (3-hour intervals)
        },
      });

      return response.data.list.map((item: any) => ({
        datetime: new Date(item.dt * 1000).toISOString(),
        temperature: {
          min: item.main.temp_min,
          max: item.main.temp_max,
          current: item.main.temp,
        },
        humidity: item.main.humidity,
        windSpeed: item.wind?.speed || 0,
        windDirection: item.wind?.deg || 0,
        precipitation: {
          probability: (item.pop || 0) * 100,
          amount: item.rain?.['3h'] || item.snow?.['3h'] || 0,
        },
        conditions: item.weather?.description || 'Unknown',
      }));
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return this.getMockForecastData();
    }
  }

  async getDelhiNCRWeatherStations(): Promise<WeatherData[]> {
    const stations = [
      { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
      { name: 'Gurugram', lat: 28.4595, lon: 77.0266 },
      { name: 'Noida', lat: 28.5355, lon: 77.3910 },
      { name: 'Ghaziabad', lat: 28.6692, lon: 77.4538 },
      { name: 'Faridabad', lat: 28.4089, lon: 77.3178 },
    ];

    const promises = stations.map(station => 
      this.getCurrentWeather(station.lat, station.lon)
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching multi-station weather:', error);
      return stations.map(station => 
        this.getMockWeatherData(station.lat, station.lon, station.name)
      );
    }
  }

  calculateAQIWeatherCorrelation(
    aqi: number,
    weather: WeatherData['current']
  ): AirQualityWeatherCorrelation {
    // Wind dispersion index (higher wind = better dispersion)
    const wind_dispersion_index = Math.min(weather.windSpeed / 10, 1);
    
    // Thermal inversion risk (temperature + low wind)
    const thermal_inversion_risk = weather.temperature < 15 && weather.windSpeed < 2 ? 0.8 : 0.2;
    
    // Stagnation index (low wind + high pressure)
    const stagnation_index = weather.windSpeed < 3 && weather.pressure > 1020 ? 0.9 : 0.1;
    
    // Ventilation coefficient (wind speed × mixing height estimate)
    const mixing_height_estimate = 1000 - (weather.pressure - 1013) * 10;
    const ventilation_coefficient = weather.windSpeed * mixing_height_estimate / 1000;

    return {
      timestamp: new Date().toISOString(),
      aqi,
      weather,
      correlation_factors: {
        wind_dispersion_index: Number(wind_dispersion_index.toFixed(2)),
        thermal_inversion_risk: Number(thermal_inversion_risk.toFixed(2)),
        stagnation_index: Number(stagnation_index.toFixed(2)),
        ventilation_coefficient: Number(ventilation_coefficient.toFixed(2)),
      },
    };
  }

  private getMockWeatherData(
    latitude: number, 
    longitude: number, 
    name?: string
  ): WeatherData {
    return {
      timestamp: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        name: name || 'Mock Location',
      },
      current: {
        temperature: 15 + Math.random() * 20, // 15-35°C
        humidity: 30 + Math.random() * 40, // 30-70%
        pressure: 1000 + Math.random() * 40, // 1000-1040 hPa
        windSpeed: Math.random() * 10, // 0-10 m/s
        windDirection: Math.random() * 360, // 0-360°
        visibility: 5 + Math.random() * 10, // 5-15 km
        uvIndex: Math.random() * 11, // 0-11
        cloudCover: Math.random() * 100, // 0-100%
      },
    };
  }

  private getMockForecastData(): WeatherForecast[] {
    return Array.from({ length: 40 }, (_, i) => {
      const baseDate = new Date();
      baseDate.setHours(baseDate.getHours() + i * 3);
      
      return {
        datetime: baseDate.toISOString(),
        temperature: {
          min: 10 + Math.random() * 15,
          max: 20 + Math.random() * 15,
          current: 15 + Math.random() * 20,
        },
        humidity: 30 + Math.random() * 40,
        windSpeed: Math.random() * 8,
        windDirection: Math.random() * 360,
        precipitation: {
          probability: Math.random() * 100,
          amount: Math.random() * 10,
        },
        conditions: ['Clear', 'Cloudy', 'Overcast', 'Light Rain', 'Fog'][Math.floor(Math.random() * 5)],
      };
    });
  }
}

export const weatherClient = new WeatherClient();
