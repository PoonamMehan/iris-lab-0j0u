(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const startBtn = document.getElementById("start-btn");
  const scoreList = document.getElementById("score-list");
  const scoreForm = document.getElementById("score-form");
  const nameInput = document.getElementById("player-name");

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 72;
  const GRAVITY = 0.42;
  const FLAP = -7.2;
  const PIPE_W = 62;
  const PIPE_GAP = 148;
  const PIPE_SPEED = 2.35;
  const PIPE_SPACING = 210;
  const BIRD_X = 96;
  const BIRD_R = 14;

  /** @type {"ready"|"playing"|"dead"} */
  let state = "ready";
  let birdY = H / 2;
  let birdV = 0;
  let birdRot = 0;
  let score = 0;
  let bestLocal = Number(localStorage.getItem("flappy-best") || 0);
  let pipes = [];
  let groundOffset = 0;
  let animId = 0;
  let lastTs = 0;
  let pendingScore = null;
  let wingPhase = 0;

  function resetWorld() {
    birdY = H * 0.42;
    birdV = 0;
    birdRot = 0;
    score = 0;
    groundOffset = 0;
    wingPhase = 0;
    pipes = [];
    let x = W + 40;
    for (let i = 0; i < 4; i++) {
      pipes.push(makePipe(x));
      x += PIPE_SPACING;
    }
  }

  function makePipe(x) {
    const margin = 56;
    const gapY = margin + Math.random() * (H - GROUND - PIPE_GAP - margin * 2);
    return { x, gapY, passed: false };
  }

  function flap() {
    if (state === "ready") {
      startGame();
      return;
    }
    if (state === "playing") {
      birdV = FLAP;
      wingPhase = 0;
    }
  }

  function startGame() {
    resetWorld();
    state = "playing";
    pendingScore = null;
    scoreForm.hidden = true;
    overlay.classList.add("hidden");
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    loop(lastTs);
  }

  function die() {
    if (state !== "playing") return;
    state = "dead";
    bestLocal = Math.max(bestLocal, score);
    localStorage.setItem("flappy-best", String(bestLocal));
    pendingScore = score;
    overlayTitle.textContent = "Game over";
    overlayMsg.textContent =
      score === 0
        ? "Score: 0 — try again!"
        : `Score: ${score} · Best: ${bestLocal}`;
    startBtn.textContent = "Play again";
    overlay.classList.remove("hidden");
    if (score > 0) {
      scoreForm.hidden = false;
      nameInput.value = localStorage.getItem("flappy-name") || "";
      nameInput.focus();
    }
  }

  function update(dt) {
    const steps = Math.min(dt / 16.67, 2.5);
    wingPhase += 0.18 * steps;

    if (state !== "playing") {
      if (state === "ready") {
        birdY = H * 0.42 + Math.sin(performance.now() / 320) * 8;
        birdRot = 0;
      }
      groundOffset = (groundOffset + PIPE_SPEED * 0.6 * steps) % 28;
      return;
    }

    birdV += GRAVITY * steps;
    birdY += birdV * steps;
    birdRot = Math.max(-0.55, Math.min(1.1, birdV * 0.08));
    groundOffset = (groundOffset + PIPE_SPEED * steps) % 28;

    for (const p of pipes) {
      p.x -= PIPE_SPEED * steps;
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        score += 1;
      }
    }

    while (pipes.length && pipes[0].x + PIPE_W < -10) {
      pipes.shift();
      const last = pipes[pipes.length - 1];
      pipes.push(makePipe(last.x + PIPE_SPACING));
    }

    if (birdY + BIRD_R >= H - GROUND || birdY - BIRD_R <= 0) {
      die();
      return;
    }

    for (const p of pipes) {
      if (hitPipe(p)) {
        die();
        return;
      }
    }
  }

  function hitPipe(p) {
    const r = BIRD_R * 0.88;
    const left = p.x;
    const right = p.x + PIPE_W;
    const gapTop = p.gapY;
    const gapBot = p.gapY + PIPE_GAP;

    function circleHitsRect(rx, ry, rw, rh) {
      const cx = Math.max(rx, Math.min(BIRD_X, rx + rw));
      const cy = Math.max(ry, Math.min(birdY, ry + rh));
      const dx = BIRD_X - cx;
      const dy = birdY - cy;
      return dx * dx + dy * dy < r * r;
    }

    return (
      circleHitsRect(left, 0, PIPE_W, gapTop) ||
      circleHitsRect(left, gapBot, PIPE_W, H - GROUND - gapBot)
    );
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#6ec6ff");
    g.addColorStop(0.7, "#b8e4ff");
    g.addColorStop(1, "#d4f0c8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    drawCloud(60, 70, 1);
    drawCloud(260, 110, 0.75);
    drawCloud(180, 50, 0.55);
  }

  function drawCloud(x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y - 6 * s, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 44 * s, y, 16 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipes() {
    for (const p of pipes) {
      drawPipeColumn(p.x, 0, p.gapY, true);
      drawPipeColumn(p.x, p.gapY + PIPE_GAP, H - GROUND - (p.gapY + PIPE_GAP), false);
    }
  }

  function drawPipeColumn(x, y, h, isTop) {
    if (h <= 0) return;
    ctx.fillStyle = "#3d9e3d";
    ctx.fillRect(x, y, PIPE_W, h);
    ctx.fillStyle = "#4cb84c";
    ctx.fillRect(x + 6, y, 10, h);
    ctx.fillStyle = "#2d7a2d";
    ctx.fillRect(x + PIPE_W - 8, y, 8, h);

    const lipH = 22;
    const lipY = isTop ? y + h - lipH : y;
    ctx.fillStyle = "#359635";
    ctx.fillRect(x - 4, lipY, PIPE_W + 8, lipH);
    ctx.strokeStyle = "#246024";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, lipY, PIPE_W + 8, lipH);
  }

  function drawGround() {
    const gy = H - GROUND;
    ctx.fillStyle = "#c4a35a";
    ctx.fillRect(0, gy, W, GROUND);
    ctx.fillStyle = "#5cb85c";
    ctx.fillRect(0, gy, W, 18);
    ctx.fillStyle = "#4aa04a";
    for (let x = -groundOffset; x < W + 28; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, gy + 18);
      ctx.lineTo(x + 14, gy + 4);
      ctx.lineTo(x + 28, gy + 18);
      ctx.fill();
    }
    ctx.fillStyle = "#a88848";
    for (let x = -groundOffset; x < W; x += 16) {
      ctx.fillRect(x, gy + 28, 10, 3);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(BIRD_X, birdY);
    ctx.rotate(birdRot);

    const wing = Math.sin(wingPhase) * 7;
    ctx.fillStyle = "#f7d046";
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f0c030";
    ctx.beginPath();
    ctx.ellipse(-2, 2, BIRD_R - 2, BIRD_R - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ef9f2a";
    ctx.beginPath();
    ctx.ellipse(-4, wing, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(6, -4, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(7.5, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f08a24";
    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(22, 2);
    ctx.lineTo(12, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawScore() {
    if (state === "ready") return;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.font = "bold 42px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(score), W / 2 + 2, 58);
    ctx.fillStyle = "#fff";
    ctx.fillText(String(score), W / 2, 56);
  }

  function render() {
    drawSky();
    drawPipes();
    drawGround();
    drawBird();
    drawScore();
  }

  function loop(ts) {
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    update(dt);
    render();
    if (state !== "dead") {
      animId = requestAnimationFrame(loop);
    } else {
      render();
    }
  }

  async function loadScores() {
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      renderScoreList(data.scores || []);
    } catch {
      scoreList.innerHTML = '<li class="empty">Could not load scores</li>';
    }
  }

  function renderScoreList(scores) {
    if (!scores.length) {
      scoreList.innerHTML = '<li class="empty">No scores yet — be the first!</li>';
      return;
    }
    scoreList.innerHTML = scores
      .map((s) => `<li><strong>${escapeHtml(s.name)}</strong> — ${s.score}</li>`)
      .join("");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  scoreForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (pendingScore == null) return;
    const name = nameInput.value.trim() || "Player";
    localStorage.setItem("flappy-name", name);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score: pendingScore }),
      });
      const data = await res.json();
      renderScoreList(data.scores || []);
      scoreForm.hidden = true;
      pendingScore = null;
    } catch {
      overlayMsg.textContent = "Could not save score — try again later.";
    }
  });

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startGame();
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    flap();
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      if (state === "dead" && !overlay.classList.contains("hidden")) {
        startGame();
      } else {
        flap();
      }
    }
  });

  resetWorld();
  render();
  animId = requestAnimationFrame(loop);
  loadScores();
})();
