
    if (!sessionStorage.getItem('auth_index')) {
      window.location.replace('index.html');
    }
  

    // ─── GUARD: require home page setup ───────────────────────────────────────────
    if (!localStorage.getItem('devops_dash_cfg_v3')) {
      window.location.replace('index.html');
    }

    // ─── CONSTANTS ────────────────────────────────────────────────────────────────
    // The localStorage key devops_roadmap.html writes to
    const ROADMAP_STORE_KEY = 'devops_all_combined_v1';

    // PHASES loaded from phases.js (shared with GitHub Actions weekly snapshot)
    const TOTAL_TASKS = PHASES.reduce((a, p) => a + p.total, 0);

    const DEFAULT_COLORS = ['#00d4ff', '#ff007f', '#aa00ff', '#ff5500', '#00ff55', '#ff0022', '#d05000'];
    function hexToRgba(hex, alpha) {
      if (!hex) hex = '#00d4ff';
      if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${isNaN(r) ? 0 : r},${isNaN(g) ? 212 : g},${isNaN(b) ? 255 : b},${alpha})`;
    }
    function getPalette(idx) {
      const person = cfg?.persons?.[idx];
      const hex = person?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
      return {
        accent: hex,
        glow: hexToRgba(hex, .45),
        bg: hexToRgba(hex, .1),
        bd: hexToRgba(hex, .22)
      };
    }

    // ─── COMMENTS ─────────────────────────────────────────────────────────────────
    const COMMENTS = {
      best: [
        "Absolutely obliterating the syllabus. The cloud bows before you. 🔥",
        "Senior DevOps engineers are taking notes on your pace. 📝",
        "The terminal fears you. kubectl genuinely respects you. 🏆",
        "Your commit history belongs in a museum of human achievement. 🏛️"
      ],
      worst: [
        "Your Kubernetes cluster has more uptime than you do. 😬",
        "Even the README has more commits today than you. 💀",
        "The loading spinner works harder than you. Consistently. 🌀",
        "Your teammate's progress is your villain origin story. 😔",
        "At this pace, Docker will be deprecated before you finish. 🫠",
        "Your progress bar is on life support. Stat. 📉",
        "sudo apt-get install motivation — package not found. 🤷",
        "Legend says your checklist is still on Day 1... 👻",
        "Even the 404 page is more active than your progress. 🕸️",
        "Terraform state has drifted — away from ambition. 🌵",
        "The course timer is still running. Your motivation, however... ⏳",
        "git blame is pointing directly at your daily output. 😅",
        "Your pipeline has more red than a London bus fleet. 🚌",
        "The DevOps gods submitted a wellness check request. 😐",
        "If procrastination were a skill, you'd have a cert already. 🎓",
        "The cron job ran. You did not. Embarrassing. ⏰",
        "Your progress is in a crash loop. kubectl describe motivation. 🔄",
        "The CI pipeline finished faster than your progress. 🐢",
        "You are the bottleneck in your own CI/CD pipeline. 🚧",
        "Error 503: Ambition Unavailable. 💤"
      ],
      mediocre: [
        "Consistent? Sure. Exciting? Not exactly. 😶",
        "Technically you're progressing. Technically. 📊",
        "Neither fast nor slow — the DevOps equivalent of /dev/null. 🗑️",
        "You showed up. That's... something, we guess. 🙂",
        "Perfectly mediocre. The bell curve salutes you. 🔔",
        "Progress: like enterprise software — functional but uninspiring. 💼",
        "Middle of the pack. Statistically the safest place to be. 🏃",
        "Not bad, not great. You are the 404 of effort. 🤖",
        "A solid, dependable, thoroughly average day. Carry on. 🚢",
        "Running, just not at production speed. 🐢"
      ],
      combined: [
        "The DevOps odyssey continues... at this collective pace. 🚀",
        "One repo. Many humans. Zero excuses. 😤",
        "Combined progress: respectable. Combined ambition: debatable. 🤔",
        "The pipeline is running. Whether anyone is watching is another question. 👀",
        "Syncing progress to GitHub and slowly to your collective brains. 🧠",
        "git commit -m 'still going' && git push origin main 💪",
        "Multiple engineers, one roadmap, several existential questions. 🤔"
      ],
    };

    function getIST() { return new Date(Date.now() + 5.5 * 3600000); }
    function dayOfYear(date) {
      const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
      const diff = date - start;
      return Math.floor(diff / 86400000);
    }
    function dayKey() {
      const ist = getIST();
      return `${ist.getUTCFullYear()}-D${String(dayOfYear(ist)).padStart(3, '0')}`;
    }
    function pick(pool, seed) { return pool[((seed % pool.length) + pool.length) % pool.length]; }

    // ─── CONFIG ───────────────────────────────────────────────────────────────────
    const CFG_KEY = 'devops_dash_cfg_v3';
    let cfg = null;
    // cfg = { owner, repo, branch, token, persons:[{name, source:'local'|'github', path?}] }

    function loadCfg() {
      try {
        cfg = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
        if (!cfg) {
          // Migrate v2
          const v2 = JSON.parse(localStorage.getItem('devops_dash_cfg_v2') || 'null');
          if (v2?.persons) {
            cfg = {
              ...v2,
              persons: v2.persons.map((p, i) => ({
                name: p.name,
                source: i === 0 ? 'local' : 'github', // assume first person = self (local)
                path: p.path,
              }))
            };
            localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
          }
        }
      } catch (e) { cfg = null; }
    }
    function persistCfg(c) { cfg = c; localStorage.setItem(CFG_KEY, JSON.stringify(c)); }

    // ─── GITHUB API ───────────────────────────────────────────────────────────────
    function ghBase() { return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/`; }
    function ghHdrs() { return { 'Authorization': `Bearer ${cfg.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }; }

    async function ghGet(path) {
      const r = await fetch(`${ghBase()}${path}?ref=${cfg.branch}&t=${Date.now()}`, { headers: ghHdrs(), cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const data = await r.json();
      const text = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
      return { sha: data.sha, content: JSON.parse(text) };
    }
    async function ghPut(path, obj, sha, msg) {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
      const body = { message: msg, content: encoded, branch: cfg.branch };
      if (sha) body.sha = sha;
      const r = await fetch(`${ghBase()}${path}`, { method: 'PUT', headers: ghHdrs(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`GitHub PUT ${r.status}`);
      return r.json();
    }

    // ─── DATA FETCHING (always from GitHub) ─────────────────────────────────────
    // Returns { state, source } or null
    async function fetchPersonData(person) {
      // Always try GitHub first — covers source:'github' and source:'local' (new behaviour)
      if (person.path) {
        try {
          const result = await ghGet(person.path);
          if (result) {
            return { state: result.content?.state || null, source: 'github', missing: false };
          }
        } catch (e) {
          console.warn('GitHub fetch failed for', person.name, ':', e.message);
        }
      }
      // Fallback: if GitHub had nothing and source was 'local', try localStorage
      // (covers users who haven't synced to GitHub yet)
      if (person.source === 'local') {
        try {
          const raw = localStorage.getItem(ROADMAP_STORE_KEY);
          if (raw) return { state: JSON.parse(raw), source: 'local-fallback', missing: false };
        } catch (e) { /* ignore */ }
      }
      return { state: null, source: person.source, missing: true };
    }

    // ─── PROGRESS PARSING ─────────────────────────────────────────────────────────
    function parseProgress(state) {
      if (!state) return { totalDone: 0, pct: 0, phases: [], currentPhase: null, phasesDone: 0, currentDay: null };
      let totalDone = 0;
      for (const key in state) {
        if (key.startsWith('_sec_')) continue;
        const d = state[key];
        if (d && typeof d === 'object') for (const i in d) { if (d[i] === true) totalDone++; }
      }
      const pct = Math.min(100, Math.round(totalDone / TOTAL_TASKS * 100));
      let phasesDone = 0, currentPhase = null, currentDay = null;
      const phases = PHASES.map(ph => {
        const complete = state['_sec_' + ph.id] === true;
        let done = 0, firstIncomplete = null;
        for (let d = ph.dayStart; d <= ph.dayEnd; d++) {
          const dk = 'day' + d;
          if (state[dk]) for (const i in state[dk]) { if (state[dk][i] === true) done++; }
          if (!firstIncomplete && !state['_sec_' + dk]) firstIncomplete = d;
        }
        const pp = complete ? 100 : Math.min(99, Math.round(done / ph.total * 100));
        if (complete) phasesDone++;
        else if (!currentPhase) {
          currentPhase = { ...ph, phasePct: pp, done, firstIncomplete };
          currentDay = firstIncomplete;
        }
        return { ...ph, done, pct: pp, complete };
      });
      if (!currentPhase) {
        const first = phases.find(p => !p.complete) || phases[phases.length - 1];
        currentPhase = { ...first, phasePct: first.pct, done: first.done, firstIncomplete: first.dayStart };
        currentDay = first.dayStart;
      }
      return { totalDone, pct, phases, currentPhase, phasesDone, currentDay };
    }

    // ─── BUILD PANEL ──────────────────────────────────────────────────────────────
    function buildPanel(pid, name, pal) {
      const el = document.createElement('div');
      el.className = 'panel';
      el.id = 'panel-' + pid;
      el.style.cssText = `--accent:${pal.accent};--accent-glow:${pal.glow};--accent-bg:${pal.bg};--accent-bd:${pal.bd}`;
      el.innerHTML = `
    <div class="panel-header">
      <div class="panel-avatar" id="av-${pid}">${name.charAt(0).toUpperCase()}</div>
      <div>
        <div class="panel-name">${name}<span class="source-badge" id="sbadge-${pid}"></span></div>
        <div class="panel-status" id="status-${pid}">Fetching…</div>
      </div>
    </div>
    <div class="panel-hero">
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 80 80">
          <circle class="ring-bg" cx="40" cy="40" r="36"/>
          <circle class="ring-fill" id="ring-${pid}" cx="40" cy="40" r="36"/>
        </svg>
      </div>
      <div style="flex:1">
        <div class="panel-big-pct" id="pct-${pid}">—</div>
        <div class="panel-big-sub" id="frac-${pid}">loading…</div>
        <div class="panel-stats">
          <div class="stat-box">
            <div class="stat-box-val" id="phdone-${pid}">—</div>
            <div class="stat-box-lbl">Phases Done</div>
          </div>
          <div class="stat-box" id="rankbox-${pid}">
            <div class="stat-box-val" id="rank-${pid}">—</div>
            <div class="stat-box-lbl">Rank</div>
          </div>
        </div>
      </div>
    </div>
    <div class="section-label">current focus</div>
    <div class="focus-card">
      <div class="focus-label">Active Phase</div>
      <div class="focus-phase" id="cphase-${pid}">Loading…</div>
    </div>
    <div class="section-label">daily verdict</div>
    <div class="comment-card">
      <div class="comment-lbl mediocre" id="clbl-${pid}">Daily Intel</div>
      <div class="comment-text" id="ctxt-${pid}">Analysing…</div>
    </div>
  `;
      return el;
    }

    // ─── RENDER PERSON ────────────────────────────────────────────────────────────
    function renderPerson(pid, prog, fetchResult) {
      const { totalDone, pct, phases, currentPhase, phasesDone } = prog;

      // Source badge
      const sb = document.getElementById('sbadge-' + pid);
      if (fetchResult.source === 'local') {
        sb.className = 'source-badge local'; sb.textContent = '📱 local';
      } else if (fetchResult.missing) {
        sb.className = 'source-badge missing'; sb.textContent = '⚠ not synced';
      } else {
        sb.className = 'source-badge github'; sb.textContent = '☁ github';
      }

      document.getElementById('pct-' + pid).textContent = pct + '%';
      document.getElementById('frac-' + pid).textContent = totalDone.toLocaleString() + ' / ~' + TOTAL_TASKS.toLocaleString() + ' tasks';
      document.getElementById('phdone-' + pid).textContent = phasesDone;
      document.getElementById('ring-' + pid).style.strokeDashoffset = 226 - (pct / 100) * 226;

      let status = 'Not started yet';
      if (pct > 0 && pct < 10) status = 'Just getting started';
      if (pct >= 10 && pct < 30) status = 'Building foundations';
      if (pct >= 30 && pct < 50) status = 'Hitting their stride';
      if (pct >= 50 && pct < 70) status = 'More than halfway!';
      if (pct >= 70 && pct < 90) status = 'Almost there 🔥';
      if (pct >= 90 && pct < 100) status = 'Final stretch!';
      if (pct === 100) status = '✓ Course complete';
      if (fetchResult.missing) status = fetchResult.source === 'local' ? 'No local progress yet — open the roadmap' : '⚠ File not found on GitHub';
      document.getElementById('status-' + pid).textContent = status;

      if (currentPhase) {
        document.getElementById('cphase-' + pid).textContent = currentPhase.label + ' · ' + currentPhase.name;
      }
    }

    // ─── COMMENTS ─────────────────────────────────────────────────────────────────
    function applyComments(results, dayNum) {
      const sorted = [...results].sort((a, b) => b.prog.pct - a.prog.pct);
      const allZero = sorted.every(r => r.prog.pct === 0);
      results.forEach((r, idx) => {
        const rank = sorted.findIndex(s => s.pid === r.pid);
        let type = 'mediocre';
        if (!allZero && results.length > 1) {
          if (rank === 0 && sorted[0].prog.pct > sorted[1].prog.pct) type = 'best';
          else if (rank === sorted.length - 1 && sorted[sorted.length - 1].prog.pct < sorted[sorted.length - 2].prog.pct) type = 'worst';
        }
        const LABELS = { best: '🏆 Daily MVP', worst: '💀 Needs Immediate Intervention', mediocre: '😐 Adequately Adequate' };
        document.getElementById('clbl-' + r.pid).textContent = LABELS[type];
        document.getElementById('clbl-' + r.pid).className = 'comment-lbl ' + type;
        document.getElementById('ctxt-' + r.pid).textContent = `"${pick(COMMENTS[type], dayNum + idx * 37)}"`;
      });
      document.getElementById('combined-quip').innerHTML =
        `<span class="quip">"${pick(COMMENTS.combined, dayNum)}"</span>`;
    }

    // ─── LEADERBOARD ─────────────────────────────────────────────────────────────
    function renderLeaderboard(results) {
      const wrap = document.getElementById('leaderboard-wrap');
      const lb = document.getElementById('leaderboard');
      if (results.length <= 1) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      lb.innerHTML = '';
      const sorted = [...results].sort((a, b) => b.prog.pct - a.prog.pct);
      sorted.forEach((r, i) => {
        const originalIdx = results.findIndex(x => x.pid === r.pid);
        const pal = getPalette(originalIdx);
        const rankCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        const row = document.createElement('div');
        row.className = 'lb-row';
        row.style.cssText = `--accent:${pal.accent};--accent-glow:${pal.glow}`;
        row.innerHTML = `
      <div class="lb-rank ${rankCls}">${i + 1}</div>
      <div class="lb-name">${r.name}</div>
      <div class="lb-track"><div class="lb-fill" style="width:${r.prog.pct}%"></div></div>
      <div class="lb-pct">${r.prog.pct}%</div>
      <span class="lb-delta flat">—</span>`;
        lb.appendChild(row);
        document.getElementById('rank-' + r.pid).textContent = '#' + (i + 1);
      });
    }

    // ─── BUILD PANELS (only when person count changes) ───────────────────────────
    let renderedPids = '';
    function buildPanels(results) {
      const sig = results.map(r => r.pid).join(',');
      if (sig === renderedPids) return;
      renderedPids = sig;
      const grid = document.getElementById('panels-grid');
      grid.innerHTML = '';
      const n = results.length;
      grid.className = 'panels-grid ' + (n === 1 ? 'cols-1' : n === 2 ? 'cols-2' : n === 3 ? 'cols-3' : 'cols-many');
      results.forEach((r, i) => grid.appendChild(buildPanel(r.pid, r.name, getPalette(i))));
      if (n === 1) {
        const rb = document.getElementById('rankbox-p0');
        if (rb) rb.style.display = 'none';
      }
    }

    // ─── WEEKLY LOG ───────────────────────────────────────────────────────────────
    async function maybeWriteWeeklyLog(results, wKey, wNum) {
      if (!cfg?.token) return;
      const ist = getIST();
      if (ist.getUTCDay() !== 1) return;
      const logPath = `logs/${wKey}.json`;
      try {
        if (await ghGet(logPath)) return;
        const prev = new Date(ist); prev.setDate(prev.getDate() - 7);
        const prevKey = `${isoWeekYear(prev)}-W${String(isoWeek(prev)).padStart(2, '0')}`;
        let prevData = {};
        try { const pl = await ghGet(`logs/${prevKey}.json`); if (pl?.content?.persons) pl.content.persons.forEach(p => { prevData[p.name] = p.pct; }); } catch (e) { }
        const sorted = [...results].sort((a, b) => b.prog.pct - a.prog.pct);
        await ghPut(logPath, {
          week: wKey, weekNumber: wNum,
          generatedAt: new Date().toISOString(),
          combined: { pct: Math.round(results.reduce((s, r) => s + r.prog.pct, 0) / results.length), totalDone: results.reduce((s, r) => s + r.prog.totalDone, 0) },
          persons: results.map(r => ({
            name: r.name, source: r.source,
            rank: sorted.findIndex(s => s.pid === r.pid) + 1,
            pct: r.prog.pct, pctDelta: prevData[r.name] != null ? r.prog.pct - prevData[r.name] : null,
            done: r.prog.totalDone, phasesDone: r.prog.phasesDone,
            currentPhase: r.prog.currentPhase ? `${r.prog.currentPhase.label} · ${r.prog.currentPhase.name}` : 'Not started',
            phaseBreakdown: r.prog.phases.map(p => ({ label: p.label, pct: p.pct, complete: p.complete })),
          })),
          verdict: { leader: sorted[0]?.name || '—', gap: sorted.length > 1 ? sorted[0].prog.pct - sorted[sorted.length - 1].prog.pct : 0, weeklyQuip: pick(COMMENTS.combined, wNum) },
        }, null, `log: weekly snapshot ${wKey}`);
        document.getElementById('log-status').innerHTML = ' · <span style="color:var(--green);font-size:.5rem">● log saved</span>';
      } catch (e) { console.warn('Log failed:', e); }
    }

    // ─── MAIN REFRESH ─────────────────────────────────────────────────────────────
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      const ist = getIST();
      const dNum = dayOfYear(ist);

      try {
        // Fetch all in parallel (local is sync-wrapped in Promise, GitHub is async)
        const fetches = await Promise.all(cfg.persons.map(p => fetchPersonData(p)));
        const results = cfg.persons.map((p, i) => ({
          pid: 'p' + i,
          name: p.name,
          source: p.source,
          prog: parseProgress(fetches[i]?.state || null),
          fetch: fetches[i],
        }));

        buildPanels(results);
        results.forEach(r => renderPerson(r.pid, r.prog, r.fetch));

        const totalDoneSum = results.reduce((s, r) => s + r.prog.totalDone, 0);
        const avgPct = Math.round(results.reduce((s, r) => s + r.prog.pct, 0) / results.length);
        document.getElementById('globalFill').style.width = avgPct + '%';
        document.getElementById('globalPct').textContent = avgPct + '%';
        document.getElementById('hdr-combined-pct').textContent = avgPct + '%';
        document.getElementById('hdr-people').textContent = results.length;
        document.getElementById('hdr-total-done').textContent = totalDoneSum.toLocaleString();

        applyComments(results, dNum);
        renderLeaderboard(results);
        document.getElementById('last-refresh').textContent = 'Last refresh: ' + new Date().toLocaleTimeString();
      } catch (e) {
        console.error(e);
        document.getElementById('combined-quip').innerHTML = `<span style="color:var(--red)">Error: ${e.message}</span>`;
        document.getElementById('last-refresh').textContent = 'Error — check settings';
      }
      refreshing = false;
    }

    function forceRefresh() {
      document.getElementById('last-refresh').textContent = 'Refreshing…';
      refresh();
    }

    // ─── NOTE: Real-time localStorage sync removed ────────────────────────────────
    // All data is now read from GitHub (no 'local' source). The storage event
    // listener is no longer needed — everyone refreshes on the 10-min GitHub cycle.

    // ─── BOOT (run once) ──────────────────────────────────────────────────────────
    let appStarted = false;
    let refreshInterval = null;

    function startApp() {
      if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
      refresh();
      refreshInterval = setInterval(refresh, 10 * 60 * 1000);
    }

    function boot() {
      loadCfg();
      if (!cfg || !cfg.persons?.length) {
        window.location.replace('index.html');
        return;
      }
      startApp();
    }

    boot();
  

    /* ══════════════════════════════════════════════════════
       1) NODE / PARTICLE NETWORK BACKGROUND
       ══════════════════════════════════════════════════════ */
    (function () {
      const canvas = document.getElementById('bg-canvas');
      const ctx = canvas.getContext('2d');
      const LABELS = ['pod', 'git', 'ci', 'cd', 'k8s', 'aws', 'api', 'dns', 'svc', 'img', 'repo', 'node', 'helm', 'oci', 'vpc', 'iam', 'acr', 'ecr', 'pvc', 'crd', 'job'];
      const CYAN = [0, 212, 255];
      const GREEN = [0, 229, 160];

      function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
      window.addEventListener('resize', resize);
      resize();

      function rnd(min, max) { return min + Math.random() * (max - min); }
      function pick2(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
      function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

      class Node {
        constructor() { this.reset(true); }
        reset(init) {
          this.x = rnd(0, canvas.width);
          this.y = init ? rnd(0, canvas.height) : (Math.random() < .5 ? -10 : canvas.height + 10);
          this.vx = rnd(-.25, .25);
          this.vy = rnd(-.18, .18);
          this.r = Math.random() < .12 ? rnd(5, 7) : rnd(2.5, 4);
          this.lbl = Math.random() < .35 ? pick2(LABELS) : null;
          this.phi = rnd(0, Math.PI * 2);
          this.col = Math.random() < .2 ? GREEN : CYAN;
        }
        update() {
          this.x += this.vx; this.y += this.vy; this.phi += .018;
          if (this.x < -20) this.x = canvas.width + 10;
          if (this.x > canvas.width + 20) this.x = -10;
          if (this.y < -20) this.y = canvas.height + 10;
          if (this.y > canvas.height + 20) this.y = -10;
        }
        draw() {
          const pulse = .75 + .25 * Math.sin(this.phi);
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.fillStyle = rgba(this.col, pulse);
          ctx.fill();
          if (this.r > 3) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r + 6, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(this.col, .35 * pulse);
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          if (this.lbl) {
            ctx.fillStyle = rgba(this.col, .4);
            ctx.font = '11px "Space Mono", monospace';
            ctx.fillText(this.lbl, this.x + this.r + 2, this.y + 3);
          }
        }
      }

      class Packet {
        constructor(a, b) { this.a = a; this.b = b; this.t = 0; this.speed = rnd(.004, .010); }
        get done() { return this.t >= 1; }
        update() { this.t += this.speed; }
        draw() {
          const x = this.a.x + (this.b.x - this.a.x) * this.t;
          const y = this.a.y + (this.b.y - this.a.y) * this.t;
          const fade = Math.sin(this.t * Math.PI);
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(GREEN, .75 * fade);
          ctx.fill();
        }
      }

      const N_NODES = Math.min(70, Math.floor(window.innerWidth * window.innerHeight / 14000));
      const MAX_DIST = 175;
      const nodes = Array.from({ length: N_NODES }, () => new Node());
      let packets = [], frame = 0;

      function drawEdges() {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < MAX_DIST) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = rgba(CYAN, (1 - d / MAX_DIST) * .55);
              ctx.lineWidth = .6;
              ctx.stroke();
            }
          }
        }
      }

      function spawnPacket() {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        const nearby = nodes.filter(b => {
          if (b === a) return false;
          const dx = a.x - b.x, dy = a.y - b.y;
          return Math.sqrt(dx * dx + dy * dy) < MAX_DIST;
        });
        if (nearby.length) packets.push(new Packet(a, pick2(nearby)));
      }

      function animateNodes() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawEdges();
        nodes.forEach(n => { n.update(); n.draw(); });
        packets = packets.filter(p => !p.done);
        packets.forEach(p => { p.update(); p.draw(); });
        frame++;
        if (frame % 35 === 0) spawnPacket();
        requestAnimationFrame(animateNodes);
      }
      animateNodes();
    })();

    /* ══════════════════════════════════════════════════════
       2) MATRIX RAIN — balanced opacity, teal-green, tuned for dashboard
       ══════════════════════════════════════════════════════ */
    (function () {
      const canvas = document.getElementById('rain-canvas');
      const ctx = canvas.getContext('2d');

      const CHARS = [
        'ls', 'cd', 'pwd', 'grep', 'awk', 'sed', 'cat', 'chmod', 'sudo',
        'ssh', 'bash', 'ps', 'kill', 'top', 'git', 'curl', 'docker',
        'kubectl', 'helm', 'ansible', 'terraform', 'jenkins', 'ci', 'cd',
        '/etc', '$PATH', '|', '>>', '&&', '||', '$?', '#!/bin/bash',
        'exit 0', '[OK]', 'fork()', 'exec()',
      ];

      function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
      window.addEventListener('resize', resize);
      resize();

      const COL_W = 55;
      const FONT_SZ = 16;
      const ROW_H = 22;
      const SPEED_MS = 22;
      const cols = [];

      function initCols() {
        const n = Math.ceil(canvas.width / COL_W);
        cols.length = 0;
        for (let i = 0; i < n; i++) {
          cols.push({
            x: i * COL_W + Math.random() * 20,
            y: Math.random() * -canvas.height,
            speed: 1.0 + Math.random() * 2.2,
            chars: [],
            len: 5 + Math.floor(Math.random() * 10),
          });
        }
      }
      initCols();
      window.addEventListener('resize', initCols);

      function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'left';
        cols.forEach(col => {
          col.y += col.speed;
          for (let i = 0; i < col.chars.length; i++) {
            const age = col.chars.length - i;
            const alpha = Math.max(0, .55 - age * .065);
            const word = col.chars[i];
            const isHead = i === col.chars.length - 1;
            ctx.font = (isHead ? 'bold ' : '') + `${FONT_SZ}px "IBM Plex Mono", monospace`;
            ctx.fillStyle = isHead
              ? `rgba(0,220,120,${alpha * 1.65})`
              : `rgba(0,165,75,${alpha})`;
            ctx.fillText(word, col.x, col.y - age * ROW_H);
          }
          if (col.chars.length === 0 || col.y - (col.chars.length - 1) * ROW_H > ROW_H) {
            col.chars.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
            if (col.chars.length > col.len) col.chars.shift();
          }
          if (col.y - col.chars.length * ROW_H > canvas.height) {
            col.y = -20; col.chars = [];
            col.len = 5 + Math.floor(Math.random() * 10);
          }
        });
      }
      setInterval(tick, SPEED_MS);
    })();
  