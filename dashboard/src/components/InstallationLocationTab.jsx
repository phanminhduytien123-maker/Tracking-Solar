import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_PRESET_LOCATIONS, HCMC_COORDINATES } from '../services/weatherService';

const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoicGhhbm1pbmhkdXl0aWVuMTIzIiwiYSI6ImNtYm1hZGl0MDASOXlycW9nbnV1cmM4M2IifQ.4_ZRvrf9ACzgdA1GA7DP-A';

export default function InstallationLocationTab({
  currentLocation,
  onSelectLocation,
  weatherData
}) {
  const [selectedLat, setSelectedLat] = useState(() => currentLocation?.lat || HCMC_COORDINATES.lat);
  const [selectedLon, setSelectedLon] = useState(() => currentLocation?.lon || HCMC_COORDINATES.lon);
  const [locationName, setLocationName] = useState(() => currentLocation?.locationName || currentLocation?.name || HCMC_COORDINATES.locationName);
  const [wardName, setWardName] = useState(() => currentLocation?.ward || HCMC_COORDINATES.ward);

  // Mapbox & Layer Styles
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem('solar_mapbox_token') || DEFAULT_MAPBOX_TOKEN);
  const [mapStyle, setMapStyle] = useState(() => localStorage.getItem('solar_map_style') || 'satellite'); // 'satellite' | 'streets' | 'dark' | 'osm'
  const [showTokenInput, setShowTokenInput] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);

  // Helper to build robust tile layer configuration
  const getTileConfig = (style, token) => {
    if (style === 'satellite') {
      // Google Maps Satellite + Road Labels Hybrid
      return {
        url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        options: {
          maxZoom: 20,
          subdomains: ['0', '1', '2', '3'],
          attribution: '© Google Maps'
        }
      };
    }
    if (style === 'streets') {
      // Google Maps Street View
      return {
        url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        options: {
          maxZoom: 20,
          subdomains: ['0', '1', '2', '3'],
          attribution: '© Google Maps'
        }
      };
    }
    if (style === 'dark') {
      // CartoDB Dark Matter
      return {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '© CARTO'
        }
      };
    }
    if (style === 'mapbox' && token && token.startsWith('pk.')) {
      // Custom Mapbox Satellite
      return {
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=${token}`,
        options: {
          maxZoom: 20,
          attribution: '© Mapbox'
        }
      };
    }
    // Default: CartoDB Voyager / OpenStreetMap Clean
    return {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      options: {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '© OpenStreetMap'
      }
    };
  };

  // Switch Tile Layer dynamically
  const switchMapStyle = (newStyle) => {
    setMapStyle(newStyle);
    localStorage.setItem('solar_map_style', newStyle);

    if (mapInstanceRef.current) {
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }
      const config = getTileConfig(newStyle, mapboxToken);
      const newLayer = L.tileLayer(config.url, config.options).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
      mapInstanceRef.current.invalidateSize();
    }
  };

  // Save Token
  const handleSaveToken = (token) => {
    const cleanToken = token.trim();
    setMapboxToken(cleanToken);
    localStorage.setItem('solar_mapbox_token', cleanToken);
    switchMapStyle(mapStyle);
  };

  // Sync if currentLocation prop updates from outside
  useEffect(() => {
    if (currentLocation) {
      if (currentLocation.lat) setSelectedLat(currentLocation.lat);
      if (currentLocation.lon) setSelectedLon(currentLocation.lon);
      if (currentLocation.locationName || currentLocation.name) {
        setLocationName(currentLocation.locationName || currentLocation.name);
      }
      if (currentLocation.ward) setWardName(currentLocation.ward);
    }
  }, [currentLocation]);

  // Reverse geocoding to retrieve friendly location names in Vietnamese
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
        headers: { 'Accept-Language': 'vi,en' }
      });
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const place = addr.amenity || addr.building || addr.road || addr.suburb || addr.neighbourhood || addr.quarter || 'Điểm đã chọn';
        const district = addr.city_district || addr.district || addr.county || addr.town || '';
        const city = addr.city || addr.state || 'Việt Nam';
        
        const friendlyName = [place, district, city].filter(Boolean).join(', ');
        setLocationName(friendlyName || data.display_name.split(',').slice(0, 3).join(','));
        setWardName(district ? `${district}, ${city}` : city);
      }
    } catch (err) {
      console.warn('[InstallationTab] Reverse geocode error:', err);
    }
  };

  // Update coordinates and move map pin
  const updateCoordinates = (lat, lon, name = null, ward = null) => {
    const cleanLat = Number(Number(lat).toFixed(4));
    const cleanLon = Number(Number(lon).toFixed(4));
    setSelectedLat(cleanLat);
    setSelectedLon(cleanLon);

    if (name) {
      setLocationName(name);
      setWardName(ward || '');
    } else {
      reverseGeocode(cleanLat, cleanLon);
    }

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([cleanLat, cleanLon]);
      mapInstanceRef.current.panTo([cleanLat, cleanLon], { animate: true });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    let timers = [];

    const initMap = () => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Crisp Minimalist Pin Icon
        const customIcon = L.divIcon({
          className: 'custom-solar-pin',
          html: `<div style="
            width: 30px;
            height: 30px;
            background: #18181b;
            border: 2px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: #ffffff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        });

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
          center: [selectedLat, selectedLon],
          zoom: 15,
          zoomControl: true,
          attributionControl: false
        });

        // Tile layer
        const config = getTileConfig(mapStyle, mapboxToken);
        const tileLayer = L.tileLayer(config.url, config.options).addTo(map);
        tileLayerRef.current = tileLayer;

        // Marker
        const marker = L.marker([selectedLat, selectedLon], {
          draggable: true,
          icon: customIcon
        }).addTo(map);

        // Click on map to move marker
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          updateCoordinates(lat, lng);
        });

        // Drag marker
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          updateCoordinates(pos.lat, pos.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }

      // Ensure Leaflet calculates real container size correctly
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([selectedLat, selectedLon], 15);
      }
    };

    // Staggered size invalidation to handle modal entry animation
    timers.push(setTimeout(initMap, 50));
    timers.push(setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200));
    timers.push(setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500));

    const handleResize = () => mapInstanceRef.current?.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Cleanup map when unmounting
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Search places via OpenStreetMap Nominatim
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Việt Nam')}&limit=5&addressdetails=1`, {
        headers: { 'Accept-Language': 'vi,en' }
      });
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('[InstallationTab] Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Get current device GPS Location
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false);
        const { latitude, longitude } = pos.coords;
        updateCoordinates(latitude, longitude, 'Vị trí GPS của bạn', 'Tọa độ thiết bị hiện tại');
      },
      (err) => {
        setIsGeolocating(false);
        alert('Không thể lấy vị trí GPS. Vui lòng cấp quyền truy cập vị trí cho trình duyệt.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Apply location and save
  const handleSaveLocation = () => {
    const locObj = {
      lat: Number(selectedLat),
      lon: Number(selectedLon),
      locationName: locationName || 'Phường Nhiêu Lộc, TP. Hồ Chí Minh',
      ward: wardName || 'Phường Nhiêu Lộc, TP.HCM'
    };

    localStorage.setItem('solar_custom_location', JSON.stringify(locObj));

    if (onSelectLocation) {
      onSelectLocation(locObj);
    }

    setSaveSuccessMsg(`Đã lưu vĩnh viễn tọa độ ${Number(selectedLat).toFixed(4)}°N, ${Number(selectedLon).toFixed(4)}°E (${locObj.locationName}) cho toàn hệ thống!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-4 text-zinc-100">
      
      {/* 1. Header & Overview Banner */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#131722] border border-zinc-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
              TỌA ĐỘ LẮP ĐẶT HỆ THỐNG SOLAR TRACKING
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono font-semibold border border-zinc-700">
              GPS / OPEN-METEO
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Lựa chọn tọa độ kinh độ / vĩ độ thực tế của giàn pin để đồng bộ góc mặt trời thiên văn, chỉ số bức xạ (W/m²) và thời tiết thời gian thực.
          </p>
        </div>

        {/* Current Active Location Pill */}
        <div className="px-3.5 py-2 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs font-mono shrink-0">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{selectedLat.toFixed(4)}°N, {selectedLon.toFixed(4)}°E</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-sans truncate max-w-[180px] mt-0.5">{locationName}</div>
        </div>
      </div>

      {/* Success Feedback Banner */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-lg bg-[#10241b] border border-emerald-800/80 text-emerald-300 text-xs font-semibold animate-in fade-in duration-200">
          {saveSuccessMsg}
        </div>
      )}

      {/* 2. Search Box & Quick Action Buttons */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm địa chỉ, quận huyện, tỉnh thành (VD: Tôn Đức Thắng Q7, Ninh Thuận...)"
              className="w-full px-3.5 pr-24 py-2.5 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </form>

          {/* GPS Location Button */}
          <button
            type="button"
            onClick={handleGetGPS}
            disabled={isGeolocating}
            className="px-3.5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            title="Lấy vị trí GPS từ thiết bị hiện tại"
          >
            <span>{isGeolocating ? 'Đang định vị...' : 'Vị trí GPS của tôi'}</span>
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="p-2 rounded-lg bg-[#0a0c12] border border-zinc-700 space-y-1 max-h-48 overflow-y-auto">
            <span className="text-[11px] font-bold text-zinc-400 px-2 uppercase tracking-wider block">
              Kết quả tìm kiếm ({searchResults.length}):
            </span>
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  updateCoordinates(item.lat, item.lon, item.display_name.split(',')[0], item.display_name.split(',').slice(1, 3).join(','));
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-800 text-xs text-zinc-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="truncate">{item.display_name}</span>
                <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                  {Number(item.lat).toFixed(2)}°, {Number(item.lon).toFixed(2)}°
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Leaflet Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-zinc-700 shadow-xl">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[300px] sm:h-[380px] bg-[#1a1e29]" 
          style={{ zIndex: 1 }}
        />

        {/* Map Overlay Floating Badge */}
        <div className="absolute top-3 left-3 z-[400] bg-[#0c0e14]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-700/80 text-[11px] font-mono text-zinc-300 hidden sm:flex items-center pointer-events-none shadow-lg">
          <span>Click hoặc kéo ghim để chọn tọa độ</span>
        </div>

        {/* Mapbox Layer Switcher Controls */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1 bg-[#0c0e14]/90 backdrop-blur-md p-1 rounded-lg border border-zinc-700/80 shadow-lg">
          <button
            type="button"
            onClick={() => switchMapStyle('satellite')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              mapStyle === 'satellite' ? 'bg-zinc-700 text-white border border-zinc-500 shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Bản đồ ảnh Vệ tinh"
          >
            Vệ tinh
          </button>
          <button
            type="button"
            onClick={() => switchMapStyle('streets')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              mapStyle === 'streets' ? 'bg-zinc-700 text-white border border-zinc-500 shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Bản đồ đường phố"
          >
            Đường phố
          </button>
          <button
            type="button"
            onClick={() => switchMapStyle('dark')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              mapStyle === 'dark' ? 'bg-zinc-700 text-white border border-zinc-500 shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Bản đồ giao diện tối"
          >
            Tối
          </button>
          <button
            type="button"
            onClick={() => switchMapStyle('osm')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              mapStyle === 'osm' ? 'bg-zinc-700 text-white border border-zinc-500 shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Bản đồ OSM"
          >
            OSM
          </button>
        </div>
      </div>

      {/* Mapbox Token Config Strip */}
      <div className="p-3 rounded-lg bg-[#131722] border border-zinc-700/80 text-xs flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="font-semibold">Mapbox Access Token (API Key):</span>
            <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[180px] sm:max-w-[320px]">
              {mapboxToken ? `${mapboxToken.slice(0, 20)}...${mapboxToken.slice(-10)}` : 'Chưa có Token'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-[11px] text-zinc-300 hover:text-white underline cursor-pointer font-medium"
          >
            {showTokenInput ? 'Đóng cài đặt Token' : 'Thay đổi Token'}
          </button>
        </div>

        {showTokenInput && (
          <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={mapboxToken}
              onChange={(e) => handleSaveToken(e.target.value)}
              placeholder="Dán token pk.eyJ... từ tài khoản Mapbox của bạn"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={() => handleSaveToken(mapboxToken)}
              className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-bold text-xs cursor-pointer shrink-0"
            >
              Lưu & Áp Dụng Token
            </button>
          </div>
        )}
      </div>

      {/* 4. Coordinate Details & Manual Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-[#131722] border border-zinc-700/80">
        
        {/* Selected Location Name Display */}
        <div className="sm:col-span-6 space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Địa danh / Phường / Huyện:</label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm text-white focus:outline-none focus:border-zinc-400"
            placeholder="Tên địa danh hoặc trạm giàn pin"
          />
        </div>

        {/* Latitude Input */}
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Vĩ độ (Lat):</label>
          <input
            type="number"
            step="0.0001"
            value={selectedLat}
            onChange={(e) => updateCoordinates(e.target.value, selectedLon)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-zinc-400"
          />
        </div>

        {/* Longitude Input */}
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Kinh độ (Lon):</label>
          <input
            type="number"
            step="0.0001"
            value={selectedLon}
            onChange={(e) => updateCoordinates(selectedLat, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      {/* 5. Preset Solar Power Plants & Cities in Vietnam */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
          Trạm Điện mặt trời & Địa danh tiêu biểu tại Việt Nam:
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEFAULT_PRESET_LOCATIONS.map((preset) => {
            const isCurrent = Math.abs(preset.lat - selectedLat) < 0.01 && Math.abs(preset.lon - selectedLon) < 0.01;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateCoordinates(preset.lat, preset.lon, preset.name, preset.ward)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-zinc-800 text-white border-white shadow-md'
                    : 'bg-[#131722] hover:bg-zinc-800/60 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="min-w-0">
                  <span className="font-bold text-xs block truncate text-white">{preset.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                    {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Action Buttons Bar */}
      <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => updateCoordinates(HCMC_COORDINATES.lat, HCMC_COORDINATES.lon, HCMC_COORDINATES.locationName, HCMC_COORDINATES.ward)}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Đặt lại mặc định (Phường Nhiêu Lộc, TP.HCM)
        </button>

        <button
          type="button"
          onClick={handleSaveLocation}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 transition-all cursor-pointer active:scale-95"
        >
          Lưu & Áp Dụng Tọa Độ Này
        </button>
      </div>

    </div>
  );
}
