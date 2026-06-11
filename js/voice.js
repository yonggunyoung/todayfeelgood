// 음성 컨트롤 — 손에 물·기름 묻은 채로 앱을 조작한다 (Web Speech API)
// 인식(STT): 크롬/안드로이드 지원, 아이폰 사파리는 미지원 → 읽어주기(TTS)만 동작
export const canListen = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let rec = null;
let wantOn = false;

export function speak(text, { interrupt = true } = {}) {
  if (!canSpeak || !text) return;
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 1.04;
  speechSynthesis.speak(u);
}
export function stopSpeak() { if (canSpeak) speechSynthesis.cancel(); }

export function startListen(onText, onState) {
  if (!canListen) return false;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  rec = new SR();
  rec.lang = 'ko-KR';
  rec.continuous = true;
  rec.interimResults = false;
  wantOn = true;
  rec.onresult = (e) => {
    const t = e.results[e.results.length - 1][0].transcript.trim();
    if (t) onText(t);
  };
  rec.onend = () => { if (wantOn) { try { rec.start(); } catch { /* 재시작 경합 무시 */ } } else onState?.(false); };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wantOn = false;
      onState?.(false, 'denied');
    }
  };
  try { rec.start(); } catch { return false; }
  onState?.(true);
  return true;
}
export function stopListen() { wantOn = false; try { rec?.stop(); } catch { /* ignore */ } }
export function isListening() { return wantOn; }

/* ── 한국어 숫자 파서: "십오 초", "20초", "오 분" ── */
const KNUM = { 영: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
export function koNum(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^[0-9]+$/.test(s)) return parseInt(s, 10);
  let n = 0;
  const m = s.match(/^([일이삼사오육칠팔구]?)(십?)([일이삼사오육칠팔구]?)$/);
  if (!m) return null;
  if (m[2]) n += (m[1] ? KNUM[m[1]] : 1) * 10;
  else if (m[1]) n += KNUM[m[1]];
  if (m[3]) n += KNUM[m[3]];
  return n || null;
}

/* ── 명령 해석: 자연스러운 주방 말투 → 액션 ──
   반환: {cmd, n?} | null */
export function parseCommand(t) {
  const s = t.replace(/\s+/g, ' ').trim();
  const secM = s.match(/([0-9]+|[일이삼사오육칠팔구십]+)\s*초/);
  const minM = s.match(/([0-9]+|[일이삼사오육칠팔구십]+)\s*분/);

  if (/타이머/.test(s) && minM) return { cmd: 'timer', n: koNum(minM[1]) || 5 };
  if (/(앞으로|빨리|건너)/.test(s)) return { cmd: 'seek', n: (secM ? koNum(secM[1]) : 10) || 10 };
  if (/(뒤로|되감|다시 보여)/.test(s) && (secM || /뒤로/.test(s)) && !/뒤로 ?가기/.test(s)) {
    return { cmd: 'seek', n: -((secM ? koNum(secM[1]) : 10) || 10) };
  }
  if (/(재생|플레이|틀어)/.test(s)) return { cmd: 'play' };
  if (/(일시 ?정지|정지|멈춰|스톱|그만)/.test(s)) return { cmd: 'pause' };
  if (/재료.*(읽|알려|뭐)/.test(s)) return { cmd: 'ingredients' };
  if (/다시.*(읽|말)|단계.*(읽|알려)|지금.*(뭐|단계)/.test(s)) return { cmd: 'repeat' };
  if (/처음부터/.test(s)) return { cmd: 'restart' };
  if (/(다음|넘겨|됐어|오케이|완료)/.test(s)) return { cmd: 'next' };
  if (/(이전|아까|전 단계)/.test(s)) return { cmd: 'prev' };
  if (/(마이크|음성).*(꺼|끝|중지)/.test(s)) return { cmd: 'micoff' };
  return null;
}
