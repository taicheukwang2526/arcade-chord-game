let score = 0;
let combo = 0;
let maxCombo = 0;
let gameStarted = false;
let gamePaused = false;
let notes = [];
let spawnInterval;
let timerInterval;
let timeRemaining = 60; // 預設 60 秒倒數

const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const timeDisplay = document.getElementById('timeDisplay');
const chordDisplay = document.getElementById('chordDisplay');
const lanes = document.querySelectorAll('.lane');

const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');

const resultOverlay = document.getElementById('resultOverlay');
const resultRank = document.getElementById('resultRank');
const finalScoreDisplay = document.getElementById('finalScore');
const maxComboDisplay = document.getElementById('maxCombo');
const playAgainBtn = document.getElementById('playAgainBtn');

const hitFeedback = document.getElementById('hitFeedback');
const audioFile = document.getElementById('audioFile');
const fileNameDisplay = document.getElementById('fileName');
const bpmInput = document.getElementById('bpmInput');
const bgm = document.getElementById('bgm');

let audioCtx = null;

const chords = [
    { name: "C Major (C - E - G)", freqs: [261.63, 329.63, 392.00] },
    { name: "Am Minor (A - C - E)", freqs: [220.00, 261.63, 329.63] },
    { name: "F Major (F - A - C)", freqs: [349.23, 440.00, 523.25] },
    { name: "G Major (G - B - D)", freqs: [392.00, 493.88, 587.33] }
];

audioFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `已選擇：${file.name}`;
        const fileURL = URL.createObjectURL(file);
        bgm.src = fileURL;
    }
});

function playChordSound(freqs) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    });
}

function showFeedback(text, type) {
    hitFeedback.textContent = text;
    hitFeedback.className = `hit-feedback ${type}`;
    hitFeedback.style.opacity = '1';
    hitFeedback.style.transform = 'translate(-50%, -60px)';
    
    setTimeout(() => {
        hitFeedback.style.opacity = '0';
        hitFeedback.style.transform = 'translate(-50%, -50%)';
    }, 300);
}

function updateChordState() {
    if (combo >= 15) {
        let chordIndex = Math.floor(combo / 5) % chords.length;
        chordDisplay.textContent = `✨ 虛擬樂隊伴奏中: ${chords[chordIndex].name}`;
    } else if (combo >= 5) {
        chordDisplay.textContent = `🎸 和弦解鎖: ${chords[0].name}`;
    } else {
        chordDisplay.textContent = `準備進入節奏...`;
    }
}

// 計算評價等級 S / A / B / C
function calculateRank(finalScore) {
    if (finalScore >= 3000) return 'S';
    if (finalScore >= 2000) return 'A';
    if (finalScore >= 1000) return 'B';
    return 'C';
}

// 結束遊戲並顯示結算畫面
function gameOver() {
    gameStarted = false;
    clearInterval(spawnInterval);
    clearInterval(timerInterval);
    
    if (bgm.src) {
        bgm.pause();
    }

    // 計算與呈現數據
    let rank = calculateRank(score);
    resultRank.textContent = rank;
    finalScoreDisplay.textContent = score;
    maxComboDisplay.textContent = maxCombo;

    // 顯示結算彈窗
    resultOverlay.style.display = 'flex';
}

// 開始遊戲
function startGame() {
    startOverlay.style.display = 'none';
    pauseOverlay.style.display = 'none';
    resultOverlay.style.display = 'none';
    
    gameStarted = true;
    gamePaused = false;
    score = 0;
    combo = 0;
    maxCombo = 0;
    
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    chordDisplay.textContent = `準備進入節奏...`;

    notes.forEach(n => n.element.remove());
    notes = [];

    // 設定時間（有 MP3 就跟 MP3 長度，沒有就預設 60 秒）
    if (bgm.src) {
        bgm.currentTime = 0;
        bgm.play();
        timeRemaining = Math.floor(bgm.duration) || 60;
    } else {
        timeRemaining = 60;
    }
    timeDisplay.textContent = timeRemaining;

    const bpm = parseInt(bpmInput.value) || 120;
    const intervalMs = (60 / bpm) * 1000;
    
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnNote, intervalMs);

    // 開始倒數計時器
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gamePaused && gameStarted) {
            timeRemaining--;
            timeDisplay.textContent = timeRemaining;
            if (timeRemaining <= 0) {
                gameOver();
            }
        }
    }, 1000);
}

