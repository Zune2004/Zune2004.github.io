// "Ask about me": keyword retrieval (always), plus an optional local model.
// Order of answerers: Chrome built-in model (if already on the device) > WebLLM (if the visitor loads it) > written answers.
// Retrieval decides whether a question is in scope; a model only rephrases retrieved facts.

const $ = id => document.getElementById(id);
const log = $('ask-log'), form = $('ask-form'), input = $('ask-input'), modeEl = $('ask-mode');
const loadBtn = $('load-llm'), note = $('llm-note'), bar = $('llm-progress');

const STOP = new Set('a an the is are was were be been of to in on for and or with what whats who how does do did his he him about me tell can could you your this that it its has have there any some please'.split(' '));
const stem = w => w.replace(/(ing|ed|es|s)$/, '');
const tokens = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(stem);

let KB = null, docs = [], df = new Map(), avgLen = 0;
let engine = null;       // WebLLM engine once loaded
let nano = null;         // Chrome built-in model session
const MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const MIN_SCORE = 1.2;   // below this, the question is treated as out of scope

function index() {
  docs = KB.entries.map(e => {
    // the question keywords count double: they say what the entry is for
    const t = [...tokens(e.q), ...tokens(e.q), ...tokens(e.a)];
    const tf = new Map();
    t.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
    new Set(t).forEach(w => df.set(w, (df.get(w) || 0) + 1));
    return { e, tf, len: t.length };
  });
  avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
}

function search(q, k = 3) {
  const qt = [...new Set(tokens(q))];
  const N = docs.length, k1 = 1.4, b = 0.7;
  return docs.map(d => {
    let s = 0;
    for (const w of qt) {
      const f = d.tf.get(w);
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(w) + 0.5) / (df.get(w) + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avgLen));
    }
    return { e: d.e, s };
  }).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
}

function add(role, text, extra = {}) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  if (extra.trace) { const t = document.createElement('span'); t.className = 'trace'; t.textContent = extra.trace; div.appendChild(t); }
  const body = document.createElement('span');
  body.textContent = text;
  div.appendChild(body);
  if (extra.src) {
    const s = document.createElement('span');
    s.className = 'src';
    s.textContent = `source: ${extra.src}`;
    if (extra.link) { s.append(' · '); const a = document.createElement('a'); a.href = extra.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'open ↗'; s.appendChild(a); }
    div.appendChild(s);
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return body;
}

function systemPrompt(hits) {
  return 'You answer questions about Mohammed Zunnoon Aamir for recruiters. Use ONLY the facts below. ' +
    'Write 2-4 plain sentences in third person. If the facts do not answer the question, say so and suggest emailing ' +
    KB.contact + '. Never invent employers, numbers or dates.\n\nFACTS:\n' +
    hits.map((h, i) => `[${i + 1}] ${h.e.a}`).join('\n');
}

async function answer(q) {
  add('me', q);
  const hits = search(q);
  const top = hits[0];
  if (!top || top.s < MIN_SCORE) {
    add('bot', `I only answer questions about Zunnoon's work, projects and skills. Try one of the suggestions below, or email ${KB.contact}.`,
      { trace: `retrieval: no match above threshold → declined (no model called)` });
    return;
  }
  const trace = `retrieved: ${hits.map(h => h.e.id).join(', ')} (top score ${top.s.toFixed(1)})`;
  const srcInfo = { src: top.e.src, link: top.e.link };

  if (nano || engine) {
    const who = nano ? 'Chrome built-in model' : 'Qwen2.5-0.5B on your device';
    const out = add('bot', '…', { trace: `${trace} → ${who}`, ...srcInfo });
    try {
      if (nano) {
        const s = await nano.clone();
        out.textContent = await s.prompt(`${systemPrompt(hits)}\n\nQUESTION: ${q}`);
        s.destroy?.();
      } else {
        const chunks = await engine.chat.completions.create({
          messages: [{ role: 'system', content: systemPrompt(hits) }, { role: 'user', content: q }],
          temperature: 0.2, max_tokens: 220, stream: true,
        });
        out.textContent = '';
        for await (const c of chunks) out.textContent += c.choices[0]?.delta?.content || '';
        log.scrollTop = log.scrollHeight;
      }
      if (!out.textContent.trim()) out.textContent = top.e.a;
    } catch (err) {
      out.textContent = top.e.a;
    }
    return;
  }
  add('bot', top.e.a, { trace: `${trace} → written answer`, ...srcInfo });
}

async function tryChromeModel() {
  try {
    if (!('LanguageModel' in self)) return;
    // only use it if it's already on the device; never trigger a multi-GB download
    if (await LanguageModel.availability() !== 'available') return;
    nano = await LanguageModel.create();
    modeEl.textContent = 'mode: Chrome built-in model + retrieval';
    loadBtn.disabled = true;
    note.textContent = "Your browser's built-in AI is active, so no download is needed.";
  } catch (e) { nano = null; }
}

async function loadWebLLM() {
  if (!navigator.gpu) {
    note.textContent = "Your browser doesn't support WebGPU, so instant answers stay on. Try Chrome or Edge on a laptop.";
    loadBtn.disabled = true;
    return;
  }
  loadBtn.disabled = true;
  bar.style.display = 'block';
  note.textContent = 'Downloading the model once (it is cached for next time)…';
  try {
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    engine = await webllm.CreateMLCEngine(MODEL, {
      initProgressCallback: p => {
        bar.firstElementChild.style.width = `${Math.round((p.progress || 0) * 100)}%`;
        note.textContent = p.text?.slice(0, 90) || 'Loading…';
      },
    });
    bar.style.display = 'none';
    modeEl.textContent = 'mode: local Qwen2.5-0.5B + retrieval';
    note.textContent = 'Local model ready. Answers are generated on your device from retrieved facts.';
    add('bot', 'Local model loaded. Ask me anything about Zunnoon; I will answer only from his facts.', { trace: 'model: Qwen2.5-0.5B (WebGPU, on device)' });
  } catch (e) {
    engine = null;
    bar.style.display = 'none';
    loadBtn.disabled = false;
    note.textContent = 'Could not load the model on this device. Instant answers still work.';
  }
}

(async function init() {
  try {
    KB = await (await fetch('data/knowledge.json')).json();
  } catch (e) {
    add('bot', 'The answer index failed to load. Please email ' + 'mohammed.zunnoon.aamir.avaram@gmail.com.');
    return;
  }
  index();
  const sugg = $('ask-sugg');
  KB.suggestions.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = t;
    b.onclick = () => answer(t);
    sugg.appendChild(b);
  });
  add('bot', "Hi! I answer questions about Zunnoon's work, projects and skills. Every answer shows where it came from.",
    { trace: 'retrieval over this page · no server, no API key' });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    answer(q);
  });
  loadBtn.addEventListener('click', loadWebLLM);
  tryChromeModel();
})();
