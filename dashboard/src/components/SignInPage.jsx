import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft
} from 'lucide-react';

import { checkUserLoginAllowedAsync } from '../services/userService';

export default function SignInPage({ onLoginSuccess }) {

  // Mode: 'form' | 'admin_pin'
  const [authMode, setAuthMode] = useState('form');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Captcha Verification States
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);

  // Handle Captcha Click (Smooth spin then auto-verify)
  const handleCaptchaBoxClick = () => {
    if (isCaptchaVerified || isCaptchaLoading) return;
    setIsCaptchaLoading(true);
    setFormError(null);

    setTimeout(() => {
      setIsCaptchaLoading(false);
      setIsCaptchaVerified(true);
    }, 450);
  };

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

  // Handle standard form submit (Cloud Synchronized)
  const handleRegularFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanUser = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check credentials first
    const isGuest = (cleanUser === 'khach123' || cleanUser === 'khach123@gmail.com') && cleanPass === '123';
    if (!isGuest) {
      setFormError('Tên đăng nhập hoặc mật khẩu không chính xác');
      return;
    }

    // Require Captcha verification for guest login
    if (!isCaptchaVerified) {
      setFormError('Vui lòng xác thực "I\'m not a robot" trước khi đăng nhập');
      return;
    }

    setIsSubmitting(true);

    // Asynchronous Cloud Lockout Verification from Firebase Realtime Database
    try {
      const lockoutStatus = await checkUserLoginAllowedAsync(cleanUser);
      if (!lockoutStatus.allowed) {
        setIsSubmitting(false);
        setFormError(lockoutStatus.reason);
        return;
      }
    } catch (err) {
      console.warn('[SignIn] Lockout verification error:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess({
        role: 'guest',
        username: 'khach123',
        displayName: 'Khách (khach123)',
        loginAt: new Date().toISOString()
      });
    }, 600);
  };

  // Handle PIN Digit Change
  const handlePinChange = (index, value) => {
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

    if (index < 3) {
      pinInputRefs[index + 1].current?.focus();
    } else {
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

      {/* Cinematic Dark Overlay with Fluid Transparency */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/80 via-black/35 to-black/55 z-0 pointer-events-none backdrop-blur-[1px]"></div>

      {/* Subtle Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[140px] pointer-events-none z-0 animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/15 blur-[160px] pointer-events-none z-0"></div>

      {/* Center Main Card Container (Liquid Glass Effect) */}
      <main className="relative z-10 flex-1 w-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] bg-white/[0.07] backdrop-blur-[32px] backdrop-saturate-[200%] border border-white/[0.22] hover:border-white/[0.32] rounded-[32px] p-6 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(255,255,255,0.1),0_0_50px_rgba(251,191,36,0.06)] relative transition-all duration-300 overflow-hidden">
          
          {/* Liquid Glass Top Specular Sheen Reflection */}
          <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-white/[0.16] via-white/[0.03] to-transparent pointer-events-none"></div>

          {/* Card Ambient Glow Line */}
          <div className="absolute top-0 inset-x-12 h-[1.5px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"></div>

          {/* Header Title */}
          <div className="text-center mb-6 sm:mb-7 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-times drop-shadow-lg">
              TRACKING SOLAR
            </h2>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: SIGN-IN FORM */}
          {/* ========================================================================= */}
          {authMode === 'form' ? (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 relative z-10">
              
              {/* 1. Federated Sign-in Button */}
              <div>
                <button
                  id="btn-continue-as-admin"
                  type="button"
                  onClick={() => setAuthMode('admin_pin')}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-none bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 hover:border-white/30 text-white font-semibold text-base sm:text-lg transition-all duration-200 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.25)] backdrop-blur-xl active:scale-[0.98] text-center flex items-center justify-center"
                  aria-label="Tiếp tục với quyền admin"
                >
                  <span>Tiếp tục với quyền admin</span>
                </button>
              </div>

              {/* 2. Divider */}
              <div className="flex items-center gap-3.5 my-4 sm:my-5">
                <div className="flex-1 border-t border-white/20"></div>
                <span className="text-xs sm:text-sm uppercase tracking-wider text-zinc-300 font-semibold font-sans select-none">
                  Hoặc
                </span>
                <div className="flex-1 border-t border-white/20"></div>
              </div>

              {/* 3. Regular Login Form */}
              <form onSubmit={handleRegularFormSubmit} className="space-y-4 sm:space-y-5">
                
                {/* Form Error Message (Chữ đỏ, không viền) */}
                {formError && (
                  <div className="text-center py-0.5 animate-in fade-in duration-200">
                    <p className="text-red-400 text-xs sm:text-sm font-medium tracking-wide">
                      {formError}
                    </p>
                  </div>
                )}

                {/* Username / Email Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label 
                    htmlFor="signin-email" 
                    className="block text-sm sm:text-base font-semibold text-zinc-100 tracking-wide drop-shadow-sm"
                  >
                    Email hoặc Tên đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="signin-email"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="Tên tài khoản hoặc email..."
                      className="w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] backdrop-blur-xl border border-white/20 focus:border-amber-400 text-sm sm:text-base text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all font-sans shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label 
                    htmlFor="signin-password" 
                    className="block text-sm sm:text-base font-semibold text-zinc-100 tracking-wide drop-shadow-sm"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 sm:py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] backdrop-blur-xl border border-white/20 focus:border-amber-400 text-sm sm:text-base text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all font-sans shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-black/40 border-white/30 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="remember-me-checkbox" className="text-xs sm:text-sm text-zinc-200 cursor-pointer select-none">
                    Ghi nhớ phiên đăng nhập trên thiết bị này
                  </label>
                </div>

                {/* ========================================================= */}
                {/* Standard Google reCAPTCHA v2 Widget Box (Rectangular) */}
                {/* ========================================================= */}
                <div className="pt-1">
                  <div 
                    onClick={handleCaptchaBoxClick}
                    className="w-full h-[74px] px-3.5 bg-[#f9f9f9] hover:bg-[#fafafa] border border-[#d3d3d3] rounded-[3px] shadow-[0_0_4px_1px_rgba(0,0,0,0.08)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] select-none"
                    role="checkbox"
                    aria-checked={isCaptchaVerified}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleCaptchaBoxClick(); }}
                  >
                    {/* Left: Square Checkbox + "I'm not a robot" */}
                    <div className="flex items-center gap-3.5">
                      <div className={`w-[28px] h-[28px] rounded-[3px] border-2 flex items-center justify-center transition-all duration-150 ${
                        isCaptchaVerified 
                          ? 'border-transparent bg-transparent' 
                          : isCaptchaLoading
                          ? 'border-[#1a73e8] bg-white'
                          : 'border-[#c1c1c1] bg-white hover:border-[#a6a6a6]'
                      }`}>
                        {isCaptchaVerified ? (
                          <svg className="w-8 h-8 text-[#0f9d58] -ml-0.5 -mt-0.5 animate-in zoom-in-75 duration-200" viewBox="0 0 36 36" fill="none">
                            <path d="M7 18.5L14 25.5L29 10.5" stroke="#0f9d58" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : isCaptchaLoading ? (
                          <span className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin"></span>
                        ) : null}
                      </div>
                      
                      <span className="text-[14px] sm:text-[15px] text-[#282727] font-normal tracking-normal select-none">
                        I'm not a robot
                      </span>
                    </div>

                    {/* Right: Authentic Google reCAPTCHA Logo & Links */}
                    <div className="flex flex-col items-center justify-center select-none shrink-0 pl-2">
                      <div className="w-8 h-8 relative flex items-center justify-center">
                        <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
                          {/* Top Blue Arrow */}
                          <path 
                            d="M36.4 14.2C33.2 9.8 28 7 22.2 7.4C13.8 7.9 6.9 14.9 6.9 23.5c0 1.6 0.3 3.2 0.8 4.7l4.9-2.8c-0.2-0.6-0.3-1.3-0.3-1.9 0-6 4.9-10.9 10.9-10.9 3.5 0 6.5 1.6 8.5 4.1L26 21h16V5l-5.6 9.2z" 
                            fill="#1a73e8" 
                          />
                          {/* Bottom Silver Arrow */}
                          <path 
                            d="M11.6 33.8C14.8 38.2 20 41 25.8 40.6C34.2 40.1 41.1 33.1 41.1 24.5c0-1.6-0.3-3.2-0.8-4.7l-4.9 2.8c0.2 0.6 0.3 1.3 0.3 1.9 0 6-4.9 10.9-10.9 10.9-3.5 0-6.5-1.6-8.5-4.1L22 27H6v16l5.6-9.2z" 
                            fill="#9e9e9e" 
                          />
                        </svg>
                      </div>
                      <span className="text-[10px] font-medium text-[#555] tracking-tight -mt-0.5">reCAPTCHA</span>
                      <div className="flex gap-1 text-[8px] text-[#555] mt-0.5">
                        <span className="hover:underline">Privacy</span>
                        <span>-</span>
                        <span className="hover:underline">Terms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button (Liquid Glass) */}
                <button
                  id="btn-submit-signin"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-gradient-to-r from-white/[0.22] via-white/[0.15] to-white/[0.22] hover:from-white/[0.32] hover:via-white/[0.22] hover:to-white/[0.32] border border-white/30 text-white font-bold text-base sm:text-lg transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-xl flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
            <div className={`space-y-6 animate-in fade-in duration-200 py-2 relative z-10 ${isShaking ? 'animate-shake' : ''}`}>
              
              {/* Back Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('form');
                    setPinError(null);
                    setPinDigits(['', '', '', '']);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base text-zinc-200 hover:text-white transition-colors cursor-pointer py-1 font-medium drop-shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Quay lại</span>
                </button>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-md">
                  Xác thực Quản trị viên
                </h3>
                <p className="text-sm text-zinc-200">
                  Nhập mã Passcode 4 chữ số để mở khóa Dashboard
                </p>
              </div>

              {/* 4-Digit Box Inputs (Liquid Glass) */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 my-6" onPaste={handlePinPaste}>
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
                    className={`w-14 h-16 sm:w-16 sm:h-18 text-center text-3xl sm:text-4xl font-mono font-black rounded-2xl backdrop-blur-xl border transition-all duration-150 focus:outline-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] ${
                      isPinSuccess
                        ? 'border-emerald-400 bg-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                        : pinError
                        ? 'border-red-400/80 bg-red-500/25 text-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/30'
                        : digit
                        ? 'border-amber-400/90 bg-amber-500/25 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                        : 'bg-white/[0.08] hover:bg-white/[0.12] border-white/20 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30'
                    }`}
                  />
                ))}
              </div>

              {/* Status Message */}
              {isPinSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/25 backdrop-blur-xl border border-emerald-400/40 text-sm text-emerald-200 flex items-center justify-center gap-2 animate-in zoom-in-95 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-bounce" />
                  <span className="font-bold">Xác thực thành công! Đang chuyển hướng...</span>
                </div>
              )}

              {pinError && (
                <div className="p-3.5 rounded-2xl bg-red-500/25 backdrop-blur-xl border border-red-400/40 text-sm text-red-200 flex items-center justify-center gap-2 animate-in fade-in shadow-lg">
                  <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

            </div>
          )}

          {/* Footer Info inside Card */}
          <div className="mt-6 sm:mt-7 pt-4 border-t border-white/15 text-center relative z-10">
            <p className="text-xs sm:text-sm text-zinc-300">
              Sinh viên thực hiện: <span className="text-white font-semibold">Phan Minh Duy Tiến</span> & <span className="text-white font-semibold">Võ Hồng Phát</span>
            </p>
          </div>

        </div>
      </main>

      {/* Bottom Minimal Footer */}
      <footer className="relative z-10 w-full text-center py-3.5 px-4 text-xs sm:text-sm text-zinc-400 font-sans flex items-center justify-center gap-1.5 select-none">
        <span>Powered by</span>
        <span className="font-semibold text-zinc-200 inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.6 17.5L8.2 4.4c.1-.4.6-.5.9-.2l3.4 5.3-7.9 8zm14.8 0L13.7 2.3c-.2-.4-.8-.4-1 0L3.8 20.3l7.9-4.5 7.7 1.7zm.8 1.8L18.4 12l-6.7 3.8 8.5 3.5z" />
          </svg>
          Google Firebase
        </span>
      </footer>

    </div>
  );
}
