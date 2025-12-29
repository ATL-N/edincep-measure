/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "f003.backblazeb2.com",
        port: "",
        // Allow any file from any bucket on this host
        pathname: "/file/**",
      },
    ],
  },
};

export default nextConfig;
