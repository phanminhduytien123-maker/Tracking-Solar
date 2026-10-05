import React from 'react';
import { LayoutDashboard, Sliders, BarChart3, Activity, Settings, LogOut } from 'lucide-react';

export default function MobileBottomNav({
  currentUser,
  onOpenManual,
  onOpenDetails,
  onOpenSettings,
  onLogout
}) {
  const isAdmin = currentUser?.role === 'admin';

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
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0e1118]/95 backdrop-blur-2xl border-t border-zinc-800 px-2 py-1.5 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Tổng quan */}
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2 rounded-xl cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-200">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-zinc-200">Tổng quan</span>
        </button>

        {/* 2. Điều khiển (Admin Only) */}
        {isAdmin && (
          <button
            onClick={onOpenManual}
            className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2 rounded-xl cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-200">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-tight text-zinc-200">Điều khiển</span>
          </button>
        )}

        {/* 3. Biểu đồ */}
        <button
          onClick={scrollToCharts}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2 rounded-xl cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-200">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-zinc-200">Biểu đồ</span>
        </button>

        {/* 4. Thông số */}
        <button
          onClick={onOpenDetails}
          className="flex flex-col items-center justify-center gap-1 text-zinc-300 hover:text-white transition-all active:scale-95 py-1 px-2 rounded-xl cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-200">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-zinc-200">Thông số</span>
        </button>

        {/* 5. Đăng xuất */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 text-red-300 hover:text-red-100 transition-all active:scale-95 py-1 px-2 rounded-xl cursor-pointer"
            title="Đăng xuất"
          >
            <div className="w-8 h-8 rounded-lg bg-red-950/60 flex items-center justify-center border border-red-800/80 text-red-300">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-tight text-red-300">Thoát</span>
          </button>
        )}

      </div>
    </nav>
  );
}

