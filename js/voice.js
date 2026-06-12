// 음성 컨트롤 — 손에 물·기름 묻은 채로 앱을 조작한다 (Web Speech API)
// 인식(STT): 크롬/안드로이드 지원, 아이폰 사파리는 미지원 → 읽어주기(TTS)만 동작
export const canListen = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let rec = null;
let wantOn = false;

/* ── 자기 목소리 에코 가드 ──
   앱이 말하는(TTS) 소리를 마이크가 다시 듣고 명령("정지" 등)으로 오인하는 것을 막는다.
   말하는 동안 + 끝나고 잔향 0.8초까지 인식 결과를 버린다. */
let speakHold = 0;
const selfTalking = () => (canSpeak && speechSynthesis.speaking) || Date.now() < speakHold;

/* ── 한국어 보이스 선택 — 구글 네트워크 보이스가 가장 자연스럽다 ── */
let koVoice = null;
function pickVoice() {
  if (!canSpeak) return;
  const ko = speechSynthesis.getVoices().filter((v) => String(v.lang).replace('_', '-').toLowerCase().startsWith('ko'));
  koVoice = ko.find((v) => /google/i.test(v.name)) || ko.find((v) => !v.localService) || ko[0] || null;
}
if (canSpeak) {
  pickVoice();
  try { speechSynthesis.onvoiceschanged = pickVoice; } catch { /* ignore */ }
}

/* ── 낭독 전 정리 — 화면용 텍스트를 "사람이 읽어주는 말"로 ── */
function ttsClean(text) {
  return String(text)
    .replace(/\p{Extended_Pictographic}|️|[⏲⏰✓✔★☆]/gu, ' ')   // 이모지·장식 기호
    .replace(/(\d+)\s*[~∼]\s*(\d+)/g, '$1에서 $2')                   // 2~3분 → 2에서 3분
    .replace(/\b1\s*\/\s*2\b/g, '반')                                 // 1/2개 → 반 개
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$2분의 $1')                      // 1/4 → 4분의 1
    .replace(/(\d)\s*kg/gi, '$1킬로그램')
    .replace(/(\d)\s*g(?![a-z])/gi, '$1그램')
    .replace(/(\d)\s*ml/gi, '$1밀리리터')
    .replace(/(\d)\s*[Ll](?![a-zA-Z])/g, '$1리터')
    .replace(/(\d)\s*cm/gi, '$1센티미터')
    .replace(/[→⇒]/g, ', ')
    .replace(/[·•|]/g, ', ')
    .replace(/[*#_`~<>[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 문장 단위로 끊어 읽기 — 호흡이 자연스러워지고, 크롬의 장문 낭독 끊김 버그도 피한다
function ttsChunks(text) {
  const sents = ttsClean(text).replace(/([.!?…])\s+/g, '$1\n').split('\n').filter(Boolean);
  const out = [];
  for (const s of sents) {
    if (s.length <= 120) { out.push(s); continue; }
    let buf = '';
    for (const piece of s.split(/(?:,|，)\s*/)) {
      if (buf && (buf.length + piece.length) > 100) { out.push(buf + ','); buf = piece; }
      else buf = buf ? `${buf}, ${piece}` : piece;
    }
    if (buf) out.push(buf);
  }
  return out;
}

export function speak(text, { interrupt = true } = {}) {
  if (!canSpeak || !text) return;
  if (interrupt) speechSynthesis.cancel();
  speakHold = Date.now() + 1500; // 첫 음이 나오기 전 공백도 가드
  for (const part of ttsChunks(text)) {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = 'ko-KR';
    if (koVoice) u.voice = koVoice;
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onstart = () => { speakHold = Date.now() + 60000; };
    u.onend = () => { speakHold = Date.now() + 800; };
    u.onerror = () => { speakHold = Date.now() + 300; };
    speechSynthesis.speak(u);
  }
}
export function stopSpeak() {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  speakHold = Date.now() + 300;
}

let lastHeard = { t: '', at: 0 };
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
    if (!t) return;
    if (selfTalking()) return; // 내(TTS) 목소리는 명령이 아니다
    const now = Date.now();
    if (t === lastHeard.t && now - lastHeard.at < 1800) return; // 같은 문장 중복 전달 무시
    lastHeard = { t, at: now };
    onText(t);
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
  if (/(재생|플레이|틀어|계속)/.test(s)) return { cmd: 'play' };
  if (/(일시 ?정지|정지|멈춰|스톱|그만)/.test(s)) return { cmd: 'pause' };
  if (/재료.*(읽|알려|뭐)/.test(s)) return { cmd: 'ingredients' };
  if (/다시.*(읽|말)|단계.*(읽|알려)|지금.*(뭐|단계)/.test(s)) return { cmd: 'repeat' };
  if (/처음부터/.test(s)) return { cmd: 'restart' };
  if (/(다음|넘겨|됐어|오케이|완료)/.test(s)) return { cmd: 'next' };
  if (/(이전|아까|전 단계)/.test(s)) return { cmd: 'prev' };
  if (/(마이크|음성).*(꺼|끝|중지)/.test(s)) return { cmd: 'micoff' };
  return null;
}
