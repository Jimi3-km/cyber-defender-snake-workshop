// ============================================
// CyberDefender Snake — game.js
// ============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const COLS = 20;
const ROWS = 20;
const CELL = 24; // 480 / 20

// Curriculum data (loaded from lessons.json)
let CURRICULUM = [];
fetch("lessons.json")
  .then((r) => r.json())
  .then((data) => {
    CURRICULUM = data;
  })
  .catch((err) => console.warn("Could not load lessons.json:", err));

// Game state
const state = {
  status: "idle", // idle | playing | paused | gameover
  snake: [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: null,
  score: 0,
  speed: 120,
  gameInterval: null,
  sessionSeconds: 0,
  sessionTimer: null,
  threat: null,
  defense: null,
  activeCurriculum: null,
  lessonsCompleted: 0,
  totalThreats: 0,
  totalDefenses: 0,
  totalPackets: 0,
  cardTimeLeft: 20,
  cardTimer: null,
};

// ============================================
// SPAWN FUNCTIONS
// ============================================

function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (state.snake.some((s) => s.x === pos.x && s.y === pos.y));
  state.food = pos;
}

function spawnThreatPair() {
  if (CURRICULUM.length === 0) return;
  const lesson = CURRICULUM[Math.floor(Math.random() * CURRICULUM.length)];
  state.activeCurriculum = lesson;

  let tPos, dPos;
  do {
    tPos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (
    state.snake.some((s) => s.x === tPos.x && s.y === tPos.y) ||
    (state.food && state.food.x === tPos.x && state.food.y === tPos.y)
  );

  do {
    dPos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (
    state.snake.some((s) => s.x === dPos.x && s.y === dPos.y) ||
    (state.food && state.food.x === dPos.x && state.food.y === dPos.y) ||
    (tPos.x === dPos.x && tPos.y === dPos.y)
  );

  state.threat = { x: tPos.x, y: tPos.y, name: lesson.threat.name };
  state.defense = { x: dPos.x, y: dPos.y, name: lesson.defense.name };
}

// ============================================
// DRAWING
// ============================================

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawChip(cx, cy, fillColor, strokeColor, symbol, symbolColor, label) {
  const size = 36;
  const x = cx * CELL + (CELL - size) / 2;
  const y = cy * CELL + (CELL - size) / 2;
  drawRoundedRect(x, y, size, size, 6);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = symbolColor;
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, cx * CELL + CELL / 2, cy * CELL + CELL / 2);

  if (label) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "8px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      label,
      cx * CELL + CELL / 2,
      cy * CELL + CELL / 2 + size / 2 + 2,
    );
  }
}

function draw() {
  // Background
  ctx.fillStyle = "#f0faf0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = "rgba(0,166,81,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }

  // Snake
  state.snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#00C261" : "#00A651";
    drawRoundedRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 3);
    ctx.fill();
  });

  // Food
  if (state.food) {
    drawChip(
      state.food.x,
      state.food.y,
      "rgba(255,255,255,0.9)",
      "rgba(156,163,175,0.5)",
      "◈",
      "#9ca3af",
      "DATA_INT",
    );
  }

  // Threat node
  if (state.threat) {
    drawChip(
      state.threat.x,
      state.threat.y,
      "rgba(239,68,68,0.1)",
      "rgba(239,68,68,0.5)",
      "✉",
      "rgba(239,68,68,0.8)",
      "THREAT: " + state.threat.name.substring(0, 12),
    );
  }

  // Defense node
  if (state.defense) {
    drawChip(
      state.defense.x,
      state.defense.y,
      "rgba(0,166,81,0.1)",
      "rgba(0,166,81,0.5)",
      "🛡",
      "rgba(0,166,81,0.8)",
      "DEFENSE: " + state.defense.name.substring(0, 12),
    );
  }

  // Dashed tether between threat and defense
  if (state.threat && state.defense) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(
      state.threat.x * CELL + CELL / 2,
      state.threat.y * CELL + CELL / 2,
    );
    ctx.lineTo(
      state.defense.x * CELL + CELL / 2,
      state.defense.y * CELL + CELL / 2,
    );
    ctx.stroke();
    ctx.restore();
  }

  // Idle screen
  if (state.status === "idle") {
    ctx.fillStyle = "rgba(240,250,240,0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#6b7280";
    ctx.font = "16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PRESS [SPACE] TO START", canvas.width / 2, canvas.height / 2);
  }

  // Game over screen
  if (state.status === "gameover") {
    ctx.fillStyle = "rgba(240,250,240,0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#E31937";
    ctx.font = "16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "GAME OVER — PRESS [SPACE]",
      canvas.width / 2,
      canvas.height / 2,
    );
  }

  // Update coordinate display
  if (state.snake.length > 0) {
    const head = state.snake[0];
    const coordEl = document.getElementById("coordinates");
    if (coordEl)
      coordEl.textContent = `[X: ${head.x * CELL}, Y: ${head.y * CELL}]`;
  }
}

// ============================================
// GAME LOGIC
// ============================================

