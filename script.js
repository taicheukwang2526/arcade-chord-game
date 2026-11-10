let score = 0;
let combo = 0;
let gameStarted = false;
let notes = [];
let spawnInterval;

const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const lanes = document.querySelectorAll('.lane');
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');

const audioFile = document.getElementById('audioFile');
const fileNameDisplay = document.getElementById('fileName');
const bgm = document.getElementById('bgm');

let audioCtx = null;

// 讀取上載的 MP3 檔案
audioFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `已選擇：${file.name}`;
        const fileURL = URL.createObjectURL(file);
        bgm.src = fileURL;
    }
});

// 打擊音效 (Web Audio API)
function playHitSound(freq = 440) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// 點擊開始遊戲
startBtn.addEventListener('click', () => {
    startOverlay.style.display = 'none';
    gameStarted = true;
    score = 0;
    combo = 0;
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;

    // 如果有上載音樂就播放 MP3
    if (bgm.src) {
        bgm.currentTime = 0;
        bgm.play();
    }
    
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnNote, 700);
});

// 當歌曲完結時停止遊戲
bgm.addEventListener('ended', () => {
    gameStarted = false;
    clearInterval(spawnInterval);
    startOverlay.style.display = 'flex';
    fileNameDisplay.textContent += ' (已完結)';
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

// 遊戲主循環
function updateGame() {
    if (gameStarted) {
        for (let i = notes.length - 1; i >= 0; i--) {
            let n = notes[i];
            n.y += 3.5;
            n.element.style.top = n.y + 'px';

            if (n.y > 300) {
                n.element.remove();
                notes.splice(i, 1);
                combo = 0;
                comboDisplay.textContent = combo;
            }
        }
    }
    requestAnimationFrame(updateGame);
}
requestAnimationFrame(updateGame);

// 鍵盤判定
window.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    
    const key = e.key.toLowerCase();
    const targetLane = document.querySelector(`.lane[data-key="${key}"]`);
    
    if (targetLane) {
        const laneIndex = parseInt(targetLane.dataset.index);
        
        targetLane.classList.add('active');
        setTimeout(() => targetLane.classList.remove('active'), 100);

        const freqs = [261.63, 329.63, 392.00, 523.25];
        playHitSound(freqs[laneIndex]);

        let hitIndex = notes.findIndex(n => n.lane === laneIndex && n.y >= 220 && n.y <= 300);

        if (hitIndex !== -1) {
            notes[hitIndex].element.remove();
            notes.splice(hitIndex, 1);
            score += 100;
            combo += 1;
        } else {
            combo = 0;
        }

        scoreDisplay.textContent = score;
        comboDisplay.textContent = combo;
    }
});