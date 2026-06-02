/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 워크스페이스 패키지를 소스(.ts)째로 가져오므로 Next가 트랜스파일하도록 지정
  transpilePackages: ["@webapp/core", "@webapp/seo"],
};

export default nextConfig;
