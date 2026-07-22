import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The PDF service shells out to a LaTeX engine at runtime. Keep server-only
  // packages external so they are not bundled into the serverless output.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
