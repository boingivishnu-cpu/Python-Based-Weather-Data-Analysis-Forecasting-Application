import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/weather", destination: "/", permanent: false },
      { source: "/forecast", destination: "/", permanent: false },
      { source: "/satellite", destination: "/", permanent: false },
      { source: "/analysis", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
