/** @type {import('next').NextConfig} */

// 운영에선 메인도메인/sign 서브경로로 서빙된다(nginx). 폰트앱이 /font를 쓰는 것과 동일 패턴.
// 자산·링크·내부 라우팅·API가 모두 basePath 안에서 동작하도록 basePath/assetPrefix를 설정한다.
// 로컬에서 루트로 띄우고 싶으면 BASE_PATH="" 로 덮어쓸 수 있다.
const basePath =
  process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : "/sign";

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // 워크스페이스 패키지를 소스(.ts/.css)째로 가져오므로 Next가 트랜스파일하도록 지정
  transpilePackages: ["@webapp/core", "@webapp/seo", "@webapp/ui"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath || "",
  },
};

export default nextConfig;
