// Tetris: esta pantalla contiene el tablero, las piezas y todas las reglas.
const boardCanvas = document.querySelector("#tetris-board");
const boardContext = boardCanvas.getContext("2d");
const nextCanvas = document.querySelector("#next-piece");
const nextContext = nextCanvas.getContext("2d");

const scoreElement = document.querySelector("#score");
const linesElement = document.querySelector("#lines");
const levelElement = document.querySelector("#level");
const cityProgressElement = document.querySelector("#city-progress");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const countdownElement = document.querySelector("#countdown");
const countdownNumber = document.querySelector("#countdown-number");

const columns = 10;
const rows = 20;
const colors = {
  I: "#66d9ff",
  J: "#6676ff",
  L: "#ffb45e",
  O: "#f1dc69",
  S: "#88ed99",
  T: "#bc8cff",
  Z: "#ff737b"
};

// Cada matriz representa una pieza. El 1 indica que esa casilla contiene color.
const pieces = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

let board = createBoard();
let currentPiece;
let nextPiece;
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let lastTime = 0;
let animationFrame;
let isRunning = false;
let isPaused = false;
let particles = [];
let lineFlashes = [];
let cityCycle = 0;
let cityBuildings = [];
let countdownTimer = null;
let countdownActive = false;

// Cada paleta cambia el skyline después de completar un bloque de 10 líneas.
const cityPalettes = [
  { skyTop: "#090d1d", skyBottom: "#17152d", horizon: "#0a1021", window: "#66d9ff", glow: "#bc8cff", moon: "#bc8cff" },
  { skyTop: "#10091d", skyBottom: "#2b1235", horizon: "#120a25", window: "#ff70d6", glow: "#66d9ff", moon: "#ff70d6" },
  { skyTop: "#07151b", skyBottom: "#0d3a3d", horizon: "#09151e", window: "#72ffe7", glow: "#c8fa65", moon: "#72ffe7" },
  { skyTop: "#170f08", skyBottom: "#3d2810", horizon: "#17100b", window: "#ffcf66", glow: "#ff737b", moon: "#ffcf66" },
  { skyTop: "#09091d", skyBottom: "#191d4d", horizon: "#080a19", window: "#8ea5ff", glow: "#8cffc1", moon: "#8ea5ff" }
];
cityBuildings = generateCityBuildings(cityCycle);

function createBoard() {
  // Se crea una matriz de 20 filas por 10 columnas llena de ceros.
  return Array.from({ length: rows }, () => Array(columns).fill(null));
}

function seededRandom(seed) {
  // Una función pequeña y estable genera la misma ciudad para cada ciclo.
  let value = seed * 9301 + 49297;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function generateCityBuildings(cycle) {
  const random = seededRandom(cycle + 13);
  const buildings = [];
  let x = -8;

  // Se recorre todo el ancho para crear entre 16 y 22 edificios sin huecos grandes.
  while (x < boardCanvas.width + 20) {
    const width = 20 + Math.floor(random() * 34);
    const height = 70 + Math.floor(random() * 145);
    const roof = random() > 0.78 ? 8 : 0;
    buildings.push({
      x,
      y: 600 - height,
      width,
      height,
      roof,
      antenna: random() > 0.84
    });
    x += width + 4 + Math.floor(random() * 7);
  }
  return buildings;
}

function randomPiece() {
  // Elegimos una pieza al azar y hacemos una copia de su matriz.
  const types = Object.keys(pieces);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    matrix: pieces[type].map((row) => [...row]),
    x: 0,
    y: 0
  };
}

function preparePiece(piece) {
  piece.x = Math.floor((columns - piece.matrix[0].length) / 2);
  piece.y = 0;
  return piece;
}

function startGame() {
  clearCountdown();
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  cityCycle = 0;
  cityBuildings = generateCityBuildings(cityCycle);
  dropCounter = 0;
  isPaused = false;
  isRunning = true;
  nextPiece = randomPiece();
  spawnPiece();
  updateStats();
  overlay.classList.add("is-hidden");
  pauseButton.disabled = false;
  restartButton.disabled = false;
  pauseButton.textContent = "Pausar";
  lastTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(update);
}

function spawnPiece() {
  // La pieza siguiente pasa a ser la pieza activa.
  currentPiece = preparePiece(nextPiece);
  nextPiece = randomPiece();
  drawNextPiece();

  // Si la nueva pieza no cabe, la partida termina.
  if (hasCollision()) {
    endGame();
  }
}

