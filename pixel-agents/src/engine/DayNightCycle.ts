// ============================================
// Pixel Agents - Day/Night Cycle + Weather
// ============================================

export type TimeOfDay = 'dawn' | 'day' | 'afternoon' | 'evening' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface AtmosphereState {
  timeOfDay: TimeOfDay;
  weather: Weather;
  ambientBrightness: number; // 0 (dark) to 1 (bright)
  windowColor: string;
  overlayColor: string;
  overlayAlpha: number;
  particleType: 'none' | 'rain' | 'snow' | 'sunbeam';
}

export class DayNightCycle {
  private weather: Weather = 'clear';
  private weatherTimer: number = 0;
  private readonly weatherDurations: Record<Weather, number> = {
    clear: 120, cloudy: 90, rain: 60, snow: 80,
  };

  getState(): AtmosphereState {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const timeOfDay = this.getTimeOfDay(hour);
    const brightness = this.getBrightness(hour);

    return {
      timeOfDay,
      weather: this.weather,
      ambientBrightness: brightness,
      windowColor: this.getWindowColor(hour, this.weather),
      overlayColor: this.getOverlayColor(hour),
      overlayAlpha: this.getOverlayAlpha(hour),
      particleType: this.weather === 'rain' ? 'rain' : this.weather === 'snow' ? 'snow' : 'none',
    };
  }

  update(dt: number): void {
    this.weatherTimer += dt;
    if (this.weatherTimer > this.weatherDurations[this.weather]) {
      this.weatherTimer = 0;
      const weathers: Weather[] = ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'rain', 'snow'];
      this.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }
  }

  private getTimeOfDay(hour: number): TimeOfDay {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 14) return 'day';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
  }

  private getBrightness(hour: number): number {
    if (hour >= 8 && hour < 17) return 1;
    if (hour >= 6 && hour < 8) return (hour - 6) / 2;
    if (hour >= 17 && hour < 20) return 1 - (hour - 17) / 3;
    return 0.15;
  }

  private getWindowColor(hour: number, weather: Weather): string {
    if (weather === 'rain') return '#3a4a5e';
    if (weather === 'snow') return '#8a9aae';
    if (weather === 'cloudy') return '#5a6a7e';
    if (hour >= 6 && hour < 9) return '#ffcc66'; // sunrise
    if (hour >= 9 && hour < 16) return '#87CEEB'; // day
    if (hour >= 16 && hour < 19) return '#ff8844'; // sunset
    return '#1a1a3e'; // night
  }

  private getOverlayColor(hour: number): string {
    if (hour >= 21 || hour < 6) return '#0a0a2e';
    if (hour >= 18 && hour < 21) return '#2a1a0e';
    return '#ffffff';
  }

  private getOverlayAlpha(hour: number): number {
    if (hour >= 21 || hour < 6) return 0.08;
    if (hour >= 19 && hour < 21) return 0.04;
    return 0;
  }
}
