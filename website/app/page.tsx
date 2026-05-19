"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import {
  MapPin,
  Users,
  Zap,
  ShieldCheck,
  MessageCircle,
  Compass,
  Bell,
  Star,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { NewlyAttribution } from "@/components/ui/newly-attribution";
import { HeroOrb } from "@/components/lokalinc/HeroOrb";
import { FeatureCard } from "@/components/lokalinc/FeatureCard";
import { ScrollReveal } from "@/components/lokalinc/ScrollReveal";
import { Navbar } from "@/components/lokalinc/Navbar";

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-dots opacity-40" />
      <div className="absolute inset-0 bg-aurora" />

      {/* Drifting blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full animate-drift"
        style={{
          background: "radial-gradient(circle, hsl(160 72% 46% / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(200 80% 55% / 0.1) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: "drift 26s ease-in-out infinite reverse",
        }}
      />

      {/* Content */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col lg:flex-row items-center gap-16 lg:gap-24"
      >
        {/* Left: copy */}
        <div className="flex-1 text-center lg:text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "hsl(160 72% 46% / 0.12)",
              border: "1px solid hsl(160 72% 46% / 0.3)",
              color: "hsl(160 72% 60%)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "hsl(160 72% 55%)" }}
            />
            Now live in your city
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6"
            style={{ color: "hsl(150 20% 96%)" }}
          >
            Connect to
            <br />
            <span className="text-gradient">what's near</span>
            <br />
            you, now.
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg leading-relaxed mb-10 max-w-md mx-auto lg:mx-0"
            style={{ color: "hsl(160 10% 55%)" }}
          >
            LokaLinc surfaces the people, places, and moments within your
            neighborhood — in real time, with zero noise.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
            id="download"
            className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
          >
            <motion.a
              href="#"
              whileHover={{ scale: 1.04, boxShadow: "0 0 32px hsl(160 72% 46% / 0.55)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-2xl px-5 py-3 font-semibold text-sm transition-all duration-200"
              style={{
                background: "hsl(160 72% 46%)",
                color: "hsl(160 30% 6%)",
                boxShadow: "0 0 24px hsl(160 72% 46% / 0.4)",
              }}
            >
              <img src="/app-store-icon.webp" alt="App Store" className="w-5 h-5 object-contain" />
              App Store
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-2xl px-5 py-3 font-semibold text-sm transition-all duration-200"
              style={{
                background: "hsl(160 14% 9%)",
                border: "1px solid hsl(160 12% 20%)",
                color: "hsl(150 20% 88%)",
              }}
            >
              <img src="/play-store-icon.png" alt="Google Play" className="w-5 h-5 object-contain" />
              Google Play
            </motion.a>
          </motion.div>
        </div>

        {/* Right: orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
        >
          <HeroOrb />
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        style={{ color: "hsl(160 10% 40%)" }}
      >
        <span className="text-xs tracking-widest uppercase font-mono">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: MapPin,
    title: "Hyper-local radar",
    description:
      "See what's happening within walking distance — events, people, and places that match your vibe, updated in real time.",
    accent: "hsl(160 72% 46%)",
  },
  {
    icon: Users,
    title: "Neighbor discovery",
    description:
      "Find people nearby who share your interests. LokaLinc surfaces genuine connections, not algorithmic strangers.",
    accent: "hsl(190 75% 52%)",
  },
  {
    icon: Zap,
    title: "Instant moments",
    description:
      "Spontaneous plans, flash meetups, last-minute invites — LokaLinc makes serendipity feel designed.",
    accent: "hsl(145 68% 48%)",
  },
  {
    icon: MessageCircle,
    title: "Proximity chat",
    description:
      "Messages that only work when you're close. No long-distance noise — just the people in your world right now.",
    accent: "hsl(175 70% 46%)",
  },
  {
    icon: Compass,
    title: "Local explore",
    description:
      "Curated spots, hidden gems, and community-rated places — all filtered to what's actually reachable today.",
    accent: "hsl(155 65% 50%)",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    description:
      "You control your visibility. Precise location is never stored — only the neighborhood radius you choose.",
    accent: "hsl(165 60% 48%)",
  },
];

function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-dots opacity-20" />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "hsl(160 72% 46% / 0.1)",
              border: "1px solid hsl(160 72% 46% / 0.2)",
              color: "hsl(160 72% 55%)",
            }}
          >
            <Zap size={11} />
            Features
          </div>
          <h2
            className="font-display text-4xl sm:text-5xl font-bold mb-4"
            style={{ color: "hsl(150 20% 94%)" }}
          >
            Everything local,
            <br />
            <span className="text-gradient">nothing else.</span>
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: "hsl(160 10% 52%)" }}>
            Built for the neighborhood you actually live in — not the internet at large.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <FeatureCard {...f} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    icon: MapPin,
    title: "Set your radius",
    body: "Choose how close is close — a few blocks, a mile, or your whole neighborhood. You decide the bubble.",
  },
  {
    num: "02",
    icon: Compass,
    title: "Discover your world",
    body: "LokaLinc surfaces people, events, and places that match your interests within your chosen range.",
  },
  {
    num: "03",
    icon: MessageCircle,
    title: "Connect and go",
    body: "Reach out, show up, and make it real. LokaLinc gets out of the way once the connection is made.",
  },
];

function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how" className="relative py-32 overflow-hidden">
      {/* Subtle gradient divider */}
      <div className="hr-fade mb-0" />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, hsl(160 72% 46% / 0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "hsl(160 72% 46% / 0.1)",
              border: "1px solid hsl(160 72% 46% / 0.2)",
              color: "hsl(160 72% 55%)",
            }}
          >
            <Star size={11} />
            How it works
          </div>
          <h2
            className="font-display text-4xl sm:text-5xl font-bold"
            style={{ color: "hsl(150 20% 94%)" }}
          >
            Three steps to
            <br />
            <span className="text-gradient">your neighborhood.</span>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setActiveStep(i)}
              className="relative rounded-2xl p-8 cursor-default group"
              style={{
                background: "hsl(160 14% 9%)",
                border: `1px solid ${activeStep === i ? "hsl(160 72% 46% / 0.4)" : "hsl(160 12% 16%)"}`,
                transition: "border-color 0.3s ease",
              }}
            >
              {/* Step number */}
              <div
                className="font-mono text-5xl font-bold mb-6 leading-none"
                style={{
                  color: activeStep === i ? "hsl(160 72% 46% / 0.25)" : "hsl(160 12% 18%)",
                  transition: "color 0.3s ease",
                }}
              >
                {step.num}
              </div>

              {/* Icon */}
              <motion.div
                animate={{ scale: activeStep === i ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{
                  background: activeStep === i ? "hsl(160 72% 46% / 0.15)" : "hsl(160 12% 13%)",
                  border: `1px solid ${activeStep === i ? "hsl(160 72% 46% / 0.35)" : "hsl(160 12% 18%)"}`,
                  transition: "background 0.3s ease, border-color 0.3s ease",
                }}
              >
                <step.icon
                  size={22}
                  strokeWidth={1.75}
                  style={{
                    color: activeStep === i ? "hsl(160 72% 55%)" : "hsl(160 10% 45%)",
                    transition: "color 0.3s ease",
                  }}
                />
              </motion.div>

              <h3
                className="font-display text-xl font-semibold mb-3"
                style={{ color: "hsl(150 20% 92%)" }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(160 10% 50%)" }}>
                {step.body}
              </p>

              {/* Active indicator line */}
              <AnimatePresence>
                {activeStep === i && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full origin-left"
                    style={{ background: "hsl(160 72% 46%)" }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Notification demo ────────────────────────────────────────────────────────

const NOTIFS = [
  { icon: MapPin, text: "Priya is 0.2 mi away", time: "just now", color: "hsl(160 72% 55%)" },
  { icon: Bell,   text: "Farmers market starts in 20 min", time: "8:40 AM", color: "hsl(190 75% 55%)" },
  { icon: Users,  text: "3 neighbors joined your block", time: "8:35 AM", color: "hsl(145 68% 50%)" },
  { icon: Star,   text: "New spot: Rooftop Coffee Co.", time: "8:20 AM", color: "hsl(175 70% 48%)" },
];

function NotifDemo() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="hr-fade" />
      <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
        {/* Left: copy */}
        <div className="flex-1">
          <ScrollReveal>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "hsl(160 72% 46% / 0.1)",
                border: "1px solid hsl(160 72% 46% / 0.2)",
                color: "hsl(160 72% 55%)",
              }}
            >
              <Bell size={11} />
              Live updates
            </div>
            <h2
              className="font-display text-4xl sm:text-5xl font-bold mb-6"
              style={{ color: "hsl(150 20% 94%)" }}
            >
              Your neighborhood,
              <br />
              <span className="text-gradient">always on.</span>
            </h2>
            <p className="text-base leading-relaxed mb-8 max-w-sm" style={{ color: "hsl(160 10% 52%)" }}>
              Smart, proximity-aware notifications that surface what matters —
              and stay quiet when nothing's happening near you.
            </p>
            <motion.a
              href="#download"
              whileHover={{ x: 4 }}
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "hsl(160 72% 55%)" }}
            >
              Start exploring <ArrowRight size={15} />
            </motion.a>
          </ScrollReveal>
        </div>

        {/* Right: notification stack */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-sm">
            {NOTIFS.map((n, i) => (
              <motion.div
                key={n.text}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.14,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ x: -4, scale: 1.02 }}
                className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 mb-3 cursor-default"
                style={{
                  background: "hsl(160 14% 9%)",
                  border: "1px solid hsl(160 12% 16%)",
                  boxShadow: `0 4px 24px hsl(160 72% 46% / 0.06)`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${n.color}18`, border: `1px solid ${n.color}30` }}
                >
                  <n.icon size={16} style={{ color: n.color }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "hsl(150 20% 88%)" }}>
                    {n.text}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(160 10% 45%)" }}>
                    {n.time}
                  </p>
                </div>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: n.color, boxShadow: `0 0 6px ${n.color}` }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="hr-fade mb-0" />
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(160 72% 46% / 0.08) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-dots opacity-20" />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <ScrollReveal>
          {/* Spinning ring decoration */}
          <div className="relative inline-flex items-center justify-center mb-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute w-24 h-24 rounded-full"
              style={{ border: "1px dashed hsl(160 72% 46% / 0.3)" }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              className="absolute w-16 h-16 rounded-full"
              style={{ border: "1px solid hsl(160 72% 46% / 0.2)" }}
            />
            <div
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "hsl(160 72% 46%)",
                boxShadow: "0 0 32px hsl(160 72% 46% / 0.5)",
              }}
            >
              <img src="/app-icon.png" alt="LokaLinc" className="w-9 h-9 rounded-xl object-cover" />
            </div>
          </div>

          <h2
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: "hsl(150 20% 96%)" }}
          >
            Your neighborhood
            <br />
            <span className="text-gradient">is waiting.</span>
          </h2>
          <p className="text-lg mb-10 max-w-md mx-auto" style={{ color: "hsl(160 10% 52%)" }}>
            Download LokaLinc and start discovering the people and places that
            are already around you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.a
              href="#"
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px hsl(160 72% 46% / 0.6)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-2xl px-6 py-3.5 font-semibold text-sm"
              style={{
                background: "hsl(160 72% 46%)",
                color: "hsl(160 30% 6%)",
                boxShadow: "0 0 24px hsl(160 72% 46% / 0.4)",
              }}
            >
              <img src="/app-store-icon.webp" alt="App Store" className="w-5 h-5 object-contain" />
              Download on App Store
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-2xl px-6 py-3.5 font-semibold text-sm"
              style={{
                background: "hsl(160 14% 9%)",
                border: "1px solid hsl(160 12% 22%)",
                color: "hsl(150 20% 88%)",
              }}
            >
              <img src="/play-store-icon.png" alt="Google Play" className="w-5 h-5 object-contain" />
              Get it on Google Play
            </motion.a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="relative border-t" style={{ borderColor: "hsl(160 12% 14%)" }}>
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/app-icon.png" alt="LokaLinc" className="w-6 h-6 rounded-md object-cover" />
          <span className="font-display font-semibold text-sm" style={{ color: "hsl(150 20% 70%)" }}>
            LokaLinc
          </span>
        </div>

        <nav className="flex items-center gap-6 text-xs" style={{ color: "hsl(160 10% 42%)" }}>
          <a
            href="/privacy"
            className="transition-colors hover:text-[hsl(160_72%_55%)]"
          >
            Privacy Policy
          </a>
          <a
            href="/privacy#terms"
            className="transition-colors hover:text-[hsl(160_72%_55%)]"
          >
            Terms of Service
          </a>
          <a
            href="/support"
            className="transition-colors hover:text-[hsl(160_72%_55%)]"
          >
            Support
          </a>
        </nav>

        <NewlyAttribution />
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <NotifDemo />
      <CTA />
      <Footer />
    </main>
  );
}
