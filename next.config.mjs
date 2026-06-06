/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  turbopack: {
    root: import.meta.dirname
  },
  typedRoutes: false
};

export default nextConfig;