function hasCollision(offsetX = 0, offsetY = 0, matrix = currentPiece.matrix) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;

      const boardX = currentPiece.x + x + offsetX;
      const boardY = currentPiece.y + y + offsetY;
      if (
        boardX < 0 ||
        boardX >= columns ||
        boardY >= rows ||
        (boardY >= 0 && board[boardY][boardX])
      ) {
        return true;
      }
    }
  }
  return false;
}

function mergePiece() {
  // Copiamos la pieza al tablero fijo.
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[currentPiece.y + y][currentPiece.x + x] = currentPiece.type;
    });
  });
}

function clearLines() {
  let cleared = 0;
  const clearedRows = [];

  // Las filas completas se eliminan y se añade una fila vacía arriba.
  for (let y = rows - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      clearedRows.push(y);
      board.splice(y, 1);
      board.unshift(Array(columns).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800];
    score += points[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    const nextCityCycle = Math.floor(lines / 10);
    if (nextCityCycle !== cityCycle) {
      cityCycle = nextCityCycle;
      cityBuildings = generateCityBuildings(cityCycle);
      for (let index = 0; index < 28; index += 1) {
        particles.push({
          x: Math.random() * boardCanvas.width,
          y: 520 + Math.random() * 70,
          vx: (Math.random() - 0.5) * 4,
          vy: -1 - Math.random() * 3,
          life: 1,
          color: cityPalettes[cityCycle % cityPalettes.length].window
        });
      }
    }
    createLineEffect(clearedRows);
    updateStats();
    scoreElement.classList.remove("score-pop");
    void scoreElement.offsetWidth;
    scoreElement.classList.add("score-pop");
  }
}

function movePiece(direction) {
  if (!canPlay()) return;
  if (!hasCollision(direction, 0)) currentPiece.x += direction;
  draw();
}

function rotatePiece() {
  if (!canPlay()) return;

  // Transponemos la matriz y la invertimos horizontalmente para rotarla.
  const rotated = currentPiece.matrix[0].map((_, index) =>
    currentPiece.matrix.map((row) => row[index]).reverse()
  );

  // Intentos simples de "pared": permite ajustar la pieza cerca de los bordes.
  for (const offset of [0, -1, 1, -2, 2]) {
    if (!hasCollision(offset, 0, rotated)) {
      currentPiece.matrix = rotated;
      currentPiece.x += offset;
      draw();
      return;
    }
  }
}

function dropPiece() {
  if (!canPlay()) return;
  if (!hasCollision(0, 1)) {
    currentPiece.y += 1;
  } else {
    lockPiece();
  }
  dropCounter = 0;
  draw();
}

function hardDrop() {
  if (!canPlay()) return;
  let distance = 0;
  while (!hasCollision(0, 1)) {
    currentPiece.y += 1;
    distance += 1;
  }
  score += distance * 2;
  boardCanvas.parentElement.classList.remove("is-dropped");
  void boardCanvas.parentElement.offsetWidth;
  boardCanvas.parentElement.classList.add("is-dropped");
  createDropParticles();
  lockPiece();
  updateStats();
  draw();
}

function createDropParticles() {
  // Partículas breves salen del lugar donde aterriza la pieza.
  const size = getCellSize();
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const centerX = (currentPiece.x + x) * size + size / 2;
      const centerY = (currentPiece.y + y) * size + size / 2;
      for (let index = 0; index < 3; index += 1) {
        particles.push({
          x: centerX,
          y: centerY,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 2.5,
          life: 1,
          color: colors[currentPiece.type]
        });
      }
    });
  });
}

function createLineEffect(clearedRows) {
  // El destello atraviesa cada fila eliminada y añade puntos luminosos.
  clearedRows.forEach((row) => lineFlashes.push({ y: row, life: 1 }));
  for (let x = 0; x < columns; x += 1) {
    particles.push({
      x: x * getCellSize() + getCellSize() / 2,
      y: clearedRows[0] * getCellSize() + getCellSize() / 2,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.8) * 4,
      life: 1,
      color: "#c8fa65"
    });
  }
}

function lockPiece() {
  mergePiece();
  clearLines();
  spawnPiece();
}

function canPlay() {
  return isRunning && !isPaused;
}

function togglePause() {
  if (!isRunning) return;
  if (countdownActive) return;

  if (!isPaused) {
    isPaused = true;
    pauseButton.textContent = "Reanudar";
    overlayTitle.textContent = "Juego pausado";
    overlayCopy.textContent = "Presiona reanudar cuando estés listo.";
    startButton.textContent = "Reanudar";
    overlay.classList.remove("is-hidden");
    return;
  }

  startResumeCountdown();
}

