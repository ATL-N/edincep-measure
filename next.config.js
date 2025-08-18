module.exports = {
  output: "standalone", // Good for Docker
  images: {
    // Remove unoptimized: true to keep image optimization
    // Remove domains: [] as it's not needed for local images
    // Only add remotePatterns if you need external images
    remotePatterns: [
      // Only uncomment and configure if you need external images
      // {
      //   protocol: "https",
      //   hostname: "example.com",
      // },
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
