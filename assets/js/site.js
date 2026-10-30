// Kits (theme), matchday board, project shot map, take-a-shot demo. Every block checks its elements exist,
// so the same file serves index.html and ideas.html.
(function () {
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ago = iso => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${m} min ago`;
    if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
    return `${Math.round(m / 1440)} days ago`;
  };
  const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

  // ---------- kits ----------
  const btn = $('theme');
  if (btn) {
    const isDark = () => (root.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    const label = () => {
      $('kit-label').textContent = isDark() ? 'Home kit' : 'Away kit';
      $('kit-season').textContent = isDark() ? '2026/27 away kit' : '2026/27 home kit';
    };
    label();
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('theme', next);
      label();
    });
  }

  // ---------- pitch drawing (StatsBomb yards; goal at the top, svg x = pitch width, svg y = distance from goal line) ----------
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  function drawPitch(svg) {
    for (let i = 0; i < 6; i += 2) el('rect', { x: 0, y: i * 10, width: 80, height: 10, class: 'stripe' }, svg);
    el('rect', { x: 36, y: -2.4, width: 8, height: 2.4, class: 'net' }, svg);
    el('rect', { x: 0, y: 0, width: 80, height: 60, class: 'ln' }, svg);
    el('rect', { x: 18, y: 0, width: 44, height: 18, class: 'ln' }, svg);
    el('rect', { x: 30, y: 0, width: 20, height: 6, class: 'ln' }, svg);
    el('circle', { cx: 40, cy: 12, r: 0.35, fill: 'rgba(255,255,255,.8)' }, svg);
    el('path', { d: 'M 32.7 18 A 10 10 0 0 0 47.3 18', class: 'ln' }, svg);
    el('path', { d: 'M 30 60 A 10 10 0 0 1 50 60', class: 'ln' }, svg);
  }

  // ---------- shot map ----------
  const SHOTS = [
    // work (left half)
    { x: 30, d: 6, r: 2.4, goal: true, name: 'Telegram assistant', tag: 'Work · ZaryahPlus', text: 'Raya on Telegram: streamed replies, group tasks with reminders, voice notes and documents, plus a security audit. Live for ZaryahPlus users.', href: '#work' },
    { x: 20, d: 12, r: 2.3, goal: true, name: 'Finance module', tag: 'Work · ZaryahPlus', text: "Shari'ah-compliant stock screener, live prices and charts, and a portfolio simulator that refuses anything it can't verify.", href: '#work' },
    { x: 30, d: 20, r: 2.0, goal: true, name: 'Islamic finance platform', tag: 'Work · proof of concept', text: 'Built from a one-line leadership brief in under two weeks. AI assistants act only through an audited policy gateway.', href: '#work' },
    { x: 14, d: 25, r: 2.0, goal: false, name: 'WhatsApp assistant', tag: 'Work · client', text: 'Multi-tenant, owner-approved actions, tested backups. Built and load-tested; waiting on the client to go live.', href: '#work' },
    { x: 27, d: 34, r: 1.9, goal: false, name: 'Small language models', tag: 'Work · internal', text: 'Domain models for regulated fields with retrieval, fine-tuning and an automatic release check. Passed its first release gate.', href: '#work' },
    { x: 12, d: 43, r: 1.6, goal: false, name: 'Agent coordinator', tag: 'Work · internal', text: 'Server core of an on-premise multi-agent coordinator: signed requests, role-based access, encrypted backups.', href: '#work' },
    // personal (right half)
    { x: 49, d: 6, r: 2.4, goal: true, name: 'FPL bot', tag: 'Personal · live', text: "Manages my Fantasy Premier League team every hour on GitHub Actions. Beat a bot using FPL's own predictions by 201 points in a season replay.", href: '#p-fpl' },
    { x: 58, d: 12, r: 2.1, goal: true, name: 'xG Lab', tag: 'Personal · live', text: "Expected-goals model on free data that's level with StatsBomb's commercial model on three tournaments.", href: '#p-xg' },
    { x: 50, d: 18, r: 1.6, goal: true, name: 'Scout', tag: 'Personal · live', text: "Finds players with a similar statistical profile across Europe's top leagues.", href: '#p-xg' },
    { x: 63, d: 23, r: 1.8, goal: true, name: 'AI QA agent', tag: 'Personal · used at work', text: 'Writes and repairs end-to-end tests from plain English. Used to audit a company platform before release.', href: '#p-qa' },
    { x: 51, d: 29, r: 1.5, goal: true, name: 'Sovereign AI notes', tag: 'Personal · live', text: 'Turns a six-talk lecture series into illustrated study notes.', href: '#p-notes' },
    { x: 65, d: 35, r: 1.8, goal: false, name: 'RSNA knee', tag: 'Kaggle · top 13%', text: 'Medical imaging competition: 799th of 6,299 teams.', href: '#p-kaggle' },
    { x: 52, d: 42, r: 1.7, goal: false, name: 'Pokémon TCG AI', tag: 'Kaggle · top 16%', text: 'Card-game AI: 1,085th of 6,807 teams, then a self-play agent with six times faster training.', href: '#p-kaggle' },
    { x: 64, d: 49, r: 1.5, goal: false, name: 'ARC-AGI-3', tag: 'Kaggle · running', text: 'LLM agents that play interactive reasoning games.', href: '#p-kaggle' },
  ];
  const map = $('shotmap');
  if (map) {
    drawPitch(map);
    const card = $('shot-card');
    const show = (s, g) => {
      map.querySelectorAll('.shot').forEach(n => n.classList.remove('on'));
      g.classList.add('on');
      card.innerHTML = `<span class="label">${esc(s.tag)}</span><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><a href="${s.href}">${s.href === '#work' ? 'See it under Work' : 'Read the write-up'}</a>`;
    };
    SHOTS.forEach((s, i) => {
      const g = el('g', { class: `shot ${s.goal ? 'goal' : 'miss'}`, tabindex: 0, role: 'button', 'aria-label': `${s.name}, ${s.goal ? 'shipped' : 'experiment'}` }, map);
      el('circle', { cx: s.x, cy: s.d, r: s.r }, g);
      // work labels sit left of the marker and personal ones right, so the two halves never collide in the middle
      const left = s.x < 40 && s.x > 22;
      const t = el('text', { x: left ? s.x - s.r - 0.8 : s.x + s.r + 0.8, y: s.d + 0.7, 'text-anchor': left ? 'end' : 'start' }, g);
      t.textContent = s.name;
      g.addEventListener('click', () => show(s, g));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(s, g); } });
      if (i === 6) show(s, g); // open on the FPL bot
    });
  }

  // ---------- take a shot ----------
  const demo = $('demo');
  if (demo) {
    drawPitch(demo);
    let M = null, last = { x: 40, d: 12 };
    const cone = el('path', { class: 'cone' }, demo);
    const aim = el('line', { class: 'aim', x2: 40, y2: 0 }, demo);
    const ball = el('circle', { r: 1.1, class: 'ball' }, demo);
    const xgOf = (x, d, header) => {
      const dy = Math.abs(x - 40), dx = Math.max(d, 0.5), h = M.half_goal;
      let a = Math.atan2(2 * h * dx, dx * dx + dy * dy - h * h);
      if (a < 0) a += Math.PI;
      const dist = Math.hypot(dx, dy);
      const f = [dist, a, header ? 1 : 0, Math.log1p(dist)];
      const z = M.intercept + f.reduce((s, v, i) => s + v * M.coef[i], 0);
      return 1 / (1 + Math.exp(-z));
    };
    const words = p => {
      if (p >= 0.45) return 'about 1 time in 2';
      const n = Math.round(1 / p);
      return n > 200 ? 'almost never' : `about 1 time in ${n}`;
    };
    const update = () => {
      const { x, d } = last;
      const head = $('demo-head').checked;
      const p = xgOf(x, d, head);
      ball.setAttribute('cx', x); ball.setAttribute('cy', d);
      aim.setAttribute('x1', x); aim.setAttribute('y1', d);
      cone.setAttribute('d', `M ${x} ${d} L 36 0 L 44 0 Z`);
      $('demo-xg').innerHTML = `${p.toFixed(2)}<small>xG</small>`;
      const dist = Math.round(Math.hypot(Math.max(d, 0.5), Math.abs(x - 40)));
      $('demo-text').textContent = `${head ? 'A header' : 'A shot'} from ${dist} yards is scored ${words(p)}.`;
    };
    fetch('data/xg_demo.json').then(r => r.json()).then(m => {
      M = m;
      update();
      demo.addEventListener('click', e => {
        const pt = demo.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(demo.getScreenCTM().inverse());
        if (p.x < 0 || p.x > 80 || p.y < 0 || p.y > 60) return;
        last = { x: p.x, d: p.y };
        update();
      });
      $('demo-head').addEventListener('change', update);
    }).catch(() => { set('demo-text', 'The demo model failed to load. Try refreshing the page.'); });
  }

  // ---------- matchday board ----------
  if ($('board')) {
    const IST = { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false };
    fetch('data/deadline.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
      set('b-gw', `GW${d.next_gw}`);
      if (d.current_avg != null) { set('b-avg', `${d.current_avg} pts`); set('b-top', `GW${d.current_gw} · top score ${d.current_top}`); }
      const end = new Date(d.deadline).getTime();
      set('b-deadline', `${new Date(d.deadline).toLocaleString('en-IN', IST)} IST`);
      const tick = () => {
        let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
        if (!s) { set('b-count', 'LOCKED'); return; }
        const dd = Math.floor(s / 86400); s %= 86400;
        const p = n => String(n).padStart(2, '0');
        set('b-count', `${dd ? dd + 'D ' : ''}${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`);
      };
      tick(); setInterval(tick, 1000);
    }).catch(() => set('b-deadline', 'Fixture list unavailable right now.'));

    fetch('data/fpl.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
      set('b-call', `Captain · GW${d.gw} call`);
      set('b-cap', esc(d.captain));
      set('b-transfer', d.transfers.length ? d.transfers.map(x => `${esc(x.out)} → ${esc(x.in)}`).join(', ') : 'Roll it');
      set('b-chips', `Chips: ${esc(d.chips)}`);
      const res = d.accuracy.find(a => a.gw === d.gw);
      set('b-pts', res ? `${res.actual} pts` : `${d.expected} xP`);
      set('b-pred', res ? `predicted ${Math.round(res.predicted)}` : 'expected points');
      const rows = d.accuracy.map(a => `<div class="r"><span>GW${a.gw} · error ${a.mae.toFixed(2)} pts per player</span><span>XI ${Math.round(a.predicted)} → ${a.actual}</span></div>`).join('');
      const card = $('live-acc'); card.classList.add('ok'); card.querySelector('.skeleton').remove();
      card.insertAdjacentHTML('beforeend', `<div class="rows">${rows}</div><div class="meta">Points for the bot's eleven, predicted and actual, logged every gameweek. Updated ${esc(d.updated)}.</div>`);
    }).catch(() => set('b-cap', 'N/A'));

    const XG = 'https://raw.githubusercontent.com/Zune2004/football-xg-lab/main/xg/season/matches.csv';
    Promise.all([
      fetch(XG).then(r => { if (!r.ok) throw 0; return r.text(); }),
      fetch('https://api.github.com/repos/Zune2004/football-xg-lab/commits?per_page=1').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([csv, commits]) => {
      const [head, ...lines] = csv.trim().split(/\r?\n/);
      const cols = head.split(','), ix = n => cols.indexOf(n);
      const done = lines.map(l => l.split(',')).filter(c => c[ix('complete')] === '1');
      const games = done.slice(-4).reverse().map(c =>
        `<span>${esc(c[ix('home')])} <b>${c[ix('home_goals')]}–${c[ix('away_goals')]}</b> ${esc(c[ix('away')])} <span style="opacity:.7">xG ${c[ix('home_xg_lite')]}–${c[ix('away_xg_lite')]}</span></span>`).join('');
      const when = commits[0] ? `last run ${ago(commits[0].commit.author.date)}` : 'runs daily';
      set('b-ticker', `<span><b>xG pipeline</b> · ${done.length} matches · ${when}</span>${games}`);
    }).catch(() => set('b-ticker', 'xG pipeline: GitHub is unreachable right now.'));

    fetch('https://api.github.com/users/Zune2004/events/public?per_page=40').then(r => { if (!r.ok) throw 0; return r.json(); }).then(ev => {
      const seen = new Set(), items = [];
      for (const e of ev) {
        if (e.type !== 'PushEvent' && e.type !== 'CreateEvent') continue;
        if (seen.has(e.repo.name)) continue;
        seen.add(e.repo.name);
        const what = e.type === 'CreateEvent' ? `created ${e.payload.ref_type}` : `pushed to ${(e.payload.ref || '').replace('refs/heads/', '') || 'main'}`;
        items.push(`<div class="r"><span><a href="https://github.com/${esc(e.repo.name)}">${esc(e.repo.name.split('/')[1])}</a> · ${esc(what)}</span><span>${ago(e.created_at)}</span></div>`);
        if (items.length === 5) break;
      }
      if (!items.length) throw 0;
      const card = $('live-gh'); card.classList.add('ok'); card.querySelector('.skeleton').remove();
      card.insertAdjacentHTML('beforeend', `<div class="rows">${items.join('')}</div><div class="meta">Most of my work is in private company repositories.</div>`);
    }).catch(() => set('live-gh', '<h3><span class="dot"></span>Public GitHub activity</h3><div class="skeleton">GitHub limits visits per network. See github.com/Zune2004.</div>'));
  }
})();
