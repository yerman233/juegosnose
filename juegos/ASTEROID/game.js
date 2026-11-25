const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const scoreValue = document.querySelector("#score-value");
const levelValue = document.querySelector("#level-value");
const livesValue = document.querySelector("#lives-value");
const overlay = document.querySelector("#game-overlay");
const overlayEyebrow = document.querySelector("#overlay-eyebrow");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const howToPlayButton = document.querySelector("#how-to-play-button");
const instructionsPanel = document.querySelector("#game-instructions");
const bossHud = document.querySelector("#boss-hud");
const bossLabel = document.querySelector("#boss-label");
const bossHealthFill = document.querySelector("#boss-health-fill");
const bossHealthTrack = bossHud.querySelector('[role="progressbar"]');
const announcement = document.querySelector("#game-announcement");
const playerHealthStatus = document.querySelector("#player-health-status");
const weaponHud = document.querySelector("#weapon-hud");
const weaponValue = document.querySelector("#weapon-value");

const BOSS_HEALTH = 42;
const FINAL_LEVEL = 6;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_HIT_DAMAGE = 35;
const POWER_UP_LIFETIME = 5;
const POWER_UP_DURATION = 8;
const BOMB_TRIGGER_RADIUS = 76;
const BOMB_BLAST_RADIUS = 48;
const actions = new Set();
const stars = Array.from({ length: 100 }, () => ({
  x: Math.random(),
  y: Math.random(),
  radius: Math.random() * 1.4 + 0.25,
  alpha: Math.random() * 0.65 + 0.2,
}));

let width = 0;
let height = 0;
let lastFrame = 0;
let clock = 0;
let instructionsOpen = false;
let game = createGame();

function createGame() {
  return {
    status: "ready",
    score: 0,
    lives: 3,
    playerHealth: PLAYER_MAX_HEALTH,
    level: 1,
    player: null,
    asteroids: [],
    enemyShips: [],
    bullets: [],
    enemyBullets: [],
    explosions: [],
    particles: [],
    boss: null,
    powerUp: null,
    weaponTimer: 0,
    laser: null,
    transition: 0,
    shipFireCooldown: 0,
    invulnerable: 0,
  };
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function wrap(value, limit) {
  return (value + limit) % limit;
}

function makePlayer() {
  return {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 13,
  };
}

function makeAsteroid(x, y, size, angle, speed) {
  const radius = size === 3 ? 32 : size === 2 ? 21 : 12;
  const pointCount = 9 + Math.floor(Math.random() * 4);
  const points = Array.from({ length: pointCount }, () => 0.72 + Math.random() * 0.48);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.4,
    radius,
    size,
    points,
  };
}

function makeEnemyShip(index, count, level, type = "fighter") {
  const homeX = (width * (index + 1)) / (count + 1);
  const baseY = Math.max(28, height * (0.12 + Math.random() * 0.18));
  return {
    x: homeX,
    y: baseY,
    homeX,
    baseY,
    phase: Math.random() * Math.PI * 2,
    wander: Math.min(width * 0.18, 140),
    direction: index % 2 === 0 ? 1 : -1,
    speed: type === "bomber" ? 80 + level * 8 : 100 + level * 18,
    radius: type === "bomber" ? 24 : 17,
    fireCooldown: type === "bomber" ? 1.1 + Math.random() * 0.4 : 1.2 + Math.random() * 0.8,
    health: type === "bomber" ? 5 + Math.floor((level - 4) / 2) : 2 + Math.floor((level - 2) / 2),
    type,
  };
}

function startLevel(level) {
  if (level > FINAL_LEVEL) {
    showVictoryScreen();
    return;
  }
  game.level = level;
  game.player = makePlayer();
  game.playerHealth = PLAYER_MAX_HEALTH;
  game.asteroids = [];
  game.enemyShips = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.explosions = [];
  game.particles = [];
  game.boss = null;
  game.laser = null;
  game.transition = 0;
  game.shipFireCooldown = 0;
  game.invulnerable = 1.7;

  const asteroidCount = level === FINAL_LEVEL ? 0 : level + 2;
  for (let index = 0; index < asteroidCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.min(width, height) * 0.35;
    const x = wrap(game.player.x + Math.cos(angle) * distance, width);
    const y = wrap(game.player.y + Math.sin(angle) * distance, height);
    const speed = 45 + level * 10;
    game.asteroids.push(makeAsteroid(x, y, 3, Math.random() * Math.PI * 2, speed));
  }

  if (level >= 2 && level < FINAL_LEVEL) {
    const enemyCount = level >= 4 ? level - 2 : level - 1;
    for (let index = 0; index < enemyCount; index += 1) {
      game.enemyShips.push(makeEnemyShip(index, enemyCount, level));
    }
    if (level >= 4) {
      game.enemyShips.push(makeEnemyShip(0, 1, level, "bomber"));
    }
  }

  if (level === FINAL_LEVEL) {
    const health = BOSS_HEALTH + 6;
    game.boss = {
      x: width / 2,
      y: Math.max(75, height * 0.22),
      health,
      maxHealth: health,
      fireCooldown: 0.9,
      reinforcementCooldown: 8,
      reinforcementWave: 0,
      radius: 40,
    };
    bossHud.hidden = false;
    bossLabel.textContent = "JEFE FINAL";
    bossHealthTrack.setAttribute("aria-valuemax", String(health));
    updateBossHealth();
    announcement.textContent = `Nivel ${level}: jefe enemigo.`;
  } else {
    bossHud.hidden = true;
    announcement.textContent = level >= 4
      ? `Nivel ${level}. Destruye a los cazas, al bombardero y los asteroides.`
      : level >= 2
        ? `Nivel ${level}. Destruye los asteroides y las naves enemigas.`
        : `Nivel ${level}. Destruye todos los asteroides.`;
  }
  updateHud();
  updatePlayerHealthStatus();
}

