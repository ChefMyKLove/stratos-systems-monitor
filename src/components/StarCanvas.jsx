import { useEffect, useRef } from 'react';

const WINDOW_SEC = 5400; // 90-minute transition windows

// --- Helpers ---
function lerp(a, b, t) { return a + (b - a) * t; }

function lerpHSL([h1, s1, l1], [h2, s2, l2], t) {
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [(h1 + dh * t + 360) % 360, lerp(s1, s2, t), lerp(l1, l2, t)];
}

function hsla([h, s, l], a = 1) {
  return `hsla(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%,${a})`;
}

// Sky color keyframes per phase
const NIGHT = { top: [220, 80, 8],  mid: [240, 60, 6],  bot: [220, 70, 5]  };
const DAWN  = { top: [215, 55, 18], mid: [25,  70, 30], bot: [10,  65, 35] };
const DAY   = { top: [210, 75, 50], mid: [200, 65, 60], bot: [195, 55, 65] };
const DUSK  = { top: [225, 65, 14], mid: [20,  75, 28], bot: [285, 55, 22] };

function getSkyColors(skyT, isDusk) {
  const tr = isDusk ? DUSK : DAWN;
  if (skyT <= 0.5) {
    const t = skyT * 2;
    return {
      top: lerpHSL(NIGHT.top, tr.top, t),
      mid: lerpHSL(NIGHT.mid, tr.mid, t),
      bot: lerpHSL(NIGHT.bot, tr.bot, t),
    };
  }
  const t = (skyT - 0.5) * 2;
  return {
    top: lerpHSL(tr.top, DAY.top, t),
    mid: lerpHSL(tr.mid, DAY.mid, t),
    bot: lerpHSL(tr.bot, DAY.bot, t),
  };
}

// Returns { skyT: 0-1, isDusk: bool, phase: string }
function getSkyState(nowSec, sunrise, sunset) {
  if (!sunrise || !sunset) return { skyT: 0, isDusk: false, phase: 'night' };
  const dawnS = sunrise - WINDOW_SEC, dawnE = sunrise + WINDOW_SEC;
  const duskS = sunset  - WINDOW_SEC, duskE = sunset  + WINDOW_SEC;
  if (nowSec < dawnS || nowSec >= duskE) {
    return { skyT: 0, isDusk: nowSec >= duskE, phase: 'night' };
  }
  if (nowSec < dawnE) {
    return { skyT: (nowSec - dawnS) / (WINDOW_SEC * 2), isDusk: false, phase: 'dawn' };
  }
  if (nowSec < duskS) {
    return { skyT: 1, isDusk: false, phase: 'day' };
  }
  return { skyT: 1 - (nowSec - duskS) / (WINDOW_SEC * 2), isDusk: true, phase: 'dusk' };
}

function getWeatherType(condition, description) {
  const c = (condition || '').toLowerCase();
  const d = (description || '').toLowerCase();
  if (c === 'thunderstorm' || d.includes('thunder'))                  return 'thunder';
  if (d.includes('blizzard') || d.includes('heavy snow'))             return 'blizzard';
  if (d.includes('flurr') || d.includes('light snow'))               return 'flurries';
  if (c === 'snow' || d.includes('snow'))                             return 'snow';
  if (d.includes('sleet') || d.includes('ice pellet'))               return 'sleet';
  if (d.includes('heavy rain') || d.includes('shower rain'))          return 'heavyrain';
  if (d.includes('drizzle') || c === 'drizzle')                      return 'drizzle';
  if (c === 'rain' || d.includes('rain'))                            return 'rain';
  if (c === 'fog' || c === 'mist' || d.includes('fog') || d.includes('mist')) return 'fog';
  if (d.includes('haze') || d.includes('smoke') || d.includes('dust') || d.includes('sand')) return 'haze';
  if (d.includes('overcast'))                                         return 'overcast';
  if (c === 'clouds')                                                 return 'cloudy';
  return 'clear';
}

function generateLightningBolt(x1, y1, x2, y2) {
  const points = [{ x: x1, y: y1 }];
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: lerp(x1, x2, t) + (Math.random() - 0.5) * 70,
      y: lerp(y1, y2, t),
    });
  }
  return points;
}

