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
  position: { x: number; y: number }
  basePosition: { x: number; y: number }
  house: string | null
  rank: number // Player's rank
  rankName?: string // e.g., "Spice Baron", "Desert Lord"
  power: number
  prestigeLevel: number
  territories: TerritoryDetails[] // Array of owned territories
  lifetimeSpice: number
  totalEnemiesDefeated: number
  energyProductionRate: number
  created: number
  lastActive: number
  investments?: Record<string, Investment> // For empire management
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
  type: string
  attack?: number
  defense?: number
  rarity: string
  description: string
  dropChance?: number
  special?: string
}

export interface Enemy {
  id: string
  type: string
  name: string
  icon: string
  health: number
  currentHealth: number
  attack: number
  defense: number
  xp: number
  loot: Record<string, number>
  level: number
  spawnChance: number
  description: string
  position: { x: number; y: number }
  boss?: boolean
  special?: boolean
  legendary?: boolean
}

export interface Combat {
  active: boolean
  enemy: Enemy | null
  turn: "player" | "enemy"
  log: string[]
}

export interface TerritoryDetails {
  id: string
  x: number
  y: number
  ownerId: string | null
  ownerName?: string
  ownerColor?: string
  purchaseCost: number
  perks: string[] // e.g., "+10% Spice Production", "+5 Solari/min"
  resourceYield?: Partial<Resources> // Passive resource gain
  name?: string // e.g., "Spice Field Alpha"
}

export interface Investment {
  level: number
  costToUpgrade: number
  productionRate: number // e.g., Spice per minute
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

export interface GameState {
  player: Player
  resources: Resources
  equipment: Equipment
  inventory: (Item | null)[]
  buildings: Record<string, any> // Simplified for now
  combat: Combat
  currentTab: string
  gameInitialized: boolean
  lastSaveTime: number
  lastEnergyRegen: number
  onlinePlayers: Record<string, Partial<Player>> // Other players on map
  worldEvents: any[] // Define more strictly if needed
  tradeOffers: any[] // Define more strictly if needed
  map: {
    enemies: Record<string, Enemy> // key: "x,y"
    resources: Record<string, any> // key: "x,y", define resource node type
    territories: Record<string, TerritoryDetails> // key: "x,y"
  }
  leaderboard: RankedPlayer[] // Top 5 players
  isNameModalOpen: boolean
  isHouseModalOpen: boolean
  isCombatModalOpen: boolean
  isTradingModalOpen: boolean
  isTerritoryModalOpen: boolean
  selectedTerritoryCoords: { x: number; y: number } | null
}
