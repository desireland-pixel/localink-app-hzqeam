"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  MapPin,
  Zap,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { NewlyAttribution } from "@/components/ui/newly-attribution";
import { useState } from "react";

const FAQS = [
  {
    q: "How does LokaLinc determine my location?",
    a: "LokaLinc uses your device's location services while the app is open to calculate your neighborhood radius. Precise GPS coordinates are never stored on our servers — only the approximate area is used to surface nearby content.",
  },
  {
    q: "Can I control who sees me on the map?",
    a: "Yes. You can set your visibility to Public, Friends Only, or Hidden at any time from your profile settings. When Hidden, you won't appear to other users but can still browse local content.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → Account → Delete Account. Your data will be permanently removed from our systems within 30 days. This action cannot be undone.",
  },
  {
    q: "Why am I not seeing anyone nearby?",
    a: "LokaLinc is growing — if your area has few users, the feed may be sparse. Make sure location permissions are enabled, and try expanding your radius in Settings. New users join every day.",
  },
  {
    q: "How do I report a user or content?",
    a: "Tap the three-dot menu on any profile or post and select 'Report'. Our moderation team reviews all reports within 24 hours. For urgent safety concerns, email us directly.",
  },
  {
    q: "Is LokaLinc available on both iOS and Android?",
    a: "Yes — LokaLinc is available on the App Store for iOS and Google Play for Android. Both versions are kept in sync with the same features.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{
        background: "hsl(160 14% 9%)",
        border: `1px solid ${open ? "hsl(160 72% 46% / 0.35)" : "hsl(160 12% 16%)"}`,
        transition: "border-color 0.25s ease",
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <span className="text-sm font-semibold" style={{ color: "hsl(150 20% 88%)" }}>
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
          style={{ color: "hsl(160 72% 55%)" }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </div>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: "hidden" }}
      >
        <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "hsl(160 10% 55%)" }}>
          {a}
        </p>
      </motion.div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "hsl(160 18% 6%)", color: "hsl(150 20% 94%)" }}
    >
      {/* Header */}
      <div className="border-b" style={{ borderColor: "hsl(160 12% 14%)" }}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: "hsl(160 10% 50%)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(160 72% 55%)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(160 10% 50%)")}
          >
            <ArrowLeft size={15} />
            Back to LokaLinc
          </Link>
          <div className="flex items-center gap-2">
            <img src="/app-icon.png" alt="LokaLinc" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-display font-semibold text-sm" style={{ color: "hsl(150 20% 80%)" }}>
              LokaLinc
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(160 72% 46% / 0.12)", border: "1px solid hsl(160 72% 46% / 0.25)" }}
            >
              <MessageCircle size={18} style={{ color: "hsl(160 72% 55%)" }} strokeWidth={1.75} />
            </div>
            <h1 className="font-display text-2xl font-bold" style={{ color: "hsl(150 20% 94%)" }}>
              Support
            </h1>
          </div>
          <p className="text-base leading-relaxed max-w-lg" style={{ color: "hsl(160 10% 55%)" }}>
            We're here to help. Browse the FAQ below or reach out directly —
            we respond to every message.
          </p>
        </motion.div>

        {/* Contact cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16"
        >
          {[
            {
              icon: Mail,
              label: "Email us",
              value: "Get in touch",
              href: "mailto:support@lokalinc.app",
              color: "hsl(160 72% 46%)",
            },
            {
              icon: MapPin,
              label: "Location",
              value: "Neighborhood-first",
              href: null,
              color: "hsl(190 75% 52%)",
            },
            {
              icon: Zap,
              label: "Response time",
              value: "Within 48 hours",
              href: null,
              color: "hsl(145 68% 48%)",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-5"
              style={{
                background: "hsl(160 14% 9%)",
                border: "1px solid hsl(160 12% 16%)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}
              >
                <card.icon size={16} style={{ color: card.color }} strokeWidth={1.75} />
              </div>
              <p className="text-xs mb-1" style={{ color: "hsl(160 10% 45%)" }}>
                {card.label}
              </p>
              {card.href ? (
                <a
                  href={card.href}
                  className="text-sm font-semibold transition-colors"
                  style={{ color: card.color }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {card.value}
                </a>
              ) : (
                <p className="text-sm font-semibold" style={{ color: "hsl(150 20% 88%)" }}>
                  {card.value}
                </p>
              )}
            </div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={16} style={{ color: "hsl(160 72% 55%)" }} strokeWidth={1.75} />
            <h2 className="font-display text-lg font-semibold" style={{ color: "hsl(150 20% 92%)" }}>
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} {...faq} />
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 rounded-2xl p-8 text-center"
          style={{
            background: "hsl(160 14% 9%)",
            border: "1px solid hsl(160 12% 16%)",
          }}
        >
          <p className="text-sm mb-2" style={{ color: "hsl(160 10% 52%)" }}>
            Still need help?
          </p>
          <h3 className="font-display text-xl font-bold mb-4" style={{ color: "hsl(150 20% 94%)" }}>
            We read every message.
          </h3>
          <a
            href="mailto:support@lokalinc.app"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{
              background: "hsl(160 72% 46%)",
              color: "hsl(160 30% 6%)",
              boxShadow: "0 0 20px hsl(160 72% 46% / 0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 32px hsl(160 72% 46% / 0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 20px hsl(160 72% 46% / 0.3)";
            }}
          >
            <Mail size={15} />
            Email support
          </a>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t mt-8" style={{ borderColor: "hsl(160 12% 14%)" }}>
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-xs" style={{ color: "hsl(160 10% 38%)" }}>
            © 2025 LokaLinc. All rights reserved.
          </p>
          <NewlyAttribution />
        </div>
      </div>
    </div>
  );
}
