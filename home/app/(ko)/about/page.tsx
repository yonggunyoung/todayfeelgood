import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "소개 — 뚝킷(ddukkit)",
  description:
    "뚝킷은 설치도 가입도 없이 바로 즐기는 가벼운 웹 게임·도구 모음입니다. 광클대전, 냉비서 등 우리가 만드는 서비스와 철학을 소개합니다.",
  alternates: { canonical: "/about" },
};

const wrap: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.8 };
const h2: CSSProperties = { marginTop: 36, fontSize: "1.35rem" };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 28px", fontSize: ".95rem" };

export default function AboutPage() {
  return (
    <main style={wrap}>
      <p style={nav}>
        <a href="/">← 홈</a><a href="/guide">사용 가이드</a><a href="/faq">자주 묻는 질문</a><a href="/stories">읽을거리</a>
      </p>
      <h1 className="display" style={{ fontSize: "2rem" }}>뚝킷(ddukkit) 소개</h1>
      <p>
        뚝킷은 <strong>설치도 회원가입도 없이, 링크 하나로 바로 즐기는 가벼운 웹 게임과 생활 도구</strong>를 만드는 곳입니다.
        무거운 앱을 내려받지 않아도, 스마트폰 브라우저에서 즉시 열어 짧고 재미있게 쓸 수 있는 서비스를 지향합니다.
        모든 핵심 기능은 <strong>무료</strong>이며, 광고는 사용자가 원할 때만 보는 보상형(옵트인) 위주로만 운영합니다.
      </p>

      <h2 style={h2}>우리가 만드는 서비스</h2>
      <h3>⚡ 광클대전</h3>
      <p>
        매일 바뀌는 ‘오늘의 떡밥(민트초코 vs 반민초, 부먹 vs 찍먹, 아이스 아메리카노에 샷 vs 아이스티에 샷 등)’에서
        내 편을 고르고 60초 동안 화면을 두드리는 실시간 진영 게임입니다. 내 한 번의 탭이 전국·전 세계 집계에 실시간으로
        반영되어, 더 많이 두드린 쪽이 그 라운드의 승리 진영이 됩니다. 친구·가족·학교끼리만 즐기는 비공개 방도 코드 하나로
        만들 수 있어, 짧은 시간에 가볍게 ‘편 갈라 노는’ 재미를 줍니다. <a href="/gwangclick/">바로 플레이 →</a>
      </p>
      <h3>🧊 냉비서</h3>
      <p>
        영수증 한 장으로 냉장고 속 재료를 등록하고, 유통기한과 보관 팁을 관리해 음식물 낭비를 줄여 주는 생활 도구입니다.
        장보기 전에 ‘우리 집에 뭐가 있더라?’를 한눈에 확인할 수 있도록 돕습니다.
      </p>

      <h2 style={h2}>만드는 원칙</h2>
      <ul>
        <li><strong>마찰 0</strong> — 설치·가입 없이 링크로 바로. 핵심 기능은 무료.</li>
        <li><strong>가벼움</strong> — 오래 붙잡지 않고, 짧게 즐기고 떠나도 좋은 경험.</li>
        <li><strong>개인정보 최소수집</strong> — 이름·연락처 같은 개인식별정보를 수집하지 않습니다. (자세히는 개인정보처리방침)</li>
        <li><strong>건강한 광고</strong> — 게임 진행을 가로막는 전면·강제 광고 대신, 원할 때만 보는 보상형 위주.</li>
      </ul>

      <h2 style={h2}>문의</h2>
      <p>
        서비스 제안·오류 제보·제휴 문의는 <a href="mailto:yonggunyoung@gmail.com">yonggunyoung@gmail.com</a> 으로 보내 주세요.
        영업일 기준 3일 이내에 답변드립니다.
      </p>
    </main>
  );
}