function move() {
  state.direction = { ...state.nextDirection };

  const head = state.snake[0];
  const newHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y,
  };

  // Wall collision
  if (
    newHead.x < 0 ||
    newHead.x >= COLS ||
    newHead.y < 0 ||
    newHead.y >= ROWS
  ) {
    gameOver();
    return;
  }

  // Self collision
  if (state.snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
    gameOver();
    return;
  }

  state.snake.unshift(newHead);

  let ate = false;

  // Food check
  if (state.food && newHead.x === state.food.x && newHead.y === state.food.y) {
    state.score += 1;
    state.totalPackets++;
    spawnFood();
    addTelemetryLog("DATA PACKET COLLECTED +1", "success");
    addScoreEntry("Data Packet", 1, "#6b7280");
    ate = true;
  }

  // Defense check
  if (
    state.defense &&
    newHead.x === state.defense.x &&
    newHead.y === state.defense.y
  ) {
    state.score += 500;
    state.totalDefenses++;
    addTelemetryLog("NODE SECURED — " + state.defense.name, "success");
    addScoreEntry("Defense: " + state.defense.name, 500, "#00A651");
    state.defense = null;
    if (state.threat) {
      state.threat = null;
    }
    ate = true;
    if (state.activeCurriculum) {
      showCard("defense");
      return;
    }
  }

  // Threat check
  if (
    state.threat &&
    newHead.x === state.threat.x &&
    newHead.y === state.threat.y
  ) {
    state.score = Math.max(0, state.score - 1000);
    state.totalThreats++;
    addTelemetryLog("THREAT DETECTED — " + state.threat.name, "danger");
    addScoreEntry("Threat: " + state.threat.name, -1000, "#E31937");
    state.threat = null;
    if (state.defense) {
      state.defense = null;
    }
    if (state.activeCurriculum) {
      showCard("threat");
      return;
    }
  }

  // Remove tail if nothing was eaten
  if (!ate) {
    state.snake.pop();
  }

  // Random chance to spawn threat pair
  if (state.threat === null && CURRICULUM.length > 0 && Math.random() < 0.02) {
    spawnThreatPair();
  }

  draw();
  updateDashboard();
}

