import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sun, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft,
  Info
} from 'lucide-react';

export default function SignInPage({ onLoginSuccess }) {
  // Mode: 'form' | 'admin_pin'
  const [authMode, setAuthMode] = useState('form');

  // Form states (NameThatUI compliance)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4-Digit Passcode PIN states
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(null);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [isPinSuccess, setIsPinSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const pinInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Focus on first pin input when opening admin PIN mode
  useEffect(() => {
    if (authMode === 'admin_pin') {
      setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 100);
    }
  }, [authMode]);

  // Handle standard form submit
  const handleRegularFormSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    // Simulate validation
    setTimeout(() => {
      setIsSubmitting(false);
      // As requested: no regular account works currently, inform user
      setFormError({
        title: 'Chế độ công khai đang bảo trì',
        message: 'Tài khoản thường chưa được cấp quyền truy cập. Vui lòng bấm "Continue as Admin" và nhập mã Passcode để đăng nhập toàn quyền.'
      });
    }, 600);
  };

  // Handle PIN Digit Change
  const handlePinChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    
    if (!cleaned) {
      const newPins = [...pinDigits];
      newPins[index] = '';
      setPinDigits(newPins);
      return;
    }

    const digit = cleaned.slice(-1);
    const newPins = [...pinDigits];
    newPins[index] = digit;
    setPinDigits(newPins);
    setPinError(null);

    // Auto advance to next input
    if (index < 3) {
      pinInputRefs[index + 1].current?.focus();
    } else {
      // All 4 digits entered -> auto verify
      const fullPin = newPins.join('');
      verifyPasscode(fullPin);
    }
  };

  // Handle Backspace navigation in PIN
  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    } else if (e.key === 'Escape') {
      setAuthMode('form');
    }
  };

  // Handle PIN Paste (e.g. "0101")
  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newPins = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newPins[i] = pasted[i];
    }
    setPinDigits(newPins);
    
    if (pasted.length === 4) {
      verifyPasscode(pasted);
    } else {
      pinInputRefs[Math.min(pasted.length, 3)].current?.focus();
    }
  };

  // Handle on-screen keypad click
  const handleKeypadPress = (val) => {
    if (val === 'clear') {
      setPinDigits(['', '', '', '']);
      setPinError(null);
      pinInputRefs[0].current?.focus();
      return;
    }
    if (val === 'backspace') {
      const lastFilledIndex = pinDigits.reduce((acc, cur, idx) => (cur !== '' ? idx : acc), -1);
      if (lastFilledIndex >= 0) {
        const newPins = [...pinDigits];
        newPins[lastFilledIndex] = '';
        setPinDigits(newPins);
        pinInputRefs[lastFilledIndex].current?.focus();
      }
      return;
    }

    // Add numeric digit
    const firstEmptyIndex = pinDigits.findIndex(d => d === '');
    if (firstEmptyIndex !== -1) {
      handlePinChange(firstEmptyIndex, String(val));
    }
  };

  // Verify Admin Passcode (Must be 0101)
  const verifyPasscode = (code) => {
    setIsPinVerifying(true);
    setPinError(null);

    setTimeout(() => {
      setIsPinVerifying(false);
      if (code === '0101') {
        setIsPinSuccess(true);
        setTimeout(() => {
          onLoginSuccess({
            role: 'admin',
            username: 'Administrator',
            displayName: 'Quản trị viên (Admin)',
            loginAt: new Date().toISOString()
          });
        }, 700);
      } else {
        setPinError('Mã Passcode không chính xác. Gợi ý: 0101');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        // Clear pins
        setPinDigits(['', '', '', '']);
        pinInputRefs[0].current?.focus();
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#080a10] text-zinc-100 flex flex-col justify-between items-center relative overflow-hidden font-sans select-none">
      
      {/* Fullscreen Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/Login_BG.mp4" type="video/mp4" />
      </video>

      {/* Cinematic Dark Overlay with Glassmorphism for crisp readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/95 via-black/60 to-black/75 z-0 pointer-events-none backdrop-blur-[2px]"></div>

      {/* Subtle Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none z-0 animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none z-0"></div>

      {/* Center Main Card Container (Centered Vertically) */}
      <main className="relative z-10 flex-1 w-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] bg-zinc-950/80 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 relative transition-all duration-300">
          
          {/* Card Ambient Glow Line */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"></div>

          {/* Header Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner shadow-amber-500/20">
              <Sun className="w-6 h-6 animate-[spin_20s_linear_infinite]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase font-playfair">
              TRACKING SOLAR
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Hệ thống giám sát & điều hướng pin mặt trời 2 trục thông minh
            </p>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: NAME THAT UI SIGN-IN FORM */}
          {/* ========================================================================= */}
          {authMode === 'form' ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* 1. Federated Sign-in Button: "Continue as Admin" */}
              <div>
                <button
                  id="btn-continue-as-admin"
                  type="button"
                  onClick={() => setAuthMode('admin_pin')}
                  className="w-full group flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent hover:from-amber-500/25 hover:via-amber-500/20 hover:to-amber-500/5 border border-amber-500/40 hover:border-amber-400/70 text-amber-200 hover:text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-amber-950/20 active:scale-[0.98]"
                  aria-label="Continue as Admin"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
                        Continue as Admin
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono font-normal">PIN</span>
                      </div>
                      <div className="text-[11px] text-amber-300/70 font-normal">
                        Đăng nhập Quản trị viên (Passcode 4 số)
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* 2. Sign-in Method Divider: "or" / "hoặc" */}
              <div className="relative flex items-center justify-center my-4">
                <div className="w-full border-t border-zinc-800"></div>
                <span className="absolute px-3 bg-zinc-950 text-[11px] uppercase tracking-wider text-zinc-500 font-medium font-mono">
                  or
                </span>
              </div>

              {/* 3. Regular Email / Password Form (Native HTML Semantics) */}
              <form onSubmit={handleRegularFormSubmit} className="space-y-4">
                
                {/* Form Alert Message if user attempts submit */}
                {formError && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed pl-5.5">
                      {formError.message}
                    </p>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="signin-email" 
                    className="block text-xs font-semibold text-zinc-300 tracking-wide"
                  >
                    Email hoặc Tên đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="signin-email"
                      type="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Password Field with Visibility Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="signin-password" 
                      className="block text-xs font-semibold text-zinc-300 tracking-wide"
                    >
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Vui lòng sử dụng tính năng "Continue as Admin" (Mã PIN: 0101) để truy cập hệ thống.')}
                      className="text-[11px] text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 transition-all font-sans"
                    />
                    {/* Password Visibility Toggle Button */}
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="remember-me-checkbox" className="text-xs text-zinc-400 cursor-pointer select-none">
                    Ghi nhớ phiên đăng nhập trên thiết bị này
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-submit-signin"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white font-semibold text-sm transition-all duration-150 cursor-pointer active:scale-[0.98] border border-zinc-700/60 shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>

            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: 4-DIGIT ADMIN PASSCODE (PIN: 0101) */
            /* ========================================================================= */
            <div className={`space-y-5 animate-in fade-in duration-200 ${isShaking ? 'animate-shake' : ''}`}>
              
              {/* Back Button & Subtitle */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('form');
                    setPinError(null);
                    setPinDigits(['', '', '', '']);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono">
                  <KeyRound className="w-3 h-3 text-amber-400" />
                  <span>Passcode: 4 số</span>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-base font-bold text-white">
                  Xác thực Quản trị viên
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Nhập mã Passcode 4 chữ số để mở khóa Dashboard
                </p>
              </div>

              {/* 4-Digit Box Inputs */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 my-2" onPaste={handlePinPaste}>
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={pinInputRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    disabled={isPinVerifying || isPinSuccess}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-black rounded-2xl bg-zinc-900/90 border transition-all duration-150 focus:outline-none ${
                      isPinSuccess
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                        : pinError
                        ? 'border-red-500/80 bg-red-950/20 text-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                        : digit
                        ? 'border-amber-400/80 bg-amber-950/20 text-amber-300 shadow-sm shadow-amber-500/10'
                        : 'border-zinc-700/80 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                    }`}
                  />
                ))}
              </div>

              {/* Status Message */}
              {isPinSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="font-bold">Xác thực thành công! Đang chuyển hướng...</span>
                </div>
              ) : pinError ? (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{pinError}</span>
                </div>
              ) : (
                <div className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Passcode mặc định đồ án: <code className="text-amber-400 font-mono font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">0101</code></span>
                </div>
              )}

              {/* On-screen Numeric Keypad for Mobile & Touch devices */}
              <div className="grid grid-cols-3 gap-2 pt-2 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    disabled={isPinVerifying || isPinSuccess}
                    className="py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 active:bg-amber-500/20 active:scale-95 border border-zinc-800 text-base font-bold text-zinc-100 hover:text-white font-mono transition-all cursor-pointer shadow-xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('clear')}
                  disabled={isPinVerifying || isPinSuccess}
                  className="py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all cursor-pointer"
                >
                  Xóa hết
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(0)}
                  disabled={isPinVerifying || isPinSuccess}
                  className="py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 active:bg-amber-500/20 active:scale-95 border border-zinc-800 text-base font-bold text-zinc-100 hover:text-white font-mono transition-all cursor-pointer shadow-xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('backspace')}
                  disabled={isPinVerifying || isPinSuccess}
                  className="py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all cursor-pointer flex items-center justify-center"
                >
                  ⌫ Xóa
                </button>
              </div>

            </div>
          )}

          {/* Footer Info inside Card */}
          <div className="mt-6 pt-4 border-t border-zinc-800/60 text-center">
            <p className="text-[11px] text-zinc-500">
              Sinh viên thực hiện: <span className="text-zinc-300 font-medium">Phan Minh Duy Tiến</span> & <span className="text-zinc-300 font-medium">Võ Hồng Phát</span>
            </p>
          </div>

        </div>
      </main>

      {/* Bottom Minimal Footer */}
      <footer className="relative z-10 w-full text-center py-3 text-[11px] text-zinc-600 font-mono">
        SMART DUAL-AXIS SOLAR TRACKER DASHBOARD • VER 2.0 (FUZZY-PID & PSO)
      </footer>

    </div>
  );
}
