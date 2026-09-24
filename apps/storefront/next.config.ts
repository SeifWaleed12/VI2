import path from "path";
import type { NextConfig } from "next";

const medusaBackendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const medusaBackendPattern: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
if (medusaBackendUrl) {
  try {
    const parsed = new URL(medusaBackendUrl);
    medusaBackendPattern.push({
      protocol: (parsed.protocol.replace(":", "") as "http" | "https") || undefined,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
    });
  } catch {
    // Ignore invalid URL
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },

  images: {
    qualities: [75, 100],
    minimumCacheTTL: 86400,
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      ...medusaBackendPattern,
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "192.168.1.13",
      },
      {
        protocol: "http",
        hostname: "172.20.10.3",
      },
      {
        protocol: "http",
        hostname: "192.168.1.5",
      },
      {
        protocol: "https",
        hostname: "s3.images-iherb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "eg.bigramylabs.com",
        pathname: "/cdn/shop/**",
      },
      {
        protocol: "https",
        hostname: "www.bigramylabs.com",
        pathname: "/cdn/shop/**",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        pathname: "/**",
      },
    ],
  },

  allowedDevOrigins: [
    "192.168.1.13",
    "172.20.10.3",
    "192.168.1.5",
  ],
};

export default nextConfig;