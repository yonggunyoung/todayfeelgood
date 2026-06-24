import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";

export const metadata: Metadata = {
  title: "자주 묻는 질문(FAQ) — 뚝킷",
  description:
    "가입이 필요한가요? 데이터는 어디 저장되나요? 광고는요? 친구 방은 어떻게 만드나요? 뚝킷과 광클대전·냉비서에 대해 자주 묻는 질문을 모았습니다.",
  alternates: { canonical: "/faq" },
};

const wrap: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.8 };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 28px", fontSize: ".95rem" };
const q: CSSProperties = { marginTop: 26, fontSize: "1.12rem", fontWeight: 700 };

function QA({ question, children }: { question: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={q}>{question}</h2>
      <div>{children}</div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <main style={wrap}>
      <p style={nav}>
        <a href="/">← 홈</a><a href="/about">소개</a><a href="/guide">사용 가이드</a><a href="/stories">읽을거리</a>
      </p>
      <h1 className="display" style={{ fontSize: "2rem" }}>자주 묻는 질문</h1>

      <QA question="가입을 꼭 해야 하나요?">
        <p>아니요. 광클대전·냉비서 모두 <strong>설치도 가입도 없이</strong> 링크만으로 바로 사용할 수 있습니다. 닉네임만 정하면 랭킹에 표시됩니다. 기기를 바꿔도 같은 신원을 유지하고 싶을 때만 선택적으로 구글 로그인을 연결할 수 있어요.</p>
      </QA>

      <QA question="내 기록과 데이터는 어디에 저장되나요?">
        <p>최고기록·연속출석·누적 전적 같은 개인 데이터는 기본적으로 <strong>내 브라우저(로컬)</strong>에 저장됩니다. ‘전국 대전’ 실시간 집계처럼 함께 보는 숫자는 익명으로만 서버에 합산되며, 이름·연락처 등 개인식별정보는 수집하지 않습니다. 자세한 내용은 개인정보처리방침을 참고하세요.</p>
      </QA>

      <QA question="광고가 많나요?">
        <p>게임 진행을 가로막는 전면·배너 광고는 쓰지 않습니다. 광고는 ‘결과를 2배로 자랑하기’처럼 <strong>사용자가 원할 때만 보는 보상형(옵트인)</strong> 위주로만 운영하며, 10대 이용자를 위해 비개인화로 설정합니다.</p>
      </QA>

      <QA question="친구끼리만 하는 방은 어떻게 만드나요?">
        <p>광클대전 홈에서 ‘친구 방 만들기’를 누르고 주제와 시간을 정하면 <strong>공유 링크</strong>가 생깁니다. 링크를 받은 사람만 같은 방에서 경쟁하며, 그 방만의 순위와 승자가 따로 집계됩니다. 가족·친구·학교 대항전에 적합합니다.</p>
      </QA>

      <QA question="오늘의 떡밥(주제)은 어떻게 정해지나요?">
        <p>전 세계 공통으로 같은 시간대에 같은 주제가 열립니다. 일정 시간마다 다음 주제로 바뀌고, 라운드가 끝나면 그 시점 점유율로 승리 진영과 1등 유저가 정해집니다.</p>
      </QA>

      <QA question="비용이 드나요?">
        <p>핵심 기능은 모두 무료입니다.</p>
      </QA>

      <QA question="오류를 발견했어요 / 제안하고 싶어요">
        <p><a href="mailto:yonggunyoung@gmail.com">yonggunyoung@gmail.com</a> 으로 보내 주세요. 영업일 기준 3일 이내에 답변드립니다.</p>
      </QA>
    </main>
  );
}
