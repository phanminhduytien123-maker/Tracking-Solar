import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft,
  RotateCcw,
  Info,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';

// Authentic reCAPTCHA Visual Challenges
const CAPTCHA_CHALLENGES = [
  {
    id: 'solar',
    title: 'Tấm pin năng lượng mặt trời',
    instruction: 'Chọn tất cả hình ảnh có chứa',
    hint: 'Nhấp vào Xác minh sau khi bạn đã chọn hết các hình ảnh liên quan.',
    items: [
      { id: 1, title: 'Cánh đồng quang điện mặt trời', isTarget: true, img: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=240&auto=format&fit=crop&q=80' },
      { id: 2, title: 'Tua bin gió phong điện', isTarget: false, img: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=240&auto=format&fit=crop&q=80' },
      { id: 3, title: 'Mái nhà lắp pin mặt trời', isTarget: true, img: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=240&auto=format&fit=crop&q=80' },
      { id: 4, title: 'Cột điện cao thế đường dây', isTarget: false, img: 'https://images.unsplash.com/photo-1558441719-8b449c6ff67c?w=240&auto=format&fit=crop&q=80' },
      { id: 5, title: 'Hệ thống Solar Tracker xoay', isTarget: true, img: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=240&auto=format&fit=crop&q=80' },
      { id: 6, title: 'Trạm sạc ô tô điện', isTarget: false, img: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=240&auto=format&fit=crop&q=80' },
      { id: 7, title: 'Tấm thu năng lượng mặt trời', isTarget: true, img: 'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=240&auto=format&fit=crop&q=80' },
      { id: 8, title: 'Thành phố về đêm', isTarget: false, img: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=240&auto=format&fit=crop&q=80' },
      { id: 9, title: 'Rừng cây tự nhiên', isTarget: false, img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=240&auto=format&fit=crop&q=80' },
    ]
  },
  {
    id: 'traffic',
    title: 'Đèn tín hiệu giao thông',
    instruction: 'Chọn tất cả hình ảnh có chứa',
    hint: 'Nhấp vào Xác minh sau khi bạn đã chọn hết các hình ảnh liên quan.',
    items: [
      { id: 1, title: 'Đèn giao thông ngã tư', isTarget: true, img: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=240&auto=format&fit=crop&q=80' },
      { id: 2, title: 'Đường cao tốc ban đêm', isTarget: false, img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=240&auto=format&fit=crop&q=80' },
      { id: 3, title: 'Đèn tín hiệu người đi bộ', isTarget: true, img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=240&auto=format&fit=crop&q=80' },
      { id: 4, title: 'Cầu vượt xe chạy', isTarget: false, img: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=240&auto=format&fit=crop&q=80' },
      { id: 5, title: 'Đèn đường chiếu sáng', isTarget: false, img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=240&auto=format&fit=crop&q=80' },
      { id: 6, title: 'Cột đèn đỏ ngã tư', isTarget: true, img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=240&auto=format&fit=crop&q=80' },
      { id: 7, title: 'Xe buýt thành phố', isTarget: false, img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=240&auto=format&fit=crop&q=80' },
      { id: 8, title: 'Cụm đèn xanh đỏ', isTarget: true, img: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=240&auto=format&fit=crop&q=80' },
      { id: 9, title: 'Biển báo giao thông', isTarget: false, img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=240&auto=format&fit=crop&q=80' },
    ]
  }
];

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
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selectedTileIds, setSelectedTileIds] = useState([]);
  const [challengeError, setChallengeError] = useState(null);
  const [isVerifyingChallenge, setIsVerifyingChallenge] = useState(false);

  const currentChallenge = CAPTCHA_CHALLENGES[challengeIdx];

  // Open Challenge Modal when clicking checkbox
  const handleCaptchaBoxClick = () => {
    if (isCaptchaVerified) return;
    setFormError(null);
    setChallengeError(null);
    setSelectedTileIds([]);
    setIsChallengeOpen(true);
  };

  // Toggle Tile Selection
  const toggleTileSelection = (tileId) => {
    setChallengeError(null);
    setSelectedTileIds(prev => 
      prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]
    );
  };

  // Switch / Reload Challenge
  const handleReloadChallenge = () => {
    setChallengeIdx(prev => (prev + 1) % CAPTCHA_CHALLENGES.length);
    setSelectedTileIds([]);
    setChallengeError(null);
  };

  // Verify User's Selection in Challenge Modal
  const handleVerifyChallenge = () => {
    setIsVerifyingChallenge(true);
    setChallengeError(null);

    setTimeout(() => {
      setIsVerifyingChallenge(false);
      const targetIds = currentChallenge.items.filter(i => i.isTarget).map(i => i.id);
      
      // Must select all target items and no wrong items
      const isAllTargetSelected = targetIds.every(id => selectedTileIds.includes(id));
      const hasNoWrongSelected = selectedTileIds.every(id => targetIds.includes(id));
      const isSuccess = isAllTargetSelected && hasNoWrongSelected && selectedTileIds.length > 0;

      if (isSuccess) {
        setIsCaptchaVerified(true);
        setIsChallengeOpen(false);
        setFormError(null);
      } else {
        setChallengeError('Chưa chính xác. Vui lòng chọn tất cả các hình ảnh phù hợp và nhấn Xác minh lại.');
      }
    }, 400);
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

  // Handle standard form submit
  const handleRegularFormSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanUser = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check if Guest Account (khach123 / 123)
    const isGuest = (cleanUser === 'khach123' || cleanUser === 'khach123@gmail.com') && cleanPass === '123';

    if (!isGuest) {
      setFormError({
        title: 'Đăng nhập không thành công',
        message: 'Tên đăng nhập hoặc mật khẩu không đúng. (Gợi ý tài khoản khách: khach123 / Mật khẩu: 123)'
      });
      return;
    }

    // Require Captcha verification for guest login
    if (!isCaptchaVerified) {
      setFormError({
        title: 'Chưa xác thực Captcha',
        message: 'Vui lòng nhấp vào ô "Tôi không phải là người máy" và hoàn thành xác thực hình ảnh.'
      });
      return;
    }

    setIsSubmitting(true);
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

      {/* Cinematic Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/95 via-black/60 to-black/75 z-0 pointer-events-none backdrop-blur-[2px]"></div>

      {/* Subtle Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none z-0 animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none z-0"></div>

      {/* Center Main Card Container */}
      <main className="relative z-10 flex-1 w-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] bg-zinc-950/85 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/90 relative transition-all duration-300">
          
          {/* Card Ambient Glow Line */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"></div>

          {/* Header Title */}
          <div className="text-center mb-6 sm:mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-playfair drop-shadow-md">
              Tracking Solar
            </h2>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: SIGN-IN FORM */}
          {/* ========================================================================= */}
          {authMode === 'form' ? (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
              
              {/* 1. Federated Sign-in Button */}
              <div>
                <button
                  id="btn-continue-as-admin"
                  type="button"
                  onClick={() => setAuthMode('admin_pin')}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-500/25 hover:from-amber-500/35 hover:via-amber-500/25 hover:to-amber-500/35 border border-amber-500/60 hover:border-amber-400 text-amber-200 hover:text-white font-bold text-base sm:text-lg transition-all duration-200 cursor-pointer shadow-lg shadow-amber-950/30 active:scale-[0.98] text-center flex items-center justify-center"
                  aria-label="Tiếp tục với quyền admin"
                >
                  <span>Tiếp tục với quyền admin</span>
                </button>
              </div>

              {/* 2. Divider */}
              <div className="relative flex items-center justify-center my-4 sm:my-5">
                <div className="w-full border-t border-zinc-700/80"></div>
                <span className="absolute px-4 bg-zinc-950 text-xs sm:text-sm uppercase tracking-wider text-zinc-400 font-bold font-sans">
                  Hoặc
                </span>
              </div>

              {/* 3. Regular Login Form */}
              <form onSubmit={handleRegularFormSubmit} className="space-y-4 sm:space-y-5">
                
                {/* Form Alert Message */}
                {formError && (
                  <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs sm:text-sm text-amber-200 space-y-1 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span>{formError.title}</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed pl-6">
                      {formError.message}
                    </p>
                  </div>
                )}

                {/* Username / Email Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label 
                    htmlFor="signin-email" 
                    className="block text-sm sm:text-base font-semibold text-zinc-200 tracking-wide"
                  >
                    Email hoặc Tên đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="signin-email"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="khach123 hoặc email..."
                      className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="signin-password" 
                      className="block text-sm sm:text-base font-semibold text-zinc-200 tracking-wide"
                    >
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Vui lòng sử dụng tính năng "Tiếp tục với quyền admin" (Mã PIN: 0101) hoặc tài khoản khách: khach123 / 123.')}
                      className="text-xs sm:text-sm text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 sm:py-3.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all font-sans"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
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
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="remember-me-checkbox" className="text-xs sm:text-sm text-zinc-300 cursor-pointer select-none">
                    Ghi nhớ phiên đăng nhập trên thiết bị này
                  </label>
                </div>

                {/* ========================================================= */}
                {/* Google reCAPTCHA v2 Checkbox & Trigger */}
                {/* ========================================================= */}
                <div className="pt-1 relative">
                  <div 
                    onClick={handleCaptchaBoxClick}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer select-none ${
                      isCaptchaVerified 
                        ? 'bg-zinc-900/95 border-emerald-500/80 shadow-md shadow-emerald-950/30' 
                        : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-700 hover:border-zinc-500 active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox box */}
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                        isCaptchaVerified 
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm' 
                          : 'bg-zinc-800/90 border-zinc-500 hover:border-zinc-300'
                      }`}>
                        {isCaptchaVerified && (
                          <Check className="w-5 h-5 text-white stroke-[3] animate-in zoom-in-75 duration-200" />
                        )}
                      </div>
                      
                      <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                        {isCaptchaVerified ? 'Đã xác thực thành công' : 'Tôi không phải là người máy'}
                      </span>
                    </div>

                    {/* reCAPTCHA Brand Badge */}
                    <div className="flex flex-col items-center justify-center text-[9px] text-zinc-400 leading-tight pl-2.5 border-l border-zinc-800">
                      <div className="w-6 h-6 flex items-center justify-center text-sky-400">
                        <ShieldCheck className="w-5 h-5 text-sky-400" />
                      </div>
                      <span className="font-bold text-zinc-300 text-[10px] tracking-tight">reCAPTCHA</span>
                      <div className="flex gap-1 text-[8px] text-zinc-500 mt-0.5">
                        <span>Bảo mật</span>
                        <span>-</span>
                        <span>Điều khoản</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-submit-signin"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white font-bold text-sm sm:text-base transition-all duration-150 cursor-pointer active:scale-[0.98] border border-zinc-700 shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"></span>
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
            <div className={`space-y-6 animate-in fade-in duration-200 py-2 ${isShaking ? 'animate-shake' : ''}`}>
              
              {/* Back Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('form');
                    setPinError(null);
                    setPinDigits(['', '', '', '']);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base text-zinc-300 hover:text-white transition-colors cursor-pointer py-1 font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Quay lại</span>
                </button>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Xác thực Quản trị viên
                </h3>
                <p className="text-sm text-zinc-300">
                  Nhập mã Passcode 4 chữ số để mở khóa Dashboard
                </p>
              </div>

              {/* 4-Digit Box Inputs */}
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
                    className={`w-14 h-16 sm:w-16 sm:h-18 text-center text-3xl sm:text-4xl font-mono font-black rounded-2xl bg-zinc-900/90 border transition-all duration-150 focus:outline-none ${
                      isPinSuccess
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                        : pinError
                        ? 'border-red-500/80 bg-red-950/20 text-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                        : digit
                        ? 'border-amber-400/80 bg-amber-950/20 text-amber-300 shadow-sm shadow-amber-500/10'
                        : 'border-zinc-700 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                    }`}
                  />
                ))}
              </div>

              {/* Status Message */}
              {isPinSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-300 flex items-center justify-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                  <span className="font-bold">Xác thực thành công! Đang chuyển hướng...</span>
                </div>
              )}

              {pinError && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-300 flex items-center justify-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

            </div>
          )}

          {/* Footer Info inside Card */}
          <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 text-center">
            <p className="text-xs sm:text-sm text-zinc-400">
              Sinh viên thực hiện: <span className="text-zinc-200 font-semibold">Phan Minh Duy Tiến</span> & <span className="text-zinc-200 font-semibold">Võ Hồng Phát</span>
            </p>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* POPUP MODAL: AUTHENTIC GOOGLE reCAPTCHA IMAGE CHALLENGE */}
      {/* ========================================================================= */}
      {isChallengeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          
          <div className="w-full max-w-[390px] bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-300 animate-in zoom-in-95 duration-200">
            
            {/* Header: Google Blue Banner */}
            <div className="bg-[#1a73e8] text-white p-4 relative">
              <button 
                type="button"
                onClick={() => setIsChallengeOpen(false)}
                className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>

              <p className="text-xs text-blue-100 font-medium">
                {currentChallenge.instruction}
              </p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mt-0.5">
                {currentChallenge.title}
              </h3>
              <p className="text-[11px] text-blue-100 mt-1 leading-snug">
                {currentChallenge.hint}
              </p>
            </div>

            {/* Error Banner if invalid selection */}
            {challengeError && (
              <div className="bg-red-50 text-red-700 border-b border-red-200 px-3.5 py-2 text-xs flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{challengeError}</span>
              </div>
            )}

            {/* 3x3 Image Grid */}
            <div className="p-3 bg-[#f5f5f5]">
              <div className="grid grid-cols-3 gap-2">
                {currentChallenge.items.map((item) => {
                  const isSelected = selectedTileIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleTileSelection(item.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150 select-none group bg-zinc-200 ${
                        isSelected 
                          ? 'border-[#1a73e8] ring-2 ring-[#1a73e8]/30 scale-[0.96] shadow-md' 
                          : 'border-transparent hover:border-blue-300 hover:scale-[0.98]'
                      }`}
                    >
                      <img 
                        src={item.img} 
                        alt={item.title} 
                        className={`w-full h-full object-cover transition-transform duration-200 ${isSelected ? 'brightness-90' : 'group-hover:scale-105'}`}
                        loading="eager"
                      />

                      {/* Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Small Caption */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1">
                        <p className="text-[10px] text-white/90 truncate font-medium text-center">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-white border-t border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                <button
                  type="button"
                  onClick={handleReloadChallenge}
                  title="Đổi câu đố khác"
                  className="p-2 rounded-full hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => alert('Vui lòng chọn tất cả các ô hình ảnh tương ứng với tiêu đề phía trên.')}
                  title="Thông tin trợ giúp"
                  className="p-2 rounded-full hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChallengeOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleVerifyChallenge}
                  disabled={isVerifyingChallenge}
                  className="px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.97] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isVerifyingChallenge ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Xác minh</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Minimal Footer */}
      <footer className="relative z-10 w-full text-center py-3 text-xs text-zinc-400 font-mono">
        SMART DUAL-AXIS SOLAR TRACKER DASHBOARD • VER 2.0 (FUZZY-PID & PSO)
      </footer>

    </div>
  );
}
