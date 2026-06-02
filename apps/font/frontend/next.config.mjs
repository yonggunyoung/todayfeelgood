/** @type {import('next').NextConfig} */

// 운영에선 메인도메인/font 서브경로로 서빙된다(nginx). 자산·링크·API가
// 모두 basePath 안에서 동작하도록 basePath/assetPrefix를 설정한다.
// 로컬에서 루트로 띄우고 싶으면 BASE_PATH="" 로 덮어쓸 수 있다.
const basePath =
  process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : "/font";

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // 워크스페이스 패키지를 소스(.ts/.css)째로 가져오므로 Next가 트랜스파일하도록 지정
  transpilePackages: ["@webapp/core", "@webapp/seo", "@webapp/ui"],
  env: {
    // 클라이언트에서 basePath를 알아야 하는 경우(fetch 경로 등) 노출
    NEXT_PUBLIC_BASE_PATH: basePath || "",
  },
};

export default nextConfig;
