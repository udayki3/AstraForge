
    if (!sessionStorage.getItem('auth_dash')) {
      window.location.replace('dashboard.html');
    }
  

    // ── GUARD: must come from home page setup ──────────────────────────────────────
    if (!localStorage.getItem('devops_dash_cfg_v3') && !localStorage.getItem('devops_gh_config')) {
      window.location.replace('index.html');
    }

    // ── STATE ─────────────────────────────────────────────────────────────────────
    const STORE_KEY = 'devops_all_combined_v1';
    const DATES_KEY = 'devops_all_combined_dates_v1';
    const OLD_KEYS = [
      'devops_p1_part1_v1',
      'devops_p2_combined_v1',
      'devops_p2_part1_v1', 'devops_p2_part2_v1', 'devops_p2_part3_v1', 'devops_p2_part4_v1'
    ];
    const OLD_DATES_KEY = 'devops_p1_part1_dates_v1';

    function migrateOldKeys() {
      let merged = {}; let found = false;
      OLD_KEYS.forEach(k => {
        try { const raw = localStorage.getItem(k); if (raw) { const d = JSON.parse(raw); Object.assign(merged, d); found = true; } } catch (e) { }
      });
      if (found && !localStorage.getItem(STORE_KEY)) {
        localStorage.setItem(STORE_KEY, JSON.stringify(merged));
        OLD_KEYS.forEach(k => localStorage.removeItem(k));
      }
      try {
        const od = localStorage.getItem(OLD_DATES_KEY);
        if (od && !localStorage.getItem(DATES_KEY)) {
          localStorage.setItem(DATES_KEY, od);
          localStorage.removeItem(OLD_DATES_KEY);
        }
      } catch (e) { }
    }

    let state = {};
    function loadState() { try { state = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { state = {}; } }
    function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { } scheduleGhSync(); }

    let dates = {};
    function loadDates() { try { dates = JSON.parse(localStorage.getItem(DATES_KEY) || '{}'); } catch (e) { dates = {}; } }
    function saveDates() { try { localStorage.setItem(DATES_KEY, JSON.stringify(dates)); } catch (e) { } scheduleGhSync(); }

    function saveDate(id, type, value) {
      if (!dates[id]) dates[id] = {};
      dates[id][type] = value;
      saveDates();
      const card = document.getElementById(id);
      if (!card) return;
      const week = card.closest('.week-block');
      const month = card.closest('.month-block');
      const phase = card.closest('.phase-block');
      if (type === 'exp') {
        if (week) updateBlockDates(week);
        if (month) updateBlockDates(month);
        if (phase) { const firstDay = phase.querySelector('.day-card'); if (firstDay === card) updateCourseStart(); updateBlockDates(phase); }
      } else if (type === 'act') { cascadeEndDate(card); }
    }

    function markDayComplete(cardId) {
      const card = document.getElementById(cardId);
      if (!card) return;
      const items = card.querySelectorAll('.task-item');
      if (!state[cardId]) state[cardId] = {};
      items.forEach((item, i) => { item.classList.add('checked'); state[cardId][i] = true; });
      const today = new Date().toISOString().slice(0, 10);
      const actInp = card.querySelector('.date-act');
      if (actInp) { actInp.value = today; actInp.classList.add('filled'); }
      saveDate(cardId, 'act', today);
      saveState();
      updateCard(card);
      updateAncestorProgress(card);
      updateStats();
    }

    function initDatePickers() {
      const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
      function makeInputs(div, id, isoDate) {
        div.innerHTML =
          '<span class="date-label">Start</span>' +
          '<input type="date" class="date-inp date-exp"' + (isoDate ? ' value="' + isoDate + '"' : '') +
          ' onclick="event.stopPropagation()"' +
          ' onchange="saveDate(\'' + id + '\',\'exp\',this.value)">' +
          '<span class="date-sep">&middot;</span>' +
          '<span class="date-label">Completed</span>' +
          '<input type="date" class="date-inp date-act"' +
          ' onclick="event.stopPropagation()"' +
          ' onchange="saveDate(\'' + id + '\',\'act\',this.value);this.classList.add(\'filled\')">' +
          '<button class="mark-all-btn" onclick="event.stopPropagation();markDayComplete(\'' + id + '\')" title="Check all tasks and set today as completed date">&#10003; Mark All Done</button>';
      }
      // Phase 1–4: already have data-expected="YYYY-MM-DD"
      document.querySelectorAll('.day-date-range[data-expected]').forEach(div => {
        const card = div.closest('.day-card');
        const id = card ? card.id : '';
        makeInputs(div, id, div.dataset.expected);
      });
      // Phase 5+: plain text "Expected: Apr 26 · Actual: ___" — parse and convert
      document.querySelectorAll('.day-date-range:not([data-expected])').forEach(div => {
        const card = div.closest('.day-card');
        if (!card) return;
        const id = card.id;
        const m = div.textContent.match(/Expected:\s*([A-Za-z]+)\s+(\d+)/);
        let isoDate = '';
        if (m) {
          const mon = MONTHS[m[1]]; const day = parseInt(m[2]);
          if (mon) {
            const year = (mon <= 2) ? 2026 : 2025;
            isoDate = year + '-' + String(mon).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            div.dataset.expected = isoDate;
          }
        }
        makeInputs(div, id, isoDate);
      });
    }

    function restoreDates() {
      document.querySelectorAll('.day-date-range[data-expected]').forEach(div => {
        const card = div.closest('.day-card');
        const id = card ? card.id : '';
        if (!dates[id]) return;
        const expInp = div.querySelector('.date-exp');
        const actInp = div.querySelector('.date-act');
        if (expInp && dates[id].exp) expInp.value = dates[id].exp;
        if (actInp && dates[id].act) { actInp.value = dates[id].act; actInp.classList.add('filled'); }
      });
    }

    function formatDate(iso) {
      if (!iso) return '?';
      const p = iso.split('-');
      const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return M[parseInt(p[1]) - 1] + ' ' + parseInt(p[2]);
    }

    function getBlockStart(block) {
      const firstDiv = block.querySelector('.day-date-range[data-expected]');
      if (!firstDiv) return '';
      const inp = firstDiv.querySelector('.date-exp');
      return (inp && inp.value) ? inp.value : (firstDiv.dataset.expected || '');
    }

    function getBlockEnd(block) {
      const divs = [...block.querySelectorAll('.day-date-range[data-expected]')];
      if (!divs.length) return '';
      const lastDiv = divs[divs.length - 1];
      const inp = lastDiv.querySelector('.date-exp');
      return (inp && inp.value) ? inp.value : (lastDiv.dataset.expected || '');
    }

    function updateBlockDates(block) {
      const s = getBlockStart(block); const e = getBlockEnd(block);
      if (!s && !e) return;
      const label = formatDate(s) + (e && e !== s ? ' – ' + formatDate(e) : '');
      if (block.classList.contains('week-block')) {
        const span = block.querySelector('.week-dates'); if (span) span.textContent = label;
      } else if (block.classList.contains('month-block')) {
        const span = block.querySelector('.month-dates'); if (span) span.textContent = label;
      } else if (block.classList.contains('phase-block')) {
        const span = block.querySelector('.ph-dates[id]');
        if (span) { const suffix = span.dataset.suffix || ''; span.textContent = formatDate(s) + ' – ' + formatDate(e) + suffix; }
      }
    }

    function updateAllBlockDates() {
      document.querySelectorAll('.week-block,.month-block,.phase-block').forEach(updateBlockDates);
    }

    function cascadeEndDate(card) {
      const week = card.closest('.week-block');
      const month = card.closest('.month-block');
      const phase = card.closest('.phase-block');
      if (week) updateBlockDates(week);
      if (month) updateBlockDates(month);
      if (phase) {
        const lastDay = phase.querySelectorAll('.day-card');
        if (lastDay.length && lastDay[lastDay.length - 1] === card) updateCourseEnd();
        updateBlockDates(phase);
      }
    }

    function updateCourseStart() {
      const firstPhase = document.querySelector('.phase-block'); if (!firstPhase) return;
      const s = getBlockStart(firstPhase);
      const el = document.getElementById('course-start-val');
      if (el && s) el.textContent = formatDate(s);
    }

    function updateCourseEnd() {
      const phases = [...document.querySelectorAll('.phase-block')]; if (!phases.length) return;
      const lastPhase = phases[phases.length - 1];
      const e = getBlockEnd(lastPhase);
      const el = document.getElementById('course-end-val');
      if (el && e) el.textContent = formatDate(e);
    }

    function autoSetCompletedDate(card) {
      const items = card.querySelectorAll('.task-item');
      const checked = card.querySelectorAll('.task-item.checked');
      if (items.length && checked.length === items.length) {
        const div = card.querySelector('.day-date-range[data-expected]');
        if (!div) return;
        const actInp = div.querySelector('.date-act');
        if (actInp && !actInp.value) {
          const today = new Date().toISOString().split('T')[0];
          actInp.value = today; actInp.classList.add('filled');
          saveDate(card.id, 'act', today);
        }
      }
    }

    function check(el) {
      const card = el.closest('.day-card');
      const id = card.id;
      const allItems = Array.from(document.querySelectorAll('.task-item'));
      const cardItems = Array.from(card.querySelectorAll('.task-item'));
      const taskIdx = cardItems.indexOf(el);
      if (el.classList.contains('checked')) {
        // Uncheck: cascade-uncheck all subsequent items in document order
        const elGlobalIdx = allItems.indexOf(el);
        const affectedCards = new Set();
        allItems.slice(elGlobalIdx).forEach(item => {
          if (item.classList.contains('checked')) {
            item.classList.remove('checked');
            const c = item.closest('.day-card');
            if (c) {
              const cid = c.id;
              const cItems = Array.from(c.querySelectorAll('.task-item'));
              if (!state[cid]) state[cid] = {};
              state[cid][cItems.indexOf(item)] = false;
              affectedCards.add(c);
            }
          }
        });
        saveState();
        affectedCards.forEach(c => { updateCard(c); updateAncestorProgress(c); });
      } else {
        // Check: enforce global sequential order
        const elGlobalIdx = allItems.indexOf(el);
        if (elGlobalIdx > 0) {
          const prevItem = allItems[elGlobalIdx - 1];
          if (!prevItem.classList.contains('checked')) {
            showLockedFeedback(el, prevItem);
            return;
          }
        }
        el.classList.add('checked');
        if (!state[id]) state[id] = {};
        state[id][taskIdx] = true;
        saveState();
        updateCard(card);
        updateAncestorProgress(card);
        autoSetCompletedDate(card);
      }
      updateStats();
    }

    function showLockedFeedback(target, prevItem) {
      target.classList.add('task-shake');
      prevItem.classList.add('task-needs-prev');
      setTimeout(() => target.classList.remove('task-shake'), 400);
      setTimeout(() => prevItem.classList.remove('task-needs-prev'), 700);
    }

    function updateCard(card) {
      if (!card) return;
      const tasks = card.querySelectorAll('.task-item');
      const done = card.querySelectorAll('.task-item.checked').length;
      const allDone = tasks.length > 0 && done === tasks.length;
      card.classList.toggle('all-done', allDone);
      const titleEl = card.querySelector('.day-title');
      if (titleEl) titleEl.classList.toggle('done-title', allDone);
      const cnt = card.querySelector('.day-check-count');
      if (cnt) cnt.textContent = done + '/' + tasks.length;
      const markBtn = card.querySelector('.mark-all-btn');
      if (markBtn) markBtn.classList.toggle('day-done', allDone);
    }

    function updateAncestorProgress(card) {
      const week = card.closest('.week-block');
      const month = card.closest('.month-block');
      const phase = card.closest('.phase-block');
      updateBlockCount(week); updateBlockCount(month);
      if (phase) updateBlockCount(phase);
    }

    function updateBlockCount(block) {
      if (!block) return;
      const tasks = block.querySelectorAll('.task-item');
      const done = block.querySelectorAll('.task-item.checked').length;
      const id = block.id;
      const cnt = document.getElementById('cnt-' + id);
      if (cnt) cnt.textContent = done + '/' + tasks.length;
      if (block.classList.contains('week-block')) {
        block.classList.toggle('week-done', tasks.length > 0 && done === tasks.length);
      }
      if (block.classList.contains('phase-block')) {
        const fillId = id.replace('phase', 'ph') + '-fill';
        const fill = document.getElementById(fillId);
        if (fill && tasks.length > 0) fill.style.width = Math.round(done / tasks.length * 100) + '%';
      }
    }

    function updateStats() {
      const allTasks = document.querySelectorAll('.task-item');
      const allDone = document.querySelectorAll('.task-item.checked').length;
      const pct = allTasks.length > 0 ? Math.round(allDone / allTasks.length * 100) : 0;
      const statDays = document.getElementById('stat-days');
      const statDone = document.getElementById('stat-done');
      const statPct = document.getElementById('stat-pct');
      const progFill = document.getElementById('prog-fill');
      if (statDays) statDays.textContent = allTasks.length;
      if (statDone) statDone.textContent = allDone;
      if (statPct) statPct.textContent = pct + '%';
      if (progFill) progFill.style.width = pct + '%';
    }

    function toggleDay(id) { const el = document.getElementById(id); if (el) el.classList.toggle('open'); }
    function toggleBlock(id) { const el = document.getElementById(id); if (el) el.classList.toggle('open'); }
    function togglePhase(id) { const el = document.getElementById(id); if (el) el.classList.toggle('open'); }

    function expandAll() {
      document.querySelectorAll('.phase-block,.month-block,.week-block,.day-card').forEach(el => el.classList.add('open'));
    }
    function collapseAll() {
      document.querySelectorAll('.phase-block,.month-block,.week-block,.day-card').forEach(el => el.classList.remove('open'));
    }

    function setFilter(btn, filter) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.day-card').forEach(card => {
        const done = card.classList.contains('all-done');
        if (filter === 'all') card.style.display = '';
        else if (filter === 'done') card.style.display = done ? '' : 'none';
        else if (filter === 'incomplete') card.style.display = done ? 'none' : '';
      });
    }

    function confirmReset() {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        state = {}; dates = {}; saveState(); saveDates();
        document.querySelectorAll('.task-item').forEach(el => el.classList.remove('checked'));
        document.querySelectorAll('.sec-btn').forEach(b => b.classList.remove('completed'));
        document.querySelectorAll('.day-card').forEach(c => {
          c.classList.remove('all-done');
          const t = c.querySelector('.day-title'); if (t) t.classList.remove('done-title');
          updateCard(c);
        });
        document.querySelectorAll('.week-block,.month-block,.phase-block').forEach(b => updateBlockCount(b));
        document.querySelectorAll('[id$="-fill"]').forEach(f => { if (f) f.style.width = '0%'; });
        document.querySelectorAll('.day-date-range[data-expected]').forEach(div => {
          const expInp = div.querySelector('.date-exp');
          const actInp = div.querySelector('.date-act');
          if (expInp) expInp.value = div.dataset.expected;
          if (actInp) { actInp.value = ''; actInp.classList.remove('filled'); }
        });
        updateAllBlockDates(); updateCourseStart(); updateCourseEnd(); updateStats();
      }
    }

    // ── SECTION COMPLETE HELPERS ──────────────────────────────────────────────────
    function getSectionSelector(section) {
      return section.classList.contains('phase-block') ? '.phase-block' :
        section.classList.contains('month-block') ? '.month-block' :
          section.classList.contains('week-block') ? '.week-block' : '.day-card';
    }
    function getSectionBtn(section) {
      const hdr = section.querySelector(':scope > .phase-hdr, :scope > .month-hdr, :scope > .week-hdr, :scope > .day-top');
      return hdr ? hdr.querySelector('.sec-btn') : null;
    }
    function isSectionComplete(section) { return state['_sec_' + section.id] === true; }
    function canMarkSectionComplete(section) {
      const all = Array.from(document.querySelectorAll(getSectionSelector(section)));
      const idx = all.indexOf(section);
      if (idx === 0) return true;
      return isSectionComplete(all[idx - 1]);
    }

    function markSectionComplete(sectionId) {
      const section = document.getElementById(sectionId);
      if (!section) return;
      const btn = getSectionBtn(section);
      const key = '_sec_' + sectionId;
      if (!state[key]) {
        if (!canMarkSectionComplete(section)) {
          const all = Array.from(document.querySelectorAll(getSectionSelector(section)));
          const prev = all[all.indexOf(section) - 1];
          if (btn) { btn.classList.add('sec-shake'); setTimeout(() => btn.classList.remove('sec-shake'), 400); }
          if (prev) {
            const pb = getSectionBtn(prev);
            if (pb) { pb.classList.add('sec-prev-pulse'); setTimeout(() => pb.classList.remove('sec-prev-pulse'), 700); }
          }
          return;
        }
        state[key] = true;
        if (btn) btn.classList.add('completed');
        section.querySelectorAll('.task-item').forEach(item => item.classList.add('checked'));
        const today = new Date().toISOString().slice(0, 10);
        section.querySelectorAll('.day-card').forEach(card => {
          const items = card.querySelectorAll('.task-item');
          if (!state[card.id]) state[card.id] = {};
          items.forEach((it, i) => { state[card.id][i] = true; });
          const actInp = card.querySelector('.date-act');
          if (actInp && !actInp.value) {
            actInp.value = today;
            actInp.classList.add('filled');
            saveDate(card.id, 'act', today);
          }
        });
        section.querySelectorAll('.phase-block,.month-block,.week-block,.day-card').forEach(nested => {
          state['_sec_' + nested.id] = true;
          const nb = getSectionBtn(nested);
          if (nb) nb.classList.add('completed');
        });
      } else {
        cascadeUnmarkFrom(section);
      }
      saveState();
      refreshAllProgress();
    }

    function cascadeUnmarkFrom(section) {
      state['_sec_' + section.id] = false;
      const btn = getSectionBtn(section);
      if (btn) btn.classList.remove('completed');
      section.querySelectorAll('.task-item').forEach(i => i.classList.remove('checked'));
      section.querySelectorAll('.day-card').forEach(card => {
        state[card.id] = {};
        const actInp = card.querySelector('.date-act');
        if (actInp) {
          actInp.value = '';
          actInp.classList.remove('filled');
          saveDate(card.id, 'act', '');
        }
      });
      section.querySelectorAll('.phase-block,.month-block,.week-block,.day-card').forEach(nested => {
        state['_sec_' + nested.id] = false;
        const nb = getSectionBtn(nested);
        if (nb) nb.classList.remove('completed');
      });
      const all = Array.from(document.querySelectorAll(getSectionSelector(section)));
      const idx = all.indexOf(section);
      for (let i = idx + 1; i < all.length; i++) {
        if (state['_sec_' + all[i].id]) cascadeUnmarkFrom(all[i]);
      }
    }

    function refreshAllProgress() {
      document.querySelectorAll('.day-card').forEach(c => updateCard(c));
      document.querySelectorAll('.week-block,.month-block,.phase-block').forEach(b => updateBlockCount(b));
      document.querySelectorAll('.phase-block').forEach(phase => {
        const fill = document.getElementById(phase.id.replace('phase', 'ph') + '-fill');
        if (fill) {
          const items = phase.querySelectorAll('.task-item');
          const done = phase.querySelectorAll('.task-item.checked');
          fill.style.width = (items.length ? Math.round(done.length / items.length * 100) : 0) + '%';
        }
      });
      updateAllBlockDates();
      updateCourseStart();
      updateCourseEnd();
      updateStats();
    }

    function initSectionCompleteButtons() {
      function makeBtn(id) {
        const btn = document.createElement('button');
        btn.className = 'sec-btn'; btn.title = 'Mark section complete'; btn.innerHTML = '&#10003; Done';
        btn.addEventListener('click', e => { e.stopPropagation(); markSectionComplete(id); });
        return btn;
      }
      document.querySelectorAll('.phase-block').forEach(phase => {
        const hdr = phase.querySelector(':scope > .phase-hdr');
        if (hdr) { const t = hdr.querySelector('.ph-toggle'); if (t) hdr.insertBefore(makeBtn(phase.id), t); }
      });
      document.querySelectorAll('.month-block').forEach(month => {
        const hdr = month.querySelector(':scope > .month-hdr');
        if (hdr) { const t = hdr.querySelector('.month-toggle'); if (t) hdr.insertBefore(makeBtn(month.id), t); }
      });
      document.querySelectorAll('.week-block').forEach(week => {
        const hdr = week.querySelector(':scope > .week-hdr');
        if (hdr) {
          const toggle = hdr.querySelector('.week-toggle');
          if (toggle && toggle.parentElement) toggle.parentElement.insertBefore(makeBtn(week.id), toggle);
        }
      });
      document.querySelectorAll('.day-card').forEach(day => {
        const top = day.querySelector(':scope > .day-top');
        if (top) {
          const dayRight = top.querySelector('.day-right');
          if (dayRight) { const t = dayRight.querySelector('.day-toggle'); dayRight.insertBefore(makeBtn(day.id), t); }
        }
      });
    }

    // ── RESTORE STATE ON LOAD ─────────────────────────────────────────────────────
    function restoreState() {
      loadState();

      initDatePickers();
      loadDates(); restoreDates();

      document.querySelectorAll('.day-card').forEach(card => {
        const id = card.id;
        if (!state[id]) return;
        const items = card.querySelectorAll('.task-item');
        items.forEach((item, idx) => { if (state[id][idx]) item.classList.add('checked'); });
        updateCard(card);
      });
      document.querySelectorAll('.week-block,.month-block,.phase-block').forEach(b => updateBlockCount(b));
      document.querySelectorAll('.phase-block').forEach(phase => {
        const fillId = phase.id.replace('phase', 'ph') + '-fill';
        const fill = document.getElementById(fillId);
        if (fill) {
          const items = phase.querySelectorAll('.task-item');
          const checked = phase.querySelectorAll('.task-item.checked');
          const pct = items.length ? Math.round(checked.length / items.length * 100) : 0;
          fill.style.width = pct + '%';
        }
      });
      updateAllBlockDates(); updateCourseStart(); updateCourseEnd();
      updateStats();
    }

    function restoreSectionBtns() {
      document.querySelectorAll('.phase-block,.month-block,.week-block,.day-card').forEach(section => {
        if (state['_sec_' + section.id]) {
          const b = getSectionBtn(section);
          if (b) b.classList.add('completed');
        }
      });
    }

    window.addEventListener('scroll', () => {
      const btn = document.getElementById('scroll-top');
      if (btn) btn.classList.toggle('visible', window.scrollY > 400);
    });

    // ── GITHUB SYNC ────────────────────────────────────────────────────────────────
    const GH_CFG_KEY = 'devops_gh_config';
    let ghConfig = null;
    let ghFileSha = null;
    let _ghTimer = null;

    function loadGhConfig() { try { ghConfig = JSON.parse(localStorage.getItem(GH_CFG_KEY) || 'null'); } catch (e) { ghConfig = null; } }

    function ghApiUrl() { return 'https://api.github.com/repos/' + ghConfig.owner + '/' + ghConfig.repo + '/contents/' + (ghConfig.path || ghConfig.filePath); }

    function ghHeaders() { return { 'Authorization': 'Bearer ' + ghConfig.token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }; }

    function scheduleGhSync() {
      if (!ghConfig) return;
      clearTimeout(_ghTimer);
      _ghTimer = setTimeout(() => ghPush(), 1500);
    }

    async function ghFetch() {
      if (!ghConfig) return;
      try {
        setSyncStatus('syncing');
        const r = await fetch(ghApiUrl() + '?ref=' + ghConfig.branch + '&t=' + Date.now(), { headers: ghHeaders(), cache: 'no-store' });
        if (r.status === 404) { setSyncStatus('ready'); return; }
        if (!r.ok) { setSyncStatus('error'); return; }
        const data = await r.json();
        ghFileSha = data.sha;
        const text = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
        const p = JSON.parse(text);
        if (p && p.state) {
          state = p.state;
          dates = p.dates || {};
          localStorage.setItem(STORE_KEY, JSON.stringify(state));
          localStorage.setItem(DATES_KEY, JSON.stringify(dates));
        }
        setSyncStatus('ok');
      } catch (e) { setSyncStatus('error'); console.warn('GH fetch failed:', e); }
    }

    async function ghPush() {
      if (!ghConfig) return;
      try {
        setSyncStatus('syncing');
        const payload = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state, dates }, null, 2);
        const encoded = btoa(unescape(encodeURIComponent(payload)));
        const body = { message: 'chore: auto-save progress ' + new Date().toISOString().slice(0, 16), content: encoded, branch: ghConfig.branch };
        if (ghFileSha) body.sha = ghFileSha;
        const r = await fetch(ghApiUrl(), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
        if (!r.ok) { setSyncStatus('error'); return; }
        const data = await r.json();
        ghFileSha = data.content.sha;
        setSyncStatus('ok');
      } catch (e) { setSyncStatus('error'); console.warn('GH push failed:', e); }
    }

    function setSyncStatus(mode) {
      const btn = document.getElementById('gh-sync-btn');
      if (!btn) return;
      btn.classList.remove('gh-ok', 'gh-syncing', 'gh-error', 'gh-idle');
      if (mode === 'ok') { btn.textContent = '☁ Synced'; btn.classList.add('gh-ok'); }
      else if (mode === 'syncing') { btn.textContent = '☁ Syncing…'; btn.classList.add('gh-syncing'); }
      else if (mode === 'error') { btn.textContent = '☁ Sync Error'; btn.classList.add('gh-error'); }
      else { btn.textContent = '☁ GitHub Sync'; btn.classList.add('gh-idle'); }
    }

    function openGhModal() {
      const m = document.getElementById('gh-modal');
      if (!m) return;
      if (ghConfig) {
        document.getElementById('gh-owner').value = ghConfig.owner || '';
        document.getElementById('gh-repo').value = ghConfig.repo || '';
        document.getElementById('gh-branch').value = ghConfig.branch || 'main';
        document.getElementById('gh-path').value = ghConfig.path || 'devops_roadmap_progress.json';
        document.getElementById('gh-token').value = ghConfig.token || '';
      }
      m.style.display = 'flex';
    }

    function closeGhModal() { const m = document.getElementById('gh-modal'); if (m) m.style.display = 'none'; }

    async function saveGhSettings() {
      const owner = document.getElementById('gh-owner').value.trim();
      const repo = document.getElementById('gh-repo').value.trim();
      const branch = document.getElementById('gh-branch').value.trim() || 'main';
      const path = document.getElementById('gh-path').value.trim() || 'devops_roadmap_progress.json';
      const token = document.getElementById('gh-token').value.trim();
      if (!owner || !repo || !token) { alert('Owner, repo, and token are required.'); return; }
      ghConfig = { owner, repo, branch, path, token };
      localStorage.setItem(GH_CFG_KEY, JSON.stringify(ghConfig));
      closeGhModal();
      await ghFetch();
      restoreState();
      initSectionCompleteButtons();
      restoreSectionBtns();
      await ghPush();
    }

    async function initGhSync() {
      loadGhConfig();
      if (!ghConfig) return;
      await ghFetch();
    }

    // ── AUTO-OPEN CURRENT PHASE ──────────────────────────────────────────────────
    function openCurrentPhase() {
      // Collapse ALL phases, months, weeks first
      document.querySelectorAll('.phase-block').forEach(p => p.classList.remove('open'));
      document.querySelectorAll('.month-block').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.week-block').forEach(w => w.classList.remove('open'));

      // Find the first phase that has at least one unchecked task
      const phases = Array.from(document.querySelectorAll('.phase-block'));
      let target = phases.find(phase =>
        phase.querySelectorAll('.task-item:not(.checked)').length > 0
      );
      // If all done, fall back to the last phase
      if (!target) target = phases[phases.length - 1];
      if (!target) return;

      // Open the phase
      target.classList.add('open');

      // Open the specific month and week containing the active task
      const firstUnchecked = target.querySelector('.task-item:not(.checked)');
      if (firstUnchecked) {
        const currentMonth = firstUnchecked.closest('.month-block');
        if (currentMonth) currentMonth.classList.add('open');
        const currentWeek = firstUnchecked.closest('.week-block');
        if (currentWeek) currentWeek.classList.add('open');
      } else {
        // Fallback for fully completed roadmap
        const firstMonth = target.querySelector('.month-block');
        if (firstMonth) {
          firstMonth.classList.add('open');
          const firstWeek = firstMonth.querySelector('.week-block');
          if (firstWeek) firstWeek.classList.add('open');
        }
      }

      // Scroll the phase header into view smoothly
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // ── INIT ──────────────────────────────────────────────────────────────────────
    (async () => {
      migrateOldKeys();
      await initGhSync();
      restoreState();
      initSectionCompleteButtons();
      restoreSectionBtns();
      openCurrentPhase();
    })();
  

  /* ══════════════════════════════════════════════════════
     NODE / PARTICLE NETWORK BACKGROUND
     ══════════════════════════════════════════════════════ */
  (function () {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    const LABELS = ['pod', 'git', 'ci', 'cd', 'k8s', 'aws', 'api', 'dns', 'svc', 'img', 'repo', 'node', 'helm', 'oci', 'vpc', 'iam', 'acr', 'ecr', 'pvc', 'crd', 'job'];
    const CYAN = [0, 212, 255];
    const GREEN = [0, 229, 160];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();
    function rnd(min, max) { return min + Math.random() * (max - min); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
    class Node {
      constructor() { this.reset(true); }
      reset(init) {
        this.x = rnd(0, canvas.width); this.y = init ? rnd(0, canvas.height) : (Math.random() < .5 ? -10 : canvas.height + 10);
        this.vx = rnd(-.25, .25); this.vy = rnd(-.18, .18);
        this.r = Math.random() < .12 ? rnd(5, 7) : rnd(2.5, 4);
        this.lbl = Math.random() < .35 ? pick(LABELS) : null;
        this.phi = rnd(0, Math.PI * 2); this.col = Math.random() < .2 ? GREEN : CYAN;
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.phi += .018;
        if (this.x < -20) this.x = canvas.width + 10; if (this.x > canvas.width + 20) this.x = -10;
        if (this.y < -20) this.y = canvas.height + 10; if (this.y > canvas.height + 20) this.y = -10;
      }
      draw() {
        const pulse = .75 + .25 * Math.sin(this.phi);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(this.col, pulse); ctx.fill();
        if (this.r > 3) {
          ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(this.col, .35 * pulse); ctx.lineWidth = 2; ctx.stroke();
        }
        if (this.lbl) { ctx.fillStyle = rgba(this.col, .4); ctx.font = '11px "IBM Plex Mono",monospace'; ctx.fillText(this.lbl, this.x + this.r + 2, this.y + 3); }
      }
    }
    class Packet {
      constructor(a, b) { this.a = a; this.b = b; this.t = 0; this.speed = rnd(.004, .010); }
      get done() { return this.t >= 1; }
      update() { this.t += this.speed; }
      draw() {
        const x = this.a.x + (this.b.x - this.a.x) * this.t, y = this.a.y + (this.b.y - this.a.y) * this.t;
        const fade = Math.sin(this.t * Math.PI);
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(GREEN, .75 * fade); ctx.fill();
      }
    }
    const N_NODES = Math.min(70, Math.floor(window.innerWidth * window.innerHeight / 14000));
    const MAX_DIST = 175;
    const nodes = Array.from({ length: N_NODES }, () => new Node());
    let packets = [], frame = 0;
    function drawEdges() {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = rgba(CYAN, (1 - d / MAX_DIST) * .55); ctx.lineWidth = .6; ctx.stroke();
        }
      }
    }
    function spawnPacket() {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const nearby = nodes.filter(b => { if (b === a) return false; const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) < MAX_DIST; });
      if (nearby.length) packets.push(new Packet(a, pick(nearby)));
    }
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); drawEdges();
      nodes.forEach(n => { n.update(); n.draw(); });
      packets = packets.filter(p => !p.done); packets.forEach(p => { p.update(); p.draw(); });
      frame++; if (frame % 35 === 0) spawnPacket();
      requestAnimationFrame(animate);
    }
    animate();
  })();

  /* ══════════════════════════════════════════════════════
     MATRIX RAIN — balanced for roadmap
     ══════════════════════════════════════════════════════ */
  (function () {
    const canvas = document.getElementById('rain-canvas');
    const ctx = canvas.getContext('2d');
    const CHARS = ['ls', 'cd', 'pwd', 'grep', 'awk', 'sed', 'cat', 'chmod', 'sudo', 'ssh', 'bash', 'ps', 'kill', 'top', 'git', 'curl', 'docker', 'kubectl', 'helm', 'ansible', 'terraform', 'jenkins', '/etc', '$PATH', '|', '>>', '&&', '||', '$?', '#!/bin/bash', 'exit 0', '[OK]', 'fork()', 'exec()'];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();
    const COL_W = 55, FONT_SZ = 16, ROW_H = 22, SPEED_MS = 22;
    const cols = [];
    function initCols() {
      const n = Math.ceil(canvas.width / COL_W); cols.length = 0;
      for (let i = 0; i < n; i++) cols.push({ x: i * COL_W + Math.random() * 20, y: Math.random() * -canvas.height, speed: 1.0 + Math.random() * 2.2, chars: [], len: 5 + Math.floor(Math.random() * 10) });
    }
    initCols(); window.addEventListener('resize', initCols);
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'left';
      cols.forEach(col => {
        col.y += col.speed;
        for (let i = 0; i < col.chars.length; i++) {
          const age = col.chars.length - i, alpha = Math.max(0, .55 - age * .065);
          const isHead = i === col.chars.length - 1;
          ctx.font = (isHead ? 'bold ' : '') + `${FONT_SZ}px "IBM Plex Mono",monospace`;
          ctx.fillStyle = isHead ? `rgba(0,220,120,${alpha * 1.65})` : `rgba(0,165,75,${alpha})`;
          ctx.fillText(col.chars[i], col.x, col.y - age * ROW_H);
        }
        if (col.chars.length === 0 || col.y - (col.chars.length - 1) * ROW_H > ROW_H) {
          col.chars.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
          if (col.chars.length > col.len) col.chars.shift();
        }
        if (col.y - col.chars.length * ROW_H > canvas.height) { col.y = -20; col.chars = []; col.len = 5 + Math.floor(Math.random() * 10); }
      });
    }
    setInterval(tick, SPEED_MS);
  })();
