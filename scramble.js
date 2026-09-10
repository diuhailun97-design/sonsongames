/* ========================================================
   scramble.js - 1. Word Scramble Module
   ======================================================== */
let allScrambleSets = []; // All sets loaded from XML
let scrambleSets = [];    // Filtered by currentPlayer
let currentScrambleSetIdx = 0;
let currentScrambleIdxInSet = 0;
let scrambleUserLetters = [];
let scrambleTilesState = [];

const fallbackScrambleYounger = [
  [
    { word: "people", hint: "Many ______ came to watch the football match.", meaning: "Human beings in general." },
    { word: "thought", hint: "She ______ that it was going to rain today.", meaning: "Past tense of think." },
    { word: "parents", hint: "Both of my ______ helped me bake a chocolate cake.", meaning: "A father and mother." },
    { word: "would", hint: "If it is sunny tomorrow, we ______ love to go to the beach.", meaning: "Expressing a wish or condition." },
    { word: "through", hint: "The red train travelled ______ the long dark tunnel.", meaning: "Moving in one side and out the opposite side." }
  ]
];

const fallbackScrambleOlder = [
  [
    { word: "accommodate", hint: "The hotel had enough rooms to ______ all the guests.", meaning: "Provide lodging or space for." },
    { word: "guarantee", hint: "The shop gave a two-year ______ with the laptop.", meaning: "A formal assurance or promise." },
    { word: "rhythm", hint: "He tapped his foot to the catchy musical ______.", meaning: "A strong repeated pattern of sound." },
    { word: "conscience", hint: "His guilty ______ told him to admit his mistake.", meaning: "An inner sense of right and wrong." },
    { word: "necessary", hint: "It is ______ to pack your passport for travelling.", meaning: "Essential and required." }
  ]
];

async function parseXMLSets(filename, defaultPlayer) {
  try {
    const res = await fetch(filename);
    if (!res.ok) return [];
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const setNodes = xmlDoc.getElementsByTagName('set');
    const loaded = [];
    for (let s = 0; s < setNodes.length; s++) {
      const qNodes = setNodes[s].getElementsByTagName('question');
      const setName = setNodes[s].getAttribute('name') || `Set ${s + 1}`;
      const player = setNodes[s].getAttribute('player') || defaultPlayer;
      const questions = [];
      for (let q = 0; q < qNodes.length; q++) {
        const word = qNodes[q].getElementsByTagName('word')[0]?.textContent.trim() || '';
        const hint = qNodes[q].getElementsByTagName('hint')[0]?.textContent.trim() || '';
        const meaning = qNodes[q].getElementsByTagName('meaning')[0]?.textContent.trim() || '';
        if (word.length > 0) {
          questions.push({ word, hint, meaning, setName, player });
        }
      }
      if (questions.length > 0) {
        questions.player = player;
        questions.setName = setName;
        loaded.push(questions);
      }
    }
    return loaded;
  } catch (e) {
    return [];
  }
}

async function fetchScrambleXML() {
  try {
    // 1. Try loading separate XML files (spellingwords_younger.xml & spellingwords_older.xml)
    const [youngerSets, olderSets] = await Promise.all([
      parseXMLSets('spellingwords_younger.xml', 'younger'),
      parseXMLSets('spellingwords_older.xml', 'older')
    ]);
    let loaded = [...youngerSets, ...olderSets];

    // 2. Fallback to unified spellingwords.xml if separate files are not found
    if (loaded.length === 0) {
      loaded = await parseXMLSets('spellingwords.xml', 'younger');
    }

    if (loaded.length > 0) {
      allScrambleSets = loaded;
    } else {
      allScrambleSets = fallbackScrambleYounger;
    }
  } catch (err) {
    console.warn('Failed to load spelling XML files, using fallback:', err);
    allScrambleSets = fallbackScrambleYounger;
  }

  filterScrambleSetsByPlayer();
}

function filterScrambleSetsByPlayer() {
  const p = getPlayer();
  scrambleSets = allScrambleSets.filter(s => s.player === p);
  if (scrambleSets.length === 0) {
    scrambleSets = (p === 'older') ? fallbackScrambleOlder : fallbackScrambleYounger;
  }

  currentScrambleSetIdx = 0;
  try {
    const saved = localStorage.getItem(`son_scramble_set_${p}`);
    if (saved !== null) {
      currentScrambleSetIdx = parseInt(saved, 10) || 0;
      if (currentScrambleSetIdx >= scrambleSets.length) currentScrambleSetIdx = 0;
    }
  } catch (e) {}

  currentScrambleIdxInSet = 0;
  initScrambleSetDropdown();
  loadCurrentScrambleQuestion();
}

function onPlayerChangedInScramble() {
  filterScrambleSetsByPlayer();
}

function initScrambleSetDropdown() {
  const select = document.getElementById('scramble-set-dropdown');
  if (!select) return;
  select.innerHTML = '';

  for (let i = 0; i < scrambleSets.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const name = scrambleSets[i][0]?.setName || `Set ${i + 1} (${scrambleSets[i].length} words)`;
    opt.innerText = name;
    if (i === currentScrambleSetIdx) opt.selected = true;
    select.appendChild(opt);
  }
}

function onSelectScrambleSet(idx) {
  currentScrambleSetIdx = parseInt(idx, 10);
  currentScrambleIdxInSet = 0;
  saveScrambleProgress();
  loadCurrentScrambleQuestion();
}

function saveScrambleProgress() {
  try {
    const p = getPlayer();
    localStorage.setItem(`son_scramble_set_${p}`, currentScrambleSetIdx);
  } catch (e) {}
}

