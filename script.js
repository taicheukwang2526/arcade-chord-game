let score = 0;
let combo = 0;
let gameStarted = false;
let notes = [];
let spawnInterval;

const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const chordDisplay = document.getElementById('chordDisplay');
const lanes = document.querySelectorAll('.lane');
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const hitFeedback = document.getElementById('hitFeedback');

const audioFile = document.getElementById('audioFile');
const fileNameDisplay = document.getElementById('fileName');
const bpmInput = document.getElementById('bpmInput');
const bgm = document.getElementById('bgm');

let audioCtx = null;

// 常見和弦庫 (當 Combo 達到一定條件時解鎖伴奏)
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

// 播放和弦音效（支援多頻率疊加，呈現真實和弦感）
function playChordSound(freqs) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle'; // 柔和少許的合成器音色
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
    hitFeedback.style.transform = 'translate(-50%, -60%)';
    
    setTimeout(() => {
        hitFeedback.style.opacity = '0';
        hitFeedback.style.transform = 'translate(-50%, -50%)';
    }, 300);
}

// 更新動態和弦顯示
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

startBtn.addEventListener('click', () => {
    startOverlay.style.display = 'none';
    gameStarted = true;
    score = 0;
    combo = 0;
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    chordDisplay.textContent = `準備進入節奏...`;

    if (bgm.src) {
        bgm.currentTime = 0;
        bgm.play();
    }

    const bpm = parseInt(bpmInput.value) || 120;
    const intervalMs = (60 / bpm) * 1000;
    
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnNote, intervalMs);
});

bgm.addEventListener('ended', () => {
    gameStarted = false;
    clearInterval(spawnInterval);
    startOverlay.style.display = 'flex';
    chordDisplay.textContent = `演奏完結！最終得分: ${score}`;
});

function spawnNote() {
    if (!gameStarted) return;
    
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
    if (gameStarted) {
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
    if (!gameStarted) return;
    
    const key = e.key.toLowerCase();
    const targetLane = document.querySelector(`.lane[data-key="${key}"]`);
    
    if (targetLane) {
        const laneIndex = parseInt(targetLane.dataset.index);
        
        targetLane.classList.add('active');
        setTimeout(() => targetLane.classList.remove('active'), 100);

        // 根據 Combo 觸發對應的和弦伴奏音效
        let activeChord = chords[Math.floor(combo / 5) % chords.length];
        playChordSound(activeChord.freqs);

        let hitIndex = notes.findIndex(n => n.lane === laneIndex && n.y >= 210 && n.y <= 300);

        if (hitIndex !== -1) {
            const hitY = notes[hitIndex].y;
            notes[hitIndex].element.remove();
            notes.splice(hitIndex, 1);

            let multiplier = Math.floor(combo / 10) + 1; // 高連擊有分數加成

            if (hitY >= 245 && hitY <= 280) {
                score += 150 * multiplier;
                combo += 1;
                showFeedback('PERFECT!', 'perfect');
            } else {
                score += 80 * multiplier;
                combo += 1;
                showFeedback('GOOD', 'good');
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