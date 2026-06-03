/** @type {import('next').NextConfig} */

// 운영에선 메인도메인/textmoji 서브경로로 서빙된다(nginx). 폰트앱이 /font, 스티커앱이 /sticker를 쓰는 것과 동일 패턴.
// 자산·링크·내부 라우팅이 모두 basePath 안에서 동작하도록 basePath/assetPrefix를 설정한다.
// 로컬에서 루트로 띄우고 싶으면 BASE_PATH="" 로 덮어쓸 수 있다.
const basePath =
  process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : "/textmoji";

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // 워크스페이스 패키지를 소스(.ts/.css)째로 가져오므로 Next가 트랜스파일하도록 지정
  transpilePackages: ["@webapp/seo", "@webapp/ui"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath || "",
  },
};

export default nextConfig;
