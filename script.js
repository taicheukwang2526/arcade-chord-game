let score = 0;
let combo = 0;
let maxCombo = 0;
let gameStarted = false;
let gamePaused = false;
let notes = [];
let spawnInterval;
let timerInterval;
let timeRemaining = 60;

// 自定譜面相關變數
let customChart = null; 
let songStartTime = 0;

const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const timeDisplay = document.getElementById('timeDisplay');
const chordDisplay = document.getElementById('chordDisplay');
const lanes = document.querySelectorAll('.lane');
const cabinet = document.querySelector('.arcade-cabinet');

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
const chartFile = document.getElementById('chartFile');
const chartNameDisplay = document.getElementById('chartName');
const bpmInput = document.getElementById('bpmInput');
const bgm = document.getElementById('bgm');

let audioCtx = null;

const chords = [
    { name: "C Major (C - E - G)", freqs: [261.63, 329.63, 392.00] },
    { name: "Am Minor (A - C - E)", freqs: [220.00, 261.63, 329.63] },
    { name: "F Major (F - A - C)", freqs: [349.23, 440.00, 523.25] },
    { name: "G Major (G - B - D)", freqs: [392.00, 493.88, 587.33] }
];

// 1. 監聽 MP3 音樂上載
audioFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `已選擇：${file.name}`;
        const fileURL = URL.createObjectURL(file);
        bgm.src = fileURL;
    }
});

// 2. 監聽 JSON 譜面檔案上載
chartFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                customChart = JSON.parse(event.target.result);
                chartNameDisplay.textContent = `譜面載入成功：${file.name} (${customChart.length} 音符)`;
            } catch (err) {
                alert('JSON 格式錯誤，請檢查檔案內容！');
                customChart = null;
                chartNameDisplay.textContent = `譜面格式錯誤`;
            }
        };
        reader.readAsText(file);
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

function triggerScreenShake() {
    cabinet.classList.add('shake');
    setTimeout(() => {
        cabinet.classList.remove('shake');
    }, 150);
}

function updateVisualEffects() {
    if (combo >= 20) {
        cabinet.classList.add('surge-mode');
    } else {
        cabinet.classList.remove('surge-mode');
    }

    if (combo >= 15) {
        let chordIndex = Math.floor(combo / 5) % chords.length;
        chordDisplay.textContent = `✨ 虛擬樂隊伴奏中: ${chords[chordIndex].name}`;
    } else if (combo >= 5) {
        chordDisplay.textContent = `🎸 和弦解鎖: ${chords[0].name}`;
    } else {
        chordDisplay.textContent = `準備進入節奏...`;
    }
}

function calculateRank(finalScore) {
    if (finalScore >= 3000) return 'S';
    if (finalScore >= 2000) return 'A';
    if (finalScore >= 1000) return 'B';
    return 'C';
}

function gameOver() {
    gameStarted = false;
    clearInterval(spawnInterval);
    clearInterval(timerInterval);
    cabinet.classList.remove('surge-mode');
    
    if (bgm.src) {
        bgm.pause();
    }

    let rank = calculateRank(score);
    resultRank.textContent = rank;
    finalScoreDisplay.textContent = score;
    maxComboDisplay.textContent = maxCombo;
    resultOverlay.style.display = 'flex';
}

