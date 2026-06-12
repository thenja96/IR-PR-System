/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Hide the benign "Serializing big strings" cache warnings; only real
    // webpack errors are shown.
    config.infrastructureLogging = { level: "error" };
    return config;
  },
};

export default nextConfig;
