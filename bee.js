/* ========================================================
   bee.js - 3. Spelling Bee / Keypad Module
   ======================================================== */
let allBeeSets = [];
let beeSets = [];
let currentBeeSetIdx = 0;
let currentBeeIdxInSet = 0;
let beeUserLetters = [];

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

async function fetchBeeXML() {
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
      allBeeSets = loaded;
    } else {
      allBeeSets = fallbackScrambleYounger;
    }
  } catch (err) {
    console.warn('Failed to load spelling XML files, using fallback:', err);
    allBeeSets = fallbackScrambleYounger;
  }

  filterBeeSetsByPlayer();
}

function filterBeeSetsByPlayer() {
  const p = getPlayer();
  beeSets = allBeeSets.filter(s => s.player === p);
  if (beeSets.length === 0) {
    beeSets = (p === 'older') ? fallbackScrambleOlder : fallbackScrambleYounger;
  }

  currentBeeSetIdx = 0;
  try {
    const saved = localStorage.getItem(`son_bee_set_${p}`);
    if (saved !== null) {
      currentBeeSetIdx = parseInt(saved, 10) || 0;
      if (currentBeeSetIdx >= beeSets.length) currentBeeSetIdx = 0;
    }
  } catch (e) {}

  currentBeeIdxInSet = 0;
  initBeeSetDropdown();
  loadCurrentBeeQuestion();
}

function onPlayerChangedInBee() {
  filterBeeSetsByPlayer();
}

function initBeeSetDropdown() {
  const select = document.getElementById('bee-set-dropdown');
  if (!select) return;
  select.innerHTML = '';

  for (let i = 0; i < beeSets.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const name = beeSets[i][0]?.setName || `Set ${i + 1} (${beeSets[i].length} words)`;
    opt.innerText = name;
    if (i === currentBeeSetIdx) opt.selected = true;
    select.appendChild(opt);
  }
}

function onSelectBeeSet(idx) {
  currentBeeSetIdx = parseInt(idx, 10);
  currentBeeIdxInSet = 0;
  saveBeeProgress();
  loadCurrentBeeQuestion();
}

function saveBeeProgress() {
  try {
    const p = getPlayer();
    localStorage.setItem(`son_bee_set_${p}`, currentBeeSetIdx);
  } catch (e) {}
}

function loadCurrentBeeQuestion() {
  if (!beeSets[currentBeeSetIdx]) return;
  const curSet = beeSets[currentBeeSetIdx];
  const q = curSet[currentBeeIdxInSet];

  const progressLabel = document.getElementById('bee-progress-label');
  if (progressLabel) {
    progressLabel.innerText = `Set ${currentBeeSetIdx + 1} • Word ${currentBeeIdxInSet + 1} of ${curSet.length}`;
  }

  const setDropdown = document.getElementById('bee-set-dropdown');
  if (setDropdown) {
    setDropdown.value = currentBeeSetIdx;
  }

  const hintEl = document.getElementById('bee-hint');
  if (hintEl) {
    hintEl.innerText = q.hint;
  }
  const meaningEl = document.getElementById('bee-meaning');
  if (meaningEl) {
    meaningEl.innerText = '💡 Meaning: ' + q.meaning;
  }

  setTimeout(() => {
    speakWord(q.word);
  }, 350);

  const len = q.word.length;
  beeUserLetters = new Array(len).fill('');

  const dims = getTileDimensions(len);
  const slotsContainer = document.getElementById('bee-slots');
  if (slotsContainer) {
    slotsContainer.innerHTML = '';
    slotsContainer.style.gap = dims.gap;
    for (let i = 0; i < len; i++) {
      const slot = document.createElement('div');
      slot.className = 'char-box blank';
      slot.id = `bee-slot-${i}`;
      slot.style.width = dims.width;
      slot.style.minWidth = dims.width;
      slot.style.maxWidth = dims.width;
      slot.style.height = dims.height;
      slot.style.fontSize = dims.fontSize;
      slot.innerText = '';
      slot.onclick = () => deleteBeeLastLetter();
      slotsContainer.appendChild(slot);
    }
  }

  renderBeeKeypad();
}

