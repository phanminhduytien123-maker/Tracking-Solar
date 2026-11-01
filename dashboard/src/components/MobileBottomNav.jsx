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
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-zinc-300 px-2 py-1.5 shadow-lg safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Tổng quan */}
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors py-1 px-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center border border-zinc-300 text-zinc-700">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-zinc-700">Tổng quan</span>
        </button>

        {/* 2. Điều khiển (Admin Only) */}
        {isAdmin && (
          <button
            onClick={onOpenManual}
            className="flex flex-col items-center justify-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors py-1 px-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center border border-zinc-300 text-zinc-700">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium text-zinc-700">Điều khiển</span>
          </button>
        )}

        {/* 3. Biểu đồ */}
        <button
          onClick={scrollToCharts}
          className="flex flex-col items-center justify-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors py-1 px-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center border border-zinc-300 text-zinc-700">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-zinc-700">Biểu đồ</span>
        </button>

        {/* 4. Thông số */}
        <button
          onClick={onOpenDetails}
          className="flex flex-col items-center justify-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors py-1 px-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center border border-zinc-300 text-zinc-700">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-zinc-700">Thông số</span>
        </button>

        {/* 5. Đăng xuất */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 text-rose-700 hover:text-rose-900 transition-colors py-1 px-2 cursor-pointer"
            title="Đăng xuất"
          >
            <div className="w-8 h-8 rounded bg-rose-50 flex items-center justify-center border border-rose-300 text-rose-700">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium text-rose-700">Thoát</span>
          </button>
        )}

      </div>
    </nav>
  );
}

