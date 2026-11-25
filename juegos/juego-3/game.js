(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.querySelector("#score-value");
  const levelValue = document.querySelector("#level-value");
  const livesValue = document.querySelector("#lives-value");
  const powerValue = document.querySelector("#power-value");
  const powerLabel = document.querySelector(".power-readout .hud-label");
  const message = document.querySelector("#game-message");
  const startButton = document.querySelector("#start-button");
  const pauseButton = document.querySelector("#pause-button");
  const titleScreen = document.querySelector("#title-screen");
  const titleMenu = document.querySelector("#title-menu");
  const titleArt = document.querySelector("#title-art");
  const titleArtCtx = titleArt.getContext("2d");
  const gameContent = document.querySelector("#game-content");
  const customizePanel = document.querySelector("#customize-panel");
  const continueButton = document.querySelector("#menu-continue");
  const progressMessage = document.querySelector("#progress-message");
  const endingScreen = document.querySelector("#ending-screen");
  const endingArt = document.querySelector("#ending-art");
  const endingCtx = endingArt.getContext("2d");
  const runnerFailure = document.querySelector("#runner-failure");

  const TILE = 32;
  const COLS = 21;
  const ROWS = 17;
  const WIDTH = COLS * TILE;
  const HEIGHT = ROWS * TILE;
  const INITIAL_LIVES = 4;
  const LOSSES_BEFORE_SHIELD = 3;
  const SHIELD_DURATION = 30000;
  const LEVEL_TWO_POWER_DURATION = 3000;
  const RUNNER_DURATION = 28000;
  const RUNNER_CHASER_DELAY = 3000;
  const RUNNER_PLAYER_X = 172;
  const RUNNER_GROUND = 434;
  const RUNNER_SPEED = 4.4;
  const LUMO_COLORS = ["#7bec78", "#ef5548", "#32c9c4", "#e34ec2"];
  const HOUSE = { x: 10, y: 8 };
  const TUNNEL_ROW = Math.floor(ROWS / 2);
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const BASE_PLAYER = { x: 3, y: 6 };
  const BASE_ENEMIES = [
    { type: "amber", x: 9, y: 8 },
    { type: "blue", x: 10, y: 8 },
    { type: "pink", x: 11, y: 8 },
    { type: "red", x: 10, y: 9 },
  ];
  const BASE_POWER_CELLS = [
    { x: 1, y: 1 },
    { x: 19, y: 1 },
    { x: 1, y: 15 },
    { x: 19, y: 15 },
  ];
  const FLOORS = [480, 385, 290, 195, 100];
  const LADDERS = [
    { x: 140, lower: 480, upper: 385 },
    { x: 530, lower: 385, upper: 290 },
    { x: 150, lower: 290, upper: 195 },
    { x: 520, lower: 195, upper: 100 },
  ];

  const state = {
    mode: "ready",
    level: 1,
    score: 0,
    lives: INITIAL_LIVES,
    lossStreak: 0,
    immunityUntil: 0,
    lastTime: 0,
    transitionTime: 0,
    powerUntil: 0,
    powerWasActive: false,
    ghostReleaseAt: 0,
    ghostsReleased: false,
    maze: null,
    player: null,
    enemies: [],
    platform: null,
    runner: null,
    menuOpen: true,
    pendingStartLevel: 1,
    unlockedLevel: 1,
    lumoColor: "#7bec78",
    hatEnabled: true,
    message: "Pulsa una flecha o WASD para empezar en esa dirección.",
  };

  try {
    const savedLevel = Number(window.localStorage.getItem("lumo-unlocked-level"));
    if (Number.isInteger(savedLevel) && savedLevel >= 1 && savedLevel <= 3) {
      state.unlockedLevel = savedLevel;
    }
    const savedColor = window.localStorage.getItem("lumo-color");
    if (LUMO_COLORS.includes(savedColor)) state.lumoColor = savedColor;
    const savedHat = window.localStorage.getItem("lumo-hat");
    if (savedHat === "false") state.hatEnabled = false;
  } catch (error) {
    console.error("No se pudo leer la personalización o el progreso guardado.", error);
    progressMessage.textContent = "El guardado no está disponible en este navegador.";
  }

  function updateMenuProgress() {
    continueButton.hidden = state.unlockedLevel <= 1;
    if (!continueButton.hidden) {
      continueButton.textContent = `Continuar desde nivel ${state.unlockedLevel}`;
    }
  }

  function saveUnlockedLevel(level) {
    if (level <= state.unlockedLevel) return;
    state.unlockedLevel = level;
    updateMenuProgress();
    try {
      window.localStorage.setItem("lumo-unlocked-level", String(level));
    } catch (error) {
      console.error("No se pudo guardar el nivel desbloqueado.", error);
      progressMessage.textContent = "No se pudo guardar el progreso en este navegador.";
    }
  }

  function saveCustomization() {
    try {
      window.localStorage.setItem("lumo-color", state.lumoColor);
      window.localStorage.setItem("lumo-hat", String(state.hatEnabled));
    } catch (error) {
      console.error("No se pudo guardar la personalización de Lumo.", error);
      progressMessage.textContent = "No se pudo guardar la personalización en este navegador.";
    }
  }

  function showTitleScreen() {
    state.mode = "menu";
    state.menuOpen = true;
    state.level = 1;
    state.maze = null;
    state.player = null;
    state.enemies = [];
    state.platform = null;
    state.runner = null;
    state.powerUntil = 0;
    state.pendingStartLevel = 1;
    gameContent.hidden = true;
    endingScreen.hidden = true;
    titleScreen.hidden = false;
    titleMenu.hidden = false;
    customizePanel.hidden = true;
    runnerFailure.hidden = true;
    pauseButton.disabled = true;
    Object.keys(keys).forEach((direction) => { keys[direction] = false; });
    updateMenuProgress();
  }

  function enterGameFromMenu(level) {
    state.pendingStartLevel = level;
    state.level = level;
    state.mode = "ready";
    state.menuOpen = false;
    state.maze = null;
    state.player = null;
    state.enemies = [];
    state.platform = null;
    state.runner = null;
    state.powerUntil = 0;
    titleScreen.hidden = true;
    endingScreen.hidden = true;
    gameContent.hidden = false;
    runnerFailure.hidden = true;
    startButton.disabled = false;
    startButton.textContent = "Volver al título";
    pauseButton.disabled = true;
    pauseButton.textContent = "Pausar";
    setMessage(`Listo para el nivel ${level}: pulsa una flecha o WASD para empezar en esa dirección.`);
    Object.keys(keys).forEach((direction) => { keys[direction] = false; });
    updateHud();
  }

  function beginRequestedLevel(direction) {
    const level = state.pendingStartLevel;
    if (level === 1) {
      beginGame(direction);
      return;
    }
    state.score = 0;
    state.lives = INITIAL_LIVES;
    state.lossStreak = 0;
    state.immunityUntil = 0;
    state.powerUntil = 0;
    state.initialDirection = direction;
    state.platform = null;
    state.maze = null;
    state.player = null;
    state.enemies = [];
    runnerFailure.hidden = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pausar";
    startButton.disabled = false;
    startButton.textContent = "Volver al título";
    if (level === 2) {
      state.level = 2;
      resetPlatform();
      keys[direction] = true;
      state.mode = "playing";
      setMessage("Nivel 2: sube las escaleras y alcanza la salida. La carga dura 3 segundos.");
    } else {
      state.level = 3;
      startRunnerLevel(direction === "up");
    }
    updateHud();
  }

  function makeBaseMaze() {
    const grid = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) =>
        x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? "#" : ".",
      ),
    );
    const verticals = [
      [5, [2, 3, 4, 7, 8, 9, 12, 13, 14]],
      [10, [2, 3, 4, 6, 7, 10, 11, 13, 14]],
      [15, [2, 3, 4, 7, 8, 9, 12, 13, 14]],
    ];
    const horizontals = [
      [4, [2, 3, 4, 7, 8, 9, 12, 13, 14, 17, 18]],
      [8, [2, 3, 4, 7, 8, 9, 11, 12, 13, 16, 17, 18]],
      [12, [2, 3, 4, 7, 8, 9, 12, 13, 14, 16, 17, 18]],
    ];
    verticals.forEach(([x, rows]) => rows.forEach((y) => { grid[y][x] = "#"; }));
    horizontals.forEach(([y, cols]) => cols.forEach((x) => { grid[y][x] = "#"; }));
    const houseLeft = HOUSE.x - 2;
    const houseRight = HOUSE.x + 2;
    const houseTop = HOUSE.y - 1;
    const houseBottom = HOUSE.y + 2;
    for (let y = houseTop; y <= houseBottom; y += 1) {
      grid[y][houseLeft] = "#";
      grid[y][houseRight] = "#";
    }
    for (let x = houseLeft; x <= houseRight; x += 1) {
      grid[houseTop][x] = "#";
      grid[houseBottom][x] = "#";
    }
    for (let y = HOUSE.y; y <= HOUSE.y + 1; y += 1) {
      for (let x = HOUSE.x - 1; x <= HOUSE.x + 1; x += 1) grid[y][x] = " ";
    }
    grid[houseTop][HOUSE.x] = " ";
    grid[houseTop - 1][HOUSE.x] = " ";
    for (let x = 1; x < houseLeft; x += 1) grid[TUNNEL_ROW][x] = " ";
    for (let x = houseRight + 1; x < COLS - 1; x += 1) grid[TUNNEL_ROW][x] = " ";
    grid[TUNNEL_ROW][0] = " ";
    grid[TUNNEL_ROW][COLS - 1] = " ";
    return grid;
  }

  function mirrored(position, inverted) {
    return inverted
      ? { x: COLS - 1 - position.x, y: ROWS - 1 - position.y }
      : { x: position.x, y: position.y };
  }

  function createMaze(level) {
    const inverted = level === 3;
    const source = makeBaseMaze();
    const grid = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) =>
        source[inverted ? ROWS - 1 - y : y][inverted ? COLS - 1 - x : x],
      ),
    );
    const playerStart = mirrored(BASE_PLAYER, inverted);
    grid[playerStart.y][playerStart.x] = " ";

    const enemies = BASE_ENEMIES.map((definition) => {
      const position = mirrored(definition, inverted);
      grid[position.y][position.x] = " ";
      return {
        ...definition,
        ...position,
        home: { ...position },
        direction: "left",
        elapsed: 0,
        releaseAt: 0,
        trail: [],
        reversePath: [],
      };
    });

    const powerCells = BASE_POWER_CELLS.map((cell) => mirrored(cell, inverted));
    powerCells.forEach(({ x, y }) => { grid[y][x] = "o"; });

    return {
      grid,
      inverted,
      remaining: grid.reduce(
        (total, row) => total + row.filter((cell) => cell === "." || cell === "o").length,
        0,
      ),
      playerStart,
      enemies,
    };
  }

  function resetMazeActors() {
    const start = state.maze.playerStart;
    const direction = state.initialDirection || "left";
    const now = performance.now();
    state.ghostReleaseAt = performance.now() + 2000;
    state.ghostsReleased = false;
    state.powerWasActive = false;
    state.player = {
      x: start.x,
      y: start.y,
      fromX: start.x,
      fromY: start.y,
      moveStarted: now,
      moveDuration: 175,
      direction,
      queued: direction,
      elapsed: 0,
    };
    state.enemies.forEach((enemy) => {
      enemy.x = enemy.home.x;
      enemy.y = enemy.home.y;
      enemy.fromX = enemy.x;
      enemy.fromY = enemy.y;
      enemy.moveStarted = now;
      enemy.moveDuration = 400;
      enemy.direction = "left";
      enemy.elapsed = 0;
      enemy.releaseAt = state.ghostReleaseAt;
      enemy.trail = [];
      enemy.reversePath = [];
    });
  }

  function resetPlatform() {
    state.platform = {
      x: 48,
      feet: FLOORS[0],
      minis: [],
      spawnElapsed: 0,
      powerOrb: { x: 330, feet: FLOORS[2], active: true },
      powerUntil: 0,
      friendX: 48,
      friendY: FLOORS[0],
    };
  }

  function updateHud() {
    scoreValue.textContent = String(state.score).padStart(5, "0");
    levelValue.textContent = `${state.level} / 3`;
    livesValue.textContent = Array.from({ length: INITIAL_LIVES }, (_, index) =>
      index < state.lives ? "♥" : "♡",
    ).join(" ");
    const now = performance.now();
    const immunityRemaining = state.immunityUntil - now;
    const powerRemaining = Math.max(state.powerUntil, state.platform?.powerUntil || 0) - now;
    powerLabel.textContent = state.runner ? "TIEMPO" : "DEFENSA";
    powerValue.textContent = state.runner
      ? `${Math.max(0, Math.ceil((RUNNER_DURATION - state.runner.elapsed) / 1000))} s`
      : immunityRemaining > 0
      ? `ESCUDO ${Math.ceil(immunityRemaining / 1000)} s`
      : powerRemaining > 0
        ? `${(powerRemaining / 1000).toFixed(1)} s`
        : "LISTO";
    powerValue.classList.toggle("shield-active", immunityRemaining > 0);
  }

  function setMessage(text) {
    state.message = text;
    message.textContent = text;
  }

  function beginGame(initialDirection) {
    state.level = 1;
    state.score = 0;
    state.lives = INITIAL_LIVES;
    state.lossStreak = 0;
    state.immunityUntil = 0;
    state.powerUntil = 0;
    state.powerWasActive = false;
    state.initialDirection = initialDirection;
    state.maze = createMaze(1);
    state.enemies = state.maze.enemies;
    resetMazeActors();
    state.mode = "playing";
    state.platform = null;
    state.runner = null;
    runnerFailure.hidden = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pausar";
    setMessage("Nivel 1: recoge todas las motas. Las grandes activan el pulso.");
    startButton.textContent = "Volver al título";
    startButton.disabled = false;
    updateHud();
  }

  function startNextLevel() {
    state.powerUntil = 0;
    state.lossStreak = 0;
    if (state.level === 1) {
      saveUnlockedLevel(2);
      state.level = 2;
      state.platform = null;
      resetPlatform();
      state.mode = "playing";
      setMessage("Nivel 2: sube las escaleras y alcanza la salida. La carga dura 3 segundos.");
    } else if (state.level === 2) {
      saveUnlockedLevel(3);
      state.level = 3;
      startRunnerLevel(false);
      state.platform = null;
      setMessage("Nivel 3: corre por el pasillo, salta los obstáculos y evita al titán.");
    } else {
      state.mode = "won";
      state.platform = null;
      state.runner = null;
      gameContent.hidden = true;
      endingScreen.hidden = false;
      drawEndingArt();
      setMessage(`¡Aventura completada! Puntuación final: ${state.score}.`);
      pauseButton.disabled = true;
      startButton.disabled = true;
    }
    updateHud();
  }

  function advanceLevel() {
    state.mode = "transition";
    state.transitionTime = 1250;
    if (state.level === 1) {
      setMessage("¡Laberinto despejado! Prepárate para el desafío de plataformas.");
    } else if (state.level === 2) {
      setMessage("¡Salida alcanzada! El último pasillo te espera.");
    } else {
      setMessage("¡Lo conseguiste! Lumo y Luma celebran tu aventura.");
    }
  }

  function canMove(x, y, direction) {
    const next = nextPosition(x, y, direction);
    return Boolean(next && state.maze.grid[next.y][next.x] !== "#");
  }

  function nextPosition(x, y, direction) {
    const delta = DIRS[direction];
    if (!delta) return null;
    let nextX = x + delta.x;
    const nextY = y + delta.y;
    if (y === TUNNEL_ROW && nextY === TUNNEL_ROW) {
      if (nextX < 0) nextX = COLS - 1;
      else if (nextX >= COLS) nextX = 0;
    }
    if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS) return null;
    return { x: nextX, y: nextY };
  }

  function collectCell() {
    const cell = state.maze.grid[state.player.y][state.player.x];
    if (cell === ".") {
      state.score += 10;
      state.maze.grid[state.player.y][state.player.x] = " ";
      state.maze.remaining -= 1;
    } else if (cell === "o") {
      state.score += 50;
      state.maze.grid[state.player.y][state.player.x] = " ";
      state.maze.remaining -= 1;
      state.powerUntil = performance.now() + 10000;
      state.powerWasActive = true;
      state.enemies.forEach((enemy) => {
        enemy.reversePath = enemy.trail.slice().reverse();
        enemy.trail = [];
      });
      setMessage("¡Pulso activado! Los espíritus retroceden; el ámbar ahora es tu aliado.");
    }
    if (state.maze.remaining === 0) advanceLevel();
  }

  function movePlayerInMaze(now) {
    const player = state.player;
    if (canMove(player.x, player.y, player.queued)) player.direction = player.queued;
    if (!canMove(player.x, player.y, player.direction)) return;
    const next = nextPosition(player.x, player.y, player.direction);
    if (!next) return;
    player.fromX = Math.abs(next.x - player.x) > 1 ? next.x : player.x;
    player.fromY = player.y;
    player.x = next.x;
    player.y = next.y;
    player.moveStarted = now;
    player.moveDuration = 175;
    collectCell();
  }

  function distanceMap(targetX, targetY) {
    const distances = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
    const queue = [{ x: targetX, y: targetY }];
    if (!state.maze.grid[targetY] || state.maze.grid[targetY][targetX] === "#") {
      return distances;
    }
    distances[targetY][targetX] = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const direction of Object.keys(DIRS)) {
        const next = nextPosition(current.x, current.y, direction);
        if (!next || state.maze.grid[next.y][next.x] === "#" ||
            distances[next.y][next.x] !== Infinity) continue;
        distances[next.y][next.x] = distances[current.y][current.x] + 1;
        queue.push(next);
      }
    }
    return distances;
  }

  function chooseOpenTarget(x, y) {
    let targetX = Math.max(1, Math.min(COLS - 2, Math.round(x)));
    let targetY = Math.max(1, Math.min(ROWS - 2, Math.round(y)));
    if (state.maze.grid[targetY][targetX] !== "#") return { x: targetX, y: targetY };
    const queue = [{ x: targetX, y: targetY }];
    const visited = new Set([`${targetX},${targetY}`]);
    while (queue.length) {
      const current = queue.shift();
      for (const direction of Object.keys(DIRS)) {
        const next = nextPosition(current.x, current.y, direction);
        if (!next || next.y < 1 || next.y >= ROWS - 1) continue;
        const key = `${next.x},${next.y}`;
        if (visited.has(key)) continue;
        if (state.maze.grid[next.y][next.x] !== "#") return next;
        visited.add(key);
        queue.push(next);
      }
    }
    return { x: state.player.x, y: state.player.y };
  }

  function enemyTarget(enemy) {
    const player = state.player;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    if (enemy.type === "blue") {
      const signX = dx === 0 ? 1 : Math.sign(dx);
      const signY = dy === 0 ? 1 : Math.sign(dy);
      return chooseOpenTarget(player.x + signX * 3, player.y + signY * 2);
    }
    if (enemy.type === "pink") {
      return { x: player.x, y: player.y, erratic: true };
    }
    if (enemy.type === "red") {
      if (Math.abs(dx) + Math.abs(dy) <= 3) {
        return chooseOpenTarget(player.x - DIRS[player.direction].x * 3, player.y - DIRS[player.direction].y * 3);
      }
      return chooseOpenTarget(
        player.x + DIRS[player.direction].x * 2,
        player.y + DIRS[player.direction].y * 2,
      );
    }
    return { x: player.x, y: player.y };
  }

  function allyTarget(enemy, now) {
    const target = state.enemies
      .filter((candidate) => candidate !== enemy && now >= candidate.releaseAt)
      .sort((a, b) => {
        const distanceA = Math.abs(a.x - enemy.x) + Math.abs(a.y - enemy.y);
        const distanceB = Math.abs(b.x - enemy.x) + Math.abs(b.y - enemy.y);
        return distanceA - distanceB;
      })[0];
    return target ? { x: target.x, y: target.y } : { x: state.player.x, y: state.player.y };
  }

  function bestStep(enemy, target, frightened) {
    const choices = Object.keys(DIRS)
      .filter((direction) => canMove(enemy.x, enemy.y, direction))
      .map((direction) => ({ direction, ...nextPosition(enemy.x, enemy.y, direction) }));
    if (!choices.length) return null;
    const distances = distanceMap(target.x, target.y);
    choices.sort((a, b) => {
      const scoreA = distances[a.y][a.x] + (a.direction === enemy.direction ? -0.15 : 0);
      const scoreB = distances[b.y][b.x] + (b.direction === enemy.direction ? -0.15 : 0);
      return frightened ? scoreB - scoreA : scoreA - scoreB;
    });
    if (target.erratic && Math.random() < 0.62) {
      const nearBest = choices.filter((choice) =>
        distances[choice.y][choice.x] <= distances[choices[0].y][choices[0].x] + 2,
      );
      return nearBest[Math.floor(Math.random() * nearBest.length)];
    }
    return choices[0];
  }

  function moveEnemy(enemy, now, dt) {
    if (now < enemy.releaseAt) return;
    const powered = now < state.powerUntil;
    const speedFactor = state.level === 3 ? 1.2 : 1;
    const baseInterval = enemy.type === "amber" ? 400 : enemy.type === "blue" ? 560 : 480;
    const moveDuration = baseInterval / speedFactor;
    enemy.elapsed += dt;
    if (enemy.elapsed < moveDuration) return;
    enemy.elapsed = 0;

    let next;
    if (powered && enemy.reversePath.length) {
      next = enemy.reversePath.shift();
    } else {
      const target = powered && enemy.type === "amber"
        ? allyTarget(enemy, now)
        : powered
          ? {
            x: enemy.x + Math.sign(enemy.x - state.player.x) * 5,
            y: enemy.y + Math.sign(enemy.y - state.player.y) * 5,
          }
          : enemyTarget(enemy);
      const openTarget = chooseOpenTarget(target.x, target.y);
      openTarget.erratic = target.erratic;
      next = bestStep(enemy, openTarget, powered);
    }
    if (!next) return;
    enemy.fromX = Math.abs(next.x - enemy.x) > 1 ? next.x : enemy.x;
    enemy.fromY = enemy.y;
    enemy.trail.push({ x: enemy.x, y: enemy.y });
    if (enemy.trail.length > 80) enemy.trail.shift();
    enemy.x = next.x;
    enemy.y = next.y;
    enemy.moveStarted = now;
    enemy.moveDuration = moveDuration;
    enemy.direction = Object.keys(DIRS).find((direction) =>
      DIRS[direction].x === next.x - enemy.trail[enemy.trail.length - 1].x &&
      DIRS[direction].y === next.y - enemy.trail[enemy.trail.length - 1].y,
    ) || enemy.direction;
  }

  function returnEnemyToHouse(enemy, delay = 2000) {
    enemy.x = enemy.home.x;
    enemy.y = enemy.home.y;
    enemy.fromX = enemy.x;
    enemy.fromY = enemy.y;
    enemy.moveStarted = performance.now();
    enemy.moveDuration = 400;
    enemy.direction = "up";
    enemy.elapsed = 0;
    enemy.releaseAt = performance.now() + delay;
    enemy.trail = [];
    enemy.reversePath = [];
  }

  function areAdjacent(a, b) {
    if (a.y === b.y && a.y === TUNNEL_ROW &&
        ((a.x === 0 && b.x === COLS - 1) || (a.x === COLS - 1 && b.x === 0))) {
      return true;
    }
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;
  }

  function loseLife() {
    state.lives -= 1;
    state.lossStreak += 1;
    state.powerUntil = 0;
    if (state.platform) state.platform.powerUntil = 0;
    const shieldGranted = state.lossStreak >= LOSSES_BEFORE_SHIELD;
    if (shieldGranted) {
      state.lossStreak = 0;
      state.immunityUntil = performance.now() + SHIELD_DURATION;
      setMessage("¡Escudo de ayuda! Eres inmune a los fantasmas durante 30 segundos.");
    }
    if (state.lives <= 0) {
      state.mode = "gameover";
      setMessage(`Fin de la partida. Puntuación: ${state.score}.`);
      startButton.textContent = "Volver al título";
      startButton.disabled = false;
      pauseButton.disabled = true;
      return;
    }
    if (state.level === 2) {
      state.platform.x = 48;
      state.platform.feet = FLOORS[0];
      state.platform.minis = [];
      if (!shieldGranted) {
        setMessage("¡Te alcanzaron! Conservas tus vidas restantes; vuelve a las escaleras.");
      }
    } else {
      resetMazeActors();
      if (!shieldGranted) {
        setMessage("¡Te atraparon! Sigue buscando motas y activa un pulso para escapar.");
      }
    }
  }

  function handleMazeCollisions() {
    const now = performance.now();
    if (now < state.immunityUntil) return;
    const player = state.player;
    if (now < state.powerUntil) {
      const ally = state.enemies.find((enemy) => enemy.type === "amber");
      state.enemies.filter((enemy) => enemy.type !== "amber" && now >= enemy.releaseAt).forEach((enemy) => {
        if (!areAdjacent(ally, enemy)) return;
        returnEnemyToHouse(enemy);
        state.score += 50;
      });
    }
    for (const enemy of state.enemies) {
      if (now < enemy.releaseAt || !areAdjacent(player, enemy)) continue;
      const powered = now < state.powerUntil;
      if (powered && enemy.type === "amber") {
        continue;
      } else if (powered) {
        state.score += 100;
        returnEnemyToHouse(enemy);
      } else {
        loseLife();
        return;
      }
    }
  }

  function updateMaze(dt) {
    const now = performance.now();
    if (!state.ghostsReleased && now >= state.ghostReleaseAt) {
      state.ghostsReleased = true;
      setMessage("¡Los espíritus salen de la caja!");
    }
    if (state.powerWasActive && now >= state.powerUntil) {
      state.powerWasActive = false;
      const amber = state.enemies.find((enemy) => enemy.type === "amber");
      if (amber) returnEnemyToHouse(amber);
      setMessage("El pulso terminó; el espíritu ámbar volvió a la caja.");
    }
    const playerInterval = 175;
    state.player.elapsed += dt;
    let playerSteps = 0;
    while (state.player.elapsed >= playerInterval && playerSteps < 3) {
      state.player.elapsed -= playerInterval;
      movePlayerInMaze(now);
      playerSteps += 1;
      if (state.mode !== "playing") return;
    }
    state.enemies.forEach((enemy) => moveEnemy(enemy, now, dt));
    if (now >= state.powerUntil) {
      state.enemies.forEach((enemy) => {
        enemy.reversePath = [];
      });
    }
    handleMazeCollisions();
  }

  function ladderForPlayer() {
    return LADDERS.find((ladder) =>
      Math.abs(state.platform.x - ladder.x) < 22 &&
      state.platform.feet <= ladder.lower + 2 &&
      state.platform.feet >= ladder.upper - 2,
    );
  }

  function updatePlatform(dt) {
    const platform = state.platform;
    const speed = 2.3;
    if (keys.left) platform.x -= speed * dt / 16.67;
    if (keys.right) platform.x += speed * dt / 16.67;
    platform.x = Math.max(18, Math.min(WIDTH - 18, platform.x));
    const ladder = ladderForPlayer();
    if (ladder && keys.up) {
      platform.x = ladder.x;
      platform.feet = Math.max(ladder.upper, platform.feet - speed * dt / 16.67);
    } else if (ladder && keys.down) {
      platform.x = ladder.x;
      platform.feet = Math.min(ladder.lower, platform.feet + speed * dt / 16.67);
    }

    if (platform.powerOrb.active &&
        Math.abs(platform.x - platform.powerOrb.x) < 23 &&
        Math.abs(platform.feet - platform.powerOrb.feet) < 22) {
      platform.powerOrb.active = false;
      platform.powerUntil = performance.now() + LEVEL_TWO_POWER_DURATION;
      setMessage("¡Carga recogida! Los mini-espíritus se apartan durante 3 segundos.");
    }

    const now = performance.now();
    platform.spawnElapsed += dt;
    if (platform.spawnElapsed >= 1700) {
      platform.spawnElapsed = 0;
      [-1, 1].forEach((side) => {
        platform.minis.push({
          x: WIDTH / 2 + side * (18 + Math.random() * 32),
          y: 35,
          floorIndex: 0,
          vx: (platform.x < WIDTH / 2 ? -1 : 1) * (0.9 + Math.random() * 0.6),
        });
      });
    }

    let lifeLostThisFrame = false;
    platform.minis.forEach((mini) => {
      const powered = now < platform.powerUntil;
      if (powered && Math.abs(mini.x - platform.x) < 100) {
        mini.vx = Math.sign(mini.x - platform.x || 1) * 1.8;
      } else if (Math.random() < 0.012) {
        mini.vx *= -1;
      }
      mini.x += mini.vx * (dt / 16.67);
      mini.y += 0.82 * (dt / 16.67);
      mini.x = Math.max(18, Math.min(WIDTH - 18, mini.x));
      const targetFloor = FLOORS[Math.min(mini.floorIndex, FLOORS.length - 1)];
      if (mini.y >= targetFloor - 9) {
        mini.floorIndex += 1;
        if (mini.floorIndex >= FLOORS.length) {
          mini.floorIndex = 0;
          mini.y = 25;
        } else {
          mini.y = targetFloor - 8;
          mini.vx *= -1;
        }
      }
      if (Math.abs(mini.x - platform.x) < 22 && Math.abs(mini.y - (platform.feet - 14)) < 22) {
        if (!powered) {
          if (now >= state.immunityUntil && !lifeLostThisFrame) {
            lifeLostThisFrame = true;
            loseLife();
          }
          mini.y = -20;
        } else {
          mini.y = -20;
          state.score += 25;
        }
      }
    });
    platform.minis = platform.minis.filter((mini) => mini.y >= 0);

    if (now < platform.powerUntil) {
      platform.friendX += (platform.x - 28 - platform.friendX) * 0.08;
      platform.friendY = platform.feet;
    }
    if (platform.feet <= FLOORS[FLOORS.length - 1] + 1 && platform.x >= WIDTH - 55) {
      advanceLevel();
    }
  }

  function startRunnerLevel(startJump = false) {
    const now = performance.now();
    state.runner = {
      elapsed: 0,
      obstacles: [],
      spawnElapsed: 0,
      spawnInterval: 1000,
      scroll: 0,
      chaserX: 24,
      jumpStarted: startJump ? now : -Infinity,
      jumpDuration: 680,
      hitStreak: 0,
      slowUntil: 0,
    };
    state.level = 3;
    state.mode = "playing";
    state.maze = null;
    state.player = null;
    state.enemies = [];
    state.platform = null;
    state.menuOpen = false;
    runnerFailure.hidden = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pausar";
    startButton.disabled = false;
    startButton.textContent = "Volver al título";
    setMessage("Corre por el pasillo y pulsa ↑, W o espacio para saltar.");
    Object.keys(keys).forEach((direction) => { keys[direction] = false; });
  }

  function jumpRunner() {
    if (!state.runner || state.mode !== "playing") return;
    const now = performance.now();
    if (now - state.runner.jumpStarted < state.runner.jumpDuration) return;
    state.runner.jumpStarted = now;
  }

  function runnerJumpHeight(now) {
    if (!state.runner) return 0;
    const progress = (now - state.runner.jumpStarted) / state.runner.jumpDuration;
    if (progress < 0 || progress > 1) return 0;
    return Math.sin(progress * Math.PI) * 112;
  }

  function updateRunner(dt) {
    const runner = state.runner;
    if (!runner) return;
    const now = performance.now();
    runner.elapsed += dt;
    if (runner.elapsed >= RUNNER_DURATION) {
      state.score += 500;
      advanceLevel();
      return;
    }

    const slowed = now < runner.slowUntil;
    const speed = RUNNER_SPEED * (slowed ? 0.58 : 1);
    runner.scroll = (runner.scroll + speed * dt / 16.67) % 70;
    runner.spawnElapsed += dt;
    if (runner.spawnElapsed >= runner.spawnInterval) {
      runner.spawnElapsed = 0;
      runner.spawnInterval = 900 + Math.random() * 450;
      const height = 28 + Math.random() * 25;
      runner.obstacles.push({
        x: WIDTH + 24,
        width: 23 + Math.random() * 15,
        height,
        resolved: false,
        kind: Math.random() < 0.5 ? "crystal" : "crate",
      });
    }

    const jumpHeight = runnerJumpHeight(now);
    for (const obstacle of runner.obstacles) {
      obstacle.x -= speed * dt / 16.67;
      const overlapsPlayer = obstacle.x < RUNNER_PLAYER_X + 19 &&
        obstacle.x + obstacle.width > RUNNER_PLAYER_X - 14;
      if (!obstacle.resolved && overlapsPlayer) {
        obstacle.resolved = true;
        if (jumpHeight >= obstacle.height + 5) {
          runner.hitStreak = 0;
          state.score += 25;
          setMessage("¡Buen salto! Sigue avanzando.");
        } else {
          runner.hitStreak += 1;
          runner.slowUntil = now + 1300;
          runner.chaserX = Math.min(RUNNER_PLAYER_X - 20, runner.chaserX + 30);
          setMessage(`¡Obstáculo! Ritmo reducido (${runner.hitStreak}/3 seguidos).`);
          if (runner.hitStreak >= 3) {
            state.mode = "runner-over";
            runnerFailure.hidden = false;
            pauseButton.disabled = true;
            setMessage("El titán te alcanzó. Puedes reintentar el nivel o volver al título.");
            break;
          }
        }
      }
    }
    if (state.mode !== "playing") return;
    runner.obstacles = runner.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);
  }

  const keys = { up: false, down: false, left: false, right: false };

  function setDirection(direction) {
    if (!DIRS[direction]) return;
    if (state.menuOpen || state.mode === "won" || state.mode === "runner-over") return;
    if (state.mode === "ready") {
      beginRequestedLevel(direction);
      return;
    }
    if (state.mode === "gameover") {
      beginGame(direction);
      return;
    }
    if (state.level === 2 && state.mode === "playing") {
      keys[direction] = true;
      return;
    }
    if (state.level === 3 && state.mode === "playing") {
      if (direction === "up") jumpRunner();
      return;
    }
    if (state.player) state.player.queued = direction;
  }

  function clearDirection(direction) {
    if (DIRS[direction]) keys[direction] = false;
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawOrb(x, y, radius, color, variant, powered, targetCtx = ctx) {
    const palette = {
      amber: "#ff9d45",
      blue: "#60a7ff",
      pink: "#f17fd0",
      red: "#f06068",
    };
    const fill = powered && variant !== "amber" ? "#a8d7ff" : palette[variant];
    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.fillStyle = fill;
    targetCtx.beginPath();
    targetCtx.moveTo(0, -radius);
    targetCtx.bezierCurveTo(radius * 0.88, -radius * 1.08, radius * 1.12, -radius * 0.18, radius * 0.8, radius * 0.48);
    targetCtx.lineTo(radius * 0.33, radius * 0.93);
    targetCtx.lineTo(-radius * 0.22, radius * 0.77);
    targetCtx.lineTo(-radius * 0.8, radius * 0.89);
    targetCtx.bezierCurveTo(-radius * 1.1, radius * 0.12, -radius * 0.83, -radius * 0.82, 0, -radius);
    targetCtx.fill();

    targetCtx.fillStyle = "#fff";
    targetCtx.beginPath();
    targetCtx.ellipse(-4, -2, 3.5, 5, 0, 0, Math.PI * 2);
    targetCtx.ellipse(5, -2, 3.5, 5, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = "#152038";
    targetCtx.beginPath();
    targetCtx.arc(-3, -1, 1.6, 0, Math.PI * 2);
    targetCtx.arc(6, -1, 1.6, 0, Math.PI * 2);
    targetCtx.fill();

    if (variant === "amber") {
      targetCtx.fillStyle = "#242b3d";
      targetCtx.beginPath();
      targetCtx.ellipse(-4, -3, 5, 7, -0.2, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.strokeStyle = "#ffd19a";
      targetCtx.lineWidth = 1.3;
      targetCtx.beginPath();
      targetCtx.arc(-4, -3, 6, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if (variant === "blue") {
      targetCtx.fillStyle = "#27374f";
      targetCtx.fillRect(-10, -9, 20, 3);
      targetCtx.strokeStyle = "#27374f";
      targetCtx.lineWidth = 3;
      targetCtx.beginPath();
      targetCtx.moveTo(-6, 5);
      targetCtx.lineTo(6, 5);
      targetCtx.stroke();
    } else if (variant === "pink") {
      targetCtx.fillStyle = "#56354f";
      targetCtx.beginPath();
      targetCtx.moveTo(-7, 8);
      targetCtx.lineTo(0, 13);
      targetCtx.lineTo(7, 8);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.strokeStyle = "#ffe4f8";
      targetCtx.lineWidth = 1.5;
      targetCtx.beginPath();
      targetCtx.moveTo(6, -7);
      targetCtx.lineTo(9, -1);
      targetCtx.stroke();
    } else if (variant === "red") {
      targetCtx.fillStyle = "#262b3a";
      targetCtx.beginPath();
      targetCtx.moveTo(-11, -7);
      targetCtx.lineTo(11, -7);
      targetCtx.lineTo(8, -3);
      targetCtx.lineTo(-9, -3);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.fillRect(5, -7, 7, 3);
    }
    if (powered && variant !== "amber") {
      targetCtx.globalAlpha = 0.28 + Math.sin(performance.now() / 450) * 0.08;
      targetCtx.strokeStyle = "#e7f6ff";
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  function drawPlayer(
    x,
    y,
    radius,
    direction,
    ally = false,
    invulnerable = false,
    targetCtx = ctx,
    options = {},
  ) {
    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.rotate(options.rotation || 0);
    const color = options.color || (ally ? "#ffb15e" : state.lumoColor);
    targetCtx.fillStyle = color;
    targetCtx.shadowColor = ally ? "#ffaf59" : color;
    targetCtx.shadowBlur = 12;
    const headings = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const heading = headings[direction] || 0;
    const mouthHalfAngle = Math.PI / 8;
    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);
    targetCtx.arc(0, 0, radius, heading + mouthHalfAngle, heading + Math.PI * 2 - mouthHalfAngle);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.shadowBlur = 0;
    targetCtx.fillStyle = "#fff";
    targetCtx.beginPath();
    targetCtx.arc(-radius * 0.14, -radius * 0.24, radius * 0.11, 0, Math.PI * 2);
    targetCtx.fill();
    const hasHat = !ally && (options.hat === undefined ? state.hatEnabled : options.hat);
    if (hasHat) {
      targetCtx.fillStyle = "#11131a";
      targetCtx.fillRect(-radius * 0.53, -radius * 0.94, radius * 1.06, radius * 0.24);
      targetCtx.fillRect(-radius * 0.37, -radius * 1.46, radius * 0.74, radius * 0.55);
      targetCtx.fillStyle = "#d5d9e2";
      targetCtx.fillRect(-radius * 0.37, -radius * 1.02, radius * 0.74, radius * 0.07);
    }
    if (invulnerable && !ally) {
      targetCtx.strokeStyle = "#b8f4ff";
      targetCtx.lineWidth = 2;
      targetCtx.shadowColor = "#8ceaff";
      targetCtx.shadowBlur = 8;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, radius + 5, 0, Math.PI * 2);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  function drawTitleArt() {
    const gradient = titleArtCtx.createLinearGradient(0, 0, 320, 280);
    gradient.addColorStop(0, "#111b36");
    gradient.addColorStop(1, "#262348");
    titleArtCtx.fillStyle = gradient;
    titleArtCtx.fillRect(0, 0, titleArt.width, titleArt.height);
    titleArtCtx.fillStyle = "rgba(255,255,255,0.42)";
    [[42, 48], [270, 42], [276, 200], [43, 220], [232, 252]].forEach(([x, y]) => {
      titleArtCtx.beginPath();
      titleArtCtx.arc(x, y, 2, 0, Math.PI * 2);
      titleArtCtx.fill();
    });
    drawOrb(207, 107, 28, null, "blue", false, titleArtCtx);
    drawPlayer(143, 111, 48, "right", false, false, titleArtCtx, { rotation: -0.34 });
    drawOrb(157, 215, 22, null, "amber", false, titleArtCtx);
    titleArtCtx.fillStyle = "rgba(9, 13, 30, 0.6)";
    titleArtCtx.beginPath();
    titleArtCtx.ellipse(158, 247, 62, 9, 0, 0, Math.PI * 2);
    titleArtCtx.fill();
  }

  function drawEndingArt() {
    const sky = endingCtx.createLinearGradient(0, 0, 0, endingArt.height);
    sky.addColorStop(0, "#72c5fa");
    sky.addColorStop(0.7, "#c8edff");
    sky.addColorStop(0.701, "#83c765");
    sky.addColorStop(1, "#57984c");
    endingCtx.fillStyle = sky;
    endingCtx.fillRect(0, 0, endingArt.width, endingArt.height);
    endingCtx.fillStyle = "#fff4bd";
    endingCtx.beginPath();
    endingCtx.arc(548, 74, 34, 0, Math.PI * 2);
    endingCtx.fill();
    endingCtx.fillStyle = "rgba(255,255,255,0.86)";
    [[98, 70], [420, 52]].forEach(([x, y]) => {
      endingCtx.beginPath();
      endingCtx.ellipse(x, y, 38, 12, 0, 0, Math.PI * 2);
      endingCtx.ellipse(x + 24, y - 5, 23, 16, 0, 0, Math.PI * 2);
      endingCtx.ellipse(x + 44, y, 29, 11, 0, 0, Math.PI * 2);
      endingCtx.fill();
    });
    endingCtx.fillStyle = "#4d9650";
    [[72, 300, 58], [180, 328, 48], [500, 306, 64], [610, 325, 46]].forEach(([x, y, size]) => {
      endingCtx.fillRect(x - 7, y, 14, 53);
      endingCtx.beginPath();
      endingCtx.arc(x, y - 5, size * 0.48, 0, Math.PI * 2);
      endingCtx.arc(x - size * 0.32, y + 6, size * 0.34, 0, Math.PI * 2);
      endingCtx.arc(x + size * 0.32, y + 6, size * 0.34, 0, Math.PI * 2);
      endingCtx.fill();
    });
    endingCtx.strokeStyle = "#527b40";
    endingCtx.lineWidth = 9;
    endingCtx.beginPath();
    endingCtx.moveTo(310, 296);
    endingCtx.lineTo(362, 296);
    endingCtx.stroke();
    endingCtx.fillStyle = "#fff2f8";
    endingCtx.font = "30px sans-serif";
    endingCtx.fillText("♥", 323, 265);
    drawPlayer(286, 286, 39, "right", false, false, endingCtx, { color: state.lumoColor });
    drawPlayer(384, 286, 39, "left", false, false, endingCtx, { color: "#f17fd0", hat: false });
    endingCtx.fillStyle = "#4eac55";
    endingCtx.beginPath();
    endingCtx.moveTo(401, 252);
    endingCtx.lineTo(412, 244);
    endingCtx.lineTo(421, 256);
    endingCtx.lineTo(412, 264);
    endingCtx.closePath();
    endingCtx.moveTo(422, 256);
    endingCtx.lineTo(433, 248);
    endingCtx.lineTo(438, 262);
    endingCtx.lineTo(426, 267);
    endingCtx.closePath();
    endingCtx.fill();
    endingCtx.beginPath();
    endingCtx.arc(421, 257, 5, 0, Math.PI * 2);
    endingCtx.fill();
    endingCtx.fillStyle = "#fff0a8";
    [[130, 381], [233, 368], [458, 382], [565, 366]].forEach(([x, y]) => {
      endingCtx.beginPath();
      endingCtx.arc(x, y, 4, 0, Math.PI * 2);
      endingCtx.fill();
      endingCtx.strokeStyle = "#fff0a8";
      endingCtx.lineWidth = 2;
      endingCtx.beginPath();
      endingCtx.moveTo(x, y - 9);
      endingCtx.lineTo(x, y + 9);
      endingCtx.moveTo(x - 8, y);
      endingCtx.lineTo(x + 8, y);
      endingCtx.stroke();
    });
  }

  function renderPosition(actor, now) {
    const progress = Math.max(0, Math.min(1, (now - actor.moveStarted) / actor.moveDuration));
    const eased = progress * progress * (3 - 2 * progress);
    return {
      x: actor.fromX + (actor.x - actor.fromX) * eased,
      y: actor.fromY + (actor.y - actor.fromY) * eased,
    };
  }

  function drawMazeFeatures(now, palette) {
    const houseLeft = (HOUSE.x - 2) * TILE;
    const houseTop = (HOUSE.y - 1) * TILE;
    roundRect(houseLeft + 3, houseTop + 3, TILE * 5 - 6, TILE * 4 - 6, 8);
    ctx.fillStyle = state.maze.inverted ? "rgba(74, 31, 48, 0.94)" : "rgba(13, 23, 48, 0.96)";
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = state.maze.inverted ? "#ffd4a8" : "#c2d0ff";
    ctx.lineWidth = 2;
    for (let x = HOUSE.x - 1; x <= HOUSE.x + 1; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * TILE + TILE / 2, (HOUSE.y + 0.2) * TILE);
      ctx.lineTo(x * TILE + TILE / 2, (HOUSE.y + 1.8) * TILE);
      ctx.stroke();
    }

    const doorX = HOUSE.x * TILE + TILE / 2;
    if (now < state.ghostReleaseAt) {
      ctx.strokeStyle = "#ffcf67";
      ctx.lineWidth = 3;
      for (let offset = -5; offset <= 5; offset += 5) {
        ctx.beginPath();
        ctx.moveTo(doorX + offset, (HOUSE.y - 1) * TILE + 4);
        ctx.lineTo(doorX + offset, HOUSE.y * TILE - 4);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#c8fa65";
      ctx.beginPath();
      ctx.arc(doorX, (HOUSE.y - 0.5) * TILE, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const side of ["left", "right"]) {
      const portalX = side === "left" ? TILE / 2 : WIDTH - TILE / 2;
      const portalY = TUNNEL_ROW * TILE + TILE / 2;
      const direction = side === "left" ? -1 : 1;
      ctx.save();
      ctx.strokeStyle = "#69e7ff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#69e7ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(portalX, portalY, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(portalX - direction * 4, portalY - 5);
      ctx.lineTo(portalX + direction * 2, portalY);
      ctx.lineTo(portalX - direction * 4, portalY + 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawMaze() {
    const now = performance.now();
    const palette = state.maze.inverted
      ? { floor: "#fff1d2", wall: "#ba443f", edge: "#f28a63", dot: "#7c432e", glow: "#ffe19c" }
      : { floor: "#090e20", wall: "#282d66", edge: "#646ad3", dot: "#f4e3a1", glow: "#d0f9ff" };
    ctx.fillStyle = palette.floor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.globalAlpha = state.maze.inverted ? 0.10 : 0.13;
    const wash = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 15, WIDTH / 2, HEIGHT / 2, WIDTH * 0.62);
    wash.addColorStop(0, palette.glow);
    wash.addColorStop(1, "transparent");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = state.maze.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (cell === "#") {
          roundRect(px + 2, py + 2, TILE - 4, TILE - 4, 7);
          ctx.fillStyle = palette.wall;
          ctx.fill();
          ctx.strokeStyle = palette.edge;
          ctx.globalAlpha = 0.65;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (cell === ".") {
          ctx.fillStyle = palette.dot;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === "o") {
          const pulse = 5.5 + Math.sin(now / 550) * 0.6;
          ctx.fillStyle = palette.glow;
          ctx.shadowColor = palette.glow;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    drawMazeFeatures(now, palette);
    state.enemies.forEach((enemy) => {
      const position = renderPosition(enemy, now);
      drawOrb(position.x * TILE + TILE / 2, position.y * TILE + TILE / 2, 11, null,
        enemy.type, now < state.powerUntil);
    });
    const playerPosition = renderPosition(state.player, now);
    drawPlayer(
      playerPosition.x * TILE + TILE / 2,
      playerPosition.y * TILE + TILE / 2,
      11,
      state.player.direction,
      false,
      now < state.immunityUntil,
    );
  }

  function drawTitan() {
    const x = WIDTH / 2;
    const bottom = FLOORS[FLOORS.length - 1] - 3;
    const top = 18;
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, "#7b8498");
    gradient.addColorStop(0.55, "#bac2cf");
    gradient.addColorStop(1, "#ffffff");
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(224, 236, 255, 0.35)";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.ellipse(x, 58, 60, 57, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(x + 54, bottom - 4);
    ctx.quadraticCurveTo(x + 30, bottom + 8, x + 12, bottom - 1);
    ctx.quadraticCurveTo(x - 15, bottom + 10, x - 60, bottom - 3);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#41485a";
    ctx.beginPath();
    ctx.ellipse(x - 20, 58, 6, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 20, 58, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#41485a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 34, 45);
    ctx.lineTo(x - 11, 52);
    ctx.moveTo(x + 34, 45);
    ctx.lineTo(x + 11, 52);
    ctx.stroke();
    ctx.strokeStyle = "#6b7384";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 13, 76);
    ctx.quadraticCurveTo(x, 89, x + 13, 76);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlatform() {
    const now = performance.now();
    const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, "#11172b");
    background.addColorStop(1, "#24233e");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(224, 231, 255, 0.18)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 157) % WIDTH;
      const y = (i * 83) % 310;
      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
    FLOORS.forEach((floor, index) => {
      const colors = ["#f3a45c", "#e78664", "#b87682", "#8076a4", "#535d84"];
      ctx.fillStyle = colors[index];
      roundRect(18, floor, WIDTH - 36, 12, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(24, floor + 2, WIDTH - 48, 2);
    });
    LADDERS.forEach((ladder) => {
      ctx.strokeStyle = "#d4bd8c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ladder.x - 9, ladder.upper);
      ctx.lineTo(ladder.x - 9, ladder.lower);
      ctx.moveTo(ladder.x + 9, ladder.upper);
      ctx.lineTo(ladder.x + 9, ladder.lower);
      ctx.stroke();
      for (let y = ladder.upper + 8; y < ladder.lower; y += 12) {
        ctx.beginPath();
        ctx.moveTo(ladder.x - 9, y);
        ctx.lineTo(ladder.x + 9, y);
        ctx.stroke();
      }
    });
    drawTitan();
    ctx.fillStyle = "#c8fa65";
    ctx.beginPath();
    ctx.moveTo(WIDTH - 45, FLOORS[FLOORS.length - 1] - 2);
    ctx.lineTo(WIDTH - 45, FLOORS[FLOORS.length - 1] - 35);
    ctx.lineTo(WIDTH - 19, FLOORS[FLOORS.length - 1] - 28);
    ctx.lineTo(WIDTH - 45, FLOORS[FLOORS.length - 1] - 20);
    ctx.closePath();
    ctx.fill();

    if (state.platform.powerOrb.active) {
      ctx.fillStyle = "#c8fa65";
      ctx.shadowColor = "#c8fa65";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(state.platform.powerOrb.x, state.platform.powerOrb.feet - 9 + Math.sin(now / 600) * 1.3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    state.platform.minis.forEach((mini) => {
      drawOrb(mini.x, mini.y, 10, null, now < state.platform.powerUntil ? "amber" : "pink", false);
    });
    if (now < state.platform.powerUntil) {
      drawPlayer(state.platform.friendX, state.platform.friendY - 14, 9, "right", true);
    }
    drawPlayer(state.platform.x, state.platform.feet - 14, 12, "right", false, now < state.immunityUntil);

    ctx.fillStyle = "#dce3f7";
    ctx.font = "600 12px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("EL TITÁN DE NUBE LANZA MINI-ESPÍRITUS", 22, 24);
  }

  function drawRunnerTitan(x, feet) {
    const top = feet - 86;
    const gradient = ctx.createLinearGradient(0, top, 0, feet);
    gradient.addColorStop(0, "#777f91");
    gradient.addColorStop(0.55, "#b4bdcc");
    gradient.addColorStop(1, "#ffffff");
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(224, 236, 255, 0.3)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(x - 34, feet);
    ctx.lineTo(x - 40, top + 32);
    ctx.quadraticCurveTo(x - 43, top, x, top);
    ctx.quadraticCurveTo(x + 43, top, x + 40, top + 32);
    ctx.lineTo(x + 35, feet);
    ctx.lineTo(x + 16, feet - 10);
    ctx.lineTo(x, feet);
    ctx.lineTo(x - 18, feet - 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#424352";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 23, top + 35);
    ctx.lineTo(x - 8, top + 40);
    ctx.moveTo(x + 23, top + 35);
    ctx.lineTo(x + 8, top + 40);
    ctx.stroke();
    ctx.fillStyle = "#333244";
    ctx.beginPath();
    ctx.ellipse(x - 15, top + 49, 5, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 15, top + 49, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#55404b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 12, top + 65);
    ctx.lineTo(x + 12, top + 65);
    ctx.stroke();
    ctx.restore();
  }

  function drawRunner() {
    const runner = state.runner;
    const now = performance.now();
    const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, "#090e20");
    background.addColorStop(0.55, "#111833");
    background.addColorStop(1, "#20224b");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#282d66";
    ctx.fillRect(0, 42, WIDTH, 13);
    ctx.fillRect(0, RUNNER_GROUND + 6, WIDTH, HEIGHT - RUNNER_GROUND - 6);
    ctx.strokeStyle = "#6269d1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.lineTo(WIDTH, 55);
    ctx.moveTo(0, RUNNER_GROUND + 6);
    ctx.lineTo(WIDTH, RUNNER_GROUND + 6);
    ctx.stroke();
    ctx.fillStyle = "rgba(213, 230, 255, 0.62)";
    for (let index = 0; index < 24; index += 1) {
      const x = (index * 71 - (runner ? runner.scroll * 0.45 : 0) + WIDTH) % WIDTH;
      const y = 93 + (index * 47) % 211;
      ctx.beginPath();
      ctx.arc(x, y, index % 4 === 0 ? 1.8 : 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#d1d8f6";
    ctx.font = "700 13px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("¡CORRE Y SALTA!", 24, 28);
    ctx.fillStyle = "rgba(200, 250, 101, 0.55)";
    for (let index = 0; index < 12; index += 1) {
      const x = (index * 74 - (runner ? runner.scroll : 0) + WIDTH * 2) % WIDTH;
      ctx.fillRect(x, RUNNER_GROUND + 35, 29, 3);
    }

    if (!runner) return;
    runner.obstacles.forEach((obstacle) => {
      const y = RUNNER_GROUND - obstacle.height;
      if (obstacle.kind === "crystal") {
        ctx.fillStyle = "#8072e2";
        ctx.beginPath();
        ctx.moveTo(obstacle.x, RUNNER_GROUND);
        ctx.lineTo(obstacle.x + obstacle.width * 0.25, y + 8);
        ctx.lineTo(obstacle.x + obstacle.width * 0.58, y);
        ctx.lineTo(obstacle.x + obstacle.width, RUNNER_GROUND);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#b7adff";
        ctx.fillRect(obstacle.x + obstacle.width * 0.47, y + 9, 3, obstacle.height - 11);
      } else {
        ctx.fillStyle = "#b46955";
        roundRect(obstacle.x, y + 6, obstacle.width, obstacle.height - 6, 4);
        ctx.fill();
        ctx.strokeStyle = "#f4a36a";
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x + 4, y + 10, obstacle.width - 8, obstacle.height - 14);
      }
    });

    const jumpHeight = runnerJumpHeight(now);
    drawPlayer(
      RUNNER_PLAYER_X,
      RUNNER_GROUND - 13 - jumpHeight,
      13,
      "right",
      false,
      now < state.immunityUntil,
    );
    if (runner.elapsed >= RUNNER_CHASER_DELAY) {
      drawRunnerTitan(runner.chaserX, RUNNER_GROUND + 4);
    }

    const progress = Math.min(1, runner.elapsed / RUNNER_DURATION);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(24, HEIGHT - 23, WIDTH - 48, 5, 3);
    ctx.fill();
    ctx.fillStyle = "#c8fa65";
    roundRect(24, HEIGHT - 23, (WIDTH - 48) * progress, 5, 3);
    ctx.fill();
    if (now < runner.slowUntil) {
      ctx.fillStyle = "#ffcf67";
      ctx.font = "600 12px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("¡Recupera el ritmo!", WIDTH / 2, HEIGHT - 39);
    }
  }

  function drawOverlay(title, detail) {
    ctx.fillStyle = "rgba(5, 8, 19, 0.76)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = "center";
    ctx.fillStyle = "#c8fa65";
    ctx.font = "700 30px 'Space Grotesk', sans-serif";
    ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
    ctx.fillStyle = "#e4e8f2";
    ctx.font = "500 15px 'DM Sans', sans-serif";
    ctx.fillText(detail, WIDTH / 2, HEIGHT / 2 + 20);
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (state.level === 2 && state.platform) drawPlatform();
    else if (state.level === 3 && state.runner) drawRunner();
    else if (state.maze && state.player) drawMaze();
    else {
      ctx.fillStyle = "#090e20";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (state.mode === "ready") {
      drawOverlay("LUMO", "Pulsa una flecha para empezar en esa dirección");
    } else if (state.mode === "paused") {
      drawOverlay("PAUSA", "Pulsa Esc o Reanudar para continuar");
    } else if (state.mode === "transition") {
      drawOverlay(state.level === 1 ? "¡NIVEL SUPERADO!" : "¡SALIDA ENCONTRADA!", "El siguiente desafío empieza enseguida");
    } else if (state.mode === "gameover") {
      drawOverlay("FIN DE LA PARTIDA", "Pulsa una flecha para volver a intentarlo");
    } else if (state.mode === "won") {
      drawOverlay("¡LO LOGRASTE!", "Completaste los tres niveles");
    }
  }

  function frame(time) {
    const dt = Math.min(45, state.lastTime ? time - state.lastTime : 16);
    state.lastTime = time;
    if (state.mode === "playing") {
      if (state.level === 2) updatePlatform(dt);
      else if (state.level === 3) updateRunner(dt);
      else updateMaze(dt);
    } else if (state.mode === "transition") {
      state.transitionTime -= dt;
      if (state.transitionTime <= 0) startNextLevel();
    }
    updateHud();
    draw();
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (state.mode === "playing") {
      state.mode = "paused";
      pauseButton.textContent = "Reanudar";
      setMessage("Partida pausada.");
    } else if (state.mode === "paused") {
      state.mode = "playing";
      pauseButton.textContent = "Pausar";
      setMessage(state.level === 2
        ? "Sube por las cuatro escaleras y llega a la salida."
        : state.level === 3
          ? "Corre por el pasillo y pulsa ↑, W o espacio para saltar."
          : `Nivel ${state.level}: sigue explorando el laberinto.`);
    }
  }

  function directionFromKey(key) {
    const normalized = key.toLowerCase();
    return {
      arrowup: "up", w: "up",
      " ": "up", spacebar: "up",
      arrowdown: "down", s: "down",
      arrowleft: "left", a: "left",
      arrowright: "right", d: "right",
    }[normalized];
  }

  document.addEventListener("keydown", (event) => {
    const direction = directionFromKey(event.key);
    if (direction) {
      event.preventDefault();
      setDirection(direction);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (!customizePanel.hidden) {
        titleMenu.hidden = false;
        customizePanel.hidden = true;
      } else {
        togglePause();
      }
    }
  });
  document.addEventListener("keyup", (event) => clearDirection(directionFromKey(event.key)));
  window.addEventListener("blur", () => {
    Object.keys(keys).forEach((direction) => { keys[direction] = false; });
  });
  startButton.addEventListener("click", showTitleScreen);
  pauseButton.addEventListener("click", togglePause);
  document.querySelector("#menu-play").addEventListener("click", () => enterGameFromMenu(1));
  continueButton.addEventListener("click", () => enterGameFromMenu(state.unlockedLevel));
  document.querySelector("#menu-customize").addEventListener("click", () => {
    titleMenu.hidden = true;
    customizePanel.hidden = false;
  });
  document.querySelector("#customize-back").addEventListener("click", () => {
    customizePanel.hidden = true;
    titleMenu.hidden = false;
  });
  const hatToggle = document.querySelector("#hat-toggle");
  hatToggle.checked = state.hatEnabled;
  document.querySelectorAll("[data-lumo-color]").forEach((button) => {
    const selected = button.dataset.lumoColor === state.lumoColor;
    button.setAttribute("aria-pressed", String(selected));
    button.addEventListener("click", () => {
      state.lumoColor = button.dataset.lumoColor;
      document.querySelectorAll("[data-lumo-color]").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
      saveCustomization();
      drawTitleArt();
    });
  });
  hatToggle.addEventListener("change", () => {
    state.hatEnabled = hatToggle.checked;
    saveCustomization();
    drawTitleArt();
  });
  document.querySelector("#retry-run").addEventListener("click", () => startRunnerLevel(false));
  document.querySelector("#failure-title").addEventListener("click", showTitleScreen);
  document.querySelector("#ending-title").addEventListener("click", showTitleScreen);
  document.querySelectorAll(".touch-controls button").forEach((button) => {
    const direction = button.dataset.dir;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setDirection(direction);
    });
    button.addEventListener("pointerup", () => clearDirection(direction));
    button.addEventListener("pointercancel", () => clearDirection(direction));
    button.addEventListener("pointerleave", () => clearDirection(direction));
  });

  updateMenuProgress();
  drawTitleArt();
  updateHud();
  draw();
  requestAnimationFrame(frame);
})();