function loadCurrentScrambleQuestion() {
  if (!scrambleSets[currentScrambleSetIdx]) return;
  const curSet = scrambleSets[currentScrambleSetIdx];
  const q = curSet[currentScrambleIdxInSet];

  const progressLabel = document.getElementById('scramble-progress-label');
  if (progressLabel) {
    progressLabel.innerText = `Set ${currentScrambleSetIdx + 1} • Word ${currentScrambleIdxInSet + 1} of ${curSet.length}`;
  }

  const setDropdown = document.getElementById('scramble-set-dropdown');
  if (setDropdown) {
    setDropdown.value = currentScrambleSetIdx;
  }

  const hintEl = document.getElementById('scramble-hint');
  if (hintEl) {
    hintEl.innerText = q.hint;
  }
  const meaningEl = document.getElementById('scramble-meaning');
  if (meaningEl) {
    meaningEl.innerText = '💡 Meaning: ' + q.meaning;
  }

  setTimeout(() => {
    speakWord(q.word);
  }, 350);

  const wordLen = q.word.length;
  scrambleUserLetters = new Array(wordLen).fill('');

  const slotsContainer = document.getElementById('scramble-slots');
  if (slotsContainer) {
    slotsContainer.innerHTML = '';
    for (let i = 0; i < wordLen; i++) {
      const slot = document.createElement('div');
      slot.className = 'char-box blank';
      slot.id = `scramble-slot-${i}`;
      slot.innerText = '';
      slot.onclick = () => returnScrambleLetter(i);
      slotsContainer.appendChild(slot);
    }
  }

  const chars = q.word.split('');
  scrambleTilesState = chars.map((c, idx) => ({ char: c, used: false, originalIndex: idx }));

  for (let i = scrambleTilesState.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scrambleTilesState[i], scrambleTilesState[j]] = [scrambleTilesState[j], scrambleTilesState[i]];
  }

  renderScrambleTiles();
}

function renderScrambleTiles() {
  const container = document.getElementById('scramble-tiles');
  if (!container) return;
  container.innerHTML = '';

  scrambleTilesState.forEach((tile, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (tile.used ? ' used' : '');
    btn.id = `scramble-tile-${idx}`;
    btn.innerText = tile.char;
    btn.onclick = () => onSelectScrambleTile(idx);
    container.appendChild(btn);
  });
}

function onSelectScrambleTile(tileIdx) {
  const tile = scrambleTilesState[tileIdx];
  if (tile.used) return;

  const emptyIdx = scrambleUserLetters.findIndex(c => c === '');
  if (emptyIdx === -1) return;

  playTileTapSound();
  tile.used = true;
  scrambleUserLetters[emptyIdx] = tile.char;

  const slot = document.getElementById(`scramble-slot-${emptyIdx}`);
  if (slot) {
    slot.innerText = tile.char;
    slot.classList.remove('blank');
    slot.classList.add('filled');
    slot.dataset.tileIdx = tileIdx;
  }

  renderScrambleTiles();

  if (!scrambleUserLetters.includes('')) {
    setTimeout(checkScrambleAnswer, 250);
  }
}

function returnScrambleLetter(slotIdx) {
  if (scrambleUserLetters[slotIdx] === '') return;
  const slot = document.getElementById(`scramble-slot-${slotIdx}`);
  const tileIdx = slot.dataset.tileIdx;

  playTileTapSound();
  if (tileIdx !== undefined) {
    scrambleTilesState[tileIdx].used = false;
  }

  scrambleUserLetters[slotIdx] = '';
  slot.innerText = '';
  slot.classList.add('blank');
  slot.classList.remove('filled');
  delete slot.dataset.tileIdx;

  renderScrambleTiles();
}

function clearScrambleSelection() {
  playTileTapSound();
  loadCurrentScrambleQuestion();
}

function checkScrambleAnswer() {
  const curSet = scrambleSets[currentScrambleSetIdx];
  const q = curSet[currentScrambleIdxInSet];
  const entered = scrambleUserLetters.join('');

  if (entered.toLowerCase() === q.word.toLowerCase()) {
    playChime(true);
    showFeedback("Brilliant! 🎉", `You correctly spelt <strong>${q.word}</strong>!`, true, () => {
      nextScrambleQuestion();
    });
  } else {
    playChime(false);
    showFeedback("Almost there! 🌱", `The correct spelling is <strong>${q.word}</strong>. Try again!`, false, () => {
      clearScrambleSelection();
    });
  }
}

function nextScrambleQuestion() {
  const curSet = scrambleSets[currentScrambleSetIdx];
  if (currentScrambleIdxInSet + 1 < curSet.length) {
    currentScrambleIdxInSet++;
    loadCurrentScrambleQuestion();
  } else {
    showSetCompletionPopup(
      `Well Done! Set ${currentScrambleSetIdx + 1} Completed! 🏆`,
      `You successfully solved all ${curSet.length} spelling words in this set!`,
      (currentScrambleSetIdx + 1 < scrambleSets.length) ? () => {
        currentScrambleSetIdx++;
        currentScrambleIdxInSet = 0;
        saveScrambleProgress();
        loadCurrentScrambleQuestion();
      } : null,
      () => {
        currentScrambleIdxInSet = 0;
        loadCurrentScrambleQuestion();
      }
    );
  }
}

function prevScrambleQuestion() {
  if (currentScrambleIdxInSet > 0) {
    currentScrambleIdxInSet--;
    loadCurrentScrambleQuestion();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  fetchScrambleXML();
});