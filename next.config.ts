import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // `sharp` is a native module — decode it via Node's require rather than
  // letting Next bundle it into the server build. Used by the product
  // colour-detection route (src/app/api/products/detect-color).
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
