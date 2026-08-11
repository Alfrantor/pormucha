import type { NextConfig } from "next";

const bucket = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
      {
        pathname: "/api/web-media",
      },
    ],
    remotePatterns: bucket && region ? [
      {
        protocol: "https",
        hostname: `${bucket}.s3.${region}.amazonaws.com`,
        pathname: "/**",
      },
    ] : [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
