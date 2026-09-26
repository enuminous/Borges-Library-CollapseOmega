/*
 * Collapse Ω / browser reference model
 *
 * This is an explicit, finite literary-selection heuristic inspired by the
 * symbolic BEFMW operator. It does not evaluate a physical path integral.
 */
(function (global) {
  'use strict';

  const STOP = new Set(('a an and are as at be book by for from how i in is it of on or the to what when where who why with you your').split(' '));
  const FOCUS_TAGS = {
    wonder: ['wonder', 'strange', 'unknown', 'open', 'infinite', 'discovery'],
    understanding: ['understand', 'question', 'map', 'meaning', 'pattern', 'how'],
    memory: ['memory', 'remember', 'past', 'lost', 'history', 'again'],
    surprise: ['surprise', 'change', 'unexpected', 'turn', 'secret', 'hidden'],
    quiet: ['quiet', 'pause', 'silence', 'still', 'shelter', 'rest']
  };

  const ROOMS = [
    {
      id: 'threshold', name: 'Threshold Room', short: 'THE THRESHOLD',
      titleSignals: ['door', 'begin', 'start', 'first', 'edge', 'threshold', 'open', 'enter'],
      needSignals: ['begin', 'start', 'next', 'leave', 'arrive', 'change', 'door'],
      focusSignals: ['wonder', 'surprise'], coherence: .82, steadiness: .9, disorientation: .12,
      symbol: 'door', architecture: 'A brass-edged door stands at the end of the aisle. It is open by exactly the width of a question.',
      discovery: 'Beyond it, the next room is not visible yet. The Library is holding the rest of the sentence for you.',
      margin: 'A pencilled note says: “Every entrance is also a choice about what to leave outside.”',
      door: 'The door opens into a room that was waiting for a reason.',
      librarian: 'The Librarian turns the key once, then leaves it in the lock. “You may go on,” she says. “You may also decide what going on means.”',
      next: ['Cross the threshold', 'Read the small note', 'Ask what stays outside']
    },
    {
      id: 'index', name: 'Index of Unasked Questions', short: 'THE INDEX',
      titleSignals: ['question', 'map', 'index', 'find', 'meaning', 'understand', 'answer', 'catalog'],
      needSignals: ['question', 'find', 'answer', 'understand', 'map', 'meaning', 'where'],
      focusSignals: ['understanding', 'memory'], coherence: .88, steadiness: .87, disorientation: .17,
      symbol: 'index', architecture: 'A long card catalogue runs beneath a green-shaded lamp. Its drawers are labeled with questions instead of subjects.',
      discovery: 'One drawer is already open. Inside is a card bearing your title, filed under “things that become clearer when entered.”',
      margin: 'On the back of the card: “The index is not the answer. It is the shape of the search.”',
      door: 'A narrow catalogue drawer slides all the way out. It is longer inside than the desk that contains it.',
      librarian: '“Tell me what kind of answer you can use,” says the Librarian. “A map, a witness, or a better question?”',
      next: ['Open the next drawer', 'Turn over the card', 'Ask for a better question']
    },
    {
      id: 'mirror', name: 'Room of Returned Names', short: 'THE MIRROR ROOM',
      titleSignals: ['mirror', 'name', 'self', 'identity', 'alice', 'wonderland', 'remember', 'you'],
      needSignals: ['self', 'name', 'memory', 'change', 'recognize', 'remember', 'identity'],
      focusSignals: ['memory', 'surprise'], coherence: .8, steadiness: .76, disorientation: .28,
      symbol: 'mirror', architecture: 'Three tall mirrors face one another. None reflects the room quite the same way twice.',
      discovery: 'A reflection reaches for a book before you do. On its cover, your title is written in a hand you almost recognize.',
      margin: 'A strip of paper is tucked into the frame: “A likeness is not an ownership claim.”',
      door: 'One reflection steps aside. There is a passage where the glass should be.',
      librarian: '“Which edition feels familiar?” asks the Librarian. “And which one has only borrowed your face?”',
      next: ['Follow the reflected hand', 'Read the strip of paper', 'Ask which edition is yours']
    },
    {
      id: 'observatory', name: 'The Reading Observatory', short: 'THE OBSERVATORY',
      titleSignals: ['space', 'star', 'odyssey', 'cosmos', 'time', 'future', 'sky', 'universe', '2001'],
      needSignals: ['future', 'time', 'world', 'beyond', 'next', 'possibility', 'intelligence'],
      focusSignals: ['wonder', 'understanding'], coherence: .86, steadiness: .84, disorientation: .21,
      symbol: 'star', architecture: 'The ceiling has opened into a dark observatory dome. Shelves curve overhead like a patient constellation.',
      discovery: 'A small brass instrument points toward a star that appears only when the book is named.',
      margin: 'The star chart has one annotation: “A horizon is a promise made by distance.”',
      door: 'The observatory stair climbs toward a page-shaped opening in the dome.',
      librarian: '“The sky is not a forecast,” says the Librarian. “It is a way of placing your question at a larger scale.”',
      next: ['Climb toward the opening', 'Study the star chart', 'Ask what the horizon can tell you']
    },
    {
      id: 'workshop', name: 'The Workshop of First Causes', short: 'THE WORKSHOP',
      titleSignals: ['make', 'build', 'create', 'work', 'structure', 'idea', 'fountainhead', 'design', 'craft'],
      needSignals: ['make', 'build', 'create', 'work', 'plan', 'begin', 'structure'],
      focusSignals: ['understanding', 'surprise'], coherence: .81, steadiness: .82, disorientation: .14,
      symbol: 'lamp', architecture: 'A drafting table is set among the stacks. Paper models of the book’s possible rooms stand beneath a warm task lamp.',
      discovery: 'Most of the models are unfinished. Their empty spaces are marked with tiny brass labels: “reader decides.”',
      margin: 'A blueprint note reads: “A structure can guide attention without deciding what attention means.”',
      door: 'A paper model unfolds into a full-sized passage, its walls still carrying fold-lines.',
      librarian: '“What would you keep if the whole plan had to fit on one page?” asks the Librarian.',
      next: ['Unfold the small model', 'Read the blueprint note', 'Name what should remain']
    },
    {
      id: 'margin', name: 'The Margin That Continues', short: 'THE MARGIN',
      titleSignals: ['winter', 'traveler', 'fragment', 'unfinished', 'margin', 'reader', 'chapter', 'story', 'book'],
      needSignals: ['unfinished', 'fragment', 'pause', 'continue', 'interrupt', 'ending', 'beginning'],
      focusSignals: ['quiet', 'memory', 'wonder'], coherence: .78, steadiness: .78, disorientation: .18,
      symbol: 'page', architecture: 'The room is a white page with a narrow margin wide enough to walk in. A sentence stops just before its ending.',
      discovery: 'The sentence is not broken. It is keeping a place open for what only a reader can bring.',
      margin: 'In the margin, in a second hand: “Do not repair the pause. Find out what the pause makes possible.”',
      door: 'A paragraph break lengthens into a corridor. Somewhere ahead, a page turns itself.',
      librarian: '“Some beginnings are made to remain beginnings,” says the Librarian. She does not finish the sentence.',
      next: ['Walk through the paragraph break', 'Read the second hand', 'Let the sentence remain open']
    },
    {
      id: 'archive', name: 'The Archive of Almost-Remembered Things', short: 'THE ARCHIVE',
      titleSignals: ['archive', 'letter', 'past', 'lost', 'history', 'memory', 'record', 'forgotten'],
      needSignals: ['memory', 'lost', 'past', 'remember', 'history', 'record', 'again'],
      focusSignals: ['memory', 'quiet'], coherence: .84, steadiness: .85, disorientation: .16,
      symbol: 'archive', architecture: 'Glass-fronted cabinets hold catalogues of things almost remembered: a place-name, a smell after rain, a line without its source.',
      discovery: 'A drawer bears the book title in a careful hand. The card inside has space for an edition that has not been written.',
      margin: 'A small label says: “An archive records what it can; it does not own the memory.”',
      door: 'A cabinet door opens onto a corridor lined with blank folders.',
      librarian: '“Would you like the memory as it was, or the question that survived it?” asks the Librarian.',
      next: ['Open the marked drawer', 'Read the small label', 'Ask what survived']
    }
  ];

  function tokenize(text) {
    return String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(w => w && !STOP.has(w));
  }

  function overlap(tokens, signals) {
    if (!tokens.length || !signals.length) return 0;
    const set = new Set(tokens);
    const hits = signals.reduce((n, signal) => n + (set.has(signal) ? 1 : 0), 0);
    return Math.min(1, hits / Math.min(3, signals.length));
  }

  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededRandom(seed) {
    let x = seed || 1;
    return function () {
      x += 0x6D2B79F5;
      let t = x;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function round(value) { return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100; }

  function collapse(context) {
    const titleTokens = tokenize(context.title);
    const needTokens = tokenize(context.need);
    const focus = context.focus || 'wonder';
    const focusTokens = FOCUS_TAGS[focus] || FOCUS_TAGS.wonder;
    const history = new Set(context.visited || []);
    const actionTokens = tokenize(context.lastAction || '');

    const scored = ROOMS.map(room => {
      const titleFit = overlap(titleTokens, room.titleSignals);
      const needFit = overlap(needTokens.concat(actionTokens), room.needSignals);
      const focusFit = overlap(focusTokens, room.focusSignals);
      const novelty = history.has(room.id) ? 0.2 : 0.82;
      const coherence = round(.52 + .23 * titleFit + .13 * room.steadiness + .12 * focusFit);
      const resonance = round(.38 + .32 * needFit + .22 * focusFit + .08 * titleFit);
      const usefulness = round(.48 + .27 * needFit + .15 * focusFit + .10 * room.steadiness);
      const noise = round(room.disorientation + (history.has(room.id) ? .17 : 0));
      const value = .34 * coherence + .28 * resonance + .20 * usefulness + .12 * novelty - .16 * noise;
      return { room, coherence, resonance, usefulness, novelty: round(novelty), noise, value };
    }).sort((a, b) => b.value - a.value);

    // Select deterministically among the leading near-ties so a saved path can be replayed.
    const leaderBand = scored.filter(item => scored[0].value - item.value <= .035).slice(0, 3);
    const seed = hashString([context.title, context.need, focus, (context.step || 1), (context.lastAction || ''), [...history].join(',')].join('|'));
    const random = seededRandom(seed);
    const chosen = leaderBand[Math.floor(random() * leaderBand.length)] || scored[0];
    const rank = scored.findIndex(item => item.room.id === chosen.room.id) + 1;
    return {
      room: chosen.room,
      score: chosen,
      rank,
      candidates: scored.slice(0, 4),
      scoreLabel: round(chosen.value),
      rule: 'room* = argmax [0.34C + 0.28R + 0.20U + 0.12V − 0.16N]'
    };
  }

  function compose(context, room, action) {
    const intro = `The spine reads “${context.title}.” The Library has resolved it as a possible edition shaped by the lens you brought: ${context.focus}.`;
    const question = context.need ? `Your question stays present as you enter: “${context.need}”` : '';
    let event = room.discovery;
    if (action === 'margin') event = room.margin;
    if (action === 'door') event = room.door;
    if (action === 'librarian') event = room.librarian;
    const close = action === 'margin'
      ? 'The mark does not close the book. It gives the next page somewhere to begin.'
      : action === 'door'
        ? 'The room takes the shape of the choice you made, then leaves one detail unresolved.'
        : 'The Librarian waits for your next question. Nothing in the room moves until you do.';
    return { intro, architecture: room.architecture, event, question, close };
  }

  function choices(room) {
    return [
      { id: 'door', label: room.next[0], symbol: '↗' },
      { id: 'margin', label: room.next[1], symbol: '¶' },
      { id: 'librarian', label: room.next[2], symbol: '◉' }
    ];
  }

  global.BorgesEngine = { ROOMS, tokenize, collapse, compose, choices, hashString };
})(window);
