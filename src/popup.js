import { getSelectionFromPage, cleanedText, escapeHTML } from "./utils.js";

const $ = (s)=>document.querySelector(s);
const tabs = document.querySelectorAll(".tab");
const out = $("#out"); const input = $("#input"); const runBtn=$("#run");
const stopBtn=$("#stop"); const copyBtn=$("#copy"); const useSel=$("#use-selection");
const count=$("#count"); const dlBtn=$("#download"); const lang=$("#lang");
const err=$("#error"); const info=$("#info"); const spinner=$("#spinner");
const aiStatus=$("#ai-status"); const connDot=$("#conn-dot"); const connLabel=$("#conn-label");
const live=$("#live-badge");
const quizControls = $("#quiz-controls"); const translateControls=$("#translate-controls");

let activeTab = "summarize";
input.addEventListener("input", ()=>{ try{ count.textContent = String((input.value||"").length); }catch{} });

// --- Lightweight safe Markdown renderer for nicer summaries ---
function __sb_escapeAll(s=""){
  return s.replace(/[&<>\"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}
function __sb_renderMarkdown(md=""){
  const lines = (md||"").split(/\r?\n/);
  let html = "", inUL=false, inOL=false;
  const flush=()=>{ if(inUL){html+="</ul>";inUL=false;} if(inOL){html+="</ol>";inOL=false;} };
  const inline=(t="")=>{
    let s = __sb_escapeAll(t);
    s = s.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
    s = s.replace(/\*(.+?)\*/g,"<em>$1</em>");
    s = s.replace(/`([^`]+)`/g,"<code>$1</code>");
    return s;
  };
  for (let raw of lines){
    const line = raw.replace(/\s+$/,"");
    if (!line.trim()){ flush(); html += "<br/>"; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h){ flush(); const lvl=h[1].length; html += `<h${lvl}>${inline(h[2])}</h${lvl}>`; continue; }
    if (/^[-*]\s+/.test(line)){ if(!inUL){flush(); html+="<ul>"; inUL=true;} html+=`<li>${inline(line.replace(/^[-*]\s+/,""))}</li>`; continue; }
    if (/^\d+\.\s+/.test(line)){ if(!inOL){flush(); html+="<ol>"; inOL=true;} html+=`<li>${inline(line.replace(/^\d+\.\s+/,""))}</li>`; continue; }
    flush(); html += `<p>${inline(line)}</p>`;
  }
  flush();
  return html;
}

let promptSession = null; // LanguageModel session cache
let lastArtifact = { md: '', text: '', title: 'Study Buddy' };
let currentSummaryCancel = null; // cancel function for streaming

function showSpinner(v){ spinner.classList.toggle("hidden", !v); spinner.setAttribute("aria-hidden", v ? "false" : "true"); }
function showErr(msg=""){ err.textContent=msg; err.classList.toggle("hidden", !msg); }
function showInfo(msg=""){ info.textContent=msg; info.classList.toggle("hidden", !msg); }
function letters(){ return ["A","B","C","D","E","F"]; }
function renderQuizMarkdown(data){
  try{
    const L = letters();
    return (data.questions||[]).map((q,i)=>{
      const choices = (q.choices||[]).map((c,idx)=>`  - ${L[idx]||String(idx+1)}. ${c}`).join("\n");
      const ans = L[q.answerIndex]||"?";
      const ex = q.explanation ? ` — ${q.explanation}` : "";
      return `### Q${i+1}. ${q.q}\n${choices}\n\n**Answer:** ${ans}${ex}`;
    }).join("\n\n");
  } catch { return String(data||""); }
}

function renderQuizHTML(data){
  if (!data || !Array.isArray(data.questions)) {
    const txt = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return `<pre>${escapeHTML(txt)}</pre>`;
  }
  const L = letters();
  return data.questions.map((q,i)=>{
    const choices = (q.choices||[]).map((c,idx)=>`
      <li class="choice ${idx === q.answerIndex ? "correct" : ""}">
        <span class="label">${L[idx]||String(idx+1)}.</span>
        <span>${escapeHTML(c)}</span>
      </li>
    `).join("");
    const ans = L[q.answerIndex] || "?";
    const ex  = q.explanation ? ` — ${escapeHTML(q.explanation)}` : "";
    return `<section class="qa">
      <div class="q">Q${i+1}. ${escapeHTML(q.q||"")}</div>
      <ol class="choices">${choices}</ol>
      <div class="ex">Answer: ${ans}${ex}</div>
    </section>`;
  }).join("");
}

