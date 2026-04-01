import { useEffect, useRef } from 'react';
import { getBgCondition } from '../utils/weather';

export default function StarCanvas({ condition }) {
  const bgRef = useRef(null);
  const rfRef = useRef(null);
  const stateRef = useRef({ hue1: 200, hue2: 270 });
  const shootingStarsRef = useRef(
    Array.from({ length: 6 }, () => ({ active: false }))
  );

  // expose to refraction layer
  useEffect(() => {
    window._shootingStars = shootingStarsRef.current;
  }, []);

  // update hues when condition changes
  useEffect(() => {
    if (condition) {
      const { hue1, hue2 } = getBgCondition(condition);
      stateRef.current.hue1 = hue1;
      stateRef.current.hue2 = hue2;
    }
  }, [condition]);

  useEffect(() => {
    const canvas = bgRef.current;
    const ctx = canvas.getContext('2d');
    let W, H, stars = [];
    let animId;

    const LAYER_SPEEDS = [0.08, 0.18, 0.32];

    function makestar() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random(),
        speed: Math.random() * 0.003 + 0.001,
        layer: Math.floor(Math.random() * 3),
      };
    }

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars = Array.from({ length: 180 }, makestar);
      window._bgCanvas = canvas;
    }

    function spawnShootingStar() {
      const ss = shootingStarsRef.current.find(s => !s.active);
      if (!ss) return;
      const speed = 8 + Math.random() * 12;
      const roll = Math.random();

      if (roll < 0.38) {
        const fromLeft = Math.random() < 0.5;
        const angleRad = ((25 + Math.random() * 25) * Math.PI) / 180;
        if (fromLeft) { ss.x = -20; ss.y = Math.random() * H * 0.55; ss.vx = Math.cos(angleRad) * speed; ss.vy = Math.sin(angleRad) * speed; }
        else { ss.x = W + 20; ss.y = Math.random() * H * 0.55; ss.vx = -Math.cos(angleRad) * speed; ss.vy = Math.sin(angleRad) * speed; }
      } else if (roll < 0.72) {
        const fromLeft = Math.random() < 0.5;
        const angleRad = ((40 + Math.random() * 20) * Math.PI) / 180;
        if (fromLeft) { ss.x = Math.random() * W * 0.35; ss.y = -20; ss.vx = Math.sin(angleRad) * speed; ss.vy = Math.cos(angleRad) * speed; }
        else { ss.x = W * 0.65 + Math.random() * W * 0.35; ss.y = -20; ss.vx = -Math.sin(angleRad) * speed; ss.vy = Math.cos(angleRad) * speed; }
      } else {
        const fromLeft = Math.random() < 0.5;
        const targetY = H * (0.35 + Math.random() * 0.3);
        const startY = targetY - H * (0.15 + Math.random() * 0.2);
        if (fromLeft) { ss.x = -20; ss.y = Math.max(0, startY); const dx = W*1.2, dy = targetY-ss.y, len=Math.sqrt(dx*dx+dy*dy); ss.vx=(dx/len)*speed; ss.vy=(dy/len)*speed; }
        else { ss.x = W+20; ss.y = Math.max(0, startY); const dx=-W*1.2, dy=targetY-ss.y, len=Math.sqrt(dx*dx+dy*dy); ss.vx=(dx/len)*speed; ss.vy=(dy/len)*speed; }
      }

      ss.speed = speed;
      ss.width = 1 + Math.random() * 1.2;
      ss.maxLife = 60 + Math.random() * 45;
      ss.life = ss.maxLife;
      ss.alpha = 0;
      ss.active = true;
      ss.hue = Math.random() * 360;
    }

    let nextShot = Date.now() + 3000 + Math.random() * 5000;
    let nextShot2 = Date.now() + 7000 + Math.random() * 8000;

    function draw() {
      const { hue1, hue2 } = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, `hsla(${hue1},80%,8%,1)`);
      grad.addColorStop(0.5, `hsla(${hue2},60%,6%,1)`);
      grad.addColorStop(1, `hsla(220,70%,5%,1)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      [[W*.2,H*.15,300],[W*.75,H*.6,220],[W*.5,H*.85,180]].forEach(([x,y,r],i) => {
        const g = ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0, `hsla(${[hue1,hue2,210][i]},80%,40%,0.04)`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      });

      stars.forEach(s => {
        s.a += s.speed;
        s.x += LAYER_SPEEDS[s.layer];
        if (s.x > W + 2) { s.x = -2; s.y = Math.random() * H; }
        const alpha = 0.25 + 0.55 * Math.abs(Math.sin(s.a));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });

      const now = Date.now();
      if (now >= nextShot) { spawnShootingStar(); nextShot = now + 5000 + Math.random() * 10000; }
      if (now >= nextShot2) { spawnShootingStar(); nextShot2 = now + 7000 + Math.random() * 8000; }

      shootingStarsRef.current.forEach(ss => {
        if (!ss.active) return;
        ss.x += ss.vx; ss.y += ss.vy; ss.life -= 1;
        ss.alpha = Math.min(1, ss.life / 18) * Math.min(1, (ss.maxLife - ss.life) / 10);
        ss.hue = (ss.hue + 1.8) % 360;

        const tailLen = ss.speed * 18;
        const nx = -ss.vx / ss.speed, ny = -ss.vy / ss.speed;
        const segments = 18;

        for (let seg = 0; seg < segments; seg++) {
          const t0 = seg / segments, t1 = (seg+1) / segments;
          const x0=ss.x+nx*tailLen*t0, y0=ss.y+ny*tailLen*t0;
          const x1=ss.x+nx*tailLen*t1, y1=ss.y+ny*tailLen*t1;
          const segHue = (ss.hue + seg * (360/segments)) % 360;
          const segAlpha = ss.alpha * (1 - t0) * (seg===0?1:0.85);
          const sGrad = ctx.createLinearGradient(x0,y0,x1,y1);
          sGrad.addColorStop(0, `hsla(${segHue},100%,75%,${segAlpha})`);
          sGrad.addColorStop(1, `hsla(${(segHue+20)%360},100%,70%,${segAlpha*0.7})`);
          ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1);
          ctx.strokeStyle=sGrad; ctx.lineWidth=Math.max(0.4,ss.width*(1.6-t0*1.2)); ctx.lineCap='round'; ctx.stroke();
        }

        const hGlow = ctx.createRadialGradient(ss.x,ss.y,0,ss.x,ss.y,ss.width*5);
        hGlow.addColorStop(0,`rgba(255,255,255,${ss.alpha})`);
        hGlow.addColorStop(0.3,`hsla(${ss.hue},100%,80%,${ss.alpha*0.7})`);
        hGlow.addColorStop(1,`hsla(${ss.hue},100%,60%,0)`);
        ctx.beginPath(); ctx.arc(ss.x,ss.y,ss.width*5,0,Math.PI*2); ctx.fillStyle=hGlow; ctx.fill();
        ctx.beginPath(); ctx.arc(ss.x,ss.y,ss.width*1.1,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${ss.alpha})`; ctx.fill();

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

  // Refraction canvas
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
        const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
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
          cg.addColorStop(0,`rgba(255,255,255,${maxInf*0.45})`);
          cg.addColorStop(0.2,`rgba(180,240,255,${maxInf*0.25})`);
          cg.addColorStop(1,'rgba(100,160,255,0)');
          rCtx.fillStyle=cg; rCtx.fillRect(rect.left,rect.top,rect.width,rect.height);

          const gg=rCtx.createLinearGradient(px-60,py-20,px+60,py+20);
          gg.addColorStop(0,'rgba(255,255,255,0)');
          gg.addColorStop(0.5,`rgba(255,255,255,${maxInf*0.9})`);
          gg.addColorStop(1,'rgba(255,255,255,0)');
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
