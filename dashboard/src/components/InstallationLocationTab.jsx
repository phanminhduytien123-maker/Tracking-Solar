import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_PRESET_LOCATIONS, HCMC_COORDINATES } from '../services/weatherService';

const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoicGhhbm1pbmhkdXl0aWVuMTIzIiwiYSI6ImNtYm1hZGl0MDASOXlycW9nbnV1cmM4M2IifQ.4_ZRvrf9ACzgdA1GA7DP-A';

export default function InstallationLocationTab({
  currentLocation,
  onSelectLocation,
  weatherData,
  latestTelemetry = null,
  currentUser = null,
  onConfirmLocation = null
}) {
  const [selectedLat, setSelectedLat] = useState(() => {
    const lat = currentLocation?.lat;
    return (lat !== undefined && lat !== null && !isNaN(lat)) ? Number(lat) : HCMC_COORDINATES.lat;
  });
  const [selectedLon, setSelectedLon] = useState(() => {
    const lon = currentLocation?.lon;
    return (lon !== undefined && lon !== null && !isNaN(lon)) ? Number(lon) : HCMC_COORDINATES.lon;
  });
  const [latInput, setLatInput] = useState(() => String(currentLocation?.lat || HCMC_COORDINATES.lat));
  const [lonInput, setLonInput] = useState(() => String(currentLocation?.lon || HCMC_COORDINATES.lon));

  const parseCoordinate = (val, fallback = 0) => {
    if (val === undefined || val === null || val === '') return fallback;
    const clean = String(val).replace(/,/g, '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? fallback : num;
  };
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

  // Nguồn tọa độ SiteConfig từ Telemetry / Firebase
  const siteSource = latestTelemetry?.site?.source || latestTelemetry?.siteSource || localStorage.getItem('solar_site_source') || 'FIREBASE';
  const siteRev = latestTelemetry?.site?.rev || latestTelemetry?.siteRev || localStorage.getItem('solar_site_rev') || 1;
  const siteUpdateTime = latestTelemetry?.site?.updated_at ? new Date(latestTelemetry.site.updated_at).toLocaleTimeString('vi-VN') : null;
  
  // Trạng thái xác nhận tọa độ thực địa (site_confirmed)
  const siteConfirmed = latestTelemetry?.site?.confirmed !== undefined 
    ? Boolean(latestTelemetry.site.confirmed) 
    : (localStorage.getItem('solar_site_confirmed') === 'true');
  const siteConfirmedBy = latestTelemetry?.site?.confirmed_by || localStorage.getItem('solar_site_confirmed_by') || 'admin';
  const siteConfirmedAt = latestTelemetry?.site?.confirmed_at ? new Date(latestTelemetry.site.confirmed_at).toLocaleTimeString('vi-VN') : null;

  // Kiểm tra cảnh báo hợp lệ thời gian thực
  const isZeroIsland = Math.abs(selectedLat) < 0.0001 && Math.abs(selectedLon) < 0.0001;
  const isInvertedLatLon = selectedLat >= 102.0 && selectedLat <= 110.0 && selectedLon >= 8.0 && selectedLon <= 24.0;
  const isOutsideVn = !isInvertedLatLon && !isZeroIsland && (selectedLat < 8.0 || selectedLat > 24.0 || selectedLon < 102.0 || selectedLon > 110.0);

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
      if (currentLocation.lat !== undefined && currentLocation.lat !== null && !isNaN(currentLocation.lat)) {
        const val = Number(currentLocation.lat);
        setSelectedLat(val);
        setLatInput(String(val));
      }
      if (currentLocation.lon !== undefined && currentLocation.lon !== null && !isNaN(currentLocation.lon)) {
        const val = Number(currentLocation.lon);
        setSelectedLon(val);
        setLonInput(String(val));
      }
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
    const cleanLat = Number(parseCoordinate(lat, selectedLat).toFixed(5));
    const cleanLon = Number(parseCoordinate(lon, selectedLon).toFixed(5));
    setSelectedLat(cleanLat);
    setSelectedLon(cleanLon);
    setLatInput(String(cleanLat));
    setLonInput(String(cleanLon));

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

  const handleLatInputChange = (val) => {
    setLatInput(val);
    const parsed = parseCoordinate(val, null);
    if (parsed !== null && !isNaN(parsed)) {
      const fixed = Number(parsed.toFixed(5));
      setSelectedLat(fixed);
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([fixed, selectedLon]);
        mapInstanceRef.current.panTo([fixed, selectedLon], { animate: true });
      }
    }
  };

  const handleLonInputChange = (val) => {
    setLonInput(val);
    const parsed = parseCoordinate(val, null);
    if (parsed !== null && !isNaN(parsed)) {
      const fixed = Number(parsed.toFixed(5));
      setSelectedLon(fixed);
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([selectedLat, fixed]);
        mapInstanceRef.current.panTo([selectedLat, fixed], { animate: true });
      }
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
    const parsedLat = Number(parseCoordinate(latInput, selectedLat).toFixed(5));
    const parsedLon = Number(parseCoordinate(lonInput, selectedLon).toFixed(5));

    if (isNaN(parsedLat) || isNaN(parsedLon) || (Math.abs(parsedLat) < 0.001 && Math.abs(parsedLon) < 0.001)) {
      alert('Tọa độ không hợp lệ. Vui lòng nhập số thập phân chính xác!');
      return;
    }

    const locObj = {
      lat: parsedLat,
      lon: parsedLon,
      locationName: locationName || 'Phường Nhiêu Lộc, TP. Hồ Chí Minh',
      ward: wardName || 'Phường Nhiêu Lộc, TP.HCM'
    };

    setSelectedLat(parsedLat);
    setSelectedLon(parsedLon);
    setLatInput(String(parsedLat));
    setLonInput(String(parsedLon));

    localStorage.setItem('solar_custom_location', JSON.stringify(locObj));

    if (onSelectLocation) {
      onSelectLocation(locObj);
    }

    setSaveSuccessMsg(`Đã lưu thành công tọa độ ${parsedLat.toFixed(5)}°N, ${parsedLon.toFixed(5)}°E (${locObj.locationName})!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-4 text-zinc-900">

      {/* 1. Header & Overview Banner */}
      <div className="p-4 rounded border border-zinc-300 bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Tọa độ lắp đặt hệ thống Solar Tracking
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-zinc-600 font-mono font-medium border border-zinc-300">
              GPS / Open-Meteo
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
            Tọa độ thực địa của giàn pin phục vụ tính toán góc mặt trời thiên văn, bức xạ (W/m²) và thời tiết.
          </p>
        </div>

        {/* Current Active Location Pill with Source Badge */}
        <div className="px-3 py-2 rounded bg-white border border-zinc-300 text-xs font-mono shrink-0 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>{Number(selectedLat).toFixed(5).replace('.', ',')}°N, {Number(selectedLon).toFixed(5).replace('.', ',')}°E</span>
            </div>
            {siteSource === 'DEFAULT' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-300">
                Tọa độ mặc định (chưa xác nhận)
              </span>
            ) : siteSource === 'NVS' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-300">
                Lưu NVS cũ (chưa đọc Firebase)
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                Firebase (rev {siteRev})
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 font-sans truncate max-w-[280px]">
            {locationName} {siteUpdateTime ? `• Cập nhật: ${siteUpdateTime}` : ''}
          </div>
        </div>
      </div>

      {/* Success Feedback Banner */}
      {saveSuccessMsg && (
        <div className="p-3 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-medium">
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
              placeholder="Tìm kiếm địa chỉ, quận huyện, tỉnh thành..."
              className="w-full px-3 pr-24 py-2 rounded bg-white border border-zinc-300 text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-xs font-medium text-zinc-700 border border-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </form>

          {/* GPS Location Button */}
          <button
            type="button"
            onClick={handleGetGPS}
            disabled={isGeolocating}
            className="px-3 py-2 rounded bg-white hover:bg-zinc-50 border border-zinc-300 text-xs font-medium text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            title="Lấy vị trí GPS từ thiết bị hiện tại"
          >
            <span>{isGeolocating ? 'Đang định vị...' : 'Vị trí GPS của tôi'}</span>
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="p-2 rounded border border-zinc-300 bg-white space-y-1 max-h-48 overflow-y-auto">
            <span className="text-[11px] font-semibold text-zinc-500 px-2 uppercase tracking-wide block">
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
                className="w-full text-left px-3 py-1.5 rounded hover:bg-zinc-100 text-xs text-zinc-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="truncate">{item.display_name}</span>
                <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                  {Number(item.lat).toFixed(2).replace('.', ',')}°, {Number(item.lon).toFixed(2).replace('.', ',')}°
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Leaflet Map Container */}
      <div className="relative rounded overflow-hidden border border-zinc-300">
        <div
          ref={mapContainerRef}
          className="w-full h-[300px] sm:h-[380px] bg-zinc-100"
          style={{ zIndex: 1 }}
        />

        {/* Map Overlay Floating Badge */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 px-2.5 py-1 rounded border border-zinc-300 text-[11px] font-sans text-zinc-700 hidden sm:flex items-center pointer-events-none shadow-sm">
          <span>Click hoặc kéo ghim để chọn tọa độ</span>
        </div>

        {/* Mapbox Layer Switcher Controls */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1 bg-white/95 p-1 rounded border border-zinc-300 shadow-sm">
          <button
            type="button"
            onClick={() => switchMapStyle('satellite')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${mapStyle === 'satellite' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            title="Bản đồ ảnh Vệ tinh"
          >
            Vệ tinh
          </button>
          <button
            type="button"
            onClick={() => switchMapStyle('streets')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${mapStyle === 'streets' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            title="Bản đồ đường phố"
          >
            Đường phố
          </button>
          <button
            type="button"
            onClick={() => switchMapStyle('dark')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${mapStyle === 'dark' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            title="Bản đồ giao diện tối"
          >
            Tối
          </button>
          <button
            type="button"
            onClick={() => switchMapStyle('osm')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${mapStyle === 'osm' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            title="Bản đồ OSM"
          >
            OSM
          </button>
        </div>
      </div>

      {/* Mapbox Token Config Strip */}
      <div className="p-3 rounded border border-zinc-300 bg-zinc-50 text-xs flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-zinc-700">
            <span className="font-semibold">Mapbox API:</span>
            <span className="font-mono text-[11px] text-zinc-500 truncate max-w-[180px] sm:max-w-[320px]">
              {mapboxToken ? `${mapboxToken.slice(0, 20)}...${mapboxToken.slice(-10)}` : 'Chưa có Token'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-[11px] text-blue-700 hover:underline cursor-pointer font-medium"
          >
            {showTokenInput ? 'Đóng cài đặt Token' : 'Thay đổi API Key'}
          </button>
        </div>

        {showTokenInput && (
          <div className="pt-2 border-t border-zinc-200 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={mapboxToken}
              onChange={(e) => handleSaveToken(e.target.value)}
              placeholder="Dán token pk.eyJ... từ tài khoản Mapbox của bạn"
              className="flex-1 px-3 py-1.5 rounded bg-white border border-zinc-300 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => handleSaveToken(mapboxToken)}
              className="px-3 py-1.5 rounded bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-medium text-xs cursor-pointer shrink-0"
            >
              Lưu & Áp Dụng Token
            </button>
          </div>
        )}
      </div>

      {/* 4. Coordinate Details & Manual Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded border border-zinc-300 bg-zinc-50">

        {/* Selected Location Name Display */}
        <div className="sm:col-span-6 space-y-1">
          <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wide block">Địa danh / Tên trạm:</label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-blue-600"
            placeholder="Tên địa danh hoặc trạm giàn pin"
          />
        </div>

        {/* Latitude Input (Hỗ trợ cả dấu chấm và dấu phẩy kiểu VN) */}
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wide block">Vĩ độ (Lat):</label>
          <input
            type="text"
            inputMode="decimal"
            value={latInput}
            onChange={(e) => handleLatInputChange(e.target.value)}
            onBlur={() => {
              const p = parseCoordinate(latInput, selectedLat);
              setLatInput(String(Number(p.toFixed(5))));
            }}
            placeholder="10.78816 hoặc 10,78816"
            className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-xs sm:text-sm font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Longitude Input (Hỗ trợ cả dấu chấm và dấu phẩy kiểu VN) */}
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wide block">Kinh độ (Lon):</label>
          <input
            type="text"
            inputMode="decimal"
            value={lonInput}
            onChange={(e) => handleLonInputChange(e.target.value)}
            onBlur={() => {
              const p = parseCoordinate(lonInput, selectedLon);
              setLonInput(String(Number(p.toFixed(5))));
            }}
            placeholder="106.66617 hoặc 106,66617"
            className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-xs sm:text-sm font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Live Validation Warning Banners */}
        {isZeroIsland && (
          <div className="sm:col-span-12 p-2.5 rounded bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
            <span className="font-bold">Từ chối tọa độ:</span>
            <span>Tọa độ (0, 0) không hợp lệ (hòn đảo Null Island). Hệ thống sẽ từ chối áp dụng.</span>
          </div>
        )}

        {isInvertedLatLon && (
          <div className="sm:col-span-12 p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
            <span className="font-bold">Cảnh báo:</span>
            <span>Phát hiện vĩ độ ~{Number(selectedLat).toFixed(2).replace('.', ',')}° (dải kinh độ VN). Có thể bạn đã gõ nhầm đảo vị trí Vĩ độ và Kinh độ!</span>
          </div>
        )}

        {isOutsideVn && (
          <div className="sm:col-span-12 p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
            <span className="font-bold">Cảnh báo:</span>
            <span>Tọa độ ({Number(selectedLat).toFixed(4).replace('.', ',')}°, {Number(selectedLon).toFixed(4).replace('.', ',')}°) nằm ngoài lãnh thổ Việt Nam (8°N - 24°N, 102°E - 110°E).</span>
          </div>
        )}
      </div>

      {/* 5. Preset Solar Power Plants & Cities in Vietnam */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide block">
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
                className={`p-2.5 rounded border text-left transition-colors cursor-pointer ${isCurrent
                  ? 'bg-blue-50/70 border-[#1d4ed8] text-[#1d4ed8]'
                  : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-800'
                  }`}
              >
                <div className="min-w-0">
                  <span className="font-semibold text-xs block truncate">{preset.name}</span>
                  <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">
                    {preset.lat.toFixed(2).replace('.', ',')}°, {preset.lon.toFixed(2).replace('.', ',')}°
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Action Buttons Bar */}
      <div className="pt-3 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => updateCoordinates(HCMC_COORDINATES.lat, HCMC_COORDINATES.lon, HCMC_COORDINATES.locationName, HCMC_COORDINATES.ward)}
          className="text-xs text-zinc-600 hover:text-zinc-900 underline cursor-pointer"
        >
          Đặt lại mặc định (Phường Nhiêu Lộc, TP.HCM)
        </button>

        <button
          type="button"
          onClick={handleSaveLocation}
          className="w-full sm:w-auto px-5 py-2 rounded text-xs sm:text-sm font-semibold bg-[#1d4ed8] hover:bg-blue-800 text-white transition-colors cursor-pointer"
        >
          Lưu & Áp Dụng Tọa Độ Này
        </button>
      </div>

    </div>
  );
}