async function checkAIStatus(){
  try {
    const parts = [];
    if ("LanguageModel" in self) {
      parts.push("Prompt API");
      const a = await LanguageModel.availability();
      parts.push(`(${a})`);
    }
    if ("Summarizer" in self) {
      const a = await Summarizer.availability();
      parts.push(`Summarizer(${a})`);
    }
    if ("Translator" in self) {
      const a = await Translator.availability({sourceLanguage: "en", targetLanguage: "hi"});
      parts.push(`Translator(${a})`);
    }
    if ("Rewriter" in self) {
      const a = await Rewriter.availability();
      parts.push(`Rewriter(${a})`);
    }
    aiStatus.textContent = parts.join(" · ") || "APIs unavailable";
    const ok = parts.some(p=>/available|readily/i.test(p));
    connDot.classList.toggle("online", ok); connDot.classList.toggle("offline", !ok);
    connLabel.textContent = ok ? "Ready" : "Unavailable";
  } catch (e) {
    aiStatus.textContent = "Error checking availability";
    connDot.classList.remove("online"); connDot.classList.add("offline");
    connLabel.textContent = "Unavailable";
  }
}


function __sb_download(filename, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function exportMarkdown(){
  let md = (lastArtifact && lastArtifact.md) || "";
  if (!md) {
    const raw = out.innerText || "";
    md = raw ? raw : "# Study Buddy Output\n\n(Empty)\n";
  }
  const blob = new Blob([md], {type:"text/markdown;charset=utf-8"});
  __sb_download("study-buddy.md", blob);
}
function exportPDF(){
  const html = out.innerHTML || "<p>(Empty)</p>";
  const title = (lastArtifact && lastArtifact.title) || "Study Buddy";
  const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>${__sb_escapeAll(title)}</title>
<style>
  body{font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial; padding:24px; color:#111}
  h1,h2,h3{margin:0 0 8px} p,li{margin:6px 0}
  code,pre{background:#f5f7fb;border:1px solid #e6eaf2;border-radius:6px;padding:2px 6px}
  pre{padding:10px;overflow:auto}
  .prose h1,.prose h2,.prose h3{margin:8px 0 6px}
  .qa{border:1px solid #e6eaf2;border-radius:8px;padding:8px;margin:8px 0}
  .choices{margin:6px 0 6px 18px}
</style></head>
<body>
  <h1>${__sb_escapeAll(title)}</h1>
  <div class="prose">${html}</div>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));</script>
</body></html>`;
  const blob = new Blob([page], {type:"text/html"});
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) alert("Please allow popups to export PDF.");
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
}

// --- Streaming UI helpers ---

const EXTRA_PAIRS = [
  "en:de","de:en","en:zh","zh:en","en:ar","ar:en","en:bn","bn:en",
  "en:te","te:en","en:mr","mr:en","en:pa","pa:en","en:gu","gu:en","en:kn","kn:en",
  "en:it","it:en","en:pt","pt:en","en:ru","ru:en","en:ko","ko:en","en:tr","tr:en"
];
async function populateMoreLanguageOptions(){
  try{
    const sel = document.querySelector("#lang");
    if (!sel || !("Translator" in self)) return;
    const group = document.createElement("optgroup"); group.label = "More (available on this device)";
    let added = 0;
    for (const pair of EXTRA_PAIRS){
      const [s,t] = pair.split(":");
      try {
        const avail = await Translator.availability({sourceLanguage:s, targetLanguage:t});
        if (String(avail).toLowerCase().includes("available")){
          // Avoid duplicates
          if (![...sel.options].some(o => o.value === pair)){
            const opt = document.createElement("option"); opt.value = pair; opt.textContent = `${s} → ${t}`.toUpperCase();
            group.appendChild(opt); added++;
          }
        }
      } catch {}
    }
    if (added) sel.appendChild(group);
  }catch{}
}

function beginStreamingUI(){ out?.setAttribute("aria-busy","true");
  live.classList.remove("hidden");
  runBtn.disabled = true;
  stopBtn.classList.remove("hidden");
}
function endStreamingUI(){ out?.setAttribute("aria-busy","false");
  live.classList.add("hidden");
  runBtn.disabled = false;
  stopBtn.classList.add("hidden");
  currentSummaryCancel = null;
}


async function refineToLevel(text, level){
  if (!text) return text;
  if (!level || level === "original") return text;
  const session = await getPromptSession();
  const map = {
    eli5: "Rewrite the content so a typical 5-year-old can understand. Use simple words and short sentences. Keep any lists.",
    age12: "Rewrite the content for a 12-year-old reader. Keep it accurate but simpler. Maintain bullet points if present.",
    expert: "Rewrite the content for an expert audience. Keep it precise and concise; preserve technical terms and markdown."
  };
  const instr = map[level] || map.age12;
  const prompt = [
    {role:"system", content: instr},
    {role:"user", content: text}
  ];
  const res = await session.prompt(prompt, { output: { language: 'en' } });
  return String(res||"").trim();
}

// ---- STREAMING SUMMARIZER with cancel ----
async function summarizeStreaming(text){
  if (!("Summarizer" in self)) throw new Error("Summarizer API not supported in this browser.");
  const availability = await Summarizer.availability();
  if (availability === "unavailable") throw new Error("Summarizer unavailable.");
  const summarizer = await Summarizer.create({
    type: "key-points",
    format: "markdown",
    length: "medium",
    monitor(m){ m.addEventListener("downloadprogress", e => { aiStatus.textContent = `Summarizer downloading ${(e.loaded*100).toFixed(0)}%`; }); }
  });

  const stream = await summarizer.summarizeStreaming(text);
  let acc = "", cancelled = false;
  currentSummaryCancel = async () => {
    cancelled = true;
    try { await stream?.return?.(); } catch {}
  };

  beginStreamingUI();
  try {
    for await (const chunk of stream) {
      if (cancelled) break;
      acc += chunk;
      out.innerHTML = `<div class="text prose">${__sb_renderMarkdown(acc)}</div>`;
      if (typeof compareMode !== "undefined" && compareMode) renderCompare(text, out.innerText || out.innerHTML);
    }
  } catch (e) {
    // fallback to batch on error
    const summary = await summarizer.summarize(text);
    acc = summary || acc;
    out.innerHTML = `<div class="text prose">${__sb_renderMarkdown(acc)}</div>`;
      if (typeof compareMode !== "undefined" && compareMode) renderCompare(text, out.innerText || out.innerHTML);
  } finally {
    endStreamingUI();
  }
  lastArtifact = { md: acc, text: acc, title: 'Summary' };
  saveHistory({ mode: "summarize", input: text, output: acc, ts: Date.now(), title: "Summary" });
  return { summary: acc };
}

// ---- QUIZ VIA PROMPT API ----
function quizSchema(n=5){
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: n, maxItems: n,
        items: {
          type: "object",
          properties: {
            q: { type: "string" },
            choices: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
            answerIndex: { type: "integer", minimum: 0, maximum: 5 },
            explanation: { type: "string" }
          },
          required: ["q","choices","answerIndex","explanation"]
        }
      }
    },
    required: ["questions"]
  };
}

async function getPromptSession(){
  if (promptSession) return promptSession;
  if (!("LanguageModel" in self)) throw new Error("Prompt API not supported in this browser.");
  const avail = await LanguageModel.availability();
  if (avail === "unavailable") throw new Error("Prompt API unavailable.");
  promptSession = await LanguageModel.create({ output: { language: 'en' }, 
    monitor(m){ m.addEventListener("downloadprogress", e => { aiStatus.textContent = `Model downloading ${(e.loaded*100).toFixed(0)}%`; }); }
  });
  return promptSession;
}

async function buildQuiz(text, n){
  const session = await getPromptSession();
  const system = `You are a strict exam setter. Create exactly ${n} multiple choice questions from the given passage.
Each question must have 4 options. Provide concise facts.
Return JSON only.`;

  const schema = quizSchema(n);
  const prompt = [
    {role: "system", content: system},
    {role: "user", content: `Passage:\n${text}`}
  ];

  const res = await session.prompt(prompt, { output: { language: 'en' },  responseConstraint: schema });
  let data;
  try { data = JSON.parse(res); }
  catch { data = { error: "Failed to parse JSON", raw: res }; }
  return data;
}

async function rewrite(text){
  if (!("Rewriter" in self)) throw new Error("Rewriter API not supported (enable flag or origin trial).");
  const avail = await Rewriter.availability();
  if (avail === "unavailable") throw new Error("Rewriter unavailable.");
  const rewriter = await Rewriter.create({
    tone: "as-is",
    format: "markdown",
    length: "shorter",
    monitor(m){ m.addEventListener("downloadprogress", e => { aiStatus.textContent = `Rewriter downloading ${(e.loaded*100).toFixed(0)}%`; }); }
  });
  const outText = await rewriter.rewrite(text);
  return { rewritten: outText };
}

async function translate(text, pair){
  let [src, tgt] = (pair || "auto").split(":");
  if (src === "auto") {
    if (!("LanguageDetector" in self)) throw new Error("Language Detector API not supported.");
    const detector = await LanguageDetector.create();
    const results = await detector.detect(text);
    src = results?.[0]?.detectedLanguage || "en";
  }
  if (!("Translator" in self)) throw new Error("Translator API not supported in this browser.");
  const t = await Translator.create({ sourceLanguage: src, targetLanguage: tgt || "en" });
  const outText = await t.translate(text);
  return { translation: outText };
}

// ---- events ----
chrome.runtime.onInstalled?.addListener(()=>checkAIStatus());
checkAIStatus();
populateMoreLanguageOptions();

const $all = (sel)=>Array.from(document.querySelectorAll(sel));
$all(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $all(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    activeTab = btn.dataset.tab;
    quizControls.classList.toggle("hidden", activeTab !== "quiz");
    translateControls.classList.toggle("hidden", activeTab !== "translate");
    dlBtn.classList.toggle("hidden", activeTab !== "quiz");
    showErr(""); showInfo(""); out.innerHTML="";
  });
});

useSel.addEventListener("click", async()=>{
  const sel = await getSelectionFromPage();
  if (sel) { input.value = sel; showInfo("Pulled selected text from the page."); setTimeout(()=>showInfo(""), 1200); }
  else { showInfo("No selection found on this page."); setTimeout(()=>showInfo(""), 1200); }
});

runBtn.addEventListener("click", async()=>{
  showErr(""); showInfo(""); out.innerHTML="";
  const text = cleanedText(input.value) || await getSelectionFromPage();
  if (!text) { showErr("No text selected or pasted."); return; }
  try {
    showSpinner(true);
    if (activeTab === "summarize") {
      const readLevel = document.querySelector("#read-level")?.value || "original";
      const sum = await summarizeStreaming(text);
      if (readLevel && readLevel !== "original") {
        const refined = await refineToLevel(sum.summary, readLevel);
        lastArtifact = { md: refined, text: refined, title: "Summary" };
        out.innerHTML = `<div class="text prose">${__sb_renderMarkdown(refined)}</div>`;
        if (typeof compareMode !== "undefined" && compareMode) renderCompare(text, out.innerText || out.innerHTML);
      }
    } else if (activeTab === "quiz") {
      const n = Math.max(3, Math.min(10, parseInt(count.value||"5", 10)));
      const data = await buildQuiz(text, n);
      out.innerHTML = renderQuizHTML(data);
      if (typeof compareMode !== "undefined" && compareMode) renderCompare(text, out.innerText || out.innerHTML);
      saveHistory({ mode: "quiz", input: text, output: (lastArtifact.md||""), ts: Date.now(), title: "Quiz" });
      lastArtifact = { md: `# Quiz\n\n${renderQuizMarkdown(data)}`, text: out.innerText, title: "Quiz" };
    } else if (activeTab === "rewrite") {
      const readLevel = document.querySelector("#read-level")?.value || "original";
      let data = await rewrite(text);
      if (readLevel && readLevel !== "original") {
        const refined = await refineToLevel(data.rewritten, readLevel);
        data = { rewritten: refined };
      }
      lastArtifact = { md: data.rewritten, text: data.rewritten, title: "Simplified" };
      out.innerHTML = `<div class="text prose">${__sb_renderMarkdown(data.rewritten)}</div>`;
      if (typeof compareMode !== "undefined" && compareMode) renderCompare(text, out.innerText || out.innerHTML);
      saveHistory({ mode: "rewrite", input: text, output: data.rewritten, ts: Date.now(), title: "Simplified" });
    } else if (activeTab === "translate") {
      const data = await translate(text, lang.value);
      lastArtifact = { md: data.translation, text: data.translation, title: "Translation" };
      out.innerHTML = `<div class="text">${escapeHTML(data.translation)}</div>`;
      if (typeof compareMode !== "undefined" && compareMode) renderCompare(text, out.innerText || out.innerHTML);
      saveHistory({ mode: "translate", input: text, output: data.translation, ts: Date.now(), title: "Translation" });
    }
  } catch(e){
    showErr("⚠️ " + e.message);
  } finally {
    showSpinner(false);
    checkAIStatus();
populateMoreLanguageOptions();
  }
});

