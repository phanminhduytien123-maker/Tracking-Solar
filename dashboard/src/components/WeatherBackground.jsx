import React, { useEffect, useRef, useState } from 'react';

/**
 * Apple Weather-style Photorealistic Dynamic Background
 * Generates realistic atmospheric skies matching Saigon District 1:
 * - Daytime: Crisp azure blue sky, soft 3D white cumulus clouds, radiant sun bloom & rainbow flare (like Apple Weather iPad)
 * - Rain: Moody atmospheric slate, diagonal wind-driven rain streaks & water droplets sliding on glass
 * - Thunderstorm: Dark navy clouds with random double-flash lightning
 * - Night: Deep midnight sapphire, twinkling stars, soft moon & lunar glow
 */
export default function WeatherBackground({ weatherData, customOverrideType = null }) {
  const canvasRef = useRef(null);
  const [lightning, setLightning] = useState(false);
  const animFrameRef = useRef(null);

  const currentWeather = weatherData?.current || {};
  const effectiveType = customOverrideType || currentWeather?.condition?.type || 'partly_cloudy';
  const isDay = customOverrideType ? (customOverrideType.includes('night') ? false : true) : (currentWeather?.isDay ?? 1);
  const timePhase = customOverrideType 
    ? (customOverrideType === 'golden_hour' ? 'golden_hour' : isDay ? 'day' : 'night') 
    : (currentWeather?.timePhase || (isDay ? 'day' : 'night'));

  const windSpeed = currentWeather?.windSpeed || 8;
  const cloudCover = currentWeather?.cloudCover || 50;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initEntities();
    };

    window.addEventListener('resize', handleResize);

    // Entities
    let clouds = [];
    let raindrops = [];
    let glassDroplets = [];
    let stars = [];
    let lightningTimer = null;

    const isRainy = ['rain', 'drizzle', 'thunderstorm'].includes(effectiveType);
    const isThunder = effectiveType === 'thunderstorm';
    const isNight = !isDay || timePhase === 'night';
    const isSunset = timePhase === 'golden_hour';

    function initEntities() {
      clouds = [];
      raindrops = [];
      glassDroplets = [];
      stars = [];

      // 1. Generate Organic Soft Cumulus Clouds (Apple Weather Style)
      const cloudCount = effectiveType === 'clouds' ? 7 : effectiveType === 'partly_cloudy' ? 5 : isRainy ? 6 : 3;
      
      for (let c = 0; c < cloudCount; c++) {
        const puffs = [];
        const puffCount = Math.floor(Math.random() * 10) + 16;
        const clusterWidth = Math.random() * 220 + 260;
        const clusterHeight = clusterWidth * 0.48;

        for (let p = 0; p < puffCount; p++) {
          const t = (p / (puffCount - 1)) - 0.5; // -0.5 to 0.5
          const puffX = t * clusterWidth + (Math.random() - 0.5) * 40;
          // Arch shape for natural puffy top of cloud
          const archY = -Math.cos(t * Math.PI) * (clusterHeight * 0.55);
          const puffY = archY + (Math.random() - 0.5) * 25;
          const radius = Math.random() * 35 + (clusterHeight * 0.45);

          puffs.push({
            x: puffX,
            y: puffY,
            radius,
          });
        }

        clouds.push({
          x: Math.random() * (width + 400) - 200,
          y: Math.random() * (height * 0.42) + 20,
          scale: Math.random() * 0.5 + 0.85,
          speed: (Math.random() * 0.18 + 0.08) * (windSpeed / 10 + 0.5),
          puffs,
          width: clusterWidth,
          opacity: Math.random() * 0.15 + 0.85
        });
      }

      // 2. Rain & Glass Droplets
      if (isRainy) {
        const dropCount = effectiveType === 'drizzle' ? 140 : effectiveType === 'thunderstorm' ? 360 : 240;
        for (let i = 0; i < dropCount; i++) {
          raindrops.push({
            x: Math.random() * (width + 300) - 150,
            y: Math.random() * height,
            length: effectiveType === 'drizzle' ? Math.random() * 14 + 10 : Math.random() * 30 + 20,
            speed: effectiveType === 'drizzle' ? Math.random() * 7 + 6 : Math.random() * 16 + 14,
            thickness: effectiveType === 'drizzle' ? 1 : 1.5,
            opacity: Math.random() * 0.35 + 0.25,
            windOffset: (windSpeed / 25) * 0.35 + 0.1
          });
        }

        const beadCount = 30;
        for (let b = 0; b < beadCount; b++) {
          glassDroplets.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2.2 + 1.2,
            speedY: Math.random() * 1.0 + 0.3,
            trailLength: Math.random() * 20 + 8,
            alpha: Math.random() * 0.4 + 0.25
          });
        }
      }

      // 3. Stars for Night
      if (isNight) {
        for (let s = 0; s < 120; s++) {
          stars.push({
            x: Math.random() * width,
            y: Math.random() * (height * 0.75),
            radius: Math.random() * 1.4 + 0.4,
            alpha: Math.random() * 0.7 + 0.3,
            pulseSpeed: Math.random() * 0.02 + 0.006,
            inc: Math.random() > 0.5
          });
        }
      }
    }

    initEntities();

    // Lightning Generator
    if (isThunder) {
      const triggerLightning = () => {
        const nextTime = Math.random() * 6000 + 3500;
        lightningTimer = setTimeout(() => {
          setLightning(true);
          setTimeout(() => setLightning(false), 70);
          setTimeout(() => setLightning(true), 130);
          setTimeout(() => {
            setLightning(false);
            triggerLightning();
          }, 220);
        }, nextTime);
      };
      triggerLightning();
    }

    // Main Canvas Render
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // --- 1. SKY GRADIENT ---
      let skyGrad = ctx.createLinearGradient(0, 0, 0, height);

      if (lightning) {
        skyGrad.addColorStop(0, '#5a6d96');
        skyGrad.addColorStop(0.5, '#7f93be');
        skyGrad.addColorStop(1, '#3b4b6e');
      } else if (isNight) {
        if (isRainy) {
          skyGrad.addColorStop(0, '#090e1a');
          skyGrad.addColorStop(0.6, '#101828');
          skyGrad.addColorStop(1, '#162238');
        } else {
          skyGrad.addColorStop(0, '#050914');
          skyGrad.addColorStop(0.45, '#0a1429');
          skyGrad.addColorStop(0.85, '#102042');
          skyGrad.addColorStop(1, '#162b55');
        }
      } else if (isSunset) {
        skyGrad.addColorStop(0, '#2c193c');
        skyGrad.addColorStop(0.35, '#5c2448');
        skyGrad.addColorStop(0.7, '#a24b45');
        skyGrad.addColorStop(0.9, '#dd7841');
        skyGrad.addColorStop(1, '#f6ad55');
      } else if (isRainy) {
        skyGrad.addColorStop(0, '#1c2838');
        skyGrad.addColorStop(0.5, '#2c3b4f');
        skyGrad.addColorStop(1, '#3e5066');
      } else if (effectiveType === 'clouds') {
        skyGrad.addColorStop(0, '#364e6b');
        skyGrad.addColorStop(0.5, '#4a6585');
        skyGrad.addColorStop(1, '#6585a9');
      } else {
        // Crisp Apple Weather Daytime Azure Blue (Vivid & Bright)
        skyGrad.addColorStop(0, '#166cb3');
        skyGrad.addColorStop(0.3, '#247fcb');
        skyGrad.addColorStop(0.65, '#3b96e1');
        skyGrad.addColorStop(1, '#6cb7f3');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // --- 2. SUN GLOW & RAINBOW REFRACTION FLARE (Daytime) ---
      if (!isNight && !isRainy && !lightning && !isSunset) {
        const sunX = width * 0.72;
        const sunY = height * 0.12;

        // Big Sun Light Bloom
        const bloom = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, width * 0.65);
        bloom.addColorStop(0, 'rgba(255, 250, 215, 0.45)');
        bloom.addColorStop(0.25, 'rgba(255, 230, 150, 0.22)');
        bloom.addColorStop(0.55, 'rgba(150, 215, 255, 0.12)');
        bloom.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(sunX, sunY, width * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Rainbow Arc (Apple Weather detail)
        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX - 70, sunY + 50, 320, Math.PI * 0.88, Math.PI * 1.52);
        ctx.lineWidth = 22;
        const rainbowGrad = ctx.createLinearGradient(sunX - 380, sunY, sunX, sunY - 260);
        rainbowGrad.addColorStop(0, 'rgba(255, 90, 90, 0.06)');
        rainbowGrad.addColorStop(0.3, 'rgba(255, 220, 90, 0.07)');
        rainbowGrad.addColorStop(0.6, 'rgba(90, 230, 120, 0.06)');
        rainbowGrad.addColorStop(0.85, 'rgba(90, 180, 255, 0.07)');
        rainbowGrad.addColorStop(1, 'rgba(190, 120, 255, 0.05)');
        ctx.strokeStyle = rainbowGrad;
        ctx.stroke();
        ctx.restore();

        // Glowing Sun Disc
        const sunDisc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 65);
        sunDisc.addColorStop(0, '#ffffff');
        sunDisc.addColorStop(0.4, '#fff9db');
        sunDisc.addColorStop(0.8, '#ffe066');
        sunDisc.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = sunDisc;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 65, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 3. NIGHT STARS & MOON ---
      if (isNight && stars.length > 0) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          if (s.inc) {
            s.alpha += s.pulseSpeed;
            if (s.alpha >= 0.95) s.inc = false;
          } else {
            s.alpha -= s.pulseSpeed;
            if (s.alpha <= 0.2) s.inc = true;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(230, 240, 255, ${s.alpha})`;
          ctx.fill();
        }

        const moonX = width * 0.82;
        const moonY = Math.min(height * 0.16, 110);
        const moonR = 34;

        const mGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 3.0);
        mGlow.addColorStop(0, 'rgba(210, 230, 255, 0.25)');
        mGlow.addColorStop(0.6, 'rgba(160, 200, 255, 0.08)');
        mGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 3.0, 0, Math.PI * 2);
        ctx.fill();

        const mBody = ctx.createRadialGradient(moonX - 7, moonY - 7, 3, moonX, moonY, moonR);
        mBody.addColorStop(0, '#ffffff');
        mBody.addColorStop(0.7, '#e2ecf8');
        mBody.addColorStop(1, '#c5d8ed');
        ctx.fillStyle = mBody;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 4. PHOTOREALISTIC SOFT VOLUMETRIC CUMULUS CLOUDS (Apple Weather) ---
      if (clouds.length > 0) {
        for (let i = 0; i < clouds.length; i++) {
          const c = clouds[i];
          c.x += c.speed;
          if (c.x - c.width > width) {
            c.x = -c.width - 150;
            c.y = Math.random() * (height * 0.42) + 20;
          }

          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.scale(c.scale, c.scale);

          // Pass 1: Soft Cloud Body Base (Shading underneath)
          for (let p = 0; p < c.puffs.length; p++) {
            const puff = c.puffs[p];
            const px = puff.x;
            const py = puff.y;
            const pr = puff.radius * 1.15;

            const baseGrad = ctx.createRadialGradient(
              px, 
              py - pr * 0.2, 
              pr * 0.15, 
              px, 
              py + pr * 0.3, 
              pr
            );

            if (isNight) {
              baseGrad.addColorStop(0, `rgba(120, 145, 180, ${c.opacity * 0.35})`);
              baseGrad.addColorStop(0.6, `rgba(50, 70, 105, ${c.opacity * 0.25})`);
              baseGrad.addColorStop(1, 'rgba(20, 35, 60, 0)');
            } else if (isRainy || isThunder) {
              baseGrad.addColorStop(0, `rgba(145, 165, 185, ${c.opacity * 0.7})`);
              baseGrad.addColorStop(0.6, `rgba(90, 110, 130, ${c.opacity * 0.55})`);
              baseGrad.addColorStop(1, 'rgba(40, 55, 75, 0)');
            } else {
              // Daytime Cloud Shading (Soft Powder Blue Sky Shading)
              baseGrad.addColorStop(0, `rgba(240, 248, 255, ${c.opacity * 0.75})`);
              baseGrad.addColorStop(0.55, `rgba(195, 222, 248, ${c.opacity * 0.6})`);
              baseGrad.addColorStop(1, 'rgba(150, 195, 240, 0)');
            }

            ctx.fillStyle = baseGrad;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }

          // Pass 2: Bright White Volumetric Sunlit Highlights (Top of Cloud)
          for (let p = 0; p < c.puffs.length; p++) {
            const puff = c.puffs[p];
            const px = puff.x;
            const py = puff.y - puff.radius * 0.2;
            const pr = puff.radius * 0.85;

            const highlightGrad = ctx.createRadialGradient(
              px - pr * 0.25, 
              py - pr * 0.3, 
              pr * 0.05, 
              px, 
              py, 
              pr
            );

            if (isNight) {
              highlightGrad.addColorStop(0, `rgba(190, 215, 245, ${c.opacity * 0.4})`);
              highlightGrad.addColorStop(1, 'rgba(100, 130, 170, 0)');
            } else if (isRainy || isThunder) {
              highlightGrad.addColorStop(0, `rgba(185, 205, 225, ${c.opacity * 0.65})`);
              highlightGrad.addColorStop(1, 'rgba(120, 140, 165, 0)');
            } else {
              // Pure Brilliant Crisp White Highlights on cloud top
              highlightGrad.addColorStop(0, `rgba(255, 255, 255, ${c.opacity * 0.95})`);
              highlightGrad.addColorStop(0.45, `rgba(250, 253, 255, ${c.opacity * 0.85})`);
              highlightGrad.addColorStop(0.85, `rgba(225, 240, 255, ${c.opacity * 0.4})`);
              highlightGrad.addColorStop(1, 'rgba(200, 230, 255, 0)');
            }

            ctx.fillStyle = highlightGrad;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // --- 5. RAIN STREAKS & WATER DROPLETS ON GLASS ---
      if (isRainy && raindrops.length > 0) {
        ctx.lineWidth = effectiveType === 'drizzle' ? 1.0 : 1.6;
        for (let i = 0; i < raindrops.length; i++) {
          const drop = raindrops[i];
          const windShift = drop.length * Math.tan(drop.windOffset);

          ctx.beginPath();
          const rGrad = ctx.createLinearGradient(drop.x, drop.y, drop.x + windShift, drop.y + drop.length);
          rGrad.addColorStop(0, 'rgba(210, 235, 255, 0.08)');
          rGrad.addColorStop(1, `rgba(230, 245, 255, ${drop.opacity})`);

          ctx.strokeStyle = rGrad;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + windShift, drop.y + drop.length);
          ctx.stroke();

          drop.y += drop.speed;
          drop.x += drop.speed * Math.tan(drop.windOffset);

          if (drop.y > height + 20) {
            drop.y = -drop.length - Math.random() * 50;
            drop.x = Math.random() * (width + 300) - 150;
          }
        }

        // Sliding Glass Beads
        for (let b = 0; b < glassDroplets.length; b++) {
          const bead = glassDroplets[b];
          
          ctx.beginPath();
          ctx.strokeStyle = `rgba(215, 235, 255, ${bead.alpha * 0.4})`;
          ctx.lineWidth = bead.radius * 0.8;
          ctx.lineCap = 'round';
          ctx.moveTo(bead.x, bead.y - bead.trailLength);
          ctx.lineTo(bead.x, bead.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(bead.x, bead.y, bead.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(240, 250, 255, ${bead.alpha})`;
          ctx.fill();

          bead.y += bead.speedY;
          if (bead.y > height + 30) {
            bead.y = -20;
            bead.x = Math.random() * width;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (lightningTimer) clearTimeout(lightningTimer);
    };
  }, [effectiveType, isDay, timePhase, windSpeed, cloudCover]);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block" 
      />
      {/* Soft Apple-style vignette */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 60%, rgba(0, 15, 35, 0.35) 100%)'
        }}
      />
    </div>
  );
}
