with open('dashboard/src/components/ManualControlModal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_imp = "import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';"
new_imp = "import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Moon, Sun, RefreshCw } from 'lucide-react';"
assert old_imp in content, "old_imp not found"
content = content.replace(old_imp, new_imp)

# 2. Update props
old_props = """  onReHome,
  onResetFault,
  onTestDir,
  motors,"""

new_props = """  onReHome,
  onResetFault,
  onTestDir,
  onTestSleep,
  onTestWake,
  onResumeReal,
  motors,"""
assert old_props in content, "old_props not found"
content = content.replace(old_props, new_props)

# 3. Add isSleeping helper
old_manual = "  const isManual = mode === 'MANUAL';"
new_manual = """  const isManual = mode === 'MANUAL';
  const isSleeping = Boolean(system?.isSleeping || system?.isTestSleep || mode === 'SLEEP' || system?.state === 'DEEP_SLEEP');"""
assert old_manual in content, "old_manual not found"
content = content.replace(old_manual, new_manual)

# 4. Add Section 5 after Section 4
old_sec4_end = """              <button
                type="button"
                onClick={() => onTestDir && onTestDir('azimuth', 1)}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm cursor-pointer"
              >
                <span>Test DIR (Quay chậm)</span>
              </button>
            </div>
          </div>"""

new_sec5 = """              <button
                type="button"
                onClick={() => onTestDir && onTestDir('azimuth', 1)}
                className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-semibold text-xs rounded-sm cursor-pointer"
              >
                <span>Test DIR (Quay chậm)</span>
              </button>
            </div>
          </div>

          {/* 5. THỬ NGHIỆM CHU TRÌNH NGỦ ĐÔNG & THỨC DẬY */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <span>5. Thử nghiệm chu trình Ngủ đông & Thức dậy</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-normal">
                (Luôn tự động Home 2 trục trước khi thực hiện)
              </span>
            </div>

            {isSleeping && (
              <div className="text-[11px] text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-2.5 py-1 rounded-xs font-medium flex items-center gap-1.5">
                <span>🌙</span>
                <span>Hệ thống đang ở trạng thái ngủ đông. Nút <b>[Test Wake Up]</b> đã sẵn sàng để thử nghiệm thức dậy!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Nút 1: Test Ngủ */}
              <button
                type="button"
                onClick={onTestSleep}
                className="p-2.5 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-300 text-indigo-950 rounded-sm text-left transition-colors cursor-pointer"
                title="Homing 2 trục -> Đưa giàn pin vào thế ngủ ngay lập tức (không ảnh hưởng giờ RTC)"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                  <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>1. Test Ngủ</span>
                </div>
                <div className="text-[11px] text-indigo-700/80 mt-1 leading-tight">
                  Home 2 trục ➔ Vào thế ngủ an toàn ngay
                </div>
              </button>

              {/* Nút 2: Test Wake Up */}
              <button
                type="button"
                disabled={!isSleeping}
                onClick={onTestWake}
                className={`p-2.5 border rounded-sm text-left transition-colors ${
                  isSleeping
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 cursor-pointer shadow-xs'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60'
                }`}
                title={isSleeping ? "Homing 2 trục -> Quay đón bình minh" : "Chỉ khả dụng khi hệ thống đang ở trạng thái ngủ"}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Sun className={`w-3.5 h-3.5 shrink-0 ${isSleeping ? 'text-amber-600' : 'text-zinc-400'}`} />
                  <span>2. Test Wake Up</span>
                </div>
                <div className={`text-[11px] mt-1 leading-tight ${isSleeping ? 'text-amber-700/80' : 'text-zinc-400'}`}>
                  {isSleeping ? 'Home 2 trục ➔ Quay đón bình minh' : 'Chỉ khả dụng khi đang ngủ'}
                </div>
              </button>

              {/* Nút 3: Quay về trạng thái thật (Reset) */}
              <button
                type="button"
                onClick={onResumeReal}
                className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-sm text-left transition-colors cursor-pointer"
                title="Homing 2 trục -> Khôi phục bám theo thời gian thực RTC/NOAA"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>3. Về trạng thái thật</span>
                </div>
                <div className="text-[11px] text-emerald-700/80 mt-1 leading-tight">
                  Home 2 trục ➔ Bám mặt trời theo giờ RTC
                </div>
              </button>
            </div>
          </div>"""

assert old_sec4_end in content, "old_sec4_end not found"
content = content.replace(old_sec4_end, new_sec5)

with open('dashboard/src/components/ManualControlModal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("ManualControlModal.jsx patched successfully.")

