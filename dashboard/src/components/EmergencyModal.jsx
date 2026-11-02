import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Lock, Unlock, X, Check } from 'lucide-react';

export default function EmergencyModal({
  isOpen,
  onClose,
  isCurrentlyActive,
  onConfirm
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');

    // Kiểm tra mật khẩu xác thực (chấp nhận 123456 hoặc admin)
    const validPasswords = ['123456', 'admin', 'solar2026'];
    if (!validPasswords.includes(password.trim())) {
      setError('Mật khẩu không chính xác! Vui lòng nhập đúng mật khẩu quản trị.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Nếu đang active thì action là mở khóa (false), ngược lại là dừng khẩn cấp (true)
      const targetState = !isCurrentlyActive;
      const success = await onConfirm(targetState);
      if (success) {
        setPassword('');
        setError('');
        onClose();
      } else {
        setError('Không thể gửi lệnh qua Firebase! Vui lòng kiểm tra kết nối mạng.');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err.message || 'Thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-zinc-300 dark:border-slate-700 rounded-md w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className={`p-4 flex items-center justify-between text-white ${
          isCurrentlyActive ? 'bg-emerald-700 dark:bg-emerald-800' : 'bg-red-700 dark:bg-red-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {isCurrentlyActive ? (
              <Unlock className="w-5 h-5 text-emerald-200" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-200 animate-pulse" />
            )}
            <h2 className="text-sm font-bold tracking-wide uppercase">
              {isCurrentlyActive ? 'Mở Khóa Hoạt Động (Bỏ Phủ Bạt)' : 'Dừng Khẩn Cấp & Hạ Phủ Bạt'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/20 rounded-sm text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAction} className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {isCurrentlyActive ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <p className="font-semibold mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Check className="w-4 h-4" /> Khôi phục vận hành tự động
              </p>
              <p className="text-xs">
                Khi xác nhận mở khóa, giàn pin sẽ tự động chạy Homing lại cả 2 trục về Switch để chốt mốc tuyệt đối, sau đó khôi phục lại chu trình <strong>Hybrid Tracking</strong> (hoặc về tư thế ngủ đêm nếu quá 19:00).
              </p>
            </div>
          ) : (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-sm text-red-900 dark:text-red-200 leading-relaxed">
              <p className="font-semibold mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-800 dark:text-red-300">
                <ShieldAlert className="w-4 h-4" /> Bảo vệ an toàn mưa bão
              </p>
              <p className="text-xs">
                Hệ thống sẽ <strong>dừng bám ngay lập tức</strong>, tự động Homing cả 2 trục về Switch, sau đó hạ Trục 2 về <strong>Góc MAX (10.0°)</strong> để tựa vững chắc lên cơ cấu động cơ. Động cơ sẽ giữ bước ở chế độ Half-Current để anh phủ bạt an toàn.
              </p>
            </div>
          )}

          {/* Mật khẩu xác thực */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-zinc-500" /> Nhập mật khẩu xác nhận:
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Nhập mật khẩu (Mặc định: 123456)..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-slate-800 border border-zinc-300 dark:border-slate-700 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-zinc-900 dark:text-white"
            />
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              * Mật khẩu quản trị bảo vệ chống thao tác nhầm từ xa.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-sm cursor-pointer transition-colors flex items-center gap-1.5 ${
                isCurrentlyActive
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {isSubmitting ? 'Đang gửi lệnh...' : isCurrentlyActive ? 'Xác nhận Mở Khóa' : 'Xác nhận Dừng & Hạ Phủ Bạt'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