stopBtn.addEventListener("click", async()=>{
  if (typeof currentSummaryCancel === "function") {
    await currentSummaryCancel();
  }
});

copyBtn.addEventListener("click", async()=>{
  const text = out.innerText || "";
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
  showInfo("Copied to clipboard."); setTimeout(()=>showInfo(""), 1100);
});

dlBtn.addEventListener("click", ()=>{
  try{
    const cards = [...document.querySelectorAll(".qa")];
    if (!cards.length) return;
    const L = letters();
    const questions = cards.map((el)=>{
      const q = el.querySelector(".q")?.innerText.replace(/^Q\\d+\\.\\s*/, "") || "";
      const li = [...el.querySelectorAll(".choice")];
      const choices = li.map(x=>x.innerText.replace(/^([A-Z])\\.\\s*/, ""));
      const correctIdx = li.findIndex(x=>x.classList.contains("correct"));
      const ex = el.querySelector(".ex")?.innerText.replace(/^Answer:\\s*[A-Z]\\s*—\\s*/, "").replace(/^Answer:\\s*[A-Z]\\s*/, "") || "";
      return { q, choices, answerIndex: Math.max(0, correctIdx), explanation: ex };
    });
    const payload = { questions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "quiz.json"; a.click();
    URL.revokeObjectURL(url);
  } catch {}
});


// ---- Export buttons ----
document.querySelector("#export-md")?.addEventListener("click", exportMarkdown);
document.querySelector("#export-pdf")?.addEventListener("click", exportPDF);

// ---- Init from context menu / side panel payload ----
async function __sb_initFromContext(){
  try{
    if (!chrome?.storage?.session) return;
    const { sb_incoming } = await chrome.storage.session.get("sb_incoming");
    if (!sb_incoming) return;
    const { text, mode, ts } = sb_incoming;
    if (!text) return;
    // stale after 2 minutes
    if (typeof ts === "number" && (Date.now() - ts) > 120000) return;
    // Prefill
    input.value = text;
    count.textContent = String(text.length);
    // Switch tab
    const target = mode || "summarize";
    const btn = document.querySelector(`.tab[data-tab="${target}"]`);
    if (btn){ btn.click(); }
    // Optionally auto-run
    try { document.querySelector("#run")?.click(); } catch {}
    // Clear once used
    try { await chrome.storage.session.remove("sb_incoming"); } catch {}
  }catch(e){ /* ignore */ }
}
document.addEventListener("DOMContentLoaded", __sb_initFromContext);


// ---- Compare view helpers ----
function tokenizeWords(s){ return (String(s||"").match(/\S+|\n/g) || []); } // words + preserve line breaks
function lcsMatrix(a, b){
  const n=a.length, m=b.length;
  const dp = Array.from({length:n+1}, ()=>Array(m+1).fill(0));
  for(let i=1;i<=n;i++){
    for(let j=1;j<=m;j++){
      if(a[i-1]===b[j-1]) dp[i][j]=dp[i-1][j-1]+1;
      else dp[i][j]=Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp;
}
function diffWords(aStr, bStr){
  const a = tokenizeWords(aStr);
  const b = tokenizeWords(bStr);
  const dp = lcsMatrix(a,b);
  let i=a.length, j=b.length;
  const outA=[], outB=[];
  while(i>0 || j>0){
    if(i>0 && j>0 && a[i-1]===b[j-1]){
      outA.push(a[i-1]); outB.push(b[j-1]); i--; j--;
    }else if(j>0 && (i===0 || dp[i][j-1]>=dp[i-1][j])){
      outA.push(""); outB.push(`<span class="diff-ins">${b[j-1]}</span>`); j--;
    }else{
      outA.push(`<span class="diff-del">${a[i-1]}</span>`); outB.push(""); i--;
    }
  }
  return { a: outA.reverse().join(" "), b: outB.reverse().join(" ") };
}
function renderCompare(originalText, resultHTML){
  const temp = document.createElement("div"); temp.innerHTML = resultHTML;
  const resultText = temp.innerText;
  const { a, b } = diffWords(originalText, resultText);
  const leftHTML = a.replace(/\n/g, "<br>");
  const rightHTML = b.replace(/\n/g, "<br>");
  out.innerHTML = `<div class="compare-grid">
    <div class="compare-col"><h3>Original</h3><div class="prose">${leftHTML}</div></div>
    <div class="compare-col"><h3>Result</h3><div class="prose">${rightHTML}</div></div>
  </div>`;
}
let compareMode = false;
document.querySelector("#compare-toggle")?.addEventListener("click", ()=>{
  compareMode = !compareMode;
  document.querySelector("#compare-toggle").classList.toggle("primary", compareMode);
  if (compareMode && lastArtifact && (lastArtifact.text || lastArtifact.md)){
    renderCompare(input.value || "", out.innerText ? out.innerText : (out.innerHTML || ""));
  } else {
    if (lastArtifact && lastArtifact.md){
      try { out.innerHTML = `<div class="text prose">${__sb_renderMarkdown(lastArtifact.md)}</div>`; } catch {}
    }
  }
});


// ---- History (chrome.storage.local) ----
const HISTORY_KEY = "sb_history";
async function saveHistory(entry){
  try{
    if (!chrome?.storage?.local) return;
    const cur = await chrome.storage.local.get(HISTORY_KEY);
    const list = Array.isArray(cur[HISTORY_KEY]) ? cur[HISTORY_KEY] : [];
    list.unshift({ ...entry, id: crypto?.randomUUID?.() || String(Date.now()) });
    while(list.length > 100) list.pop();
    await chrome.storage.local.set({ [HISTORY_KEY]: list });
  }catch(e){}
}
function itemPreview(s, n=140){
  const t = String(s||'').replace(/\s+/g,' ').trim();
  return t.length>n? (t.slice(0,n-1)+'…') : t;
}
function renderHistoryItem(it){
  const meta = new Date(it.ts||Date.now()).toLocaleString();
  const title = it.title || it.mode || 'Run';
  return `<div class="history-item" data-id="${it.id}">
    <div class="left">
      <div class="history-title">${escapeHTML(title)}</div>
      <div class="history-meta"><span class="tag">${escapeHTML(it.mode||'-')}</span> • ${escapeHTML(meta)}</div>
      <div class="history-snippet">${escapeHTML(itemPreview(it.output||it.text||''))}</div>
    </div>
    <div class="history-actions">
      <button class="btn" data-act="load">Load</button>
      <button class="btn ghost" data-act="copy">Copy</button>
    </div>
  </div>`;
}
async function loadHistory(){
  try{
    const listEl = document.querySelector("#history-list");
    if (!listEl) return;
    const cur = await chrome.storage.local.get(HISTORY_KEY);
    const list = Array.isArray(cur[HISTORY_KEY]) ? cur[HISTORY_KEY] : [];
    if (!list.length){ listEl.innerHTML = '<div class="muted">No history yet. Run a task to add entries.</div>'; return; }
    listEl.innerHTML = list.map(renderHistoryItem).join('');
  }catch(e){}
}
document.querySelector("#history-refresh")?.addEventListener("click", loadHistory);
document.querySelector("#history-export")?.addEventListener("click", async()=>{
  try{
    const cur = await chrome.storage.local.get(HISTORY_KEY);
    const blob = new Blob([JSON.stringify(cur[HISTORY_KEY]||[], null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="study-buddy-history.json"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){}
});
document.querySelector("#history-clear")?.addEventListener("click", async()=>{
  if (!confirm("Clear all history?")) return;
  try{ await chrome.storage.local.remove(HISTORY_KEY); await loadHistory(); }catch(e){}
});
document.addEventListener("click", async (ev)=>{
  const btn = ev.target.closest(".history-item .btn"); if (!btn) return;
  const itemEl = ev.target.closest(".history-item"); if (!itemEl) return;
  const id = itemEl.getAttribute("data-id"); if (!id) return;
  const cur = await chrome.storage.local.get(HISTORY_KEY);
  const list = Array.isArray(cur[HISTORY_KEY]) ? cur[HISTORY_KEY] : [];
  const it = list.find(x=>x.id===id); if (!it) return;
  const act = btn.getAttribute("data-act");
  if (act==="load"){
    try {
      input.value = it.input || ""; count.textContent = String((input.value||'').length);
      const btnTab = document.querySelector(`.tab[data-tab="${it.mode||'summarize'}"]`);
      if (btnTab){ btnTab.click(); }
      out.innerHTML = `<div class="text prose">${__sb_renderMarkdown(it.output||'')}</div>`;
      lastArtifact = { md: it.output||'', text: it.output||'', title: it.title||it.mode||'Run' };
    } catch {}
  } else if (act==="copy"){
    try{ await navigator.clipboard.writeText(it.output||''); }catch{}
  }
});
function toggleHistoryTab(isActive){
  document.querySelector("#history-view")?.classList.toggle("hidden", !isActive);
  document.querySelector(".output")?.classList.toggle("hidden", isActive);
}
// Hook tabs to show history panel
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const isHistory = btn.dataset.tab === "history";
    toggleHistoryTab(isHistory);
    if (isHistory) loadHistory();
  });
});


// ---- Flashcards & Cloze generation + export ----
function __sb_csvEscape(s=""){
  if (s == null) return "";
  const needs = /[",\n]/.test(s);
  let out = String(s).replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}
function __sb_toCSV(rows){
  return rows.map(r => r.map(__sb_csvEscape).join(",")).join("\n");
}
function __sb_cardsFromQuizDOM(){
  const cards = [];
  const qa = [...document.querySelectorAll(".qa")];
  const L = letters();
  qa.forEach((el, idx)=>{
    const q = el.querySelector(".q")?.innerText.replace(/^Q\d+\.\s*/, "") || "";
    const li = [...el.querySelectorAll(".choice")];
    const aIdx = li.findIndex(x=>x.classList.contains("correct"));
    const ans = aIdx>=0 ? (li[aIdx]?.innerText.replace(/^([A-Z])\.\s*/, "") || "") : "";
    const ex = el.querySelector(".ex")?.innerText.replace(/^Answer:\s*[A-Z]\s*—\s*/, "").replace(/^Answer:\s*[A-Z]\s*/, "") || "";
    const back = ex ? `${ans}\n\n${ex}` : ans;
    if (q && back) cards.push({ front: q, back });
  });
  return cards;
}
async function __sb_generateCardsFromText(text, n=10){
  try{
    const session = await getPromptSession();
    const schema = {
      type: "object",
      properties: {
        cards: {
          type: "array", minItems: 4, maxItems: n,
          items: { type: "object", properties: { front:{type:"string"}, back:{type:"string"} }, required:["front","back"] }
        },
        cloze: {
          type: "array", minItems: 4, maxItems: n,
          items: { type: "object", properties: { cloze:{type:"string"}, answer:{type:"string"} }, required:["cloze","answer"] }
        }
      },
      required: ["cards","cloze"]
    };
    const prompt = [
      { role: "system", content: "You generate compact study flashcards and cloze deletions." },
      { role: "user", content: `From the text below, produce up to ${n} Q&A flashcards and up to ${n} cloze deletions (with {{...}} around the hidden phrase). Keep answers short, specific. Text:\n\n${text}` }
    ];
    const res = await session.prompt(prompt, { responseConstraint: schema, output: { language: "en" } });
    let data; try { data = JSON.parse(res); } catch { data = null; }
    if (data && (Array.isArray(data.cards) || Array.isArray(data.cloze))) return data;
  }catch(e){ /* fall through */ }
  // Fallback heuristic: split sentences and blank a key term (longest word) for cloze; create Q&A from colon bullets
  const sentences = String(text||"").split(/(?<=[\.!?])\s+/).filter(Boolean).slice(0,8);
  const cloze = sentences.map(s=>{
    const words = s.split(/\s+/);
    let idx = -1, max = 0;
    for (let i=0;i<words.length;i++){ const w=words[i].replace(/[^\w]/g,""); if (w.length>max) { max=w.length; idx=i;} }
    if (idx>=0){ const answer = words[idx].replace(/[^\w-]/g,""); words[idx] = `{{c1::${answer}}}`; return { cloze: words.join(" "), answer }; }
    return null;
  }).filter(Boolean);
  const cards = [];
  String(text||"").split(/\r?\n/).forEach(line=>{
    const m = /^[-*]\s*(.+?):\s*(.+)$/.exec(line);
    if (m) cards.push({ front: m[1], back: m[2] });
  });
  return { cards, cloze };
}
async function __sb_gatherCards(){
  // Prefer quiz DOM if present and active
  if (activeTab === "quiz" && document.querySelectorAll(".qa").length){
    const quizCards = __sb_cardsFromQuizDOM();
    if (quizCards.length) return { type:"quiz", cards:quizCards, cloze:[] };
  }
  // Else derive from current text / last artifact
  const base = cleanedText(input.value) || (lastArtifact.md || out.innerText || "");
  if (!base.trim()) return { type:"none", cards:[], cloze:[] };
  const data = await __sb_generateCardsFromText(base, 10);
  const cards = (data?.cards || []).map(x=>({front:x.front, back:x.back}));
  const cloze = (data?.cloze || []).map(x=>({front:x.cloze, back:x.answer}));
  return { type:"generated", cards, cloze };
}
async function exportCardsMarkdown(){
  const { cards, cloze } = await __sb_gatherCards();
  if ((!cards || !cards.length) && (!cloze || !cloze.length)){
    showInfo("No flashcards to export."); setTimeout(()=>showInfo(""),1200); return;
  }
  let md = "# Flashcards\n\n";
  if (cards?.length){
    md += cards.map(c=>`**Q:** ${c.front}\n\n**A:** ${c.back}`).join("\n\n---\n\n");
    md += "\n\n";
  }
  if (cloze?.length){
    md += "## Cloze\n\n";
    md += cloze.map(c=>`- ${c.front}  \n  **Answer:** ${c.back}`).join("\n");
    md += "\n";
  }
  const blob = new Blob([md], {type:"text/markdown;charset=utf-8"});
  __sb_download("study-buddy-cards.md", blob);
}
async function exportCardsCSV(){
  const { cards, cloze } = await __sb_gatherCards();
  if ((!cards || !cards.length) && (!cloze || !cloze.length)){
    showInfo("No flashcards to export."); setTimeout(()=>showInfo(""),1200); return;
  }
  const rows = [["Type","Front","Back"]];
  (cards||[]).forEach(c=>rows.push(["qa", c.front, c.back]));
  (cloze||[]).forEach(c=>rows.push(["cloze", c.front, c.back]));
  const csv = __sb_toCSV(rows);
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  __sb_download("study-buddy-cards.csv", blob);
}
document.querySelector("#cards-md")?.addEventListener("click", ()=>{ exportCardsMarkdown(); });
document.querySelector("#cards-csv")?.addEventListener("click", ()=>{ exportCardsCSV(); });


// ---- Accessibility: Dyslexia-friendly mode toggle ----
const dysSwitch = document.querySelector("#a11y-dyslexia");
function applyA11yDyslexia(on){
  try {
    document.documentElement.setAttribute("data-access", on ? "dyslexia" : "");
    if (dysSwitch){ dysSwitch.checked = !!on; dysSwitch.setAttribute("aria-checked", on ? "true" : "false"); }
  } catch {}
}
async function loadA11yPrefs(){
  try{
    const { sb_a11y_dyslexia } = await chrome.storage.local.get("sb_a11y_dyslexia");
    applyA11yDyslexia(!!sb_a11y_dyslexia);
  }catch{}
}
dysSwitch?.addEventListener("change", async (e)=>{
  const on = !!e.target.checked;
  applyA11yDyslexia(on);
  try{ await chrome.storage.local.set({ sb_a11y_dyslexia: on }); }catch{}
});
document.addEventListener("DOMContentLoaded", loadA11yPrefs);


// ---- ARIA: tabs keyboard & states ----
const tablist = document.querySelector(".tabs");
function setActiveTabAria(activeBtn){
  document.querySelectorAll('.tabs [role="tab"]').forEach((b)=>{
    const isActive = (b === activeBtn);
    b.setAttribute("aria-selected", isActive ? "true" : "false");
    b.setAttribute("tabindex", isActive ? "0" : "-1");
  });
}
tablist?.addEventListener("keydown", (e)=>{
  const keys = ["ArrowLeft","ArrowRight","Home","End"];
  if (!keys.includes(e.key)) return;
  const tabs = Array.from(document.querySelectorAll('.tabs [role="tab"]'));
  const idx = tabs.indexOf(document.activeElement);
  if (idx === -1) return;
  e.preventDefault();
  let next = idx;
  if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
  if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
  if (e.key === "Home") next = 0;
  if (e.key === "End") next = tabs.length - 1;
  tabs[next].focus();
});
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=> setActiveTabAria(btn));
});
document.addEventListener("DOMContentLoaded", ()=>{
  const current = document.querySelector('.tabs [role="tab"].active') || document.querySelector('.tabs [role="tab"]');
  if (current) setActiveTabAria(current);
});
