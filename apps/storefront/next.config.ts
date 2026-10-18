import path from "path";
import { existsSync, realpathSync } from "node:fs"
import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

// Images may come from the backend (local uploads) and from the upload bucket
// (R2, the backend's S3_FILE_URL); both addresses come from settings.
function imageHost(url: string | undefined): RemotePattern[] {
  if (!url) return [];
  try {
    const parsed = new URL(url);
    return [{
      protocol: (parsed.protocol.replace(":", "") as "http" | "https") || undefined,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
    }];
  } catch {
    return [];
  }
}
const medusaBackendPattern = imageHost(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL);
const mediaPattern = imageHost(process.env.NEXT_PUBLIC_MEDIA_URL);

const workspaceRoot = path.resolve(__dirname, "../..")
const storefrontModules = path.join(__dirname, "node_modules")
const externalModules = existsSync(storefrontModules) &&
  !realpathSync(storefrontModules).startsWith(`${workspaceRoot}${path.sep}`)

const nextConfig: NextConfig = {
  turbopack: {
    // The GPT worktree links dependencies from its sibling checkout.
    root: externalModules ? path.dirname(workspaceRoot) : workspaceRoot,
  },

  images: {
    qualities: [75, 100],
    minimumCacheTTL: 86400,
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      ...medusaBackendPattern,
      ...mediaPattern,
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