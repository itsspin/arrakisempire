export interface Player {
  id: string | null
  name: string
  color: string
  level: number
  experience: number
  experienceToNext: number
  health: number
  maxHealth: number
  energy: number
  maxEnergy: number
  attack: number
  defense: number
  critChance: number
  dodgeChance: number
  position: { x: number; y: number } // Corrected to number
  basePosition: { x: number; y: number }
  house: string | null
  rank: number
  rankName?: string
  power: number
  prestigeLevel: number
  globalGainMultiplier: number // New: Multiplier for all gains (XP, resources, etc.) from prestige
  territories: TerritoryDetails[]
  lifetimeSpice: number
  totalEnemiesDefeated: number
  energyProductionRate: number
  created: number
  lastActive: number
  investments?: Record<string, Investment>
  spicePerClick: number // New: Spice generated per click
  spiceClickUpgradeCost: number // New: Cost to upgrade spicePerClick
  unlockedAbilities: Ability[] // New: Abilities the player has unlocked
  activeAbility: Ability | null // New: The currently active ability
  isDefending: boolean // New: True if player chose to defend this turn
}

export interface Resources {
  spice: number
  water: number
  solari: number
  plasteel: number
  rareMaterials: number
  melange: number
}

export interface Equipment {
  weapon: Item | null
  armor: Item | null
  accessory: Item | null
}

export interface Item {
  id?: string
  name: string
  icon: string
  type: string // e.g., "weapon", "armor", "accessory", "consumable"
  attack?: number
  defense?: number
  rarity: string // e.g., "common", "uncommon", "rare", "epic", "legendary"
  description: string
  dropChance?: number
  special?: string | null // Ensure this can be null
}

export interface MapElement {
  id: string
  position: { x: number; y: number }
  cooldownUntil?: number | null // Ensure this can be null
}

export interface Enemy extends MapElement {
  type: string // Enemy type key from STATIC_DATA
  name: string
  icon: string
  health: number
  currentHealth: number
  attack: number
  defense: number
  xp: number
  loot: Record<string, number>
  level: number
  spawnChance?: number // Optional, for initial generation
  description: string
  boss?: boolean
  special?: boolean
  legendary?: boolean
}

export interface ResourceNode extends MapElement {
  type: string // e.g., "spice", "water", "plasteel"
  amount: number
  icon?: string
}

export interface Combat {
  active: boolean
  enemy: Enemy | null // The specific enemy instance in combat
  turn: "player" | "enemy"
  log: string[]
  playerHealthAtStart: number // Player's health when combat started
  enemyHealthAtStart: number // Enemy's health when combat started
  combatRound: number // Current round number
  // Removed miniGameActive, miniGameResult, turnStartTime
}

export interface TerritoryDetails extends MapElement {
  ownerId: string | null
  ownerName?: string
  ownerColor?: string
  purchaseCost: number
  perks: string[]
  resourceYield?: Partial<Resources>
  name?: string
}

export interface Investment {
  level: number
  costToUpgrade: number
  productionRate: number
  productionResource: keyof Resources // New: Specifies which resource this investment produces
  name: string
  description: string
}

export interface RankedPlayer {
  id: string
  name: string
  rank: number
  rankName?: string
  house?: string | null
  prestigeLevel?: number
  color?: string
}

export interface WorldEvent extends MapElement {
  name: string
  description: string
  icon: string
  rewards?: Partial<Resources & { xp?: number }>
  effect?: string // e.g., "energy_drain", "combat_boost"
  duration?: number // Milliseconds
  endTime?: number // Timestamp
}

export interface ChatMessage {
  senderId: string
  senderName: string
  senderColor: string
  timestamp: {
    seconds: number
    nanoseconds: number
  }
  message: string // Added message property
}

// New: Ability Interface
export interface Ability {
  id: string
  name: string
  description: string
  icon: string
  levelRequired: number
  cooldown: number // in milliseconds
  duration: number // in milliseconds, for temporary buffs
  effectType: "attack_boost" | "defense_boost" | "crit_boost" | "dodge_boost" | "health_regen" | "energy_regen" | "stun"
  effectValue: number // Percentage or flat value
}

export interface GameState {
  player: Player
  resources: Resources
  equipment: Equipment
  inventory: (Item | null)[]
  buildings: Record<string, any>
  combat: Combat
  currentTab: string
  gameInitialized: boolean
  lastSaveTime: number
  lastEnergyRegen: number
  onlinePlayers: Record<string, Partial<Player & { position: { x: number; y: number } }>>
  worldEvents: WorldEvent[]
  tradeOffers: any[]
  map: {
    enemies: Record<string, Enemy> // key: "x,y"
    resources: Record<string, ResourceNode> // key: "x,y"
    territories: Record<string, TerritoryDetails> // key: "x,y"
    items: Record<string, Item> // New: key: "x,y" for items on the map
  }
  leaderboard: RankedPlayer[]
  isNameModalOpen: boolean
  isHouseModalOpen: boolean
  isCombatModalOpen: boolean
  isTradingModalOpen: boolean
  isTerritoryModalOpen: boolean
  // Removed isHousesModalOpen, isWorldEventsModalOpen
  isPrestigeModalOpen: boolean
  isAbilitySelectionModalOpen: boolean
  selectedTerritoryCoords: { x: number; y: number } | null
  notifications: Array<{ id: string; message: string; type: "success" | "error" | "warning" | "info" | "legendary" }>
  chatMessages: ChatMessage[] // New: Array to store chat messages
  abilityCooldowns: Record<string, number> // New: Tracks cooldowns for abilities
}

export type PlayerColor = "red" | "blue" | "green" | "purple" | "orange" | "pink" | "yellow" | "cyan"
