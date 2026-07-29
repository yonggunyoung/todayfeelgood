// 오늘 기분 — 모달 접근성 공통 헬퍼.
// role=dialog/aria-modal, 포커스 트랩, Esc 닫기, 배경 스크롤 잠금, 포커스 복원을 한곳에서.
// openDialog(el, {label, onClose, initialFocus}) → { release, close, refocus }
//  · onClose 가 주어지면 Esc 로 닫힌다(close() 호출 = release + onClose).
//  · release() 는 dom 정리 없이 a11y 상태만 되돌린다(직접 ov.remove() 하는 호출부용).
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let openCount = 0;

export function openDialog(el, { label, onClose, initialFocus } = {}) {
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (label) el.setAttribute('aria-label', label);
  const prevFocus = document.activeElement;
  openCount += 1;
  document.documentElement.classList.add('no-scroll');

  const visibleFocusables = () =>
    Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);

  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (onClose) { e.preventDefault(); close(); }
    } else if (e.key === 'Tab') {
      const f = visibleFocusables();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  };
  el.addEventListener('keydown', onKey);

  let released = false;
  function release() {
    if (released) return; released = true;
    el.removeEventListener('keydown', onKey);
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.documentElement.classList.remove('no-scroll');
    if (prevFocus && typeof prevFocus.focus === 'function') { try { prevFocus.focus(); } catch (e) { /* 사라진 노드 */ } }
  }
  function close() { release(); if (onClose) onClose(); }
  const refocus = () => requestAnimationFrame(() => {
    const t = (typeof initialFocus === 'function' ? initialFocus() : null) || visibleFocusables()[0] || el;
    if (t && typeof t.focus === 'function') { try { t.focus(); } catch (e) { /* noop */ } }
  });

  refocus();
  return { release, close, refocus };
}
