"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

// Fade + slide in when scrolled into view, once. The shared entrance for
// every landing section so timing feels like one system.
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
  x = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scroll parallax: the child drifts `distance` px up/down while its
// section crosses the viewport. Transform-only, so it stays on the GPU.
export function Parallax({
  children,
  className,
  distance = 60,
}: {
  children?: React.ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return (
    <motion.div ref={ref} style={{ y: reduce ? 0 : y }} className={className}>
      {children}
    </motion.div>
  );
}

// Card with an entrance reveal and a cursor-following glow (see .lp-spot).
export function SpotlightCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      onMouseMove={handleMove}
      className={cn("lp-spot", className)}
    >
      {children}
    </motion.div>
  );
}

// 3D tilt that follows the pointer (desktop only: touch devices never fire
// mousemove, and reduced-motion users get a static card).
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 140, damping: 16 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 140, damping: 16 });

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 14);
    rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * 14);
  }

  function reset() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div style={{ perspective: 900 }} onMouseMove={handleMove} onMouseLeave={reset} className={className}>
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>{children}</motion.div>
    </div>
  );
}

// Thin brand-gradient bar showing how far down the page you are.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-[#1B4F72] via-[#FF4200] to-[#FF4200]"
    />
  );
}
