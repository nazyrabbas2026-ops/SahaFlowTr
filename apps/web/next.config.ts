import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Smoke paketi kendi build çıktısını ayrı bir klasöre yazar; aksi hâlde
  // çalışan `next dev` sunucusunun `.next` dizinini bozar.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