// --- Component ---
export default function StarCanvas({ condition = '', description = '', sunrise, sunset }) {
  const bgRef  = useRef(null);
  const rfRef  = useRef(null);
  const shootingStarsRef = useRef(Array.from({ length: 6 }, () => ({ active: false })));
  const skyStateRef      = useRef({ skyT: 0, isDusk: false, phase: 'night' });
  const weatherRef       = useRef({ type: 'clear' });
  const particlesRef     = useRef({});
  const lightningRef     = useRef({ active: false, alpha: 0, next: Date.now() + 6000, bolts: [] });

  useEffect(() => { window._shootingStars = shootingStarsRef.current; }, []);

  useEffect(() => {
    weatherRef.current.type = getWeatherType(condition, description);
  }, [condition, description]);

  useEffect(() => {
    const root = document.documentElement;
    function update() {
      const state = getSkyState(Date.now() / 1000, sunrise, sunset);
      skyStateRef.current = state;
      // Darken card glass as sky brightens so text stays readable
      const t = state.skyT;
      const glassAlpha  = lerp(0.07, 0.52, t);
      const borderAlpha = lerp(0.10, 0.28, t);
      root.style.setProperty('--glass',        `rgba(4,7,18,${glassAlpha.toFixed(2)})`);
      root.style.setProperty('--glass-border', `rgba(255,255,255,${borderAlpha.toFixed(2)})`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => {
      clearInterval(id);
      root.style.removeProperty('--glass');
      root.style.removeProperty('--glass-border');
    };
  }, [sunrise, sunset]);

  // ---- Background canvas ----
  useEffect(() => {
    const canvas = bgRef.current;
    const ctx = canvas.getContext('2d');
    let W, H, stars = [], animId;
    const LAYER_SPEEDS = [0.08, 0.18, 0.32];

    function makestar() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random(), speed: Math.random() * 0.003 + 0.001,
        layer: Math.floor(Math.random() * 3),
      };
    }

    function initParticles() {
      particlesRef.current = {
        rain: Array.from({ length: 160 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          speed: 8 + Math.random() * 7,
          len: 14 + Math.random() * 12,
          alpha: 0.28 + Math.random() * 0.35,
        })),
        snow: Array.from({ length: 130 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: 1.4 + Math.random() * 1.6,
          vy: 0.5 + Math.random() * 0.9,
          vx: (Math.random() - 0.5) * 0.5,
          phase: Math.random() * Math.PI * 2,
          wobble: 0.3 + Math.random() * 0.6,
        })),
        fog: Array.from({ length: 7 }, (_, i) => ({
          x: Math.random() * W,
          y: H * (0.08 + i * 0.13),
          w: W * (1.6 + Math.random() * 0.8),
          h: 65 + Math.random() * 90,
          speed: 0.12 + Math.random() * 0.22,
          alpha: 0.042 + Math.random() * 0.055,
          dir: Math.random() < 0.5 ? 1 : -1,
        })),
        clouds: Array.from({ length: 9 }, () => ({
          x: Math.random() * W,
          y: H * (0.04 + Math.random() * 0.34),
          speed: 0.18 + Math.random() * 0.28,
          dir: Math.random() < 0.5 ? 1 : -1,
          scale: 0.55 + Math.random() * 0.9,
          alpha: 0.07 + Math.random() * 0.11,
          blobs: Array.from({ length: 5 }, () => ({
            ox: (Math.random() - 0.5) * 130,
            oy: (Math.random() - 0.5) * 45,
            r: 38 + Math.random() * 55,
          })),
        })),
      };
    }

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars = Array.from({ length: 180 }, makestar);
      window._bgCanvas = canvas;
      initParticles();
    }

    // --- Shooting star spawner ---
    function spawnShootingStar() {
      const ss = shootingStarsRef.current.find(s => !s.active);
      if (!ss) return;
      const speed = 8 + Math.random() * 12;
      const roll  = Math.random();
      if (roll < 0.38) {
        const fromLeft = Math.random() < 0.5;
        const a = ((25 + Math.random() * 25) * Math.PI) / 180;
        if (fromLeft) { ss.x = -20; ss.y = Math.random() * H * 0.55; ss.vx = Math.cos(a)*speed; ss.vy = Math.sin(a)*speed; }
        else          { ss.x = W+20; ss.y = Math.random() * H * 0.55; ss.vx = -Math.cos(a)*speed; ss.vy = Math.sin(a)*speed; }
      } else if (roll < 0.72) {
        const fromLeft = Math.random() < 0.5;
        const a = ((40 + Math.random() * 20) * Math.PI) / 180;
        if (fromLeft) { ss.x = Math.random()*W*0.35; ss.y = -20; ss.vx = Math.sin(a)*speed; ss.vy = Math.cos(a)*speed; }
        else          { ss.x = W*0.65+Math.random()*W*0.35; ss.y = -20; ss.vx = -Math.sin(a)*speed; ss.vy = Math.cos(a)*speed; }
      } else {
        const fromLeft = Math.random() < 0.5;
        const tY = H * (0.35 + Math.random() * 0.3);
        const sY = tY - H * (0.15 + Math.random() * 0.2);
        if (fromLeft) { ss.x=-20; ss.y=Math.max(0,sY); const dx=W*1.2,dy=tY-ss.y,l=Math.sqrt(dx*dx+dy*dy); ss.vx=(dx/l)*speed; ss.vy=(dy/l)*speed; }
        else          { ss.x=W+20; ss.y=Math.max(0,sY); const dx=-W*1.2,dy=tY-ss.y,l=Math.sqrt(dx*dx+dy*dy); ss.vx=(dx/l)*speed; ss.vy=(dy/l)*speed; }
      }
      ss.speed = speed; ss.width = 1 + Math.random() * 1.2;
      ss.maxLife = 60 + Math.random() * 45; ss.life = ss.maxLife;
      ss.alpha = 0; ss.active = true; ss.hue = Math.random() * 360;
    }

    let nextShot  = Date.now() + 3000 + Math.random() * 5000;
    let nextShot2 = Date.now() + 7000 + Math.random() * 8000;

    // --- Weather render helpers ---
    function drawRain(mode) {
      const p = particlesRef.current;
      if (!p.rain) return;
      const cfg = {
        drizzle:   { count: 55,  speed: 0.7, len: 10, alpha: 0.18, w: 0.7 },
        normal:    { count: 110, speed: 1.0, len: 18, alpha: 0.28, w: 0.9 },
        heavy:     { count: 160, speed: 1.6, len: 28, alpha: 0.40, w: 1.2 },
      }[mode] || { count: 110, speed: 1.0, len: 18, alpha: 0.28, w: 0.9 };

      ctx.save();
      ctx.lineWidth = cfg.w;
      p.rain.slice(0, cfg.count).forEach(r => {
        r.y += r.speed * cfg.speed;
        r.x -= r.speed * cfg.speed * 0.18;
        if (r.y > H + cfg.len) { r.y = -cfg.len; r.x = Math.random() * W; }
        const a = r.alpha * (cfg.alpha / 0.28);
        ctx.strokeStyle = `rgba(160,185,230,${a})`;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - cfg.len * 0.18, r.y - cfg.len);
        ctx.stroke();
      });
      ctx.restore();
    }

    function drawSnow(heavy) {
      const p = particlesRef.current;
      if (!p.snow) return;
      const count = heavy ? 130 : 55;
      p.snow.slice(0, count).forEach(s => {
        s.y += s.vy * (heavy ? 1.1 : 0.7);
        s.phase += 0.018;
        s.x += s.vx + Math.sin(s.phase) * s.wobble;
        if (s.y > H + 12) { s.y = -12; s.x = Math.random() * W; }
        if (s.x > W + 12) s.x = -12;
        if (s.x < -12)    s.x = W + 12;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
        g.addColorStop(0, `rgba(255,255,255,0.88)`);
        g.addColorStop(1, `rgba(200,220,255,0)`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });
    }

    function drawFog(thick) {
      const p = particlesRef.current;
      if (!p.fog) return;
      p.fog.forEach(f => {
        f.x += f.speed * f.dir;
        if (f.x >  W * 0.6) f.dir = -1;
        if (f.x < -W * 0.6) f.dir =  1;
        const a = f.alpha * (thick ? 3.0 : 1.0);
        const g = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
        g.addColorStop(0,   `rgba(185,195,215,0)`);
        g.addColorStop(0.3, `rgba(185,195,215,${a})`);
        g.addColorStop(0.7, `rgba(185,195,215,${a})`);
        g.addColorStop(1,   `rgba(185,195,215,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(f.x - f.w / 2, f.y, f.w, f.h);
      });
    }

    function drawHaze() {
      const p = particlesRef.current;
      if (!p.fog) return;
      p.fog.forEach(f => {
        f.x += f.speed * f.dir * 0.7;
        if (f.x >  W * 0.6) f.dir = -1;
        if (f.x < -W * 0.6) f.dir =  1;
        const a = f.alpha * 2.2;
        const g = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h * 1.6);
        g.addColorStop(0,   `rgba(175,155,120,0)`);
        g.addColorStop(0.35,`rgba(175,155,120,${a})`);
        g.addColorStop(0.65,`rgba(175,155,120,${a})`);
        g.addColorStop(1,   `rgba(175,155,120,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(f.x - f.w / 2, f.y, f.w, f.h * 1.6);
      });
    }

    function drawClouds(heavy) {
      const p = particlesRef.current;
      if (!p.clouds) return;
      p.clouds.forEach(c => {
        c.x += c.speed * c.dir;
        if (c.x > W + 250) c.x = -250;
        if (c.x < -250)    c.x = W + 250;
        const a = c.alpha * (heavy ? 2.8 : 1.0);
        c.blobs.forEach(b => {
          const bx = c.x + b.ox * c.scale;
          const by = c.y + b.oy * c.scale;
          const br = b.r * c.scale;
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, `rgba(200,210,230,${a * 1.3})`);
          g.addColorStop(1, `rgba(200,210,230,0)`);
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        });
      });
    }

    function drawSleet() {
      const p = particlesRef.current;
      if (!p.rain || !p.snow) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(210,225,245,0.32)';
      ctx.lineWidth = 1;
      p.rain.slice(0, 90).forEach(r => {
        r.y += r.speed * 1.3; r.x -= r.speed * 0.32;
        if (r.y > H + 15) { r.y = -15; r.x = Math.random() * W; }
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 7, r.y - 13); ctx.stroke();
      });
      ctx.restore();
      p.snow.slice(0, 45).forEach(s => {
        s.y += s.vy * 2.2;
        s.x += (Math.random() - 0.5) * 1.8;
        if (s.y > H + 6) { s.y = -6; s.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(225,238,255,0.52)';
        ctx.fill();
      });
    }

    function drawLightning() {
      const l = lightningRef.current;
      const now = Date.now();
      if (!l.active && now >= l.next) {
        l.active = true; l.alpha = 1;
        const lx = W * (0.2 + Math.random() * 0.6);
        l.bolts = generateLightningBolt(lx, 0, lx + (Math.random() - 0.5) * 90, H * (0.38 + Math.random() * 0.32));
        l.next  = now + 9000 + Math.random() * 16000;
      }
      if (l.active) {
        ctx.fillStyle = `rgba(190,210,255,${l.alpha * 0.07})`;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.strokeStyle = `rgba(230,240,255,${l.alpha})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 22;
        ctx.shadowColor = 'rgba(190,210,255,1)';
        ctx.beginPath();
        l.bolts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
        ctx.stroke();
        ctx.restore();
        l.alpha -= 0.038;
        if (l.alpha <= 0) l.active = false;
      }
    }

    function drawHorizonGlow(skyT, isDusk) {
      if (skyT < 0.02) return;
      const peak = skyT <= 0.5 ? skyT * 2 : (1 - skyT) * 2; // peaks at transition midpoint
      const hue  = isDusk ? 15 : 25;
      // Main horizon gradient
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0,   `hsla(${hue},88%,52%,0)`);
      g.addColorStop(0.45,`hsla(${hue},88%,48%,${peak * 0.20})`);
      g.addColorStop(1,   `hsla(${hue + 15},75%,38%,${peak * 0.30})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Floating color haze bands at horizon
      [
        { y: H * 0.58, h: 45, hue: isDusk ? 300 : 38, a: peak * 0.065 },
        { y: H * 0.70, h: 60, hue: isDusk ? 280 : 22, a: peak * 0.085 },
        { y: H * 0.83, h: 40, hue: isDusk ? 260 : 12, a: peak * 0.070 },
      ].forEach(b => {
        const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
        bg.addColorStop(0,   `hsla(${b.hue},92%,62%,0)`);
        bg.addColorStop(0.5, `hsla(${b.hue},92%,62%,${b.a})`);
        bg.addColorStop(1,   `hsla(${b.hue},92%,62%,0)`);
        ctx.fillStyle = bg; ctx.fillRect(0, b.y, W, b.h);
      });
    }

    function drawSunRays(skyT) {
      if (skyT < 0.75) return;
      const intensity = (skyT - 0.75) * 4;
      const cx = W * 0.66, cy = H * -0.12;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 1.6 - Math.PI * 0.3;
        const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * W, cy + Math.sin(angle) * H * 1.2);
        g.addColorStop(0, `rgba(255,240,195,${intensity * 0.06})`);
        g.addColorStop(1, `rgba(255,240,195,0)`);
        ctx.fillStyle = g;
        const w = Math.PI * 0.055;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, W * 1.4, angle - w, angle + w);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // ---- Main draw loop ----
    function draw() {
      const { skyT, isDusk, phase } = skyStateRef.current;
      const wt = weatherRef.current.type;
      ctx.clearRect(0, 0, W, H);

      // Base sky gradient
      const cols = getSkyColors(skyT, isDusk);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,   hsla(cols.top));
      grad.addColorStop(0.5, hsla(cols.mid));
      grad.addColorStop(1,   hsla(cols.bot));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Atmospheric blobs (night/transition only)
      if (skyT < 0.85) {
        const h1 = cols.top[0], h2 = cols.mid[0];
        const fade = Math.max(0, 1 - skyT * 1.18);
        [[W*.2,H*.15,300,h1],[W*.75,H*.6,220,h2],[W*.5,H*.85,180,210]].forEach(([x,y,r,h]) => {
          const g = ctx.createRadialGradient(x,y,0,x,y,r);
          g.addColorStop(0, `hsla(${h},80%,40%,${0.045*fade})`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
        });
      }

      // Dawn / dusk horizon glow
      if (skyT > 0 && skyT < 1) drawHorizonGlow(skyT, isDusk);

      // Day sun rays (clear/light cloud)
      if (skyT > 0.72 && (wt === 'clear' || wt === 'cloudy')) drawSunRays(skyT);

      // Stars (fade out as sky brightens)
      const starAlpha = Math.max(0, 1 - skyT * 1.25);
      if (starAlpha > 0.008) {
        stars.forEach(s => {
          s.a += s.speed;
          s.x += LAYER_SPEEDS[s.layer];
          if (s.x > W + 2) { s.x = -2; s.y = Math.random() * H; }
          const a = starAlpha * (0.25 + 0.55 * Math.abs(Math.sin(s.a)));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.fill();
        });
      }

      // Weather overlays
      switch (wt) {
        case 'thunder':   drawClouds(true);  drawRain('heavy'); drawLightning(); break;
        case 'blizzard':  drawSnow(true);    drawFog(false);                    break;
        case 'snow':      drawSnow(true);                                        break;
        case 'flurries':  drawSnow(false);                                       break;
        case 'sleet':     drawSleet();                                           break;
        case 'heavyrain': drawClouds(false); drawRain('heavy');                  break;
        case 'rain':      drawRain('normal');                                    break;
        case 'drizzle':   drawRain('drizzle');                                   break;
        case 'fog':       drawFog(true);                                         break;
        case 'haze':      drawHaze();                                            break;
        case 'overcast':  drawClouds(true);                                      break;
        case 'cloudy':    drawClouds(false);                                     break;
        default: break;
      }

      // Shooting streaks
      const now = Date.now();
      const spawnMult = phase === 'day' ? 1.6 : 1.0;
      if (now >= nextShot)  { spawnShootingStar(); nextShot  = now + (5000  + Math.random() * 10000) * spawnMult; }
      if (now >= nextShot2) { spawnShootingStar(); nextShot2 = now + (7000  + Math.random() * 8000)  * spawnMult; }

      shootingStarsRef.current.forEach(ss => {
        if (!ss.active) return;
        ss.x += ss.vx; ss.y += ss.vy; ss.life -= 1;
        ss.alpha = Math.min(1, ss.life / 18) * Math.min(1, (ss.maxLife - ss.life) / 10);

        // Phase-tinted hue
        let hue = ss.hue;
        if (phase === 'night') {
          ss.hue = (ss.hue + 1.8) % 360;
          hue = ss.hue;
        } else if (phase === 'dawn') {
          ss.hue = 15 + ((ss.hue + 0.6) % 42);
          hue = ss.hue;
        } else if (phase === 'day') {
          ss.hue = 44 + ((ss.hue + 0.3) % 18);
          hue = ss.hue;
        } else { // dusk
          ss.hue = (ss.hue + 1.3) % 360;
          hue = ss.hue < 180 ? 8 + ss.hue % 32 : 268 + ss.hue % 42;
        }

        const tailLen  = ss.speed * 18;
        const nx = -ss.vx / ss.speed, ny = -ss.vy / ss.speed;
        const segments = 18;
        const sat = phase === 'day' ? '55%' : '100%';
        const lit = phase === 'day' ? '88%' : '75%';

        for (let seg = 0; seg < segments; seg++) {
          const t0 = seg / segments, t1 = (seg + 1) / segments;
          const x0=ss.x+nx*tailLen*t0, y0=ss.y+ny*tailLen*t0;
          const x1=ss.x+nx*tailLen*t1, y1=ss.y+ny*tailLen*t1;

          let segHue;
          if (phase === 'night')        segHue = (hue + seg * (360 / segments)) % 360;
          else if (phase === 'dawn')    segHue = 15 + (seg * 2.2) % 42;
          else if (phase === 'day')     segHue = 44 + seg % 18;
          else                          segHue = hue + seg * 2.1;

          const segAlpha = ss.alpha * (1 - t0) * (seg === 0 ? 1 : 0.85);
          const sGrad = ctx.createLinearGradient(x0,y0,x1,y1);
          sGrad.addColorStop(0, `hsla(${segHue},${sat},${lit},${segAlpha})`);
          sGrad.addColorStop(1, `hsla(${(segHue+20)%360},${sat},${phase==='day'?'83%':'70%'},${segAlpha*0.7})`);
          ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1);
          ctx.strokeStyle = sGrad;
          ctx.lineWidth = Math.max(0.4, ss.width * (1.6 - t0 * 1.2));
          ctx.lineCap = 'round'; ctx.stroke();
        }

        const hGlow = ctx.createRadialGradient(ss.x,ss.y,0,ss.x,ss.y,ss.width*5);
        hGlow.addColorStop(0,   `rgba(255,255,255,${ss.alpha})`);
        hGlow.addColorStop(0.3, `hsla(${hue},100%,80%,${ss.alpha*0.7})`);
        hGlow.addColorStop(1,   `hsla(${hue},100%,60%,0)`);
        ctx.beginPath(); ctx.arc(ss.x,ss.y,ss.width*5,0,Math.PI*2);
        ctx.fillStyle = hGlow; ctx.fill();
        ctx.beginPath(); ctx.arc(ss.x,ss.y,ss.width*1.1,0,Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${ss.alpha})`; ctx.fill();

        if (ss.life<=0||ss.x<-100||ss.x>W+100||ss.y>H+100||ss.y<-100) ss.active=false;
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window._bgCanvas = canvas;
    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  // ---- Refraction canvas (unchanged) ----
  useEffect(() => {
    const rfCanvas = rfRef.current;
    const rCtx = rfCanvas.getContext('2d');
    let RW, RH, rfAnimId;

    function resize() { RW = rfCanvas.width = window.innerWidth; RH = rfCanvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    function roundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    }

    function render() {
      rCtx.clearRect(0,0,RW,RH);
      rfAnimId = requestAnimationFrame(render);
      const src = window._bgCanvas;
      if (!src) return;
      const stars = window._shootingStars || [];
      const active = stars.filter(s => s.active);
      if (!active.length) return;

      document.querySelectorAll('.card, .splash-title-box, .splash-nav-box').forEach(el => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
        let maxInf=0, nearest=null, nearestDist=Infinity;
        active.forEach(ss => {
          const dx=ss.x-cx, dy=ss.y-cy, dist=Math.sqrt(dx*dx+dy*dy);
          const inf = Math.max(0,1-dist/380)*ss.alpha;
          if (inf>maxInf) { maxInf=inf; nearest=ss; nearestDist=dist; }
        });
        if (maxInf<0.008) return;

        const mag=1+maxInf*0.38, aberration=maxInf*14, warpStr=maxInf*28;
        const br=parseInt(getComputedStyle(el).borderRadius)||20;
        rCtx.save();
        roundedRect(rCtx,rect.left,rect.top,rect.width,rect.height,br);
        rCtx.clip();

        const dirX=nearest?(cx-nearest.x)/(nearestDist||1):0;
        const dirY=nearest?(cy-nearest.y)/(nearestDist||1):0;
        const dW=rect.width*mag, dH=rect.height*mag;
        const dX=rect.left-(dW-rect.width)/2+dirX*warpStr*0.4;
        const dY=rect.top-(dH-rect.height)/2+dirY*warpStr*0.4;

        rCtx.globalCompositeOperation='screen';
        rCtx.globalAlpha=Math.min(0.92,maxInf*0.85);
        rCtx.filter='saturate(4) hue-rotate(0deg) brightness(1.4)';
        rCtx.drawImage(src,rect.left-aberration*0.8,rect.top,rect.width,rect.height,dX-aberration,dY,dW,dH);
        rCtx.filter='saturate(2) hue-rotate(120deg) brightness(1.2)';
        rCtx.globalAlpha=Math.min(0.75,maxInf*0.65);
        rCtx.drawImage(src,rect.left,rect.top,rect.width,rect.height,dX,dY,dW,dH);
        rCtx.filter='saturate(4) hue-rotate(220deg) brightness(1.4)';
        rCtx.globalAlpha=Math.min(0.92,maxInf*0.85);
        rCtx.drawImage(src,rect.left+aberration*0.8,rect.top,rect.width,rect.height,dX+aberration,dY,dW,dH);

        rCtx.filter='none';
        rCtx.globalCompositeOperation='screen';
        if (nearest) {
          const px=Math.max(rect.left+20,Math.min(rect.left+rect.width-20,nearest.x));
          const py=Math.max(rect.top+20,Math.min(rect.top+rect.height-20,nearest.y));
          const cg=rCtx.createRadialGradient(px,py,0,px,py,80+maxInf*60);
          cg.addColorStop(0,   `rgba(255,255,255,${maxInf*0.45})`);
          cg.addColorStop(0.2, `rgba(180,240,255,${maxInf*0.25})`);
          cg.addColorStop(1,   'rgba(100,160,255,0)');
          rCtx.fillStyle=cg; rCtx.fillRect(rect.left,rect.top,rect.width,rect.height);

          const gg=rCtx.createLinearGradient(px-60,py-20,px+60,py+20);
          gg.addColorStop(0,   'rgba(255,255,255,0)');
          gg.addColorStop(0.5, `rgba(255,255,255,${maxInf*0.9})`);
          gg.addColorStop(1,   'rgba(255,255,255,0)');
          rCtx.fillStyle=gg; rCtx.globalAlpha=1; rCtx.fillRect(rect.left,py-2,rect.width,4);

          roundedRect(rCtx,rect.left,rect.top,rect.width,rect.height,br);
          rCtx.strokeStyle=`rgba(200,240,255,${maxInf*0.7})`;
          rCtx.lineWidth=2+maxInf*3; rCtx.globalAlpha=maxInf*0.8; rCtx.stroke();
        }
        rCtx.restore();
        rCtx.filter='none'; rCtx.globalAlpha=1; rCtx.globalCompositeOperation='source-over';
      });
    }

    rfAnimId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(rfAnimId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <>
      <canvas ref={bgRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />
      <canvas ref={rfRef} style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none' }} />
    </>
  );
}
