/** @type {import('next').NextConfig} */
const nextConfig = {
  // Loaded at runtime from node_modules, never bundled (drives a headless browser for the premium guide PDF).
  experimental: { serverComponentsExternalPackages: ["playwright-core"] },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
