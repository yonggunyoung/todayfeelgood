/** @type {import('next').NextConfig} */

// 메인 홈페이지 — 도메인 루트에서 서빙(basePath 없음). 검색 진입점.
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@webapp/seo", "@webapp/ui"],
};

export default nextConfig;
