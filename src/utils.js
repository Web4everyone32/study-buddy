export async function getSelectionFromPage() {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) return "";
    const [{ result }] = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => window.getSelection()?.toString() || ""
    });
    return (result || "").trim();
  } catch { return ""; }
}
export function cleanedText(t=""){
  return t.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}
export function escapeHTML(s=""){
  return s.replace(/[&<>\"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}
