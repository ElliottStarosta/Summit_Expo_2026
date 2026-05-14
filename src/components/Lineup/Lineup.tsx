import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { gsap, ScrollTrigger } from "../../utils/gsap";
import "./Lineup.css";
import { useVisibleCanvas } from "../../utils/useVisibleCanvas";

export interface Exhibitor {
  id: string;
  name: string;
  role: string;
  // designation: string;
  color: string;
  bio: string;
  project: string;
  projectDesc: string;
}

export const SUMMIT_EXHIBITORS: Exhibitor[] = [
  {
    id: "01",
    name: "Algasem Zabarah",
    role: "Engineering · Gr. 11",
    color: "#FF2D6B",
    bio: "Passionate builder and provincial-level soccer player. Part of EOM's robotics team Spongebotics, and a certified Ontario Soccer Referee.",
    project: "Project Horizon",
    projectDesc: "A fully custom-built quadcopter FPV drone — from CAD to circuits to firmware. Hand-soldered a custom RC transmitter and receiver from scratch, handling all radio comms between pilot and aircraft.",
  },
  {
    id: "02",
    name: "Calin Olsen & Allen Su",
    role: "Hardware · Physics",
    color: "#4FA3E0",
    bio: "Calin stays up late desoldering circuit boards and publishing 3D models on Makerworld. Allen reads plant biology and human health books, plays guitar, and is eyeing biotechnology.",
    project: "Electromagnetic Accelerator",
    projectDesc: "A custom-built electromagnetic projectile accelerator demonstrating use cases in transport, aerospace, and experimentation — including impact testing, microsatellite deployment, and testing rapid acceleration on micro-organisms.",
  },
  {
    id: "03",
    name: "Michael Tetelbaum",
    role: "Systems · Gr. 11",
    color: "#CC44FF",
    bio: "Fascinated by systems hidden behind everyday tech. FRC veteran (teams 9127 & 7476), incoming intern at Nokia. Feynman quote tattooed on his brain.",
    project: "Audio in Motion",
    projectDesc: "A real-time audio equalizer and visualizer in Java. Processes live audio playback, applies adjustable frequency filtering, and generates responsive visuals — DSP, waveform analysis, frequency decomposition, all in real time.",
  },
  {
    id: "04",
    name: "Adarshpreet Singh",
    role: "AI · Developer",
    color: "#FF5C8A",
    bio: "Sparked by a conversation with Richard Sutton at an AMII conference. APEGA Science Olympics medallist, Edmonton Science Fair rep, and AI advocate across Alberta high schools.",
    project: "Agami",
    projectDesc: "An advanced voice-interfaced AI agent that executes tasks autonomously via voice input and hand gesture controls — built on the philosophy that AI should feel natural, intuitive, and effortless.",
  },
  {
    id: "05",
    name: "Alex Liu",
    role: "Robotics · Electrical",
    color: "#3EC6FF",
    bio: "Music, art, and film by day; programming and robotics by night. Aspiring electrical engineer who wants to merge creative interests with mechanical precision.",
    project: "The Walking Machine",
    projectDesc: "A showcase of humanoid robotics focused on locomotion, balance systems, servo coordination, and embedded electronics — demonstrating the engineering challenge of recreating stable human movement.",
  },
  {
    id: "06",
    name: "Kelvin Hu",
    role: "Mathematics · Gr. 12",
    color: "#E84FFF",
    bio: "President of Math Club and number theory enthusiast. Has been hunting large primes since Grade 7.",
    project: "Primes: Predict, Preselect, Produce",
    projectDesc: "A novel method to predict where the next prime could be, and a faster technique to preselect prime candidates. Rooted in studying prime distribution and its critical role in modern cryptography.",
  },
  {
    id: "07",
    name: "Alyn Te",
    role: "Design · Gr. 12",
    color: "#FF3A5C",
    bio: "Creative visionary behind multiple Storyboard (Hackclub) submissions. Two-year FRC 7476 business member with deep interest in UI/UX, color theory, and graphic storytelling.",
    project: "Refresh: Reload — Snapshot",
    projectDesc: "A gesture-controlled photobooth removing the need for physical buttons. Computer vision recognizes hand gestures (peace sign to capture, thumbs-up to download), with voice narration for visual accessibility.",
  },
  {
    id: "08",
    name: "Borui Zhao",
    role: "Languages · Developer",
    color: "#5B8FFF",
    bio: "Passionate about logic, frameworks, and developer tools. Wants to help developers with niche language requirements while deepening his own understanding of how languages work.",
    project: "Simpl",
    projectDesc: "A programming language built from scratch using tree-sitter as the parser, enabling grammar reuse for both parsing and syntax highlighting. Novel approach that significantly improves parsing times.",
  },
  {
    id: "09",
    name: "Sky Jin",
    role: "Game Dev · Gr. 12",
    color: "#BF40FF",
    bio: "Specializes in C++ and Unreal Engine 5. Loves guitar and video games. Heading into CS or engineering this fall.",
    project: "Multiplayer Shooter",
    projectDesc: "A custom-built multiplayer third-person shooter in Unreal Engine 5. Live interactive demo where attendees play networked matches — showcasing real-time server replication, client prediction, and cross-platform networking.",
  },
  {
    id: "10",
    name: "Zoey Chen",
    role: "Mathematics · Engineering",
    color: "#FF1A8C",
    bio: "Aspiring engineer fascinated by math and its applications. Deep into Rubik's Cube research and the Cosmere universe.",
    project: "On Cubes and Commutators",
    projectDesc: "An elegant application of group theory to solve a Rubik's Cube of any size — thousands of lines of cube-solving and visualizing software from scratch, plus a dive into abstract algebra.",
  },
];