function startGame() {
  game = createGame();
  game.status = "playing";
  actions.clear();
  instructionsOpen = false;
  instructionsPanel.hidden = true;
  howToPlayButton.setAttribute("aria-expanded", "false");
  overlay.hidden = true;
  startLevel(1);
  canvas.focus({ preventScroll: true });
}

function showEndScreen() {
  game.status = "lost";
  actions.clear();
  game.laser = null;
  game.powerUp = null;
  game.weaponTimer = 0;
  game.enemyBullets = [];
  updateHud();
  bossHud.hidden = true;
  overlay.hidden = false;
  overlayEyebrow.textContent = "FIN DE LA PARTIDA";
  overlayTitle.textContent = "La nave se ha quedado sin energía";
  overlayCopy.textContent = `Llegaste al nivel ${game.level} y conseguiste ${game.score} puntos. ¿Listo para otro intento?`;
  startButton.innerHTML = 'Intentar otra vez <span aria-hidden="true">→</span>';
  announcement.textContent = "Fin de la partida.";
  startButton.focus();
}

function showVictoryScreen() {
  game.status = "won";
  actions.clear();
  game.laser = null;
  game.powerUp = null;
  game.weaponTimer = 0;
  game.enemyBullets = [];
  updateHud();
  bossHud.hidden = true;
  overlay.hidden = false;
  overlayEyebrow.textContent = "MISIÓN CUMPLIDA";
  overlayTitle.textContent = "La galaxia está a salvo";
  overlayCopy.textContent = `Superaste los 6 niveles y derrotaste al jefe final con ${game.score} puntos.`;
  startButton.innerHTML = 'Jugar otra vez <span aria-hidden="true">→</span>';
  announcement.textContent = "Victoria. Superaste los seis niveles y derrotaste al jefe final.";
  startButton.focus();
}

function updateHud() {
  scoreValue.textContent = String(game.score).padStart(5, "0");
  levelValue.textContent = `${game.level} / ${FINAL_LEVEL}`;
  livesValue.textContent = String(game.lives);
  weaponHud.hidden = game.weaponTimer <= 0;
  if (game.weaponTimer > 0) weaponValue.textContent = `${Math.ceil(game.weaponTimer)}s`;
}

function updatePlayerHealthStatus() {
  const health = Math.max(0, game.playerHealth);
  playerHealthStatus.textContent = `${health}%`;
  playerHealthStatus.setAttribute("aria-valuenow", String(health));
  canvas.setAttribute(
    "aria-label",
    `Área de juego. Integridad de la nave: ${health} por ciento. Usa W y las flechas para pilotar, A y D para girar y espacio para disparar.`,
  );
}

function updateBossHealth() {
  if (!game.boss) return;
  const percentage = Math.max(0, (game.boss.health / game.boss.maxHealth) * 100);
  bossHealthFill.style.width = `${percentage}%`;
  bossHealthTrack.setAttribute("aria-valuemax", String(game.boss.maxHealth));
  bossHealthTrack.setAttribute("aria-valuenow", String(game.boss.health));
}

function createParticles(x, y, color, count = 10) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 130;
    const life = 0.3 + Math.random() * 0.55;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      radius: 1 + Math.random() * 2.2,
      color,
    });
  }
}

function firePlayerBullet() {
  const { player } = game;
  const directionX = Math.cos(player.angle);
  const directionY = Math.sin(player.angle);
  game.bullets.push({
    x: player.x + directionX * 18,
    y: player.y + directionY * 18,
    vx: player.vx + directionX * 500,
    vy: player.vy + directionY * 500,
    life: 1.25,
    radius: 3,
    bouncesLeft: 2,
  });
  game.shipFireCooldown = 0.15;
}

function firePlayerLaser() {
  const { player } = game;
  const directionX = Math.cos(player.angle);
  const directionY = Math.sin(player.angle);
  let distance = Math.hypot(width, height);
  if (directionX > 0) distance = Math.min(distance, (width - player.x) / directionX);
  if (directionX < 0) distance = Math.min(distance, -player.x / directionX);
  if (directionY > 0) distance = Math.min(distance, (height - player.y) / directionY);
  if (directionY < 0) distance = Math.min(distance, -player.y / directionY);

  game.laser = {
    x: player.x + directionX * 13,
    y: player.y + directionY * 13,
    angle: player.angle,
    distance: Math.max(0, distance - 13),
    life: 0.12,
  };
  game.shipFireCooldown = 0.18;
  hitLaserTarget(game.laser);
}

