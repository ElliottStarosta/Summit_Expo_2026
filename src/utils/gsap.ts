import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Global defaults; shorter durations = snappier, less jank on mid-range devices
gsap.defaults({ duration: 0.6, ease: "power2.out", overwrite: "auto" });

// Respect prefers-reduced-motion globally
const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.globalTimeline.timeScale(10); // rush through all animations
});

// ScrollTrigger global config
ScrollTrigger.config({
  limitCallbacks: true, // only fire callbacks when scroll direction matches
  ignoreMobileResize: true, // prevents refresh on mobile address-bar resize
});

// Batch refresh; debounce ScrollTrigger.refresh() calls
let refreshTimer: ReturnType<typeof setTimeout>;
export function debouncedRefresh(ms = 200) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), ms);
}

export { gsap, ScrollTrigger };
