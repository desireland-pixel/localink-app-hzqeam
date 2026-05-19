/** @type {import('next').NextConfig} */
const nextConfig = {
  // Project icons + screenshots are referenced as plain `<img src>` (the
  // agent prompt forbids `next/image` because the runtime is `next dev`
  // with no Next image server pre-warmed). `unoptimized: true` makes any
  // accidental `<Image>` usage degrade gracefully instead of 404'ing.
  images: { unoptimized: true },
};

export default nextConfig;