function hitLaserTarget(laser) {
  const directionX = Math.cos(laser.angle);
  const directionY = Math.sin(laser.angle);
  let nearest = null;

  function consider(type, target, radius) {
    const offsetX = target.x - laser.x;
    const offsetY = target.y - laser.y;
    const along = offsetX * directionX + offsetY * directionY;
    const across = Math.abs(offsetX * directionY - offsetY * directionX);
    if (along <= 0 || along > laser.distance || across > radius + 3) return;
    if (!nearest || along < nearest.distance) nearest = { type, target, distance: along };
  }

  game.asteroids.forEach((asteroid) => consider("asteroid", asteroid, asteroid.radius));
  game.enemyShips.forEach((enemy) => consider("enemy", enemy, enemy.radius));
  if (game.boss) consider("boss", game.boss, game.boss.radius);

  if (!nearest) return;
  if (nearest.type === "asteroid") damageAsteroid(nearest.target);
  if (nearest.type === "enemy") damageEnemyShip(nearest.target);
  if (nearest.type === "boss") damageBoss(nearest.target, "#ff7897");
}

function fireBossBullet() {
  const { boss, player } = game;
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
  const speed = 270 + game.level * 15;
  game.enemyBullets.push({
    type: "boss",
    x: boss.x,
    y: boss.y + boss.radius * 0.55,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 5,
    radius: 5,
    bouncesLeft: 3,
  });
  boss.fireCooldown = 0.72;
}

function fireEnemyBullet(enemy) {
  const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const isBomber = enemy.type === "bomber";
  const speed = isBomber ? 170 + game.level * 8 : 240 + game.level * 14;
  game.enemyBullets.push({
    type: isBomber ? "bomb" : "fighter",
    x: enemy.x,
    y: enemy.y + enemy.radius * 0.55,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: isBomber ? 5 : 4.5,
    radius: isBomber ? 6 : 4,
    bouncesLeft: 3,
    triggerRadius: BOMB_TRIGGER_RADIUS,
  });
  enemy.fireCooldown = isBomber ? 1.65 : Math.max(0.3, 1.8 - (game.level - 2) * 0.04);
}

function moveProjectileAndBounce(projectile, delta) {
  const radius = projectile.radius || 3;
  projectile.x += projectile.vx * delta;
  projectile.y += projectile.vy * delta;
  if (projectile.x < radius) {
    projectile.x = radius;
    projectile.vx = Math.abs(projectile.vx);
    projectile.bouncesLeft -= 1;
  } else if (projectile.x > width - radius) {
    projectile.x = width - radius;
    projectile.vx = -Math.abs(projectile.vx);
    projectile.bouncesLeft -= 1;
  }
  if (projectile.y < radius) {
    projectile.y = radius;
    projectile.vy = Math.abs(projectile.vy);
    projectile.bouncesLeft -= 1;
  } else if (projectile.y > height - radius) {
    projectile.y = height - radius;
    projectile.vy = -Math.abs(projectile.vy);
    projectile.bouncesLeft -= 1;
  }
  return projectile.bouncesLeft >= 0;
}

function damagePlayer() {
  if (game.status !== "playing" || game.invulnerable > 0) return;
  game.playerHealth = Math.max(0, game.playerHealth - PLAYER_HIT_DAMAGE);
  createParticles(game.player.x, game.player.y, "#75e8ff", 18);
  updatePlayerHealthStatus();
  if (game.playerHealth === 0) {
    game.lives -= 1;
    game.playerHealth = game.lives > 0 ? PLAYER_MAX_HEALTH : 0;
    updateHud();
    updatePlayerHealthStatus();
  }
  if (game.lives <= 0) {
    showEndScreen();
    return;
  }
  if (game.playerHealth === PLAYER_MAX_HEALTH) {
    game.player = makePlayer();
    game.invulnerable = 2.1;
    announcement.textContent = `Nave destruida. Quedan ${game.lives} naves.`;
  } else {
    game.invulnerable = 1.1;
    announcement.textContent = `Impacto. Integridad de la nave: ${game.playerHealth} por ciento.`;
  }
}

function advanceLevelIfReady() {
  if (game.transition > 0 || game.boss) return;
  if (game.asteroids.length === 0 && game.enemyShips.length === 0) {
    game.transition = 1.4;
  }
}

