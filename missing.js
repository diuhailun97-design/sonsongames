/* ========================================================
   missing.js - 2. Missing Letters Module
   ======================================================== */
let missingSets = [];
let currentMissingSetIdx = 0;
let currentMissingIdxInSet = 0;
let missingTargetIndices = [];
let missingUserWord = [];

async function fetchMissingXML() {
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
      missingSets = loaded;
    } else {
      missingSets = fallbackScrambleSets;
    }
  } catch (err) {
    console.warn('Failed to load missing letters sets, using fallback:', err);
    missingSets = fallbackScrambleSets;
  }

  initMissingSetDropdown();
  loadCurrentMissingQuestion();
}

function initMissingSetDropdown() {
  const select = document.getElementById('missing-set-dropdown');
  if (!select) return;
  select.innerHTML = '';

  try {
    const saved = localStorage.getItem('son_missing_set');
    if (saved !== null) {
      currentMissingSetIdx = parseInt(saved, 10) || 0;
      if (currentMissingSetIdx >= missingSets.length) currentMissingSetIdx = 0;
    }
  } catch (e) {}

  for (let i = 0; i < missingSets.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const name = missingSets[i][0]?.setName || `Set ${i + 1} (${missingSets[i].length} words)`;
    opt.innerText = name;
    if (i === currentMissingSetIdx) opt.selected = true;
    select.appendChild(opt);
  }
}

function onSelectMissingSet(idx) {
  currentMissingSetIdx = parseInt(idx, 10);
  currentMissingIdxInSet = 0;
  saveMissingProgress();
  loadCurrentMissingQuestion();
}

function saveMissingProgress() {
  try {
    localStorage.setItem('son_missing_set', currentMissingSetIdx);
  } catch (e) {}
}

function loadCurrentMissingQuestion() {
  if (!missingSets[currentMissingSetIdx]) return;
  const curSet = missingSets[currentMissingSetIdx];
  const q = curSet[currentMissingIdxInSet];

  const progressLabel = document.getElementById('missing-progress-label');
  if (progressLabel) {
    progressLabel.innerText = `Set ${currentMissingSetIdx + 1} • Word ${currentMissingIdxInSet + 1} of ${curSet.length}`;
  }

  const setDropdown = document.getElementById('missing-set-dropdown');
  if (setDropdown) {
    setDropdown.value = currentMissingSetIdx;
  }

  const hintEl = document.getElementById('missing-hint');
  if (hintEl) {
    hintEl.innerText = q.hint;
  }
  const meaningEl = document.getElementById('missing-meaning');
  if (meaningEl) {
    meaningEl.innerText = '💡 Meaning: ' + q.meaning;
  }

  setTimeout(() => {
    speakWord(q.word);
  }, 350);

  const len = q.word.length;
  missingUserWord = q.word.split('');

  const hideCount = len > 5 ? 2 : 1;
  const pool = [];
  for (let i = 0; i < len; i++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  missingTargetIndices = pool.slice(0, hideCount).sort((a,b) => a - b);

  missingTargetIndices.forEach(idx => {
    missingUserWord[idx] = '';
  });

  const slotsContainer = document.getElementById('missing-slots');
  if (slotsContainer) {
    slotsContainer.innerHTML = '';
    for (let i = 0; i < len; i++) {
      const slot = document.createElement('div');
      slot.className = 'char-box';
      slot.id = `missing-slot-${i}`;
      if (missingTargetIndices.includes(i)) {
        slot.classList.add('blank');
        slot.innerText = '？';
        slot.onclick = () => clearMissingSlot(i);
      } else {
        slot.innerText = q.word[i];
      }
      slotsContainer.appendChild(slot);
    }
  }

  const correctLetters = missingTargetIndices.map(idx => q.word[idx].toUpperCase());
  const distractorPool = "AEIOURSTLNMD";
  const options = [...new Set(correctLetters)];

  let pIdx = 0;
  while (options.length < 4 && pIdx < distractorPool.length) {
    const c = distractorPool[pIdx++];
    if (!options.includes(c)) options.push(c);
  }

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  renderMissingOptions(options);
}

function renderMissingOptions(options) {
  const container = document.getElementById('missing-options');
  if (!container) return;
  container.innerHTML = '';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
    btn.onclick = () => onSelectMissingOption(opt);
    container.appendChild(btn);
  });
}

function onSelectMissingOption(letter) {
  const curSet = missingSets[currentMissingSetIdx];
  const q = curSet[currentMissingIdxInSet];

  const targetSlotIdx = missingTargetIndices.find(idx => missingUserWord[idx] === '');
  if (targetSlotIdx === undefined) return;

  playTileTapSound();
  const originalChar = q.word[targetSlotIdx];
  const matchChar = (originalChar === originalChar.toUpperCase()) ? letter.toUpperCase() : letter.toLowerCase();

  missingUserWord[targetSlotIdx] = matchChar;

  const slot = document.getElementById(`missing-slot-${targetSlotIdx}`);
  if (slot) {
    slot.innerText = matchChar;
    slot.classList.remove('blank');
    slot.classList.add('filled');
  }

  if (!missingTargetIndices.some(idx => missingUserWord[idx] === '')) {
    setTimeout(checkMissingAnswer, 250);
  }
}

function clearMissingSlot(idx) {
  if (!missingTargetIndices.includes(idx)) return;
  playTileTapSound();
  missingUserWord[idx] = '';
  const slot = document.getElementById(`missing-slot-${idx}`);
  if (slot) {
    slot.innerText = '？';
    slot.classList.add('blank');
    slot.classList.remove('filled');
  }
}

function checkMissingAnswer() {
  const curSet = missingSets[currentMissingSetIdx];
  const q = curSet[currentMissingIdxInSet];
  const entered = missingUserWord.join('');

  if (entered.toLowerCase() === q.word.toLowerCase()) {
    playChime(true);
    showFeedback("Super Star! 🌟", `The complete word is <strong>${q.word}</strong>! Great work!`, true, () => {
      nextMissingQuestion();
    });
  } else {
    playChime(false);
    showFeedback("Keep Trying! 🌱", `The correct word is <strong>${q.word}</strong>. Let's try again!`, false, () => {
      loadCurrentMissingQuestion();
    });
  }
}

function nextMissingQuestion() {
  const curSet = missingSets[currentMissingSetIdx];
  if (currentMissingIdxInSet + 1 < curSet.length) {
    currentMissingIdxInSet++;
    loadCurrentMissingQuestion();
  } else {
    showSetCompletionPopup(
      `Great Job! Set ${currentMissingSetIdx + 1} Completed! 🏆`,
      `You have completed all missing letter puzzles in this set!`,
      (currentMissingSetIdx + 1 < missingSets.length) ? () => {
        currentMissingSetIdx++;
        currentMissingIdxInSet = 0;
        saveMissingProgress();
        loadCurrentMissingQuestion();
      } : null,
      () => {
        currentMissingIdxInSet = 0;
        loadCurrentMissingQuestion();
      }
    );
  }
}

function prevMissingQuestion() {
  if (currentMissingIdxInSet > 0) {
    currentMissingIdxInSet--;
    loadCurrentMissingQuestion();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  fetchMissingXML();
});