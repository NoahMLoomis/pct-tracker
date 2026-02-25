import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://iycrudkclbzebubzcort.supabase.co/**/*")
    ]
  }
  /* config options here */
};

export default nextConfig;
