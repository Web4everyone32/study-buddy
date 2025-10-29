chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({ id: "sb_summarize", title: "Study Buddy: Summarize selection", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "sb_simplify",  title: "Study Buddy: Simplify selection",  contexts: ["selection"] });
    chrome.contextMenus.create({ id: "sb_translate", title: "Study Buddy: Translate selection",  contexts: ["selection"] });
  } catch(e) { console.warn("contextMenus create failed", e); }
});

async function openSidePanelForTab(tabId) {
  try {
    await chrome.sidePanel.setOptions({ tabId, path: "src/sidepanel.html", enabled: true });
    if (chrome.sidePanel.open) {
      await chrome.sidePanel.open({ tabId });
    }
  } catch (e) {
    // Fallback: open a new tab with sidepanel.html
    const url = chrome.runtime.getURL("src/sidepanel.html");
    await chrome.tabs.create({ url });
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info || !tab || !tab.id) return;
  const text = (info.selectionText || "").trim();
  if (!text) return;
  let mode = "summarize";
  if (info.menuItemId === "sb_simplify") mode = "rewrite";
  if (info.menuItemId === "sb_translate") mode = "translate";
  try {
    await chrome.storage.session.set({ sb_incoming: { text, mode, ts: Date.now() } });
  } catch (e) {}

  await openSidePanelForTab(tab.id);
});

// Optional: clicking the action icon opens the side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id) await openSidePanelForTab(tab.id);
});
