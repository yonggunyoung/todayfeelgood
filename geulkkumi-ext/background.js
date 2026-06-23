/* 글꾸미 확장 — 배경 서비스워커: 아이콘/단축키(Alt+G)로 현재 탭에만 주입(권한 최소). */
async function activate(tab) {
  if (!tab || !tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content/inserter.js", "content/mount.js"],
    });
  } catch (e) { /* chrome:// · 웹스토어 등 주입 불가 페이지는 무시 */ }
}
chrome.action.onClicked.addListener(activate);
chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "toggle-badge") chrome.tabs.query({ active: true, currentWindow: true }, (t) => activate(t[0]));
});
