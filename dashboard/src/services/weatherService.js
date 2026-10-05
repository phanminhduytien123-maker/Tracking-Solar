/**
 * Weather Service for Solar Tracking System
 * Supports Dynamic Custom Coordinates (Google Maps / OpenStreetMap / GPS / Presets)
 * Source: Open-Meteo Free Global Weather API (High-accuracy ECMWF/GFS fusion)
 */

export const HCMC_COORDINATES = {
  lat: 10.7769,
  lon: 106.7009,
  locationName: 'Quận 1, TP. Hồ Chí Minh',
  ward: 'Phường Sài Gòn (Bến Nghé)',
  timezone: 'Asia/Ho_Chi_Minh',
};

export const DEFAULT_PRESET_LOCATIONS = [
  {
    id: 'tdtu_q7',
    name: 'Đại học Tôn Đức Thắng (TDTU)',
    ward: 'Phường Tân Phong, Quận 7, TP.HCM',
    lat: 10.7324,
    lon: 106.6992,
    description: 'Trạm nghiên cứu Đồ án Tốt nghiệp Solar Tracking'
  },
  {
    id: 'hcmc_q1',
    name: 'Quận 1, TP. Hồ Chí Minh',
    ward: 'Phường Sài Gòn (Bến Nghé)',
    lat: 10.7769,
    lon: 106.7009,
    description: 'Trung tâm TP. Hồ Chí Minh'
  },
  {
    id: 'ninh_thuan_solar',
    name: 'Trạm ĐMT Thuận Nam (Ninh Thuận)',
    ward: 'Thuận Nam, Ninh Thuận',
    lat: 11.6835,
    lon: 108.9950,
    description: 'Thủ phủ năng lượng tái tạo & bức xạ mặt trời cao nhất VN'
  },
  {
    id: 'binh_thuan_solar',
    name: 'Trạm ĐMT Hàm Tân (Bình Thuận)',
    ward: 'Hàm Tân, Bình Thuận',
    lat: 11.0883,
    lon: 108.2715,
    description: 'Tiềm năng quang điện ven biển Nam Trung Bộ'
  },
  {
    id: 'da_nang',
    name: 'TP. Đà Nẵng',
    ward: 'Quận Hải Châu, Đà Nẵng',
    lat: 16.0544,
    lon: 108.2022,
    description: 'Duyên hải Miền Trung'
  },
  {
    id: 'ha_noi',
    name: 'Thủ đô Hà Nội',
    ward: 'Quận Hoàn Kiếm, Hà Nội',
    lat: 21.0285,
    lon: 105.8542,
    description: 'Đồng bằng Sông Hồng'
  },
  {
    id: 'can_tho',
    name: 'TP. Cần Thơ',
    ward: 'Quận Ninh Kiều, Cần Thơ',
    lat: 10.0452,
    lon: 105.7469,
    description: 'Đồng bằng Sông Cửu Long'
  },
  {
    id: 'nha_trang',
    name: 'TP. Nha Trang (Khánh Hòa)',
    ward: 'Nha Trang, Khánh Hòa',
    lat: 12.2388,
    lon: 109.1967,
    description: 'Bờ biển Nam Trung Bộ, nắng quanh năm'
  },
  {
    id: 'da_lat',
    name: 'TP. Đà Lạt (Lâm Đồng)',
    ward: 'Đà Lạt, Lâm Đồng',
    lat: 11.9404,
    lon: 108.4583,
    description: 'Cao nguyên Lâm Viên (Khí hậu sương mù mát mẻ)'
  }
];

