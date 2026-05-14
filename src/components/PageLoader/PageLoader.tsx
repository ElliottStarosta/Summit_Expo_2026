import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./PageLoader.css";

// Tiny math helpers
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const TAU = Math.PI * 2;

// Types
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0-1, decreases
  decay: number;
  size: number;
  hue: number;
  sat: number;
  lit: number;
  alpha: number;
  type: "dust" | "gas" | "jet" | "corona" | "prominence" | "spark" | "debris";
  angle?: number;
  speed?: number;
}

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  size: number;
  hue: number;
}

// Component
interface Props {
  onComplete?: () => void;
  onDone?: () => void;
}

export function PageLoader({ onComplete, onDone }: Props) {
  const done = onComplete ?? onDone ?? (() => {});

  // DOM refs
  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null); // background star field
  const starRef = useRef<HTMLCanvasElement>(null); // star birth sequence
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const barGlintRef = useRef<HTMLDivElement>(null);
  const barPctRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // Live mutable state (no re-renders for perf)
  const phaseClock = useRef(0); // seconds since mount
  const phase = useRef(0); // 0-5
  const pct = useRef(0); // 0-100
  const dismissed = useRef(false);
  const particles = useRef<Particle[]>([]);
  const bgStars = useRef<Star[]>([]);
  const rafId = useRef(0);
  const lastTime = useRef(0);
  const LOAD_START = performance.now();

  // React state only for label
  const [statusLabel, setStatusLabel] = useState("INITIALISING");

  // 1. Background star-field — seeded once, rendered every frame

  function seedBgStars(w: number, h: number) {
    bgStars.current = Array.from({ length: 280 }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      brightness: rand(0.12, 0.7),
      twinklePhase: rand(0, TAU),
      twinkleSpeed: rand(0.3, 1.8),
      size: rand(0.3, 1.4),
      hue: rand(195, 290),
    }));
  }

  function drawBgStars(ctx: CanvasRenderingContext2D, t: number) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const s of bgStars.current) {
      const tw = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
      const al = s.brightness * (0.4 + 0.6 * tw);
      // halo
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 3.5, 0, TAU);
      ctx.fillStyle = `hsla(${s.hue},65%,80%,${al * 0.06})`;
      ctx.fill();
      // core
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, TAU);
      ctx.fillStyle = `hsla(${s.hue},55%,95%,${al})`;
      ctx.fill();
    }
  }


  // 2.  Particle factory helpers
  function spawnDust(cx: number, cy: number, n: number) {
    for (let i = 0; i < n; i++) {
      const angle = rand(0, TAU);
      const r = rand(60, 180);
      particles.current.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: rand(-0.25, 0.25),
        vy: rand(-0.25, 0.25),
        life: rand(0.6, 1.0),
        decay: rand(0.0015, 0.003),
        size: rand(1, 3.5),
        hue: rand(220, 280),
        sat: rand(20, 50),
        lit: rand(55, 80),
        alpha: rand(0.15, 0.4),
        type: "dust",
      });
    }
  }

  function spawnGas(cx: number, cy: number, n: number, radius: number) {
    for (let i = 0; i < n; i++) {
      const angle = rand(0, TAU);
      const r = rand(radius * 0.3, radius);
      const dAngle = rand(-0.6, 0.6);
      const speed = rand(0.12, 0.55);
      particles.current.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: Math.cos(angle + dAngle) * -speed,
        vy: Math.sin(angle + dAngle) * -speed,
        life: rand(0.7, 1.0),
        decay: rand(0.001, 0.0025),
        size: rand(5, 18),
        hue: rand(260, 310),
        sat: rand(45, 75),
        lit: rand(40, 65),
        alpha: rand(0.05, 0.18),
        type: "gas",
      });
    }
  }

  function spawnJet(cx: number, cy: number, upward: boolean) {
    const baseAngle = upward ? -Math.PI / 2 : Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const spread = rand(-0.15, 0.15);
      const spd = rand(1.8, 4.5);
      particles.current.push({
        x: cx + rand(-4, 4),
        y: cy + rand(-4, 4),
        vx: Math.cos(baseAngle + spread) * spd,
        vy: Math.sin(baseAngle + spread) * spd,
        life: 1,
        decay: rand(0.012, 0.022),
        size: rand(2, 6),
        hue: rand(175, 210),
        sat: 90,
        lit: 75,
        alpha: rand(0.5, 0.9),
        type: "jet",
      });
    }
  }

  function spawnCorona(cx: number, cy: number, coreRadius: number) {
    for (let i = 0; i < 6; i++) {
      const angle = rand(0, TAU);
      const r = rand(coreRadius * 0.8, coreRadius * 1.6);
      const spd = rand(0.3, 1.1);
      particles.current.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        decay: rand(0.008, 0.018),
        size: rand(2, 8),
        hue: rand(20, 50),
        sat: 95,
        lit: 70,
        alpha: rand(0.4, 0.8),
        type: "corona",
      });
    }
  }

  function spawnProminence(cx: number, cy: number, coreRadius: number) {
    const angle = rand(0, TAU);
    const r = coreRadius * rand(1.0, 1.3);
    const loopSpd = rand(0.5, 1.6);
    const perpAngle = angle + Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        x: cx + Math.cos(angle) * r + rand(-6, 6),
        y: cy + Math.sin(angle) * r + rand(-6, 6),
        vx:
          Math.cos(perpAngle) * loopSpd * rand(0.5, 1.5) +
          Math.cos(angle) * rand(-0.4, 0.4),
        vy:
          Math.sin(perpAngle) * loopSpd * rand(0.5, 1.5) +
          Math.sin(angle) * rand(-0.4, 0.4),
        life: 1,
        decay: rand(0.005, 0.012),
        size: rand(3, 9),
        hue: rand(340, 380),
        sat: 90,
        lit: 62,
        alpha: rand(0.35, 0.7),
        type: "prominence",
      });
    }
  }

  function spawnSupernova(cx: number, cy: number, n: number) {
    for (let i = 0; i < n; i++) {
      const angle = rand(0, TAU);
      const spd = rand(2, 12);
      particles.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        decay: rand(0.006, 0.016),
        size: rand(1, 7),
        hue: rand(20, 60),
        sat: 100,
        lit: rand(60, 85),
        alpha: 1,
        type: "debris",
      });
    }
  }

  // 3.  Per-frame star canvas renderer
  function renderStarCanvas(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    t: number, // total elapsed seconds
    dt: number, // delta seconds
    ph: number, // phase 0-5
  ) {
    const { width: W, height: H } = ctx.canvas;
    ctx.clearRect(0, 0, W, H);

    // Phase-specific background nebula
    if (ph >= 1) {
      const nebOpacity = clamp((t - 1.0) / 2.0, 0, 1);
      if (nebOpacity > 0) {
        // Deep magenta-purple nebula cloud
        const gNeb = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
        gNeb.addColorStop(0, `rgba(200,48,130,${0.18 * nebOpacity})`);
        gNeb.addColorStop(0.4, `rgba(120,40,180,${0.1 * nebOpacity})`);
        gNeb.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gNeb;
        ctx.beginPath();
        ctx.arc(cx, cy, 220, 0, TAU);
        ctx.fill();

        // Secondary blue-teal lobe
        const gNeb2 = ctx.createRadialGradient(
          cx - 40,
          cy + 30,
          0,
          cx - 40,
          cy + 30,
          160,
        );
        gNeb2.addColorStop(0, `rgba(40,100,200,${0.12 * nebOpacity})`);
        gNeb2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gNeb2;
        ctx.beginPath();
        ctx.arc(cx - 40, cy + 30, 160, 0, TAU);
        ctx.fill();
      }
    }

    // Update & draw particles
    const alive: Particle[] = [];
    ctx.save();
    for (const p of particles.current) {
      p.x += p.vx;
      p.y += p.vy;

      // Gravity toward center in gas + protostar phases
      if (ph >= 1 && ph < 3 && (p.type === "gas" || p.type === "dust")) {
        const dx = cx - p.x,
          dy = cy - p.y;
        const distSq = dx * dx + dy * dy;
        const force = clamp(4000 / distSq, 0, 0.9);
        p.vx += dx * force * 0.04;
        p.vy += dy * force * 0.04;
      }

      // Friction
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay;

      if (p.life <= 0) continue;
      alive.push(p);

      const alpha = p.alpha * p.life;
      if (alpha < 0.005) continue;

      if (p.type === "gas") {
        // Soft blobs
        const r = p.size * (0.5 + 0.5 * p.life);
        const gGas = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        gGas.addColorStop(
          0,
          `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha * 0.9})`,
        );
        gGas.addColorStop(
          0.5,
          `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha * 0.45})`,
        );
        gGas.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = gGas;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
      } else if (p.type === "dust") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha})`;
        ctx.fill();
      } else if (p.type === "jet") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${p.hue},90%,80%,0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === "corona") {
        const r2 = p.size * (0.3 + 0.7 * p.life);
        const gCor = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
        gCor.addColorStop(0, `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha})`);
        gCor.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = gCor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r2, 0, TAU);
        ctx.fill();
      } else if (p.type === "prominence") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fillStyle = `hsla(${p.hue % 360},${p.sat}%,${p.lit}%,${alpha * 0.85})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${p.hue % 360},90%,70%,0.6)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // debris / spark
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, TAU);
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();
    particles.current = alive;

    // Draw the star itself (phases 2-4)
    if (ph >= 2) {
      const starAge = clamp((t - 3.5) / 2.5, 0, 1); // 0 -> 1 over 2.5 s from phase 2
      const coreRadius = lerp(0, 38, Math.pow(starAge, 0.5));

      // Outer glow (massive)
      const gOuter = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        coreRadius * 5.5,
      );
      gOuter.addColorStop(0, `rgba(255,230,180,${0.08 * starAge})`);
      gOuter.addColorStop(0.25, `rgba(255,160,60, ${0.06 * starAge})`);
      gOuter.addColorStop(0.6, `rgba(180,60,200, ${0.03 * starAge})`);
      gOuter.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gOuter;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 5.5, 0, TAU);
      ctx.fill();

      // Mid corona layer 
      const gMid = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        coreRadius * 2.8,
      );
      gMid.addColorStop(0, `rgba(255,240,200,${0.25 * starAge})`);
      gMid.addColorStop(0.5, `rgba(255,140,40, ${0.12 * starAge})`);
      gMid.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gMid;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 2.8, 0, TAU);
      ctx.fill();

      // Core 
      const gCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      gCore.addColorStop(0, `rgba(255,255,255,${clamp(starAge * 1.2, 0, 1)})`);
      gCore.addColorStop(0.4, `rgba(255,240,180,${0.9 * starAge})`);
      gCore.addColorStop(0.75, `rgba(255,160,60, ${0.6 * starAge})`);
      gCore.addColorStop(1, `rgba(200,80,20,  ${0.3 * starAge})`);
      ctx.fillStyle = gCore;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, TAU);
      ctx.fill();

      // Diffraction spikes 
      if (starAge > 0.3) {
        const spikeAlpha = clamp((starAge - 0.3) / 0.4, 0, 1);
        const spikeLen = lerp(0, 90, spikeAlpha);
        ctx.save();
        ctx.globalAlpha = spikeAlpha * 0.7;

        const drawSpike = (
          angle: number,
          len: number,
          width: number,
          color: string,
        ) => {
          const x2 = cx + Math.cos(angle) * len;
          const y2 = cy + Math.sin(angle) * len;
          const gSpike = ctx.createLinearGradient(cx, cy, x2, y2);
          gSpike.addColorStop(0, color);
          gSpike.addColorStop(0.4, color.replace(",1)", ",0.5)"));
          gSpike.addColorStop(1, color.replace(",1)", ",0)"));
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = gSpike;
          ctx.lineWidth = width;
          ctx.lineCap = "round";
          ctx.stroke();
        };

        // Main 4 spikes
        for (let s = 0; s < 4; s++) {
          const ang = (s * TAU) / 4 + t * 0.04;
          drawSpike(ang, spikeLen, 3.5, "rgba(255,245,210,1)");
          drawSpike(ang + Math.PI, spikeLen, 3.5, "rgba(255,245,210,1)");
          // secondary spikes
          drawSpike(ang + TAU / 8, spikeLen * 0.6, 1.5, "rgba(255,200,120,1)");
          drawSpike(
            ang + TAU / 8 + Math.PI,
            spikeLen * 0.6,
            1.5,
            "rgba(255,200,120,1)",
          );
        }
        ctx.restore();
      }

      // Chromatic aberration ring 
      if (starAge > 0.55) {
        const ringAlpha = clamp((starAge - 0.55) / 0.35, 0, 1) * 0.35;
        const ringR = coreRadius * 1.25 + Math.sin(t * 3.1) * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, TAU);
        ctx.strokeStyle = `rgba(80,200,255,${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * 1.12, 0, TAU);
        ctx.strokeStyle = `rgba(255,80,200,${ringAlpha * 0.6})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Phase 5 supernova flash
    if (ph === 5) {
      const novaAge = clamp((t - phaseClock.current) / 1.0, 0, 1);
      const novaAlpha = Math.max(0, 1 - novaAge * 2);
      if (novaAlpha > 0) {
        const gFlash = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.8);
        gFlash.addColorStop(0, `rgba(255,255,255,${novaAlpha})`);
        gFlash.addColorStop(0.15, `rgba(255,240,180,${novaAlpha * 0.8})`);
        gFlash.addColorStop(0.4, `rgba(255,100,50, ${novaAlpha * 0.3})`);
        gFlash.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gFlash;
        ctx.beginPath();
        ctx.arc(cx, cy, W * 0.8, 0, TAU);
        ctx.fill();
      }
    }
  }


  // 4.  Phase scheduler — called each frame
  function tickPhase(t: number, dt: number, cx: number, cy: number) {
    const ph = phase.current;

    // Phase 0 -> 1: Void -> Nebula (t = 0.5 s)
    if (ph === 0 && t > 0.5) {
      phase.current = 1;
      // Seed initial dust cloud
      spawnDust(cx, cy, 120);
    }

    // Phase 1 continuing: gas infall (t = 0.5 -> 3.5 s)
    if (ph === 1) {
      // Spawn gas continuously
      if (Math.random() < 0.55)
        spawnGas(cx, cy, 3, lerp(180, 60, clamp((t - 0.5) / 3, 0, 1)));
      if (Math.random() < 0.25) spawnDust(cx, cy, 2);

      if (t > 3.5) {
        phase.current = 2;
        // Bipolar jets ignite
        setStatusLabel("CALIBRATING INSTRUMENTS");
      }
    }

    // Phase 2: Protostar + jets (t = 3.5 -> 6.5 s)
    if (ph === 2) {
      if (Math.random() < 0.7) spawnJet(cx, cy, true);
      if (Math.random() < 0.7) spawnJet(cx, cy, false);
      if (Math.random() < 0.35) spawnGas(cx, cy, 2, 40);

      if (t > 6.5) {
        phase.current = 3;
        setStatusLabel("CHARTING COURSE");
      }
    }

    // Phase 3: Main sequence — full star burning (t = 6.5 -> 10 s)
    if (ph === 3) {
      if (Math.random() < 0.4) spawnCorona(cx, cy, 38);
      if (Math.random() < 0.12) spawnProminence(cx, cy, 42);

      if (t > 10.0) {
        phase.current = 4;
        setStatusLabel("READY FOR LAUNCH");
      }
    }

    // Phase 4: Hold — star burns while progress finishes
    if (ph === 4) {
      if (Math.random() < 0.35) spawnCorona(cx, cy, 38);
      if (Math.random() < 0.1) spawnProminence(cx, cy, 42);

      // Phase 5 is triggered externally by the exit sequence
    }

    // Phase 5: Supernova + exit
    if (ph === 5) {
      if (Math.random() < 0.8) spawnSupernova(cx, cy, 8);
    }
  }

  // 5.  Master RAF loop — completely independent of React / page loading
  function startLoop() {
    const bgCanvas = bgRef.current!;
    const starCanvas = starRef.current!;
    const bgCtx = bgCanvas.getContext("2d")!;
    const starCtx = starCanvas.getContext("2d")!;

    const resize = () => {
      const W = window.innerWidth,
        H = window.innerHeight;
      bgCanvas.width = W;
      bgCanvas.height = H;
      starCanvas.width = W;
      starCanvas.height = H;
      seedBgStars(W, H);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    lastTime.current = performance.now();
    phaseClock.current = (performance.now() - LOAD_START) / 1000; // catch up

    function frame(now: number) {
      rafId.current = requestAnimationFrame(frame);

      const dt = Math.min((now - lastTime.current) / 1000, 0.05); // cap at 50ms
      lastTime.current = now;
      phaseClock.current += dt;
      const t = phaseClock.current;

      const W = starCanvas.width,
        H = starCanvas.height;
      const cx = W / 2,
        cy = H / 2 - 55; // star sits slightly above center

      // Background star field
      drawBgStars(bgCtx, t);

      // Phase logic
      tickPhase(t, dt, cx, cy);

      // Star canvas
      renderStarCanvas(starCtx, cx, cy, t, dt, phase.current);

      // Progress bar — always moves, driven by real time
      if (!dismissed.current) {
        // Target: 100% over ~10s, with eased speed
        const targetPct = clamp(
          100 * (1 - Math.pow(Math.max(0, 1 - t / 10.5), 2)),
          0,
          100,
        );
        pct.current = lerp(pct.current, targetPct, 0.04);

        const pv = Math.round(pct.current);
        if (barFillRef.current)
          barFillRef.current.style.width = `${pct.current}%`;
        if (barGlintRef.current)
          barGlintRef.current.style.left = `${pct.current}%`;
        if (barPctRef.current)
          barPctRef.current.textContent = String(pv).padStart(3, "0");

        // Trigger exit when pct reaches 100 and we've seen the full star
        if (pct.current >= 99.5 && phase.current >= 4 && !dismissed.current) {
          dismissed.current = true;
          triggerExit(cx, cy);
        }
      }
    }

    rafId.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
    };
  }


  // 6.  Exit sequence (GSAP, triggered once)
  function triggerExit(cx: number, cy: number) {
    phase.current = 5;
    // Spawn supernova burst
    spawnSupernova(cx, cy, 200);

    const tl = gsap.timeline({ onComplete: done });

    tl.to(
      [titleRef.current, tagRef.current, ".pl-bar-wrap", statusRef.current],
      {
        opacity: 0,
        y: -14,
        stagger: 0.045,
        duration: 0.4,
        ease: "power2.in",
      },
    )
      .to(
        starRef.current,
        {
          scale: 1.06,
          opacity: 0,
          duration: 0.55,
          ease: "power2.in",
        },
        "-=0.2",
      )
      .to(
        wrapRef.current,
        {
          yPercent: -100,
          duration: 0.85,
          ease: "expo.inOut",
        },
        "-=0.15",
      );
  }

  // 7.  GSAP entrance — titles & UI  (useLayoutEffect = before paint)
  useLayoutEffect(() => {
    if (!titleRef.current) return;

    gsap.set(titleRef.current, { opacity: 0, y: 28, filter: "blur(12px)" });
    gsap.set(tagRef.current, { opacity: 0, y: 16 });
    gsap.set(".pl-bar-wrap", { opacity: 0, y: 12 });
    gsap.set(statusRef.current, { opacity: 0 });
    gsap.set(overlayRef.current, { opacity: 1 });

    const tl = gsap.timeline();
    tl.to(titleRef.current, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 1.1,
      ease: "power3.out",
      delay: 0.8,
    })
      .to(
        tagRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          ease: "power2.out",
        },
        "-=0.5",
      )
      .to(
        ".pl-bar-wrap",
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.35",
      )
      .to(
        statusRef.current,
        {
          opacity: 1,
          duration: 0.45,
        },
        "-=0.2",
      );

    return () => {
      tl.kill();
    };
  }, []);


  // 8.  Start the RAF loop on mount
  useLayoutEffect(() => {
    const cleanup = startLoop();
    return cleanup;
  }, []);

  // ]Render
  return (
    <div ref={wrapRef} className="pl">
      {/* Layer 0: background star field */}
      <canvas
        ref={bgRef}
        className="pl__canvas pl__canvas--bg"
        aria-hidden="true"
      />

      {/* Layer 1: star birth canvas */}
      <canvas
        ref={starRef}
        className="pl__canvas pl__canvas--star"
        aria-hidden="true"
      />

      {/* Layer 2: atmospheric vignette */}
      <div className="pl__vignette" aria-hidden="true" />

      {/* Layer 3: nebula colour overlay (CSS-only breathing) */}
      <div ref={overlayRef} className="pl__nebula" aria-hidden="true" />

      {/* Layer 4: UI content */}
      <div className="pl-content">
        <h1 ref={titleRef} className="pl-title">
          <img
            src="/logo.png"
            alt=""
            className="pl-title-logo"
            draggable={false}
          />
          SUMMIT<span>EXPO</span>
        </h1>
        <p ref={tagRef} className="pl-tagline">
          A youth exhibition of All That Can Be
        </p>

        <div className="pl-bar-wrap">
          <div className="pl-bar-track">
            <div
              ref={barFillRef}
              className="pl-bar-fill"
              style={{ width: "0%" }}
            />
            <div
              ref={barGlintRef}
              className="pl-bar-glint"
              style={{ left: "0%" }}
            />
          </div>
          <span ref={barPctRef} className="pl-bar-pct">
            000
          </span>
        </div>

        <p ref={statusRef} className="pl-status-text">
          {statusLabel}
        </p>
      </div>
    </div>
  );
}

export default PageLoader;
