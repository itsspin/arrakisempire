export const STATIC_DATA = {
  HOUSES: {
    atreides: {
      name: "House Atreides",
      color: "house-atreides",
      bonus: "leadership",
      description: "+25% XP gain, +15% unit effectiveness, +10% territory income",
      startingBonus: { solari: 1000, xp: 300, water: 100 }, // Added water for balance
    },
    harkonnen: {
      name: "House Harkonnen",
      color: "house-harkonnen",
      bonus: "brutality",
      description: "+30% attack damage, +20% resource extraction, +15% enemy defeat rewards",
      startingBonus: { plasteel: 200, attack: 8, solari: 500 }, // Added solari
    },
    fremen: {
      name: "Fremen",
      color: "house-fremen",
      bonus: "desert",
      description: "-60% water consumption, +40% spice finding, immune to sandworms, +20% territory defense",
      startingBonus: { water: 300, spice: 100, defense: 5 }, // Added defense
    },
  },
  ENEMIES: {
    sandRaider: {
      name: "Fremen Raider",
      icon: "🏹",
      health: 50,
      attack: 10,
      defense: 6,
      xp: 50,
      loot: { solari: 35, spice: 12, water: 10 },
      level: 1, // Base level
      spawnChance: 0.5, // Very common
      description: "Desert nomad seeking spice and water.",
    },
    smuggler: {
      name: "Spice Smuggler",
      icon: "🥷",
      health: 70,
      attack: 15,
      defense: 8,
      xp: 75,
      loot: { solari: 60, melange: 3, rareMaterials: 1 },
      level: 2, // Base level
      spawnChance: 0.3, // Common
      description: "Black market dealer in illegal spice.",
    },
    harkonnenGuard: {
      name: "Harkonnen Guard",
      icon: "👤",
      health: 90,
      attack: 18,
      defense: 10,
      xp: 100,
      loot: { solari: 75, plasteel: 10, rareMaterials: 3 },
      level: 3, // Base level
      spawnChance: 0.15, // Less common
      description: "Brutal enforcer of Baron Harkonnen.",
    },
    sardaukar: {
      name: "Sardaukar Elite",
      icon: "⚔️",
      health: 200, // Increased from 140
      attack: 28,
      defense: 15,
      xp: 180,
      loot: { solari: 140, rareMaterials: 6, melange: 4 },
      level: 5, // Base level
      spawnChance: 0.03, // Rare
      description: "Imperial super-soldier. Extremely dangerous.",
    },
    guildNavigator: {
      name: "Guild Navigator",
      icon: "👁️",
      health: 250, // Increased from 190
      attack: 24,
      defense: 20,
      xp: 250,
      loot: { melange: 10, rareMaterials: 10, solari: 250 },
      level: 7, // Base level
      spawnChance: 0.008, // Very rare
      special: true,
      description: "Mutated spice addict with prescient abilities.",
    },
    mentat: {
      name: "Corrupted Mentat",
      icon: "🧠",
      health: 220, // Increased from 170
      attack: 32,
      defense: 12,
      xp: 220,
      loot: { solari: 180, melange: 6, rareMaterials: 7 },
      level: 6, // Base level
      spawnChance: 0.008, // Very rare
      special: true,
      description: "Human computer driven mad by forbidden calculations.",
    },
    beastRabban: {
      name: "Beast Rabban",
      icon: "👹",
      health: 500, // Increased from 380
      attack: 45,
      defense: 25,
      xp: 450,
      loot: { solari: 1200, spice: 180, rareMaterials: 18, melange: 10 },
      boss: true,
      level: 10, // Base level
      spawnChance: 0.002, // Extremely rare
      description: "Harkonnen na-Baron. Ruthless and brutal.",
    },
    baronHarkonnen: {
      name: "Baron Vladimir Harkonnen",
      icon: "🦹",
      health: 1000, // Increased from 750
      attack: 65,
      defense: 35,
      xp: 900,
      loot: { solari: 3000, spice: 350, rareMaterials: 35, melange: 25 },
      boss: true,
      level: 20, // Base level
      spawnChance: 0.001, // Ultra rare
      description: "The Baron himself. Master of schemes.",
    },
    sandworm: {
      name: "Shai-Hulud",
      icon: "🐛",
      health: 2000, // Increased from 1400
      attack: 110,
      defense: 50,
      xp: 1700,
      loot: { spice: 900, melange: 90, rareMaterials: 70 },
      boss: true,
      level: 25, // Base level
      legendary: true,
      spawnChance: 0.0005, // Legendary rare
      description: "The Great Sandworm. Maker of spice.",
    },
    reverendMother: {
      name: "Reverend Mother Mohiam",
      icon: "🧙",
      health: 800,
      attack: 60,
      defense: 30,
      xp: 700,
      loot: { melange: 50, rareMaterials: 25, solari: 2000 },
      boss: true,
      level: 15,
      spawnChance: 0.0015, // Very rare
      special: true,
      description: "Bene Gesserit matriarch wielding the Voice.",
    },
    countFenring: {
      name: "Count Fenring",
      icon: "🗡️",
      health: 600,
      attack: 55,
      defense: 30,
      xp: 600,
      loot: { solari: 1500, rareMaterials: 20, melange: 15 },
      boss: true,
      level: 12,
      spawnChance: 0.0015, // Very rare
      description: "The Emperor's deadly assassin and advisor.",
    },
    emperorShaddam: {
      name: "Padishah Emperor Shaddam IV",
      icon: "👑",
      health: 1500,
      attack: 80,
      defense: 40,
      xp: 1200,
      loot: { solari: 5000, spice: 500, rareMaterials: 40, melange: 40 },
      boss: true,
      legendary: true,
      level: 22,
      spawnChance: 0.0007, // Legendary rare
      description: "Ruler of the Known Universe, guarded by elite troops.",
    },
  },
  ITEMS: {
    crysknife: {
      name: "Crysknife",
      icon: "🗡️",
      type: "weapon",
      attack: 30,
      rarity: "legendary",
      description: "Sacred Fremen blade made from sandworm tooth.",
      dropChance: 0.02,
    },
    maula: {
      name: "Maula Pistol",
      icon: "🔫",
      type: "weapon",
      attack: 22,
      rarity: "rare",
      description: "Spring-loaded dart gun used in shield combat.",
      dropChance: 0.25,
    },
    lasguns: {
      name: "Lasgun",
      icon: "⚡",
      type: "weapon",
      attack: 28,
      rarity: "epic",
      description: "Directed energy weapon.",
      dropChance: 0.1,
    },
    stillsuit: {
      name: "Stillsuit",
      icon: "🥽",
      type: "armor",
      defense: 18,
      rarity: "uncommon",
      description: "Desert survival suit that recycles body moisture.",
      dropChance: 0.3,
    },
    shieldBelt: {
      name: "Shield Belt",
      icon: "🔘",
      type: "accessory",
      defense: 25,
      rarity: "epic",
      description: "Personal force field generator.",
      dropChance: 0.12,
    },
    fremkit: {
      name: "Fremen Survival Kit",
      icon: "🎒",
      type: "accessory",
      special: "desert",
      rarity: "rare",
      description: "Essential tools for desert survival.",
      dropChance: 0.2,
    },
    spiceLens: {
      name: "Spice Lens",
      icon: "🔍",
      type: "accessory",
      special: "detection",
      rarity: "epic",
      description: "Reveals hidden spice deposits.",
      dropChance: 0.08,
    },
    choamRing: {
      name: "CHOAM Signet",
      icon: "💍",
      type: "accessory",
      special: "trading",
      rarity: "legendary",
      description: "Grants access to exclusive markets.",
      dropChance: 0.015,
    },
    powerArmor: {
      name: "Sardaukar Armor",
      icon: "🛡️",
      type: "armor",
      defense: 35,
      attack: 10,
      rarity: "legendary",
      description: "Imperial military armor.",
      dropChance: 0.01,
    },
    guildArtifact: {
      name: "Guild Artifact",
      icon: "👁️",
      type: "accessory",
      special: "prescience",
      rarity: "legendary",
      description: "Navigator technology.",
      dropChance: 0.005,
    },
    fremenKnife: {
      name: "Fremen Knife",
      icon: "🔪",
      type: "weapon",
      attack: 12,
      rarity: "common",
      description: "Simple blade carried by desert warriors.",
      dropChance: 0.4,
    },
    desertCloak: {
      name: "Desert Cloak",
      icon: "🧣",
      type: "armor",
      defense: 12,
      rarity: "uncommon",
      description: "Helps shield the wearer from harsh sands.",
      dropChance: 0.35,
    },
    makerHook: {
      name: "Maker Hook",
      icon: "🪝",
      type: "weapon",
      attack: 20,
      special: "worm control",
      rarity: "rare",
      description: "Tool for mounting the great sandworms.",
      dropChance: 0.12,
    },
    harkonnenBlaster: {
      name: "Harkonnen Blaster",
      icon: "💥",
      type: "weapon",
      attack: 24,
      rarity: "rare",
      description: "Crude but powerful projectile weapon.",
      dropChance: 0.15,
    },
    weirdingModule: {
      name: "Weirding Module",
      icon: "📢",
      type: "accessory",
      special: "sonic",
      rarity: "epic",
      description: "Secret Atreides sonic weapon.",
      dropChance: 0.07,
    },
    ornithopterRig: {
      name: "Ornithopter Rig",
      icon: "🚁",
      type: "accessory",
      special: "mobility",
      rarity: "epic",
      description: "Allows swift travel across dunes.",
      dropChance: 0.06,
    },
    kwisatzRelic: {
      name: "Kwisatz Haderach Relic",
      icon: "☀️",
      type: "accessory",
      special: "mystic",
      rarity: "legendary",
      description: "Ancient artifact of immense power.",
      dropChance: 0.005,
    },
    waterOfLife: {
      name: "Water of Life",
      icon: "💧",
      type: "accessory",
      special: "awakening",
      rarity: "mythic",
      description: "Potent spice essence granting unimaginable insight.",
      dropChance: 0.000025,
    },
    wormLordPlate: {
      name: "Worm Lord Plate",
      icon: "🐲",
      type: "armor",
      defense: 80,
      attack: 20,
      rarity: "mythic",
      description: "Forged from the scales of a mythical great maker.",
      dropChance: 0.000025,
    },
  },
  WORLD_EVENTS: [
    {
      name: "Spice Bloom",
      description: "A massive spice deposit has been discovered!",
      icon: "✨",
      rewards: { spice: 500, melange: 25 },
      duration: 300000,
      type: "economy",
    },
    {
      name: "Sandstorm",
      description: "A great sandstorm sweeps across the desert!",
      icon: "🌪️",
      effect: "water_drain", // Changed from energy_drain to water_drain for thematic consistency
      effectValue: 2, // Doubles water cost
      duration: 180000,
      type: "hazard",
    },
    {
      name: "Guild Heighliner",
      description: "A Guild ship has crashed, scattering rare materials!",
      icon: "🚀",
      rewards: { rareMaterials: 50, melange: 15 },
      duration: 600000,
      type: "economy",
    },
    {
      name: "Fremen Gathering",
      description: "The Fremen offer knowledge and resources to worthy allies!",
      icon: "🏔️",
      rewards: { water: 200, xp: 500 },
      duration: 240000,
      type: "diplomacy",
    },
    {
      name: "Imperial Raid",
      description: "Sardaukar forces are searching the area! High risk, high reward!",
      icon: "⚔️",
      effect: "combat_boost",
      rewards: { solari: 1000, rareMaterials: 20 },
      duration: 420000,
      type: "hazard",
    },
    {
      name: "Wormsign",
      description: "A massive sandworm is approaching! Seek shelter or prepare for battle!",
      icon: "🐛",
      effect: "sandworm_attack",
      duration: 60000, // Short duration before attack
      type: "hazard",
      triggersNext: "Shai-Hulud Attack", // Triggers the actual attack event
    },
    {
      name: "Shai-Hulud Attack",
      description: "A sandworm attacks a random territory!",
      icon: "💥",
      effect: "territory_destruction", // New effect type
      duration: 0, // Instant effect
      type: "hazard",
      isChainedEvent: true, // This event is only triggered by another event
    },
    {
      name: "Spice Market Boom",
      description: "The demand for Spice has surged across the Imperium!",
      icon: "📈",
      effect: "spice_boost",
      effectValue: 1.5, // 50% increase in spice value/production
      duration: 300000,
      type: "economy",
    },
    {
      name: "Great Sandstorm",
      description:
        "Blinding sandstorms ravage Arrakis, stripping control from many territories!",
      icon: "🌬️",
      effect: "territory_loss",
      effectValue: 0.1, // 10% of all owned territories become neutral
      duration: 180000,
      type: "hazard",
    },
  ],
  WORLD_EVENT_CONFIG: {
    maxActiveEvents: 3, // Max number of non-chained world events active at once
    newEventChancePerTick: 0.002, // Base chance per second for a new event to spawn
  },
  ABILITIES: {
    mentatCalculation: {
      id: "mentatCalculation",
      name: "Mentat Calculation",
      description: "Focus your mind, increasing critical chance and attack for a short duration.",
      icon: "🧠",
      levelRequired: 5,
      cooldown: 60000, // 60 seconds
      duration: 10000, // 10 seconds
      effectType: "crit_boost",
      effectValue: 25, // +25% crit chance
    },
    desertSurvival: {
      id: "desertSurvival",
      name: "Desert Survival",
      description: "Harness the desert's resilience, regenerating health and energy over time.",
      icon: "🌵",
      levelRequired: 5,
      cooldown: 90000, // 90 seconds
      duration: 15000, // 15 seconds
      effectType: "health_regen",
      effectValue: 5, // Regenerate 5% max health/energy per second
    },
    theVoice: {
      id: "theVoice",
      name: "The Voice",
      description: "Compel your foe with a powerful command, reducing their attack and defense.",
      icon: "🗣️",
      levelRequired: 10,
      cooldown: 120000, // 120 seconds
      duration: 8000, // 8 seconds
      effectType: "attack_boost", // This will be a debuff on enemy, so effectively a player boost
      effectValue: -30, // -30% enemy attack/defense
    },
    prescience: {
      id: "prescience",
      name: "Prescience",
      description: "Glimpse the future, increasing your dodge chance and granting a chance to avoid all damage.",
      icon: "🔮",
      levelRequired: 15,
      cooldown: 150000, // 150 seconds
      duration: 10000, // 10 seconds
      effectType: "dodge_boost",
      effectValue: 20, // +20% dodge chance
    },
    sandwalk: {
      id: "sandwalk",
      name: "Sandwalk",
      description: "Move silently across the dunes, reducing water consumption and increasing movement speed.",
      icon: "👣",
      levelRequired: 20,
      cooldown: 180000, // 180 seconds
      duration: 30000, // 30 seconds
      effectType: "energy_regen", // Re-purposing for water efficiency/movement
      effectValue: 50, // 50% reduction in water consumption
    },
    spiceTrance: {
      id: "spiceTrance",
      name: "Spice Trance",
      description: "Enter a deep trance, massively boosting all resource gathering rates for a short time.",
      icon: "✨",
      levelRequired: 25,
      cooldown: 240000, // 240 seconds
      duration: 20000, // 20 seconds
      effectType: "attack_boost", // Re-purposing for resource gathering
      effectValue: 100, // +100% resource gathering
    },
  },
}