function update(delta) {
  if (game.status !== "playing" || instructionsOpen) return;
  clock += delta;
  game.invulnerable = Math.max(0, game.invulnerable - delta);
  game.shipFireCooldown = Math.max(0, game.shipFireCooldown - delta);
  if (game.weaponTimer > 0) {
    const displayedSeconds = Math.ceil(game.weaponTimer);
    game.weaponTimer = Math.max(0, game.weaponTimer - delta);
    if (Math.ceil(game.weaponTimer) !== displayedSeconds) updateHud();
  }
  if (game.laser) {
    game.laser.life -= delta;
    if (game.laser.life <= 0) game.laser = null;
  }
  if (game.powerUp) {
    game.powerUp.life -= delta;
    game.powerUp.phase += delta * 4;
    if (game.powerUp.life <= 0) game.powerUp = null;
  }
  game.explosions = game.explosions.filter((explosion) => {
    explosion.life -= delta;
    return explosion.life > 0;
  });
  game.particles = game.particles.filter((particle) => {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    return particle.life > 0;
  });

  if (game.transition > 0) {
    game.transition -= delta;
    if (game.transition <= 0) {
      if (game.level >= FINAL_LEVEL) showVictoryScreen();
      else startLevel(game.level + 1);
    }
    return;
  }

  const { player } = game;
  if (actions.has("left")) player.angle -= 4.5 * delta;
  if (actions.has("right")) player.angle += 4.5 * delta;
  if (actions.has("forward")) {
    player.vx += Math.cos(player.angle) * 320 * delta;
    player.vy += Math.sin(player.angle) * 320 * delta;
  }
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > 410) {
    player.vx = (player.vx / speed) * 410;
    player.vy = (player.vy / speed) * 410;
  }
  const drag = Math.pow(0.985, delta * 60);
  player.vx *= drag;
  player.vy *= drag;
  player.x = wrap(player.x + player.vx * delta, width);
  player.y = wrap(player.y + player.vy * delta, height);

  if (actions.has("shoot") && game.shipFireCooldown <= 0) {
    if (game.weaponTimer > 0) firePlayerLaser();
    else firePlayerBullet();
  } else if (actions.has("shoot") && game.weaponTimer > 0 && game.laser) {
    game.laser.life = 0.12;
  }
  if (game.status !== "playing") return;

  game.bullets = game.bullets.filter((bullet) => {
    bullet.life -= delta;
    return bullet.life > 0 && moveProjectileAndBounce(bullet, delta);
  });

  game.asteroids.forEach((asteroid) => {
    asteroid.x = wrap(asteroid.x + asteroid.vx * delta, width);
    asteroid.y = wrap(asteroid.y + asteroid.vy * delta, height);
    asteroid.angle += asteroid.spin * delta;
  });

  updateEnemyShips(delta);
  updateAsteroidCollisions();
  updateEnemyShipCollisions();
  if (game.status !== "playing") return;
  updateBoss(delta);
  updateEnemyBullets(delta);
  if (game.status !== "playing") return;
  checkPowerUpCollection();
  checkPlayerCollisions();
  advanceLevelIfReady();
}

function damageAsteroid(asteroid) {
  const asteroidIndex = game.asteroids.indexOf(asteroid);
  if (asteroidIndex === -1) return;
  game.asteroids.splice(asteroidIndex, 1);
  game.score += asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
  createParticles(asteroid.x, asteroid.y, "#b8c2d8", 8 + asteroid.size * 3);
  if (asteroid.size > 1) {
    for (let index = 0; index < 2; index += 1) {
      game.asteroids.push(makeAsteroid(
        asteroid.x,
        asteroid.y,
        asteroid.size - 1,
        Math.random() * Math.PI * 2,
        70 + game.level * 12,
      ));
    }
  }
  updateHud();
}

function damageEnemyShip(enemy) {
  const enemyIndex = game.enemyShips.indexOf(enemy);
  if (enemyIndex === -1) return;
  enemy.health -= 1;
  if (enemy.health > 0) {
    createParticles(enemy.x, enemy.y, "#ffb5c5", 6);
    return;
  }
  game.enemyShips.splice(enemyIndex, 1);
  game.score += enemy.type === "bomber" ? 500 : 200;
  createParticles(enemy.x, enemy.y, enemy.type === "bomber" ? "#ffc56f" : "#ff7897", 18);
  if (enemy.type === "bomber") {
    game.powerUp = {
      x: enemy.x,
      y: enemy.y,
      radius: 14,
      life: POWER_UP_LIFETIME,
      phase: 0,
    };
    announcement.textContent = "El bombardero dejó un potenciador de rayo. Recógelo antes de que desaparezca.";
  }
  if (game.boss && game.enemyShips.length === 0) {
    game.boss.reinforcementCooldown = Math.max(game.boss.reinforcementCooldown, 3);
  }
  updateHud();
}

function damageBoss(boss, color) {
  if (game.boss !== boss) return;
  if (game.enemyShips.length > 0) {
    bossLabel.textContent = "ESCUDO ACTIVO · ELIMINA NAVES";
    createParticles(boss.x, boss.y, "#75e8ff", 4);
    return;
  }
  boss.health -= 1;
  game.score += 50;
  createParticles(boss.x, boss.y, color, 5);
  updateBossHealth();
  updateHud();
  if (boss.health <= 0) {
    createParticles(boss.x, boss.y, "#ff7897", 45);
    game.score += 1000;
    updateHud();
    game.boss = null;
    bossHud.hidden = true;
    game.enemyBullets = [];
    showVictoryScreen();
  }
}

