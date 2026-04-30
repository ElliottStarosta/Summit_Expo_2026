import { lazy, Suspense, useEffect, useRef, useState } from "react";


const SpaceMap = lazy(() => import("./SpaceMap"));

// Skeleton shown before the map chunk loads
function MapSkeleton() {
  return (
    <div className="pi-map-frame">
      <div className="pi-map-hud">
        <span className="pi-map-hud__left">
          <i className="fa-solid fa-satellite" />
          LIVE MAP · KANATA ON
        </span>
        <span className="pi-map-hud__right">
          <i className="fa-solid fa-crosshairs" />
          45.3232°N · 75.8951°W
        </span>
      </div>
      <div className="pi-map-skeleton" aria-hidden="true" />
    </div>
  );
}

export default function LazySpaceMap() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // "idle"   — not yet near viewport, show nothing / skeleton
  // "loading" — entered viewport, trigger the lazy import
  // "ready"   — chunk loaded, render real map
  const [phase, setPhase] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Disconnect immediately — we only need to fire once
        observer.disconnect();
        setPhase("loading");
      },
      {
        // Start loading when the sentinel is 400px below the viewport edge —
        // gives the browser a head start before the user actually sees it
        rootMargin: "0px 0px 400px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Invisible sentinel div that triggers the observer */}
      <div ref={sentinelRef} style={{ height: 1, pointerEvents: "none" }} aria-hidden="true" />

      {phase === "idle" && <MapSkeleton />}

      {phase !== "idle" && (
        <Suspense
          fallback={<MapSkeleton />}
          // onLoad fires when SpaceMap chunk finishes downloading
        >
          <SpaceMapWithReadySignal onReady={() => setPhase("ready")} />
        </Suspense>
      )}
    </>
  );
}

// Thin wrapper so we know when Suspense resolved (chunk is in memory)
function SpaceMapWithReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return <SpaceMap />;
}