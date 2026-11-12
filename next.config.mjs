/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lesson MDX and CURRICULUM.md are read from disk at request time.
  experimental: {
    outputFileTracingIncludes: { "/**": ["./content/**/*", "./CURRICULUM.md"] },
  },
};
export default nextConfig;