function updateAsteroidCollisions() {
  for (let bulletIndex = game.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = game.bullets[bulletIndex];
    const asteroidIndex = game.asteroids.findIndex((asteroid) => (
      Math.hypot(asteroid.x - bullet.x, asteroid.y - bullet.y) < asteroid.radius
    ));
    if (asteroidIndex === -1) continue;

    const asteroid = game.asteroids[asteroidIndex];
    game.bullets.splice(bulletIndex, 1);
    damageAsteroid(asteroid);
  }
}

function updateEnemyShips(delta) {
  game.enemyShips.forEach((enemy) => {
    const minX = Math.max(enemy.radius, enemy.homeX - enemy.wander);
    const maxX = Math.min(width - enemy.radius, enemy.homeX + enemy.wander);
    enemy.x += enemy.direction * enemy.speed * delta;
    if (enemy.x <= minX || enemy.x >= maxX) {
      enemy.x = Math.max(minX, Math.min(maxX, enemy.x));
      enemy.direction *= -1;
    }
    enemy.y = enemy.baseY + Math.sin(clock * (1.6 + game.level * 0.09) + enemy.phase) * 26;
    enemy.fireCooldown -= delta;
    if (enemy.fireCooldown <= 0) fireEnemyBullet(enemy);
  });
}

function spawnBossReinforcements(boss) {
  const count = Math.min(2 + boss.reinforcementWave, 5);
  for (let index = 0; index < count; index += 1) {
    const enemy = makeEnemyShip(index, count, game.level);
    enemy.health += Math.floor(boss.reinforcementWave / 2);
    enemy.speed += boss.reinforcementWave * 12;
    game.enemyShips.push(enemy);
  }
  boss.reinforcementWave += 1;
  boss.reinforcementCooldown = Math.max(5, 9 - boss.reinforcementWave * 0.5);
  bossLabel.textContent = "ESCUDO ACTIVO · ELIMINA NAVES";
  announcement.textContent = `El jefe envía ${count} naves de refuerzo. El escudo lo protege.`;
}

function updateEnemyShipCollisions() {
  for (let bulletIndex = game.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = game.bullets[bulletIndex];
    const enemyIndex = game.enemyShips.findIndex((enemy) => (
      Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius
    ));
    if (enemyIndex === -1) continue;

    const enemy = game.enemyShips[enemyIndex];
    game.bullets.splice(bulletIndex, 1);
    damageEnemyShip(enemy);
  }
}

function updateBoss(delta) {
  if (!game.boss) return;
  const { boss } = game;
  boss.x = width / 2 + Math.sin(clock * 1.45) * Math.max(0, width * 0.38 - boss.radius);
  boss.y = Math.max(70, height * 0.2) + Math.sin(clock * 2.4) * 24;
  boss.reinforcementCooldown -= delta;
  if (game.enemyShips.length === 0 && boss.reinforcementCooldown <= 0) {
    spawnBossReinforcements(boss);
  }
  bossLabel.textContent = game.enemyShips.length > 0
    ? "ESCUDO ACTIVO · ELIMINA NAVES"
    : "JEFE FINAL";
  boss.fireCooldown -= delta;
  if (boss.fireCooldown <= 0) fireBossBullet();

  for (let bulletIndex = game.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = game.bullets[bulletIndex];
    if (Math.hypot(boss.x - bullet.x, boss.y - bullet.y) >= boss.radius + 3) continue;
    game.bullets.splice(bulletIndex, 1);
    damageBoss(boss, "#ff7897");
    if (game.status !== "playing") return;
  }
}

function triggerBombExplosion(bullet) {
  const life = 0.42;
  game.explosions.push({
    x: bullet.x,
    y: bullet.y,
    radius: BOMB_BLAST_RADIUS,
    life,
    maxLife: life,
  });
  createParticles(bullet.x, bullet.y, "#ffbd68", 18);
  if (Math.hypot(bullet.x - game.player.x, bullet.y - game.player.y) <= BOMB_BLAST_RADIUS + game.player.radius) {
    damagePlayer();
  }
}

function updateEnemyBullets(delta) {
  game.enemyBullets = game.enemyBullets.filter((bullet) => {
    if (game.status !== "playing") return false;
    bullet.life -= delta;
    const hasBounces = moveProjectileAndBounce(bullet, delta);
    if (bullet.type === "bomb") {
      const distance = Math.hypot(bullet.x - game.player.x, bullet.y - game.player.y);
      if (distance <= bullet.triggerRadius || distance <= game.player.radius + 3) {
        triggerBombExplosion(bullet);
        return false;
      }
    }
    if (Math.hypot(bullet.x - game.player.x, bullet.y - game.player.y) < game.player.radius + 5) {
      damagePlayer();
      return false;
    }
    return bullet.life > 0 && hasBounces;
  });
}

function checkPowerUpCollection() {
  if (!game.powerUp) return;
  const pickupY = game.powerUp.y + Math.sin(game.powerUp.phase) * 5;
  if (Math.hypot(game.powerUp.x - game.player.x, pickupY - game.player.y) > game.powerUp.radius + game.player.radius) return;
  game.powerUp = null;
  game.weaponTimer = POWER_UP_DURATION;
  announcement.textContent = "Rayo activado durante 8 segundos.";
  updateHud();
}