function startResumeCountdown() {
  countdownActive = true;
  startButton.hidden = true;
  countdownElement.hidden = false;
  overlayCopy.textContent = "Preparando la siguiente jugada...";
  overlayTitle.textContent = "Reanudando";
  let remaining = 3;
  countdownNumber.textContent = String(remaining);

  countdownTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      countdownNumber.textContent = String(remaining);
      countdownNumber.style.animation = "none";
      void countdownNumber.offsetWidth;
      countdownNumber.style.animation = "";
      return;
    }

    clearCountdown();
    isPaused = false;
    pauseButton.textContent = "Pausar";
    overlay.classList.add("is-hidden");
    lastTime = performance.now();
  }, 1000);
}

function clearCountdown() {
  if (countdownTimer !== null) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdownActive = false;
  countdownElement.hidden = true;
  startButton.hidden = false;
}

function endGame() {
  clearCountdown();
  isRunning = false;
  cancelAnimationFrame(animationFrame);
  overlayTitle.textContent = "Fin del juego";
  overlayCopy.textContent = `Puntuación: ${String(score).padStart(5, "0")} · Líneas: ${lines}`;
  startButton.textContent = "Jugar de nuevo";
  overlay.classList.remove("is-hidden");
  pauseButton.disabled = true;
  restartButton.disabled = false;
}

function updateStats() {
  scoreElement.textContent = String(score).padStart(5, "0");
  linesElement.textContent = String(lines);
  levelElement.textContent = String(level);
  cityProgressElement.textContent = `${lines % 10}/10`;
}

function getCellSize() {
  return boardCanvas.width / columns;
}

function drawCell(context, x, y, color, size = getCellSize()) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

  // El brillo interior ayuda a que las piezas tengan una apariencia neón.
  context.fillStyle = "rgba(255, 255, 255, 0.16)";
  context.fillRect(x * size + 3, y * size + 3, size - 6, 3);
}

function drawBoard() {
  const size = getCellSize();
  const palette = cityPalettes[cityCycle % cityPalettes.length];
  const cityGradient = boardContext.createLinearGradient(0, 0, 0, boardCanvas.height);
  cityGradient.addColorStop(0, palette.skyTop);
  cityGradient.addColorStop(0.58, palette.skyBottom);
  cityGradient.addColorStop(1, palette.horizon);
  boardContext.fillStyle = cityGradient;
  boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  // Cada línea completada revela algunos edificios más del skyline procedimental.
  const cityProgress = lines % 10;
  const minimumBuildings = 3;
  const visibleBuildings = cityProgress === 0
    ? minimumBuildings
    : minimumBuildings + Math.ceil((cityProgress / 10) * (cityBuildings.length - minimumBuildings));

  boardContext.fillStyle = "rgba(7, 9, 18, 0.92)";
  cityBuildings.slice(0, visibleBuildings).forEach((building) => {
    boardContext.fillRect(building.x, building.y, building.width, building.height);
    if (building.roof) {
      boardContext.fillRect(building.x + building.width * 0.42, building.y - building.roof, 3, building.roof);
    }
    if (building.antenna) {
      boardContext.fillRect(building.x + building.width - 6, building.y - 12, 2, 12);
    }
  });

  boardContext.fillStyle = `${palette.window}a6`;
  cityBuildings.slice(0, visibleBuildings).forEach((building, buildingIndex) => {
    for (let windowY = building.y + 12; windowY < building.y + building.height - 8; windowY += 18) {
      for (let windowX = building.x + 7; windowX < building.x + building.width - 5; windowX += 13) {
        if ((windowX + windowY + buildingIndex + cityCycle) % 3 !== 0) {
          boardContext.fillRect(windowX, windowY, 4, 2);
        }
      }
    }
  });

  boardContext.strokeStyle = `${palette.glow}38`;
  boardContext.beginPath();
  boardContext.moveTo(0, 555);
  boardContext.lineTo(boardCanvas.width, 555);
  boardContext.stroke();

  boardContext.fillStyle = `${palette.moon}59`;
  boardContext.beginPath();
  boardContext.arc(238, 76, 24, 0, Math.PI * 2);
  boardContext.fill();
  boardContext.fillStyle = "rgba(9, 13, 29, 0.92)";
  boardContext.beginPath();
  boardContext.arc(246, 68, 23, 0, Math.PI * 2);
  boardContext.fill();

  // Dibujamos una cuadrícula suave para distinguir las posiciones.
  boardContext.strokeStyle = "rgba(255, 255, 255, 0.035)";
  boardContext.lineWidth = 1;
  for (let x = 0; x <= columns; x += 1) {
    boardContext.beginPath();
    boardContext.moveTo(x * size, 0);
    boardContext.lineTo(x * size, boardCanvas.height);
    boardContext.stroke();
  }
  for (let y = 0; y <= rows; y += 1) {
    boardContext.beginPath();
    boardContext.moveTo(0, y * size);
    boardContext.lineTo(boardCanvas.width, y * size);
    boardContext.stroke();
  }

  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawCell(boardContext, x, y, colors[type]);
    });
  });
}

