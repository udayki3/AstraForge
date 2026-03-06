
    const CFG_KEY = 'devops_dash_cfg_v3';
    const GH_CFG_KEY = 'devops_gh_config';

    const PALETTE = [
      '#ff007f', '#aa00ff', '#ff5500', '#00ff55', '#ff0022', '#d05000',
    ];

    // ── Teammate rows ──────────────────────────────────────────────────────────────
    function addTeammate(person) {
      const container = document.getElementById('tm-container');
      const idx = container.children.length;
      if (idx >= 5) return;
      const color = PALETTE[(idx + 1) % PALETTE.length];
      const row = document.createElement('div');
      row.className = 'tm-row';
      row.innerHTML = `
    <input type="color" class="tm-color-picker" list="tm-colors" value="${person?.color || color}" title="Pick teammate color">
    <div class="tm-fields">
      <div class="field-grid" style="margin-bottom:0">
        <div class="field">
          <label>Name</label>
          <input class="tm-name" placeholder="Teammate ${idx + 1}" value="${person?.name || ''}" oninput="validate(); this.closest('.tm-row').classList.remove('valid','invalid');">
        </div>
        <div class="field">
          <label>Their Sync File in Repo</label>
          <input class="tm-path" placeholder="devops_roadmap_progress_p${idx + 2}.json" value="${person?.path || ''}" oninput="this.closest('.tm-row').classList.remove('valid','invalid');">
        </div>
      </div>
    </div>
    <div class="tm-actions">
      <button class="tm-action-btn tick" onclick="verifyTeammate(this)" title="Verify File in Repo">&#10003;</button>
      <button class="tm-action-btn dustbin" onclick="this.closest('.tm-row').remove();syncAddBtn();validate()" title="Remove">&#128465;</button>
    </div>
  `;
      container.appendChild(row);
      syncAddBtn();
    }

    function syncAddBtn() {
      const btn = document.getElementById('add-tm-btn');
      const count = document.getElementById('tm-container').children.length;
      btn.disabled = count >= 5;
      btn.textContent = count >= 5 ? '+ Max teammates reached (5)' : '+ Add Teammate';
    }

    // ── Validation ─────────────────────────────────────────────────────────────────
    function validate() {
      const ok = q('#f-owner').value.trim() &&
        q('#f-repo').value.trim() &&
        q('#f-token').value.trim() &&
        q('#f-myname').value.trim();
      const btn = q('#launch-btn');
      btn.classList.toggle('btn-dim', !ok);
      // Clear any lingering error highlights when user starts fixing
      ['#f-owner', '#f-repo', '#f-token', '#f-myname'].forEach(id => {
        if (q(id).value.trim()) q(id).classList.remove('field-err');
      });
    }

    // ── Launch ─────────────────────────────────────────────────────────────────────
    function launch() {
      const owner = q('#f-owner').value.trim();
      const repo = q('#f-repo').value.trim();
      const branch = q('#f-branch').value.trim() || 'main';
      const token = q('#f-token').value.trim();
      const myName = q('#f-myname').value.trim();
      const myPath = q('#f-mypath').value.trim() || 'devops_roadmap_progress.json';

      // Highlight any missing required fields and stop
      const missing = [
        ['#f-owner', owner], ['#f-repo', repo],
        ['#f-token', token], ['#f-myname', myName],
      ].filter(([, v]) => !v);
      if (missing.length) {
        missing.forEach(([id]) => q(id).classList.add('field-err'));
        q(missing[0][0]).focus();
        return;
      }

      // Build persons list
      const persons = [{ name: myName, source: 'github', path: myPath }];
      document.querySelectorAll('.tm-row').forEach((row, i) => {
        const n = row.querySelector('.tm-name').value.trim();
        const p = row.querySelector('.tm-path').value.trim();
        const c = row.querySelector('.tm-color-picker').value;
        if (n) {
          persons.push({
            name: n, source: 'github',
            path: p || `devops_roadmap_progress_p${i + 2}.json`,
            color: c
          });
        }
      });

      // Save dashboard config
      const dashCfg = { owner, repo, branch, token, persons };
      localStorage.setItem(CFG_KEY, JSON.stringify(dashCfg));

      // Save roadmap GitHub sync config
      const ghCfg = { owner, repo, branch, path: myPath, token };
      localStorage.setItem(GH_CFG_KEY, JSON.stringify(ghCfg));

      // Go to dashboard
      sessionStorage.setItem('auth_index', 'true');
      window.location.href = 'dashboard.html';
    }

    // ── Pre-fill from existing config ──────────────────────────────────────────────
    function prefill() {
      let cfg = null;
      try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { }
      if (!cfg) {
        // Try to read from roadmap's gh config (first-time migration)
        try {
          const ghCfg = JSON.parse(localStorage.getItem(GH_CFG_KEY) || 'null');
          if (ghCfg?.owner) {
            q('#f-owner').value = ghCfg.owner || '';
            q('#f-repo').value = ghCfg.repo || '';
            q('#f-branch').value = ghCfg.branch || 'main';
            q('#f-token').value = ghCfg.token || '';
            q('#f-mypath').value = ghCfg.filePath || 'devops_roadmap_progress.json';
            validate();
          }
        } catch (e) { }
        return;
      }

      // Pre-fill all fields
      q('#f-owner').value = cfg.owner || '';
      q('#f-repo').value = cfg.repo || '';
      q('#f-branch').value = cfg.branch || 'main';
      q('#f-token').value = cfg.token || '';
      const me = cfg.persons?.[0];
      if (me) {
        q('#f-myname').value = me.name || '';
        q('#f-mypath').value = me.path || 'devops_roadmap_progress.json';
      }
      cfg.persons?.slice(1).forEach(p => addTeammate(p));

      // Show "already configured" banner
      if (cfg.owner && cfg.token) {
        q('#cfg-banner').classList.add('visible');
      }
      validate();
    }

    function q(sel) { return document.querySelector(sel); }

    // ── Boot ───────────────────────────────────────────────────────────────────────
    prefill();
    validate(); // Run immediately after prefill
    // Re-run after short delay to catch browser autofill (autofill doesn't fire oninput)
    setTimeout(validate, 300);

    function scrollToLaunch() {
      const btn = document.getElementById('launch-btn');
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.classList.remove('btn-highlight');
      // trigger reflow
      void btn.offsetWidth;
      btn.classList.add('btn-highlight');
      setTimeout(() => btn.classList.remove('btn-highlight'), 4500);
    }

    async function verifyTeammate(btn) {
      const row = btn.closest('.tm-row');
      const name = row.querySelector('.tm-name').value.trim();
      const path = row.querySelector('.tm-path').value.trim();
      const owner = document.getElementById('f-owner').value.trim();
      const repo = document.getElementById('f-repo').value.trim();
      const branch = document.getElementById('f-branch').value.trim() || 'main';
      const token = document.getElementById('f-token').value.trim();

      if (!name || !path || !owner || !repo || !token) {
        alert('Please fill out main repository settings and teammate fields first.');
        return;
      }

      const oldHtml = btn.innerHTML;
      btn.innerHTML = '<span style="font-size:0.6rem">...</span>';
      row.classList.remove('valid', 'invalid');

      try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`;
        const r = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
          cache: 'no-store'
        });

        if (r.ok) {
          row.classList.add('valid');
        } else {
          row.classList.add('invalid');
        }
      } catch (e) {
        row.classList.add('invalid');
      } finally {
        btn.innerHTML = oldHtml;
      }
    }

    // --- NODE BACKGROUND ---
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

    // --- MATRIX RAIN ---
    (function () {
      const canvas = document.getElementById('rain-canvas');
      const ctx = canvas.getContext('2d');
      const CHARS = ['ls', 'cd', 'pwd', 'grep', 'awk', 'sed', 'cat', 'chmod', 'sudo', 'ssh', 'bash', 'ps', 'kill', 'top', 'git', 'curl', 'docker', 'kubectl', 'helm', 'ansible', 'terraform', 'jenkins', 'ci', 'cd', '/etc', '$PATH', '|', '>>', '&&', '||', '$?', '#!/bin/bash', 'exit 0', '[OK]', 'fork()', 'exec()'];
      function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
      window.addEventListener('resize', resize);
      resize();
      const COL_W = 55, FONT_SZ = 16, ROW_H = 22, SPEED_MS = 22;
      const cols = [];
      function initCols() {
        const n = Math.ceil(canvas.width / COL_W);
        cols.length = 0;
        for (let i = 0; i < n; i++) cols.push({ x: i * COL_W + Math.random() * 20, y: Math.random() * -canvas.height, speed: 1.0 + Math.random() * 2.2, chars: [], len: 5 + Math.floor(Math.random() * 10) });
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
            ctx.fillStyle = isHead ? `rgba(0,220,120,${alpha * 1.65})` : `rgba(0,165,75,${alpha})`;
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
  