// Map WMO Weather Interpretation Codes to Vietnamese text, icon types, and background theme types
export const WMO_WEATHER_MAP = {
  0: { label: 'Trời quang đãng', type: 'clear', icon: 'Sun', description: 'Trời trong xanh, bức xạ mặt trời cao' },
  1: { label: 'Ít mây, nắng nhẹ', type: 'partly_cloudy', icon: 'SunDim', description: 'Nắng ấm, một vài cụm mây rải rác' },
  2: { label: 'Mây rải rác', type: 'partly_cloudy', icon: 'CloudSun', description: 'Trời có mây, nắng gián đoạn' },
  3: { label: 'Nhiều mây, âm u', type: 'clouds', icon: 'Cloud', description: 'Trời âm u bao phủ, cường độ sáng giảm' },
  45: { label: 'Sương mù nhẹ', type: 'fog', icon: 'CloudFog', description: 'Sương mù làm giảm tầm nhìn và quang thông' },
  48: { label: 'Sương mù dày đặc', type: 'fog', icon: 'CloudFog', description: 'Sương mù dày đặc rải rác' },
  51: { label: 'Mưa phùn nhẹ', type: 'drizzle', icon: 'CloudDrizzle', description: 'Mưa phùn lất phất rải rác' },
  53: { label: 'Mưa phùn vừa', type: 'drizzle', icon: 'CloudDrizzle', description: 'Mưa phùn hạt vừa' },
  55: { label: 'Mưa phùn dày', type: 'drizzle', icon: 'CloudDrizzle', description: 'Mưa phùn diện rộng' },
  56: { label: 'Mưa phùn lạnh', type: 'drizzle', icon: 'CloudDrizzle', description: 'Mưa phùn lạnh rải rác' },
  57: { label: 'Mưa phùn buốt', type: 'drizzle', icon: 'CloudDrizzle', description: 'Mưa phùn dày hạt' },
  61: { label: 'Mưa rào nhẹ', type: 'rain', icon: 'CloudRain', description: 'Mưa rào ngắt quãng cục bộ' },
  63: { label: 'Mưa rào vừa', type: 'rain', icon: 'CloudRain', description: 'Mưa rào nhiệt đới' },
  65: { label: 'Mưa to xối xả', type: 'rain', icon: 'CloudRainWind', description: 'Mưa to tầm tã trên diện rộng' },
  66: { label: 'Mưa đóng băng', type: 'rain', icon: 'CloudRain', description: 'Mưa hạt lớn' },
  67: { label: 'Mưa to lạnh', type: 'rain', icon: 'CloudRainWind', description: 'Mưa to kèm gió' },
  71: { label: 'Tuyết nhẹ', type: 'snow', icon: 'CloudSnow', description: 'Mưa hạt băng' },
  73: { label: 'Tuyết vừa', type: 'snow', icon: 'CloudSnow', description: 'Băng giá' },
  75: { label: 'Tuyết dày', type: 'snow', icon: 'CloudSnow', description: 'Bão tuyết' },
  77: { label: 'Hạt băng', type: 'snow', icon: 'CloudSnow', description: 'Mưa đá nhỏ' },
  80: { label: 'Mưa rào thoáng qua', type: 'rain', icon: 'CloudRain', description: 'Cơn mưa rào bất chợt' },
  81: { label: 'Mưa rào nặng hạt', type: 'rain', icon: 'CloudRainWind', description: 'Mưa rào nhiệt đới nặng hạt' },
  82: { label: 'Mưa xối xả cực lớn', type: 'rain', icon: 'CloudRainWind', description: 'Mưa dông cực lớn' },
  85: { label: 'Mưa tuyết nhẹ', type: 'snow', icon: 'CloudSnow', description: 'Mưa tuyết rải rác' },
  86: { label: 'Mưa tuyết nặng', type: 'snow', icon: 'CloudSnow', description: 'Mưa tuyết lớn' },
  95: { label: 'Giông nhiệt đới', type: 'thunderstorm', icon: 'CloudLightning', description: 'Cơn giông nhiệt đới có sấm chớp' },
  96: { label: 'Giông kèm mưa rào', type: 'thunderstorm', icon: 'CloudLightning', description: 'Giông sấm sét kèm mưa lớn' },
  99: { label: 'Giông bão cực mạnh', type: 'thunderstorm', icon: 'CloudLightning', description: 'Giông sét và mưa bão dữ dội' },
};

export function getWeatherConditionInfo(code, isDay = 1) {
  const info = WMO_WEATHER_MAP[code] || {
    label: 'Thời tiết ổn định',
    type: 'partly_cloudy',
    icon: 'Sun',
    description: 'Điều kiện khí quyển bình thường'
  };

  if (!isDay) {
    if (info.type === 'clear') {
      return { ...info, label: 'Đêm quang đãng', icon: 'Moon' };
    }
    if (info.type === 'partly_cloudy') {
      return { ...info, label: 'Đêm ít mây', icon: 'CloudMoon' };
    }
    if (info.type === 'clouds') {
      return { ...info, label: 'Đêm nhiều mây', icon: 'Cloud' };
    }
  }

  return info;
}

/**
 * Fetch live weather from Open-Meteo API for any custom coordinates
 */
export async function fetchLiveWeather(customCoords = null) {
  const lat = customCoords?.lat ?? HCMC_COORDINATES.lat;
  const lon = customCoords?.lon ?? HCMC_COORDINATES.lon;
  const locationName = customCoords?.locationName || customCoords?.name || HCMC_COORDINATES.locationName;
  const ward = customCoords?.ward || HCMC_COORDINATES.ward;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,uv_index,surface_pressure&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }
    const data = await response.json();
    return parseWeatherData(data, { lat, lon, locationName, ward });
  } catch (error) {
    console.warn('[Weather Service] API fetch error, using realistic fallback:', error);
    return getFallbackWeatherData({ lat, lon, locationName, ward });
  }
}

/**
 * Format and structure raw API response
 */
