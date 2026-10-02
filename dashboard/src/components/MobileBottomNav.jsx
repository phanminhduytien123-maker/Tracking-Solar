import React from 'react';
import { LayoutDashboard, Sliders, BarChart3, Activity, Settings, Flame, Database, Wifi } from 'lucide-react';

export default function MobileBottomNav({
  activeTab = 'overview',
  onSelectTab,
  onOpenManual,
  onOpenDetails,
  onOpenSettings,
  dataSource = 'firebase',
  firebaseConnected = false,
  systemMode = 'AUTO'
}) {
  const scrollToCharts = () => {
    const chartEl = document.getElementById('section-charts');
    if (chartEl) {
      chartEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav 
      aria-label="Mobile Navigation Bar" 
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#090b12]/92 backdrop-blur-2xl border-t border-white/15 px-3 py-2 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Tổng quan (Overview) */}
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2.5 rounded-xl cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-sky-400">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-white">Tổng quan</span>
        </button>

        {/* 2. Điều khiển (Control) */}
        <button
          onClick={onOpenManual}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2.5 rounded-xl cursor-pointer relative"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-400/40 text-sky-300 shadow-md shadow-sky-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-sky-300">Điều khiển</span>
        </button>

        {/* 3. Biểu đồ (Charts) */}
        <button
          onClick={scrollToCharts}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2.5 rounded-xl cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-white">Biểu đồ</span>
        </button>

        {/* 4. Thông số / Thuật toán (Sensors) */}
        <button
          onClick={onOpenDetails}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2.5 rounded-xl cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-white">Thông số</span>
        </button>

        {/* 5. Cài đặt (Settings) */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2.5 rounded-xl cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-purple-300">
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-white">Cài đặt</span>
        </button>

      </div>
    </nav>
  );
}
