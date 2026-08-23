/** @type {import('next').NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const onGithubPages = process.env.GITHUB_ACTIONS === 'true' && repo;
const basePath = onGithubPages ? `/${repo}` : '';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath
};
export default nextConfig;