function parseWeatherData(data, meta = {}) {
  const current = data.current || {};
  const daily = data.daily || {};
  const hourly = data.hourly || {};

  const weatherCode = current.weather_code ?? 1;
  const isDay = current.is_day ?? 1;
  const condition = getWeatherConditionInfo(weatherCode, isDay);

  // Parse Hourly forecast for next 24 hours
  const next24Hours = [];
  if (hourly.time && hourly.time.length) {
    const currentHourIndex = hourly.time.findIndex(t => new Date(t) >= new Date(Date.now() - 3600000));
    const startIdx = Math.max(0, currentHourIndex);
    for (let i = startIdx; i < Math.min(startIdx + 24, hourly.time.length); i++) {
      const hTime = new Date(hourly.time[i]);
      const hourCode = hourly.weather_code[i] ?? 0;
      const hourIsDay = hourly.is_day[i] ?? 1;
      next24Hours.push({
        time: hTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        fullTime: hourly.time[i],
        temp: Math.round(hourly.temperature_2m[i]),
        humidity: hourly.relative_humidity_2m[i],
        pop: hourly.precipitation_probability[i] || 0,
        weatherCode: hourCode,
        isDay: hourIsDay,
        condition: getWeatherConditionInfo(hourCode, hourIsDay)
      });
    }
  }

  // Parse 7 Days Daily Forecast
  const next7Days = [];
  if (daily.time && daily.time.length) {
    for (let i = 0; i < daily.time.length; i++) {
      const dDate = new Date(daily.time[i]);
      const dCode = daily.weather_code[i] ?? 0;
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      next7Days.push({
        date: daily.time[i],
        dayName: i === 0 ? 'Hôm nay' : dayNames[dDate.getDay()],
        formattedDate: `${dDate.getDate()}/${dDate.getMonth() + 1}`,
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min[i]),
        sunrise: daily.sunrise[i]?.split('T')[1] || '05:45',
        sunset: daily.sunset[i]?.split('T')[1] || '17:45',
        uvMax: daily.uv_index_max[i],
        weatherCode: dCode,
        condition: getWeatherConditionInfo(dCode, 1)
      });
    }
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMin;

  let timePhase = 'day';
  if (totalMinutes >= 330 && totalMinutes < 375) {
    timePhase = 'dawn';
  } else if (totalMinutes >= 375 && totalMinutes < 1045) {
    timePhase = 'day';
  } else if (totalMinutes >= 1045 && totalMinutes < 1090) {
    timePhase = 'golden_hour';
  } else {
    timePhase = 'night';
  }

  return {
    location: meta.locationName || HCMC_COORDINATES.locationName,
    ward: meta.ward || HCMC_COORDINATES.ward,
    lat: meta.lat ?? HCMC_COORDINATES.lat,
    lon: meta.lon ?? HCMC_COORDINATES.lon,
    lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    current: {
      temp: Math.round((current.temperature_2m ?? 29) * 10) / 10,
      feelsLike: Math.round((current.apparent_temperature ?? 33) * 10) / 10,
      humidity: current.relative_humidity_2m ?? 75,
      precipitation: current.precipitation ?? 0,
      rain: current.rain ?? 0,
      weatherCode: weatherCode,
      cloudCover: current.cloud_cover ?? 40,
      windSpeed: Math.round((current.wind_speed_10m ?? 8) * 10) / 10,
      windDirection: current.wind_direction_10m ?? 180,
      uvIndex: Math.round((current.uv_index ?? 3.5) * 10) / 10,
      surfacePressure: Math.round(current.surface_pressure ?? 1009),
      isDay: isDay,
      condition: condition,
      timePhase: isDay ? timePhase : 'night'
    },
    hourly: next24Hours,
    daily: next7Days,
    isFallback: false
  };
}

/**
 * Fallback data
 */
export function getFallbackWeatherData(meta = {}) {
  const now = new Date();
  const hour = now.getHours();
  const isDay = hour >= 6 && hour < 18;

  const defaultCode = isDay ? 2 : 1;
  const condition = getWeatherConditionInfo(defaultCode, isDay ? 1 : 0);
  const totalMinutes = hour * 60 + now.getMinutes();
  const timePhase = (totalMinutes >= 375 && totalMinutes < 1045) ? 'day' : (totalMinutes >= 1045 && totalMinutes < 1090 ? 'golden_hour' : 'night');

  return {
    location: meta.locationName || HCMC_COORDINATES.locationName,
    ward: meta.ward || HCMC_COORDINATES.ward,
    lat: meta.lat ?? HCMC_COORDINATES.lat,
    lon: meta.lon ?? HCMC_COORDINATES.lon,
    lastUpdated: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    current: {
      temp: isDay ? 31.5 : 26.2,
      feelsLike: isDay ? 36.0 : 28.5,
      humidity: isDay ? 72 : 88,
      precipitation: 0,
      rain: 0,
      weatherCode: defaultCode,
      cloudCover: 55,
      windSpeed: 9.5,
      windDirection: 160,
      uvIndex: isDay ? 6.5 : 0,
      surfacePressure: 1009,
      isDay: isDay ? 1 : 0,
      condition: condition,
      timePhase: timePhase
    },
    hourly: [],
    daily: [],
    isFallback: true
  };
}
