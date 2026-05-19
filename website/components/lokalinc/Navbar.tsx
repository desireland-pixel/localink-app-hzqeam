"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

export function Navbar() {
  const { scrollY } = useScroll();
  const bg = useTransform(
    scrollY,
    [0, 80],
    ["hsl(160 18% 6% / 0)", "hsl(160 18% 6% / 0.92)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  return (
    <motion.header
      style={{ backgroundColor: bg }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
    >
      <motion.div
        style={{ opacity: borderOpacity, background: "hsl(160 12% 16%)" }}
        className="absolute bottom-0 left-0 right-0 h-px"
      />
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2.5"
        >
          <img src="/app-icon.png" alt="LokaLinc" className="w-7 h-7 rounded-lg object-cover" />
          <span
            className="font-display font-semibold text-lg tracking-tight"
            style={{ color: "hsl(150 20% 94%)" }}
          >
            LokaLinc
          </span>
        </motion.div>

        {/* Nav links */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex items-center gap-8"
        >
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how" },
            { label: "Privacy", href: "/privacy" },
            { label: "Support", href: "/support" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm transition-colors duration-200"
              style={{ color: "hsl(160 10% 52%)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(160 72% 55%)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(160 10% 52%)")}
            >
              {item.label}
            </Link>
          ))}
        </motion.nav>

        {/* CTA */}
        <motion.a
          href="#download"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="hidden md:flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200"
          style={{
            background: "hsl(160 72% 46%)",
            color: "hsl(160 30% 6%)",
            boxShadow: "0 0 20px hsl(160 72% 46% / 0.35)",
          }}
        >
          Get the app
        </motion.a>
      </div>
    </motion.header>
  );
}
