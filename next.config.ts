import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The kwitansi PDF reads its logo + signature from disk (kept out of
  // `public/` so the signature has no public URL); make sure they ship with
  // the route's serverless bundle.
  outputFileTracingIncludes: {
    "/api/export/kwitansi/[id]": ["./assets/kwitansi/**"],
  },
  /* config options here */
  experimental: {
    serverActions: {
      // Default Server Action body cap is 1MB, which silently overrides
      // this app's own PHOTO<=2MB / VIDEO/AUDIO<=15MB limits in
      // `lib/files.ts` -- 20mb comfortably covers a 15MB raw file after
      // base64 inflation (~4/3x) plus JSON envelope overhead.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
