"use strict";

(() => {
  const SAVE_KEY = "speed-games-lumbre-save-v1";
  const DEFAULT_CHARACTER_NAME = "Lía";
  const biomes = [
    {
      id: "forest",
      name: "Bosque de Ámbar",
      layer: "raíces y helechos",
      landmark: "tree",
      foes: [
        { name: "Guardia de espinas", species: "forest-thorn", hp: 32, attack: 5, xp: 13, coins: 8 },
        { name: "Bruja de esporas", species: "forest-spore", hp: 38, attack: 6, xp: 16, coins: 10 },
        { name: "Vigía ciervo", species: "forest-stag", hp: 46, attack: 7, xp: 20, coins: 12 }
      ],
      boss: { name: "Coloso de la arboleda", species: "forest-colossus", hp: 135, attack: 11, xp: 62, coins: 38 }
    },
    {
      id: "dungeon",
      name: "Catacumbas del Eco",
      layer: "arcos de basalto y brasas",
      landmark: "crypt",
      foes: [
        { name: "Caballero del hollín", species: "dungeon-knight", hp: 68, attack: 10, xp: 27, coins: 17 },
        { name: "Acólito de ceniza", species: "dungeon-acolyte", hp: 82, attack: 12, xp: 32, coins: 20 },
        { name: "Gárgola de caliza", species: "dungeon-gargoyle", hp: 98, attack: 13, xp: 37, coins: 23 }
      ],
      boss: { name: "Carcelero del abismo", species: "dungeon-jailer", hp: 265, attack: 18, xp: 112, coins: 72 }
    },
    {
      id: "desert",
      name: "Desierto de Cristal",
      layer: "dunas talladas por el viento",
      landmark: "dune",
      foes: [
        { name: "Lancero de obsidiana", species: "desert-lancer", hp: 112, attack: 15, xp: 41, coins: 26 },
        { name: "Acechador escorpión", species: "desert-stalker", hp: 128, attack: 17, xp: 47, coins: 30 },
        { name: "Oráculo de sal", species: "desert-oracle", hp: 145, attack: 18, xp: 53, coins: 34 }
      ],
      boss: { name: "Rey de las dunas huecas", species: "desert-king", hp: 390, attack: 24, xp: 150, coins: 100 }
    },
    {
      id: "sea",
      name: "Abismo Coralino",
      layer: "arrecifes sumergidos y corrientes",
      landmark: "coral",
      foes: [
        { name: "Caballero abisal", species: "sea-knight", hp: 150, attack: 18, xp: 48, coins: 31 },
        { name: "Oráculo coralino", species: "sea-oracle", hp: 170, attack: 20, xp: 54, coins: 36 },
        { name: "Náufrago de las mareas", species: "sea-drowned", hp: 194, attack: 22, xp: 61, coins: 40 }
      ],
      boss: { name: "Leviatán de la fosa", species: "sea-leviathan", hp: 510, attack: 29, xp: 185, coins: 122 }
    },
    {
      id: "ruins",
      name: "Ruinas Celestes",
      layer: "observatorios quebrados y runas",
      landmark: "obelisk",
      foes: [
        { name: "Centinela de bronce", species: "ruins-sentinel", hp: 185, attack: 20, xp: 55, coins: 36 },
        { name: "Mantis del altar", species: "ruins-mantis", hp: 205, attack: 22, xp: 62, coins: 40 },
        { name: "Heraldo alado", species: "ruins-herald", hp: 230, attack: 24, xp: 69, coins: 45 }
      ],
      boss: { name: "Titán de la bóveda", species: "ruins-titan", hp: 620, attack: 32, xp: 215, coins: 142 }
    }
  ];
  const heroStyles = ["scout", "arcanist", "warden"];
  const heroRoles = {
    scout: "EXPLORADORA",
    arcanist: "ARCANISTA",
    warden: "GUARDIANA"
  };
  const DEFAULT_HERO_COLOR = "#d59663";
  const difficultyModes = {
    calm: { label: "TRANQUILO", damageMultiplier: 0.7, rewardMultiplier: 1 },
    standard: { label: "AVENTURERO", damageMultiplier: 1, rewardMultiplier: 1 },
    challenge: { label: "INTENSO", damageMultiplier: 1.35, rewardMultiplier: 1.25 }
  };
  const recipes = [
    {
      id: "branch-blade",
      name: "Filo de rama",
      description: "Ligero y fiable para los primeros senderos.",
      type: "weapon",
      cost: { branches: 4, stones: 2 },
      attack: 4
    },
    {
      id: "iron-leaf",
      name: "Hoja de hierro",
      description: "Un filo equilibrado, reforzado con metal.",
      type: "weapon",
      cost: { branches: 2, stones: 3, metal: 4 },
      attack: 8
    },
    {
      id: "bark-vest",
      name: "Coraza de corteza",
      description: "Capas flexibles que protegen sin estorbar.",
      type: "armor",
      cost: { branches: 5, stones: 3 },
      armor: 2,
      maxHp: 15
    },
    {
      id: "forged-coat",
      name: "Armadura de forja",
      description: "Placas resistentes para expediciones largas.",
      type: "armor",
      cost: { branches: 2, stones: 4, metal: 5 },
      armor: 5,
      maxHp: 28
    }
  ];

  function worldHash(index, salt) {
    let value = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x27d4eb2d);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return (value ^ (value >>> 16)) >>> 0;
  }

  function zoneAt(index) {
    const primaryIndex = index % biomes.length;
    const secondaryIndex = index === 0
      ? 1
      : (primaryIndex + 1 + worldHash(index, 2) % (biomes.length - 1)) % biomes.length;
    const primary = biomes[primaryIndex];
    const secondary = biomes[secondaryIndex];
    return {
      index,
      name: index === 0 ? "Pradera de Ámbar" : `${primary.name} · Tramo ${index + 1}`,
      biome: primary.id,
      secondaryBiome: secondary.id,
      mix: `${primary.name} + ${secondary.name}`,
      description: `${primary.layer}, entrelazados con ${secondary.layer}`,
      landmark: primary.landmark,
      secondaryLandmark: secondary.landmark,
      variant: worldHash(index, 3) % 4,
      hue: (worldHash(index, 4) % 61) - 30,
      unlockLevel: Math.min(100, 1 + Math.floor(index / 2)),
      foes: primary.foes,
      boss: primary.boss
    };
  }

  const elements = {
    zoneName: document.querySelector("#zone-name"),
    worldMix: document.querySelector("#world-mix"),
    scene: document.querySelector("#landscape-scene"),
    worldProps: document.querySelector("#world-props"),
    traveler: document.querySelector("#traveler"),
    sceneCaption: document.querySelector("#scene-caption"),
    creature: document.querySelector("#creature"),
    enemyTag: document.querySelector("#enemy-tag"),
    enemyName: document.querySelector("#enemy-name"),
    enemyHp: document.querySelector("#enemy-health"),
    enemyHpLabel: document.querySelector("#enemy-hp-label"),
    heroHp: document.querySelector("#hero-health"),
    heroHpLabel: document.querySelector("#hero-hp-label"),
    heroName: document.querySelector("#hero-name"),
    characterName: document.querySelector("#character-name"),
    heroRole: document.querySelector("#hero-role"),
    characterNameInput: document.querySelector("#character-name-input"),
    characterNameForm: document.querySelector("#character-name-form"),
    characterNameStatus: document.querySelector("#character-name-status"),
    inventoryCharacterName: document.querySelector("#inventory-character-name"),
    level: document.querySelector("#hero-level"),
    xpLabel: document.querySelector("#xp-label"),
    xpMeter: document.querySelector("#xp-meter"),
    coins: document.querySelector("#coin-count"),
    essence: document.querySelector("#essence-count"),
    attack: document.querySelector("#attack-stat"),
    armor: document.querySelector("#armor-stat"),
    kills: document.querySelector("#kill-count"),
    weaponLevel: document.querySelector("#weapon-level"),
    armorLevel: document.querySelector("#armor-level"),
    weaponCost: document.querySelector("#weapon-cost"),
    armorCost: document.querySelector("#armor-cost"),
    armorSprite: document.querySelector("#armor-design-in-scene"),
    weaponButton: document.querySelector("#weapon-upgrade"),
    armorButton: document.querySelector("#armor-upgrade"),
    potionButton: document.querySelector("#heal-button"),
    strongAttackButton: document.querySelector("#strong-attack-button"),
    strongAttackLabel: document.querySelector("#strong-attack-label"),
    strongAttackHint: document.querySelector("#strong-attack-hint"),
    toggleButton: document.querySelector("#expedition-toggle"),
    resetButton: document.querySelector("#reset-game"),
    helpButton: document.querySelector("#guide-open"),
    inventoryButton: document.querySelector("#inventory-open"),
    inventoryCount: document.querySelector("#inventory-count"),
    guideDialog: document.querySelector("#guide-dialog"),
    guideTitle: document.querySelector("#guide-title"),
    guideIntro: document.querySelector("#guide-intro"),
    heroColorPicker: document.querySelector("#hero-color-picker"),
    heroStyleRadios: [...document.querySelectorAll('input[name="hero-style"]')],
    guideContinue: document.querySelector("#guide-continue"),
    guideClose: document.querySelector("#guide-close"),
    modeIndicator: document.querySelector("#mode-indicator"),
    inventoryDialog: document.querySelector("#inventory-dialog"),
    inventoryClose: document.querySelector("#inventory-close"),
    branchCount: document.querySelector("#branch-count"),
    stoneCount: document.querySelector("#stone-count"),
    metalCount: document.querySelector("#metal-count"),
    runeCount: document.querySelector("#rune-count"),
    recipeList: document.querySelector("#recipe-list"),
    weaponItems: document.querySelector("#weapon-items"),
    armorItems: document.querySelector("#armor-items"),
    runeWeapon: document.querySelector("#rune-weapon"),
    runeArmor: document.querySelector("#rune-armor"),
    designCanvas: document.querySelector("#armor-design-canvas"),
    designColor: document.querySelector("#design-color"),
    designSize: document.querySelector("#design-size"),
    designSizeLabel: document.querySelector("#design-size-label"),
    designEraser: document.querySelector("#design-eraser"),
    designClear: document.querySelector("#design-clear"),
    designSave: document.querySelector("#design-save"),
    designStatus: document.querySelector("#design-status"),
    routeList: document.querySelector("#route-list"),
    journal: document.querySelector("#journal-list"),
    saveStatus: document.querySelector("#save-status")
  };

  const freshState = () => ({
    worldVersion: 2,
    level: 1,
    xp: 0,
    coins: 20,
    essence: 0,
    hp: 100,
    maxHp: 100,
    attack: 12,
    armor: 0,
    weaponLevel: 0,
    armorLevel: 0,
    kills: 0,
    zone: 0,
    zoneDefeats: { 0: 0 },
    enemyHp: null,
    running: false,
    tick: 0,
    started: false,
    difficulty: "standard",
    characterName: DEFAULT_CHARACTER_NAME,
    heroStyle: "scout",
    heroColor: DEFAULT_HERO_COLOR,
    materials: { branches: 0, stones: 0, metal: 0, runes: 0 },
    weapons: [],
    armors: [],
    equippedWeaponId: null,
    equippedArmorId: null,
    nextGearId: 1,
    armorDesign: null,
    journal: [`${DEFAULT_CHARACTER_NAME} encuentra un farol encendido al borde del sendero.`]
  });

  let saveWarning = "";
  let state = loadState();
  let enemy = makeEnemy();
  let timer = null;
  let strongAttackReadyAt = 0;
  let playerAnimationTimer = null;
  let isDrawing = false;
  let renderedWorldKey = "";
  let renderedRouteKey = "";

  if (Number.isFinite(state.enemyHp) && state.enemyHp > 0) {
    enemy.hp = Math.min(enemy.maxHp, state.enemyHp);
  }

  function loadState() {
    const defaults = freshState();
    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (error) {
      saveWarning = "El guardado local no está disponible en este navegador.";
      return defaults;
    }
    if (!raw) return defaults;

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      saveWarning = "El guardado anterior no se pudo leer; se inició una aventura nueva.";
      return defaults;
    }
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      saveWarning = "El guardado anterior no era válido; se inició una aventura nueva.";
      return defaults;
    }

    const numberOrDefault = (value, fallback, min, max) =>
      Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
    const hasLegacyRoutes = Array.isArray(saved.zoneDefeats);
    const storedDefeats = Array.isArray(saved.zoneDefeats)
      ? saved.zoneDefeats
      : saved.zoneDefeats && typeof saved.zoneDefeats === "object"
        ? saved.zoneDefeats
        : defaults.zoneDefeats;
    const zoneDefeats = { 0: 0 };
    Object.entries(storedDefeats).forEach(([index, count]) => {
      if (/^\d+$/.test(index)) {
        const oldIndex = Number(index);
        const newIndex = hasLegacyRoutes && oldIndex === 1
          ? 3
          : hasLegacyRoutes && oldIndex === 2
            ? 4
            : oldIndex;
        if (Number.isSafeInteger(newIndex)) {
          zoneDefeats[newIndex] = numberOrDefault(count, 0, 0, 1000000);
        }
      }
    });
    const sanitizeGear = (items, type) => {
      if (!Array.isArray(items)) return [];
      return items.slice(0, 100)
        .filter((item) => item && typeof item === "object" && item.type === type)
        .map((item) => ({
          id: numberOrDefault(item.id, 0, 0, 1000000),
          name: typeof item.name === "string" ? item.name.slice(0, 60) : "Equipo sin nombre",
          type,
          attack: numberOrDefault(item.attack, 0, 0, 1000),
          armor: numberOrDefault(item.armor, 0, 0, 1000),
          maxHp: numberOrDefault(item.maxHp, 0, 0, 10000),
          runeApplied: item.runeApplied === true,
          runeAttack: numberOrDefault(item.runeAttack, 0, 0, 1000),
          runeArmor: numberOrDefault(item.runeArmor, 0, 0, 1000),
          runeHp: numberOrDefault(item.runeHp, 0, 0, 10000),
          design: typeof item.design === "string" &&
            item.design.startsWith("data:image/png;base64,") &&
            item.design.length <= 300000
            ? item.design
            : null
        }));
    };
    const weapons = sanitizeGear(saved.weapons, "weapon");
    const armors = sanitizeGear(saved.armors, "armor");
    const materials = saved.materials && typeof saved.materials === "object"
      ? saved.materials
      : defaults.materials;
    const storedArmorDesign = typeof saved.armorDesign === "string" &&
      saved.armorDesign.startsWith("data:image/png;base64,") &&
      saved.armorDesign.length <= 300000
      ? saved.armorDesign
      : null;
    const savedCharacterName = typeof saved.characterName === "string"
      ? saved.characterName.trim().slice(0, 18)
      : "";
    const savedHeroColor = typeof saved.heroColor === "string" &&
      /^#[\da-f]{6}$/i.test(saved.heroColor)
      ? saved.heroColor
      : defaults.heroColor;
    const savedHeroStyle = heroStyles.includes(saved.heroStyle)
      ? saved.heroStyle
      : defaults.heroStyle;
    const savedZone = numberOrDefault(saved.zone, defaults.zone, 0, Number.MAX_SAFE_INTEGER - 2);
    const migratedZone = hasLegacyRoutes && savedZone === 1
      ? 3
      : hasLegacyRoutes && savedZone === 2
        ? 4
        : savedZone;
    return {
      ...defaults,
      worldVersion: 2,
      level: numberOrDefault(saved.level, defaults.level, 1, 100),
      xp: numberOrDefault(saved.xp, defaults.xp, 0, 1000000),
      coins: numberOrDefault(saved.coins, defaults.coins, 0, 1000000),
      essence: numberOrDefault(saved.essence, defaults.essence, 0, 1000000),
      hp: numberOrDefault(saved.hp, defaults.hp, 0, 100000),
      maxHp: numberOrDefault(saved.maxHp, defaults.maxHp, 1, 100000),
      attack: numberOrDefault(saved.attack, defaults.attack, 1, 100000),
      armor: numberOrDefault(saved.armor, defaults.armor, 0, 100000),
      weaponLevel: numberOrDefault(saved.weaponLevel, defaults.weaponLevel, 0, 1000),
      armorLevel: numberOrDefault(saved.armorLevel, defaults.armorLevel, 0, 1000),
      kills: numberOrDefault(saved.kills, defaults.kills, 0, 1000000),
      zone: migratedZone,
      zoneDefeats,
      enemyHp: hasLegacyRoutes ? 0 : numberOrDefault(saved.enemyHp, 0, 0, 1000000000),
      running: false,
      tick: 0,
      started: typeof saved.started === "boolean"
        ? saved.started
        : Boolean(saved.kills > 0 || saved.level > 1 || saved.tick > 0 || saved.running),
      difficulty: difficultyModes[saved.difficulty] ? saved.difficulty : "standard",
      characterName: savedCharacterName || defaults.characterName,
      heroStyle: savedHeroStyle,
      heroColor: savedHeroColor,
      materials: {
        branches: numberOrDefault(materials.branches, 0, 0, 1000000),
        stones: numberOrDefault(materials.stones, 0, 0, 1000000),
        metal: numberOrDefault(materials.metal, 0, 0, 1000000),
        runes: numberOrDefault(materials.runes, 0, 0, 100000)
      },
      weapons,
      armors,
      equippedWeaponId: weapons.some((item) => item.id === saved.equippedWeaponId)
        ? saved.equippedWeaponId
        : null,
      equippedArmorId: armors.some((item) => item.id === saved.equippedArmorId)
        ? saved.equippedArmorId
        : null,
      nextGearId: numberOrDefault(
        saved.nextGearId,
        Math.max(0, ...weapons.concat(armors).map((item) => item.id)) + 1,
        1,
        1000000
      ),
      armorDesign: storedArmorDesign,
      journal: Array.isArray(saved.journal)
        ? saved.journal.filter((line) => typeof line === "string").slice(0, 5)
        : defaults.journal
    };
  }

  function makeEnemy() {
    const zone = zoneAt(state.zone);
    const defeated = state.zoneDefeats[state.zone] || 0;
    const isBoss = (defeated + 1) % 5 === 0;
    const base = isBoss
      ? zone.boss
      : zone.foes[defeated % zone.foes.length];
    const scale = 1 + Math.log2(state.zone + 1) * 0.32 + Math.floor(defeated / 5) * 0.18;
    const worldPressure = 1 + Math.max(0, state.zone - 1) * 0.15;
    return {
      name: base.name,
      species: base.species,
      biome: zone.biome,
      maxHp: Math.round(base.hp * scale * worldPressure),
      hp: Math.round(base.hp * scale * worldPressure),
      attack: Math.round(base.attack * scale * worldPressure),
      xp: Math.round(base.xp * scale),
      coins: Math.round(base.coins * scale),
      isBoss
    };
  }

  function xpToNextLevel() {
    return 40 + (state.level - 1) * 25;
  }

  function weaponPrice() {
    return 25 + state.weaponLevel * 18;
  }

  function armorPrice() {
    return 22 + state.armorLevel * 16;
  }

  function getEquippedWeapon() {
    return state.weapons.find((item) => item.id === state.equippedWeaponId) || null;
  }

  function getEquippedArmor() {
    return state.armors.find((item) => item.id === state.equippedArmorId) || null;
  }

  function playerAttack() {
    const weapon = getEquippedWeapon();
    return state.attack + (weapon ? weapon.attack + weapon.runeAttack : 0);
  }

  function playerArmor() {
    const armor = getEquippedArmor();
    return state.armor + (armor ? armor.armor + armor.runeArmor : 0);
  }

  function playerMaxHp() {
    const armor = getEquippedArmor();
    return state.maxHp + (armor ? armor.maxHp + armor.runeHp : 0);
  }

  function updateArmorSprite() {
    const armor = getEquippedArmor();
    const design = armor && armor.design;
    elements.armorSprite.hidden = !design;
    if (design && elements.armorSprite.getAttribute("src") !== design) {
      elements.armorSprite.src = design;
    } else if (!design) {
      elements.armorSprite.removeAttribute("src");
    }
  }

  function save() {
    state.enemyHp = enemy.hp;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      elements.saveStatus.textContent = "Progreso guardado en este dispositivo";
      elements.saveStatus.classList.remove("save-status--warning");
      saveWarning = "";
    } catch (error) {
      saveWarning = "No se pudo guardar el progreso; puedes seguir jugando mientras esta página permanezca abierta.";
      showSaveStatus();
    }
  }

  function showSaveStatus() {
    elements.saveStatus.textContent = saveWarning || "Progreso guardado en este dispositivo";
    elements.saveStatus.classList.toggle("save-status--warning", Boolean(saveWarning));
  }

  function addLog(message) {
    state.journal.unshift(message);
    state.journal = state.journal.slice(0, 4);
  }

  function renderJournal() {
    elements.journal.replaceChildren();
    state.journal.forEach((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      elements.journal.append(item);
    });
  }

  function hasMaterials(cost) {
    return Object.entries(cost).every(([key, amount]) => state.materials[key] >= amount);
  }

  function recipeCostText(cost) {
    const labels = { branches: "ramas", stones: "rocas", metal: "metal" };
    return Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => `${amount} ${labels[key]}`)
      .join(" · ");
  }

  function renderRecipes() {
    elements.recipeList.replaceChildren();
    recipes.forEach((recipe) => {
      const card = document.createElement("article");
      card.className = "recipe-card";

      const description = document.createElement("div");
      const title = document.createElement("h4");
      title.textContent = recipe.name;
      const detail = document.createElement("p");
      detail.textContent = recipe.description;
      const stats = document.createElement("span");
      stats.className = "recipe-stats";
      stats.textContent = recipe.type === "weapon"
        ? `Fuerza +${recipe.attack}`
        : `Armadura +${recipe.armor} · Salud +${recipe.maxHp}`;
      const cost = document.createElement("div");
      cost.className = "recipe-cost";
      cost.textContent = recipeCostText(recipe.cost);
      description.append(title, detail, stats, cost);

      const craft = document.createElement("button");
      craft.className = "craft-button";
      craft.type = "button";
      craft.dataset.recipe = recipe.id;
      craft.textContent = "Fabricar";
      craft.disabled = !hasMaterials(recipe.cost);
      card.append(description, craft);
      elements.recipeList.append(card);
    });
  }

  function renderGearList(container, items, type) {
    container.replaceChildren();
    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-inventory";
      empty.textContent = "Aún no has fabricado equipo de este tipo.";
      container.append(empty);
      return;
    }

    const equippedId = type === "weapon" ? state.equippedWeaponId : state.equippedArmorId;
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = `inventory-item${item.id === equippedId ? " is-equipped" : ""}`;
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.name;
      if (item.id === equippedId) {
        const equipped = document.createElement("span");
        equipped.className = "equipped-label";
        equipped.textContent = "EQUIPADA";
        title.append(" ", equipped);
      }

      const detail = document.createElement("small");
      detail.textContent = type === "weapon"
        ? `Fuerza +${item.attack + item.runeAttack}${item.runeApplied ? " · Runa grabada" : ""}`
        : `Armadura +${item.armor + item.runeArmor} · Salud +${item.maxHp + item.runeHp}${item.runeApplied ? " · Runa grabada" : ""}`;
      copy.append(title, detail);

      const equip = document.createElement("button");
      equip.className = "equip-button";
      equip.type = "button";
      equip.dataset.gearType = type;
      equip.dataset.gearId = String(item.id);
      equip.textContent = item.id === equippedId ? "Equipada" : "Equipar";
      equip.disabled = item.id === equippedId;
      card.append(copy, equip);
      container.append(card);
    });
  }

  function renderInventory() {
    elements.branchCount.textContent = state.materials.branches;
    elements.stoneCount.textContent = state.materials.stones;
    elements.metalCount.textContent = state.materials.metal;
    elements.runeCount.textContent = state.materials.runes;
    renderRecipes();
    renderGearList(elements.weaponItems, state.weapons, "weapon");
    renderGearList(elements.armorItems, state.armors, "armor");

    const weapon = getEquippedWeapon();
    const armor = getEquippedArmor();
    elements.runeWeapon.disabled = !weapon || weapon.runeApplied || state.materials.runes < 1;
    elements.runeArmor.disabled = !armor || armor.runeApplied || state.materials.runes < 1;
  }

  function openInventory() {
    if (elements.inventoryDialog.open) return;
    if (state.running) {
      state.running = false;
      window.clearInterval(timer);
      timer = null;
      addLog("La expedición se pausó para organizar el inventario.");
      updateUI();
      save();
    }
    renderInventory();
    loadArmorCanvas();
    elements.inventoryDialog.showModal();
  }

  function loadArmorCanvas() {
    const context = elements.designCanvas.getContext("2d");
    context.clearRect(0, 0, elements.designCanvas.width, elements.designCanvas.height);
    const armor = getEquippedArmor();
    const design = armor && armor.design ? armor.design : state.armorDesign;
    if (!design) {
      elements.designStatus.textContent = armor
        ? "Dibuja un diseño para la armadura equipada."
        : "Puedes preparar un diseño y se aplicará a la próxima armadura que equipes.";
      return;
    }

    const image = new Image();
    image.addEventListener("load", () => {
      context.clearRect(0, 0, elements.designCanvas.width, elements.designCanvas.height);
      context.drawImage(image, 0, 0, elements.designCanvas.width, elements.designCanvas.height);
      elements.designStatus.textContent = "Diseño cargado. Puedes modificarlo o guardarlo.";
    });
    image.addEventListener("error", () => {
      elements.designStatus.textContent = "No se pudo cargar el diseño guardado.";
    });
    image.src = design;
  }

  function craftGear(recipeId) {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe || !hasMaterials(recipe.cost)) return;
    Object.entries(recipe.cost).forEach(([key, amount]) => {
      state.materials[key] -= amount;
    });

    const item = {
      id: state.nextGearId++,
      name: recipe.name,
      type: recipe.type,
      attack: recipe.attack || 0,
      armor: recipe.armor || 0,
      maxHp: recipe.maxHp || 0,
      runeApplied: false,
      runeAttack: 0,
      runeArmor: 0,
      runeHp: 0,
      design: recipe.type === "armor" && state.armors.length === 0
        ? state.armorDesign
        : null
    };

    let equipped = false;
    if (recipe.type === "weapon") {
      state.weapons.push(item);
      if (state.equippedWeaponId === null) {
        state.equippedWeaponId = item.id;
        equipped = true;
      }
    } else {
      const previousMaxHp = playerMaxHp();
      state.armors.push(item);
      if (state.equippedArmorId === null) {
        state.equippedArmorId = item.id;
        state.armorDesign = item.design;
        state.hp = Math.min(playerMaxHp(), state.hp + playerMaxHp() - previousMaxHp);
        equipped = true;
      }
    }

    addLog(`Fabricaste ${item.name}.${equipped ? " Ya está equipada." : " Puedes equiparla desde el inventario."}`);
    updateUI();
    renderInventory();
    save();
  }

  function equipGear(type, id) {
    if (type === "weapon") {
      const item = state.weapons.find((gear) => gear.id === id);
      if (!item) return;
      state.equippedWeaponId = item.id;
      addLog(`${state.characterName} equipa ${item.name}.`);
    } else {
      const item = state.armors.find((gear) => gear.id === id);
      if (!item) return;
      const previousMaxHp = playerMaxHp();
      state.equippedArmorId = item.id;
      state.armorDesign = item.design;
      const newMaxHp = playerMaxHp();
      state.hp = Math.min(newMaxHp, state.hp + Math.max(0, newMaxHp - previousMaxHp));
      addLog(`${state.characterName} equipa ${item.name}.`);
    }
    updateUI();
    renderInventory();
    save();
  }

  function applyRune(type) {
    const item = type === "weapon" ? getEquippedWeapon() : getEquippedArmor();
    if (!item || item.runeApplied || state.materials.runes < 1) return;
    state.materials.runes -= 1;
    item.runeApplied = true;
    if (type === "weapon") {
      item.runeAttack = 5;
      addLog(`Una runa se une a ${item.name}: +5 de fuerza.`);
    } else {
      const previousMaxHp = playerMaxHp();
      item.runeArmor = 3;
      item.runeHp = 18;
      state.hp = Math.min(playerMaxHp(), state.hp + playerMaxHp() - previousMaxHp);
      addLog(`Una runa refuerza ${item.name}: +3 de armadura y +18 de salud máxima.`);
    }
    updateUI();
    renderInventory();
    save();
  }

  function handleGearClick(event) {
    const button = event.target.closest("[data-gear-type]");
    if (!button) return;
    equipGear(button.dataset.gearType, Number(button.dataset.gearId));
  }

  function renameCharacter(event) {
    event.preventDefault();
    const name = elements.characterNameInput.value.trim().slice(0, 18);
    if (!name) {
      elements.characterNameStatus.textContent = "Escribe un nombre antes de guardar.";
      elements.characterNameInput.focus();
      return;
    }

    state.characterName = name;
    elements.characterNameInput.value = name;
    elements.characterNameStatus.textContent = "Nombre guardado.";
    addLog(`Tu personaje ahora se llama ${name}.`);
    updateUI();
    save();
  }

  function drawOnArmor(event) {
    const context = elements.designCanvas.getContext("2d");
    const rect = elements.designCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * elements.designCanvas.width / rect.width;
    const y = (event.clientY - rect.top) * elements.designCanvas.height / rect.height;
    if (event.type === "pointerdown") {
      isDrawing = true;
      event.preventDefault();
      elements.designCanvas.setPointerCapture(event.pointerId);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y);
    } else {
      context.lineTo(x, y);
    }
    context.lineWidth = Number(elements.designSize.value) * elements.designCanvas.width / rect.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = elements.designColor.value;
    context.globalCompositeOperation = elements.designEraser.getAttribute("aria-pressed") === "true"
      ? "destination-out"
      : "source-over";
    context.stroke();
    context.globalCompositeOperation = "source-over";
    elements.designStatus.textContent = "Cambios sin guardar.";
  }

  function stopDrawing(event) {
    if (!isDrawing) return;
    isDrawing = false;
    if (elements.designCanvas.hasPointerCapture(event.pointerId)) {
      elements.designCanvas.releasePointerCapture(event.pointerId);
    }
  }

  function saveArmorDesign() {
    try {
      const design = elements.designCanvas.toDataURL("image/png");
      state.armorDesign = design;
      const armor = getEquippedArmor();
      if (armor) armor.design = design;
      updateUI();
      save();
      elements.designStatus.textContent = saveWarning
        ? "Diseño aplicado; el navegador no pudo guardar el progreso."
        : armor
          ? "Diseño guardado y aplicado a la armadura equipada."
          : "Diseño guardado. Se aplicará a la próxima armadura que equipes.";
    } catch (error) {
      elements.designStatus.textContent = "No se pudo guardar el dibujo en este navegador.";
    }
  }

  function clearArmorDesign() {
    const context = elements.designCanvas.getContext("2d");
    context.clearRect(0, 0, elements.designCanvas.width, elements.designCanvas.height);
    elements.designStatus.textContent = "Lienzo limpio. Guarda para actualizar la armadura.";
  }

  function renderWorldProps(zone) {
    const worldKey = `${zone.index}:${zone.biome}:${zone.secondaryBiome}:${zone.variant}`;
    if (renderedWorldKey === worldKey) return;
    renderedWorldKey = worldKey;
    elements.worldProps.replaceChildren();
    const primary = biomes.find((biome) => biome.id === zone.biome);
    const secondary = biomes.find((biome) => biome.id === zone.secondaryBiome);
    [primary, secondary, secondary, primary].forEach((biome, index) => {
      const prop = document.createElement("span");
      prop.className = `world-landmark world-landmark--${biome.landmark}`;
      prop.dataset.layer = index % 2 === 0 ? "far" : "near";
      prop.dataset.position = String(index + 1);
      prop.setAttribute("aria-hidden", "true");
      elements.worldProps.append(prop);
    });
  }

  function renderRoutes() {
    const firstRoute = Math.max(0, state.zone - 1);
    const routeKey = `${state.zone}:${firstRoute}:${state.level}:` +
      [firstRoute, firstRoute + 1, firstRoute + 2]
        .map((index) => state.zoneDefeats[index] || 0)
        .join(",");
    if (renderedRouteKey === routeKey) return;
    renderedRouteKey = routeKey;
    elements.routeList.replaceChildren();
    for (let index = firstRoute; index <= firstRoute + 2; index += 1) {
      const zone = zoneAt(index);
      const button = document.createElement("button");
      const marker = document.createElement("span");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      const details = document.createElement("small");
      const status = document.createElement("span");
      const unlocked = state.level >= zone.unlockLevel;
      const defeats = state.zoneDefeats[index] || 0;

      button.className = "route-button";
      button.type = "button";
      button.dataset.zone = String(index);
      button.disabled = !unlocked;
      button.classList.toggle("is-active", index === state.zone);
      button.setAttribute(
        "aria-label",
        unlocked ? `${zone.name}, ${zone.mix}` : `${zone.name}, disponible en nivel ${zone.unlockLevel}`
      );
      marker.className = "route-marker";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = String(index + 1).padStart(2, "0");
      copy.className = "route-copy";
      name.textContent = zone.name;
      details.textContent = unlocked
        ? `${zone.mix} · ${defeats} encuentros`
        : `Se abre en nivel ${zone.unlockLevel}`;
      copy.append(name, details);
      status.className = "route-state";
      status.setAttribute("aria-hidden", "true");
      status.textContent = unlocked ? (index === state.zone ? "●" : "○") : "⌑";
      button.append(marker, copy, status);
      elements.routeList.append(button);
    }
  }

  function updateUI() {
    const zone = zoneAt(state.zone);
    const nextLevelXp = xpToNextLevel();
    const weaponCost = weaponPrice();
    const armorCost = armorPrice();
    const heroMaxHp = playerMaxHp();
    state.hp = Math.min(state.hp, heroMaxHp);
    const heroHealthPercent = Math.max(0, (state.hp / heroMaxHp) * 100);
    const enemyHealthPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);

    elements.zoneName.textContent = zone.name;
    elements.scene.dataset.biome = zone.biome;
    elements.scene.dataset.secondary = zone.secondaryBiome;
    elements.scene.dataset.variant = String(zone.variant);
    elements.scene.style.setProperty("--world-hue", `${zone.hue}deg`);
    elements.scene.setAttribute("aria-label", zone.description);
    elements.worldMix.textContent = `${zone.mix} · Tramo ${state.zone + 1}`;
    elements.traveler.dataset.hero = state.heroStyle;
    elements.traveler.style.setProperty("--hero-color", state.heroColor);
    elements.characterName.textContent = state.characterName;
    elements.heroRole.textContent = heroRoles[state.heroStyle];
    elements.heroName.textContent = state.characterName;
    elements.inventoryCharacterName.textContent = state.characterName;
    elements.traveler.setAttribute("aria-label", `${state.characterName}, personaje`);
    elements.scene.classList.toggle("has-armor", Boolean(getEquippedArmor()));
    elements.enemyName.textContent = enemy.name;
    elements.creature.dataset.species = enemy.species;
    elements.creature.setAttribute("aria-label", enemy.name);
    elements.enemyHpLabel.textContent = `${enemy.hp} / ${enemy.maxHp}`;
    elements.enemyHp.style.width = `${enemyHealthPercent}%`;
    elements.heroHpLabel.textContent = `${state.hp} / ${heroMaxHp}`;
    elements.heroHp.style.width = `${heroHealthPercent}%`;
    elements.level.textContent = state.level;
    elements.xpLabel.textContent = `${state.xp} / ${nextLevelXp}`;
    elements.xpMeter.style.width = `${Math.min(100, (state.xp / nextLevelXp) * 100)}%`;
    elements.coins.textContent = state.coins;
    elements.essence.textContent = state.essence;
    elements.attack.textContent = playerAttack();
    elements.armor.textContent = playerArmor();
    elements.kills.textContent = state.kills;
    elements.weaponLevel.textContent = state.weaponLevel;
    elements.armorLevel.textContent = state.armorLevel;
    elements.weaponCost.textContent = `${weaponCost} ◈`;
    elements.armorCost.textContent = `${armorCost} ◈`;
    elements.inventoryCount.textContent = Object.values(state.materials).reduce((sum, count) => sum + count, 0) +
      state.weapons.length + state.armors.length;
    elements.modeIndicator.textContent = difficultyModes[state.difficulty].label;
    elements.weaponButton.disabled = state.coins < weaponCost;
    elements.armorButton.disabled = state.coins < armorCost;
    elements.potionButton.disabled = state.coins < 15 || state.hp >= heroMaxHp;
    const strongCooldown = Math.ceil(Math.max(0, strongAttackReadyAt - Date.now()) / 1000);
    const weapon = getEquippedWeapon();
    elements.strongAttackButton.disabled = !state.running || state.hp <= 0 || strongCooldown > 0;
    elements.strongAttackLabel.textContent = strongCooldown
      ? `Recarga: ${strongCooldown}s`
      : "Ataque fuerte";
    elements.strongAttackHint.textContent = weapon && weapon.runeApplied
      ? "2.2x daño · runa: 12% de resonancia extra"
      : "2.2x daño · recarga de 6 s";
    elements.creature.classList.toggle("is-boss", enemy.isBoss);
    elements.enemyTag.textContent = enemy.isBoss ? "GUARDIÁN" : "CRIATURA";
    elements.enemyTag.classList.toggle("is-boss", enemy.isBoss);
    elements.sceneCaption.textContent = enemy.isBoss
      ? "Una presencia antigua bloquea el sendero."
      : zone.description;
    updateArmorSprite();
    renderWorldProps(zone);

    if (state.hp <= 0) {
      elements.toggleButton.textContent = "Volver al refugio";
    } else {
      elements.toggleButton.textContent = state.running ? "Detener expedición" : "Comenzar expedición";
    }

    renderRoutes();

    showSaveStatus();
    renderJournal();
  }

  function gainExperience(amount) {
    state.xp += amount;
    while (state.level < 100 && state.xp >= xpToNextLevel()) {
      state.xp -= xpToNextLevel();
      state.level += 1;
      state.maxHp += 10;
      state.hp = playerMaxHp();
      state.attack += 2;
      addLog(`¡Nivel ${state.level}! ${state.characterName} recupera fuerzas y mejora sus atributos.`);
    }
    if (state.level >= 100) state.xp = Math.min(state.xp, xpToNextLevel());
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rollMaterials() {
    const drops = [];
    const rewards = [
      { key: "branches", label: "rama", plural: "ramas", chance: 0.8, min: 1, max: 3 },
      { key: "stones", label: "roca", plural: "rocas", chance: 0.65, min: 1, max: 2 },
      {
        key: "metal",
        label: "pieza de metal",
        plural: "piezas de metal",
        chance: enemy.isBoss ? 0.9 : 0.28,
        min: 1,
        max: enemy.isBoss ? 3 : 1
      }
    ];

    rewards.forEach((reward) => {
      if (Math.random() < reward.chance) {
        const amount = randomBetween(reward.min, reward.max);
        state.materials[reward.key] += amount;
        drops.push(`${amount} ${amount === 1 ? reward.label : reward.plural}`);
      }
    });

    const runeChance = enemy.isBoss ? 0.08 : 0.025;
    if (Math.random() < runeChance) {
      state.materials.runes += 1;
      drops.push("una runa muy rara");
    }

    return drops.length ? `Encuentras ${drops.join(", ")}.` : "Esta vez no encuentras materiales.";
  }

  function defeatEnemy() {
    state.kills += 1;
    state.zoneDefeats[state.zone] = (state.zoneDefeats[state.zone] || 0) + 1;
    const materialSummary = rollMaterials();
    const rewardMultiplier = difficultyModes[state.difficulty].rewardMultiplier;
    const coinsEarned = Math.round(enemy.coins * rewardMultiplier);
    state.coins += coinsEarned;
    gainExperience(Math.round(enemy.xp * rewardMultiplier));
    if (enemy.isBoss) {
      state.essence += 3;
      addLog(`${enemy.name} cae. Obtienes ${coinsEarned} ámbares, 3 esencias. ${materialSummary}`);
    } else {
      addLog(`${enemy.name} se retira. Recoges ${coinsEarned} ámbares. ${materialSummary}`);
    }
    enemy = makeEnemy();
    save();
    updateUI();
  }

  function attackEnemy(multiplier = 1, isStrong = false, runeResonance = false) {
    const baseDamage = Math.max(1, playerAttack() + Math.floor(Math.random() * 5) - 2);
    const damage = Math.max(1, Math.round(baseDamage * multiplier));
    enemy.hp = Math.max(0, enemy.hp - damage);
    const attackClass = isStrong ? "is-strong-attacking" : "is-attacking";
    window.clearTimeout(playerAnimationTimer);
    elements.traveler.classList.remove("is-attacking", "is-strong-attacking");
    void elements.traveler.offsetWidth;
    elements.traveler.classList.add(attackClass);
    elements.creature.classList.add("is-hit");
    playerAnimationTimer = window.setTimeout(() => {
      elements.traveler.classList.remove(attackClass);
      elements.creature.classList.remove("is-hit");
    }, isStrong ? 560 : 420);
    if (isStrong) {
      addLog(
        `${state.characterName} desata un ataque fuerte contra ${enemy.name}: ${damage} de daño.${
          runeResonance ? " ¡La runa resuena y lo potencia!" : ""
        }`
      );
    }
    if (enemy.hp <= 0) {
      defeatEnemy();
    } else if (!isStrong) {
      addLog(`${state.characterName} golpea a ${enemy.name} por ${damage}.`);
    }
  }

  function useStrongAttack() {
    if (!state.running || state.hp <= 0 || Date.now() < strongAttackReadyAt) return;
    strongAttackReadyAt = Date.now() + 6000;
    const weapon = getEquippedWeapon();
    const runeResonance = Boolean(weapon && weapon.runeApplied) && Math.random() < 0.12;
    attackEnemy(runeResonance ? 3.3 : 2.2, true, runeResonance);
    updateUI();
    save();
  }

  function enemyAttack() {
    const baseDamage = Math.max(1, enemy.attack - playerArmor());
    const damage = Math.max(
      1,
      Math.round(baseDamage * difficultyModes[state.difficulty].damageMultiplier)
    );
    state.hp = Math.max(0, state.hp - damage);
    elements.creature.classList.add("is-attacking");
    elements.traveler.classList.add("is-damaged");
    window.setTimeout(() => {
      elements.creature.classList.remove("is-attacking");
      elements.traveler.classList.remove("is-damaged");
    }, 480);
    if (state.hp === 0) {
      state.running = false;
      window.clearInterval(timer);
      timer = null;
      addLog(`${state.characterName} vuelve al refugio para recuperarse antes de continuar.`);
    } else {
      addLog(`${enemy.name} alcanza a ${state.characterName}: −${damage} de salud.`);
    }
  }

  function combatTurn() {
    state.tick += 1;
    const enemyBeforeAttack = enemy;
    if (state.tick % 2 === 0) {
      attackEnemy();
      if (enemy !== enemyBeforeAttack || enemy.hp === 0) return;
    }
    if (state.tick % 3 === 0 && state.hp > 0) enemyAttack();
    updateUI();
    save();
  }

  function startExpedition() {
    state.started = true;
    if (state.hp <= 0) {
      state.hp = playerMaxHp();
      enemy = makeEnemy();
      addLog(`${state.characterName} descansa junto al farol y vuelve al sendero con toda su salud.`);
      updateUI();
      save();
      return;
    }
    state.running = !state.running;
    if (state.running) {
      addLog(`${state.characterName} se interna por el sendero. La expedición ha comenzado.`);
      timer = window.setInterval(combatTurn, 1000);
    } else {
      window.clearInterval(timer);
      timer = null;
      addLog("La expedición se detuvo. El farol queda encendido.");
    }
    updateUI();
    save();
  }

  function usePotion() {
    const maxHp = playerMaxHp();
    if (state.coins < 15 || state.hp >= maxHp) return;
    state.coins -= 15;
    const recovered = Math.min(45, maxHp - state.hp);
    state.hp += recovered;
    addLog(`El brebaje de savia recupera ${recovered} de salud.`);
    updateUI();
    save();
  }

  function upgradeWeapon() {
    const cost = weaponPrice();
    if (state.coins < cost) return;
    state.coins -= cost;
    state.weaponLevel += 1;
    state.attack += 3;
    addLog(`La hoja de fresno mejora al nivel ${state.weaponLevel}.`);
    updateUI();
    save();
  }

  function upgradeArmor() {
    const cost = armorPrice();
    if (state.coins < cost) return;
    state.coins -= cost;
    state.armorLevel += 1;
    state.armor += 2;
    state.maxHp += 12;
    state.hp = Math.min(playerMaxHp(), state.hp + 12);
    addLog(`La capa de corteza mejora al nivel ${state.armorLevel}.`);
    updateUI();
    save();
  }

  function travelToZone(event) {
    const button = event.target.closest(".route-button");
    if (!button || button.disabled) return;
    const zoneIndex = Number(button.dataset.zone);
    if (zoneIndex === state.zone) return;
    state.zone = zoneIndex;
    enemy = makeEnemy();
    addLog(`${state.characterName} descubre ${zoneAt(zoneIndex).name}.`);
    updateUI();
    save();
  }

  function resetAdventure() {
    if (!window.confirm("¿Reiniciar la aventura? Se borrará el progreso guardado en este dispositivo.")) return;
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    const characterName = state.characterName;
    const heroStyle = state.heroStyle;
    const heroColor = state.heroColor;
    state = freshState();
    strongAttackReadyAt = 0;
    state.characterName = characterName;
    state.heroStyle = heroStyle;
    state.heroColor = heroColor;
    state.journal = [`${characterName} encuentra un farol encendido al borde del sendero.`];
    enemy = makeEnemy();
    addLog(`${characterName} comienza una nueva senda junto al farol.`);
    updateUI();
    save();
    openGuide();
  }

  function openGuide() {
    const isFirstStart = !state.started;
    if (state.running) {
      state.running = false;
      window.clearInterval(timer);
      timer = null;
      addLog("La expedición se pausó para consultar la guía.");
      updateUI();
      save();
    }

    elements.guideTitle.textContent = isFirstStart ? "Antes de empezar" : "Guía y ajustes";
    elements.guideIntro.textContent = isFirstStart
      ? `Acompaña a ${state.characterName} por el valle: explora, combate y mejora su equipo.`
      : "Consulta los controles o cambia la dificultad. Los ajustes se aplicarán al continuar.";
    elements.guideContinue.textContent = isFirstStart
      ? "Guardar ajustes y comenzar"
      : "Guardar y volver";
    elements.guideClose.hidden = isFirstStart;
    document.querySelectorAll('input[name="difficulty"]').forEach((input) => {
      input.checked = input.value === state.difficulty;
    });
    elements.heroStyleRadios.forEach((input) => {
      input.checked = input.value === state.heroStyle;
    });
    elements.heroColorPicker.value = state.heroColor;
    updateHeroPreviews();
    elements.guideDialog.showModal();
  }

  function updateHeroPreviews() {
    document.querySelectorAll(".hero-option").forEach((option) => {
      option.style.setProperty("--preview-color", elements.heroColorPicker.value);
    });
  }

  function finishGuide(startExpeditionNow) {
    const isFirstStart = !state.started;
    const selected = document.querySelector('input[name="difficulty"]:checked');
    if (selected && difficultyModes[selected.value]) {
      state.difficulty = selected.value;
    }
    const selectedHero = elements.heroStyleRadios.find((input) => input.checked);
    if (selectedHero && heroStyles.includes(selectedHero.value)) {
      state.heroStyle = selectedHero.value;
    }
    if (/^#[\da-f]{6}$/i.test(elements.heroColorPicker.value)) {
      state.heroColor = elements.heroColorPicker.value;
    }
    state.started = true;
    elements.guideDialog.close();
    addLog(`Dificultad seleccionada: ${difficultyModes[state.difficulty].label.toLowerCase()}.`);
    updateUI();
    save();
    if (isFirstStart && startExpeditionNow) startExpedition();
  }

  function handleKeyboard(event) {
    if (elements.guideDialog.open || elements.inventoryDialog.open) return;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, textarea, select, [contenteditable='true']")
    ) return;

    if (event.code === "Space") {
      event.preventDefault();
      startExpedition();
      return;
    }

    const key = event.key.toLowerCase();
    const actions = {
      h: usePotion,
      w: upgradeWeapon,
      a: upgradeArmor,
      i: openInventory
    };
    if (actions[key]) {
      event.preventDefault();
      actions[key]();
      return;
    }

    if (["1", "2", "3"].includes(key)) {
      const route = document.querySelectorAll(".route-button")[Number(key) - 1];
      if (route && !route.disabled) {
        event.preventDefault();
        route.click();
      }
    }
  }

  elements.toggleButton.addEventListener("click", startExpedition);
  elements.potionButton.addEventListener("click", usePotion);
  elements.strongAttackButton.addEventListener("click", useStrongAttack);
  elements.weaponButton.addEventListener("click", upgradeWeapon);
  elements.armorButton.addEventListener("click", upgradeArmor);
  elements.routeList.addEventListener("click", travelToZone);
  elements.resetButton.addEventListener("click", resetAdventure);
  elements.helpButton.addEventListener("click", openGuide);
  elements.inventoryButton.addEventListener("click", openInventory);
  elements.inventoryClose.addEventListener("click", () => elements.inventoryDialog.close());
  elements.guideContinue.addEventListener("click", () => finishGuide(true));
  elements.guideClose.addEventListener("click", () => finishGuide(false));
  elements.heroColorPicker.addEventListener("input", updateHeroPreviews);
  elements.characterNameForm.addEventListener("submit", renameCharacter);
  elements.guideDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (state.started) finishGuide(false);
  });
  elements.recipeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-recipe]");
    if (button) craftGear(button.dataset.recipe);
  });
  elements.weaponItems.addEventListener("click", handleGearClick);
  elements.armorItems.addEventListener("click", handleGearClick);
  elements.runeWeapon.addEventListener("click", () => applyRune("weapon"));
  elements.runeArmor.addEventListener("click", () => applyRune("armor"));
  elements.designCanvas.addEventListener("pointerdown", (event) => {
    if (elements.inventoryDialog.open) drawOnArmor(event);
  });
  elements.designCanvas.addEventListener("pointermove", (event) => {
    if (isDrawing) drawOnArmor(event);
  });
  elements.designCanvas.addEventListener("pointerup", stopDrawing);
  elements.designCanvas.addEventListener("pointercancel", stopDrawing);
  elements.designSize.addEventListener("input", () => {
    elements.designSizeLabel.textContent = elements.designSize.value;
  });
  elements.designEraser.addEventListener("click", () => {
    const active = elements.designEraser.getAttribute("aria-pressed") !== "true";
    elements.designEraser.setAttribute("aria-pressed", String(active));
    elements.designEraser.textContent = active ? "Pincel" : "Borrador";
  });
  elements.designClear.addEventListener("click", clearArmorDesign);
  elements.designSave.addEventListener("click", saveArmorDesign);
  document.addEventListener("keydown", handleKeyboard);

  elements.characterNameInput.value = state.characterName;
  updateUI();
  if (saveWarning) showSaveStatus();
  if (!state.started) openGuide();
})();
