module.exports = {
  output: "standalone", // Important for Docker deployments
  images: {
    unoptimized: true, // This can help with image loading in Docker
    domains: [], // Add any external domains if needed
    remotePatterns: [
      {
        protocol: "https",
        hostname: "edinception.online",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};
