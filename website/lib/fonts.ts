import {
  Instrument_Serif,
  Bricolage_Grotesque,
  Fraunces,
  DM_Serif_Display,
  Manrope,
  JetBrains_Mono,
  Inter_Tight,
} from "next/font/google";

// Display fonts -- pick one per project. Each option is intentionally
// distinctive; none of them are Inter. Pair each with a body font.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-display",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-display",
});

// Body fonts -- both modern, neither generic.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

// Always available for stats / numerals / code-ish accents.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export type FontDNA =
  | "editorial"      // Instrument Serif + Manrope        (refined / Apple-ish)
  | "bold"           // Bricolage Grotesque + Inter Tight (bold launch / playful)
  | "expressive"     // Fraunces + Manrope                (variable serif / characterful)
  | "luxury";        // DM Serif Display + Manrope        (high-end / wellness)

/**
 * Returns the className string to put on <html> for a given DNA. Combines
 * the chosen display + body + mono variables so all three are available
 * via `var(--font-*)` in globals.css and the Tailwind `font-*` helpers.
 *
 * Usage in app/layout.tsx:
 *   <html lang="en" className={pairFor("editorial")}>
 */
export function pairFor(dna: FontDNA): string {
  const mono = jetbrainsMono.variable;
  switch (dna) {
    case "editorial":
      return `${instrumentSerif.variable} ${manrope.variable} ${mono}`;
    case "bold":
      return `${bricolage.variable} ${interTight.variable} ${mono}`;
    case "expressive":
      return `${fraunces.variable} ${manrope.variable} ${mono}`;
    case "luxury":
      return `${dmSerif.variable} ${manrope.variable} ${mono}`;
  }
}
