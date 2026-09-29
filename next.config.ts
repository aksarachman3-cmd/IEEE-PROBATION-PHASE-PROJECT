import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The smoke test runs `next dev`, which would otherwise overwrite the
  // production build in `.next`. Giving it its own directory means running the
  // tests never invalidates a build you are about to `next start`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Event cover images are uploaded at runtime to `public/uploads`, so the
  // optimizer is allowed to serve local images from the public folder.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typedRoutes: true,
};

export default nextConfig;