function checkPlayerCollisions() {
  if (game.invulnerable > 0) return;
  const asteroidHit = game.asteroids.some((asteroid) => (
    Math.hypot(asteroid.x - game.player.x, asteroid.y - game.player.y) < asteroid.radius + game.player.radius
  ));
  const bossHit = game.boss
    && Math.hypot(game.boss.x - game.player.x, game.boss.y - game.player.y) < game.boss.radius + game.player.radius;
  const enemyShipHit = game.enemyShips.some((enemy) => (
    Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) < enemy.radius + game.player.radius
  ));
  if (asteroidHit || bossHit || enemyShipHit) damagePlayer();
}

function drawBackground() {
  const spaceGradient = context.createLinearGradient(0, 0, 0, height);
  spaceGradient.addColorStop(0, "#0b1021");
  spaceGradient.addColorStop(0.52, "#080d18");
  spaceGradient.addColorStop(1, "#0a1020");
  context.fillStyle = spaceGradient;
  context.fillRect(0, 0, width, height);

  const nebula = context.createRadialGradient(width * 0.24, height * 0.28, 2, width * 0.24, height * 0.28, width * 0.48);
  nebula.addColorStop(0, "rgba(102, 74, 174, 0.18)");
  nebula.addColorStop(1, "rgba(42, 52, 100, 0)");
  context.fillStyle = nebula;
  context.fillRect(0, 0, width, height);

  const blueNebula = context.createRadialGradient(width * 0.77, height * 0.72, 1, width * 0.77, height * 0.72, width * 0.38);
  blueNebula.addColorStop(0, "rgba(36, 119, 160, 0.12)");
  blueNebula.addColorStop(1, "rgba(8, 13, 24, 0)");
  context.fillStyle = blueNebula;
  context.fillRect(0, 0, width, height);

  drawDistantWorlds();
  stars.forEach((star) => {
    context.globalAlpha = star.alpha * (0.75 + Math.sin(clock * 1.7 + star.x * 15) * 0.2);
    context.fillStyle = "#c8d6f0";
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawDistantWorlds() {
  const planetX = width * 0.81;
  const planetY = height * 0.23;
  const planetRadius = Math.min(width, height) * 0.075;

  context.save();
  context.translate(planetX, planetY);
  context.rotate(-0.2);
  context.strokeStyle = "rgba(191, 176, 255, 0.18)";
  context.lineWidth = Math.max(2, planetRadius * 0.11);
  context.beginPath();
  context.ellipse(0, 0, planetRadius * 1.7, planetRadius * 0.48, 0, 0, Math.PI * 2);
  context.stroke();
  const planetGlow = context.createRadialGradient(-planetRadius * 0.35, -planetRadius * 0.4, 1, 0, 0, planetRadius);
  planetGlow.addColorStop(0, "rgba(204, 190, 255, 0.52)");
  planetGlow.addColorStop(0.55, "rgba(108, 91, 166, 0.34)");
  planetGlow.addColorStop(1, "rgba(43, 47, 88, 0.2)");
  context.fillStyle = planetGlow;
  context.beginPath();
  context.arc(0, 0, planetRadius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(224, 214, 255, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, 0, planetRadius * 1.7, planetRadius * 0.48, 0, Math.PI, Math.PI * 2);
  context.stroke();
  context.restore();

  const moonX = width * 0.16;
  const moonY = height * 0.76;
  const moonRadius = Math.max(9, Math.min(width, height) * 0.035);
  const moonGlow = context.createRadialGradient(moonX - moonRadius * 0.3, moonY - moonRadius * 0.4, 1, moonX, moonY, moonRadius);
  moonGlow.addColorStop(0, "rgba(164, 220, 229, 0.34)");
  moonGlow.addColorStop(1, "rgba(56, 83, 106, 0.12)");
  context.fillStyle = moonGlow;
  context.beginPath();
  context.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(width * 0.12, height * 0.18);
  context.rotate(-0.35);
  context.globalAlpha = 0.22;
  context.strokeStyle = "#a9c5e8";
  context.lineWidth = 1;
  context.strokeRect(-18, -4, 36, 8);
  context.fillStyle = "#9bb6d7";
  context.fillRect(-3, -6, 6, 12);
  context.fillStyle = "rgba(79, 156, 207, 0.4)";
  context.fillRect(-35, -9, 14, 18);
  context.fillRect(21, -9, 14, 18);
  context.restore();
}

function drawPlayer() {
  const { player } = game;
  const visible = game.invulnerable <= 0 || Math.floor(clock * 12) % 2 !== 0;
  context.save();
  context.translate(player.x, player.y);
  context.rotate(player.angle);
  if (visible) {
    context.strokeStyle = "#75e8ff";
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.shadowColor = "#75e8ff";
    context.shadowBlur = 12;
    context.beginPath();
    context.moveTo(18, 0);
    context.lineTo(-12, -11);
    context.lineTo(-7, 0);
    context.lineTo(-12, 11);
    context.closePath();
    context.stroke();
    if (actions.has("forward")) {
      context.shadowBlur = 9;
      context.strokeStyle = "#c8fa65";
      context.beginPath();
      context.moveTo(-8, -5);
      context.lineTo(-18 - Math.random() * 7, 0);
      context.lineTo(-8, 5);
      context.stroke();
    }

    const percentage = Math.max(0, game.playerHealth / PLAYER_MAX_HEALTH);
    const color = percentage > 0.6 ? "#75e8ff" : percentage > 0.3 ? "#c8fa65" : "#ff7897";
    context.shadowColor = color;
    context.shadowBlur = 8 + Math.sin(clock * 7) * 3;
    context.fillStyle = "#101522";
    context.fillRect(-6, -2, 13, 4);
    context.strokeStyle = color;
    context.lineWidth = 0.7;
    context.strokeRect(-6, -2, 13, 4);
    context.fillStyle = color;
    context.fillRect(-5.4, -1.2, 11.8 * percentage, 2.4);
  }
  context.restore();
}

function drawAsteroids() {
  game.asteroids.forEach((asteroid) => {
    context.save();
    context.translate(asteroid.x, asteroid.y);
    context.rotate(asteroid.angle);
    context.strokeStyle = "#aeb9d0";
    context.lineWidth = 1.6;
    context.beginPath();
    asteroid.points.forEach((point, index) => {
      const angle = (index / asteroid.points.length) * Math.PI * 2;
      const x = Math.cos(angle) * asteroid.radius * point;
      const y = Math.sin(angle) * asteroid.radius * point;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.stroke();
    context.restore();
  });
}

function drawEnemyShips() {
  game.enemyShips.forEach((enemy) => {
    const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
    const isBomber = enemy.type === "bomber";
    const color = isBomber ? "#ffbd68" : "#ff7897";
    context.save();
    context.translate(enemy.x, enemy.y);
    context.rotate(angle);
    context.strokeStyle = color;
    context.fillStyle = isBomber ? "rgba(255, 189, 104, 0.14)" : "rgba(255, 120, 151, 0.12)";
    context.lineWidth = 2;
    context.shadowColor = color;
    context.shadowBlur = isBomber ? 18 : 12;
    context.beginPath();
    if (isBomber) {
      context.moveTo(22, 0);
      context.lineTo(10, -13);
      context.lineTo(-13, -12);
      context.lineTo(-20, -6);
      context.lineTo(-20, 6);
      context.lineTo(-13, 12);
      context.lineTo(10, 13);
    } else {
      context.moveTo(16, 0);
      context.lineTo(-11, -11);
      context.lineTo(-6, 0);
      context.lineTo(-11, 11);
    }
    context.closePath();
    context.fill();
    context.stroke();
    if (isBomber) {
      context.fillStyle = color;
      context.fillRect(-18, -3, 5, 6);
      context.fillRect(7, -3, 5, 6);
    }
    context.restore();
  });
}

function drawBoss() {
  if (!game.boss) return;
  const { boss } = game;
  context.save();
  context.translate(boss.x, boss.y);
  context.shadowColor = "#ff7897";
  context.shadowBlur = 22;
  context.fillStyle = "rgba(117, 232, 255, 0.09)";
  context.beginPath();
  context.moveTo(-20, 17);
  context.lineTo(-11, 48);
  context.lineTo(11, 48);
  context.lineTo(20, 17);
  context.closePath();
  context.fill();

  const saucerGradient = context.createLinearGradient(0, -4, 0, 25);
  saucerGradient.addColorStop(0, "#ffb2c2");
  saucerGradient.addColorStop(0.45, "#cc587d");
  saucerGradient.addColorStop(1, "#542d68");
  context.fillStyle = saucerGradient;
  context.strokeStyle = "#ff7897";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 10, boss.radius * 1.35, boss.radius * 0.48, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "rgba(10, 17, 34, 0.92)";
  context.beginPath();
  context.ellipse(0, -2, boss.radius * 0.55, boss.radius * 0.39, 0, Math.PI, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255, 188, 208, 0.8)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.ellipse(0, -2, boss.radius * 0.55, boss.radius * 0.39, 0, Math.PI, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#8fffc6";
  context.shadowColor = "#8fffc6";
  context.shadowBlur = 18;
  context.beginPath();
  context.ellipse(0, -boss.radius * 0.63, boss.radius * 0.34, boss.radius * 0.43, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#101522";
  context.shadowColor = "#101522";
  context.shadowBlur = 0;
  context.beginPath();
  context.ellipse(-5, -boss.radius * 0.67, 3.3, 7, -0.18, 0, Math.PI * 2);
  context.ellipse(5, -boss.radius * 0.67, 3.3, 7, 0.18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ff7897";
  context.beginPath();
  context.arc(-5, -boss.radius * 0.67, 1.4, 0, Math.PI * 2);
  context.arc(5, -boss.radius * 0.67, 1.4, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 0;
  [-28, -14, 0, 14, 28].forEach((lightX, index) => {
    context.fillStyle = index % 2 === 0 ? "#c8fa65" : "#75e8ff";
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 9;
    context.beginPath();
    context.arc(lightX, 10, 2, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawProjectiles() {
  context.fillStyle = "#c8fa65";
  context.shadowColor = "#c8fa65";
  context.shadowBlur = 10;
  game.bullets.forEach((bullet) => {
    context.beginPath();
    context.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2);
    context.fill();
  });
  game.enemyBullets.forEach((bullet) => {
    const color = bullet.type === "bomb" ? "#ffbd68" : "#ff7897";
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = bullet.type === "bomb" ? 14 : 10;
    context.beginPath();
    context.arc(bullet.x, bullet.y, bullet.type === "bomb" ? 6 : 4, 0, Math.PI * 2);
    context.fill();
  });
  context.shadowBlur = 0;
}

function drawLaser() {
  if (!game.laser) return;
  const { laser } = game;
  const alpha = Math.min(1, laser.life / 0.12);
  const endX = laser.x + Math.cos(laser.angle) * laser.distance;
  const endY = laser.y + Math.sin(laser.angle) * laser.distance;

  context.save();
  context.globalAlpha = alpha;
  context.lineCap = "round";
  context.strokeStyle = "#55eaff";
  context.shadowColor = "#55eaff";
  context.shadowBlur = 22;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(laser.x, laser.y);
  context.lineTo(endX, endY);
  context.stroke();
  context.strokeStyle = "#eaffff";
  context.shadowBlur = 10;
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

function drawPowerUp() {
  if (!game.powerUp) return;
  const { powerUp } = game;
  const y = powerUp.y + Math.sin(powerUp.phase) * 5;
  const pulse = 0.75 + Math.sin(powerUp.phase * 2) * 0.2;
  context.save();
  context.translate(powerUp.x, y);
  context.rotate(powerUp.phase * 0.3);
  context.globalAlpha = Math.min(1, powerUp.life);
  context.shadowColor = "#75e8ff";
  context.shadowBlur = 15 * pulse;
  context.strokeStyle = "#75e8ff";
  context.fillStyle = "rgba(117, 232, 255, 0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -13);
  context.lineTo(13, 0);
  context.lineTo(0, 13);
  context.lineTo(-13, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#eaffff";
  context.font = "700 12px 'Space Grotesk', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("R", 0, 1);
  context.restore();
}

function drawExplosions() {
  game.explosions.forEach((explosion) => {
    const progress = 1 - explosion.life / explosion.maxLife;
    context.save();
    context.globalAlpha = 1 - progress;
    context.strokeStyle = "#ffbd68";
    context.fillStyle = "rgba(255, 160, 76, 0.1)";
    context.shadowColor = "#ff8a4c";
    context.shadowBlur = 22;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(explosion.x, explosion.y, explosion.radius * progress, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  });
}

function drawParticles() {
  game.particles.forEach((particle) => {
    context.globalAlpha = particle.life / particle.maxLife;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawTransitionMessage() {
  if (game.transition <= 0) return;
  const nextLevel = game.level + 1;
  context.save();
  context.textAlign = "center";
  context.fillStyle = "#75e8ff";
  context.shadowColor = "#75e8ff";
  context.shadowBlur = 14;
  context.font = "700 20px 'Space Grotesk', sans-serif";
  const message = nextLevel === FINAL_LEVEL
    ? "JEFE FINAL ENTRANTE"
    : `NIVEL ${game.level} SUPERADO`;
  context.fillText(message, width / 2, height / 2);
  context.restore();
}

function draw() {
  drawBackground();
  drawAsteroids();
  drawEnemyShips();
  drawBoss();
  drawProjectiles();
  drawExplosions();
  drawPowerUp();
  drawLaser();
  drawParticles();
  if (game.player) drawPlayer();
  drawTransitionMessage();
}

function frame(timestamp) {
  const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.033) : 0;
  lastFrame = timestamp;
  update(delta);
  draw();
  window.requestAnimationFrame(frame);
}

const keyActions = new Map([
  ["ArrowLeft", "left"],
  ["a", "left"],
  ["A", "left"],
  ["ArrowRight", "right"],
  ["d", "right"],
  ["D", "right"],
  ["ArrowUp", "forward"],
  ["w", "forward"],
  ["W", "forward"],
  [" ", "shoot"],
]);

window.addEventListener("keydown", (event) => {
  const action = keyActions.get(event.key);
  if (action && game.status === "playing" && !instructionsOpen) {
    event.preventDefault();
    actions.add(action);
  }
});

window.addEventListener("keyup", (event) => {
  const action = keyActions.get(event.key);
  if (action) actions.delete(action);
});

window.addEventListener("blur", () => actions.clear());

document.querySelectorAll("[data-action]").forEach((button) => {
  const action = button.dataset.action;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    actions.add(action);
    button.setPointerCapture(event.pointerId);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    button.addEventListener(eventName, () => actions.delete(action));
  });
});

startButton.addEventListener("click", startGame);
howToPlayButton.addEventListener("click", () => {
  instructionsOpen = !instructionsOpen;
  instructionsPanel.hidden = !instructionsOpen;
  howToPlayButton.setAttribute("aria-expanded", String(instructionsOpen));
  if (instructionsOpen) actions.clear();
});
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
window.requestAnimationFrame(frame);