function togglePause() {
    if (!gameStarted) return;
    
    gamePaused = !gamePaused;
    if (gamePaused) {
        pauseOverlay.style.display = 'flex';
        if (bgm.src) bgm.pause();
    } else {
        pauseOverlay.style.display = 'none';
        if (bgm.src) bgm.play();
    }
}

function restartGame() {
    if (spawnInterval) clearInterval(spawnInterval);
    if (timerInterval) clearInterval(timerInterval);
    if (bgm.src) {
        bgm.pause();
        bgm.currentTime = 0;
    }
    notes.forEach(n => n.element.remove());
    notes = [];
    gameStarted = false;
    gamePaused = false;
    
    pauseOverlay.style.display = 'none';
    resultOverlay.style.display = 'none';
    startOverlay.style.display = 'flex';
    
    score = 0;
    combo = 0;
    maxCombo = 0;
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    timeDisplay.textContent = 60;
    chordDisplay.textContent = `準備就緒`;
}

startBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', restartGame);
restartFromPauseBtn.addEventListener('click', restartGame);
playAgainBtn.addEventListener('click', startGame);

bgm.addEventListener('ended', gameOver);

function spawnNote() {
    if (!gameStarted || gamePaused) return;
    
    const laneIndex = Math.floor(Math.random() * 4);
    const targetLane = lanes[laneIndex];

    const note = document.createElement('div');
    note.classList.add('note');
    note.dataset.lane = laneIndex;
    note.style.top = '0px';
    
    targetLane.appendChild(note);
    notes.push({ element: note, lane: laneIndex, y: 0 });
}

function updateGame() {
    if (gameStarted && !gamePaused) {
        for (let i = notes.length - 1; i >= 0; i--) {
            let n = notes[i];
            n.y += 3.5;
            n.element.style.top = n.y + 'px';

            if (n.y > 310) {
                n.element.remove();
                notes.splice(i, 1);
                combo = 0;
                comboDisplay.textContent = combo;
                updateChordState();
                showFeedback('MISS', 'miss');
            }
        }
    }
    requestAnimationFrame(updateGame);
}
requestAnimationFrame(updateGame);

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (e.key === 'Escape') {
        if (gameStarted) togglePause();
        return;
    }
    if (key === 'r') {
        restartGame();
        return;
    }

    if (!gameStarted || gamePaused) return;
    
    const targetLane = document.querySelector(`.lane[data-key="${key}"]`);
    
    if (targetLane) {
        const laneIndex = parseInt(targetLane.dataset.index);
        
        targetLane.classList.add('active');
        setTimeout(() => targetLane.classList.remove('active'), 100);

        let activeChord = chords[Math.floor(combo / 5) % chords.length];
        playChordSound(activeChord.freqs);

        let hitIndex = notes.findIndex(n => n.lane === laneIndex && n.y >= 210 && n.y <= 300);

        if (hitIndex !== -1) {
            const hitY = notes[hitIndex].y;
            notes[hitIndex].element.remove();
            notes.splice(hitIndex, 1);

            let multiplier = Math.floor(combo / 10) + 1;

            if (hitY >= 245 && hitY <= 280) {
                score += 150 * multiplier;
                combo += 1;
                showFeedback('PERFECT!', 'perfect');
            } else {
                score += 80 * multiplier;
                combo += 1;
                showFeedback('GOOD', 'good');
            }

            // 更新最高連擊記錄
            if (combo > maxCombo) {
                maxCombo = combo;
            }
        } else {
            combo = 0;
            showFeedback('MISS', 'miss');
        }

        scoreDisplay.textContent = score;
        comboDisplay.textContent = combo;
        updateChordState();
    }
});