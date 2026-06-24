import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "읽을거리 — 떡밥 문화 이야기",
  description:
    "민초 vs 반민초, 부먹 vs 찍먹, 아샷추까지. 우리는 왜 사소한 취향으로 편을 가르며 즐거워할까요? 인터넷 ‘떡밥’ 문화를 가볍게 들여다봅니다.",
  alternates: { canonical: "/stories" },
};

const wrap: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.85 };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 28px", fontSize: ".95rem" };
const h2: CSSProperties = { marginTop: 40, fontSize: "1.4rem" };
const meta: CSSProperties = { opacity: 0.6, fontSize: ".85rem", marginTop: 4 };

export default function StoriesPage() {
  return (
    <main style={wrap}>
      <p style={nav}>
        <a href="/">← 홈</a><a href="/about">소개</a><a href="/guide">사용 가이드</a><a href="/faq">FAQ</a>
      </p>
      <h1 className="display" style={{ fontSize: "2rem" }}>떡밥 문화 이야기</h1>
      <p>사소한 취향으로 편을 가르며 웃는 문화, 어디서 왔고 왜 재미있을까요. 가볍게 읽어 보세요.</p>

      <article>
        <h2 style={h2}>① 민초 vs 반민초 — 우리는 왜 ‘치약 맛’으로 싸울까</h2>
        <p style={meta}>취향·밈 이야기 · 읽는 데 3분</p>
        <p>
          민트초코는 오랫동안 ‘호불호의 대명사’였습니다. 한쪽은 시원한 민트와 달콤한 초코의 조합을 ‘신이 내린 맛’이라 부르고,
          다른 한쪽은 ‘디저트에 치약을 왜 넣느냐’며 손사래를 칩니다. 흥미로운 건, 이 논쟁이 실제로 누군가를 설득하려는 게
          아니라는 점입니다. 사람들은 정답을 가리려는 게 아니라 <strong>‘나는 이쪽’</strong>이라고 선언하며 같은 편을 확인하는
          재미로 참여합니다.
        </p>
        <p>
          심리학에서는 이를 ‘최소 집단 패러다임’으로 설명하곤 합니다. 동전 던지기처럼 사소한 기준으로 편을 나눠도, 사람은 곧바로
          자기 편에 애착을 느끼고 상대 편과 가볍게 경쟁하려 합니다. 민초 논쟁이 오래 사랑받는 이유도 비슷합니다. 진입 장벽이 낮고
          (누구나 한 입은 먹어 봤고), 정치·종교처럼 무겁지 않으며, 결과가 내 삶을 바꾸지 않으니 <strong>마음 편히 ‘본능적으로’</strong>
          편을 들 수 있으니까요.
        </p>
        <p>
          광클대전은 바로 이 감각을 게임으로 옮겼습니다. ‘민초단’과 ‘반민초파’ 중 하나를 고르고 60초 동안 손가락으로 응원하면,
          내 한 번의 탭이 전국 집계에 실시간으로 더해집니다. 말로 하는 논쟁을 <strong>손가락 속도로</strong> 바꾼 셈이죠.
        </p>
      </article>

      <article>
        <h2 style={h2}>② 부먹 vs 찍먹 — 탕수육 한 접시의 영원한 평행선</h2>
        <p style={meta}>음식·밈 이야기 · 읽는 데 3분</p>
        <p>
          탕수육 소스를 ‘부어 먹느냐(부먹)’ ‘찍어 먹느냐(찍먹)’는 한국 식탁의 오랜 떡밥입니다. 부먹파는 소스가 고기에 촉촉이
          배어든 맛을, 찍먹파는 바삭함을 끝까지 지키는 쾌감을 사랑합니다. 둘 다 틀리지 않았기에 논쟁은 영원히 끝나지 않습니다.
          그리고 끝나지 않기 때문에 <strong>매번 다시 꺼내도 재미있는</strong> 소재가 됩니다.
        </p>
        <p>
          이런 ‘영원한 평행선’ 떡밥의 공통점은 ① 누구나 경험이 있고 ② 정답이 없고 ③ 가볍다는 것입니다. 그래서 처음 만난 사람과도
          금방 대화가 트이고, 단톡방의 적막을 깨는 데도 그만이죠. 사소한 차이를 ‘차이’가 아니라 ‘놀이’로 바꾸는 힘입니다.
        </p>
      </article>

      <article>
        <h2 style={h2}>③ 아샷추 — 같은 단어를 다르게 알아들었던 사람들</h2>
        <p style={meta}>요즘 밈 · 읽는 데 2분</p>
        <p>
          ‘아샷추’는 본래 <strong>아이스티에 에스프레소 샷을 추가</strong>한 음료를 가리키는 말로 퍼졌습니다. 그런데 많은 사람이
          처음엔 ‘아이스 아메리카노에 샷 추가’로 알아듣곤 했죠. 같은 단어를 서로 다르게 떠올렸다는 사실 자체가 새로운 떡밥이
          되었습니다. ‘너는 뭐로 알았어?’ 한마디면 대화가 시작됩니다.
        </p>
        <p>
          이렇게 떡밥은 늘 진화합니다. 음식에서 취향으로, 취향에서 ‘오해의 순간’까지. 공통점은 변하지 않습니다 — <strong>가볍게,
          편을 갈라, 함께 웃는다.</strong> 광클대전은 매일 이런 새 떡밥을 하나씩 꺼내 60초의 놀이로 만듭니다.
        </p>
        <p style={{ marginTop: 24 }}><a href="/gwangclick/">⚡ 오늘의 떡밥, 지금 플레이하기 →</a></p>
      </article>
    </main>
  );
}
