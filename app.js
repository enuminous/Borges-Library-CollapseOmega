(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#libraryCanvas');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveKey = 'liber-efmw-session-v01';

  const ui = {
    worldFrame: $('#worldFrame'), entryPanel: $('#entryPanel'), journeyPanel: $('#journeyPanel'), sampleFeed: $('#sampleFeed'),
    titleInput: $('#titleInput'), needInput: $('#needInput'), focusInput: $('#focusInput'),
    worldMode: $('#worldMode'), coordinates: $('#coordinates'), portalOverline: $('#portalOverline'),
    portalTitle: $('#portalTitle'), portalNote: $('#portalNote'), worldReadout: $('#worldReadout'),
    sceneCaption: $('#sceneCaption'), statusLight: $('#statusLight'), statusText: $('#statusText'),
    activeTitle: $('#activeTitle'), stepCounter: $('#stepCounter'), roomPill: $('#roomPill'),
    lensPill: $('#lensPill'), roomHeading: $('#roomHeading'), storyCopy: $('#storyCopy'),
    readerQuestion: $('#readerQuestion'), folioNumber: $('#folioNumber'), coherenceValue: $('#coherenceValue'),
    coherenceBar: $('#coherenceBar'), scoreToggle: $('#scoreToggle'), scoreNotes: $('#scoreNotes'),
    choiceList: $('#choiceList'), pathTrail: $('#pathTrail'), aboutDialog: $('#aboutDialog')
  };

  let journey = null;
  let look = { x: 0, y: 0, key: 0 };
  let audioContext = null;
  let ambient = null;
  let frameSize = { width: 1, height: 1, dpr: 1 };
  let lastFrame = 0;

  const colorSet = ['#8b744b', '#a4a179', '#735e52', '#8b9490', '#b19a67', '#776a89', '#496e69', '#a28774'];
  const SAMPLE_PAGES = [
    { folio: '014', title: 'Index of Unasked Questions', need: 'What pattern lets a better question find meaning?', focus: 'understanding' },
    { folio: '023', title: 'The Archive of Almost-Remembered Things', need: 'What remains when the details go quiet?', focus: 'memory' },
    { folio: '001', title: 'The Door That Opens When Called', need: 'What waits on the other side?', focus: 'surprise' },
    { folio: '087', title: 'A Small Astronomy of Returning', need: 'What does distance make possible?', focus: 'wonder' }
  ];

  function cleanText(text, max = 240) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(saveKey) || 'null'); }
    catch (_error) { return null; }
  }

  function persist(active = true) {
    try {
      localStorage.setItem(saveKey, JSON.stringify({ savedAt: new Date().toISOString(), active, journey }));
    } catch (_error) { /* Private browsing or a full storage quota: session continues in memory. */ }
  }

  function updateStatus(active) {
    ui.statusLight.classList.toggle('active', active);
    ui.statusText.textContent = active ? 'A BOOK IS OPEN' : 'THE STACKS ARE QUIET';
  }

  function setWorld(room, step, action) {
    const active = Boolean(room);
    ui.worldMode.textContent = active ? `BOOK-ROOM / ${room.short}` : 'LOBBY / UNCOLLAPSED';
    ui.coordinates.innerHTML = active
      ? `x: ${room.id} &nbsp;·&nbsp; t: ${String(step).padStart(2, '0')} &nbsp;·&nbsp; u: ${journey.focus}`
      : 'x: ∅ &nbsp;·&nbsp; t: 00 &nbsp;·&nbsp; u: waiting';
    ui.portalOverline.textContent = active ? `COLLAPSE ${String(step).padStart(2, '0')} / ${room.short}` : 'THE READER IS THE APERTURE';
    ui.portalTitle.textContent = active ? room.name : 'The unentered library';
    ui.portalNote.textContent = active ? (action === 'door' ? 'The next room has taken shape.' : action === 'margin' ? 'A fragment changes the light.' : 'The Librarian is listening.') : 'A question is a door. A title is a key.';
    ui.worldReadout.textContent = active ? `OBSERVER PATH / ${journey.trace.length} COLLAPSE${journey.trace.length === 1 ? '' : 'S'}` : 'POSSIBILITY SPACE / STABLE';
    ui.sceneCaption.textContent = active
      ? `${room.architecture} The room is a bounded reading, not the only possible book.`
      : 'The Library does not open all at once. It waits for the small, exact pressure of your attention.';
    updateStatus(active);
  }

  function startJourney(title, need, focus, restored) {
    journey = restored || {
      title, need, focus,
      step: 1,
      action: 'entry',
      visited: [],
      trace: [],
      entries: []
    };
    journey.title = cleanText(journey.title || title, 120);
    journey.need = cleanText(journey.need || need, 240);
    journey.focus = journey.focus || focus || 'wonder';
    if (!journey.trace) journey.trace = [];
    if (!journey.entries) journey.entries = [];
    if (!journey.routeNeed) journey.routeNeed = '';
    if (restored && journey.roomId && journey.entries.length) {
      const room = BorgesEngine.ROOMS.find(item => item.id === journey.roomId);
      const savedScore = journey.currentScore;
      const savedEntry = journey.entries[journey.entries.length - 1];
      if (room && savedScore && savedEntry && savedEntry.passage) {
        renderJourney({ room, score: savedScore, scoreLabel: savedScore.value }, savedEntry.passage);
        setWorld(room, journey.step, journey.action);
        return;
      }
    }
    collapseIntoRoom(journey.action || 'entry');
  }

  function collapseIntoRoom(action) {
    if (!journey) return;
    const result = BorgesEngine.collapse({
      title: journey.title,
      need: [journey.need, journey.routeNeed].filter(Boolean).join(' '),
      focus: journey.focus,
      visited: journey.visited,
      step: journey.step,
      lastAction: action
    });
    journey.roomId = result.room.id;
    journey.currentScore = result.score;
    journey.action = action;
    journey.visited = Array.from(new Set([...(journey.visited || []), result.room.id]));
    journey.trace.push({ step: journey.step, room: result.room.name, roomId: result.room.id, action, score: result.scoreLabel, time: new Date().toISOString() });
    const passage = BorgesEngine.compose(journey, result.room, action);
    journey.entries.push({ step: journey.step, roomId: result.room.id, heading: result.room.name, passage });
    renderJourney(result, passage);
    setWorld(result.room, journey.step, action);
    persist();
  }

  function addParagraph(text) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    ui.storyCopy.appendChild(paragraph);
  }

  function renderJourney(result, passage) {
    const room = result.room;
    ui.entryPanel.hidden = true;
    ui.journeyPanel.hidden = false;
    ui.sampleFeed.hidden = true;
    ui.activeTitle.textContent = journey.title;
    ui.stepCounter.textContent = String(journey.step).padStart(2, '0');
    ui.roomPill.textContent = room.short;
    ui.lensPill.textContent = journey.focus.toUpperCase();
    ui.roomHeading.textContent = room.name;
    ui.folioNumber.textContent = String(journey.step).padStart(3, '0');
    ui.storyCopy.replaceChildren();
    addParagraph(passage.intro);
    addParagraph(passage.architecture);
    addParagraph(passage.event);
    addParagraph(passage.close);
    ui.readerQuestion.hidden = !passage.question;
    ui.readerQuestion.textContent = passage.question || '';

    const percent = Math.round(result.score.coherence * 100);
    ui.coherenceValue.textContent = `${percent}%`;
    ui.coherenceBar.style.width = `${percent}%`;
    ui.scoreNotes.replaceChildren();
    [
      ['C', result.score.coherence, 'COHERENCE', false],
      ['R', result.score.resonance, 'RESONANCE', false],
      ['U', result.score.usefulness, 'UTILITY', false],
      ['V', result.score.novelty, 'NOVELTY', false],
      ['N', result.score.noise, 'NOISE', true]
    ].forEach(([label, value, name, penalty]) => {
      const item = document.createElement('div');
      item.className = `score-note${penalty ? ' penalty' : ''}`;
      const amount = document.createElement('b');
      amount.textContent = Number(value).toFixed(2);
      const caption = document.createElement('span');
      caption.textContent = `${label} / ${name}`;
      item.append(amount, caption);
      ui.scoreNotes.appendChild(item);
    });
    renderChoices(room);
    renderTrail();
  }

  function renderChoices(room) {
    ui.choiceList.replaceChildren();
    BorgesEngine.choices(room).forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.dataset.choice = choice.id;
      const number = document.createElement('span');
      number.className = 'choice-number';
      number.textContent = `${index + 1}.`;
      const label = document.createElement('span');
      label.className = 'choice-label';
      label.textContent = choice.label;
      button.append(number, label);
      button.addEventListener('click', () => choose(choice.id));
      ui.choiceList.appendChild(button);
    });
  }

  function renderTrail() {
    ui.pathTrail.replaceChildren();
    const start = document.createElement('span');
    start.className = 'path-node';
    start.textContent = 'LOBBY';
    ui.pathTrail.appendChild(start);
    journey.trace.slice(-6).forEach((entry) => {
      const node = document.createElement('span');
      node.className = 'path-node';
      node.textContent = entry.room.replace(/\s+/g, ' ').toUpperCase();
      ui.pathTrail.appendChild(node);
    });
  }

  function choose(action) {
    if (!journey) return;
    const actionLabel = action === 'door' ? 'opening the door' : action === 'margin' ? 'reading the margin' : 'speaking with the Librarian';
    journey.step += 1;
    journey.lastAction = actionLabel;
    const addNeed = action === 'door'
      ? 'door passage threshold next room'
      : action === 'margin'
        ? 'fragment marginalia note interruption'
        : 'catalogue question guidance meaning';
    journey.routeNeed = [journey.routeNeed, addNeed].filter(Boolean).join(' ').slice(0, 240);
    collapseIntoRoom(action);
    look.key += action === 'door' ? 1 : action === 'margin' ? -1 : 0;
  }

  function closeAndShelve() {
    if (journey) persist(false);
    journey = null;
    ui.journeyPanel.hidden = true;
    ui.entryPanel.hidden = false;
    ui.sampleFeed.hidden = false;
    ui.titleInput.value = '';
    ui.needInput.value = '';
    setWorld(null, 0);
    ui.titleInput.focus({ preventScroll: true });
  }

  function exportReading() {
    if (!journey) return;
    const payload = {
      title: journey.title,
      readerQuestion: journey.need,
      focus: journey.focus,
      model: 'bounded deterministic browser scoring heuristic; interpretive fiction, not physical inference',
      trace: journey.trace,
      passages: journey.entries,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liber-reading-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showAbout() {
    if (typeof ui.aboutDialog.showModal === 'function') ui.aboutDialog.showModal();
    else window.alert('Collapse Ω selects a bounded room using a deterministic literary scoring heuristic. It does not calculate a physical path integral.');
  }

  function chooseExample(button) {
    ui.titleInput.value = button.dataset.title || '';
    ui.needInput.value = button.dataset.need || '';
    if (button.dataset.focus) ui.focusInput.value = button.dataset.focus;
    ui.entryForm.requestSubmit();
  }

  function renderSamplePages() {
    const grid = $('#samplePageGrid');
    if (!grid) return;
    grid.replaceChildren();

    SAMPLE_PAGES.forEach((sample) => {
      const context = { title: sample.title, need: sample.need, focus: sample.focus };
      const result = BorgesEngine.collapse({ ...context, visited: [], step: 1, lastAction: 'entry' });
      const passage = BorgesEngine.compose(context, result.room, 'entry');
      const article = document.createElement('article');
      article.className = 'sample-page';

      const meta = document.createElement('div');
      meta.className = 'sample-page-meta';
      const folio = document.createElement('span');
      folio.className = 'sample-page-folio';
      folio.textContent = 'POSSIBLE PAGE / ' + sample.folio;
      const room = document.createElement('span');
      room.className = 'sample-page-room';
      room.textContent = result.room.short;
      meta.append(folio, room);

      const title = document.createElement('h3');
      title.textContent = sample.title;
      const excerpt = document.createElement('p');
      excerpt.className = 'sample-page-copy';
      excerpt.textContent = passage.architecture + ' ' + passage.event;

      const footer = document.createElement('div');
      footer.className = 'sample-page-footer';
      const note = document.createElement('span');
      note.textContent = 'ORIGINAL INTERPRETIVE TEXT';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'sample-page-open';
      open.dataset.title = sample.title;
      open.dataset.need = sample.need;
      open.dataset.focus = sample.focus;
      open.setAttribute('aria-label', 'Open ' + sample.title + ' in the Library');
      open.innerHTML = 'ENTER THIS BOOK <span aria-hidden="true">↗</span>';
      open.addEventListener('click', () => chooseExample(open));
      footer.append(note, open);

      article.append(meta, title, excerpt, footer);
      grid.appendChild(article);
    });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    frameSize = { width: Math.max(1, rect.width), height: Math.max(1, rect.height), dpr };
    canvas.width = Math.round(frameSize.width * dpr);
    canvas.height = Math.round(frameSize.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawShelfSide(side, w, h, time) {
    const centerX = w * (.5 + look.x * .018);
    const centerY = h * .34;
    const edgeX = side === 'left' ? 0 : w;
    const vanishingX = side === 'left' ? centerX - w * .115 : centerX + w * .115;
    const sign = side === 'left' ? 1 : -1;
    const wall = ctx.createLinearGradient(side === 'left' ? 0 : w, 0, vanishingX, h * .4);
    wall.addColorStop(0, '#202a32');
    wall.addColorStop(1, '#20212a');
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(edgeX, h * .12);
    ctx.lineTo(vanishingX, h * .29);
    ctx.lineTo(vanishingX, h * .68);
    ctx.lineTo(edgeX, h * .77);
    ctx.closePath();
    ctx.fill();

    for (let row = 0; row < 4; row++) {
      const t = row / 3;
      const edgeY = h * (.3 + row * .14);
      const innerY = h * (.335 + row * .089);
      ctx.strokeStyle = 'rgba(196,171,116,.32)';
      ctx.lineWidth = 1 + row * .18;
      ctx.beginPath();
      ctx.moveTo(edgeX, edgeY);
      ctx.lineTo(vanishingX, innerY);
      ctx.stroke();

      const count = 17 - row;
      for (let i = 0; i < count; i++) {
        const depth = (i + .5) / count;
        const x = edgeX + (vanishingX - edgeX) * depth;
        const y = edgeY + (innerY - edgeY) * depth;
        const bookSeed = (i * 31 + row * 71 + (side === 'right' ? 503 : 0));
        const bw = Math.max(2, (w * .014) * (1 - depth * .7));
        const bh = Math.max(5, (h * .068) * (1 - depth * .58));
        const jitter = Math.sin(bookSeed * 11.3) * h * .014;
        const color = colorSet[Math.abs(bookSeed) % colorSet.length];
        const shift = Math.sin(time * .00023 + bookSeed) * (reducedMotion ? 0 : .65);
        const bx = x + sign * shift;
        ctx.fillStyle = 'rgba(6,8,11,.38)';
        ctx.fillRect(bx - bw / 2 + 1, y - bh + jitter + 1, bw + 1, bh + 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = .35 + (1 - depth) * .46;
        ctx.fillRect(bx - bw / 2, y - bh + jitter, bw, bh);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(231,204,143,.15)';
        ctx.fillRect(bx - bw / 2 + bw * .18, y - bh + jitter + 2, Math.max(1, bw * .08), Math.max(2, bh - 4));
      }
    }

    for (let pillar = 1; pillar <= 3; pillar++) {
      const amount = pillar / 4;
      const x = edgeX + (vanishingX - edgeX) * amount;
      const yTop = h * .16 + amount * h * .14;
      const yBottom = h * .75 + amount * -h * .08;
      ctx.strokeStyle = 'rgba(13,16,20,.48)';
      ctx.lineWidth = Math.max(1, 6 * (1 - amount * .58));
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBottom);
      ctx.stroke();
    }
  }

  function drawPortal(w, h, time) {
    const cx = w * (.5 + look.x * .012);
    const cy = h * (.405 + look.y * .008);
    const room = journey && BorgesEngine.ROOMS.find(item => item.id === journey.roomId);
    const pulse = reducedMotion ? 0 : Math.sin(time * .0014) * .5 + .5;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * .21);
    glow.addColorStop(0, `rgba(223,188,116,${.12 + pulse * .09})`);
    glow.addColorStop(.56, 'rgba(189,147,80,.045)');
    glow.addColorStop(1, 'rgba(120,105,82,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - w * .24, cy - h * .28, w * .48, h * .5);

    const portalW = w * .19;
    const portalH = h * .47;
    const top = cy - portalH * .58;
    const left = cx - portalW * .5;
    ctx.fillStyle = 'rgba(9,12,18,.74)';
    ctx.beginPath();
    ctx.moveTo(left + w * .01, top + portalH);
    ctx.lineTo(left + w * .01, top + portalW * .54);
    ctx.quadraticCurveTo(left + w * .01, top + w * .01, cx, top + w * .01);
    ctx.quadraticCurveTo(left + portalW - w * .01, top + w * .01, left + portalW - w * .01, top + portalW * .54);
    ctx.lineTo(left + portalW - w * .01, top + portalH);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(238,197,121,.34)';
    ctx.shadowBlur = 16 + pulse * 6;
    ctx.strokeStyle = 'rgba(229,197,129,.76)';
    ctx.lineWidth = Math.max(1, w * .0022);
    ctx.beginPath();
    ctx.moveTo(left, top + portalH);
    ctx.lineTo(left, top + portalW * .52);
    ctx.quadraticCurveTo(left, top, cx, top);
    ctx.quadraticCurveTo(left + portalW, top, left + portalW, top + portalW * .52);
    ctx.lineTo(left + portalW, top + portalH);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(223,188,116,.12)';
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring++) {
      const radius = w * (.026 + ring * .012) + pulse * .002 * w;
      ctx.beginPath();
      ctx.arc(cx, cy + portalH * .13, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(231,201,142,.84)';
    ctx.font = `${Math.max(12, w * .022)}px Georgia`;
    ctx.textAlign = 'center';
    const emblem = room ? ({ door: '⌑', index: '≡', mirror: '◉', star: '✳', lamp: '⌁', page: '¶', archive: '▤' }[room.symbol] || 'Ω') : 'Ω';
    ctx.fillText(emblem, cx, cy + portalH * .17);
    if (journey && journey.step > 1) {
      ctx.strokeStyle = `rgba(226,195,129,${.12 + pulse * .09})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy + portalH * .5, portalW * .74, h * .022, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawFloor(w, h, time) {
    const centerX = w * .5;
    const floorTop = h * .7;
    const gradient = ctx.createLinearGradient(0, floorTop, 0, h);
    gradient.addColorStop(0, '#292824');
    gradient.addColorStop(.24, '#29251f');
    gradient.addColorStop(1, '#171818');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(w * .31, floorTop);
    ctx.lineTo(w * .69, floorTop);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(216,185,120,.10)';
    for (let line = 1; line <= 8; line++) {
      const amount = line / 9;
      const y = floorTop + (h - floorTop) * amount * amount;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let line = -4; line <= 4; line++) {
      ctx.beginPath();
      ctx.moveTo(centerX + line * w * .015, floorTop);
      ctx.lineTo(centerX + line * w * .23 + look.x * 5, h);
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(centerX, floorTop + h * .09, 1, centerX, floorTop + h * .09, w * .38);
    glow.addColorStop(0, `rgba(215,177,102,${.1 + Math.sin(time * .001) * (reducedMotion ? 0 : .018)})`);
    glow.addColorStop(1, 'rgba(215,177,102,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, floorTop - 10, w, h - floorTop + 10);
  }

  function drawDust(w, h, time) {
    const seed = journey ? BorgesEngine.hashString(`${journey.title}|${journey.step}`) : 29;
    for (let i = 0; i < 42; i++) {
      const raw = (Math.sin(seed * .0013 + i * 8.137) * 43758.5453) % 1;
      const xBase = ((raw + 1) % 1) * w;
      const yBase = ((Math.cos(seed * .0009 + i * 6.517) * 19341.1 % 1) + 1) % 1 * h;
      const x = (xBase + (reducedMotion ? 0 : Math.sin(time * .00018 + i) * 4) + w) % w;
      const y = (yBase + (reducedMotion ? 0 : Math.cos(time * .0002 + i * 2) * 5) + h) % h;
      const alpha = .12 + ((i * 17) % 10) * .025;
      ctx.fillStyle = `rgba(237,213,163,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * .35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorld(time) {
    if (!frameSize.width || !frameSize.height) return;
    const w = frameSize.width;
    const h = frameSize.height;
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#141a24');
    sky.addColorStop(.42, '#22242a');
    sky.addColorStop(1, '#141719');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const horizonGlow = ctx.createRadialGradient(w * .5, h * .42, 0, w * .5, h * .42, w * .6);
    horizonGlow.addColorStop(0, 'rgba(195,157,89,.15)');
    horizonGlow.addColorStop(1, 'rgba(195,157,89,0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, w, h);
    drawShelfSide('left', w, h, time);
    drawShelfSide('right', w, h, time);
    drawFloor(w, h, time);
    drawPortal(w, h, time);
    drawDust(w, h, time);
    if (!reducedMotion && time - lastFrame < 26) {
      requestAnimationFrame(drawWorld);
      return;
    }
    lastFrame = time;
    if (!reducedMotion) requestAnimationFrame(drawWorld);
  }

  function startAmbient() {
    const button = $('#soundButton');
    if (ambient) {
      ambient.stop();
      ambient = null;
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = '<span aria-hidden="true">♫</span> SOUND OFF';
      button.title = 'Ambient sound is off';
      return;
    }
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const master = audioContext.createGain();
      master.gain.value = .024;
      master.connect(audioContext.destination);
      const oscillators = [110, 164.81, 220].map((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = index === 1 ? 'triangle' : 'sine';
        osc.frequency.value = frequency;
        gain.gain.value = index === 2 ? .18 : .3;
        osc.connect(gain).connect(master);
        osc.start();
        return osc;
      });
      ambient = {
        stop() {
          master.gain.setTargetAtTime(0, audioContext.currentTime, .08);
          setTimeout(() => oscillators.forEach(osc => { try { osc.stop(); } catch (_error) {} }), 250);
        }
      };
      button.setAttribute('aria-pressed', 'true');
      button.innerHTML = '<span aria-hidden="true">♫</span> SOUND ON';
      button.title = 'Turn ambient sound off';
    } catch (_error) {
      button.title = 'Ambient sound is not available in this browser';
    }
  }

  $('#entryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = cleanText(ui.titleInput.value, 120);
    if (!title) { ui.titleInput.focus(); return; }
    startJourney(title, cleanText(ui.needInput.value, 240), ui.focusInput.value);
  });

  document.querySelectorAll('.example-chip').forEach(button => button.addEventListener('click', () => chooseExample(button)));
  $('#shelveButton').addEventListener('click', closeAndShelve);
  $('#restartButton').addEventListener('click', closeAndShelve);
  $('#exportButton').addEventListener('click', exportReading);
  $('#aboutButton').addEventListener('click', showAbout);
  $('#footerAbout').addEventListener('click', showAbout);
  $('#soundButton').addEventListener('click', startAmbient);
  $('#immersionButton').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch (_error) { /* Full-screen mode can be unavailable in embedded previews. */ }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    $('#immersionButton').setAttribute('aria-pressed', String(active));
    $('#immersionButton').innerHTML = active ? 'EXIT IMMERSION <span aria-hidden="true">⛶</span>' : 'IMMERSION <span aria-hidden="true">⛶</span>';
    $('#immersionButton').title = active ? 'Exit full-screen immersion' : 'Open full-screen immersion';
  });
  $('#scoreToggle').addEventListener('click', () => {
    const show = ui.scoreNotes.hidden;
    ui.scoreNotes.hidden = !show;
    $('#scoreToggle').setAttribute('aria-expanded', String(show));
    $('#scoreToggle').innerHTML = show ? 'SCORE NOTES <span aria-hidden="true">−</span>' : 'SCORE NOTES <span aria-hidden="true">＋</span>';
  });

  document.addEventListener('keydown', (event) => {
    if (ui.aboutDialog.open && event.key === 'Escape') return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'ArrowLeft') { look.key -= 1; look.x = Math.max(-1, look.x - .3); }
    if (event.key === 'ArrowRight') { look.key += 1; look.x = Math.min(1, look.x + .3); }
    if (journey && ['1', '2', '3'].includes(event.key)) {
      const buttons = [...ui.choiceList.querySelectorAll('button')];
      buttons[Number(event.key) - 1]?.click();
    }
  });

  let dragging = false;
  ui.worldFrame.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    dragging = true;
    ui.worldFrame.setPointerCapture(event.pointerId);
  });
  ui.worldFrame.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = ui.worldFrame.getBoundingClientRect();
    look.x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    look.y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
  });
  ui.worldFrame.addEventListener('pointerup', () => { dragging = false; });
  ui.worldFrame.addEventListener('pointercancel', () => { dragging = false; });
  ui.worldFrame.addEventListener('pointerleave', () => { if (!dragging) { look.x *= .92; look.y *= .92; } });
  window.addEventListener('resize', resizeCanvas);
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(ui.worldFrame);
  renderSamplePages();
  resizeCanvas();
  drawWorld(performance.now());

  const saved = readSaved();
  if (saved && saved.active && saved.journey && saved.journey.title && saved.journey.trace && saved.journey.trace.length) {
    startJourney(saved.journey.title, saved.journey.need, saved.journey.focus, saved.journey);
  }
})();
