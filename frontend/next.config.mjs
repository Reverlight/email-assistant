/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.API_URL || "http://web:8000";
    return [
      { source: "/emails/:path*", destination: `${apiBase}/emails/:path*` },
      { source: "/thread/:path*", destination: `${apiBase}/thread/:path*` },
      { source: "/fetch_order_details/:path*", destination: `${apiBase}/fetch_order_details/:path*` },
      { source: "/fetch_customer_details/:path*", destination: `${apiBase}/fetch_customer_details/:path*` },
      { source: "/refund_order/:path*", destination: `${apiBase}/refund_order/:path*` },
    ];
  },
};

export default nextConfig;