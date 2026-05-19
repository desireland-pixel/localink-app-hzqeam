"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

// Signature animated component: a living location-pulse orb that
// simulates LokaLinc's core action — discovering nearby connections.

const NODES = [
  { id: 1, angle: 0,   radius: 110, delay: 0,    label: "Maya",   dist: "0.3 mi" },
  { id: 2, angle: 72,  radius: 130, delay: 0.4,  label: "Café",   dist: "0.5 mi" },
  { id: 3, angle: 144, radius: 100, delay: 0.8,  label: "Liam",   dist: "0.2 mi" },
  { id: 4, angle: 216, radius: 125, delay: 1.2,  label: "Park",   dist: "0.7 mi" },
  { id: 5, angle: 288, radius: 115, delay: 1.6,  label: "Priya",  dist: "0.4 mi" },
];

function toXY(angle: number, radius: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

export function HeroOrb() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const rotateX = useTransform(springY, [-200, 200], [12, -12]);
  const rotateY = useTransform(springX, [-200, 200], [-12, 12]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left - rect.width / 2);
      mouseY.set(e.clientY - rect.top - rect.height / 2);
    };
    const handleLeave = () => { mouseX.set(0); mouseY.set(0); };
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ width: 340, height: 340 }}
    >
      {/* Outer decorative rings */}
      <motion.div
        className="absolute rounded-full border border-[hsl(160_72%_46%/0.12)]"
        style={{ width: 320, height: 320 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full border border-dashed border-[hsl(160_72%_46%/0.08)]"
        style={{ width: 280, height: 280 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* 3D tilt wrapper */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
        className="relative flex items-center justify-center"
      >
        {/* Pulse rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-[hsl(160_72%_46%/0.25)]"
            style={{ width: 60 + i * 50, height: 60 + i * 50 }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Center orb */}
        <motion.div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 72,
            height: 72,
            background: "radial-gradient(circle at 35% 35%, hsl(160 80% 65%), hsl(160 72% 36%))",
            boxShadow: "0 0 40px hsl(160 72% 46% / 0.6), 0 0 80px hsl(160 72% 46% / 0.25)",
          }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.12 }}
        >
          <img src="/app-icon.png" alt="LokaLinc" className="w-10 h-10 rounded-xl object-cover" />
        </motion.div>

        {/* Orbiting nodes */}
        {NODES.map((node) => {
          const { x, y } = toXY(node.angle, node.radius);
          return (
            <motion.div
              key={node.id}
              className="absolute z-20"
              style={{ x, y }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: node.delay + 0.6,
                duration: 0.5,
                type: "spring",
                stiffness: 200,
                damping: 14,
              }}
            >
              {/* Connector line */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                  width: node.radius,
                  height: 2,
                  transform: `rotate(${node.angle + 90}deg)`,
                  transformOrigin: "0 50%",
                  overflow: "visible",
                }}
              >
                <line
                  x1="0" y1="0"
                  x2={-node.radius} y2="0"
                  stroke="hsl(160 72% 46% / 0.3)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
              </svg>

              {/* Node pill */}
              <motion.div
                className="relative flex flex-col items-center gap-0.5 cursor-default"
                whileHover={{ scale: 1.15, y: -3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background: "hsl(160 14% 9% / 0.9)",
                    border: "1px solid hsl(160 72% 46% / 0.35)",
                    backdropFilter: "blur(8px)",
                    color: "hsl(160 72% 72%)",
                    boxShadow: "0 2px 12px hsl(160 72% 46% / 0.2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "hsl(160 72% 55%)" }}
                  />
                  {node.label}
                </div>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "hsl(160 30% 50%)" }}
                >
                  {node.dist}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
