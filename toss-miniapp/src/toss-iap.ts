// 토스 인앱 결제(IAP) 브리지 — 바닐라 냉비서(js/toss.js tossPurchase)가 쓸 수 있게
//   window.__tossIAP { supported, purchase } 로 노출한다.
//
// ⚠ TODO(확정 필요): 공식 "인앱 결제" 개발 문서의 정확한 API명·파라미터로 확정할 것.
//   지금은 SDK 네임스페이스에서 알려진 후보명을 안전하게 탐색(probe)한다 — 없으면 supported()=false
//   → 앱은 "결제 오픈 준비 중"을 표시하므로 잘못 결제될 일은 없다(fail-safe).
//   콘솔에서 인앱 상품(상품 ID: premium30, 공급가 3,900원)을 등록해야 실제 결제가 뜬다.
import * as AIT from '@apps-in-toss/web-framework';

declare global {
  interface Window {
    __tossIAP?: {
      supported: () => boolean;
      purchase: (productId: string) => Promise<boolean>;
    };
  }
}

const A: any = AIT as any;
const IAP: any = A.IAP || A.InAppPurchase || A.iap || null;

// 결제 요청 함수 후보 — SDK 버전에 따라 이름이 다를 수 있어 순서대로 탐색.
function resolveBuyFn(): ((opts: any) => any) | null {
  const cands = [
    IAP && IAP.requestPurchase,
    IAP && IAP.createOneTimePurchase,
    IAP && IAP.purchase,
    A.createOneTimePurchase,
    A.requestPurchase,
    A.purchaseProduct,
  ];
  for (const f of cands) if (typeof f === 'function') return f;
  return null;
}

function supported(): boolean {
  const f = resolveBuyFn();
  if (!f) return false;
  try {
    const is = (f as any).isSupported;
    if (typeof is === 'function') return !!is();
    return true;
  } catch { return true; }
}

// 결제 1회. true=결제 완료 / false=취소·미지원 / throw=오류(호출측 토스트).
//   콜백형({onEvent,onError})과 Promise형 둘 다 수용.
function purchase(productId: string): Promise<boolean> {
  const f = resolveBuyFn();
  if (!f) return Promise.resolve(false);
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    const done = (v: boolean) => { if (!settled) { settled = true; resolve(v); } };
    const fail = (e: unknown) => { if (!settled) { settled = true; reject(e instanceof Error ? e : new Error(String(e))); } };
    try {
      const ret = f({
        options: { productId },
        productId, // 평면 파라미터형 SDK 대비
        onEvent: (e: { type?: string; status?: string }) => {
          const t = (e && (e.type || e.status) || '').toLowerCase();
          if (/success|purchased|complete/.test(t)) done(true);
          else if (/cancel|dismiss|fail/.test(t)) done(false);
        },
        onError: (e: unknown) => fail(e),
      });
      if (ret && typeof ret.then === 'function') {
        ret.then((r: any) => {
          if (settled) return;
          const t = String((r && (r.status || r.result || r.state)) || r || '').toLowerCase();
          done(r === true || /success|purchased|complete/.test(t));
        }, fail);
      }
      // 콜백만 쓰는 SDK면 onEvent/onError가 결론을 낸다.
    } catch (e) { fail(e); }
  });
}

window.__tossIAP = { supported, purchase };

export {};
