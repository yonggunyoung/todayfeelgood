// 토스 인앱 결제(IAP) 브리지 — 공식 문서(bedrock/framework/인앱결제/IAP) 기준 확정 구현.
//   바닐라 냉비서(js/toss.js)가 쓸 수 있게 window.__tossIAP 로 노출한다.
//   흐름: getProductItemList(상품 목록) → createOneTimePurchaseOrder(결제, processProductGrant 안에서
//        "지급"까지 성공해야 최종 성공) → 앱 재실행 시 getPendingOrders+completeProductGrant(미결 복원).
//   ※ IAP 객체는 토스앱 5.219.0 미만에서 undefined → supported()=false (fail-safe).
//   ※ processProductGrant 는 30초 안에 true 를 반환해야 함(아니면 '환불 신청' 페이지 노출) —
//     냉비서 지급은 로컬 즉시(grant 콜백)라 순간 처리됨.
import { IAP } from '@apps-in-toss/web-framework';

type Grant = (o: { orderId: string; sku: string }) => boolean | Promise<boolean>;

declare global {
  interface Window {
    __tossIAP?: {
      supported: () => boolean;
      products: () => Promise<Array<{ sku: string; displayName: string; displayAmount: string; iconUrl: string; description: string }>>;
      purchase: (sku: string, grant: Grant) => Promise<boolean>;
      restore: (grant: Grant) => Promise<number>;
    };
  }
}

function ok(): boolean {
  try { return !!(IAP && typeof IAP.createOneTimePurchaseOrder === 'function'); } catch { return false; }
}

window.__tossIAP = {
  supported: ok,

  // 콘솔에 등록된(노출 ON) 상품 목록 — sku 는 콘솔이 자동 발급하므로 여기서 받아 쓴다.
  async products() {
    if (!ok()) return [];
    try { const r = await IAP.getProductItemList(); return (r && r.products) || []; } catch { return []; }
  },

  // 결제 1회: 결제창 → 성공 시 processProductGrant(지급) → true 반환해야 최종 success.
  purchase(sku: string, grant: Grant) {
    return new Promise<boolean>((resolve, reject) => {
      if (!ok()) { resolve(false); return; }
      let settled = false;
      let cleanup: () => void = () => { /* noop */ };
      const finish = (v: boolean) => { if (!settled) { settled = true; try { cleanup(); } catch { /* noop */ } resolve(v); } };
      try {
        cleanup = IAP.createOneTimePurchaseOrder({
          options: {
            sku,
            processProductGrant: async ({ orderId }: { orderId: string }) => {
              try { const g = await grant({ orderId, sku }); return g !== false; } catch { return false; }
            },
          },
          onEvent: (e: { type: string }) => { if (e && e.type === 'success') finish(true); },
          onError: (err: unknown) => {
            if (settled) return;
            settled = true;
            try { cleanup(); } catch { /* noop */ }
            const msg = String((err as { message?: string })?.message || err || '');
            if (/cancel|취소|dismiss/i.test(msg)) { resolve(false); return; } // 사용자 취소는 오류가 아님
            reject(err instanceof Error ? err : new Error(msg || '결제에 실패했어요'));
          },
        });
      } catch (e) { settled = true; reject(e instanceof Error ? e : new Error(String(e))); }
    });
  },

  // 미결 주문 복원 — "결제됐는데 지급 못 받음"(앱 종료 등) 구제. 지급 성공 건만 완료 처리.
  async restore(grant: Grant) {
    if (!ok() || typeof IAP.getPendingOrders !== 'function') return 0;
    try {
      const r = await IAP.getPendingOrders();
      const orders = (r && r.orders) || [];
      let n = 0;
      for (const o of orders) {
        try {
          const g = await grant({ orderId: o.orderId, sku: (o as { sku?: string }).sku || '' });
          if (g !== false && typeof IAP.completeProductGrant === 'function') {
            await IAP.completeProductGrant({ params: { orderId: o.orderId } });
            n += 1;
          }
        } catch { /* 다음 주문 계속 */ }
      }
      return n;
    } catch { return 0; }
  },
};

export {};