function replayBeeVoice() {
  const curSet = beeSets[currentBeeSetIdx];
  if (curSet && curSet[currentBeeIdxInSet]) {
    speakWord(curSet[currentBeeIdxInSet].word);
  }
}

function renderBeeKeypad() {
  const keypad = document.getElementById('bee-keypad');
  if (!keypad) return;
  keypad.innerHTML = '';

  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M", "⌫"]
  ];

  rows.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.style.display = 'flex';
    rowDiv.style.justifyContent = 'center';
    rowDiv.style.gap = '8px';
    rowDiv.style.marginBottom = '8px';
    rowDiv.style.width = '100%';

    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'key-btn' + (key === '⌫' ? ' erase-btn' : '');
      btn.style.flex = key === '⌫' ? '1.5' : '1';
      btn.style.maxWidth = '64px';
      btn.innerText = key;
      btn.onclick = () => {
        if (key === '⌫') {
          deleteBeeLastLetter();
        } else {
          inputBeeLetter(key);
        }
      };
      rowDiv.appendChild(btn);
    });
    keypad.appendChild(rowDiv);
  });
}

function inputBeeLetter(char) {
  const curSet = beeSets[currentBeeSetIdx];
  const q = curSet[currentBeeIdxInSet];
  const nextIdx = beeUserLetters.findIndex(c => c === '');
  if (nextIdx === -1) return;

  playTileTapSound();
  const targetChar = q.word[nextIdx];
  const matchChar = (targetChar === targetChar.toUpperCase()) ? char.toUpperCase() : char.toLowerCase();

  beeUserLetters[nextIdx] = matchChar;

  const slot = document.getElementById(`bee-slot-${nextIdx}`);
  if (slot) {
    slot.innerText = matchChar;
    slot.classList.remove('blank');
    slot.classList.add('filled');
  }

  if (!beeUserLetters.includes('')) {
    setTimeout(checkBeeAnswer, 250);
  }
}

function deleteBeeLastLetter() {
  let lastFilled = -1;
  for (let i = beeUserLetters.length - 1; i >= 0; i--) {
    if (beeUserLetters[i] !== '') {
      lastFilled = i;
      break;
    }
  }
  if (lastFilled === -1) return;

  playTileTapSound();
  beeUserLetters[lastFilled] = '';
  const slot = document.getElementById(`bee-slot-${lastFilled}`);
  if (slot) {
    slot.innerText = '';
    slot.classList.add('blank');
    slot.classList.remove('filled');
  }
}

function checkBeeAnswer() {
  const curSet = beeSets[currentBeeSetIdx];
  const q = curSet[currentBeeIdxInSet];
  const entered = beeUserLetters.join('');

  if (entered.toLowerCase() === q.word.toLowerCase()) {
    playChime(true);
    showFeedback("Fantastic! 🐝", `Perfect listening and spelling: <strong>${q.word}</strong>!`, true, () => {
      nextBeeQuestion();
    });
  } else {
    playChime(false);
    showFeedback("Listen Again 🔊", `The word was <strong>${q.word}</strong>. Tap replay to listen!`, false, () => {
      loadCurrentBeeQuestion();
    });
  }
}

function nextBeeQuestion() {
  const curSet = beeSets[currentBeeSetIdx];
  if (currentBeeIdxInSet + 1 < curSet.length) {
    currentBeeIdxInSet++;
    loadCurrentBeeQuestion();
  } else {
    showSetCompletionPopup(
      `Hooray! Set ${currentBeeSetIdx + 1} Completed! 🏆`,
      `You have completed all Spelling Bee challenges in this set!`,
      (currentBeeSetIdx + 1 < beeSets.length) ? () => {
        currentBeeSetIdx++;
        currentBeeIdxInSet = 0;
        saveBeeProgress();
        loadCurrentBeeQuestion();
      } : null,
      () => {
        currentBeeIdxInSet = 0;
        loadCurrentBeeQuestion();
      }
    );
  }
}

function prevBeeQuestion() {
  if (currentBeeIdxInSet > 0) {
    currentBeeIdxInSet--;
    loadCurrentBeeQuestion();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  fetchBeeXML();
});