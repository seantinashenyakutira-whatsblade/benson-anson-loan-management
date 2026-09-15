import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Use webpack for production builds (Turbopack lacks native Win32 x64 bindings) */
  /* Turbopack still works in dev mode via WASM */
};

export default nextConfig;
