"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeft } from "lucide-react";
import { NewlyAttribution } from "@/components/ui/newly-attribution";

const FADE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "hsl(160 18% 6%)", color: "hsl(150 20% 94%)" }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: "hsl(160 12% 14%)" }}
      >
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
        {/* Privacy Policy */}
        <motion.section {...FADE_UP} className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(160 72% 46% / 0.12)", border: "1px solid hsl(160 72% 46% / 0.25)" }}
            >
              <ShieldCheck size={18} style={{ color: "hsl(160 72% 55%)" }} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: "hsl(150 20% 94%)" }}>
                Privacy Policy
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "hsl(160 10% 45%)" }}>
                Last updated: June 2025
              </p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-relaxed" style={{ color: "hsl(160 10% 60%)" }}>
            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                1. Information We Collect
              </h2>
              <p>
                LokaLinc collects only the information necessary to provide a
                proximity-based connection experience. This includes your
                approximate location (neighborhood radius — never precise GPS
                coordinates stored on our servers), your display name and
                profile photo if you choose to provide them, and usage data
                such as features accessed and session duration.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                2. How We Use Your Information
              </h2>
              <p>
                We use collected information solely to operate and improve
                LokaLinc: to surface nearby people and places relevant to you,
                to send proximity-aware notifications you have opted into, and
                to diagnose technical issues. We do not sell your data to third
                parties, and we do not use your information for targeted
                advertising.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                3. Location Data
              </h2>
              <p>
                Location is the core of LokaLinc. We request access to your
                device location only while the app is in use (foreground
                access). Your precise coordinates are processed on-device to
                determine your neighborhood radius; only that radius — not
                exact coordinates — is shared with other users or stored on our
                servers. You may revoke location permission at any time in your
                device settings.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                4. Data Sharing
              </h2>
              <p>
                We do not sell, rent, or trade your personal information. We
                may share anonymized, aggregated data (e.g., neighborhood
                activity trends) that cannot identify you. We may disclose
                information if required by law or to protect the safety of our
                users.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                5. Data Retention
              </h2>
              <p>
                We retain your account data for as long as your account is
                active. You may request deletion of your account and associated
                data at any time by contacting us at support. Upon deletion,
                your data is removed from our systems within 30 days.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                6. Security
              </h2>
              <p>
                We use industry-standard encryption (TLS in transit, AES-256
                at rest) to protect your data. No system is perfectly secure;
                we encourage you to use a strong, unique password and to report
                any suspected security issues to us immediately.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                7. Children's Privacy
              </h2>
              <p>
                LokaLinc is not directed at children under 13. We do not
                knowingly collect personal information from children under 13.
                If you believe a child has provided us with personal
                information, please contact us and we will delete it promptly.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                8. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of significant changes via in-app notification or
                email. Continued use of LokaLinc after changes constitutes
                acceptance of the updated policy.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Divider */}
        <div className="hr-fade mb-20" />

        {/* Terms of Service */}
        <motion.section
          id="terms"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(190 75% 52% / 0.12)", border: "1px solid hsl(190 75% 52% / 0.25)" }}
            >
              <FileText size={18} style={{ color: "hsl(190 75% 60%)" }} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: "hsl(150 20% 94%)" }}>
                Terms of Service
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "hsl(160 10% 45%)" }}>
                Last updated: June 2025
              </p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-relaxed" style={{ color: "hsl(160 10% 60%)" }}>
            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                1. Acceptance of Terms
              </h2>
              <p>
                By downloading, installing, or using LokaLinc, you agree to be
                bound by these Terms of Service. If you do not agree, do not
                use the app.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                2. Use of the Service
              </h2>
              <p>
                LokaLinc is a platform for discovering local connections. You
                agree to use it only for lawful purposes and in a manner that
                does not infringe the rights of others. You must be at least 13
                years old to use LokaLinc.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                3. User Conduct
              </h2>
              <p>
                You agree not to harass, threaten, or harm other users; not to
                post false, misleading, or deceptive content; not to attempt to
                gain unauthorized access to any part of the service; and not to
                use automated tools to scrape or interact with the service.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                4. Intellectual Property
              </h2>
              <p>
                All content, trademarks, and technology in LokaLinc are owned
                by or licensed to us. You may not reproduce, distribute, or
                create derivative works without our express written permission.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                5. Disclaimer of Warranties
              </h2>
              <p>
                LokaLinc is provided "as is" without warranties of any kind,
                express or implied. We do not guarantee that the service will
                be uninterrupted, error-free, or free of harmful components.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                6. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, we shall not be liable
                for any indirect, incidental, special, or consequential damages
                arising from your use of LokaLinc.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                7. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your access to
                LokaLinc at any time for violations of these Terms or for any
                other reason at our discretion.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                8. Governing Law
              </h2>
              <p>
                These Terms are governed by applicable law. Any disputes shall
                be resolved through binding arbitration or in the courts of
                competent jurisdiction.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-2" style={{ color: "hsl(150 20% 88%)" }}>
                9. Changes to Terms
              </h2>
              <p>
                We may modify these Terms at any time. We will provide notice
                of material changes. Continued use of LokaLinc after changes
                constitutes acceptance.
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Footer */}
      <div
        className="border-t mt-8"
        style={{ borderColor: "hsl(160 12% 14%)" }}
      >
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
