export const CONFIG = {
  MAP_SIZE: 200,
  VIEW_RADIUS: 7,
  MAX_INVENTORY: 40,
  ENERGY_REGEN_RATE: 3,
  ENERGY_REGEN_INTERVAL: 2000,
  SAVE_INTERVAL: 10000,
  CHAT_UPDATE_INTERVAL: 3000,
  PLAYER_UPDATE_INTERVAL: 5000,
  WORLD_EVENT_INTERVAL: 120000,
  XP_BASE: 100,
  XP_FACTOR: 1.4,
  TERRITORY_BASE_COST: 1000,
  TERRITORY_COST_MULTIPLIER: 1.5,
  ENERGY_PRODUCTION_UNLOCK_LEVEL: 10,
  ENEMY_COOLDOWN: 30000, // 30 seconds
  RESOURCE_COOLDOWN: 20000, // 20 seconds for partial harvest
  RESOURCE_DEPLETED_COOLDOWN: 60000, // 1 minute for fully depleted node
  ITEM_RESPAWN_COOLDOWN: 60000, // 1 minute for items to respawn
  COMBAT_TURN_DELAY: 1500, // Delay between turns in combat (ms) - This is now just a visual delay for enemy action
  // Removed COMBAT_MINIGAME_DURATION, COMBAT_TURN_DURATION
  ENEMY_SCALING_FACTOR: 0.1, // 10% stat increase per level difference
  FLEE_CHANCE: 0.6, // 60% chance to flee successfully
  SPICE_SELL_COST: 50, // Spice required to sell
  SPICE_SELL_YIELD: 50, // Solari gained from selling spice
  MINE_PLASTEEL_ENERGY_COST: 10, // Energy cost to mine plasteel
  MINE_PLASTEEL_YIELD: 5, // Plasteel gained
  COLLECT_WATER_ENERGY_COST: 5, // Energy cost to collect water
  COLLECT_WATER_YIELD: 10, // Water gained
}

export const PLAYER_COLORS = ["red", "blue", "green", "purple", "orange", "pink", "yellow", "cyan"]

export const DUNE_QUOTES = [
  "Fear is the mind-killer.",
  "He who controls the spice, controls the universe.",
  "The spice must flow.",
  "I must not fear. Fear is the mind-killer.",
  "The mystery of life isn't a problem to solve, but a reality to experience.",
  "The beginning is a very delicate time.",
  "Dreams are messages from the deep.",
  "Without change, something sleeps inside us, and seldom awakens.",
  "The future remains uncertain and so it should, for it is the canvas upon which we paint our desires.",
  "Bless the Maker and His water. Bless the coming and going of Him.",
]

export const RARITY_SCORES = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
}
