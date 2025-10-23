/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  webpack: (config, { isServer }) => {
    // Exclude Node.js-specific ONNX Runtime bindings from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
        'sharp': false,
      };
    }
    // Ignore node binaries
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });
    return config;
  },
};
export default nextConfig;
