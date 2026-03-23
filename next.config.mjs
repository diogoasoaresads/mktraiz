/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                ...config.watchOptions,
                ignored: ['**/database.sqlite', '**/database.sqlite-journal'],
            };
        }
        return config;
    },
};

export default nextConfig;
