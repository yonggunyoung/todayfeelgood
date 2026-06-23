/* 글꾸미 확장 — 삽입 우선순위 체인(까다로운 에디터 대응). window.__gkInsert 전역 노출.
 * 항상 '일반 텍스트'로만 삽입(서식 오염 0), undo 보존 우선, 최후엔 클립보드 폴백. */
(function () {
  if (window.__gkInsert) return;

  function fallbackCopy(text) {
    try { navigator.clipboard.writeText(text); } catch (e) { /* noop */ }
    return false;
  }

  function insertInto(el, text) {
    if (text == null) return false;
    const editable = el && (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "INPUT");
    if (!editable) return fallbackCopy(text);
    try { el.focus({ preventScroll: true }); } catch (e) { /* noop */ }

    if (el.isContentEditable) {
      // 1) beforeinput(insertText) — Slate/DraftJS/Lexical(디스코드·X·인스타) 대응
      try {
        const ev = new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true });
        if (!el.dispatchEvent(ev)) return true; // 에디터가 처리(취소)했으면 완료
      } catch (e) { /* noop */ }
      // 2) execCommand insertText — undo 스택 보존
      try { if (document.execCommand("insertText", false, text)) return true; } catch (e) { /* noop */ }
      // 3) Range 직접 삽입 + input 디스패치
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const r = sel.getRangeAt(0); r.deleteContents();
          const n = document.createTextNode(text); r.insertNode(n);
          r.setStartAfter(n); r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
          el.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }));
          return true;
        }
      } catch (e) { /* noop */ }
      return fallbackCopy(text);
    }

    // <input>/<textarea> — React 등이 value를 후킹하므로 native setter 사용
    try {
      const start = el.selectionStart == null ? el.value.length : el.selectionStart;
      const end = el.selectionEnd == null ? el.value.length : el.selectionEnd;
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, el.value.slice(0, start) + text + el.value.slice(end));
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch (e) { return fallbackCopy(text); }
  }

  window.__gkInsert = insertInto;
})();
