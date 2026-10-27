import type { NextConfig } from "next";

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

const nextConfig: NextConfig = {
  experimental: {
    // Photo uploads from /admin go through a Server Action (default cap: 1 MB).
    // Images are resized in the browser first; the server rejects > 5 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: [
      // Firebase Storage download URLs (https://firebasestorage.googleapis.com/v0/b/<bucket>/o/...)
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: storageBucket ? `/v0/b/${storageBucket}/o/**` : "/v0/b/**",
      },
      // Legacy Sanity CDN — remove once all images are re-hosted in Firebase Storage.
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
