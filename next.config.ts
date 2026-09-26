import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Use webpack for production builds (Turbopack lacks native Win32 x64 bindings) */
  /* Turbopack still works in dev mode via WASM */

  /* pdfkit (via @react-pdf/renderer) loads its 14 standard PDF fonts with a
     runtime `require`, so Turbopack/Nft cannot trace them automatically.
     Without this, PDF routes 500 on Vercel with:
     "Cannot find module '.../pdfkit/js/standard-fonts/Helvetica.cjs'" */
  outputFileTracingIncludes: {
    "/api/payments/[id]/receipt": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
    "/api/reports/[slug]/export/pdf": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
};

export default nextConfig;
