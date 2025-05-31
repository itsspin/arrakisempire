// itsspin/arrakisempire/arrakisempire-405bbbae52a489f53859e49c3c65cbb5f5afdafc/types/game.ts
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
  rank: number
  rankName?: string
  power: number
  prestigeLevel: number
  globalGainMultiplier: number 
  territories: TerritoryDetails[] // Already here, good for AI too
  lifetimeSpice: number
  totalEnemiesDefeated: number
  energyProductionRate: number
  created: number
  lastActive: number
  investments?: Record<string, Investment>
  spicePerClick: number 
  spiceClickUpgradeCost: number 
  unlockedAbilities: Ability[] 
  activeAbility: Ability | null 
  isDefending: boolean 
  // NEW: For AI resource tracking, we will add 'resources' directly to the AI player object in GameState.onlinePlayers.
  // No change to Player type itself is strictly needed if AIs in onlinePlayers are Partial<Player> & {resources: Resources}
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
  special?: string | null 
}

export interface MapElement {
  id: string
  position: { x: number; y: number }
  cooldownUntil?: number | null 
}

export interface Enemy extends MapElement {
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
  spawnChance?: number 
  description: string
  boss?: boolean
  special?: boolean
  legendary?: boolean
  // NEW: For specific enemy logic like Sandworm attacks
  specialType?: 'sandworm'; 
  // NEW: For enemy movement
  isMoving?: boolean; // Flag if enemy is currently trying to move
  lastMoveAttempt?: number; // Timestamp of last move attempt
}

export interface ResourceNode extends MapElement {
  type: string 
  amount: number
  icon?: string
}

export interface Combat {
  active: boolean
  enemy: Enemy | null 
  turn: "player" | "enemy"
  log: string[]
  playerHealthAtStart: number 
  enemyHealthAtStart: number 
  combatRound: number 
}

export interface TerritoryDetails extends MapElement {
  ownerId: string | null
  ownerName?: string
  ownerColor?: string
  purchaseCost: number
  perks: string[]
  resourceYield?: Partial<Resources>
  name?: string
  // NEW: For Sandworm destruction
  isDestroyed?: boolean;
  destroyedUntil?: number;
}

export interface Investment {
  level: number
  costToUpgrade: number
  productionRate: number
  productionResource: keyof Resources 
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

export interface WorldEvent extends MapElement { // MapElement gives it an ID and position if needed
  name: string
  description: string
  icon: string
  rewards?: Partial<Resources & { xp?: number }>
  effect?: string 
  effectValue?: number // Added to quantify effects
  duration?: number 
  endTime?: number 
  type?: 'economy' | 'hazard' | 'diplomacy' | 'political'; // For categorization
  // NEW: For event chaining (e.g. Wormsign -> ShaiHuludAttack)
  triggersNext?: string; // Key of the next event to trigger
  isChainedEvent?: boolean; // If this event was triggered by another
  // NEW: For Sandworm attack target
  targetTerritoryKey?: string;
}

export interface ChatMessage {
  senderId: string
  senderName: string
  senderColor: string
  timestamp: {
    seconds: number
    nanoseconds: number
  }
  message: string 
}

export interface Ability {
  id: string
  name: string
  description: string
  icon: string
  levelRequired: number
  cooldown: number 
  duration: number 
  effectType: "attack_boost" | "defense_boost" | "crit_boost" | "dodge_boost" | "health_regen" | "energy_regen" | "stun"
  effectValue: number 
}

// Modified onlinePlayers to include full Player type and their own Resources
export type AIPlayer = Player & { resources: Resources };

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
  // onlinePlayers: Record<string, Partial<Player & { position: { x: number; y: number } }>> // Old
  onlinePlayers: Record<string, AIPlayer> // NEW: AIs have their own full Player state and Resources
  worldEvents: WorldEvent[]
  tradeOffers: any[]
  map: {
    enemies: Record<string, Enemy> 
    resources: Record<string, ResourceNode> 
    territories: Record<string, TerritoryDetails> 
    items: Record<string, Item> 
  }
  leaderboard: RankedPlayer[]
  isNameModalOpen: boolean
  isHouseModalOpen: boolean
  isCombatModalOpen: boolean
  isTradingModalOpen: boolean
  isTerritoryModalOpen: boolean
  isPrestigeModalOpen: boolean
  isAbilitySelectionModalOpen: boolean
  selectedTerritoryCoords: { x: number; y: number } | null
  notifications: Array<{ id: string; message: string; type: "success" | "error" | "warning" | "info" | "legendary" }>
  chatMessages: ChatMessage[] 
  abilityCooldowns: Record<string, number> 
  // NEW: Track last time AI and World Events were processed
  lastAIProcessingTime?: number;
  lastWorldEventProcessingTime?: number;
}

export type PlayerColor = "red" | "blue" | "green" | "purple" | "orange" | "pink" | "yellow" | "cyan"