function drawGhostPiece() {
  // La pieza fantasma muestra dónde aterrizará la pieza actual.
  let ghostY = currentPiece.y;
  while (!wouldCollideAt(ghostY + 1)) ghostY += 1;

  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const positionX = currentPiece.x + x;
        const positionY = ghostY + y;
        if (positionY >= 0) {
          boardContext.fillStyle = `${colors[currentPiece.type]}55`;
          boardContext.fillRect(positionX * getCellSize() + 3, positionY * getCellSize() + 3, getCellSize() - 6, getCellSize() - 6);
        }
      }
    });
  });
}

function wouldCollideAt(testY) {
  for (let y = 0; y < currentPiece.matrix.length; y += 1) {
    for (let x = 0; x < currentPiece.matrix[y].length; x += 1) {
      if (!currentPiece.matrix[y][x]) continue;
      const boardX = currentPiece.x + x;
      const boardY = testY + y;
      if (boardX < 0 || boardX >= columns || boardY >= rows ||
          (boardY >= 0 && board[boardY][boardX])) return true;
    }
  }
  return false;
}

function draw() {
  drawBoard();
  if (currentPiece) {
    drawGhostPiece();
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawCell(
            boardContext,
            currentPiece.x + x,
            currentPiece.y + y,
            colors[currentPiece.type]
          );
        }
      });
    });
  }
  drawEffects();
}

function drawEffects() {
  // Los destellos de línea y las partículas hacen visibles los eventos del juego.
  lineFlashes = lineFlashes.filter((flash) => flash.life > 0);
  lineFlashes.forEach((flash) => {
    const alpha = Math.max(0, flash.life);
    boardContext.fillStyle = `rgba(200, 250, 101, ${alpha * 0.72})`;
    boardContext.fillRect(0, flash.y * getCellSize(), boardCanvas.width, getCellSize());
    flash.life -= 0.08;
  });

  particles = particles.filter((particle) => particle.life > 0);
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.08;
    particle.life -= 0.025;
    boardContext.fillStyle = particle.color;
    boardContext.globalAlpha = Math.max(0, particle.life);
    boardContext.fillRect(particle.x, particle.y, 4, 4);
  });
  boardContext.globalAlpha = 1;
}

function drawNextPiece() {
  nextContext.fillStyle = "#111725";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const size = 24;
  const offsetX = (nextCanvas.width - nextPiece.matrix[0].length * size) / 2;
  const offsetY = (nextCanvas.height - nextPiece.matrix.length * size) / 2;

  nextPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        nextContext.fillStyle = colors[nextPiece.type];
        nextContext.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
      }
    });
  });
}

function update(time = 0) {
  if (!isRunning) return;

  const deltaTime = time - lastTime;
  lastTime = time;
  if (!isPaused) {
    dropCounter += deltaTime;
    // Cada nivel baja el tiempo de espera y hace que la pieza caiga más rápido.
    const dropInterval = Math.max(100, 800 - (level - 1) * 70);
    if (dropCounter > dropInterval) dropPiece();
  }

  draw();
  animationFrame = requestAnimationFrame(update);
}

// Los controles de teclado permiten jugar con flechas, barra espaciadora, Enter y P.
document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Enter", "p", "P"].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === "p" || event.key === "P") {
    togglePause();
  } else if (event.key === "Enter") {
    if (!isRunning) startGame();
    else if (isPaused) togglePause();
    else hardDrop();
  } else if (event.key === "ArrowLeft") {
    movePiece(-1);
  } else if (event.key === "ArrowRight") {
    movePiece(1);
  } else if (event.key === "ArrowDown") {
    dropPiece();
  } else if (event.key === "ArrowUp") {
    rotatePiece();
  } else if (event.key === " ") {
    hardDrop();
  }
});

// Los botones táctiles llaman a las mismas funciones que el teclado.
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const actions = {
      left: () => movePiece(-1),
      right: () => movePiece(1),
      down: () => dropPiece(),
      rotate: () => rotatePiece(),
      drop: () => hardDrop()
    };
    actions[button.dataset.action]?.();
  });
});

startButton.addEventListener("click", () => {
  if (isPaused) togglePause();
  else startGame();
});
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", startGame);

drawBoard();
