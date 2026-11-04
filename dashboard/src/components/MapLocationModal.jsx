import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Search, 
  Crosshair, 
  Navigation, 
  Check, 
  Sun, 
  Cloud, 
  Compass, 
  Sparkles,
  Map as MapIcon,
  RotateCcw
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_PRESET_LOCATIONS, HCMC_COORDINATES } from '../services/weatherService';

export default function MapLocationModal({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation
}) {
  const [selectedLat, setSelectedLat] = useState(() => currentLocation?.lat || HCMC_COORDINATES.lat);
  const [selectedLon, setSelectedLon] = useState(() => currentLocation?.lon || HCMC_COORDINATES.lon);
  const [locationName, setLocationName] = useState(() => currentLocation?.locationName || currentLocation?.name || HCMC_COORDINATES.locationName);
  const [wardName, setWardName] = useState(() => currentLocation?.ward || HCMC_COORDINATES.ward);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  // Map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Reverse geocode to get friendly location name from lat/lon
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
      console.warn('[MapModal] Reverse geocode error:', err);
    }
  };

  // Handle Coordinate update
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
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Custom SVG Pin Icon
        const customIcon = L.divIcon({
          className: 'custom-solar-pin',
          html: `<div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            border: 2.5px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: #ffffff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
          center: [selectedLat, selectedLon],
          zoom: 13,
          zoomControl: true,
          attributionControl: false
        });

        // CartoDB Voyager / OpenStreetMap Clean tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);

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
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([selectedLat, selectedLon], 13);
        if (markerRef.current) {
          markerRef.current.setLatLng([selectedLat, selectedLon]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up map when component unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Search places via Nominatim
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
      console.warn('[MapModal] Search error:', err);
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

  // Apply location and close
  const handleApply = () => {
    onSelectLocation({
      lat: Number(selectedLat),
      lon: Number(selectedLon),
      locationName: locationName || 'Vị trí tùy chọn',
      ward: wardName || 'Tọa độ tùy chọn'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl modal-sheet-container">
      <div className="panel-card w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col modal-sheet-card border-white/20 max-h-[92vh]">
        
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between py-3.5 px-5 sm:px-6 border-b border-white/10 bg-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-white">
                CHỌN TỌA ĐỘ VỊ TRÍ TRÊN BẢN ĐỒ
              </h2>
              <span className="text-xs text-zinc-300 font-medium">
                Cập nhật dữ liệu thời tiết & bức xạ mặt trời theo kinh độ / vĩ độ thời gian thực
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          
          {/* 1. Search Box & GPS Action */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm địa điểm (VD: Đại học Tôn Đức Thắng, Ninh Thuận, Đà Nẵng...)"
                className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
              >
                {isSearching ? 'Đang tìm...' : 'Tìm'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGetGPS}
              disabled={isGeolocating}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
              title="Lấy tọa độ hiện tại qua GPS"
            >
              <Navigation className={`w-3.5 h-3.5 text-sky-400 ${isGeolocating ? 'animate-spin' : ''}`} />
              <span>{isGeolocating ? 'Đang định vị...' : 'Vị trí của tôi'}</span>
            </button>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="p-2 rounded-xl bg-[#121622] border border-amber-400/40 space-y-1 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-amber-300 px-2 uppercase tracking-wide">Kết quả tìm kiếm:</span>
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    updateCoordinates(item.lat, item.lon, item.display_name.split(',')[0], item.display_name.split(',').slice(1, 3).join(','));
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 text-xs text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* 2. Interactive Map Container */}
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl h-[280px] sm:h-[340px] bg-zinc-900">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Map Instruction Floating Tag */}
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-xs text-white shadow-lg pointer-events-none flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>Nhấp hoặc kéo thả ghim đến vị trí mong muốn</span>
            </div>
          </div>

          {/* 3. Selected Location Details & Manual Inputs */}
          <div className="p-4 rounded-xl bg-[#131722] border border-zinc-700/80 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            
            {/* Location friendly name */}
            <div className="sm:col-span-6 space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Địa điểm đang chọn:</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-white tracking-wide truncate">
                  {locationName}
                </span>
              </div>
              <span className="text-xs text-zinc-400 block truncate">{wardName}</span>
            </div>

            {/* Latitude Input */}
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Vĩ độ (Lat):</label>
              <input
                type="text"
                inputMode="decimal"
                value={selectedLat}
                onChange={(e) => updateCoordinates(e.target.value, selectedLon)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Longitude Input */}
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Kinh độ (Lon):</label>
              <input
                type="text"
                inputMode="decimal"
                value={selectedLon}
                onChange={(e) => updateCoordinates(selectedLat, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0c12] border border-zinc-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* 4. Quick Presets Bar (Trạm ĐMT & Thành phố tiêu biểu) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tọa độ trạm Solar & Địa điểm tiêu biểu tại Việt Nam:</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFAULT_PRESET_LOCATIONS.map((preset) => {
                const isCurrent = Math.abs(preset.lat - selectedLat) < 0.01 && Math.abs(preset.lon - selectedLon) < 0.01;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateCoordinates(preset.lat, preset.lon, preset.name, preset.ward)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-400/80 text-white shadow-md'
                        : 'bg-[#131722] hover:bg-white/10 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate">{preset.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                        {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°
                      </span>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#121620] border-t border-zinc-800 flex items-center justify-between safe-area-bottom">
          <button
            type="button"
            onClick={() => updateCoordinates(HCMC_COORDINATES.lat, HCMC_COORDINATES.lon, HCMC_COORDINATES.locationName, HCMC_COORDINATES.ward)}
            className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định (Quận 1, TP.HCM)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Áp dụng Tọa độ này</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
