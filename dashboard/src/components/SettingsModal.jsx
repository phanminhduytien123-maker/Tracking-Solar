import React, { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { getStoredUsers, fetchCloudUsers, lockUser1Hour, lockUserPermanent, restoreUser } from '../services/userService';
import InstallationLocationTab from './InstallationLocationTab';
import HistoryDataManagementTab from './HistoryDataManagementTab';

function HelpTip({ text }) {
  return (
    <span className="relative group inline-flex items-center ml-1 text-zinc-400 hover:text-zinc-600 cursor-help" title={text}>
      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 w-60 sm:w-64 p-2 bg-zinc-900 text-white text-[11px] font-normal leading-relaxed rounded-xs shadow-lg text-left">
        {text}
        <span className="absolute top-full left-3 -mt-1 border-4 border-transparent border-t-zinc-900" />
      </span>
    </span>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser = null,
  dataSource, // 'mock' | 'firebase' | 'esp32_ws'
  setDataSource,
  firebaseConfig,
  setFirebaseConfig,
  wsUrl,
  setWsUrl,
  restUrl,
  setRestUrl,
  refreshRate,
  setRefreshRate,
  latestTelemetry,
  firebaseConnected,
  onClearFirebase,
  onSendTestPacket,
  currentLocation = null,
  onSelectLocation = null,
  onConfirmLocation = null,
  weatherData = null,
  initialTab = null,
  history30Days = [],
  onUpdateDayData = null,
  onDeleteDayData = null,
  onAddDayData = null,
  onResetHistoryData = null,
  onLoadRealisticDataset = null,
  targetEditDate = null,
  onSetSleepDisabled = null,
  onSetRelayInterval = null,
  onSetLampAutoDisabled = null,
  onSetLampManualState = null,
  onSetLampCustomCycle = null,
  onSetEsp2AutoCutoff = null
}) {
  const [activeTab, setActiveTab] = useState(() => initialTab || 'config'); // 'config' | 'location' | 'users' | 'data_history' | 'json'
  const [isExperimentLocked, setIsExperimentLocked] = useState(() => localStorage.getItem('solar_experiment_locked') === 'true');
  const [relaySecInput, setRelaySecInput] = useState(() => Number(latestTelemetry?.system?.relayIntervalSec || localStorage.getItem('solar_relay_interval_sec') || 10));
  const [lampOnMinInput, setLampOnMinInput] = useState(() => Number(latestTelemetry?.system?.lampOnMin || localStorage.getItem('solar_lamp_on_min') || 15));
  const [lampOffMinInput, setLampOffMinInput] = useState(() => Number(latestTelemetry?.system?.lampOffMin || localStorage.getItem('solar_lamp_off_min') || 15));
  const [hwConfigFeedback, setHwConfigFeedback] = useState(null);

  useEffect(() => {
    const liveRelaySec = latestTelemetry?.system?.relayIntervalSec;
    if (liveRelaySec && !isNaN(liveRelaySec)) {
      setRelaySecInput(Number(liveRelaySec));
    }
  }, [latestTelemetry?.system?.relayIntervalSec]);

  useEffect(() => {
    const liveOn = latestTelemetry?.system?.lampOnMin;
    if (liveOn && !isNaN(liveOn)) {
      setLampOnMinInput(Number(liveOn));
    }
  }, [latestTelemetry?.system?.lampOnMin]);

  useEffect(() => {
    const liveOff = latestTelemetry?.system?.lampOffMin;
    if (liveOff && !isNaN(liveOff)) {
      setLampOffMinInput(Number(liveOff));
    }
  }, [latestTelemetry?.system?.lampOffMin]);

  // Sync initialTab if passed dynamically
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // User Management State
  const [usersList, setUsersList] = useState(() => getStoredUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userActionFeedback, setUserActionFeedback] = useState(null);

  // Sync users from Firebase Cloud whenever the modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setUsersList(getStoredUsers());
      fetchCloudUsers().then(cloudUsers => {
        if (cloudUsers) setUsersList(cloudUsers);
      });
    }
  }, [isOpen, activeTab]);

  const handleRefreshUsers = async () => {
    const cloudUsers = await fetchCloudUsers();
    setUsersList(cloudUsers || getStoredUsers());
    setUserActionFeedback({
      type: 'info',
      message: 'Đã đồng bộ danh sách trạng thái người dùng từ Firebase Cloud!'
    });
    setTimeout(() => setUserActionFeedback(null), 3000);
  };

  const handleLock1H = async (user) => {
    const updated = await lockUser1Hour(user.id);
    setUsersList(updated);
    setUserActionFeedback({
      type: 'warning',
      message: `Đã khóa tạm thời 1 giờ tài khoản "${user.displayName}" (@${user.username}) trên toàn hệ thống.`
    });
    setTimeout(() => setUserActionFeedback(null), 4000);
  };

  const handleLockPerm = async (user) => {
    if (window.confirm(`Xác nhận khóa VĨNH VIỄN tài khoản "${user.displayName}" (@${user.username})?`)) {
      const updated = await lockUserPermanent(user.id);
      setUsersList(updated);
      setUserActionFeedback({
        type: 'danger',
        message: `Đã khóa vĩnh viễn tài khoản "${user.displayName}" (@${user.username}) trên toàn hệ thống.`
      });
      setTimeout(() => setUserActionFeedback(null), 4000);
    }
  };

  const handleRestore = async (user) => {
    const updated = await restoreUser(user.id);
    setUsersList(updated);
    setUserActionFeedback({
      type: 'success',
      message: `Đã khôi phục và mở khóa tài khoản "${user.displayName}" (@${user.username}) thành công!`
    });
    setTimeout(() => setUserActionFeedback(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-zinc-300 rounded-sm w-full max-w-3xl max-h-[92vh] flex flex-col shadow-sm text-zinc-900">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-white">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Cấu hình hệ thống
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Nguồn dữ liệu, tọa độ trạm đo, quản lý người dùng và cấu trúc dữ liệu
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 border border-zinc-300 rounded-sm cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-4 pt-1 gap-1 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'config'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Nguồn dữ liệu
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'location'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Tọa độ lắp đặt
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'users'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            <span>Quản lý người dùng</span>
            {usersList.some(u => u.status !== 'active') && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            )}
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('data_history')}
              className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'data_history'
                  ? 'border-blue-700 text-blue-700 bg-white'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
                }`}
            >
              <span>Tùy biến dữ liệu 30 ngày</span>
              {history30Days?.some(d => d.severe_invalid) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Có ngày lỗi dữ liệu"></span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('json')}
            className={`py-2 px-3 border-b-2 font-semibold cursor-pointer whitespace-nowrap transition-colors ${activeTab === 'json'
                ? 'border-blue-700 text-blue-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
          >
            Dữ liệu thô (JSON)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 max-h-[72vh] text-sm">

          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-4">

              {/* Mode Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-2">
                  Chọn chế độ nguồn dữ liệu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

                  {/* FIREBASE CLOUD */}
                  <button
                    type="button"
                    onClick={() => setDataSource('firebase')}
                    className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${dataSource === 'firebase'
                        ? 'bg-blue-50/70 text-blue-950 border-blue-700 font-semibold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                      }`}
                  >
                    <div className="font-bold text-xs">Firebase Cloud</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Kết nối Realtime Database qua Internet (4G/WiFi).
                    </div>
                  </button>

                  {/* GIẢ LẬP DỮ LIỆU */}
                  <button
                    type="button"
                    onClick={() => setDataSource('mock')}
                    className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${dataSource === 'mock'
                        ? 'bg-blue-50/70 text-blue-950 border-blue-700 font-semibold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                      }`}
                  >
                    <div className="font-bold text-xs">Giả lập dữ liệu</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Mô phỏng thuật toán trên trình duyệt (source: 'mock').
                    </div>
                  </button>

                  {/* LOCAL WEBSOCKET */}
                  <button
                    type="button"
                    onClick={() => setDataSource('esp32_ws')}
                    className={`p-3 rounded-sm border text-left transition-colors cursor-pointer ${dataSource === 'esp32_ws'
                        ? 'bg-blue-50/70 text-blue-950 border-blue-700 font-semibold'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                      }`}
                  >
                    <div className="font-bold text-xs">WebSocket ESP32</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Kết nối trực tiếp IP mạng LAN nội bộ phòng lab.
                    </div>
                  </button>
                </div>
              </div>

              {/* FIREBASE CONFIG PANEL */}
              {dataSource === 'firebase' && (
                <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                    <span className="font-bold text-xs text-zinc-800">
                      Thông số kết nối Firebase RTDB
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${firebaseConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                      }`}>
                      {firebaseConnected ? '● Đã kết nối' : '○ Chưa nhận dữ liệu'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Database URL (Bắt buộc):</label>
                    <input
                      type="text"
                      value={firebaseConfig.databaseURL || ''}
                      onChange={(e) => setFirebaseConfig({ ...firebaseConfig, databaseURL: e.target.value })}
                      placeholder="https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app"
                      className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Web API Key (Bắt buộc):</label>
                      <input
                        type="text"
                        value={firebaseConfig.apiKey || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Project ID (Tuỳ chọn):</label>
                      <input
                        type="text"
                        value={firebaseConfig.projectId || ''}
                        onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                        placeholder="tracking-solar-datn"
                        className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Khóa thí nghiệm (30 ngày: 01/11 - 30/11) */}
                  <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block">
                          Khóa chế độ thí nghiệm (30 ngày đo: 01/11 – 30/11)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          Khóa thay đổi thông số &amp; Jog thủ công để bảo đảm dữ liệu đo đối chứng tính hợp lệ.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !isExperimentLocked;
                          setIsExperimentLocked(nextVal);
                          localStorage.setItem('solar_experiment_locked', nextVal ? 'true' : 'false');
                        }}
                        className={`px-3 py-1 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                          isExperimentLocked 
                            ? 'bg-amber-700 text-white' 
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-300'
                        }`}
                      >
                        {isExperimentLocked ? 'Đang khóa' : 'Đang mở'}
                      </button>
                    </div>
                  </div>

                  {/* CẤU HÌNH PHẦN CỨNG: NGỦ ĐÊM, RELAY & ĐÈN */}
                  <div className="p-3.5 rounded-sm bg-zinc-50 border border-zinc-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900">
                          Cấu hình vận hành &amp; Relay
                        </span>
                        <HelpTip text="Các thiết lập đồng bộ trực tiếp xuống firmware ESP32-S3 #1 (Tracker) và ESP32-S3 #2 (Đo Voc/Isc)." />
                      </div>
                      <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                        {latestTelemetry?.system?.sleepDisabled ? 'Đã tắt ngủ đêm' : 'Ngủ tự động 18:00'}
                      </span>
                    </div>

                    {hwConfigFeedback && (
                      <div className="p-2 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                        <span>{hwConfigFeedback}</span>
                        <button
                          type="button"
                          onClick={() => setHwConfigFeedback(null)}
                          className="text-emerald-700 hover:text-emerald-950 px-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* 1. Chế độ ngủ đêm */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900">
                          1. Chế độ ngủ đêm (18:00 – 04:00)
                        </span>
                        <HelpTip text="Bật: Tự động đưa giàn pin về thế an toàn và ngắt relay từ 18:00 đến 04:00 để tiết kiệm điện. Tắt: Giữ nguyên vị trí giàn pin ở góc chiều, không ngủ lúc 18h." />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSetSleepDisabled && onSetSleepDisabled(false);
                            setHwConfigFeedback('Đã BẬT tự động ngủ đêm: Hệ thống sẽ tự động ngủ lúc 18:00.');
                          }}
                          className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                            !latestTelemetry?.system?.sleepDisabled
                              ? 'bg-zinc-800 text-white border-zinc-800'
                              : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          Bật
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSetSleepDisabled && onSetSleepDisabled(true);
                            setHwConfigFeedback('Đã TẮT ngủ đêm: Tấm pin sẽ giữ bước ở vị trí cuối buổi chiều.');
                          }}
                          className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                            latestTelemetry?.system?.sleepDisabled
                              ? 'bg-zinc-800 text-white border-zinc-800'
                              : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          Tắt
                        </button>
                      </div>
                    </div>

                    {/* 2. Chu kỳ Relay đo Voc & Isc */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900">
                            2. Chu kỳ Relay đo Voc &amp; Isc
                          </span>
                          <HelpTip text="Khoảng thời gian giãn cách giữa các lần nhảy relay đo Voc và Isc (mặc định 10s). Trong giờ ngủ đêm, cả 4 relay tự động khóa hoàn toàn để bảo vệ thiết bị." />
                        </div>
                        <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                          Hiện tại: {latestTelemetry?.system?.relayIntervalSec || relaySecInput || 10}s
                        </span>
                      </div>

                      {/* Các mức chọn nhanh */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500 mr-1">Chọn nhanh:</span>
                        {[5, 10, 15, 30, 60, 120].map((sec) => {
                          const isCurrent = Number(relaySecInput) === sec;
                          return (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                setRelaySecInput(sec);
                                onSetRelayInterval && onSetRelayInterval(sec);
                                setHwConfigFeedback(`Đã cập nhật tần suất nhảy 1 chu kỳ Relay = ${sec} giây!`);
                              }}
                              className={`px-2.5 py-1 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-zinc-800 text-white border-zinc-800'
                                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                              }`}
                            >
                              {sec}s{sec === 10 ? ' (Mặc định)' : ''}
                            </button>
                          );
                        })}
                      </div>

                      {/* Ô nhập tùy chỉnh + Nút Lưu */}
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                        <label className="text-xs font-semibold text-zinc-700 shrink-0">
                          Tùy chỉnh (3 – 3600 giây):
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="3600"
                          step="1"
                          value={relaySecInput}
                          onChange={(e) => setRelaySecInput(e.target.value)}
                          className="w-20 bg-white border border-zinc-300 rounded-sm px-2.5 py-1 text-xs font-bold text-zinc-900 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const validSec = Math.max(3, Math.min(3600, Math.round(Number(relaySecInput) || 10)));
                            setRelaySecInput(validSec);
                            onSetRelayInterval && onSetRelayInterval(validSec);
                            setHwConfigFeedback(`Đã lưu và áp dụng chu kỳ nhảy Relay = ${validSec} giây xuống hệ thống!`);
                          }}
                          className="px-3 py-1 rounded-sm text-xs font-semibold bg-zinc-800 hover:bg-zinc-900 text-white cursor-pointer"
                        >
                          Lưu chu kỳ
                        </button>
                      </div>
                    </div>

                    {/* 3. Điều khiển & Chu kỳ Đèn */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900">
                            3. Điều khiển đèn
                          </span>
                          <HelpTip text="Tự động: Đèn tự động bật/tắt luân phiên 15 phút khi giàn pin ngủ đêm. Thủ công: Cho phép người dùng bật hoặc tắt đèn trực tiếp bằng tay." />
                          <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                            Đèn: {latestTelemetry?.system?.lamp12vOn ? 'BẬT' : 'TẮT'}
                          </span>
                          {!latestTelemetry?.system?.lampAutoDisabled && latestTelemetry?.system?.lampRemainSec > 0 && (
                            <span className="text-zinc-500 text-[11px] font-mono">
                              (còn {Math.floor(Number(latestTelemetry.system.lampRemainSec) / 60)}p {Number(latestTelemetry.system.lampRemainSec) % 60}s)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSetLampAutoDisabled && onSetLampAutoDisabled(false);
                              setHwConfigFeedback(`Đã chuyển sang chế độ Tự động: Đèn bật ${latestTelemetry?.system?.lampOnMin || 15}p / tắt ${latestTelemetry?.system?.lampOffMin || 15}p khi ngủ.`);
                            }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              !latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-zinc-800 text-white border-zinc-800'
                                : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                            }`}
                          >
                            Tự động
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSetLampAutoDisabled && onSetLampAutoDisabled(true);
                              setHwConfigFeedback('Đã chuyển sang chế độ Thủ công: Mở khóa công tắc Bật/Tắt đèn!');
                            }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-zinc-800 text-white border-zinc-800'
                                : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                            }`}
                          >
                            Thủ công
                          </button>
                        </div>
                      </div>

                      {/* Công tắc Bật / Tắt Đèn bằng tay */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-800">
                            Công tắc đèn {latestTelemetry?.system?.lampAutoDisabled ? '(Thủ công)' : '(Khóa khi Tự động)'}:
                          </span>
                          <HelpTip text="Bật hoặc tắt đèn chủ động bằng tay. Chỉ khả dụng khi chọn chế độ Thủ công." />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={!latestTelemetry?.system?.lampAutoDisabled}
                            onClick={() => {
                              onSetLampManualState && onSetLampManualState(true);
                              setHwConfigFeedback('Đã gửi lệnh BẬT ĐÈN bằng tay!');
                            }}
                            className={`px-3 py-1 rounded-sm text-xs font-semibold border transition-colors ${
                              !latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                                : latestTelemetry?.system?.lamp12vOn
                                  ? 'bg-zinc-800 text-white border-zinc-800 cursor-pointer'
                                  : 'bg-white text-zinc-800 hover:bg-zinc-50 border-zinc-300 cursor-pointer'
                            }`}
                          >
                            Bật đèn
                          </button>
                          <button
                            type="button"
                            disabled={!latestTelemetry?.system?.lampAutoDisabled}
                            onClick={() => {
                              onSetLampManualState && onSetLampManualState(false);
                              setHwConfigFeedback('Đã gửi lệnh TẮT ĐÈN bằng tay!');
                            }}
                            className={`px-3 py-1 rounded-sm text-xs font-semibold border transition-colors ${
                              !latestTelemetry?.system?.lampAutoDisabled
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                                : !latestTelemetry?.system?.lamp12vOn
                                  ? 'bg-zinc-800 text-white border-zinc-800 cursor-pointer'
                                  : 'bg-white text-zinc-800 hover:bg-zinc-50 border-zinc-300 cursor-pointer'
                            }`}
                          >
                            Tắt đèn
                          </button>
                        </div>
                      </div>

                      {/* Khối Cài đặt Chu kỳ BẬT / TẮT luân phiên tự do */}
                      <div className="p-2.5 rounded-sm bg-zinc-50 border border-zinc-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-zinc-800">
                              Chu kỳ tự động khi ngủ:
                            </span>
                            <HelpTip text="Cài đặt thời gian Bật và Tắt luân phiên của đèn trong suốt thời gian giàn pin ngủ đêm." />
                          </div>
                          <span className="text-[11px] text-zinc-500 font-medium">
                            Hiện hành: BẬT {latestTelemetry?.system?.lampOnMin || 15}p ➔ TẮT {latestTelemetry?.system?.lampOffMin || 15}p
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-600 font-medium">Thời gian BẬT:</label>
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={lampOnMinInput}
                              onChange={(e) => setLampOnMinInput(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                              className="w-16 px-2 py-1 text-xs text-center font-bold border border-zinc-300 rounded-sm bg-white"
                            />
                            <span className="text-xs text-zinc-500">phút</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-600 font-medium">Thời gian TẮT:</label>
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={lampOffMinInput}
                              onChange={(e) => setLampOffMinInput(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                              className="w-16 px-2 py-1 text-xs text-center font-bold border border-zinc-300 rounded-sm bg-white"
                            />
                            <span className="text-xs text-zinc-500">phút</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const onVal = Math.max(1, Math.min(360, Number(lampOnMinInput) || 15));
                              const offVal = Math.max(1, Math.min(360, Number(lampOffMinInput) || 15));
                              onSetLampCustomCycle && onSetLampCustomCycle(onVal, offVal);
                              onSetLampAutoDisabled && onSetLampAutoDisabled(false);
                              setHwConfigFeedback(`✓ Đã áp dụng chu kỳ Đèn: BẬT ${onVal}p / TẮT ${offVal}p!`);
                            }}
                            className="px-3 py-1 rounded-sm text-xs font-semibold bg-zinc-800 hover:bg-zinc-900 text-white cursor-pointer transition-colors shrink-0"
                          >
                            Lưu chu kỳ
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 4. Tự ngắt nguồn ESP32 #2 ban đêm */}
                    <div className="p-3 rounded-sm bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 block">
                          4. Tự ngắt nguồn ESP32 #2 ban đêm
                        </span>
                        <HelpTip text="Bật: Tự động ngắt nguồn ESP32 #2 từ 18:01 tối đến 04:01 sáng để tiết kiệm ắc quy. Tắt: ESP32 #2 luôn được cấp nguồn hoạt động 24/24." />
                        <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                          Nguồn ESP2: {latestTelemetry?.system?.esp2PowerOn !== false ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSetEsp2AutoCutoff && onSetEsp2AutoCutoff(true);
                            setHwConfigFeedback('Đã BẬT tự động ngắt nguồn ESP2 ban đêm (18:01 – 04:01).');
                          }}
                          className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                            latestTelemetry?.system?.esp2AutoCutoff !== false
                              ? 'bg-zinc-800 text-white border-zinc-800'
                              : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          Bật
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSetEsp2AutoCutoff && onSetEsp2AutoCutoff(false);
                            setHwConfigFeedback('Đã TẮT tự động ngắt nguồn ESP2: Cấp nguồn 24/24.');
                          }}
                          className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                            latestTelemetry?.system?.esp2AutoCutoff === false
                              ? 'bg-zinc-800 text-white border-zinc-800'
                              : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          Tắt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Firebase */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={onSendTestPacket}
                      className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 cursor-pointer"
                    >
                      Gửi 1 gói mẫu thử nghiệm (vào /solar_mock)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isExperimentLocked) {
                          alert('Khóa thí nghiệm đang BẬT! Không thể xóa dữ liệu trong giai đoạn đo 30 ngày đối chứng (01/11 - 30/11).');
                          return;
                        }
                        onClearFirebase && onClearFirebase();
                      }}
                      className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 cursor-pointer"
                    >
                      Dọn dữ liệu Firebase (Hướng dẫn script an toàn)
                    </button>
                  </div>
                </div>
              )}

              {/* LOCAL WEBSOCKET CONFIG PANEL */}
              {dataSource === 'esp32_ws' && (
                <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Địa chỉ WebSocket ESP32-S3 (ws://)
                    </label>
                    <input
                      type="text"
                      value={wsUrl}
                      onChange={(e) => setWsUrl(e.target.value)}
                      placeholder="ws://192.168.4.1/ws"
                      className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Địa chỉ REST API Fallback (http://)
                    </label>
                    <input
                      type="text"
                      value={restUrl}
                      onChange={(e) => setRestUrl(e.target.value)}
                      placeholder="http://192.168.4.1/api/telemetry"
                      className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-1.5 text-xs text-zinc-900 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Refresh Rate */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Tần số làm mới giao diện
                  </label>
                  <span className="text-xs text-zinc-900 font-bold">{refreshRate} ms</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(Number(e.target.value))}
                  className="w-full cursor-pointer h-1.5 bg-zinc-300 rounded-sm accent-blue-700"
                />
              </div>

            </div>
          )}

          {/* TAB 2: TỌA ĐỘ LẮP ĐẶT HỆ THỐNG */}
          {activeTab === 'location' && (
            <div className="animate-in fade-in duration-200">
              <InstallationLocationTab
                currentLocation={currentLocation}
                onSelectLocation={onSelectLocation}
                onConfirmLocation={onConfirmLocation}
                weatherData={weatherData}
                latestTelemetry={latestTelemetry}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* TAB 3: QUẢN LÝ NGƯỜI DÙNG */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Action Feedback Toast */}
              {userActionFeedback && (
                <div className={`p-2.5 rounded-sm border flex items-center justify-between gap-2 text-xs font-semibold ${userActionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : userActionFeedback.type === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : userActionFeedback.type === 'danger'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-300'
                  }`}>
                  <span>{userActionFeedback.message}</span>
                  <button
                    onClick={() => setUserActionFeedback(null)}
                    className="text-zinc-500 hover:text-zinc-800 px-1.5 py-0.5 rounded text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Top Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                  <span className="text-xs text-zinc-500 block">Tổng số người dùng</span>
                  <span className="text-base font-bold text-zinc-900 mt-0.5 block">{usersList.length} tài khoản</span>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                  <span className="text-xs text-zinc-500 block">Đang trực tuyến</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span className="text-base font-bold text-emerald-800">
                      {usersList.filter(u => u.isOnline || (currentUser?.username === u.username)).length} đang online
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                  <span className="text-xs text-zinc-500 block">Tài khoản bị khóa</span>
                  <span className={`text-base font-bold mt-0.5 block ${usersList.some(u => u.status !== 'active') ? 'text-red-700' : 'text-zinc-600'}`}>
                    {usersList.filter(u => u.status !== 'active').length} bị khóa
                  </span>
                </div>
              </div>

              {/* Search & Refresh Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên tài khoản, họ tên, vai trò..."
                    className="w-full px-3 py-1.5 rounded-sm bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRefreshUsers}
                  className="px-3 py-1.5 rounded-sm bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-800 border border-zinc-300 cursor-pointer shrink-0"
                >
                  Đồng bộ trạng thái
                </button>
              </div>

              {/* Users List Cards */}
              <div className="space-y-2">
                {usersList
                  .filter(u => {
                    const q = userSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      u.displayName.toLowerCase().includes(q) ||
                      u.username.toLowerCase().includes(q) ||
                      u.roleName.toLowerCase().includes(q)
                    );
                  })
                  .map(user => {
                    const isCurrentUser = currentUser?.username === user.username;
                    const isOnline = user.isOnline || isCurrentUser;
                    const isLocked1H = user.status === 'locked_1h';
                    const isLockedPerm = user.status === 'locked_permanent';
                    const isLocked = isLocked1H || isLockedPerm;

                    const remainingMins = user.lockedUntil && Date.now() < user.lockedUntil
                      ? Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000))
                      : null;

                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-sm border ${isLockedPerm
                            ? 'bg-red-50/50 border-red-300'
                            : isLocked1H
                              ? 'bg-amber-50/50 border-amber-300'
                              : 'bg-zinc-50 border-zinc-200'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 text-xs sm:text-sm">
                                {user.displayName}
                              </span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-zinc-200 text-zinc-700">
                                  Phiên hiện tại
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                              <span>@{user.username}</span>
                              <span className="mx-1.5">•</span>
                              <span>{user.roleName}</span>
                            </div>
                          </div>

                          <div className="text-xs text-zinc-600">
                            {user.status === 'active' && <span className="text-emerald-700 font-semibold">● Hoạt động bình thường</span>}
                            {isLocked1H && <span className="text-amber-700 font-semibold">Tạm khóa 1 giờ (còn ~{remainingMins} phút)</span>}
                            {isLockedPerm && <span className="text-red-700 font-semibold">Đã khóa vĩnh viễn</span>}
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-zinc-500">IP: {user.ipAddress}</span>
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <span className="text-zinc-400 italic">Tài khoản quản trị viên</span>
                            ) : (
                              <>
                                {user.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleLock1H(user)}
                                    className="px-2.5 py-1 rounded-sm bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-semibold cursor-pointer"
                                  >
                                    Khóa 1 giờ
                                  </button>
                                )}
                                {!isLockedPerm && (
                                  <button
                                    type="button"
                                    onClick={() => handleLockPerm(user)}
                                    className="px-2.5 py-1 rounded-sm bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 text-xs font-semibold cursor-pointer"
                                  >
                                    Khóa vĩnh viễn
                                  </button>
                                )}
                                {isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(user)}
                                    className="px-2.5 py-1 rounded-sm bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold cursor-pointer"
                                  >
                                    Khôi phục
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

          {/* TAB MỚI: TÙY BIẾN DỮ LIỆU 30 NGÀY (CHỈ DÀNH CHO QUẢN TRỊ VIÊN ADMIN) */}
          {activeTab === 'data_history' && (
            currentUser?.role === 'admin' ? (
              <HistoryDataManagementTab
                history30Days={history30Days}
                onUpdateDayData={onUpdateDayData}
                onDeleteDayData={onDeleteDayData}
                onAddDayData={onAddDayData}
                onResetHistoryData={onResetHistoryData}
                onLoadRealisticDataset={onLoadRealisticDataset}
                initialTargetDate={targetEditDate}
              />
            ) : (
              <div className="p-8 text-center space-y-3 bg-zinc-50 border border-zinc-200 rounded-sm">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Yêu cầu quyền Quản trị viên</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Tính năng tùy biến sâu dữ liệu chu kỳ 30 ngày chỉ dành riêng cho tài khoản Quản trị viên (Admin). Tài khoản khách chỉ có quyền giám sát số liệu trực tiếp.
                </p>
              </div>
            )
          )}

          {/* TAB 6: RAW JSON LIVE */}
          {activeTab === 'json' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-600">
                <span className="font-semibold">Dữ liệu thô JSON từ Firebase / ESP32:</span>
                <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="p-3 rounded-sm bg-zinc-100 border border-zinc-300 text-xs font-mono text-zinc-800 overflow-x-auto max-h-[360px] leading-relaxed">
                {JSON.stringify(latestTelemetry || {}, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Nguồn kết nối: {dataSource === 'firebase' ? 'Firebase RTDB' : dataSource === 'mock' ? 'Giả lập' : 'WebSocket LAN'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
          >
            Lưu cấu hình & đóng
          </button>
        </div>

      </div>
    </div>
  );
}