function startGame() {
    startOverlay.style.display = 'none';
    pauseOverlay.style.display = 'none';
    resultOverlay.style.display = 'none';
    
    gameStarted = true;
    gamePaused = false;
    score = 0;
    combo = 0;
    maxCombo = 0;
    cabinet.classList.remove('surge-mode');
    
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    chordDisplay.textContent = `準備進入節奏...`;

    notes.forEach(n => n.element.remove());
    notes = [];

    if (bgm.src) {
        bgm.currentTime = 0;
        bgm.play();
        timeRemaining = Math.floor(bgm.duration) || 60;
    } else {
        timeRemaining = 60;
    }
    timeDisplay.textContent = timeRemaining;

    songStartTime = Date.now();

    // 如果沒有匯入自定 JSON 譜面，則使用原有的 BPM 自動生成模式
    if (!customChart) {
        const bpm = parseInt(bpmInput.value) || 120;
        const intervalMs = (60 / bpm) * 1000;
        if (spawnInterval) clearInterval(spawnInterval);
        spawnInterval = setInterval(spawnRandomNote, intervalMs);
    }

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
    cabinet.classList.remove('surge-mode');
    
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

// 隨機音符生成（預設模式）
function spawnRandomNote() {
    if (!gameStarted || gamePaused || customChart) return;
    createNoteElement(Math.floor(Math.random() * 4));
}

// 建立實體音符 DOM
function createNoteElement(laneIndex) {
    const targetLane = lanes[laneIndex];
    const note = document.createElement('div');
    note.classList.add('note');
    note.dataset.lane = laneIndex;
    note.style.top = '0px';
    
    targetLane.appendChild(note);
    notes.push({ element: note, lane: laneIndex, y: 0 });
}

// 遊戲主循環（同時支援隨機 BPM 模式與 JSON 譜面時間戳模式）
function updateGame() {
    if (gameStarted && !gamePaused) {
        // 如果有載入自定 JSON 譜面，根據當前音樂播放時間（秒）精準生成音符
        if (customChart && bgm.src) {
            let currentAudioTime = bgm.currentTime;
            // 檢查譜面中有沒有到達該時間點的音符（預留 1.5 秒讓音符由頂部落下）
            for (let i = customChart.length - 1; i >= 0; i--) {
                let noteData = customChart[i];
                // 如果音符時間點符合，且未被生成過
                if (!noteData.spawned && currentAudioTime >= (noteData.time - 1.5)) {
                    createNoteElement(noteData.lane);
                    noteData.spawned = true;
                }
            }
        }

        // 移動所有場上的音符
        for (let i = notes.length - 1; i >= 0; i--) {
            let n = notes[i];
            n.y += 3.5;
            n.element.style.top = n.y + 'px';

            if (n.y > 325) {
                n.element.remove();
                notes.splice(i, 1);
                combo = 0;
                comboDisplay.textContent = combo;
                updateVisualEffects();
                showFeedback('MISS', 'miss');
            }
        }
    }
    requestAnimationFrame(updateGame);
}
requestAnimationFrame(updateGame);

// 核心判定邏輯
function handleLaneHit(laneIndex, isTouch = false) {
    if (!gameStarted || gamePaused) return;

    const targetLane = lanes[laneIndex];
    targetLane.classList.add('active');
    setTimeout(() => targetLane.classList.remove('active'), 100);

    let activeChord = chords[Math.floor(combo / 5) % chords.length];
    playChordSound(activeChord.freqs);

    let minHitY = isTouch ? 195 : 210;
    let maxHitY = isTouch ? 315 : 300;
    let perfectMin = isTouch ? 235 : 245;
    let perfectMax = isTouch ? 290 : 280;

    let hitIndex = notes.findIndex(n => n.lane === laneIndex && n.y >= minHitY && n.y <= maxHitY);

    if (hitIndex !== -1) {
        const hitY = notes[hitIndex].y;
        notes[hitIndex].element.remove();
        notes.splice(hitIndex, 1);

        let multiplier = Math.floor(combo / 10) + 1;

        if (hitY >= perfectMin && hitY <= perfectMax) {
            score += 150 * multiplier;
            combo += 1;
            showFeedback('PERFECT!', 'perfect');
            triggerScreenShake();
        } else {
            score += 80 * multiplier;
            combo += 1;
            showFeedback('GOOD', 'good');
        }

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

// 1. 電腦鍵盤事件
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

    const keyMap = { 'a': 0, 's': 1, 'd': 2, 'f': 3 };
    if (keyMap.hasOwnProperty(key)) {
        handleLaneHit(keyMap[key], false);
    }
});

// 2. 手機觸控事件
lanes.forEach((lane) => {
    const laneIndex = parseInt(lane.dataset.index);
    
    lane.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleLaneHit(laneIndex, true);
    });
});