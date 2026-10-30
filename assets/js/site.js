// Theme toggle and the live panel.
(function () {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  const btn = document.getElementById('theme');
  const isDark = () => (root.getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  const label = () => { btn.textContent = isDark() ? 'Light' : 'Dark'; };
  label();
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('theme', next);
    label();
  });

  // ---------- live panel ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ago = iso => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${m} min ago`;
    if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
    return `${Math.round(m / 1440)} days ago`;
  };
  const fill = (id, html, ok = true) => {
    const card = document.getElementById(id);
    card.classList.toggle('ok', ok);
    card.querySelector('.skeleton')?.remove();
    card.insertAdjacentHTML('beforeend', html);
  };
  const fail = (id, msg) => fill(id, `<div class="skeleton">${esc(msg)}</div>`, false);

  // FPL: snapshot written by scripts/update_data.py from the bot's state branch
  fetch('data/fpl.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
    const t = d.transfers.length ? d.transfers.map(x => `${esc(x.out)} → ${esc(x.in)}`).join(', ') : 'Roll the free transfer';
    fill('live-fpl', `
      <div class="rows">
        <div class="r"><span>Gameweek</span><span>GW${d.gw}</span></div>
        <div class="r"><span>Transfer</span><span>${t}</span></div>
        <div class="r"><span>Captain / vice</span><span>${esc(d.captain)} / ${esc(d.vice)}</span></div>
        <div class="r"><span>Chips</span><span>${esc(d.chips)}</span></div>
        <div class="r"><span>Expected points (XI)</span><span>${d.expected}</span></div>
      </div>
      <div class="meta">From the bot's report, updated ${esc(d.updated)}.</div>`);
    const rows = d.accuracy.map(a => `<div class="r"><span>GW${a.gw} · error ${a.mae.toFixed(2)} pts/player</span><span>XI ${Math.round(a.predicted)} → ${a.actual}</span></div>`).join('');
    fill('live-acc', `<div class="rows">${rows}</div>
      <div class="meta">Points for the recommended eleven, logged every gameweek.</div>`);
  }).catch(() => { fail('live-fpl', 'Snapshot unavailable right now.'); fail('live-acc', 'Snapshot unavailable right now.'); });

  // xG: public CSV refreshed daily by GitHub Actions in football-xg-lab
  const XG = 'https://raw.githubusercontent.com/Zune2004/football-xg-lab/main/xg/season/matches.csv';
  Promise.all([
    fetch(XG).then(r => { if (!r.ok) throw 0; return r.text(); }),
    fetch('https://api.github.com/repos/Zune2004/football-xg-lab/commits?per_page=1').then(r => r.ok ? r.json() : []).catch(() => []),
  ]).then(([csv, commits]) => {
    const [head, ...lines] = csv.trim().split(/\r?\n/);
    const cols = head.split(',');
    const ix = n => cols.indexOf(n);
    const done = lines.map(l => l.split(',')).filter(c => c[ix('complete')] === '1');
    const last = done.slice(-5).reverse();
    const rows = last.map(c => `<div class="r"><span>${esc(c[ix('home')])} ${c[ix('home_goals')]}–${c[ix('away_goals')]} ${esc(c[ix('away')])}</span><span>xG ${c[ix('home_xg_lite')]}–${c[ix('away_xg_lite')]}</span></div>`).join('');
    const when = commits[0] ? `pipeline last ran ${ago(commits[0].commit.author.date)}` : 'pipeline runs daily';
    fill('live-xg', `<div class="rows">${rows}</div><div class="meta">${done.length} matches this season, ${when}.</div>`);
  }).catch(() => fail('live-xg', 'Could not reach GitHub just now. Try the live app instead.'));

  // GitHub: public events (60 requests/hour per visitor, no key needed)
  fetch('https://api.github.com/users/Zune2004/events/public?per_page=40').then(r => { if (!r.ok) throw 0; return r.json(); }).then(ev => {
    const seen = new Set();
    const items = [];
    for (const e of ev) {
      if (e.type !== 'PushEvent' && e.type !== 'CreateEvent') continue;
      const key = e.repo.name;
      if (seen.has(key)) continue;
      seen.add(key);
      const msg = e.payload.commits?.[e.payload.commits.length - 1]?.message?.split('\n')[0] || (e.type === 'CreateEvent' ? `created ${e.payload.ref_type}` : `pushed to ${(e.payload.ref || '').replace('refs/heads/', '') || 'main'}`);
      items.push(`<div class="r"><span><a href="https://github.com/${esc(key)}" target="_blank" rel="noopener">${esc(key.split('/')[1])}</a> · ${esc(msg.slice(0, 48))}</span><span>${ago(e.created_at)}</span></div>`);
      if (items.length === 5) break;
    }
    if (!items.length) throw 0;
    fill('live-gh', `<div class="rows">${items.join('')}</div><div class="meta">Most of my work is in private company repositories.</div>`);
  }).catch(() => fail('live-gh', 'GitHub rate limit reached for your network. Visit github.com/Zune2004.'));
})();
