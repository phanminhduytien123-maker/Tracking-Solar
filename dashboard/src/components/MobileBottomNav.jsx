import React from 'react';
import { LayoutDashboard, Sliders, BarChart3, Activity, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { TbSolarPanel } from 'react-icons/tb';

export default function MobileBottomNav({
  currentUser,
  onOpenManual,
  onOpenDetails,
  onOpenSettings,
  onLogout,
  themeMode = 'light',
  onToggleTheme,
  compactMode = false,
  onToggleCompactMode
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
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-slate-800 px-2 py-1.5 shadow-lg safe-area-bottom transition-colors"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Tổng quan */}
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white transition-colors py-1 px-1.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-slate-800 flex items-center justify-center border border-zinc-300 dark:border-slate-700 text-zinc-700 dark:text-slate-200">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Tổng quan</span>
        </button>

        {/* 2. Điều khiển (Admin Only) */}
        {isAdmin && (
          <button
            onClick={onOpenManual}
            className="flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white transition-colors py-1 px-1.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-slate-800 flex items-center justify-center border border-zinc-300 dark:border-slate-700 text-zinc-700 dark:text-slate-200">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium">Điều khiển</span>
          </button>
        )}

        {/* 3. Biểu đồ */}
        <button
          onClick={scrollToCharts}
          className="flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white transition-colors py-1 px-1.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-slate-800 flex items-center justify-center border border-zinc-300 dark:border-slate-700 text-zinc-700 dark:text-slate-200">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Biểu đồ</span>
        </button>

        {/* 4. Thông số */}
        <button
          onClick={onOpenDetails}
          className="flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white transition-colors py-1 px-1.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-slate-800 flex items-center justify-center border border-zinc-300 dark:border-slate-700 text-zinc-700 dark:text-slate-200">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Thông số</span>
        </button>

        {/* 5. Mode Compact (Mô hình trực quan) */}
        {onToggleCompactMode && (
          <button
            onClick={onToggleCompactMode}
            className="flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white transition-colors py-1 px-1.5 cursor-pointer"
            title="Chuyển đổi Mode Compact trực quan"
          >
            <div className={`w-8 h-8 rounded flex items-center justify-center border ${
              compactMode
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-zinc-100 dark:bg-slate-800 border-zinc-300 dark:border-slate-700 text-blue-600 dark:text-sky-400'
            }`}>
              <TbSolarPanel className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium">Compact</span>
          </button>
        )}

        {/* 6. Giao diện Sáng / Tối */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex flex-col items-center justify-center gap-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white transition-colors py-1 px-1.5 cursor-pointer"
            title={themeMode === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
          >
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-slate-800 flex items-center justify-center border border-zinc-300 dark:border-slate-700 text-zinc-700 dark:text-slate-200">
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </div>
            <span className="text-[11px] font-medium">{themeMode === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
        )}

        {/* 6. Đăng xuất */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300 transition-colors py-1 px-1.5 cursor-pointer"
            title="Đăng xuất"
          >
            <div className="w-8 h-8 rounded bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium">Thoát</span>
          </button>
        )}

      </div>
    </nav>
  );
}

