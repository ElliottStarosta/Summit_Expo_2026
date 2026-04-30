import { useEffect } from "react";

type DrawFn = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  deltaTime: number,
) => void;

type SetupFn = (canvas: HTMLCanvasElement) => DrawFn | void;

export interface CanvasOptions {
  fps?: number;
  margin?: number;
}

const isMobile = () => window.innerWidth < 768;

export function useVisibleCanvas(
  ref: React.RefObject<HTMLCanvasElement | null>,
  setup: SetupFn,
  options: CanvasOptions = {},
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const { fps = isMobile() ? 20 : 30, margin = 200 } = options;
    const interval = 1000 / fps;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    // Cap DPR at 1 for performance; canvas pixels 1:1 with CSS pixels
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let drawFn: DrawFn | void;
    let raf = 0;
    let running = false;
    let lastT = 0;

    const applySize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!w || !h) return;
      const tw = Math.round(w * DPR);
      const th = Math.round(h * DPR);
      if (canvas.width === tw && canvas.height === th) return;
      canvas.width = tw;
      canvas.height = th;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.resetTransform();
      ctx.scale(DPR, DPR);
    };

    applySize();
    drawFn = setup(canvas);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = now - lastT;
      if (dt < interval) return;
      lastT = now - (dt % interval);
      if (drawFn) drawFn(canvas, ctx, Math.min(dt, interval * 3));
    };

    const start = () => {
      if (running) return;
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    // Only render when visible in viewport
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { rootMargin: `${margin}px 0px ${margin}px 0px`, threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => { applySize(); });
    ro.observe(canvas);

    const onVis = () => document.hidden ? stop() : start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}