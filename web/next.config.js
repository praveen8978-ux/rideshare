/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      'res.cloudinary.com',
      'lh3.googleusercontent.com',
      's3.amazonaws.com',
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:        process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL:     process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY:   process.env.NEXT_PUBLIC_RAZORPAY_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;