// Layout helpers 

interface StarPos {
  x: number;
  y: number;
}

function seededRand(seed: number) {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

function buildLayout(n: number): StarPos[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: 50, y: 50 }];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / n);
    const th = i * golden;
    const jx = (seededRand(42 + i * 2) - 0.5) * 9;
    const jy = (seededRand(42 + i * 2 + 1) - 0.5) * 9;
    return {
      x: Math.min(92, Math.max(8, 50 + r * 44 * Math.cos(th) + jx)),
      y: Math.min(90, Math.max(10, 50 + r * 42 * Math.sin(th) + jy)),
    };
  });
}

function buildEdges(pos: StarPos[]): [number, number][] {
  const n = pos.length;
  if (n < 2) return [];
  const dist = (a: StarPos, b: StarPos) => Math.hypot(a.x - b.x, a.y - b.y);

  // Prim's MST
  const inTree = new Set([0]);
  const edges: [number, number][] = [];
  while (inTree.size < n) {
    let best = Infinity,
      bu = -1,
      bv = -1;
    for (const u of inTree) {
      for (let v = 0; v < n; v++) {
        if (inTree.has(v)) continue;
        const d = dist(pos[u], pos[v]);
        if (d < best) {
          best = d;
          bu = u;
          bv = v;
        }
      }
    }
    if (bv === -1) break;
    edges.push([bu, bv]);
    inTree.add(bv);
  }

  // Add a few short extra edges (max 2 per node, max dist 40)
  const edgeSet = new Set(
    edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`),
  );
  const extraCount = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const sorted = Array.from({ length: n }, (_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => dist(pos[i], pos[a]) - dist(pos[i], pos[b]));
    for (const j of sorted) {
      if (extraCount[i] >= 2) break;
      if (dist(pos[i], pos[j]) > 40) break;
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (!edgeSet.has(key)) {
        edges.push([i, j]);
        edgeSet.add(key);
        extraCount[i]++;
      }
    }
  }
  return edges;
}

// Star field canvas 

function useSpaceCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  const scrollRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    const fn = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
      },
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);

  useVisibleCanvas(
    ref,
    (canvas) => {
      interface Star {
        x: number;
        y: number;
        r: number;
        vx: number;
        vy: number;
        op: number;
        ph: number;
        sp: number;
        layer: number;
        hue: number;
      }
      interface Shooter {
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        max: number;
        len: number;
      }

      const mobile = window.innerWidth < 768;
      // Reduced star counts vs original
      const LAYERS = mobile
        ? [
            { count: 18, speed: 0.007, rMax: 0.55, opMax: 0.4 },
            { count: 10, speed: 0.02, rMax: 0.95, opMax: 0.6 },
            { count: 4, speed: 0.045, rMax: 1.45, opMax: 0.85 },
          ]
        : [
            { count: 55, speed: 0.007, rMax: 0.55, opMax: 0.4 },
            { count: 30, speed: 0.02, rMax: 0.95, opMax: 0.6 },
            { count: 12, speed: 0.045, rMax: 1.45, opMax: 0.85 },
          ];

      // Cache dimensions — only update on resize
      let W = canvas.offsetWidth,
        H = canvas.offsetHeight;
      const onResize = () => {
        W = canvas.offsetWidth;
        H = canvas.offsetHeight;
      };
      window.addEventListener("resize", onResize, { passive: true });

      let stars: Star[] = [];
      let shooters: Shooter[] = [];
      let t = 0,
        lastScrollY = 0,
        shooterTimer = 0;
      let SHOOTER_INTERVAL = 220 + Math.random() * 180;

      const seedStars = () => {
        stars = [];
        LAYERS.forEach((cfg, li) => {
          for (let i = 0; i < cfg.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = cfg.speed * (0.5 + Math.random());
            stars.push({
              x: Math.random() * W,
              y: Math.random() * H,
              r: Math.random() * cfg.rMax + 0.15,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              op: Math.random() * cfg.opMax + 0.15,
              ph: Math.random() * Math.PI * 2,
              sp: Math.random() * 1.1 + 0.25,
              layer: li,
              hue: 200 + Math.random() * 80,
            });
          }
        });
      };
      seedStars();

      const spawnShooter = () => {
        if (mobile) return;
        const fromRight = Math.random() < 0.5;
        const angle =
          (Math.random() * 20 + 10) * (Math.PI / 180) * (fromRight ? 1 : -1) +
          Math.PI / 2;
        const speed = 9 + Math.random() * 9;
        shooters.push({
          x: fromRight
            ? W * (0.55 + Math.random() * 0.45)
            : W * (Math.random() * 0.45),
          y: -10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 40 + Math.random() * 30,
          len: 55 + Math.random() * 75,
        });
      };

      return (
        _c: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        dt: number,
      ) => {
        if (!visibleRef.current) return;

        t += (dt / 1000) * 60 * 0.011;
        const sd = (scrollRef.current - lastScrollY) * 0.5;
        lastScrollY = scrollRef.current;

        ctx.clearRect(0, 0, W, H);

        for (const s of stars) {
          s.x += s.vx;
          s.y +=
            s.vy + sd * (s.layer === 0 ? 0.03 : s.layer === 1 ? 0.09 : 0.22);
          if (s.x < -2) s.x = W + 2;
          else if (s.x > W + 2) s.x = -2;
          if (s.y < -2) s.y = H + 2;
          else if (s.y > H + 2) s.y = -2;

          const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
          const al = s.op * (0.35 + 0.65 * tw);

          // Only draw halo for brightest layer
          if (s.layer === 2) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 5.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue},65%,75%,${al * 0.11})`;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle =
            s.layer === 2
              ? `hsla(${s.hue},55%,92%,${al})`
              : `rgba(200,215,255,${al})`;
          ctx.fill();

          // Spikes only for prominent bright stars
          if (s.layer === 2 && al > 0.6) {
            const sp = s.r * 7 * al;
            ctx.strokeStyle = `hsla(${s.hue},55%,85%,${al * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x - sp, s.y);
            ctx.lineTo(s.x + sp, s.y);
            ctx.moveTo(s.x, s.y - sp);
            ctx.lineTo(s.x, s.y + sp);
            ctx.stroke();
          }
        }

        shooterTimer++;
        if (shooterTimer > SHOOTER_INTERVAL) {
          spawnShooter();
          shooterTimer = 0;
          SHOOTER_INTERVAL = 200 + Math.random() * 200;
        }
        shooters = shooters.filter((s) => s.life < s.max);
        for (const s of shooters) {
          const prog = s.life / s.max;
          const alpha = 0.75 * (1 - prog) * Math.min(1, s.life / 4);
          const spd = Math.hypot(s.vx, s.vy);
          const tx = s.x - s.vx * (s.len / spd),
            ty = s.y - s.vy * (s.len / spd);
          const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
          grad.addColorStop(0, "rgba(180,215,255,0)");
          grad.addColorStop(0.6, `rgba(180,215,255,${alpha * 0.45})`);
          grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4 * (1 - prog * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.4 * (1 - prog * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
          s.x += s.vx;
          s.y += s.vy;
          s.life++;
        }

        return () => window.removeEventListener("resize", onResize);
      };
    },
    { fps: 16 },
  );
}

// Main component 

export function Lineup({
  exhibitors = SUMMIT_EXHIBITORS,
}: {
  exhibitors?: Exhibitor[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const svgLineRefs = useRef<(SVGLineElement | null)[]>([]);

  const [modal, setModal] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const positions = useMemo(
    () => buildLayout(exhibitors.length),
    [exhibitors.length],
  );
  const edges = useMemo(() => buildEdges(positions), [positions]);

  useSpaceCanvas(canvasRef);

  useEffect(() => {
    const eyebrowRef_el = headerRef.current?.querySelector(
      ".lu-eyebrow",
    ) as Element | null;
    const titleRef_el = headerRef.current?.querySelector(
      ".lu-title",
    ) as Element | null;
    const subRef_el = headerRef.current?.querySelector(
      ".lu-sub",
    ) as Element | null;

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;

      // Header animation 
      ScrollTrigger.create({
        trigger: headerRef.current,
        start: `top ${isMobile ? "95%" : "80%"}`,
        onEnter() {
          if (!eyebrowRef_el || !titleRef_el || !subRef_el) return;
          gsap
            .timeline()
            .fromTo(
              eyebrowRef_el,
              { opacity: 0, y: 24, scale: 0.96 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.55,
                ease: "power3.out",
              },
            )
            .fromTo(
              titleRef_el,
              { opacity: 0, y: 36, scale: 0.92 },
              { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
              "-=0.3",
            )
            .fromTo(
              subRef_el,
              { opacity: 0, y: 16 },
              { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
              "-=0.35",
            );
        },
        onLeaveBack() {
          if (!eyebrowRef_el || !titleRef_el || !subRef_el) return;
          gsap.set([eyebrowRef_el, titleRef_el, subRef_el], {
            opacity: 0,
            y: 24,
          });
        },
      });

      // Map fade in 
      ScrollTrigger.create({
        trigger: mapRef.current,
        start: `top ${isMobile ? "95%" : "85%"}`,
        onEnter() {
          gsap.fromTo(
            mapRef.current,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
          );
        },
        onLeaveBack() {
          gsap.set(mapRef.current, { opacity: 0, y: 50 });
        },
      });

      // Stars + lines 
      const nodes = nodeRefs.current.filter(Boolean);
      gsap.set(nodes, { scale: 0, opacity: 0 });
      gsap.set(svgLineRefs.current.filter(Boolean), { opacity: 0 });

      ScrollTrigger.create({
        trigger: mapRef.current,
        start: `top ${isMobile ? "92%" : "65%"}`,
        onEnter() {
          const lines = svgLineRefs.current.filter(Boolean);

          // Pre-hide lines
          lines.forEach((l) => {
            if (l) gsap.set(l, { opacity: 0 });
          });

          // Stars pop in randomly
          gsap.to(nodes, {
            scale: 1,
            opacity: 1,
            stagger: { each: 0.08, from: "random" },
            duration: 0.35,
            ease: "back.out(2.2)",
            delay: 0.1,
            onComplete() {
              // Lines draw in after stars
              lines.forEach((l, ei) => {
                if (!l) return;
                const x1 = parseFloat(l.getAttribute("x1") ?? "0");
                const y1 = parseFloat(l.getAttribute("y1") ?? "0");
                const x2 = parseFloat(l.getAttribute("x2") ?? "0");
                const y2 = parseFloat(l.getAttribute("y2") ?? "0");
                const W = mapRef.current?.offsetWidth ?? 800;
                const H = mapRef.current?.offsetHeight ?? 400;
                const len = Math.hypot(
                  ((x2 - x1) / 100) * W,
                  ((y2 - y1) / 100) * H,
                );
                l.style.strokeDasharray = `${len}`;
                l.style.strokeDashoffset = `${len}`;
                gsap.to(l, {
                  opacity: 1,
                  strokeDashoffset: 0,
                  duration: 0.7,
                  delay: ei * 0.06,
                  ease: "power2.inOut",
                });
              });
            },
          });
        },
        onLeaveBack() {
          gsap.to(nodes, { scale: 0, opacity: 0, duration: 0.3 });
          svgLineRefs.current.forEach((l) => {
            if (!l) return;
            gsap.set(l, {
              opacity: 0,
              strokeDashoffset: parseFloat(l.style.strokeDasharray) || 150,
            });
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Tooltip 
  const handleMouseEnter = useCallback((idx: number) => {
    setHovered(idx);
    const tip = tooltipRef.current;
    if (!tip) return;
    gsap.killTweensOf(tip);
    gsap.fromTo(
      tip,
      { opacity: 0, y: 8, scale: 0.93 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    const tip = tooltipRef.current;
    if (!tip) return;
    gsap.killTweensOf(tip);
    gsap.to(tip, {
      opacity: 0,
      y: 5,
      scale: 0.93,
      duration: 0.15,
      ease: "power2.in",
    });
  }, []);

  // Modal open 
  const openModal = useCallback((idx: number) => {
    setModal(idx);
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      const m = modalRef.current;
      if (!m) return;
      const q = gsap.utils.selector(m);
      const bd = m.closest(".lu-modal-backdrop") as HTMLElement | null;

      if (bd)
        gsap.fromTo(
          bd,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "power2.out" },
        );
      gsap.fromTo(
        m,
        { opacity: 0, scale: 0.88, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "power3.out" },
      );

      gsap
        .timeline({ delay: 0.08 })
        .fromTo(
          q(".lu-modal__scan"),
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.5,
            ease: "power3.out",
            transformOrigin: "left center",
          },
        )
        .fromTo(
          q(".lu-modal__desig-wrap"),
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" },
          "-=0.3",
        )
        .fromTo(
          q(".lu-modal__name"),
          { opacity: 0, x: 24, filter: "blur(4px)" },
          {
            opacity: 1,
            x: 0,
            filter: "blur(0px)",
            duration: 0.4,
            ease: "power3.out",
          },
          "-=0.25",
        )
        .fromTo(
          q(".lu-modal__role"),
          { opacity: 0, x: 16 },
          { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" },
          "-=0.2",
        )
        .fromTo(
          q(".lu-modal__divider"),
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.4,
            ease: "power2.inOut",
            transformOrigin: "left center",
          },
          "-=0.05",
        )
        .fromTo(
          q(".lu-modal__section"),
          { opacity: 0, y: 12, filter: "blur(3px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.1,
          },
          "-=0.1",
        )
        .fromTo(
          q(".lu-c"),
          { opacity: 0, scale: 0 },
          {
            opacity: 1,
            scale: 1,
            stagger: 0.04,
            duration: 0.2,
            ease: "back.out(2.5)",
          },
          "-=0.2",
        );
    });
  }, []);

  // Modal close 
  const closeModal = useCallback(() => {
    const m = modalRef.current;
    if (!m) return;
    const bd = m.closest(".lu-modal-backdrop") as HTMLElement | null;
    gsap
      .timeline({
        onComplete: () => {
          setModal(null);
          document.body.style.overflow = "";
        },
      })
      .to(m, {
        opacity: 0,
        scale: 0.92,
        y: 20,
        duration: 0.25,
        ease: "power2.in",
      })
      .to(bd, { opacity: 0, duration: 0.2, ease: "power2.in" }, "-=0.1");
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [closeModal]);

  const hovEx = hovered !== null ? exhibitors[hovered] : null;
  const modalEx = modal !== null ? exhibitors[modal] : null;

  const tooltipStyle = useMemo(() => {
    if (hovered === null || !positions[hovered]) return {};
    const pos = positions[hovered];
    const leftSide = pos.x < 55;
    return {
      left: leftSide ? `calc(${pos.x}% + 30px)` : "auto",
      right: leftSide ? "auto" : `calc(${100 - pos.x}% + 30px)`,
      top: `calc(${pos.y}% - 18px)`,
    };
  }, [hovered, positions]);

  return (
    <section ref={sectionRef} id="lineup" className="lu">
      <canvas ref={canvasRef} className="lu__space-canvas" aria-hidden="true" />
      <div className="lu__nebula" aria-hidden="true" />

      <header ref={headerRef} className="lu__header">
        <p className="lu-eyebrow">
          <span className="lu-pip" />
          EXHIBITOR CONSTELLATION · {exhibitors.length} STARS
          <span className="lu-pip" />
        </p>
        <h2 className="lu-title">THE LINEUP</h2>
        <p className="lu-sub">Hover to preview · Click to explore</p>
      </header>

      <div
        ref={mapRef}
        className="lu__map"
        style={{ "--n": exhibitors.length, opacity: 0 } as React.CSSProperties}
      >
        {/* Constellation edges */}
        <svg ref={svgRef} className="lu__svg" aria-hidden="true">
          {edges.map(([ai, bi], ei) => {
            const a = positions[ai],
              b = positions[bi];
            if (!a || !b) return null;
            const isLit =
              hovered === ai || hovered === bi || modal === ai || modal === bi;
            return (
              <g key={ei}>
                <line
                  x1={`${a.x}%`}
                  y1={`${a.y}%`}
                  x2={`${b.x}%`}
                  y2={`${b.y}%`}
                  className={`lu-edge lu-edge--glow${isLit ? " lu-edge--lit" : ""}`}
                />
                <line
                  ref={(el) => {
                    svgLineRefs.current[ei] = el;
                  }}
                  x1={`${a.x}%`}
                  y1={`${a.y}%`}
                  x2={`${b.x}%`}
                  y2={`${b.y}%`}
                  className={`lu-edge lu-edge--dash${isLit ? " lu-edge--lit" : ""}`}
                />
              </g>
            );
          })}
        </svg>

        {/* Star nodes */}
        {exhibitors.map((e, i) => {
          const pos = positions[i] ?? { x: 50, y: 50 };
          const isHov = hovered === i,
            isMod = modal === i;
          return (
            <button
              key={e.id}
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className={`lu-node${isHov ? " lu-node--hov" : ""}${isMod ? " lu-node--active" : ""}`}
              style={
                {
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  "--nc": e.color,
                } as React.CSSProperties
              }
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
              onClick={() => openModal(i)}
              aria-label={`View ${e.name}`}
            >
              <span className="lu-node__outer" />
              <span className="lu-node__mid" />
              <span className="lu-node__core" />
              <span className="lu-node__spikes" aria-hidden="true">
                <span className="s s--h" />
                <span className="s s--v" />
                <span className="s s--d1" />
                <span className="s s--d2" />
              </span>
              {isMod && (
                <>
                  <span className="lu-node__ring" />
                  <span className="lu-node__ring lu-node__ring--2" />
                </>
              )}
              <span className="lu-node__tag" aria-hidden="true">
                {/* <span className="lu-node__tag-id">{e.designation}</span> */}
                <span className="lu-node__tag-name">
                  {e.name.split(" ")[0]}
                </span>
              </span>
            </button>
          );
        })}

        {/* Hover tooltip */}
        <div
          ref={tooltipRef}
          className="lu-tooltip"
          style={
            {
              ...tooltipStyle,
              opacity: 0,
              pointerEvents: "none",
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          {hovEx && (
            <>
              <p
                className="lu-tooltip__desig"
                style={{ "--tc": hovEx.color } as React.CSSProperties}
              >
                {/* {hovEx.designation} */}
              </p>
              <p className="lu-tooltip__name">{hovEx.name}</p>
              <p className="lu-tooltip__role">{hovEx.role}</p>
              <p
                className="lu-tooltip__project"
                style={{ "--tc": hovEx.color } as React.CSSProperties}
              >
                {hovEx.project}
              </p>
              <span
                className="lu-tooltip__corner lu-tooltip__corner--tl"
                style={{ "--tc": hovEx.color } as React.CSSProperties}
              />
              <span
                className="lu-tooltip__corner lu-tooltip__corner--tr"
                style={{ "--tc": hovEx.color } as React.CSSProperties}
              />
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal !== null && modalEx && (
        <div className="lu-modal-backdrop" onClick={closeModal}>
          <div
            ref={modalRef}
            className="lu-modal"
            style={{ "--mc": modalEx.color, opacity: 0 } as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={modalEx.name}
          >
            <div className="lu-modal__inner">
              <div className="lu-modal__scan" />

              <button
                className="lu-modal__close"
                onClick={closeModal}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>

              <div className="lu-modal__desig-wrap">
                <span className="lu-modal__desig-dot" />
                {/* <span className="lu-modal__desig">{modalEx.designation}</span> */}
                <span className="lu-modal__desig-line" />
              </div>

              <h3 className="lu-modal__name">{modalEx.name}</h3>
              <p className="lu-modal__role">{modalEx.role}</p>

              <div className="lu-modal__divider" />

              <div className="lu-modal__section">
                <span className="lu-modal__section-label">
                  <i className="fa-solid fa-user" /> About
                </span>
                <p className="lu-modal__bio">{modalEx.bio}</p>
              </div>

              <div className="lu-modal__section lu-modal__section--project">
                <span className="lu-modal__section-label">
                  <i className="fa-solid fa-flask" /> Project
                </span>
                <p className="lu-modal__project-name">{modalEx.project}</p>
                <p className="lu-modal__project-desc">{modalEx.projectDesc}</p>
              </div>
            </div>

            {/* Corner accents */}
            <span className="lu-c lu-c--tl" />
            <span className="lu-c lu-c--tr" />
            <span className="lu-c lu-c--bl" />
            <span className="lu-c lu-c--br" />
          </div>
        </div>
      )}
    </section>
  );
}
