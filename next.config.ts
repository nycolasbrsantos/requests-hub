import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {},
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Excluir módulos Node.js do bundle do client
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        dns: false,
        child_process: false,
        util: false,
        buffer: false,
        events: false,
        querystring: false,
        punycode: false,
        string_decoder: false,
        timers: false,
        tty: false,
        vm: false,
        constants: false,
        domain: false,
        module: false,
        process: false,
        global: false,
        Buffer: false,
        __dirname: false,
        __filename: false,
        setImmediate: false,
        clearImmediate: false,
      };
      
      // Excluir pacotes problemáticos do bundle do client
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'commonjs pg',
        'drizzle-orm': 'commonjs drizzle-orm',
        'drizzle-orm/node-postgres': 'commonjs drizzle-orm/node-postgres',
        'googleapis': 'commonjs googleapis',
        'google-auth-library': 'commonjs google-auth-library',
      });
    }
    return config;
  },
};

export default nextConfig;