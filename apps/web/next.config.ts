import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const nextConfig: NextConfig = {
  // Slim, self-contained output for the Docker runtime stage.
  output: 'standalone',
  // Pin the monorepo root so file tracing ignores unrelated lockfiles elsewhere.
  outputFileTracingRoot: repoRoot,
  reactStrictMode: true,
  // shared-types is shipped as TypeScript source, so Next must transpile it.
  transpilePackages: ['@platform/shared-types'],
};

export default nextConfig;