function startGame() {
  if (state.status !== "idle" && state.status !== "gameover") return;

  // Reset state
  state.snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  state.direction = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.score = 0;
  state.status = "playing";
  state.threat = null;
  state.defense = null;
  state.activeCurriculum = null;
  state.totalThreats = 0;
  state.totalDefenses = 0;
  state.totalPackets = 0;
  state.lessonsCompleted = 0;

  // Clear log areas
  const scoreLog = document.getElementById("score-log");
  if (scoreLog) scoreLog.innerHTML = "";
  const telemetryLog = document.getElementById("telemetry-log");
  if (telemetryLog) telemetryLog.innerHTML = "";

  spawnFood();

  if (state.gameInterval) clearInterval(state.gameInterval);
  state.gameInterval = setInterval(move, state.speed);

  if (state.sessionTimer) clearInterval(state.sessionTimer);
  state.sessionSeconds = 0;
  state.sessionTimer = setInterval(() => {
    state.sessionSeconds++;
    const h = String(Math.floor(state.sessionSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((state.sessionSeconds % 3600) / 60)).padStart(
      2,
      "0",
    );
    const s = String(state.sessionSeconds % 60).padStart(2, "0");
    const timerEl = document.getElementById("session-timer");
    if (timerEl) timerEl.textContent = `[SESSION: ${h}:${m}:${s}]`;
  }, 1000);

  addTelemetryLog("SESSION INITIALIZED", "success");
  updateDashboard();
  draw();
}

function gameOver() {
  state.status = "gameover";
  if (state.gameInterval) clearInterval(state.gameInterval);
  if (state.sessionTimer) clearInterval(state.sessionTimer);
  addTelemetryLog("SESSION TERMINATED", "danger");
  updateDashboard();
  draw();
}

// ============================================
// DASHBOARD UPDATES
// ============================================

function updateDashboard() {
  const scoreEl = document.getElementById("score-value");
  if (scoreEl) scoreEl.textContent = state.score;

  const progressEl = document.getElementById("progress-fill");
  if (progressEl)
    progressEl.style.width = Math.min((state.score / 50) * 100, 100) + "%";

  const rankEl = document.getElementById("rank-percent");
  if (rankEl) rankEl.textContent = Math.min(state.score, 100) + "%";

  const threatsEl = document.getElementById("threats-count");
  if (threatsEl) threatsEl.textContent = state.totalThreats;

  const defenseEl = document.getElementById("defense-count");
  if (defenseEl) defenseEl.textContent = state.totalDefenses;

  const packetsEl = document.getElementById("packets-count");
  if (packetsEl) packetsEl.textContent = state.totalPackets;
}

function addTelemetryLog(message, type) {
  const log = document.getElementById("telemetry-log");
  if (!log) return;

  const now = new Date();
  const time = now.toTimeString().substring(0, 8);

  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-${type === "danger" ? "danger" : "success"}">${message}</span>`;
  log.prepend(entry);
}

function addScoreEntry(label, points, color) {
  const log = document.getElementById("score-log");
  if (!log) return;

  // Clear "No recent activity..." placeholder
  if (log.textContent.trim() === "No recent activity...") {
    log.innerHTML = "";
  }

  const entry = document.createElement("div");
  entry.className = "score-entry";
  const sign = points >= 0 ? "+" : "";
  entry.innerHTML = `<span class="event-label" style="color:${color}">${label}</span><span class="event-score" style="color:${color}">${sign}${points}</span>`;
  log.prepend(entry);
}

// ============================================
// LESSON CARD
// ============================================

function showCard(type) {
  const lesson = state.activeCurriculum;
  if (!lesson) return;

  const categoryEl = document.getElementById("card-category");
  const titleEl = document.getElementById("card-title");
  const threatLabel = document.querySelector(".threat-label");
  const threatDesc = document.getElementById("threat-desc");
  const defenseLabel = document.querySelector(".defense-label");
  const defenseDesc = document.getElementById("defense-desc");
  const continueBtn = document.getElementById("continue-btn");
  const overlay = document.getElementById("lesson-overlay");

  if (categoryEl) categoryEl.textContent = lesson.category;
  if (titleEl) titleEl.textContent = lesson[type].name;
  if (threatLabel) threatLabel.textContent = "THREAT: " + lesson.threat.name;
  if (threatDesc) threatDesc.textContent = lesson.threat.description;
  if (defenseLabel)
    defenseLabel.textContent = "DEFENSE: " + lesson.defense.name;
  if (defenseDesc) defenseDesc.textContent = lesson.defense.description;

  if (continueBtn) {
    continueBtn.classList.remove("defense-btn", "threat-btn");
    continueBtn.classList.add(type + "-btn");
    continueBtn.textContent =
      type === "defense"
        ? "CONTINUE (+500 PTS) [SPACE]"
        : "CONTINUE (-1000 PTS) [SPACE]";
  }

  if (overlay) overlay.classList.remove("hidden");

  state.status = "paused";
  clearInterval(state.gameInterval);

  startCardTimer();
}

function startCardTimer() {
  state.cardTimeLeft = 20;
  const timerBar = document.getElementById("card-timer-bar");
  const countdown = document.getElementById("card-countdown");

  if (state.cardTimer) clearInterval(state.cardTimer);

  state.cardTimer = setInterval(() => {
    state.cardTimeLeft -= 0.1;
    if (timerBar) timerBar.style.width = (state.cardTimeLeft / 20) * 100 + "%";
    if (countdown) countdown.textContent = Math.ceil(state.cardTimeLeft) + "s";
    if (state.cardTimeLeft <= 0) {
      dismissCard();
    }
  }, 100);
}

function extendTimer() {
  state.cardTimeLeft = Math.min(state.cardTimeLeft + 10, 30);
  const timerBar = document.getElementById("card-timer-bar");
  const countdown = document.getElementById("card-countdown");
  if (timerBar) timerBar.style.width = (state.cardTimeLeft / 20) * 100 + "%";
  if (countdown) countdown.textContent = Math.ceil(state.cardTimeLeft) + "s";
}

function dismissCard() {
  if (state.cardTimer) clearInterval(state.cardTimer);
  const overlay = document.getElementById("lesson-overlay");
  if (overlay) overlay.classList.add("hidden");
  state.status = "playing";
  state.gameInterval = setInterval(move, state.speed);
}

// ============================================
// EVENT LISTENERS
// ============================================

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (state.status === "idle" || state.status === "gameover") {
      startGame();
    } else if (state.status === "paused") {
      dismissCard();
    }
  }

  if (state.status !== "playing") return;

  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyD: { x: 1, y: 0 },
  };

  const newDir = keyMap[e.code];
  if (newDir) {
    // Prevent reversing
    if (newDir.x !== -state.direction.x || newDir.y !== -state.direction.y) {
      state.nextDirection = newDir;
    }
    e.preventDefault();
  }
});

// Difficulty buttons
document.querySelectorAll(".diff-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".diff-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.speed = parseInt(btn.dataset.speed);
    if (state.status === "playing") {
      clearInterval(state.gameInterval);
      state.gameInterval = setInterval(move, state.speed);
    }
  });
});

// Mobile controls
document.querySelectorAll(".ctrl-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state.status !== "playing") return;
    const dirMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const newDir = dirMap[btn.dataset.dir];
    if (
      newDir &&
      (newDir.x !== -state.direction.x || newDir.y !== -state.direction.y)
    ) {
      state.nextDirection = newDir;
    }
  });
});

// Lesson card buttons
const extendBtn = document.getElementById("extend-btn");
if (extendBtn) extendBtn.addEventListener("click", extendTimer);

const continueBtn = document.getElementById("continue-btn");
if (continueBtn) continueBtn.addEventListener("click", dismissCard);

// ============================================
// INITIALIZATION
// ============================================

spawnFood();
draw();
