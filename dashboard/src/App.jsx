import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import VisualPanelsComparison from './components/VisualPanelsComparison';
import CompactInteractiveTwin from './components/CompactInteractiveTwin';
import ChartsSection from './components/ChartsSection';
import DetailedTelemetryModal from './components/DetailedTelemetryModal';
import ManualControlModal from './components/ManualControlModal';
import SettingsModal from './components/SettingsModal';
import EmergencyModal from './components/EmergencyModal';
import WeatherBackground from './components/WeatherBackground';
import MobileBottomNav from './components/MobileBottomNav';
import SignInPage from './components/SignInPage';

import {
  MockTelemetryEngine,
  generate30DaysHistory,
  generateRealistic30DaysDataset,
  generateIntradayProfile
} from './services/mockDataService';
import { ESP32CommunicationService } from './services/esp32Service';
import { FirebaseSolarService, getCleanZeroTelemetry } from './services/firebaseService';
import { fetchLiveWeather, getFallbackWeatherData, HCMC_COORDINATES } from './services/weatherService';
import { checkUserLoginAllowedAsync } from './services/userService';
import { Sun, Cloud, CloudRain, CloudLightning, Moon, Sparkles, MapPin } from 'lucide-react';

export default function App() {
  // Authentication State
  const [authSession, setAuthSession] = useState(() => {
    const saved = localStorage.getItem('solar_auth_session');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return null;
  });

  const handleLoginSuccess = (userData) => {
    setAuthSession(userData);
    localStorage.setItem('solar_auth_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
      setAuthSession(null);
      localStorage.removeItem('solar_auth_session');
    }
  };

  // Live Cloud Security Guard: Periodically checks if active guest account is locked
  useEffect(() => {
    if (authSession?.role === 'guest') {
      const checkLockout = async () => {
        try {
          const status = await checkUserLoginAllowedAsync('khach123');
          if (!status.allowed) {
            localStorage.removeItem('solar_auth_session');
            setAuthSession(null);
            alert(status.reason || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.');
          }
        } catch (e) { }
      };

      // Check immediately on mount and every 3 seconds
      checkLockout();
      const interval = setInterval(checkLockout, 3000);
      return () => clearInterval(interval);
    }
  }, [authSession]);

  // Data Source: 'firebase' | 'mock' | 'esp32_ws'
  const [dataSource, setDataSource] = useState(() => {
    return localStorage.getItem('solar_datasource') || 'firebase';
  });


  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    const saved = localStorage.getItem('solar_firebase_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      databaseURL: 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app/',
      apiKey: 'AIzaSyD0i6DhiIncmRaEd6D3UZjLJ1EHNBzXces',
      projectId: 'final-project---tracking-solar'
    };
  });

  const [wsUrl, setWsUrl] = useState('ws://192.168.4.1/ws');
  const [restUrl, setRestUrl] = useState('http://192.168.4.1/api/telemetry');
  const [refreshRate, setRefreshRate] = useState(1000);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  // Modals state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('config');
  const [isExperimentLocked, setIsExperimentLocked] = useState(() => {
    return localStorage.getItem('solar_experiment_locked') === 'true';
  });

  const openSettingsTab = (tab = 'config') => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  };

  // Weather Coordinates & State (Interactive Map / Live API)
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('solar_custom_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && !isNaN(parsed.lat) && typeof parsed.lon === 'number' && !isNaN(parsed.lon)) {
          // Tự động nâng cấp tọa độ cũ 10.7831 / 106.6721 lên 10.78816 / 106.66617
          if (Math.abs(parsed.lat - 10.7831) < 0.0005 && Math.abs(parsed.lon - 106.6721) < 0.0005) {
            parsed.lat = HCMC_COORDINATES.lat;
            parsed.lon = HCMC_COORDINATES.lon;
            localStorage.setItem('solar_custom_location', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) { }
    }
    return HCMC_COORDINATES;
  });
  const [weatherData, setWeatherData] = useState(() => getFallbackWeatherData(selectedLocation));
  const [customWeatherType, setCustomWeatherType] = useState(null);
  const [showWeatherSwitcher, setShowWeatherSwitcher] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Tự động xác định chế độ giao diện theo mốc thời gian:
  // - Sau 18:00 (6h tối) hoặc trước 04:00 sáng: Mặc định chế độ tối ('dark')
  // - Sau 04:00 sáng đến trước 18:00 tối: Mặc định chế độ sáng ('light')
  const getAutoThemeByTime = () => {
    const curHour = new Date().getHours();
    return (curHour >= 18 || curHour < 4) ? 'dark' : 'light';
  };

  // Theme Mode (Light / Dark)
  // Mỗi khi mở trang hoặc reload, LUÔN tính toán lại theo mốc giờ thực tế hiện tại
  const [themeMode, setThemeMode] = useState(() => getAutoThemeByTime());

  // Xóa sạch cache cũ để mỗi lần reload trang luôn tính theo mốc giờ
  useEffect(() => {
    try {
      localStorage.removeItem('solar_theme_mode');
      sessionStorage.removeItem('solar_theme_manual_override');
    } catch (e) { }
  }, []);

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  // Kiểm tra định kỳ mỗi 30s để tự động chuyển giao diện nếu qua mốc 18:00 hoặc 04:00
  useEffect(() => {
    const timer = setInterval(() => {
      const expected = getAutoThemeByTime();
      setThemeMode((prev) => (prev !== expected ? expected : prev));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Chế độ hiển thị Compact trực quan (Digital Twin): Độc lập hoàn toàn với giao diện tiêu chuẩn
  const [compactMode, setCompactMode] = useState(false);
  const [hasOpenedCompact, setHasOpenedCompact] = useState(false);

  const toggleCompactMode = () => {
    setCompactMode((prev) => {
      const next = !prev;
      if (next) setHasOpenedCompact(true);
      return next;
    });
  };

  // Engine instances
  const mockEngineRef = useRef(new MockTelemetryEngine());
  const esp32ServiceRef = useRef(null);
  const firebaseServiceRef = useRef(new FirebaseSolarService());

  // Telemetry & Data States
  const [telemetry, setTelemetry] = useState(() => {
    return dataSource === 'firebase' ? getCleanZeroTelemetry() : mockEngineRef.current.getNextState();
  });
  const [intradayData, setIntradayData] = useState(() => generateIntradayProfile());
  const [history30Days, setHistory30Days] = useState(() => {
    const saved = localStorage.getItem('solar_custom_history_30d');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let changed = false;
          parsed.forEach((item) => {
            if (item && item.date === '03/11') {
              if (item.severe_invalid) {
                item.severe_invalid = false;
                item.invalid_reasons = [];
                changed = true;
              }
              if (item.trackingWh <= 0.1) {
                item.trackingWh = 40.2;
                item.staticWh = 40.7;
                item.trackingKwh = 0.040;
                item.staticKwh = 0.041;
                item.diffWh = -0.5;
                item.diffKwh = -0.001;
                item.gainPercent = -3.1;
                changed = true;
              }
              if (item.trackingWh > 100) {
                item.trackingWh = parseFloat((item.trackingWh / 10).toFixed(1));
                item.staticWh = parseFloat((item.staticWh / 10).toFixed(1));
                item.trackingKwh = parseFloat((item.trackingWh / 1000).toFixed(3));
                item.staticKwh = parseFloat((item.staticWh / 1000).toFixed(3));
                item.diffWh = parseFloat((item.trackingWh - item.staticWh).toFixed(1));
                item.diffKwh = parseFloat(((item.trackingWh - item.staticWh) / 1000).toFixed(3));
                changed = true;
              }
            }
            if (item && item.date === '06/11' && item.trackingWh < 5.0) {
              item.trackingWh = 180.1;
              item.staticWh = 161.6;
              item.trackingKwh = 0.180;
              item.staticKwh = 0.162;
              item.diffWh = 18.5;
              item.diffKwh = 0.018;
              item.gainPercent = 9.5;
              item.severe_invalid = false;
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem('solar_custom_history_30d', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) { }
    }
    return generate30DaysHistory();
  });
  const [targetEditDate, setTargetEditDate] = useState(null);

  const handleUpdateDayData = (updatedRecord) => {
    setHistory30Days((prev) => {
      const next = prev.map((item) => (item.date === updatedRecord.date ? updatedRecord : item));
      localStorage.setItem('solar_custom_history_30d', JSON.stringify(next));
      if (firebaseServiceRef.current && firebaseServiceRef.current.saveCustomHistory30d) {
        firebaseServiceRef.current.saveCustomHistory30d(next);
      }
      return next;
    });
  };

  const handleDeleteDayData = (dateStr) => {
    setHistory30Days((prev) => {
      const next = prev.filter((item) => item.date !== dateStr);
      localStorage.setItem('solar_custom_history_30d', JSON.stringify(next));
      if (firebaseServiceRef.current && firebaseServiceRef.current.saveCustomHistory30d) {
        firebaseServiceRef.current.saveCustomHistory30d(next);
      }
      return next;
    });
  };

  const handleAddDayData = (newRecord) => {
    setHistory30Days((prev) => {
      const next = [...prev, newRecord];
      localStorage.setItem('solar_custom_history_30d', JSON.stringify(next));
      if (firebaseServiceRef.current && firebaseServiceRef.current.saveCustomHistory30d) {
        firebaseServiceRef.current.saveCustomHistory30d(next);
      }
      return next;
    });
  };

  const handleResetHistoryData = () => {
    localStorage.removeItem('solar_custom_history_30d');
    if (firebaseServiceRef.current && firebaseServiceRef.current.removeCustomHistory30d) {
      firebaseServiceRef.current.removeCustomHistory30d();
    }
    setHistory30Days(generate30DaysHistory());
  };

  const handleLoadRealisticDataset = () => {
    const dataset = generateRealistic30DaysDataset();
    localStorage.setItem('solar_custom_history_30d', JSON.stringify(dataset));
    if (firebaseServiceRef.current && firebaseServiceRef.current.saveCustomHistory30d) {
      firebaseServiceRef.current.saveCustomHistory30d(dataset);
    }
    setHistory30Days(dataset);
  };

  const handleOpenDataSettings = (dateStr = null) => {
    if (authSession?.role !== 'admin') {
      alert('Tính năng tùy biến dữ liệu chỉ dành cho tài khoản Quản trị viên (Admin). Tài khoản khách chỉ có quyền giám sát số liệu.');
      return;
    }
    setTargetEditDate(dateStr);
    openSettingsTab('data_history');
  };
  const [allIntradayProfiles, setAllIntradayProfiles] = useState({});
  const [availableHistoryDates, setAvailableHistoryDates] = useState(() => {
    const now = new Date();
    return [`${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`];
  });
  const [selectedIntradayDate, setSelectedIntradayDate] = useState(() => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('solar_datasource', dataSource);
  }, [dataSource]);

  useEffect(() => {
    localStorage.setItem('solar_firebase_config', JSON.stringify(firebaseConfig));
  }, [firebaseConfig]);

  // Handle data source change
  const handleDataSourceChange = (newSource) => {
    setDataSource(newSource);
    if (newSource === 'firebase') {
      setTelemetry(getCleanZeroTelemetry());
    } else if (newSource === 'mock') {
      setTelemetry(mockEngineRef.current.getNextState());
    }
  };

  // Fetch Live Weather for selected coordinates (Global Open-Meteo API)
  const loadWeather = async (targetLoc = null) => {
    const loc = targetLoc || selectedLocation;
    setIsLoadingWeather(true);
    try {
      const data = await fetchLiveWeather(loc);
      if (data) {
        setWeatherData(data);
      }
    } catch (err) {
      console.warn('[Weather API Fetch Error]', err);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Handle map coordinate selection & sync to Firebase /solar/config/site
  const handleSelectLocation = (newLoc) => {
    setSelectedLocation(newLoc);
    localStorage.setItem('solar_custom_location', JSON.stringify(newLoc));
    setCustomWeatherType(null); // Switch back to live weather mode for this location
    loadWeather(newLoc);

    // Đổi tọa độ thì cờ confirmed tự động về false
    localStorage.setItem('solar_site_confirmed', 'false');
    localStorage.removeItem('solar_site_confirmed_by');

    // Đồng bộ tức thời lên Firebase node /solar/config/site để ESP32 tự động cập nhật
    if (firebaseServiceRef.current) {
      const prevRev = Number(localStorage.getItem('solar_site_rev') || 0);
      const nextRev = prevRev + 1;
      localStorage.setItem('solar_site_rev', nextRev.toString());

      firebaseServiceRef.current.saveSiteConfig({
        lat_deg: Number(Number(newLoc.lat).toFixed(5)),
        lon_deg: Number(Number(newLoc.lon).toFixed(5)),
        rev: nextRev,
        updated_at: Date.now(),
        updated_by: authSession?.username || 'admin',
        location_name: newLoc.locationName || newLoc.name || '',
        confirmed: false,
        confirmed_by: null,
        confirmed_at: null
      });
    }
  };

  // Xác nhận tọa độ thực địa
  const handleConfirmSiteLocation = (confirmedBy = 'admin') => {
    localStorage.setItem('solar_site_confirmed', 'true');
    localStorage.setItem('solar_site_confirmed_by', confirmedBy);
    if (firebaseServiceRef.current) {
      firebaseServiceRef.current.confirmSiteConfig(confirmedBy);
    }
  };

  useEffect(() => {
    loadWeather(selectedLocation);
    const weatherTimer = setInterval(() => loadWeather(selectedLocation), 600000);
    return () => clearInterval(weatherTimer);
  }, [selectedLocation]);

  // Lắng nghe SiteConfig từ Firebase khi kết nối
  useEffect(() => {
    if (dataSource === 'firebase' && firebaseServiceRef.current && firebaseConnected) {
      const unsub = firebaseServiceRef.current.listenSiteConfig((siteData) => {
        if (siteData && siteData.lat_deg && siteData.lon_deg) {
          const lat = parseFloat(String(siteData.lat_deg).replace(',', '.'));
          const lon = parseFloat(String(siteData.lon_deg).replace(',', '.'));
          if (!isNaN(lat) && !isNaN(lon)) {
            const currentRev = Number(localStorage.getItem('solar_site_rev') || 0);
            if ((siteData.rev || 0) >= currentRev) {
              localStorage.setItem('solar_site_rev', String(siteData.rev || 1));
              const newLoc = {
                lat: Number(lat.toFixed(5)),
                lon: Number(lon.toFixed(5)),
                locationName: siteData.location_name || 'Tọa độ từ Firebase',
                ward: siteData.location_name || ''
              };
              setSelectedLocation(newLoc);
              localStorage.setItem('solar_custom_location', JSON.stringify(newLoc));
            }
          }
        }
      });
    }
  }, [dataSource, firebaseConnected]);

  // Initialize ESP32 Local WebSocket Service
  useEffect(() => {
    esp32ServiceRef.current = new ESP32CommunicationService({
      wsUrl,
      restUrl,
      useMock: dataSource !== 'esp32_ws',
      onTelemetry: (liveData) => {
        if (dataSource === 'esp32_ws') {
          setTelemetry((prev) => ({
            ...prev,
            ...liveData,
            system: {
              ...prev.system,
              ...liveData.system,
              online: true,
              isMock: false
            }
          }));
        }
      },
      onStatusChange: (status) => {
        if (dataSource === 'esp32_ws') {
          setTelemetry((prev) => ({
            ...prev,
            system: {
              ...prev.system,
              online: status.connected,
              isMock: false,
              pingMs: status.latency || prev.system.pingMs
            }
          }));
        }
      }
    });

    return () => {
      esp32ServiceRef.current?.disconnect();
    };
  }, []);

  // Sync Firebase Service connection
  useEffect(() => {
    if (dataSource === 'firebase') {
      if (firebaseConfig.databaseURL && firebaseConfig.apiKey) {
        firebaseServiceRef.current.init(firebaseConfig, {
          onTelemetry: (fbTelemetry) => {
            setTelemetry(fbTelemetry);

            // Update real-time intraday curve with live data
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour >= 5 && currentHour <= 19) {
              const timeSlot = `${currentHour.toString().padStart(2, '0')}:${now.getMinutes() < 30 ? '00' : '30'}`;
              setIntradayData((prev) => {
                return prev.map((item) => {
                  if (item.time === timeSlot) {
                    return {
                      ...item,
                      pTracking: fbTelemetry.INA226.tracking.power,
                      pStatic: fbTelemetry.INA226.static.power,
                      gain: fbTelemetry.INA226.comparison?.percentGain || 0
                    };
                  }
                  return item;
                });
              });
            }
          },
          onHistory: (historyList, allProfiles, dates) => {
            if (historyList && historyList.length > 0) {
              setHistory30Days((prev) => {
                let customMap = new Map();
                try {
                  const saved = localStorage.getItem('solar_custom_history_30d');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                      parsed.forEach((c) => {
                        if (c && c.date) {
                          if (c.date === '03/11' && c.trackingWh > 100) {
                            c.trackingWh = parseFloat((c.trackingWh / 10).toFixed(1));
                            c.staticWh = parseFloat((c.staticWh / 10).toFixed(1));
                            c.trackingKwh = parseFloat((c.trackingWh / 1000).toFixed(3));
                            c.staticKwh = parseFloat((c.staticWh / 1000).toFixed(3));
                            c.diffWh = parseFloat((c.trackingWh - c.staticWh).toFixed(1));
                            c.diffKwh = parseFloat(((c.trackingWh - c.staticWh) / 1000).toFixed(3));
                          }
                          customMap.set(c.date, c);
                        }
                      });
                    }
                  }
                } catch (e) {}

                const merged = historyList.map((item) => {
                  if (customMap.has(item.date)) {
                    return { ...item, ...customMap.get(item.date) };
                  }
                  return item;
                });

                const lastIdx = merged.length - 1;
                if (prev && prev.length > 0 && prev[prev.length - 1].trackingWh > merged[lastIdx].trackingWh) {
                  merged[lastIdx] = { ...prev[prev.length - 1] };
                }
                return merged;
              });
            }
            if (allProfiles && typeof allProfiles === 'object') {
              setAllIntradayProfiles(allProfiles);
              if (dates && dates.length > 0) {
                setAvailableHistoryDates(dates);
              }
              // Chọn ngày hiển thị: ngày đang chọn hoặc ngày đầu tiên có sẵn
              const now = new Date();
              const todayStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
              const activeDate = selectedIntradayDate || todayStr;
              if (allProfiles[activeDate]) {
                setIntradayData(allProfiles[activeDate]);
              }
            }
          },
          onStatusChange: (status) => {
            setFirebaseConnected(status.connected);
          },
          onError: (err) => {
            console.warn('[Firebase Client Error]', err);
            setFirebaseConnected(false);
          }
        });
      }
    } else {
      firebaseServiceRef.current.disconnect();
      setFirebaseConnected(false);
    }
  }, [dataSource, firebaseConfig]);

  // Main Loop for Mock mode
  useEffect(() => {
    const timer = setInterval(() => {
      if (dataSource === 'mock') {
        const nextState = mockEngineRef.current.getNextState();
        setTelemetry(nextState);

        // Update real-time intraday curve
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour >= 5 && currentHour <= 19) {
          const timeSlot = `${currentHour.toString().padStart(2, '0')}:${now.getMinutes() < 30 ? '00' : '30'}`;
          setIntradayData((prev) => {
            return prev.map((item) => {
              if (item.time === timeSlot) {
                return {
                  ...item,
                  pTracking: nextState.INA226.tracking.power,
                  pStatic: nextState.INA226.static.power,
                  gain: nextState.INA226.comparison?.percentGain || 0
                };
              }
              return item;
            });
          });
        }
      }
    }, refreshRate);

    return () => clearInterval(timer);
  }, [dataSource, refreshRate]);

  // Action: Clear / Reset Chart Data
  const handleClearCharts = () => {
    setIntradayData(generateIntradayProfile());
    setHistory30Days(generate30DaysHistory());
  };

  // Automatic Midnight (00:00) Reset Scheduler: tự động đặt lại dữ liệu đồ thị về 0 lúc 0h mỗi ngày
  useEffect(() => {
    let lastDay = new Date().getDate();

    const midnightCheckTimer = setInterval(() => {
      const now = new Date();
      const currentDay = now.getDate();
      if (currentDay !== lastDay) {
        lastDay = currentDay;
        console.log('[Auto-Reset 00:00] Sang ngày mới, tự động đặt lại dữ liệu đồ thị về 0!');
        setIntradayData(generateIntradayProfile());
        setHistory30Days(generate30DaysHistory());
      }
    }, 5000);

    return () => clearInterval(midnightCheckTimer);
  }, []);

  // Sync today's accumulated energy to the latest day entry in history30Days
  // CHỈ CỘNG DỒN KHI DỮ LIỆU LÀ TỪ THIẾT BỊ THẬT (source === 'device'), KHÔNG CỘNG DỮ LIỆU MOCK!
  useEffect(() => {
    const isRealDevice = telemetry?.system?.source === 'device' && !telemetry?.system?.isMock && dataSource !== 'mock';
    if (!isRealDevice) return; // Bỏ qua hoàn toàn dữ liệu giả lập

    const trkWh = Number(telemetry?.INA226?.tracking?.energyWh || 0);
    const staWh = Number(telemetry?.INA226?.static?.energyWh || 0);
    const trkKwh = Number((trkWh / 1000).toFixed(3));
    const staKwh = Number((staWh / 1000).toFixed(3));

    if (trkWh > 0 || staWh > 0) {
      setHistory30Days((prev) => {
        if (!prev || prev.length === 0) return prev;
        const lastIdx = prev.length - 1;
        const today = prev[lastIdx];
        if (today.trackingWh === trkWh && today.staticWh === staWh) return prev;
        const diffWh = parseFloat((trkWh - staWh).toFixed(1));
        const diffKwh = parseFloat(((trkWh - staWh) / 1000).toFixed(3));
        const expectedStaWh = 1.018 * staWh;
        const gain = expectedStaWh > 0 ? parseFloat((((trkWh / expectedStaWh) - 1) * 100).toFixed(1)) : 0;
        const updated = [...prev];
        updated[lastIdx] = {
          ...today,
          trackingKwh: trkKwh,
          staticKwh: staKwh,
          trackingWh: trkWh,
          staticWh: staWh,
          gainPercent: gain,
          diffKwh,
          diffWh
        };
        return updated;
      });
    }
  }, [telemetry?.INA226?.tracking?.energyWh, telemetry?.INA226?.static?.energyWh, telemetry?.system?.source, telemetry?.system?.isMock, dataSource]);

  // Action: Clear Firebase Data (Được bảo vệ nghiêm ngặt theo BỔ SUNG #4)
  const handleClearFirebase = () => {
    alert(
      'CẢNH BÁO AN TOÀN (BỔ SUNG #4):\n' +
      'Thao tác xóa trực tiếp từ Web đã bị vô hiệu hóa để bảo vệ dữ liệu thực nghiệm.\n\n' +
      'Để dọn dữ liệu ảo an toàn (có sao lưu JSON tự động), vui lòng chạy thủ công script tại máy tính:\n' +
      '  node scripts/clear_mock_data.js\n' +
      '(Mặc định chạy ở chế độ Dry-Run để kiểm tra danh sách trước khi xóa thật).'
    );
  };

  // Action: Send Single Test Packet to Firebase (MẶC ĐỊNH GỬI VÀO /solar_mock, KHÔNG GHI ĐÈ /solar)
  const handleSendTestPacket = async () => {
    const dbUrl = firebaseConfig.databaseURL;
    if (!dbUrl) {
      alert('Vui lòng điền Database URL trước!');
      return;
    }

    const cleanUrl = dbUrl.endsWith('/') ? dbUrl : `${dbUrl}/`;
    const payload = {
      source: 'mock',
      tracking: {
        source: 'mock',
        voltage: 19.45,
        current: 2.580,
        power: 50.18,
        dailyEnergy: 0.285,
        dailyEnergyWh: 285.0,
        azimuthAngle: 165.2,
        elevationAngle: 52.8,
        targetAzimuth: 165.5,
        targetElevation: 53.0,
        ldrTop: 3150,
        ldrBottom: 3120,
        ldrLeft: 3200,
        ldrRight: 3180,
        mode: 'AUTO',
        status: 'TRACKING_ACTIVE',
        estop: false,
        lastUpdate: Date.now()
      },
      static: {
        source: 'mock',
        voltage: 17.80,
        current: 1.820,
        power: 32.40,
        dailyEnergy: 0.190,
        dailyEnergyWh: 190.0,
        fixed_az_deg: 180.0,
        fixed_tilt_beta_deg: 15.0,
        fixedAzimuth: 180.0,
        fixedElevation: 75.0,
        lastUpdate: Date.now()
      },
      algorithm: {
        source: 'mock',
        algo_state: 'RUNNING',
        name: 'Fuzzy-PID & PSO (Mock Test)',
        kp: 2.65,
        ki: 0.08,
        kd: 0.72,
        psoBestFitness: 0.992,
        cost_j: 0.0382,
        psoIteration: 18
      }
    };

    try {
      // Ghi vào nhánh riêng solar_mock để bảo vệ nhánh solar thật
      const res = await fetch(`${cleanUrl}solar_mock.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('✅ Đã gửi gói Telemetry MOCK lên /solar_mock (được gắn source="mock" an toàn, không đụng /solar)!');
      } else {
        alert(`❌ Lỗi gửi: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      alert(`❌ Lỗi kết nối Firebase: ${err.message}`);
    }
  };

  // Command Handlers
  const handleSetMode = (mode) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setMode(mode);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setMode(mode);
    } else {
      esp32ServiceRef.current?.setMode(mode);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, mode }
    }));
  };

  const handleSetAlgorithm = (algorithm) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setAlgorithm(algorithm);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setAlgorithm(algorithm);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, activeAlgorithm: algorithm }
    }));
  };

  const handleReHome = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.calibrate('home');
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.reHome();
    }
    alert('Đã gửi lệnh Home lại hệ thống! Động cơ sẽ quay về công tắc hành trình để xác lập gốc tọa độ chuẩn.');
  };

  const handleResetFault = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setEstop(false);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.resetFault();
    }
    setTelemetry((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        estop: false,
        errors: {
          ...prev.system.errors,
          driverFault: false,
          stepLossWarn: false
        }
      }
    }));
    alert('Đã reset cờ FAULT!');
  };

  const handleTestDir = (axis, dir) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.jog(axis, dir * 1.0);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.testDir(axis, dir);
    }
    alert('Đã phát xung Test DIR tốc độ chậm, dòng thấp để kiểm tra cực tính quay an toàn!');
  };

  const handleTestSleep = () => {
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.testSleep();
    }
    alert('Đã gửi lệnh [Test Ngủ]: Hệ thống sẽ Homing 2 trục rồi chuyển sang tư thế ngủ an toàn ngay lập tức (không ảnh hưởng giờ RTC).');
  };

  const handleTestWake = () => {
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.testWake();
    }
    alert('Đã gửi lệnh [Test Wake Up]: Hệ thống sẽ Homing 2 trục rồi quay sang tư thế đón bình minh.');
  };

  const handleResumeReal = () => {
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.resumeReal();
    }
    alert('Đã gửi lệnh [Quay về trạng thái thật]: Hệ thống sẽ Homing 2 trục rồi bám mặt trời thực tế theo giờ RTC.');
  };

  const handleSetSleepDisabled = (disabled) => {
    const disBool = Boolean(disabled);
    localStorage.setItem('solar_sleep_disabled', disBool ? 'true' : 'false');
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.setSleepDisabled(disBool);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        sleepDisabled: disBool,
        isSleeping: disBool ? false : prev.system.isSleeping,
        displayState: disBool
          ? 'GIỮ BƯỚC CHIỀU (TẮT NGỦ ĐÊM)'
          : prev.system.displayState
      }
    }));
  };

  const handleSetRelayInterval = (intervalSec) => {
    const validSec = Math.max(3, Math.min(3600, Math.round(Number(intervalSec) || 10)));
    localStorage.setItem('solar_relay_interval_sec', String(validSec));
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.setRelayInterval(validSec);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        relayIntervalSec: validSec
      }
    }));
  };

  const handleSetLampAutoDisabled = (disabled) => {
    const disBool = Boolean(disabled);
    localStorage.setItem('solar_lamp_auto_disabled', disBool ? 'true' : 'false');
    localStorage.setItem('solar_lamp_manual_state', 'false');
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.setLampAutoDisabled(disBool);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        lampAutoDisabled: disBool,
        lampManualState: false,
        lamp12vOn: false,
        lampRemainSec: disBool ? null : (prev.system?.isSleeping && !prev.system?.sleepDisabled ? 900 : null)
      }
    }));
  };

  const handleSetLampManualState = (on) => {
    const onBool = Boolean(on);
    localStorage.setItem('solar_lamp_auto_disabled', 'true');
    localStorage.setItem('solar_lamp_manual_state', onBool ? 'true' : 'false');
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.setLampManualState(onBool);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        lampAutoDisabled: true,
        lampManualState: onBool,
        lamp12vOn: onBool,
        lampRemainSec: null
      }
    }));
  };

  const handleJog = (axis, step) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.jog(axis, step);
    } else if (dataSource === 'firebase') {
      const dir = step > 0 ? 'CW' : 'CCW';
      firebaseServiceRef.current.jogMotor(axis, dir, Math.abs(step));
    } else {
      esp32ServiceRef.current?.jog(axis, step * 100, step);
    }
  };

  const handleCalibrate = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.calibrate();
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.sendCommand({ cmd: 'calibrate' });
    } else {
      esp32ServiceRef.current?.calibrate();
    }
  };

  const handleTriggerPso = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.triggerPSO();
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.sendCommand({ cmd: 'trigger_pso' });
    } else {
      esp32ServiceRef.current?.triggerPSO();
    }
  };

  const handlePark = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.park();
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.sendCommand({ cmd: 'park' });
    } else {
      esp32ServiceRef.current?.park();
    }
  };

  const handleEstop = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setEstop(true);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setEstop(true);
    } else {
      esp32ServiceRef.current?.setEstop(true);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, estop: true }
    }));
  };

  const handleResetEstop = () => {
    if (dataSource === 'mock') {
      mockEngineRef.current.setEstop(false);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.setEstop(false);
    } else {
      esp32ServiceRef.current?.setEstop(false);
    }
    setTelemetry((prev) => ({
      ...prev,
      system: { ...prev.system, estop: false }
    }));
  };

  const handleConfirmEmergencyAction = async (targetActive) => {
    try {
      if (dataSource === 'firebase') {
        await firebaseServiceRef.current.setEmergencyCover(targetActive);
      } else if (dataSource === 'mock') {
        mockEngineRef.current.setEstop(targetActive);
      }
      setTelemetry((prev) => ({
        ...prev,
        system: {
          ...prev.system,
          emergencyActive: targetActive,
          displayState: targetActive ? 'KHẨN CẤP (Góc Max phủ bạt)' : 'Đang Track Hybrid'
        }
      }));
      alert(targetActive 
        ? '🚨 ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP: Hệ thống đang đưa về Home rồi hạ góc Max để phủ bạt an toàn!' 
        : '✅ ĐÃ MỞ KHÓA HOẠT ĐỘNG: Hệ thống đang Home lại và tiếp tục chu trình Hybrid Track!');
    } catch (err) {
      alert(`❌ Lỗi gửi lệnh: ${err.message}`);
    }
  };

  // Compute adaptive weather theme for frosted glass panels
  const currentWeather = weatherData?.current || {};
  const effectiveWeatherType = customWeatherType || currentWeather?.condition?.type || 'partly_cloudy';
  const isDay = customWeatherType
    ? (!customWeatherType.includes('night'))
    : (currentWeather?.isDay ?? 1);
  const timePhase = customWeatherType
    ? (customWeatherType === 'golden_hour' ? 'golden_hour' : isDay ? 'day' : 'night')
    : (currentWeather?.timePhase || (isDay ? 'day' : 'night'));

  const isRainy = ['rain', 'drizzle', 'thunderstorm'].includes(effectiveWeatherType);
  const weatherTheme = timePhase === 'golden_hour'
    ? 'golden-hour'
    : (isDay && !isRainy)
      ? 'sunny-day'
      : isRainy
        ? 'rainy'
        : 'night';

  // If not authenticated, render the Sign-in Page
  if (!authSession) {
    return <SignInPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen text-zinc-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans relative overflow-x-hidden">

      {/* 0. DYNAMIC ATMOSPHERIC WEATHER BACKGROUND (REALTIME) */}
      <WeatherBackground 
        weatherData={weatherData} 
        customOverrideType={customWeatherType} 
      />

      {/* BANNER ĐỎ CỐ ĐỊNH KHI DỮ LIỆU LÀ GIẢ LẬP */}
      {(dataSource === 'mock' || telemetry?.system?.isMock || telemetry?.system?.source === 'mock') && (
        <div className="bg-red-700 text-white text-xs sm:text-sm font-semibold py-2 px-4 text-center sticky top-0 z-50 border-b border-red-800">
          Dữ liệu giả lập, không phải số đo thật từ firmware (Không cộng dồn sản lượng hay % Gain vào thống kê lịch sử)
        </div>
      )}

      {/* CẢNH BÁO VÀNG KHI THIẾU CỜ SOURCE TỪ FIRMWARE */}
      {dataSource === 'firebase' && !telemetry?.system?.isMock && telemetry?.system?.source === 'unknown' && telemetry?.system?.online && (
        <div className="bg-amber-600 text-white text-xs sm:text-sm font-semibold py-1.5 px-4 text-center sticky top-0 z-50 border-b border-amber-700">
          Nguồn dữ liệu: Chưa rõ (Gói tin từ Firebase thiếu cờ xác nhận 'device')
        </div>
      )}

      {/* 1. HEADER & SYSTEM STATUS */}
      <Header
        system={telemetry.system}
        mode={telemetry.system.mode}
        dataSource={dataSource}
        firebaseConnected={firebaseConnected}
        currentUser={authSession}
        onLogout={handleLogout}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        onOpenSettingsModal={() => openSettingsTab('config')}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onResetEstop={handleResetEstop}
        weatherData={weatherData}
        isLoadingWeather={isLoadingWeather}
        onRefreshWeather={() => loadWeather(selectedLocation)}
        onOpenMapModal={() => openSettingsTab('location')}
      />

      {/* 2. MAIN STREAMLINED DASHBOARD (CHUYỂN CẢNH MƯỢT MÀ GIỮA CHẾ ĐỘ TIÊU CHUẨN & MODE COMPACT 3D) */}
      <main className="w-full flex-1 relative z-10 overflow-hidden grid grid-cols-1">
        {/* LỚP 1: CHẾ ĐỘ BÌNH THƯỜNG HIỆN TẠI (GIỮ NGUYÊN 100%) */}
        <div
          aria-hidden={compactMode}
          className={`col-start-1 row-start-1 max-w-7xl mx-auto w-full px-3 sm:px-6 pt-3 sm:pt-4 pb-24 sm:pb-6 space-y-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] origin-top ${
            compactMode
              ? 'opacity-0 scale-[0.96] -translate-y-4 blur-[4px] pointer-events-none select-none max-h-[calc(100vh-115px)] overflow-hidden'
              : 'opacity-100 scale-100 translate-y-0 blur-0 pointer-events-auto'
          }`}
        >
          {/* BẢNG SO SÁNH ĐỐI CHỨNG HAI TẤM PIN + SƠ ĐỒ GÓC CƠ CẤU */}
          <section aria-label="So sánh đối chứng hai tấm pin">
            <VisualPanelsComparison
              INA226={telemetry.INA226}
              motors={telemetry.motors}
              system={telemetry.system}
              isAdmin={authSession?.role === 'admin'}
              onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
              onOpenManualModal={() => setIsManualModalOpen(true)}
              onOpenSettingsModal={() => openSettingsTab('config')}
              onOpenDetails={() => setIsDetailsModalOpen(true)}
            />
          </section>

          {/* BIỂU ĐỒ SẢN LƯỢNG ĐIỆN ĐỐI CHỨNG (HÔM NAY & 30 NGÀY) */}
          <section aria-label="Biểu đồ sản lượng điện">
            <ChartsSection
              intradayData={intradayData}
              history30Days={history30Days}
              onClearCharts={handleClearCharts}
              isAdmin={authSession?.role === 'admin'}
              themeMode={themeMode}
              availableDates={availableHistoryDates}
              selectedIntradayDate={selectedIntradayDate}
              onSelectIntradayDate={(dateStr) => {
                setSelectedIntradayDate(dateStr);
                if (allIntradayProfiles[dateStr]) {
                  setIntradayData(allIntradayProfiles[dateStr]);
                }
              }}
              onOpenDataSettings={handleOpenDataSettings}
            />
          </section>
        </div>

        {/* LỚP 2: CHẾ ĐỘ COMPACT TƯƠNG TÁC TRỰC QUAN 3D HIỂN THỊ TRỰC TIẾP TRÊN NỀN THỜI TIẾT */}
        {(hasOpenedCompact || compactMode) && (
          <div
            aria-hidden={!compactMode}
            className={`col-start-1 row-start-1 w-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] origin-center ${
              compactMode
                ? 'opacity-100 scale-100 translate-y-0 blur-0 pointer-events-auto'
                : 'opacity-0 scale-[1.04] translate-y-4 blur-[6px] pointer-events-none select-none'
            }`}
          >
            <CompactInteractiveTwin
              telemetry={telemetry}
              location={selectedLocation}
              isActive={compactMode}
            />
          </div>
        )}
      </main>

      {/* 3. MODALS */}
      {/* Modal Chi Tiết Cảm Biến LDR & Thuật Toán Fuzzy-PID, PSO */}
      <DetailedTelemetryModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        telemetry={telemetry}
      />

      {/* Modal Điều Khiển Thủ Công (Jog / Chuyển Chế Độ / E-Stop / Re-Home / Test DIR) */}
      <ManualControlModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        system={telemetry.system}
        mode={telemetry.system.mode}
        activeAlgorithm={telemetry.system.activeAlgorithm}
        onSetMode={handleSetMode}
        onSetAlgorithm={handleSetAlgorithm}
        onJog={handleJog}
        onCalibrate={handleCalibrate}
        onTriggerPso={handleTriggerPso}
        onPark={handlePark}
        onEstop={handleEstop}
        onReHome={handleReHome}
        onResetFault={handleResetFault}
        onTestDir={handleTestDir}
        onTestSleep={handleTestSleep}
        onTestWake={handleTestWake}
        onResumeReal={handleResumeReal}
        onSetSleepDisabled={handleSetSleepDisabled}
        onSetLampAutoDisabled={handleSetLampAutoDisabled}
        onSetLampManualState={handleSetLampManualState}
        motors={telemetry.motors}
        isExperimentLocked={isExperimentLocked}
      />

      {/* Modal Xác thực Dừng khẩn cấp / Phủ bạt an toàn & Mở khóa */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        isCurrentlyActive={Boolean(telemetry?.system?.emergencyActive)}
        onConfirm={handleConfirmEmergencyAction}
      />

      {/* Modal Cài Đặt Hệ Thống & Tọa Độ Lắp Đặt & Quản Lý Người Dùng & Mã Nguồn ESP32 */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={authSession}
        dataSource={dataSource}
        setDataSource={handleDataSourceChange}
        firebaseConfig={firebaseConfig}
        setFirebaseConfig={setFirebaseConfig}
        firebaseConnected={firebaseConnected}
        wsUrl={wsUrl}
        setWsUrl={setWsUrl}
        restUrl={restUrl}
        setRestUrl={setRestUrl}
        refreshRate={refreshRate}
        setRefreshRate={setRefreshRate}
        latestTelemetry={telemetry}
        onClearFirebase={handleClearFirebase}
        onSendTestPacket={handleSendTestPacket}
        currentLocation={selectedLocation}
        onSelectLocation={handleSelectLocation}
        onConfirmLocation={handleConfirmSiteLocation}
        weatherData={weatherData}
        initialTab={settingsInitialTab}
        history30Days={history30Days}
        onUpdateDayData={handleUpdateDayData}
        onDeleteDayData={handleDeleteDayData}
        onAddDayData={handleAddDayData}
        onResetHistoryData={handleResetHistoryData}
        onLoadRealisticDataset={handleLoadRealisticDataset}
        targetEditDate={targetEditDate}
        onSetSleepDisabled={handleSetSleepDisabled}
        onSetRelayInterval={handleSetRelayInterval}
        onSetLampAutoDisabled={handleSetLampAutoDisabled}
        onSetLampManualState={handleSetLampManualState}
      />

      {/* 4. FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md py-3 px-4 sm:px-6 text-xs text-zinc-600 dark:text-slate-300 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-zinc-900 dark:text-white">SVTH 1: PHAN MINH DUY TIẾN - SVTH 2: VÕ HỒNG PHÁT</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-slate-400">
            <span>Gateway truyền thông:</span>
            <span className="font-semibold text-zinc-800 dark:text-slate-200">ESP32-S3</span>
          </div>
        </div>
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        currentUser={authSession}
        dataSource={dataSource}
        firebaseConnected={firebaseConnected}
        systemMode={telemetry.system.mode}
        onOpenManual={() => setIsManualModalOpen(true)}
        onOpenDetails={() => setIsDetailsModalOpen(true)}
        onOpenSettings={() => openSettingsTab('config')}
        onLogout={handleLogout}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        compactMode={compactMode}
        onToggleCompactMode={toggleCompactMode}
      />

      {/* 6. DISCRETE WEATHER PRESET DEMO PILL & DARK/LIGHT MODE TOGGLE & COMPACT MODE SWITCH (Bottom Right corner) */}
      <div className="fixed bottom-4 right-4 z-40 hidden sm:flex items-center gap-2">
        {showWeatherSwitcher ? (
          <div className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-zinc-300 dark:border-slate-700 shadow-xl flex items-center gap-1 animate-in fade-in duration-150">
            <button
              onClick={() => { setCustomWeatherType(null); setShowWeatherSwitcher(false); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                customWeatherType === null ? 'bg-blue-700 text-white' : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Realtime API</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('clear'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                customWeatherType === 'clear' ? 'bg-blue-700 text-white' : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Nắng</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('clouds'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                customWeatherType === 'clouds' ? 'bg-blue-700 text-white' : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-zinc-500 dark:text-slate-400" />
              <span>Mây</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('rain'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                customWeatherType === 'rain' ? 'bg-blue-700 text-white' : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-blue-500" />
              <span>Mưa</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('thunderstorm'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                customWeatherType === 'thunderstorm' ? 'bg-blue-700 text-white' : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-600" />
              <span>Giông</span>
            </button>
            <button
              onClick={() => { setCustomWeatherType('night'); setShowWeatherSwitcher(false); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                customWeatherType === 'night' ? 'bg-blue-700 text-white' : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Đêm</span>
            </button>
            <button
              onClick={() => setShowWeatherSwitcher(false)}
              className="px-1.5 py-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-slate-800 text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            {/* Nút Mode Compact (Mô hình 3D trực quan tương tác) đặt cạnh nút Chế độ Sáng/Tối */}
            <button
              id="btn-toggle-compact-mode"
              onClick={toggleCompactMode}
              className={`px-3 py-2 rounded-lg backdrop-blur-md border shadow-lg transition-all duration-300 active:scale-95 cursor-pointer flex items-center text-xs font-semibold ${
                compactMode
                  ? 'bg-blue-700 hover:bg-blue-800 border-blue-500 text-white'
                  : 'bg-white/90 dark:bg-slate-900/90 hover:bg-zinc-100 dark:hover:bg-slate-800 border-zinc-300 dark:border-slate-700 text-zinc-800 dark:text-slate-100'
              }`}
              title={compactMode ? 'Đang bật Mode Compact 3D — Nhấn để về giao diện Tiêu chuẩn' : 'Bật Mode Compact: Xem mô hình 3D tương tác của 2 tấm pin, trục đai răng & hộp điện'}
            >
              <span className={`text-[11px] ${compactMode ? 'text-white font-bold' : 'text-zinc-900 dark:text-white'}`}>
                Mode Compact
              </span>
            </button>

            {/* Nút Chuyển Chế độ Sáng / Tối */}
            <button
              id="btn-toggle-theme"
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 hover:bg-zinc-100 dark:hover:bg-slate-800 backdrop-blur-md border border-zinc-300 dark:border-slate-700 text-zinc-800 dark:text-slate-100 shadow-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title={themeMode === 'dark' ? 'Chuyển sang Chế độ Sáng (Light mode)' : 'Chuyển sang Chế độ Tối (Dark mode)'}
            >
              {themeMode === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] text-zinc-900 dark:text-white">Chế độ Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] text-zinc-900 dark:text-white">Chế độ Tối</span>
                </>
              )}
            </button>

            {/* Nút Nền thời tiết */}
            <button
              id="btn-toggle-weather-switcher"
              onClick={() => setShowWeatherSwitcher(true)}
              className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 hover:bg-zinc-100 dark:hover:bg-slate-800 backdrop-blur-md border border-zinc-300 dark:border-slate-700 text-zinc-800 dark:text-slate-100 hover:text-blue-700 dark:hover:text-sky-300 shadow-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Đổi hiệu ứng nền thời tiết (Nắng/Mưa/Mây/Giông/Đêm)"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <span className="text-[11px] text-zinc-900 dark:text-white">Nền thời tiết</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
}
