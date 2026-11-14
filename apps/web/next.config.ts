import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/models/body/body.glb",
      has: [{ type: "query", key: "v", value: "[a-f0-9]{12}" }],
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
    }];
  },
  reactStrictMode: false
};

export default nextConfig;
