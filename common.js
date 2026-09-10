/* ========================================================
   common.js - Shared Audio, Speech, Player Mode & Modals
   ======================================================== */

// Active player state: 'younger' (Younger Bro / Marc) | 'older' (Big Bro / Jasper)
let currentPlayer = localStorage.getItem('son_active_player') || 'younger';

function getPlayer() {
  return currentPlayer;
}

function setPlayer(player) {
  if (currentPlayer === player) return;
  currentPlayer = player;
  try {
    localStorage.setItem('son_active_player', player);
  } catch (e) {}
  updatePlayerUI();
  
  // Notify all active game modules to switch question sets
  if (typeof onPlayerChangedInScramble === 'function') onPlayerChangedInScramble();
  if (typeof onPlayerChangedInMissing === 'function') onPlayerChangedInMissing();
  if (typeof onPlayerChangedInBee === 'function') onPlayerChangedInBee();
}

function togglePlayer() {
  setPlayer(currentPlayer === 'younger' ? 'older' : 'younger');
}

function updatePlayerUI() {
  const youngerBtn = document.getElementById('player-btn-younger');
  const olderBtn = document.getElementById('player-btn-older');
  if (youngerBtn && olderBtn) {
    if (currentPlayer === 'younger') {
      youngerBtn.classList.add('active');
      olderBtn.classList.remove('active');
    } else {
      olderBtn.classList.add('active');
      youngerBtn.classList.remove('active');
    }
  }
}

// 1. Web Audio API Synthesizer
let audioCtx = null;
let isAudioMuted = false;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChime(success = true) {
  if (isAudioMuted) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  if (success) {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  } else {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.setValueAtTime(220, now + 0.12);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

function playFanfare() {
  if (isAudioMuted) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const notes = [
    { f: 392.00, t: 0.0, d: 0.18 },
    { f: 523.25, t: 0.18, d: 0.18 },
    { f: 659.25, t: 0.36, d: 0.18 },
    { f: 783.99, t: 0.54, d: 0.35 },
    { f: 1046.50, t: 0.90, d: 0.70 }
  ];
  notes.forEach(n => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, now + n.t);
    gain.gain.setValueAtTime(0.25, now + n.t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d);
  });
}

function playTileTapSound() {
  if (isAudioMuted) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(580, now);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

function toggleSound() {
  isAudioMuted = !isAudioMuted;
  const btn = document.getElementById('sound-toggle-btn');
  if (btn) {
    btn.innerText = isAudioMuted ? '🔇' : '🔊';
  }
}

// 2. Web Speech API - British English Pronunciation
function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.85;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const ukVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('British') || v.name.includes('Daniel') || v.name.includes('Oliver'));
  if (ukVoice) {
    utterance.voice = ukVoice;
  } else {
    utterance.lang = 'en-GB';
  }

  window.speechSynthesis.speak(utterance);
}

// 3. Tab Switching
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.game-container').forEach(c => c.classList.remove('active'));

  if (tab === 'scramble') {
    document.getElementById('tab-btn-scramble')?.classList.add('active');
    document.getElementById('scramble-game')?.classList.add('active');
    if (typeof loadCurrentScrambleQuestion === 'function') {
      loadCurrentScrambleQuestion();
    }
  } else if (tab === 'missing') {
    document.getElementById('tab-btn-missing')?.classList.add('active');
    document.getElementById('missing-game')?.classList.add('active');
    if (typeof loadCurrentMissingQuestion === 'function') {
      loadCurrentMissingQuestion();
    }
  } else if (tab === 'bee') {
    document.getElementById('tab-btn-bee')?.classList.add('active');
    document.getElementById('bee-game')?.classList.add('active');
    if (typeof loadCurrentBeeQuestion === 'function') {
      loadCurrentBeeQuestion();
    }
  }
}

// 4. Universal Feedback Modal (Single Question)
let feedbackCallback = null;

function showFeedback(title, text, isCorrect, onConfirm = null) {
  const titleEl = document.getElementById('fb-title');
  const textEl = document.getElementById('fb-text');
  const btn = document.getElementById('fb-btn');
  const modal = document.getElementById('feedback-modal');

  if (titleEl) titleEl.innerText = title;
  if (textEl) textEl.innerHTML = text;
  feedbackCallback = onConfirm;

  if (btn) {
    if (isCorrect) {
      btn.innerText = "Next Question ➡️";
      btn.style.background = "var(--secondary)";
    } else {
      btn.innerText = "Try Again 🔄";
      btn.style.background = "#5A6B7C";
    }
  }
  if (modal) modal.classList.add('show');
}

function onConfirmFeedback() {
  const modal = document.getElementById('feedback-modal');
  if (modal) modal.classList.remove('show');
  if (typeof feedbackCallback === 'function') {
    const cb = feedbackCallback;
    feedbackCallback = null;
    cb();
  }
}

// 5. Set Completion Celebration Modal
let nextSetCallback = null;
let replaySetCallback = null;

function showSetCompletionPopup(title, text, onNext = null, onReplay = null) {
  playFanfare();
  launchConfetti();

  const modal = document.getElementById('set-popup');
  const titleEl = document.getElementById('set-popup-title');
  const textEl = document.getElementById('set-popup-body');
  const nextBtn = document.getElementById('next-set-btn');

  if (titleEl) titleEl.innerText = title;
  if (textEl) textEl.innerHTML = text;

  nextSetCallback = onNext;
  replaySetCallback = onReplay;

  if (nextBtn) {
    nextBtn.style.display = (typeof onNext === 'function') ? 'block' : 'none';
  }

  if (modal) modal.classList.add('show');
}

function onGoToNextSet() {
  const modal = document.getElementById('set-popup');
  if (modal) modal.classList.remove('show');
  if (typeof nextSetCallback === 'function') {
    const cb = nextSetCallback;
    nextSetCallback = null;
    cb();
  }
}

function onReplayCurrentSet() {
  const modal = document.getElementById('set-popup');
  if (modal) modal.classList.remove('show');
  if (typeof replaySetCallback === 'function') {
    const cb = replaySetCallback;
    replaySetCallback = null;
    cb();
  }
}

// 6. Confetti Cannon (Pure HTML5 Canvas)
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#C84B31', '#2D6A4F', '#E9C46A', '#3B82F6', '#EC4899', '#10B981'];

  for (let i = 0; i < 110; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: Math.random() * 8 + 4,
      dx: (Math.random() - 0.5) * 16,
      dy: (Math.random() - 0.6) * 16,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10,
      tiltSpeed: Math.random() * 0.1 + 0.05,
      alpha: 1
    });
  }

  let reqId;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.35;
      p.tilt += p.tiltSpeed;
      p.alpha -= 0.008;

      if (p.alpha > 0) {
        alive = true;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      }
    });

    if (alive) {
      reqId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(reqId);
    }
  }
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  updatePlayerUI();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
});