"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: string;
}

export function FeatureCard({ icon: Icon, title, description, accent = "hsl(160 72% 46%)" }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-80, 80], [6, -6]);
  const rotateY = useTransform(springX, [-80, 80], [-6, 6]);
  const glowX = useTransform(springX, [-80, 80], [0, 100]);
  const glowY = useTransform(springY, [-80, 80], [0, 100]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 600 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative rounded-2xl p-6 cursor-default overflow-hidden group"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
    >
      {/* Card background */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "hsl(160 14% 9%)",
          border: "1px solid hsl(160 12% 16%)",
        }}
      />
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${accent}18 0%, transparent 60%)`,
        }}
      />
      {/* Top border glow */}
      <div
        className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(to right, transparent, ${accent}60, transparent)` }}
      />

      <div className="relative z-10">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
          style={{
            background: `${accent}18`,
            border: `1px solid ${accent}30`,
          }}
        >
          <Icon size={20} style={{ color: accent }} strokeWidth={1.75} />
        </div>
        <h3
          className="font-display text-lg font-semibold mb-2"
          style={{ color: "hsl(150 20% 92%)" }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "hsl(160 10% 52%)" }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}
