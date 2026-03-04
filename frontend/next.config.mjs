/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.API_URL || "http://web:8000";
    return [
      { source: "/emails/:path*",  destination: `${apiBase}/emails/:path*` },
      { source: "/openai/:path*",  destination: `${apiBase}/openai/:path*` },
      { source: "/shopify/:path*", destination: `${apiBase}/shopify/:path*` },
    ];
  },
};

export default nextConfig;
