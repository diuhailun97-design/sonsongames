/* ========================================================
   scramble.js - 1. Word Scramble Module
   ======================================================== */
let scrambleSets = [];
let currentScrambleSetIdx = 0;
let currentScrambleIdxInSet = 0;
let scrambleUserLetters = [];
let scrambleTilesState = [];

const fallbackScrambleSets = [
  [
    { word: "people", hint: "Many ______ came to watch the football match.", meaning: "Human beings in general." },
    { word: "thought", hint: "She ______ that it was going to rain today.", meaning: "Past tense of think." },
    { word: "parents", hint: "Both of my ______ helped me bake a chocolate cake.", meaning: "A father and mother." },
    { word: "would", hint: "If it is sunny tomorrow, we ______ love to go to the beach.", meaning: "Expressing a wish or condition." },
    { word: "through", hint: "The red train travelled ______ the long dark tunnel.", meaning: "Moving in one side and out the opposite side." },
    { word: "should", hint: "You ______ always wash your hands before eating.", meaning: "Indicating obligation or duty." },
    { word: "friend", hint: "Marc played tag with his best ______ in the playground.", meaning: "A person whom one knows and likes." },
    { word: "house", hint: "We built a cosy blanket fort inside our warm ______.", meaning: "A building for human habitation." },
    { word: "laugh", hint: "The funny clown made all the children ______ loudly.", meaning: "Make sounds of amusement." },
    { word: "because", hint: "I wore my thick coat ______ it was freezing outside.", meaning: "For the reason that." }
  ],
  [
    { word: "January", hint: "The first month of the brand new year is ______.", meaning: "The 1st month of the year." },
    { word: "February", hint: "The shortest month with 28 or 29 days is ______.", meaning: "The 2nd month of the year." },
    { word: "March", hint: "Spring begins and grass starts growing in ______.", meaning: "The 3rd month of the year." },
    { word: "April", hint: "We love hunting for Easter eggs in ______.", meaning: "The 4th month of the year." },
    { word: "May", hint: "Mother's Day is celebrated on a sunny Sunday in ______.", meaning: "The 5th month of the year." },
    { word: "June", hint: "The sixth month when the weather turns warm is ______.", meaning: "The 6th month of the year." },
    { word: "July", hint: "School finishes and summer holiday starts in ______.", meaning: "The 7th month of the year." },
    { word: "August", hint: "We love building sandcastles at the beach in ______.", meaning: "The 8th month of the year." },
    { word: "September", hint: "Children pack new bags and go back to school in ______.", meaning: "The 9th month of the year." },
    { word: "October", hint: "We dress up for Halloween in ______.", meaning: "The 10th month of the year." },
    { word: "November", hint: "People watch bright fireworks in ______.", meaning: "The 11th month of the year." },
    { word: "December", hint: "The twelfth month when we decorate our Christmas tree is ______.", meaning: "The 12th month of the year." }
  ]
];

async function fetchScrambleXML() {
  try {
    const res = await fetch('spellingwords.xml');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const setNodes = xmlDoc.getElementsByTagName('set');

    const loaded = [];
    for (let s = 0; s < setNodes.length; s++) {
      const qNodes = setNodes[s].getElementsByTagName('question');
      const setName = setNodes[s].getAttribute('name') || `Set ${s + 1}`;
      const questions = [];
      for (let q = 0; q < qNodes.length; q++) {
        const word = qNodes[q].getElementsByTagName('word')[0]?.textContent.trim() || '';
        const hint = qNodes[q].getElementsByTagName('hint')[0]?.textContent.trim() || '';
        const meaning = qNodes[q].getElementsByTagName('meaning')[0]?.textContent.trim() || '';
        if (word.length > 0) {
          questions.push({ word, hint, meaning, setName });
        }
      }
      if (questions.length > 0) loaded.push(questions);
    }

    if (loaded.length > 0) {
      scrambleSets = loaded;
    } else {
      scrambleSets = fallbackScrambleSets;
    }
  } catch (err) {
    console.warn('Failed to load spellingwords.xml, using fallback sets:', err);
    scrambleSets = fallbackScrambleSets;
  }

  initScrambleSetDropdown();
  loadCurrentScrambleQuestion();
}

function initScrambleSetDropdown() {
  const select = document.getElementById('scramble-set-dropdown');
  if (!select) return;
  select.innerHTML = '';

  try {
    const saved = localStorage.getItem('son_scramble_set');
    if (saved !== null) {
      currentScrambleSetIdx = parseInt(saved, 10) || 0;
      if (currentScrambleSetIdx >= scrambleSets.length) currentScrambleSetIdx = 0;
    }
  } catch (e) {}

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
    localStorage.setItem('son_scramble_set', currentScrambleSetIdx);
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