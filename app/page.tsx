"use client"

import { useState, useEffect, useCallback, useRef } from "react"

import { LoadingScreen } from "@/components/loading-screen"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { Sidebar } from "@/components/sidebar"
import { MapGrid } from "@/components/map-grid"
import { MobileMovementControls } from "@/components/mobile-movement-controls"
import { CharacterTab } from "@/components/character-tab"
import { EmpireTab } from "@/components/empire-tab"
import { TerritoryModal } from "@/components/modals/territory-modal"
import { NotificationArea } from "@/components/notification-area"
import { CombatModal } from "@/components/modals/combat-modal"
import { NameSelectionModal } from "@/components/modals/name-selection-modal"
import { HouseSelectionModal } from "@/components/modals/house-selection-modal"
import { ActionsPanel } from "@/components/actions-panel"
import { Leaderboard } from "@/components/leaderboard"
import { PlayerStatsPanel } from "@/components/player-stats-panel"
import { QuestPanel } from "@/components/quest-panel"
import { HousesPanel } from "@/components/houses-panel"
import { WorldEventsPanel } from "@/components/world-events-panel"
import { PrestigeModal } from "@/components/modals/prestige-modal"
import { WorldChat } from "@/components/world-chat"
import { isInBaseArea } from "@/lib/utils"
import { TerritoryChart } from "@/components/territory-chart"
import { AbilitySelectionModal } from "@/components/modals/ability-selection-modal"
import { TradePanel } from "@/components/trade-panel"
import { TradingModal } from "@/components/modals/trading-modal"
import { UpdatesTab } from "@/components/updates-tab"
import { WishlistTab } from "@/components/wishlist-tab"
import { BountyBoard } from "@/components/bounty-board"
import { Slider } from "@/components/ui/slider"
import { PauseModal } from "@/components/modals/pause-modal"
import { SandwormWarning } from "@/components/sandworm-warning"
import { useIsMobile } from "@/hooks/use-mobile"

import type {
  GameState,
  RankedPlayer,
  TerritoryDetails,
  Item,
  Enemy,
  Player,
  Combat,
  Resources,
  Ability,
  WorldEvent,
  AIPlayer,
  PlayerColor,
  Quest,
  TradeOffer,
} from "@/types/game"
import { CONFIG, PLAYER_COLORS, RARITY_SCORES, HOUSE_COLORS, CRAFTING_RECIPES } from "@/lib/constants"
import { STATIC_DATA } from "@/lib/game-data"
import { auth, db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { LoginForm } from "@/components/login-form"

import { initialVentures as empireInitialVentures } from "@/components/empire-tab" // Correct import

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const getRandomMapCoords = (mapWidth = CONFIG.MAP_SIZE, mapHeight = CONFIG.MAP_SIZE) => {
  const x = getRandomInt(0, mapWidth - 1)
  const y = getRandomInt(0, mapHeight - 1)
  return { x, y }
}

const isNearRock = (x: number, y: number, rocks: Record<string, boolean>) => {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (rocks[`${x + dx},${y + dy}`]) return true
    }
  }
  return false
}

// ---- Quest Generation ----
const createRandomQuest = (): Quest => {
  const types: Quest["type"][] = ["kill", "territory", "move", "build"]
  const type = types[getRandomInt(0, types.length - 1)]
  let goal = 1
  switch (type) {
    case "kill":
      goal = getRandomInt(3, 8)
      break
    case "territory":
      goal = getRandomInt(1, 4)
      break
    case "move":
      goal = getRandomInt(10, 30)
      break
    case "build":
      goal = 1
      break
  }
  const descriptions = {
    kill: `Defeat ${goal} enemies`,
    territory: `Acquire ${goal} territories`,
    move: `Travel ${goal} tiles`,
    build: `Build a base`,
  }
  return {
    id: `quest_${Date.now()}_${Math.random()}`,
    description: descriptions[type],
    type,
    goal,
    progress: 0,
    completed: false,
  }
}

const generateMockItems = (): Record<string, Item> => {
  const items: Record<string, Item> = {}
  const itemTypes = Object.keys(STATIC_DATA.ITEMS)
  const numItems = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.005) // Place a small percentage of items
  for (let i = 0; i < numItems; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (items[key]) continue // Avoid placing multiple items on the same cell

    const itemTypeKey = itemTypes[getRandomInt(0, itemTypes.length - 1)] as keyof typeof STATIC_DATA.ITEMS
    const itemData = STATIC_DATA.ITEMS[itemTypeKey]

    // Only add items that have a dropChance > 0 or are not consumables (which are usually crafted/looted)
    if ((itemData.dropChance && itemData.dropChance > 0) || itemData.type !== "consumable") {
      items[key] = {
        id: `item_${x}_${y}`,
        ...itemData,
        position: { x, y },
      }
    }
  }
  return items
}

const generateInitialQuests = () => [createRandomQuest(), createRandomQuest()]
// --- MOCK DATA GENERATION (mostly unchanged, but AIs will get resources) ---
const generateMockLeaderboard = (): RankedPlayer[] => {
  // This will be dynamically generated in the game tick now
  return []
}

const generateMockTerritories = (): Record<string, TerritoryDetails> => {
  // Unchanged
  const territories: Record<string, TerritoryDetails> = {}
  for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
    for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
      const key = `${x},${y}`
      territories[key] = {
        id: `terr_${x}_${y}`,
        x, // Storing x, y for easier access
        y,
        position: { x, y },
        ownerId: null,
        purchaseCost: 500 + Math.floor(Math.random() * 1500),
        resourceYield: { spice: Math.random() * 0.02 + 0.005 },
        perks: [`+${Math.floor(Math.random() * 5 + 1)}% Spice Production`],
        name: `Sector ${String.fromCharCode(65 + x)}${y + 1}`,
        isDestroyed: false, // Initialize as not destroyed
        captureLevel: 0,
      }
    }
  }
  return territories
}

const generateMockEnemies = (): Record<string, Enemy> => {
  // Added lastMoveAttempt
  const enemies: Record<string, Enemy> = {}
  const enemyTypes = Object.keys(STATIC_DATA.ENEMIES)
  const numEnemies = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.01)
  for (let i = 0; i < numEnemies; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (enemies[key]) continue
    const enemyTypeKey = enemyTypes[getRandomInt(0, enemyTypes.length - 1)] as keyof typeof STATIC_DATA.ENEMIES
    const enemyData = STATIC_DATA.ENEMIES[enemyTypeKey]
    enemies[key] = {
      id: `enemy_${x}_${y}`,
      type: enemyTypeKey,
      name: enemyData.name,
      icon: enemyData.icon,
      health: enemyData.health,
      currentHealth: enemyData.health,
      attack: enemyData.attack,
      defense: enemyData.defense,
      xp: enemyData.xp,
      loot: enemyData.loot,
      level: enemyData.level,
      description: enemyData.description,
      position: { x, y },
      boss: enemyData.boss || false,
      special: enemyData.special || false,
      legendary: enemyData.legendary || false,
      specialType: (enemyData as any).specialType || null, // Fix: Ensure specialType is null if undefined
      lastMoveAttempt: 0, // For enemy movement timing
    }
  }
  return enemies
}

const generateRockIslands = (): Record<string, boolean> => {
  const rocks: Record<string, boolean> = {}
  const numIslands = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.002)
  for (let i = 0; i < numIslands; i++) {
    const { x, y } = getRandomMapCoords()
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        const rx = Math.min(CONFIG.MAP_SIZE - 1, x + dx)
        const ry = Math.min(CONFIG.MAP_SIZE - 1, y + dy)
        rocks[`${rx},${ry}`] = true
      }
    }
  }
  return rocks
}

const generateInitialWorm = (): Worm => {
  const { x, y } = getRandomMapCoords()
  const segments = [] as { x: number; y: number }[]
  for (let i = 0; i < 5; i++) {
    segments.push({ x: Math.max(0, x - i), y })
  }
  return { segments, targetPlayerId: null, spawnCountdown: null }
  return { segments, targetPlayerId: null }
const generateWaterCaches = (): Record<string, ResourceNode> => {
  const caches: Record<string, ResourceNode> = {}
  const numCaches = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.001)
  for (let i = 0; i < numCaches; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (caches[key]) continue
    caches[key] = {
      id: `water_${x}_${y}`,
      type: 'water_cache',
      amount: 20,
      icon: '💧',
      position: { x, y },
    }
  }
  return caches
}

const getInitialPlayerState = (id: string | null, prestigeLevel = 0): Player => {
  // Unchanged
  const initialPosition = getRandomMapCoords()
  return {
    id: id,
    name: "Wanderer",
    color: PLAYER_COLORS[prestigeLevel % PLAYER_COLORS.length],
    level: 1,
    experience: 0,
    experienceToNext: CONFIG.XP_BASE,
    health: 120,
    maxHealth: 120,
    energy: 150,
    maxEnergy: 150,
    attack: 15,
    defense: 10,
    critChance: 8,
    dodgeChance: 15,
    position: initialPosition,
    basePosition: initialPosition,
    baseBuilt: false,
    house: null,
    rank: 100,
    rankName: "Sand Nomad",
    power: 0,
    prestigeLevel: prestigeLevel,
    globalGainMultiplier: 1 + prestigeLevel * 0.05,
    territories: [],
    lifetimeSpice: 0,
    totalEnemiesDefeated: 0, // Initialize totalEnemiesDefeated
    energyProductionRate: CONFIG.ENERGY_REGEN_RATE,
    created: Date.now(),
    lastActive: Date.now(),
    bounty: 0,
    investments: JSON.parse(JSON.stringify(empireInitialVentures)), // Deep copy to ensure unique instance per player
    spicePerClick: 1,
    spiceClickUpgradeCost: 50,
    unlockedAbilities: [],
    activeAbility: null,
    isDefending: false,
    xpBuffMultiplier: 1,
    xpBuffExpires: null,
    speedBoostExpires: null,
    heat: 0,
  }
}

const getInitialResourcesState = (): Resources => ({
  // Unchanged
  spice: 100,
  water: 200,
  solari: 2500,
  plasteel: 150,
  rareMaterials: 10,
  melange: 5,
})

const initialMapData = {
  enemies: generateMockEnemies(),
  resources: generateWaterCaches(),
  territories: generateMockTerritories(),
  items: generateMockItems(),
  seekers: {},
  rocks: generateRockIslands(),
}

// Function to create an AI player with initial state
const createInitialAIPlayer = (
  id: string,
  name: string,
  house: string,
  color: PlayerColor,
  prestige: number,
): AIPlayer => {
  const initialPlayerPart = getInitialPlayerState(id, prestige)
  return {
    ...initialPlayerPart,
    name: name,
    house: house,
    color: color,
    bounty: 0,
    position: getRandomMapCoords(), // Give AI a random starting position
    basePosition: initialPlayerPart.position, // Same as initial for now
    baseBuilt: false,
    // AIs have their own resources
    resources: {
      spice: getRandomInt(1000, 3000),
      water: getRandomInt(1000, 3000),
      solari: getRandomInt(5000, 15000), // AIs start with more Solari for expansion
      plasteel: getRandomInt(500, 1500),
      rareMaterials: getRandomInt(50, 150),
      melange: getRandomInt(20, 60),
    },
    // AIs start with a few territories for presence
    territories: [], // Will be populated during AI initialization or first turn
    totalEnemiesDefeated: getRandomInt(0, 50), // Mock kills for AI
    equipment: {
      // Mock equipment for AI
      weapon: STATIC_DATA.ITEMS.maula,
      armor: STATIC_DATA.ITEMS.stillsuit,
      accessory: STATIC_DATA.ITEMS.fremkit,
    },
  }
}

const initialGameState: GameState = {
  player: getInitialPlayerState(null),
  resources: getInitialResourcesState(),
  equipment: { weapon: null, armor: null, accessory: null },
  inventory: new Array(CONFIG.MAX_INVENTORY).fill(null),
  buildings: {},
  combat: {
    active: false,
    enemy: null,
    turn: "player",
    log: [],
    playerHealthAtStart: 0,
    enemyHealthAtStart: 0,
    combatRound: 0,
  },
  currentTab: "game",
  gameInitialized: false,
  lastSaveTime: 0,
  lastEnergyRegen: Date.now(),
  onlinePlayers: {
    // NEW: AIs now have full Player state and Resources
    ai_harkonnen_1: createInitialAIPlayer("ai_harkonnen_1", "Rival Duke Feyd", "harkonnen", "orange", 2),
    ai_fremen_1: createInitialAIPlayer("ai_fremen_1", "Sietch Leader Stilgar", "fremen", "green", 1),
    ai_atreides_1: createInitialAIPlayer("ai_atreides_1", "Warmaster Gurney", "atreides", "blue", 1),
  },
  worldEvents: [
    // Initial event, more will be dynamic
    {
      id: "event_initial_spice_bloom",
      name: "Minor Spice Bloom",
      icon: "✨",
      description: "Small spice deposit nearby.",
      position: getRandomMapCoords(), // Random position for the initial event
      endTime: Date.now() + 300000, // 5 minutes
      type: "economy",
      rewards: { spice: 100 },
    },
  ],
  tradeOffers: [],
  map: initialMapData,
  worm: generateInitialWorm(),
  leaderboard: generateMockLeaderboard(), // This will be populated dynamically
  isNameModalOpen: true,
  isHouseModalOpen: false,
  isCombatModalOpen: false,
  isTradingModalOpen: false,
  isTerritoryModalOpen: false,
  isPrestigeModalOpen: false,
  isAbilitySelectionModalOpen: false,
  selectedTerritoryCoords: null,
  notifications: [],
  chatMessages: [],
  abilityCooldowns: {},
  quests: generateInitialQuests(),
  completedQuests: [],
  lastAIProcessingTime: 0, // NEW
  lastWorldEventProcessingTime: 0, // NEW
  capturingTerritoryId: null,
  isPaused: false,
  sandwormAttackTime: null,
  lastSeekerLaunchTime: 0,
  bounties: {},
  trackingTargetId: null,
}

const calculateEquipmentScore = (equipment: GameState["equipment"]): number => {
  // Unchanged
  let score = 0
  if (equipment.weapon && equipment.weapon.rarity) {
    score += RARITY_SCORES[equipment.weapon.rarity as keyof typeof RARITY_SCORES] || 0
  }
  if (equipment.armor && equipment.armor.rarity) {
    score += RARITY_SCORES[equipment.armor.rarity as keyof typeof RARITY_SCORES] || 0
  }
  if (equipment.accessory && equipment.accessory.rarity) {
    score += RARITY_SCORES[equipment.accessory.rarity as keyof typeof RARITY_SCORES] || 0
  }
  return score
}

// Calculate an overall score for ranking players
const calculatePlayerScore = (
  territoryCount: number,
  solari: number,
  equipmentScore: number,
  kills: number,
): number => {
  const territoryScore = territoryCount * 100
  const killScore = kills * 20
  const itemScore = equipmentScore * 50
  const solariScore = solari * 0.02
  return territoryScore + killScore + itemScore + solariScore
}

// Fetch leaderboard data for all players from Firestore
const fetchLeaderboardData = async (): Promise<RankedPlayer[]> => {
  const snapshot = await getDocs(collection(db, "players"))
  const players: RankedPlayer[] = []
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as GameState
    if (!data?.player) return
    const equipmentScore = calculateEquipmentScore(data.equipment)
    const score = calculatePlayerScore(
      data.player.territories?.length ?? 0,
      data.resources?.solari ?? 0,
      equipmentScore,
      data.player.totalEnemiesDefeated ?? 0,
    )
    players.push({
      id: data.player.id || docSnap.id,
      name: data.player.name,
      rank: 0,
      rankName: "",
      house: data.player.house,
      prestigeLevel: data.player.prestigeLevel,
      color: data.player.color,
      power: score,
    })
  })
  const sorted = players.sort((a, b) => b.power - a.power)
  return sorted.map((p, i) => {
    const rank = i + 1
    const rankName = rank < 10 ? "Spice Baron" : rank < 50 ? "Guild Associate" : "Sand Nomad"
    return { ...p, rank, rankName }
  })
}

const applyXpGain = (player: Player, base: number) => {
  let xp = base
  const now = Date.now()
  xp = Math.floor(xp * player.globalGainMultiplier)
  if (player.xpBuffExpires && player.xpBuffExpires > now) {
    xp = Math.floor(xp * (player.xpBuffMultiplier || 1))
  }
  if (player.house === "atreides") {
    xp = Math.floor(xp * 1.25)
  }
  player.experience += xp
}

// --- CONFIGURATION FOR NEW SYSTEMS ---
const AI_CONFIG = {
  PROCESSING_INTERVAL: 10000, // AI acts every 10 seconds
  EXPANSION_CHANCE: 0.5, // 50% chance to try expanding if conditions met
  TERRITORY_CLAIM_COST_MULTIPLIER: 1.0, // AI pays same as player for now
  MAX_TERRITORIES_PER_AI: 20, // Cap AI expansion for performance/balance
}

const ENEMY_MOVEMENT_CONFIG = {
  PROCESSING_INTERVAL: 3000, // Enemies try to move every 3 seconds
  MOVEMENT_CHANCE: 0.2, // 20% chance for an active enemy to attempt a move
}

export default function ArrakisGamePage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [isLoading, setIsLoading] = useState(true)
  const [availableAbilitiesForSelection, setAvailableAbilitiesForSelection] = useState<Ability[]>([])
  const [zoom, setZoom] = useState(1.2)
  const [user, setUser] = useState(() => auth.currentUser)
  const [seekerLaunchVisualTime, setSeekerLaunchVisualTime] = useState(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (isMobile) {
      setZoom(0.6)
    }
  }, [isMobile])

  // All hooks must be declared unconditionally at the top level
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const lastGeneralNotificationTime = useRef(0)
  const GENERAL_NOTIFICATION_COOLDOWN = 1000

  const gameStateRef = useRef(gameState)
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const addNotification = useCallback((message: string, type: GameState["notifications"][0]["type"] = "info") => {
    const now = Date.now()
    if (type === "legendary" || type === "mythic" || type === "error" || type === "warning") {
      setGameState((prev) => ({
        ...prev,
        notifications: [...prev.notifications, { id: now.toString(), message, type }],
      }))
      lastGeneralNotificationTime.current = now
      return
    }
    if (now - lastGeneralNotificationTime.current < GENERAL_NOTIFICATION_COOLDOWN) {
      return
    }
    setGameState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, { id: now.toString(), message, type }],
    }))
    lastGeneralNotificationTime.current = now
  }, [])

  const addWorldChatMessage = useCallback((message: string) => {
    setGameState((prev) => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages,
        {
          senderId: prev.player.id || "anonymous",
          senderName: prev.player.name,
          senderColor: prev.player.color,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          message,
        },
      ],
    }))
  }, [])

  const applyQuestProgress = (state: GameState, type: Quest["type"], amount = 1): GameState => {
    let quests = state.quests.map((q) => {
      if (!q.completed && q.type === type) {
        const progress = q.progress + amount
        const completed = progress >= q.goal
        if (completed) {
          addNotification(`Quest completed: ${q.description}`, "success")
        }
        return { ...q, progress: Math.min(progress, q.goal), completed }
      }
      return q
    })
    const newlyCompleted = quests.filter((q) => q.completed)
    const completedQuests = [
      ...state.completedQuests,
      ...newlyCompleted.filter((q) => !state.completedQuests.find((c) => c.id === q.id)),
    ]
    quests = quests.filter((q) => !q.completed)
    const newQuests = quests.slice()
    let xpTotal = 0
    newlyCompleted.forEach(() => {
      newQuests.push(createRandomQuest())
      xpTotal += CONFIG.XP_GAIN_QUEST_COMPLETE
    })
    const newPlayer = { ...state.player }
    if (xpTotal > 0) applyXpGain(newPlayer, xpTotal)
    return { ...state, quests: newQuests, completedQuests, player: newPlayer }
  }

  const updateQuestProgress = useCallback(
    (type: Quest["type"], amount = 1) => {
      setGameState((prev) => applyQuestProgress(prev, type, amount))
    },
    [addNotification],
  )

  // --- GAME INITIALIZATION (Firebase loading, etc.) ---
  useEffect(() => {
    const initGame = async () => {
      if (!user) {
        setIsLoading(false) // Ensure loading is false if no user, so LoginForm can render
        return
      }
      console.log("Initializing game...")
      setIsLoading(true)
      try {
        const userId = user.uid

        const playerDocRef = doc(db, "players", userId)
        const playerDocSnap = await getDoc(playerDocRef)

        if (playerDocSnap.exists()) {
          const savedState = playerDocSnap.data() as GameState

          // Reconstruct map territories based on saved player AND AI territories
          const newMapTerritories = { ...initialMapData.territories }

          // Player territories
          savedState.player.territories?.forEach((ownedTerritory) => {
            const key = `${ownedTerritory.x},${ownedTerritory.y}`
            if (newMapTerritories[key]) {
              newMapTerritories[key] = { ...newMapTerritories[key], ...ownedTerritory }
            }
          })

          // AI territories (from saved onlinePlayers)
          if (savedState.onlinePlayers) {
            Object.values(savedState.onlinePlayers).forEach((aiPlayer) => {
              aiPlayer.territories?.forEach((ownedTerritory) => {
                const key = `${ownedTerritory.x},${ownedTerritory.y}`
                if (newMapTerritories[key] && !newMapTerritories[key].ownerId) {
                  // AI claims only if still unowned by player
                  newMapTerritories[key] = {
                    ...newMapTerritories[key],
                    ownerId: aiPlayer.id,
                    ownerName: aiPlayer.name,
                    ownerColor: HOUSE_COLORS[aiPlayer.house as keyof typeof HOUSE_COLORS] || aiPlayer.color,
                  }
                }
              })
            })
          }

          // Initialize AI resources if they are missing from save (for backward compatibility)
          const updatedOnlinePlayers = { ...initialGameState.onlinePlayers, ...savedState.onlinePlayers }
          for (const aiId in updatedOnlinePlayers) {
            if (!updatedOnlinePlayers[aiId].resources) {
              const houseKey = updatedOnlinePlayers[aiId].house || Object.keys(STATIC_DATA.HOUSES)[0]
              updatedOnlinePlayers[aiId] = createInitialAIPlayer(
                aiId,
                updatedOnlinePlayers[aiId].name || "AI Player",
                houseKey,
                updatedOnlinePlayers[aiId].color || PLAYER_COLORS[0],
                updatedOnlinePlayers[aiId].prestigeLevel || 0,
              )
            }
            // Ensure AI territories are also part of the AI player object
            updatedOnlinePlayers[aiId].territories = Object.values(newMapTerritories).filter((t) => t.ownerId === aiId)
          }

          setGameState((prev) => ({
            ...prev,
            ...savedState,
            map: {
              ...initialMapData,
              territories: newMapTerritories,
              seekers: savedState.map?.seekers || {},
              rocks: initialMapData.rocks,
            },
            worm: generateInitialWorm(),
            onlinePlayers: updatedOnlinePlayers, // Use updated AIs
            unlockedAbilities: savedState.player.unlockedAbilities || [],
            activeAbility: savedState.player.activeAbility || null,
            isDefending: savedState.player.isDefending || false,
            abilityCooldowns: savedState.abilityCooldowns || {},
            bounties: savedState.bounties || {},
            trackingTargetId: savedState.trackingTargetId || null,
            quests: savedState.quests || generateInitialQuests(),
            completedQuests: savedState.completedQuests || [],
            lastAIProcessingTime: Date.now(), // Initialize processing times
            lastWorldEventProcessingTime: Date.now(),
          }))
          addNotification(`Welcome back, ${savedState.player.name}!`, "legendary")
        } else {
          // NEW GAME - Initialize AIs with a few starting territories
          const newGameState = {
            ...initialGameState, // Already has AI players with resources
            player: {
              ...initialGameState.player,
              id: userId,
              unlockedAbilities: [],
              activeAbility: null,
              isDefending: false,
            },
            isNameModalOpen: true,
            gameInitialized: false,
            abilityCooldowns: {},
            quests: generateInitialQuests(),
            completedQuests: [],
            lastAIProcessingTime: Date.now(),
            lastWorldEventProcessingTime: Date.now(),
            bounties: {},
            trackingTargetId: null,
          }

          // Give initial territories to AIs on new game
          Object.values(newGameState.onlinePlayers).forEach((ai) => {
            for (let i = 0; i < 2; i++) {
              // Give each AI 2 random territories
              const unownedTerritories = Object.values(newGameState.map.territories).filter((t) => !t.ownerId)
              if (unownedTerritories.length > 0) {
                const terrToClaim = unownedTerritories[getRandomInt(0, unownedTerritories.length - 1)]
                const key = terrToClaim.position
                  ? `${terrToClaim.position.x},${terrToClaim.position.y}`
                  : `${terrToClaim.x},${terrToClaim.y}`
                newGameState.map.territories[key] = {
                  ...terrToClaim,
                  ownerId: ai.id,
                  ownerName: ai.name,
                  ownerColor: HOUSE_COLORS[ai.house as keyof typeof HOUSE_COLORS] || ai.color,
                }
                ai.territories.push(newGameState.map.territories[key])
              }
            }
          })

          setGameState(newGameState)
        }
      } catch (error) {
        console.error("Error during game initialization:", error)
        if (error instanceof Error) {
          addNotification(`Failed to load game: ${error.message}. Please check console for details.`, "error")
        } else {
          addNotification("An unknown error occurred during game loading. Please try again.", "error")
        }
      } finally {
        setIsLoading(false)
      }
    }
    initGame()
  }, [user, addNotification]) // Added addNotification to dependencies

  // Periodically refresh leaderboard from Firestore
  useEffect(() => {
    // Only run if user is logged in and game is initialized
    if (!user || !gameState.gameInitialized) return

    const updateLeaderboard = async () => {
      try {
        const leaderboard = await fetchLeaderboardData()
        setGameState((prev) => ({ ...prev, leaderboard }))
      } catch (err) {
        console.error("Failed to fetch leaderboard", err)
      }
    }
    updateLeaderboard()
    const interval = setInterval(updateLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [user, gameState.gameInitialized]) // Added user and gameState.gameInitialized to dependencies

  // Listen for bounty changes on the current user
  useEffect(() => {
    if (!user) return
    const playerRef = doc(db, "players", user.uid)
    const unsub = onSnapshot(playerRef, (snap) => {
      if (!snap.exists()) return
      const data = snap.data() as GameState
      setGameState((prev) => {
        const newBounty = data.player?.bounty || 0
        if (newBounty > prev.player.bounty) {
          addNotification(`A bounty has been placed on you! Current bounty: ${newBounty} Solari`, "warning")
        }
        if (newBounty !== prev.player.bounty) {
          return { ...prev, player: { ...prev.player, bounty: newBounty } }
        }
        return prev
      })
    })
    return () => unsub()
  }, [user, addNotification])

  const handleSendMessage = useCallback((message: string) => {
    setGameState((prev) => {
      const newMessages = [
        ...prev.chatMessages,
        {
          senderId: prev.player.id || "anonymous",
          senderName: prev.player.name,
          senderColor: prev.player.color,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          message,
        },
      ]
      return { ...prev, chatMessages: newMessages }
    })
  }, [])

  const handleSelectAbility = useCallback(
    (abilityId: string) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const selectedAbility = STATIC_DATA.ABILITIES[abilityId as keyof typeof STATIC_DATA.ABILITIES]

        if (selectedAbility && !newPlayer.unlockedAbilities.some((a) => a.id === abilityId)) {
          newPlayer.unlockedAbilities.push(selectedAbility)
          addNotification(`You unlocked the ${selectedAbility.name} ability!`, "success")
        } else {
          addNotification("Ability not found or already unlocked.", "warning")
        }

        return { ...prev, player: newPlayer, isAbilitySelectionModalOpen: false }
      })
      setAvailableAbilitiesForSelection([]) // Clear selection options
    },
    [addNotification],
  )

  const handleActivateAbility = useCallback(
    (ability: Ability) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newAbilityCooldowns = { ...prev.abilityCooldowns }
        const now = Date.now()

        if (newAbilityCooldowns[ability.id] && newAbilityCooldowns[ability.id] > now) {
          addNotification(`Ability ${ability.name} is on cooldown!`, "warning")
          return prev
        }

        // Deactivate current ability if active
        if (newPlayer.activeAbility) {
          addNotification(`${newPlayer.activeAbility.name} deactivated.`, "info")
          newPlayer.activeAbility = null
        }

        // Activate new ability
        newPlayer.activeAbility = ability
        newAbilityCooldowns[ability.id] = now + ability.cooldown // Set cooldown
        addNotification(`Ability ${ability.name} activated!`, "success")

        return { ...prev, player: newPlayer, abilityCooldowns: newAbilityCooldowns }
      })
      updateQuestProgress("territory")
    },
    [addNotification],
  )

  // Ensure handleCombatEnd uses gameStateRef if it needs the absolute latest full state not passed directly
  const handleCombatEnd = useCallback(
    (
      result: "win" | "lose" | "flee",
      playerState: Player, // This is a snapshot
      enemyInstance: Enemy, // Snapshot
      combatState: Combat, // Snapshot
      resourcesState: Resources, // Snapshot
      mapState: GameState["map"], // Snapshot
    ) => {
      const currentFullGameState = gameStateRef.current // Use ref for up-to-date inventory etc.
      const newPlayer = { ...playerState }
      const newResources = { ...resourcesState }
      const newMap = {
        ...mapState,
        enemies: { ...mapState.enemies },
        territories: { ...mapState.territories },
      } // Be careful with deep copies if needed
      const newBounties = { ...currentFullGameState.bounties }
      let trackingTargetId = currentFullGameState.trackingTargetId || null
      const updatedInventory = [...currentFullGameState.inventory] // Use inventory from the ref
      const now = Date.now()
      let territoriesCaptured = 0

      if (result === "win") {
        let xpGained = enemyInstance.xp
        xpGained = Math.floor(xpGained * newPlayer.globalGainMultiplier)
        if (newPlayer.xpBuffExpires && newPlayer.xpBuffExpires > now) {
          xpGained = Math.floor(xpGained * (newPlayer.xpBuffMultiplier || 1))
        }
        if (newPlayer.house === "atreides") {
          xpGained = Math.floor(xpGained * 1.25)
        }
        newPlayer.experience += xpGained
        newPlayer.totalEnemiesDefeated += 1 // Increment total enemies defeated
        if (newPlayer.experience >= newPlayer.experienceToNext) {
          newPlayer.level++
          newPlayer.experience -= newPlayer.experienceToNext
          newPlayer.experienceToNext = Math.floor(newPlayer.experienceToNext * CONFIG.XP_FACTOR)
          newPlayer.maxHealth += 15
          newPlayer.health = newPlayer.maxHealth
          newPlayer.maxEnergy += 8
          newPlayer.energy = newPlayer.maxEnergy
          addNotification(`You leveled up to Level ${newPlayer.level}!`, "legendary")

          if (newPlayer.level % 5 === 0 && newPlayer.level <= 25) {
            const allAbilities = Object.values(STATIC_DATA.ABILITIES)
            const unlearnedAbilities = allAbilities.filter(
              (ability) =>
                ability.levelRequired <= newPlayer.level &&
                !newPlayer.unlockedAbilities.some((ua) => ua.id === ability.id),
            )
            if (unlearnedAbilities.length > 0) {
              const abilitiesToOffer: Ability[] = []
              const shuffled = [...unlearnedAbilities].sort(() => 0.5 - Math.random())
              for (let i = 0; i < Math.min(3, shuffled.length); i++) {
                abilitiesToOffer.push(shuffled[i])
              }
              setAvailableAbilitiesForSelection(abilitiesToOffer)
              // Directly update state here, as handleCombatEnd returns the new state for setGameState.
              // This modal opening needs to be handled carefully with state updates.
              // For simplicity, we assume this function is called within setGameState context or triggers a subsequent setGameState.
            }
          }
        }
        Object.entries(enemyInstance.loot).forEach(([resource, amount]) => {
          if (resource in newResources) (newResources as any)[resource] += Math.max(0, amount) // Ensure loot is non-negative
        })
        const availableItems = Object.values(STATIC_DATA.ITEMS)
        availableItems.forEach((itemData) => {
          if (itemData.dropChance && Math.random() < itemData.dropChance) {
            const emptySlotIndex = updatedInventory.findIndex((slot) => slot === null)
            if (emptySlotIndex !== -1) {
              updatedInventory[emptySlotIndex] = itemData
              const noticeType =
                itemData.rarity === "mythic" ? "mythic" : itemData.rarity === "legendary" ? "legendary" : "success"
              addNotification(`You found a ${itemData.icon} ${itemData.name}!`, noticeType as any)
              addNotification(`You found a ${itemData.icon} ${itemData.name}!`, "success")
              if (itemData.rarity === "legendary" || itemData.rarity === "mythic") {
                const rarityLabel = itemData.rarity.toUpperCase()
                addWorldChatMessage(`🎉 ${newPlayer.name} discovered a ${rarityLabel} ${itemData.name}! 🎉`)
              }
            } else {
              addNotification(`Inventory full! Could not pick up ${itemData.name}.`, "warning")
            }
          }
        })
        const enemyKey = enemyInstance.position
          ? `${enemyInstance.position.x},${enemyInstance.position.y}`
          : `${enemyInstance.x},${enemyInstance.y}`
        if (newMap.enemies[enemyKey]) {
          delete newMap.enemies[enemyKey]
        }
        if (enemyInstance.type === "player") {
          newPlayer.xpBuffMultiplier = 1.5
          newPlayer.xpBuffExpires = now + 60000
          addNotification("XP Buff! +50% for 1 minute", "legendary")
        }
        if (currentFullGameState.capturingTerritoryId) {
          const terrKey = currentFullGameState.capturingTerritoryId
          const terr = newMap.territories[terrKey]
          if (terr) {
            const oldOwner = terr.ownerId
            newMap.territories[terrKey] = {
              ...terr,
              ownerId: newPlayer.id,
              ownerName: newPlayer.name,
              ownerColor: HOUSE_COLORS[newPlayer.house as keyof typeof HOUSE_COLORS] || newPlayer.color,
              captureLevel: 0,
            }
            newPlayer.territories = [...newPlayer.territories, newMap.territories[terrKey]]
            if (oldOwner && currentFullGameState.onlinePlayers[oldOwner]) {
              currentFullGameState.onlinePlayers[oldOwner].territories = currentFullGameState.onlinePlayers[
                oldOwner
              ].territories.filter((t) => t.id !== terr.id)
            }
            addNotification(`You captured ${terr.name || terrKey}!`, "success")
            territoriesCaptured++
            if (oldOwner && oldOwner !== newPlayer.id && enemyInstance.type !== "player") {
              newPlayer.xpBuffMultiplier = 1.5
              newPlayer.xpBuffExpires = now + 60000
              addNotification("XP Buff! +50% for 1 minute", "legendary")
            }
          }
        }

        // Claim surrounding sectors for the player's house
        const directions = [-1, 0, 1]
        directions.forEach((dx) => {
          directions.forEach((dy) => {
            if (dx === 0 && dy === 0) return
            const tx = (enemyInstance.position?.x ?? enemyInstance.x) + dx
            const ty = (enemyInstance.position?.y ?? enemyInstance.y) + dy
            if (tx < 0 || tx >= CONFIG.MAP_SIZE || ty < 0 || ty >= CONFIG.MAP_SIZE) return
            const tKey = `${tx},${ty}`
            const terr = newMap.territories[tKey]
            if (terr) {
              const prevOwner = terr.ownerId
              newMap.territories[tKey] = {
                ...terr,
                ownerId: newPlayer.id,
                ownerName: newPlayer.name,
                ownerColor: newPlayer.color,
                captureLevel: 0,
              }
              if (!newPlayer.territories.find((t) => t.id === terr.id)) {
                newPlayer.territories.push(newMap.territories[tKey])
                territoriesCaptured++
              }
              if (prevOwner && prevOwner !== newPlayer.id && currentFullGameState.onlinePlayers[prevOwner]) {
                currentFullGameState.onlinePlayers[prevOwner].territories = currentFullGameState.onlinePlayers[
                  prevOwner
                ].territories.filter((t) => t.id !== terr.id)
              }
            }
          })
        })
        addNotification("Your house seizes the surrounding territory!", "success")

        // Penalize defeated player by removing 20% of their territories
        if (enemyInstance.type === "player") {
          const enemyId = enemyInstance.id.replace(/^player_/, "").replace(/^owner_/, "")
          const defeatedPlayer = currentFullGameState.onlinePlayers[enemyId]
          if (defeatedPlayer && defeatedPlayer.territories.length > 0) {
            const territoriesToLose = Math.max(1, Math.floor(defeatedPlayer.territories.length * 0.2))
            for (let i = 0; i < territoriesToLose; i++) {
              const lost = defeatedPlayer.territories.pop()
              if (lost) {
                const key = `${lost.position.x},${lost.position.y}`
                if (newMap.territories[key]) {
                  newMap.territories[key] = {
                    ...newMap.territories[key],
                    ownerId: null,
                    ownerName: undefined,
                    ownerColor: undefined,
                    captureLevel: 0,
                  }
                }
              }
            }
            addNotification(`${defeatedPlayer.name} lost ${territoriesToLose} territories!`, "info")
            const bounty = newBounties[enemyId] || 0
            if (bounty > 0) {
              newResources.solari += bounty
              addNotification(`Bounty collected: ${bounty} Solari!`, "success")
              delete newBounties[enemyId]
              if (trackingTargetId === enemyId) trackingTargetId = null
            }
          }
        }
      } else if (result === "lose") {
        newPlayer.position = getRandomMapCoords()
        newPlayer.health = Math.floor(newPlayer.maxHealth / 2)
        addNotification("You respawned in a random location.", "info")
        if (currentFullGameState.capturingTerritoryId) {
          const terrKey = currentFullGameState.capturingTerritoryId
          const terr = newMap.territories[terrKey]
          if (terr) {
            const newLevel = (terr.captureLevel || 0) + 1
            terr.captureLevel = newLevel
            if (newLevel >= CONFIG.TERRITORY_CAPTURE_THRESHOLD) {
              terr.ownerId = null
              terr.ownerName = undefined
              terr.ownerColor = undefined
              addNotification(`${terr.name || terrKey} is now unclaimed after heavy fighting!`, "info")
            } else {
              addNotification(`Territory weakened (${newLevel}/${CONFIG.TERRITORY_CAPTURE_THRESHOLD}).`, "warning")
            }
            newMap.territories[terrKey] = { ...terr }
          }
        }

        // Player defeated by another player loses 20% of territories
        if (enemyInstance.type === "player" && newPlayer.territories.length > 0) {
          const territoriesToLose = Math.max(1, Math.floor(newPlayer.territories.length * 0.2))
          for (let i = 0; i < territoriesToLose; i++) {
            const lost = newPlayer.territories.pop()
            if (lost) {
              const key = `${lost.position.x},${lost.position.y}`
              if (newMap.territories[key]) {
                newMap.territories[key] = {
                  ...newMap.territories[key],
                  ownerId: null,
                  ownerName: undefined,
                  ownerColor: undefined,
                  captureLevel: 0,
                }
              }
            }
          }
          addNotification(`You lost ${territoriesToLose} territories due to defeat!`, "warning")
        }
      }

      const resetCombat = {
        active: false,
        enemy: null,
        turn: "player",
        log: [],
        playerHealthAtStart: 0,
        enemyHealthAtStart: 0,
        combatRound: 0,
      }

      let finalState: GameState = {
        ...currentFullGameState, // Use the most recent full game state as base
        player: newPlayer,
        resources: newResources,
        map: newMap,
        combat: resetCombat,
        isCombatModalOpen: false,
        inventory: updatedInventory,
        capturingTerritoryId: null,
        bounties: newBounties,
        trackingTargetId,
        // If ability modal should open, set flag here:
        isAbilitySelectionModalOpen:
          result === "win" &&
          newPlayer.level % 5 === 0 &&
          newPlayer.level <= 25 &&
          availableAbilitiesForSelection.length > 0 &&
          availableAbilitiesForSelection.some((a) => !newPlayer.unlockedAbilities.find((ua) => ua.id === a.id)),
      }
      finalState = applyQuestProgress(finalState, "kill")
      if (territoriesCaptured > 0) {
        finalState = applyQuestProgress(finalState, "territory", territoriesCaptured)
      }
      return finalState
    },
    [addNotification, gameStateRef, availableAbilitiesForSelection, updateQuestProgress, addWorldChatMessage], // Added missing dependencies
  )

  const handlePlayerAttack = useCallback(
    (damage: number, isCrit: boolean, miniGameSuccess: boolean) => {
      setGameState((prev) => {
        const newCombat = { ...prev.combat }
        const newEnemy = newCombat.enemy ? { ...newCombat.enemy } : null
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const newMap = { ...prev.map, enemies: { ...prev.map.enemies } }

        if (!newEnemy || !newCombat.active || newCombat.turn !== "player") return prev

        console.log(`Player attacks: Enemy health before: ${newEnemy.currentHealth}, Damage: ${damage}`)
        newEnemy.currentHealth = Math.max(0, newEnemy.currentHealth - damage) // Ensure health doesn't go negative
        console.log(`Enemy health after: ${newEnemy.currentHealth}`)

        let logMessage = `<p class="log-player">You attacked ${newEnemy.name} for ${damage} damage.`
        if (isCrit) logMessage += ` <span class="log-crit">(Critical Hit!)</span>`
        logMessage += `</p>`
        newCombat.log.push(logMessage)

        if (newEnemy.currentHealth <= 0) {
          newCombat.log.push(`<p class="log-info">${newEnemy.name} defeated!</p>`)
          const nextState = handleCombatEnd("win", newPlayer, newEnemy, newCombat, newResources, newMap)
          return { ...prev, ...nextState }
        } else {
          newCombat.turn = "enemy" // Pass turn to enemy
          newCombat.enemy = newEnemy // Update the enemy object in combat state
          return { ...prev, combat: newCombat, player: newPlayer, map: newMap }
        }
      })
    },
    [handleCombatEnd],
  )

  const handleDefend = useCallback(() => {
    setGameState((prev) => {
      const newPlayer = { ...prev.player, isDefending: true }
      const newCombat = { ...prev.combat, turn: "enemy" }
      newCombat.log.push(`<p class="log-player">You brace for impact, increasing your defense.</p>`)
      return { ...prev, player: newPlayer, combat: newCombat }
    })
  }, [])

  const handleEnemyAttack = useCallback(
    (damage: number, isDodge: boolean) => {
      setGameState((prev) => {
        const newCombat = { ...prev.combat }
        const newPlayer = { ...prev.player }
        const newEnemy = newCombat.enemy ? { ...newCombat.enemy } : null
        const newResources = { ...prev.resources }
        const newMap = { ...prev.map, enemies: { ...prev.map.enemies } }

        if (!newEnemy || !newCombat.active || newCombat.turn !== "enemy") return prev

        console.log(`Enemy attacks: Player health before: ${newPlayer.health}, Damage: ${damage}`)
        let actualDamage = damage
        let logMessage = `<p class="log-enemy">${newEnemy.name} attacked you.`

        if (newPlayer.isDefending) {
          actualDamage = Math.max(0, actualDamage - Math.floor(newPlayer.defense * 0.5)) // 50% defense bonus
          logMessage += ` You defended, reducing damage.`
        }

        if (isDodge) {
          actualDamage = 0
          logMessage += ` <span class="log-dodge">(Dodged!)</span>`
        }

        newPlayer.health = Math.max(0, newPlayer.health - actualDamage) // Ensure health doesn't go negative
        console.log(`Player health after: ${newPlayer.health}`)

        logMessage += ` You took ${actualDamage} damage.</p>`
        newCombat.log.push(logMessage)

        newPlayer.isDefending = false // Reset defend status

        if (newPlayer.health <= 0) {
          newCombat.log.push(`<p class="log-info">You were defeated by ${newEnemy.name}!</p>`)
          const nextState = handleCombatEnd("lose", newPlayer, newEnemy, newCombat, newResources, newMap)
          return { ...prev, ...nextState }
        } else {
          newCombat.turn = "player" // Pass turn back to player
          newCombat.combatRound++
          return { ...prev, combat: newCombat, player: newPlayer }
        }
      })
    },
    [handleCombatEnd],
  )

  const handleFlee = useCallback(
    (success: boolean) => {
      setGameState((prev) => {
        const newCombat = { ...prev.combat }
        const newPlayer = { ...prev.player }
        const newEnemy = newCombat.enemy ? { ...newCombat.enemy } : null
        const newResources = { ...prev.resources }
        const newMap = { ...prev.map, enemies: { ...prev.map.enemies } }

        if (!newEnemy || !newCombat.active) return prev

        if (success) {
          newCombat.log.push(`<p class="log-info">You successfully fled from combat!</p>`)
          const nextState = handleCombatEnd("flee", newPlayer, newEnemy, newCombat, newResources, newMap)
          return { ...prev, ...nextState }
        } else {
          newCombat.log.push(`<p class="log-error">Flee attempt failed! Enemy attacks again.</p>`)
          newCombat.turn = "enemy" // Enemy gets another turn
          return { ...prev, combat: newCombat }
        }
      })
    },
    [handleCombatEnd],
  )

  // Corrected handleNameSubmit implementation
  const handleNameSubmit = useCallback(
    (name: string) => {
      setGameState((prev) => ({
        ...prev,
        player: { ...prev.player, name: name },
        gameInitialized: true, // Mark game as initialized after name selection
        isNameModalOpen: false, // Close name modal
        isHouseModalOpen: true, // Open house selection modal next
      }))
      addNotification(`Welcome, Commander ${name}!`, "success")
    },
    [addNotification],
  )

  const handleHouseSelect = useCallback(
    (houseKey: string) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player, house: houseKey }
        const newResources = { ...prev.resources }
        const houseBonus = STATIC_DATA.HOUSES[houseKey as keyof typeof STATIC_DATA.HOUSES].startingBonus

        // Apply starting bonuses
        if (houseBonus) {
          Object.entries(houseBonus).forEach(([res, val]) => {
            if (res in newResources) {
              ;(newResources as any)[res] += val
            } else if (res in newPlayer) {
              ;(newPlayer as any)[res] += val
            }
          })
        }

        addNotification(
          `You have joined House ${STATIC_DATA.HOUSES[houseKey as keyof typeof STATIC_DATA.HOUSES].name}!`,
          "success",
        )
        handleSendMessage(
          `Player ${newPlayer.name} has joined House ${STATIC_DATA.HOUSES[houseKey as keyof typeof STATIC_DATA.HOUSES].name}!`,
        )

        return {
          ...prev,
          player: newPlayer,
          resources: newResources,
          isHouseModalOpen: false,
        }
      })
    },
    [addNotification, handleSendMessage],
  )

  const handlePrestige = useCallback(() => {
    setGameState((prev) => {
      const newPrestigeLevel = prev.player.prestigeLevel + 1
      const newGlobalGainMultiplier = 1 + newPrestigeLevel * 0.05 // 5% per prestige level
      const newPlayer = {
        ...getInitialPlayerState(prev.player.id, newPrestigeLevel), // Reset player state, apply new prestige level
        name: prev.player.name, // Keep name
        house: prev.player.house, // Keep house
        territories: prev.player.territories, // Keep territories
        globalGainMultiplier: newGlobalGainMultiplier, // Apply new multiplier
      }

      // Reset AI territories on the map for fairness, but keep AI players
      const newMapTerritories = JSON.parse(JSON.stringify(initialMapData.territories))
      const newOnlinePlayers = JSON.parse(JSON.stringify(prev.onlinePlayers))

      // Re-assign player's territories to the new map
      newPlayer.territories.forEach((t) => {
        const key = `${t.x},${t.y}`
        if (newMapTerritories[key]) {
          newMapTerritories[key] = {
            ...newMapTerritories[key],
            ownerId: newPlayer.id,
            ownerName: newPlayer.name,
            ownerColor: HOUSE_COLORS[newPlayer.house as keyof typeof HOUSE_COLORS] || newPlayer.color,
          }
        }
      })

      // Re-assign AI territories to the new map (they also lose their old ones)
      Object.values(newOnlinePlayers).forEach((ai) => {
        ai.territories = [] // Clear AI's owned territories
        for (let i = 0; i < 2; i++) {
          // Give AIs new random territories
          const unownedTerritories = Object.values(newMapTerritories).filter((t) => !t.ownerId)
          if (unownedTerritories.length > 0) {
            const terrToClaim = unownedTerritories[getRandomInt(0, unownedTerritories.length - 1)]
            const key = terrToClaim.position
              ? `${terrToClaim.position.x},${terrToClaim.position.y}`
              : `${terrToClaim.x},${terrToClaim.y}`
            newMapTerritories[key] = {
              ...terrToClaim,
              ownerId: ai.id,
              ownerName: ai.name,
              ownerColor: HOUSE_COLORS[ai.house as keyof typeof HOUSE_COLORS] || ai.color,
            }
            ai.territories.push(newMapTerritories[key])
          }
        }
      })

      addNotification(`You have ascended to Prestige Level ${newPrestigeLevel}!`, "legendary")

      return {
        ...prev,
        player: newPlayer,
        resources: getInitialResourcesState(), // Reset resources
        equipment: { weapon: null, armor: null, accessory: null }, // Reset equipment
        inventory: new Array(CONFIG.MAX_INVENTORY).fill(null), // Reset inventory
        map: {
          ...initialMapData,
          territories: newMapTerritories, // Use the new map with reset/reassigned territories
          seekers: {},
          rocks: initialMapData.rocks,
        },
        worm: generateInitialWorm(),
        onlinePlayers: newOnlinePlayers, // Update online players with new territories
        isPrestigeModalOpen: false,
        combat: initialGameState.combat, // Reset combat state
        abilityCooldowns: {}, // Reset ability cooldowns
        unlockedAbilities: [], // Reset unlocked abilities
        activeAbility: null, // Reset active ability
      }
    })
  }, [addNotification])

  const handleManualGather = useCallback(
    (ventureId: string) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const venture = newPlayer.investments?.[ventureId]

        if (!venture || !venture.unlocked) {
          addNotification("Venture not found or not unlocked!", "error")
          return prev
        }

        const amountGained = venture.manualClickYield
        ;(newResources as any)[venture.productionResource] += amountGained
        addNotification(
          `Manually gathered ${amountGained.toFixed(1)} ${venture.productionResource} from ${venture.name}!`,
          "success",
        )

        return { ...prev, player: newPlayer, resources: newResources }
      })
    },
    [addNotification],
  )

  const handleInvestInVenture = useCallback(
    (ventureId: string) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const ventures = { ...newPlayer.investments }
        const venture = ventures[ventureId]

        if (!venture) {
          addNotification("Venture not found!", "error")
          return prev
        }

        // If venture is not unlocked, unlock it first (initial purchase)
        if (!venture.unlocked && venture.level === 0) {
          // Check if player meets level requirement to unlock
          const canUnlock = (id: string) => {
            if (id === "water_condenser_network" && newPlayer.level < 2) return false
            if (id === "solari_exchange_hub" && newPlayer.level < 3) return false
            if (id === "plasteel_refinery" && newPlayer.level < 5) return false
            if (id === "melange_synthesis_lab" && newPlayer.level < 10) return false
            return true
          }

          if (!canUnlock(ventureId)) {
            addNotification(
              `You need to be Level ${ventureId === "water_condenser_network" ? 2 : ventureId === "solari_exchange_hub" ? 3 : ventureId === "plasteel_refinery" ? 5 : ventureId === "melange_synthesis_lab" ? 10 : "N/A"} to unlock this venture!`,
              "warning",
            )
            return prev
          }

          if (newResources.solari < venture.baseCost) {
            addNotification(`Not enough Solari to start ${venture.name}!`, "warning")
            return prev
          }
          newResources.solari -= venture.baseCost
          venture.unlocked = true
          venture.level = 1
          venture.costToUpgrade = Math.floor(venture.baseCost * venture.costMultiplier)
          venture.productionRate = venture.baseProduction * venture.productionMultiplier // Level 1 production
          venture.manualClickYield = venture.manualClickYield // Base manual yield
          addNotification(`You started the ${venture.name} venture!`, "success")
        } else {
          // Regular upgrade
          if (newResources.solari < venture.costToUpgrade) {
            addNotification(`Not enough Solari to upgrade ${venture.name}!`, "warning")
            return prev
          }
          newResources.solari -= venture.costToUpgrade
          venture.level++
          venture.costToUpgrade = Math.floor(venture.baseCost * Math.pow(venture.costMultiplier, venture.level))
          venture.productionRate = venture.baseProduction * Math.pow(venture.productionMultiplier, venture.level - 1)
          venture.manualClickYield = venture.manualClickYield * (1 + (venture.level - 1) * 0.1) // Scale manual yield
          addNotification(`Upgraded ${venture.name} to Level ${venture.level}!`, "success")
        }

        newPlayer.investments = ventures
        return { ...prev, player: newPlayer, resources: newResources }
      })
    },
    [addNotification],
  )

  const handleHireManager = useCallback(
    (ventureId: string) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const ventures = { ...newPlayer.investments }
        const venture = ventures[ventureId]

        if (!venture || !venture.unlocked) {
          addNotification("Venture not found or not unlocked!", "error")
          return prev
        }

        if (venture.hasManager) {
          addNotification(`${venture.name} already has a manager!`, "warning")
          return prev
        }

        if (newResources.solari < venture.managerCost) {
          addNotification(`Not enough Solari to hire a manager for ${venture.name}!`, "warning")
          return prev
        }

        newResources.solari -= venture.managerCost
        venture.hasManager = true
        newPlayer.investments = ventures
        addNotification(`Hired a manager for ${venture.name}! Auto-production is now active.`, "success")

        return { ...prev, player: newPlayer, resources: newResources }
      })
    },
    [addNotification],
  )

  // --- NEW GAME LOOP ---
  useEffect(() => {
    // Only run if user is logged in and game is initialized
    if (!user || !gameState.gameInitialized) return

    const gameTickInterval = setInterval(() => {
      const currentTickTime = Date.now()
      // Access latest state via ref for intervals
      const currentGameState = gameStateRef.current
      if (
        !currentGameState.gameInitialized ||
        isLoading ||
        currentGameState.isCombatModalOpen ||
        currentGameState.isAbilitySelectionModalOpen // Pause during these modals
      )
        return

      setGameState((prev) => {
        if (prev.isPaused) return prev
        const now = Date.now()
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const newMap = {
          ...prev.map,
          enemies: { ...prev.map.enemies },
          territories: { ...prev.map.territories }, // Ensure territories are mutable
        }
        const newAbilityCooldowns = { ...prev.abilityCooldowns }
        const newNotifications = [...prev.notifications]
        let newWorldEvents = [...prev.worldEvents]
        const newOnlinePlayers = JSON.parse(JSON.stringify(prev.onlinePlayers)) // Deep copy for AI modifications
        let sandwormAttackTime = prev.sandwormAttackTime
        let newWorm = { ...prev.worm }

        if (newPlayer.xpBuffExpires && now >= newPlayer.xpBuffExpires) {
          newPlayer.xpBuffMultiplier = 1
          newPlayer.xpBuffExpires = null
          newNotifications.push({ id: now.toString(), message: "XP Buff expired", type: "info" })
        }
        if (newPlayer.speedBoostExpires && now >= newPlayer.speedBoostExpires) {
          newPlayer.speedBoostExpires = null
          newNotifications.push({ id: now.toString(), message: "Speed boost expired", type: "info" })
        }

        // --- 1. Player Stat Regen & Income (mostly existing logic) ---
        if (now - prev.lastEnergyRegen >= CONFIG.ENERGY_REGEN_INTERVAL) {
          let energyRegenRate = newPlayer.energyProductionRate
          if (newPlayer.activeAbility?.effectType === "energy_regen") {
            energyRegenRate = Math.floor(energyRegenRate * (1 + newPlayer.activeAbility.effectValue / 100))
          }
          newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + energyRegenRate)
        }
        if (newPlayer.activeAbility?.effectType === "health_regen") {
          const healthRegenAmount = Math.floor(newPlayer.maxHealth * (newPlayer.activeAbility.effectValue / 100))
          newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health + healthRegenAmount)
        }
        const heatDecayMultiplier = isInBaseArea(newPlayer, newPlayer.position.x, newPlayer.position.y) ? 2 : 1
        newPlayer.heat = Math.max(0, newPlayer.heat - CONFIG.HEAT_DECAY_PER_TICK * heatDecayMultiplier)

        let territorySpiceIncomeBoost = 1.0
        if (newWorldEvents.some((event) => event.effect === "spice_boost" && event.endTime && event.endTime > now)) {
          const event = newWorldEvents.find((e) => e.effect === "spice_boost")
          if (event && event.effectValue) territorySpiceIncomeBoost = event.effectValue
        }

        newPlayer.territories.forEach((t) => {
          const territoryKey = t.position ? `${t.position.x},${t.position.y}` : null
          const territoryDetail = territoryKey ? newMap.territories[territoryKey] : undefined
          if (territoryDetail && !territoryDetail.isDestroyed) {
            // Check if not destroyed
            if (t.resourceYield?.solari) newResources.solari += t.resourceYield.solari
            if (t.resourceYield?.spice) newResources.spice += t.resourceYield.spice * territorySpiceIncomeBoost
            // ... other resources
          }
        })
        if (newPlayer.investments) {
          Object.values(newPlayer.investments).forEach((inv) => {
            if (inv.level > 0 && inv.hasManager && inv.productionResource) {
              // Only produce if manager is hired
              ;(newResources as any)[inv.productionResource] +=
                inv.productionRate * (inv.productionResource === "spice" ? territorySpiceIncomeBoost : 1)
            }
          })
        }
        // Clear destroyed state for territories if timeout passed
        Object.keys(newMap.territories).forEach((key) => {
          if (
            newMap.territories[key].isDestroyed &&
            newMap.territories[key].destroyedUntil &&
            now >= newMap.territories[key].destroyedUntil!
          ) {
            newMap.territories[key].isDestroyed = false
            newMap.territories[key].destroyedUntil = undefined
            if (newMap.territories[key].ownerId === newPlayer.id) {
              addNotification(`Territory ${newMap.territories[key].name || key} has been repaired!`, "info")
            }
          }
        })

        // --- 2. Cooldowns & Respawns (Enemies, Resources, Items - existing logic) ---

        // Enemy cooldowns and item respawns removed for streamlined gameplay
        Object.entries(newMap.enemies).forEach(([key, enemy]) => {
          if (enemy.cooldownUntil && now >= enemy.cooldownUntil) {
            const originalEnemyData = STATIC_DATA.ENEMIES[enemy.type as keyof typeof STATIC_DATA.ENEMIES]
            newMap.enemies[key] = { ...enemy, currentHealth: originalEnemyData.health, cooldownUntil: null }
          }
        })

        const activeEnemyCount = Object.values(newMap.enemies).filter((e) => !e.cooldownUntil).length
        const maxEnemies = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * CONFIG.MAX_DYNAMIC_ENEMIES_FACTOR)
        if (activeEnemyCount < maxEnemies && Math.random() < CONFIG.NEW_ENEMY_SPAWN_CHANCE_PER_TICK) {
          const enemyKeys = Object.keys(STATIC_DATA.ENEMIES) as Array<keyof typeof STATIC_DATA.ENEMIES>
          for (let i = 0; i < 20; i++) {
            const { x, y } = getRandomMapCoords()
            const spawnKey = `${x},${y}`
            if (
              !newMap.enemies[spawnKey] &&
              !newMap.resources[spawnKey] &&
              !newMap.items[spawnKey] &&
              !newMap.territories[spawnKey].isDestroyed &&
              !isInBaseArea(newPlayer, x, y)
            ) {
              const typeKey = enemyKeys[getRandomInt(0, enemyKeys.length - 1)]
              const data = STATIC_DATA.ENEMIES[typeKey]
              newMap.enemies[spawnKey] = {
                id: `enemy_${spawnKey}`,
                type: typeKey,
                name: data.name,
                icon: data.icon,
                health: data.health,
                currentHealth: data.health,
                attack: data.attack,
                defense: data.defense,
                xp: data.xp,
                loot: data.loot,
                level: data.level,
                description: data.description,
                boss: data.boss || false,
                special: data.special || false,
                legendary: data.legendary || false,
                lastMoveAttempt: 0,
              }
              addNotification(`${data.name} has appeared at (${x},${y})`, "info")
              break
            }
          }
        }

        // --- 3. NEW: Dynamic World Event Management ---
        if (now - (prev.lastWorldEventProcessingTime || 0) >= 5000) {
          // Process every 5 seconds
          // Expire old events
          const activeEventsBeforeUpdate = [...newWorldEvents]
          newWorldEvents = newWorldEvents.filter((event) => {
            if (event.endTime && now >= event.endTime) {
              addNotification(`Event ended: ${event.name}`, "info")
              // If it was a chained event that triggered another, clean up original
              if (event.triggersNext) {
                const nextEvent = STATIC_DATA.WORLD_EVENTS.find((e) => e.name === event.triggersNext)
                if (nextEvent) {
                  const newChainedEvent: WorldEvent = {
                    ...nextEvent,
                    id: `event_${now}_${nextEvent.name.replace(/\s/g, "")}`,
                    position: getRandomMapCoords(),
                    endTime: now + (nextEvent.duration || 300000),
                    isChainedEvent: true,
                  }
                  if (newChainedEvent.effect === "territory_destruction") {
                    // Sandworm specific logic
                    const allTerritories = Object.values(newMap.territories)
                    const ownedTerritories = allTerritories.filter((t) => t.ownerId)
                    if (ownedTerritories.length > 0) {
                      const targetTerr = ownedTerritories[getRandomInt(0, ownedTerritories.length - 1)]
                      const targetKey = targetTerr.position
                        ? `${targetTerr.position.x},${targetTerr.position.y}`
                        : `${targetTerr.x},${targetTerr.y}`
                      const owner =
                        targetTerr.ownerId === newPlayer.id ? newPlayer : newOnlinePlayers[targetTerr.ownerId!]
                      if (!isInBaseArea(owner, targetTerr.position.x, targetTerr.position.y)) {
                        newMap.territories[targetKey].isDestroyed = true
                        newMap.territories[targetKey].destroyedUntil = now + 180000 // Destroyed for 3 mins
                        newChainedEvent.description = `${newChainedEvent.name} targets Sector ${targetTerr.name || targetKey}! Buildings and units are lost!`
                        addNotification(`SHAI-HULUD ATTACKS ${targetTerr.name || targetKey}!`, "legendary")

                        // Remove units/enemies from this territory (simplified)
                        Object.keys(newMap.enemies).forEach((ekey) => {
                          if (
                            newMap.enemies[ekey].position?.x === targetTerr.position?.x &&
                            newMap.enemies[ekey].position?.y === targetTerr.position?.y
                          ) {
                            delete newMap.enemies[ekey]
                          }
                        })
                      }
                    }
                  }
                  newWorldEvents.push(newChainedEvent)
                  addNotification(`New Event: ${newChainedEvent.name}! - ${newChainedEvent.description}`, "warning")
                }
              }
              return false // Remove expired event
            }
            return true
          })

          // Trigger new events
          const nonHazardEventsCount = newWorldEvents.filter((e) => e.type !== "hazard" && !e.isChainedEvent).length
          if (
            nonHazardEventsCount < STATIC_DATA.WORLD_EVENT_CONFIG.maxActiveEvents &&
            Math.random() < STATIC_DATA.WORLD_EVENT_CONFIG.newEventChancePerTick * 5
          ) {
            // *5 because we check every 5s
            const availableEvents = STATIC_DATA.WORLD_EVENTS.filter(
              (eventData) =>
                !newWorldEvents.some((activeEvent) => activeEvent.name === eventData.name) && !eventData.isChainedEvent,
            )
            if (availableEvents.length > 0) {
              const newEventData = availableEvents[getRandomInt(0, availableEvents.length - 1)]
              const newEvent: WorldEvent = {
                ...newEventData,
                id: `event_${now}_${newEventData.name.replace(/\s/g, "")}`,
                position: getRandomMapCoords(),
                endTime: now + (newEventData.duration || 300000), // Default 5 mins
              }
              newWorldEvents.push(newEvent)
              addNotification(`New Event: ${newEvent.name}! - ${newEvent.description}`, "warning")

              if (newEvent.effect === "territory_loss" && newEvent.effectValue) {
                const ownedKeys = Object.keys(newMap.territories).filter((tKey) => newMap.territories[tKey].ownerId)
                const removeCount = Math.max(1, Math.floor(ownedKeys.length * newEvent.effectValue))
                for (let i = 0; i < removeCount && ownedKeys.length > 0; i++) {
                  const idx = getRandomInt(0, ownedKeys.length - 1)
                  const terrKey = ownedKeys.splice(idx, 1)[0]
                  const terr = newMap.territories[terrKey]
                  const ownerId = terr.ownerId
                  if (ownerId) {
                    if (
                      isInBaseArea(
                        ownerId === newPlayer.id ? newPlayer : newOnlinePlayers[ownerId],
                        terr.position.x,
                        terr.position.y,
                      )
                    ) {
                      continue
                    }
                    if (ownerId === newPlayer.id) {
                      newPlayer.territories = newPlayer.territories.filter((t) => t.id !== terr.id)
                      addNotification(`Sandstorm reclaimed ${terr.name || terrKey}!`, "warning")
                    } else if (newOnlinePlayers[ownerId]) {
                      newOnlinePlayers[ownerId].territories = newOnlinePlayers[ownerId].territories.filter(
                        (t: any) => t.id !== terr.id,
                      )
                    }
                    newMap.territories[terrKey] = {
                      ...terr,
                      ownerId: null,
                      ownerName: undefined,
                      ownerColor: undefined,
                    }
                  }
                }
              }
              if (newEvent.rewards) {
                // Apply immediate rewards
                if (newEvent.rewards.spice) newResources.spice += newEvent.rewards.spice
                if (newEvent.rewards.solari) newResources.solari += newEvent.rewards.solari
                if (newEvent.rewards.xp) {
                  let eventXP = newEvent.rewards.xp
                  eventXP = Math.floor(eventXP * newPlayer.globalGainMultiplier)
                  if (newPlayer.xpBuffExpires && newPlayer.xpBuffExpires > now) {
                    eventXP = Math.floor(eventXP * (newPlayer.xpBuffMultiplier || 1))
                  }
                  if (newPlayer.house === "atreides") {
                    eventXP = Math.floor(eventXP * 1.25)
                  }
                  newPlayer.experience += eventXP
                }
                addNotification("You received event rewards!", "success")
              }
            }
          }
          prev.lastWorldEventProcessingTime = now // Update time
        }

        // --- 4. NEW: AI Player Processing (Expansion, Simple Resource Gain) ---
        if (now - (prev.lastAIProcessingTime || 0) >= AI_CONFIG.PROCESSING_INTERVAL) {
          Object.keys(newOnlinePlayers).forEach((aiId) => {
            const ai = newOnlinePlayers[aiId]
            if (!ai) return

            // Simple passive Solari income for AIs based on their territories
            ai.territories.forEach((terr) => {
              const terrKey = terr.position ? `${terr.position.x},${terr.position.y}` : `${terr.x},${terr.y}`
              const territoryDetail = newMap.territories[terrKey]
              if (territoryDetail && !territoryDetail.isDestroyed) {
                ai.resources.solari +=
                  (territoryDetail.resourceYield?.solari || 0) * (AI_CONFIG.PROCESSING_INTERVAL / 1000)
                ai.resources.spice +=
                  (territoryDetail.resourceYield?.spice || 0) * (AI_CONFIG.PROCESSING_INTERVAL / 1000)
              }
            })
            ai.resources.solari += 50 // Base income per tick

            // AI Expansion Logic
            if (
              ai.territories.length < AI_CONFIG.MAX_TERRITORIES_PER_AI &&
              Math.random() < AI_CONFIG.EXPANSION_CHANCE
            ) {
              const potentialTargets: TerritoryDetails[] = []
              const directions = [
                [0, 1],
                [0, -1],
                [1, 0],
                [-1, 0],
              ] // N, S, E, W

              // Find adjacent neutral territories
              const ownedTerritoryCoords = new Set(
                ai.territories.filter((t) => t.position).map((t) => `${t.position!.x},${t.position!.y}`),
              )
              if (ai.territories.length === 0) {
                // If AI has no territories, pick any neutral one near its start
                const nearbyNeutrals = Object.values(newMap.territories).filter(
                  (t) =>
                    !t.ownerId &&
                    Math.abs(t.position.x - (ai.position?.x ?? ai.x)) < 5 &&
                    Math.abs(t.position.y - (ai.position?.y ?? ai.y)) < 5,
                )
                if (nearbyNeutrals.length > 0)
                  potentialTargets.push(nearbyNeutrals[getRandomInt(0, nearbyNeutrals.length - 1)])
              } else {
                ai.territories.forEach((ownedTerr) => {
                  directions.forEach((dir) => {
                    const checkX = (ownedTerr.position?.x ?? ownedTerr.x) + dir[0]
                    const checkY = (ownedTerr.position?.y ?? ownedTerr.y) + dir[1]
                    if (checkX >= 0 && checkX < CONFIG.MAP_SIZE && checkY >= 0 && checkY < CONFIG.MAP_SIZE) {
                      const targetCellKey = `${checkX},${checkY}`
                      const targetTerr = newMap.territories[targetCellKey]
                      if (targetTerr && !targetTerr.ownerId && !targetTerr.isDestroyed) {
                        potentialTargets.push(targetTerr)
                      }
                    }
                  })
                })
              }

              if (potentialTargets.length > 0) {
                const targetTerritory = potentialTargets[getRandomInt(0, potentialTargets.length - 1)]
                const cost = targetTerritory.purchaseCost * AI_CONFIG.TERRITORY_CLAIM_COST_MULTIPLIER
                if (ai.resources.solari >= cost) {
                  ai.resources.solari -= cost
                  const key = targetTerritory.position
                    ? `${targetTerritory.position.x},${targetTerritory.position.y}`
                    : `${targetTerritory.x},${targetTerritory.y}`
                  newMap.territories[key] = {
                    ...targetTerritory,
                    ownerId: ai.id,
                    ownerName: ai.name,
                    ownerColor: HOUSE_COLORS[ai.house as keyof typeof HOUSE_COLORS] || ai.color,
                    captureLevel: 0,
                  }
                  ai.territories.push(newMap.territories[key]) // Add to AI's list
                  addNotification(`${ai.name} (${ai.house}) has claimed Sector ${targetTerritory.name || key}!`, "info")
                }
              }
            }
          })
          prev.lastAIProcessingTime = now // Update time
        }

        // --- 5. Seeker Claim Processing ---
        Object.entries(newMap.seekers).forEach(([sKey, seeker]) => {
          if (now >= seeker.claimTime) {
            const terr = newMap.territories[sKey]
            if (terr) {
              const updatedTerr = {
                ...terr,
                ownerId: seeker.ownerId,
                ownerName: seeker.ownerName,
                ownerColor: seeker.ownerColor,
                captureLevel: 0,
              }
              newMap.territories[sKey] = updatedTerr
              if (seeker.ownerId === newPlayer.id) {
                const alreadyOwned = newPlayer.territories.find(
                  (t) => t.position?.x === updatedTerr.position.x && t.position?.y === updatedTerr.position.y,
                )
                if (!alreadyOwned) newPlayer.territories.push(updatedTerr)
                addNotification(`Your Seeker claimed ${terr.name || sKey}!`, "success")
              } else if (newOnlinePlayers[seeker.ownerId]) {
                const ai = newOnlinePlayers[seeker.ownerId]
                if (!ai.territories.find((t) => t.id === updatedTerr.id)) {
                  ai.territories.push(updatedTerr)
                }
              }
            }
            delete newMap.seekers[sKey]
          }
        })

        // --- 5. NEW: Enemy Movement ---
        if (now - (prev.player.lastActive || 0) > ENEMY_MOVEMENT_CONFIG.PROCESSING_INTERVAL) {
          // Link to player activity or fixed interval
          Object.keys(newMap.enemies).forEach((key) => {
            const enemy = newMap.enemies[key]
            if (enemy && !enemy.boss && !enemy.isMoving) {
              // Non-boss, active enemies
              if (Math.random() < ENEMY_MOVEMENT_CONFIG.MOVEMENT_CHANCE) {
                const { x: ex, y: ey } = enemy.position
                const possibleMoves: { x: number; y: number }[] = []
                const directions = [
                  [0, 1],
                  [0, -1],
                  [1, 0],
                  [-1, 0],
                  [1, 1],
                  [1, -1],
                  [-1, 1],
                  [-1, -1],
                ] // 8 directions

                directions.forEach((dir) => {
                  const nextX = ex + dir[0]
                  const nextY = ey + dir[1]
                  if (nextX >= 0 && nextX < CONFIG.MAP_SIZE && nextY >= 0 && nextY < CONFIG.MAP_SIZE) {
                    const targetCellKey = `${nextX},${nextY}`
                    // Check if cell is empty (no other enemy, no resource, no item, not player position)
                    if (
                      !newMap.enemies[targetCellKey] &&
                      !newMap.resources[targetCellKey] &&
                      !newMap.items[targetCellKey] &&
                      !(newPlayer.position.x === nextX && newPlayer.position.y === nextY) &&
                      !Object.values(newOnlinePlayers).some(
                        (p) => p.position?.x === nextX && p.position?.y === nextY,
                      ) &&
                      !newMap.territories[targetCellKey].isDestroyed &&
                      !isInBaseArea(newPlayer, nextX, nextY)
                    ) {
                      possibleMoves.push({ x: nextX, y: nextY })
                    }
                  }
                })

                if (possibleMoves.length > 0) {
                  const newPos = possibleMoves[getRandomInt(0, possibleMoves.length - 1)]
                  const newKey = `${newPos.x},${newPos.y}`

                  newMap.enemies[newKey] = { ...enemy, position: newPos, id: `enemy_${newKey}` }
                  delete newMap.enemies[key] // Remove from old position

                  const terr = newMap.territories[newKey]
                  if (terr && terr.ownerId && !isInBaseArea(newPlayer, newPos.x, newPos.y)) {
                    const ownerId = terr.ownerId
                    if (ownerId === newPlayer.id) {
                      newPlayer.territories = newPlayer.territories.filter((t) => t.id !== terr.id)
                      addNotification(`${enemy.name} captured your territory ${terr.name || newKey}!`, "warning")
                    } else if (newOnlinePlayers[ownerId]) {
                      newOnlinePlayers[ownerId].territories = newOnlinePlayers[ownerId].territories.filter(
                        (t: any) => t.id !== terr.id,
                      )
                    }
                    newMap.territories[newKey] = {
                      ...terr,
                      ownerId: null,
                      ownerName: undefined,
                      ownerColor: undefined,
                      captureLevel: 0,
                    }
                  }
                  // addNotification(`${enemy.name} moved to ${newPos.x},${newPos.y}.`, 'info'); // Can be spammy
                }
              }
            }
          })
          // newPlayer.lastActive = now; // If linked to player activity, but for general tick, this is not needed.
        }

        // Idle sandworm warning and attack
        const idleTime = now - newPlayer.lastActive
        if (
          !sandwormAttackTime &&
          idleTime >= CONFIG.IDLE_TIME_BEFORE_WORM &&
          !isInBaseArea(newPlayer, newPlayer.position.x, newPlayer.position.y)
        ) {
          sandwormAttackTime = now + CONFIG.SANDWORM_COUNTDOWN
          newNotifications.push({
            id: now.toString(),
            message: "Wormsign! Move or be eaten soon!",
            type: "warning",
          })
        }
        if (sandwormAttackTime && idleTime < CONFIG.IDLE_TIME_BEFORE_WORM) {
          sandwormAttackTime = null
        }
        if (
          sandwormAttackTime &&
          now >= sandwormAttackTime &&
          !isInBaseArea(newPlayer, newPlayer.position.x, newPlayer.position.y)
        ) {
          const ownedKeys = [
            ...newPlayer.territories.filter((t) => t.position).map((t) => `${t.position!.x},${t.position!.y}`),
          ]
          const removeCount = Math.max(1, Math.floor(ownedKeys.length * 0.2))
          for (let i = 0; i < removeCount && ownedKeys.length > 0; i++) {
            const idx = getRandomInt(0, ownedKeys.length - 1)
            const terrKey = ownedKeys.splice(idx, 1)[0]
            const terr = newMap.territories[terrKey]
            if (terr && !isInBaseArea(newPlayer, terr.position.x, terr.position.y)) {
              newMap.territories[terrKey] = { ...terr, ownerId: null, ownerName: undefined, ownerColor: undefined }
              newPlayer.territories = newPlayer.territories.filter((t) => t.id !== terr.id)
            }
          }
          newPlayer.position = getRandomMapCoords()
          newPlayer.health = Math.floor(newPlayer.maxHealth / 2)
          newNotifications.push({ id: (now + 1).toString(), message: "A sandworm devours you!", type: "legendary" })
          newNotifications.push({ id: (now + 2).toString(), message: "You respawned in a random location.", type: "info" })
        sandwormAttackTime = null
      }

        // --- Big Worm NPC ---
        const rockCells = newMap.rocks

        // Spawn worm near the player if they are far from rocks
        if (!newWorm.targetPlayerId && newWorm.spawnCountdown === null) {
          if (!isNearRock(newPlayer.position.x, newPlayer.position.y, rockCells) && Math.random() < 0.05) {
            const spawnX = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, newPlayer.position.x + getRandomInt(-5, 5)))
            const spawnY = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, newPlayer.position.y + getRandomInt(-5, 5)))
            newWorm.segments = []
            for (let i = 0; i < 5; i++) {
              newWorm.segments.push({ x: Math.max(0, spawnX - i), y: spawnY })
            }
            newWorm.targetPlayerId = newPlayer.id
            newWorm.spawnCountdown = 3
            newNotifications.push({
              id: (now + 0.5).toString(),
              message: "Worm sign! It will attack soon!",
              type: "warning",
            })
          }
        }

        // Countdown before the worm begins chasing
        if (newWorm.spawnCountdown !== null) {
          newWorm.spawnCountdown -= 1
          if (newWorm.spawnCountdown <= 0) {
            newWorm.spawnCountdown = null
          }
        }

        if (newWorm.targetPlayerId && newWorm.spawnCountdown === null) {
        if (!newWorm.targetPlayerId && Math.random() < 0.01) {
          const candidates = [newPlayer, ...Object.values(newOnlinePlayers)].filter(
            (p) => p.id && !isNearRock(p.position.x, p.position.y, rockCells),
          )
          if (candidates.length > 0) {
            const target = candidates[getRandomInt(0, candidates.length - 1)]
            newWorm.targetPlayerId = target.id
            if (target.id === newPlayer.id) {
              newNotifications.push({
                id: (now + 0.5).toString(),
                message: "A giant worm is hunting you!",
                type: "warning",
              })
            }
          }
        }

        if (newWorm.targetPlayerId) {
          const target =
            newWorm.targetPlayerId === newPlayer.id
              ? newPlayer
              : newOnlinePlayers[newWorm.targetPlayerId]
          if (target) {
            if (isNearRock(target.position.x, target.position.y, rockCells)) {
              if (newWorm.targetPlayerId === newPlayer.id) {
                newNotifications.push({
                  id: (now + 0.6).toString(),
                  message: "You reached the rocks and the worm lost you.",
                  type: "info",
                })
              }
              newWorm.targetPlayerId = null
            } else {
              const head = { ...newWorm.segments[0] }
              const dx = Math.sign(target.position.x - head.x)
              const dy = Math.sign(target.position.y - head.y)
              const newHead = {
                x: Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, head.x + dx)),
                y: Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, head.y + dy)),
              }
              newWorm.segments.unshift(newHead)
              if (newWorm.segments.length > 6) newWorm.segments.pop()
              if (newHead.x === target.position.x && newHead.y === target.position.y) {
                if (newWorm.targetPlayerId === newPlayer.id) {
                  newPlayer.health = Math.floor(newPlayer.health / 2)
                  newPlayer.position = getRandomMapCoords()
                  newNotifications.push({
                    id: (now + 0.7).toString(),
                    message: "The worm caught you!",
                    type: "error",
                  })
                } else if (newOnlinePlayers[newWorm.targetPlayerId]) {
                  newOnlinePlayers[newWorm.targetPlayerId].position = getRandomMapCoords()
                }
                newWorm.targetPlayerId = null
              }
            }
          } else {
            newWorm.targetPlayerId = null
          }
        } else {
          const head = { ...newWorm.segments[0] }
          const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ]
          const dir = dirs[getRandomInt(0, dirs.length - 1)]
          const newHead = {
            x: Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, head.x + dir.x)),
            y: Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, head.y + dir.y)),
          }
          newWorm.segments.unshift(newHead)
          if (newWorm.segments.length > 6) newWorm.segments.pop()
        }

        // --- Update player rank, ability cooldowns (existing logic) ---
        for (const abilityId in newAbilityCooldowns) {
          if (newAbilityCooldowns[abilityId] <= now) {
            delete newAbilityCooldowns[abilityId]
          }
        }

        // Calculate score for current player
        const playerEquipmentScore = calculateEquipmentScore(prev.equipment)
        newPlayer.power = calculatePlayerScore(
          newPlayer.territories.length,
          newResources.solari,
          playerEquipmentScore,
          newPlayer.totalEnemiesDefeated,
        )

        // Update player rank based on score (lower rank number is better)
        newPlayer.rank = Math.max(1, 100 - Math.floor(newPlayer.power / 100))
        newPlayer.rankName =
          newPlayer.rank < 10 ? "Spice Baron" : newPlayer.rank < 50 ? "Guild Associate" : "Sand Nomad"

        // Prepare leaderboard data for all players (player + AIs)
        const allPlayersForLeaderboard: RankedPlayer[] = []
        // Add current player
        allPlayersForLeaderboard.push({
          id: newPlayer.id!,
          name: newPlayer.name,
          rank: newPlayer.rank,
          rankName: newPlayer.rankName,
          house: newPlayer.house,
          prestigeLevel: newPlayer.prestigeLevel,
          color: newPlayer.color,
          power: newPlayer.power, // Include power for sorting
        })

        // Add AI players
        Object.values(newOnlinePlayers).forEach((ai) => {
          // Calculate AI score
          const aiEquipmentScore = calculateEquipmentScore(
            ai.equipment || { weapon: null, armor: null, accessory: null },
          )
          ai.power = calculatePlayerScore(
            ai.territories.length,
            ai.resources.solari,
            aiEquipmentScore,
            ai.totalEnemiesDefeated,
          )

          ai.rank = Math.max(1, 100 - Math.floor(ai.power / 100))
          ai.rankName = ai.rank < 10 ? "Spice Baron" : ai.rank < 50 ? "Guild Associate" : "Sand Nomad"

          allPlayersForLeaderboard.push({
            id: ai.id!,
            name: ai.name,
            rank: ai.rank,
            rankName: ai.rankName,
            house: ai.house,
            prestigeLevel: ai.prestigeLevel,
            color: ai.color,
            power: ai.power,
          })
        })

        // Sort leaderboard by power (descending) and take top 5
        const updatedLeaderboard = allPlayersForLeaderboard
          .sort((a, b) => b.power - a.power) // Sort by power, highest first
          .slice(0, 5)
          .map((p, index) => ({ ...p, rank: index + 1 })) // Re-rank after sorting

        return {
          ...prev,
          player: newPlayer,
          resources: newResources,
          map: newMap,
          worldEvents: newWorldEvents,
          onlinePlayers: newOnlinePlayers,
          lastEnergyRegen: now - prev.lastEnergyRegen >= CONFIG.ENERGY_REGEN_INTERVAL ? now : prev.lastEnergyRegen,
          lastAIProcessingTime:
            now - (prev.lastAIProcessingTime || 0) >= AI_CONFIG.PROCESSING_INTERVAL ? now : prev.lastAIProcessingTime,
          lastWorldEventProcessingTime:
            now - (prev.lastWorldEventProcessingTime || 0) >= 5000 ? now : prev.lastWorldEventProcessingTime,
          leaderboard: updatedLeaderboard, // Use the newly calculated leaderboard
          abilityCooldowns: newAbilityCooldowns,
          notifications: newNotifications, // Persist notifications from this tick
          sandwormAttackTime,
          worm: newWorm,
        }
      })
    }, 1000) // Main game tick interval (1 second)

    const saveGameInterval = setInterval(async () => {
      const currentGameState = gameStateRef.current
      if (currentGameState.player.id && currentGameState.gameInitialized) {
        try {
          const { map, ...stateToSaveWithoutFullMap } = currentGameState
          const stateToSave = {
            ...stateToSaveWithoutFullMap,
          }

          await setDoc(doc(db, "players", currentGameState.player.id), stateToSave)
        } catch (error) {
          console.error("Error saving game state to Firebase:", error)
          if (error instanceof Error) {
            addNotification(`Failed to save game: ${error.message}.`, "error")
          } else {
            addNotification("An unknown error occurred during game saving.", "error")
          }
        }
      }
    }, CONFIG.SAVE_INTERVAL)

    return () => {
      clearInterval(gameTickInterval)
      clearInterval(saveGameInterval)
    }
  }, [isLoading, user, gameState.gameInitialized, addNotification]) // Re-added isLoading, user, gameState.gameInitialized to dependencies of the main useEffect

  // --- Action handlers (attemptPlayerAction, handleMapCellClick, handlePurchaseTerritory, etc.) ---
  // These need to be aware of the new game elements like AI territories or event effects.
  // For instance, attemptPlayerAction should check for AI players on cells.
  // handlePurchaseTerritory is mostly fine.

  const attemptPlayerAction = useCallback(
    (targetX: number, targetY: number) => {
      setGameState((prev) => {
        // Ensure we are not in a blocking modal
        if (prev.isPaused) {
          addNotification("Game is paused!", "warning")
          return prev
        }
        if (prev.isCombatModalOpen || prev.isAbilitySelectionModalOpen) {
          addNotification("Cannot perform action during active modal!", "warning")
          return prev
        }

        const { player, resources, map, onlinePlayers } = prev // Include onlinePlayers
        let sandwormAttackTime = prev.sandwormAttackTime
        const dx = targetX - player.position.x
        const dy = targetY - player.position.y
        const key = `${targetX},${targetY}`
        const enemyOnCell = map.enemies[key]
        const territoryOnCell = map.territories[key] // Get territory info

        // Check for AI player on the target cell
        const aiPlayerOnCell = Object.values(onlinePlayers).find(
          (ai) => ai.position?.x === targetX && ai.position?.y === targetY,
        )

        const isMoving = dx !== 0 || dy !== 0
        const maxStep =
          player.speedBoostExpires && player.speedBoostExpires > Date.now() ? 2 : 1

        if (isMoving && (Math.abs(dx) > maxStep || Math.abs(dy) > maxStep)) {
          addNotification(`You can only move up to ${maxStep} tiles!`, "warning")
          return prev
        }
        if (aiPlayerOnCell && (dx !== 0 || dy !== 0)) {
          if (player.house && aiPlayerOnCell.house === player.house) {
            addNotification("You cannot attack a member of your own house!", "warning")
            return prev
          }
          const enemyPlayer: Enemy = {
            id: `player_${aiPlayerOnCell.id}`,
            type: "player",
            name: aiPlayerOnCell.name,
            icon: "👤",
            health: aiPlayerOnCell.maxHealth,
            currentHealth: aiPlayerOnCell.maxHealth,
            attack: aiPlayerOnCell.attack,
            defense: aiPlayerOnCell.defense,
            xp: aiPlayerOnCell.level * 20,
            loot: {},
            level: aiPlayerOnCell.level,
            position: { x: targetX, y: targetY },
            description: "Rival Player",
          }
          addNotification(`You engage ${aiPlayerOnCell.name} in combat!`, "info")
          return {
            ...prev,
            player: { ...player, isDefending: false },
            isCombatModalOpen: true,
            combat: {
              active: true,
              enemy: enemyPlayer,
              turn: "player",
              log: [`<p class="log-info">You engage ${aiPlayerOnCell.name} in combat!</p>`],
              playerHealthAtStart: player.health,
              enemyHealthAtStart: enemyPlayer.health,
              combatRound: 1,
            },
          }
        }

        // Check if territory is destroyed by sandworm (player cannot move or interact)
        if (territoryOnCell?.isDestroyed) {
          addNotification(`Sector ${territoryOnCell.name || key} is ravaged by a Sandworm! Cannot enter.`, "warning")
          return prev
        }

        let waterCost = 1 // Base movement cost
        // Sandstorm effect
        const sandstormEvent = prev.worldEvents.find(
          (e) => e.effect === "water_drain" && e.endTime && e.endTime > Date.now(),
        )
        if (sandstormEvent && sandstormEvent.effectValue) {
          waterCost *= sandstormEvent.effectValue
        }
        if (player.activeAbility?.id === "sandwalk" && player.activeAbility.effectType === "energy_regen") {
          // Sandwalk reduces water cost
          waterCost = Math.max(0.1, waterCost - waterCost * (player.activeAbility.effectValue / 100)) // Ensure it costs at least a bit
        }
        if (player.house === "fremen") {
          waterCost *= 0.4
        }
        waterCost *= 1 + player.heat * CONFIG.HEAT_WATER_MULTIPLIER
        const distance = Math.max(Math.abs(dx), Math.abs(dy))
        waterCost = Math.round(waterCost * distance * 10) / 10 // Round to one decimal

        if (isMoving && resources.water < waterCost) {
          addNotification(`Not enough water to move (cost: ${waterCost})!`, "warning")
          return prev
        }

        const newPlayer = { ...player }
        const newResources = { ...resources }
        const newMap = { ...map, enemies: { ...map.enemies } }
        const updatedInventory = [...prev.inventory]

        if (isMoving) {
          newPlayer.position = { x: targetX, y: targetY }
          newResources.water -= waterCost
          newPlayer.heat = Math.min(CONFIG.MAX_HEAT, newPlayer.heat + CONFIG.HEAT_INCREASE_PER_MOVE * distance)
          newPlayer.lastActive = Date.now()
          sandwormAttackTime = null
        }

        // Interaction logic (enemy, resource, item) remains largely the same
        if (enemyOnCell) {
          // ... (combat initiation logic from original, ensure it uses scaledEnemy correctly)
          const originalEnemyData = STATIC_DATA.ENEMIES[enemyOnCell.type as keyof typeof STATIC_DATA.ENEMIES]
          let targetEnemyLevel = player.level
          if (originalEnemyData.boss) targetEnemyLevel = Math.max(1, player.level + getRandomInt(1, 3))
          else if (originalEnemyData.special) targetEnemyLevel = Math.max(1, player.level + getRandomInt(1, 2))
          else targetEnemyLevel = Math.max(1, player.level + getRandomInt(-1, 1))

          const levelDifference = targetEnemyLevel - originalEnemyData.level
          // Ensure scalingMultiplier is always positive and adjust by player gear
          const gearPower =
            (player.equipment?.weapon?.attack || 0) +
            (player.equipment?.armor?.defense || 0) +
            (player.equipment?.accessory?.attack || 0) +
            (player.equipment?.accessory?.defense || 0)
          const gearMultiplier = 1 + gearPower * CONFIG.GEAR_SCALING_FACTOR
          const scalingFactor = originalEnemyData.special
            ? CONFIG.SPECIAL_ENEMY_SCALING_FACTOR
            : CONFIG.NORMAL_ENEMY_SCALING_FACTOR
          const baseScaling = Math.max(0.1, 1 + levelDifference * scalingFactor)
          const specialBonus = originalEnemyData.special ? 1 + CONFIG.SPECIAL_ENEMY_SCALING_BONUS : 1
          const scalingMultiplier = baseScaling * gearMultiplier * specialBonus

          const scaledEnemy: Enemy = {
            ...enemyOnCell,
            level: targetEnemyLevel,
            health: Math.floor(originalEnemyData.health * scalingMultiplier),
            currentHealth: Math.floor(originalEnemyData.health * scalingMultiplier),
            attack: Math.floor(originalEnemyData.attack * scalingMultiplier),
            defense: Math.floor(originalEnemyData.defense * scalingMultiplier),
            xp: Math.floor(originalEnemyData.xp * scalingMultiplier),
            loot: Object.fromEntries(
              Object.entries(originalEnemyData.loot).map(([resType, amount]) => [
                resType,
                Math.floor(amount * scalingMultiplier),
              ]),
            ),
            specialType: enemyOnCell.specialType || null, // Fix: Ensure specialType is null if undefined
          }
          addNotification(`Engaging ${scaledEnemy.name} (Lv.${scaledEnemy.level})!`, "info")
          return {
            ...prev,
            player: { ...newPlayer, isDefending: false },
            resources: newResources,
            sandwormAttackTime,
            isCombatModalOpen: true,
            combat: {
              active: true,
              enemy: scaledEnemy,
              turn: "player",
              log: [`<p class="log-info">You encountered a ${scaledEnemy.name} (Lv.${scaledEnemy.level})!</p>`],
              playerHealthAtStart: newPlayer.health,
              enemyHealthAtStart: scaledEnemy.health,
              combatRound: 1,
            },
          }
        }

        // Territory capture attempt when entering another house's sector
        if (territoryOnCell && territoryOnCell.ownerId && territoryOnCell.ownerId !== player.id) {
          const owner = onlinePlayers[territoryOnCell.ownerId]
          if (owner) {
            if (player.house && owner.house === player.house) {
              addNotification("You cannot attack a member of your own house!", "warning")
              return {
                ...prev,
                player: newPlayer,
                resources: newResources,
                map: newMap,
                inventory: updatedInventory,
                sandwormAttackTime,
              }
            }
            const enemyOwner: Enemy = {
              id: `owner_${owner.id}`,
              type: "player",
              name: owner.name,
              icon: "👤",
              health: owner.maxHealth,
              currentHealth: owner.maxHealth,
              attack: owner.attack,
              defense: owner.defense,
              xp: owner.level * 20,
              loot: {},
              level: owner.level,
              position: { x: targetX, y: targetY },
              description: "Territory Owner",
            }
            addNotification(`You challenge ${owner.name} for control of this territory!`, "info")
            return {
              ...prev,
              player: { ...newPlayer, isDefending: false },
              resources: newResources,
              sandwormAttackTime,
              isCombatModalOpen: true,
              capturingTerritoryId: key,
              combat: {
                active: true,
                enemy: enemyOwner,
                turn: "player",
                log: [`<p class="log-info">You challenged ${owner.name} for control of this territory!</p>`],
                playerHealthAtStart: newPlayer.health,
                enemyHealthAtStart: enemyOwner.health,
                combatRound: 1,
              },
            }
          }
        }

        const resourceOnCell = map.resources[key]
        if (resourceOnCell && resourceOnCell.type === 'water_cache') {
          newResources.water += resourceOnCell.amount
          newPlayer.heat = Math.max(0, newPlayer.heat - CONFIG.MAX_HEAT * 0.5)
          newPlayer.speedBoostExpires = Date.now() + 5000
          delete newMap.resources[key]
          addNotification(`Collected water cache! Speed boosted for 5s.`, 'success')
        }

        let resultState: GameState = {
          ...prev,
          player: newPlayer,
          resources: newResources,
          map: newMap,
          inventory: updatedInventory,
          sandwormAttackTime,
        }
        if (isMoving) {
          resultState = applyQuestProgress(resultState, "move")
        }
        return resultState
      })
    },
    [addNotification, handleCombatEnd, updateQuestProgress], // Added missing dependencies
  )

  // WASD Controls: Ensure it checks new modal flags if any are added for pausing. Fine for now.
  useEffect(() => {
    // Only attach listener if user is logged in and game is initialized
    if (!user || !gameState.gameInitialized) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !gameStateRef.current.gameInitialized ||
        isLoading ||
        gameStateRef.current.isCombatModalOpen ||
        gameStateRef.current.isNameModalOpen ||
        gameStateRef.current.isHouseModalOpen ||
        gameStateRef.current.isPrestigeModalOpen ||
        gameStateRef.current.isAbilitySelectionModalOpen ||
        gameStateRef.current.isPaused
      )
        return
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return
      }

      const step =
        gameStateRef.current.player.speedBoostExpires &&
        gameStateRef.current.player.speedBoostExpires > Date.now()
          ? 2
          : 1
      let { x, y } = gameStateRef.current.player.position // Use ref here
      let moved = false
      switch (event.key.toLowerCase()) {
        case "w":
        case "arrowup":
          y -= step
          moved = true
          break
        case "s":
        case "arrowdown":
          y += step
          moved = true
          break
        case "a":
        case "arrowleft":
          x -= step
          moved = true
          break
        case "d":
        case "arrowright":
          x += step
          moved = true
          break
        default:
          return
      }
      event.preventDefault()
      if (moved) {
        const newX = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, x))
        const newY = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, y))
        attemptPlayerAction(newX, newY)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isLoading, attemptPlayerAction, user, gameState.gameInitialized]) // Added user and gameState.gameInitialized to dependencies

  const handleTabChange = useCallback((tab: string) => {
    setGameState((prev) => ({ ...prev, currentTab: tab }))
  }, [])

  const handleMapCellClick = useCallback(
    (x: number, y: number) => {
      setGameState((prev) => {
        const key = `${x},${y}`
        const territoryOnCell = prev.map.territories[key]
        const playerIsOnCell = prev.player.position.x === x && prev.player.position.y === y

        if (territoryOnCell && !territoryOnCell.ownerId && playerIsOnCell && !territoryOnCell.isDestroyed) {
          // Can only open modal if player is ON the unowned cell
          return { ...prev, selectedTerritoryCoords: { x, y }, isTerritoryModalOpen: true }
        } else {
          attemptPlayerAction(x, y) // Handles movement to cell, or action on current cell
          return prev // attemptPlayerAction will manage further state updates
        }
      })
    },
    [attemptPlayerAction],
  )

  const handlePurchaseTerritory = useCallback(
    (territoryId: string, cost: number) => {
      setGameState((prev) => {
        const newResources = { ...prev.resources }
        const newPlayer = { ...prev.player }
        const newMap = { ...prev.map, territories: { ...prev.map.territories } }

        if (newResources.solari < cost) {
          addNotification("Not enough Solari to purchase this territory!", "warning")
          return prev
        }

        const territory = newMap.territories[territoryId]
        if (!territory || territory.ownerId) {
          addNotification("Territory already owned or invalid.", "error")
          return prev
        }

        newResources.solari -= cost
        const updatedTerritory = {
          ...territory,
          ownerId: newPlayer.id,
          ownerName: newPlayer.name,
          ownerColor: HOUSE_COLORS[newPlayer.house as keyof typeof HOUSE_COLORS] || newPlayer.color,
          captureLevel: 0,
        }
        newMap.territories[territoryId] = updatedTerritory
        newPlayer.territories = [...newPlayer.territories, updatedTerritory] // Add to player's owned territories
        applyXpGain(newPlayer, CONFIG.XP_GAIN_TERRITORY_PURCHASE)

        addNotification(`Territory ${territory.name || territoryId} purchased!`, "success")

        return {
          ...prev,
          resources: newResources,
          player: newPlayer,
          map: newMap,
          isTerritoryModalOpen: false,
          selectedTerritoryCoords: null,
        }
      })
    },
    [addNotification, updateQuestProgress], // Added updateQuestProgress to dependencies
  )

  const handlePurchaseRandomTerritory = useCallback(() => {
    setGameState((prev) => {
      const newResources = { ...prev.resources }
      const newPlayer = { ...prev.player }
      const newMap = { ...prev.map, territories: { ...prev.map.territories } }

      const territoryKeys = Object.keys(newMap.territories)
      if (territoryKeys.length === 0) return prev

      const randomKey = territoryKeys[Math.floor(Math.random() * territoryKeys.length)]
      const territory = newMap.territories[randomKey]
      if (!territory) return prev

      const baseCost = CONFIG.RANDOM_TERRITORY_PURCHASE_COST
      const finalCost = territory.ownerId ? baseCost * CONFIG.OWNED_TERRITORY_COST_MULTIPLIER : baseCost

      if (newResources.solari < finalCost) {
        addNotification(`Need ${finalCost.toLocaleString()} Solari to buy this territory!`, "warning")
        return prev
      }

      newResources.solari -= finalCost
      const updatedTerritory = {
        ...territory,
        ownerId: newPlayer.id,
        ownerName: newPlayer.name,
        ownerColor: newPlayer.color,
        captureLevel: 0,
      }
      newMap.territories[randomKey] = updatedTerritory
      const alreadyOwned = newPlayer.territories.find(
        (t) => t.position?.x === updatedTerritory.position.x && t.position?.y === updatedTerritory.position.y,
      )
      if (!alreadyOwned) newPlayer.territories = [...newPlayer.territories, updatedTerritory]
      else {
        newPlayer.territories = newPlayer.territories.map((t) =>
          t.position?.x === updatedTerritory.position.x && t.position?.y === updatedTerritory.position.y
            ? updatedTerritory
            : t,
        )
      }

      applyXpGain(newPlayer, CONFIG.XP_GAIN_TERRITORY_PURCHASE)

      addNotification(`Purchased ${territory.name || randomKey} for ${finalCost.toLocaleString()} Solari!`, "success")

      return { ...prev, resources: newResources, player: newPlayer, map: newMap }
    })
    updateQuestProgress("territory")
  }, [addNotification, updateQuestProgress])

  const handleLaunchSeeker = useCallback(() => {
    setGameState((prev) => {
      const now = Date.now()
      if (now - (prev.lastSeekerLaunchTime || 0) < CONFIG.SEEKER_COOLDOWN) {
        addNotification("Seeker launch cooling down!", "warning")
        return prev
      }

      const newResources = { ...prev.resources }
      const newPlayer = { ...prev.player }
      if (newPlayer.level < CONFIG.SEEKER_LEVEL_REQUIRED) {
        addNotification(`Reach level ${CONFIG.SEEKER_LEVEL_REQUIRED} to launch a Seeker!`, "warning")
        return prev
      }
      if (newResources.solari < CONFIG.SEEKER_COST) {
        addNotification(`Need ${CONFIG.SEEKER_COST.toLocaleString()} Solari to launch a Seeker!`, "warning")
        return prev
      }

      const newMap = { ...prev.map, seekers: { ...prev.map.seekers } }
      newResources.solari -= CONFIG.SEEKER_COST
      const { x, y } = getRandomMapCoords()
      const key = `${x},${y}`
      newMap.seekers[key] = {
        id: `seeker_${now}`,
        position: { x, y },
        ownerId: newPlayer.id!,
        ownerName: newPlayer.name,
        ownerColor: newPlayer.color,
        claimTime: now + CONFIG.SEEKER_COOLDOWN,
      }

      addNotification(`Seeker launched to ${key}!`, "success")
      return {
        ...prev,
        resources: newResources,
        map: newMap,
        lastSeekerLaunchTime: now,
      }
    })
    setSeekerLaunchVisualTime(Date.now())
  }, [addNotification])

  const handleTrackPlayer = useCallback(
    (targetId: string) => {
      setGameState((prev) => {
        const newResources = { ...prev.resources }
        if (newResources.plasteel < CONFIG.TRACK_COST_PLASTEEL) {
          addNotification(`Need ${CONFIG.TRACK_COST_PLASTEEL} Plasteel to track a target!`, "warning")
          return prev
        }
        newResources.plasteel -= CONFIG.TRACK_COST_PLASTEEL
        return { ...prev, resources: newResources, trackingTargetId: targetId }
      })
    },
    [addNotification],
  )

  const handleAddBounty = useCallback(
    async (targetId: string) => {
      setGameState((prev) => {
        const amount = CONFIG.BOUNTY_INCREMENT
        const newResources = { ...prev.resources }
        const newBounties = { ...prev.bounties }
        if (newResources.solari < amount) {
          addNotification(`Need ${amount} Solari to add a bounty!`, "warning")
          return prev
        }
        newResources.solari -= amount
        newBounties[targetId] = (newBounties[targetId] || 0) + amount
        return { ...prev, resources: newResources, bounties: newBounties }
      })

      try {
        const targetRef = doc(db, "players", targetId)
        const snap = await getDoc(targetRef)
        if (snap.exists()) {
          const data = snap.data() as GameState
          const newBounty = (data.player?.bounty || 0) + CONFIG.BOUNTY_INCREMENT
          const notification = {
            id: Date.now().toString(),
            message: `${gameStateRef.current.player.name} placed a ${CONFIG.BOUNTY_INCREMENT} Solari bounty on you!`,
            type: "warning" as const,
          }
          await setDoc(targetRef, {
            ...data,
            player: { ...data.player, bounty: newBounty },
            notifications: [...(data.notifications || []), notification],
          })
        }
      } catch (err) {
        console.error("Failed to update bounty", err)
      }
    },
    [addNotification],
  )

  const handleEquipItem = useCallback(
    (item: Item, inventoryIndex: number) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newEquipment = { ...prev.equipment }
        const newInventory = [...prev.inventory]

        const slot = item.type as keyof typeof newEquipment
        const currentEquippedItem = newEquipment[slot]

        // Swap the equipped item with the inventory item
        newEquipment[slot] = item
        newInventory[inventoryIndex] = currentEquippedItem || null

        // Update player stats based on equipped item
        newPlayer.attack = initialGameState.player.attack + (newEquipment.weapon?.attack || 0)
        newPlayer.defense =
          initialGameState.player.defense + (newEquipment.armor?.defense || 0) + (newEquipment.accessory?.defense || 0)

        addNotification(`Equipped ${item.name}!`, "success")

        return {
          ...prev,
          player: newPlayer,
          equipment: newEquipment,
          inventory: newInventory,
        }
      })
    },
    [addNotification],
  )

  const handleSellItem = useCallback(
    (item: Item, inventoryIndex: number) => {
      setGameState((prev) => {
        const newResources = { ...prev.resources }
        const newInventory = [...prev.inventory]
        const rarityScore = RARITY_SCORES[item.rarity as keyof typeof RARITY_SCORES] || 1
        const sellPrice = rarityScore * CONFIG.GEAR_SELL_BASE
        newResources.solari += sellPrice
        newInventory[inventoryIndex] = null
        addNotification(`Sold ${item.name} for ${sellPrice} Solari.`, "success")
        return { ...prev, resources: newResources, inventory: newInventory }
      })
    },
    [addNotification],
  )

  const handleGenerateSpice = useCallback(() => {
    setGameState((prev) => {
      const newResources = { ...prev.resources }
      const newPlayer = { ...prev.player }

      let spiceAmount = newPlayer.spicePerClick
      if (newPlayer.house === "fremen") {
        spiceAmount = Math.floor(spiceAmount * 1.4) // 40% bonus for Fremen
      }
      if (newPlayer.house === "harkonnen") {
        spiceAmount = Math.floor(spiceAmount * 1.2) // 20% bonus for Harkonnen
      }
      if (newPlayer.activeAbility?.id === "spiceTrance") {
        spiceAmount = Math.floor(spiceAmount * (1 + (newPlayer.activeAbility.effectValue || 100) / 100))
      }

      newResources.spice += spiceAmount
      newPlayer.lifetimeSpice += spiceAmount
      applyXpGain(newPlayer, CONFIG.XP_GAIN_GATHER)
      addNotification(`Gathered ${spiceAmount} Spice!`, "success")
      return { ...prev, resources: newResources, player: newPlayer }
    })
  }, [addNotification])

  const handleUpgradeSpiceClick = useCallback(() => {
    setGameState((prev) => {
      const newPlayer = { ...prev.player }
      const newResources = { ...prev.resources }

      if (newResources.solari >= newPlayer.spiceClickUpgradeCost) {
        newResources.solari -= newPlayer.spiceClickUpgradeCost
        newPlayer.spicePerClick = newPlayer.spicePerClick * 1.2 // Increase by 20%, removed Math.floor
        newPlayer.spiceClickUpgradeCost = Math.floor(newPlayer.spiceClickUpgradeCost * 1.5) // Cost increases by 50%
        addNotification(
          `Spice gatherer upgraded! Now gathering ${newPlayer.spicePerClick.toFixed(2)} Spice per click.`,
          "success",
        )
      } else {
        addNotification("Not enough Solari to upgrade spice gatherer!", "warning")
      }
      return { ...prev, player: newPlayer, resources: newResources }
    })
  }, [addNotification])

  const handleSellSpice = useCallback(() => {
    setGameState((prev) => {
      const newResources = { ...prev.resources }
      if (newResources.spice >= CONFIG.SPICE_SELL_COST) {
        newResources.spice -= CONFIG.SPICE_SELL_COST
        newResources.solari += CONFIG.SPICE_SELL_YIELD
        addNotification(`Sold ${CONFIG.SPICE_SELL_COST} Spice for ${CONFIG.SPICE_SELL_YIELD} Solari.`, "success")
      } else {
        addNotification(`Not enough Spice to sell! Need ${CONFIG.SPICE_SELL_COST} Spice.`, "warning")
      }
      return { ...prev, resources: newResources }
    })
  }, [addNotification])

  const handleMinePlasteel = useCallback(() => {
    setGameState((prev) => {
      const newResources = { ...prev.resources }
      const newPlayer = { ...prev.player }
      if (newPlayer.energy >= CONFIG.MINE_PLASTEEL_ENERGY_COST) {
        newPlayer.energy -= CONFIG.MINE_PLASTEEL_ENERGY_COST
        newResources.plasteel += CONFIG.MINE_PLASTEEL_YIELD
        applyXpGain(newPlayer, CONFIG.XP_GAIN_GATHER)
        addNotification(`Mined ${CONFIG.MINE_PLASTEEL_YIELD} Plasteel!`, "success")
      } else {
        addNotification(
          `Not enough Energy to mine Plasteel! Need ${CONFIG.MINE_PLASTEEL_ENERGY_COST} Energy.`,
          "warning",
        )
      }
      return { ...prev, resources: newResources, player: newPlayer }
    })
  }, [addNotification])

  const handleCollectWater = useCallback(() => {
    setGameState((prev) => {
      const newResources = { ...prev.resources }
      const newPlayer = { ...prev.player }
      if (newPlayer.energy >= CONFIG.COLLECT_WATER_ENERGY_COST) {
        newPlayer.energy -= CONFIG.COLLECT_WATER_ENERGY_COST
        newResources.water += CONFIG.COLLECT_WATER_YIELD
        newPlayer.heat = Math.max(0, newPlayer.heat - CONFIG.HEAT_DECAY_PER_TICK * 5)
        applyXpGain(newPlayer, CONFIG.XP_GAIN_GATHER)
        addNotification(`Collected ${CONFIG.COLLECT_WATER_YIELD} Water!`, "success")
      } else {
        addNotification(
          `Not enough Energy to collect Water! Need ${CONFIG.COLLECT_WATER_ENERGY_COST} Energy.`,
          "warning",
        )
      }
      return { ...prev, resources: newResources, player: newPlayer }
    })
  }, [addNotification])

  const handleBuildBase = useCallback(() => {
    setGameState((prev) => {
      if (prev.player.baseBuilt) {
        addNotification("Base already built!", "warning")
        return prev
      }
      const newPlayer = { ...prev.player, basePosition: { ...prev.player.position }, baseBuilt: true }
      applyXpGain(newPlayer, CONFIG.XP_GAIN_BUILD_BASE)
      addNotification("Base constructed!", "success")
      return { ...prev, player: newPlayer }
    })
    updateQuestProgress("build")
  }, [addNotification, updateQuestProgress])

  const handleCraftItem = useCallback(
    (recipeId: keyof typeof CRAFTING_RECIPES) => {
      setGameState((prev) => {
        const recipe = CRAFTING_RECIPES[recipeId]
        if (!recipe) return prev
        const newResources = { ...prev.resources }
        const newPlayer = { ...prev.player }
        if (
          newResources.plasteel < recipe.plasteel ||
          newResources.rareMaterials < recipe.rareMaterials ||
          newResources.melange < recipe.melange
        ) {
          addNotification("Not enough resources to craft!", "warning")
          return prev
        }
        const newInventory = [...prev.inventory]
        const emptyIndex = newInventory.findIndex((slot) => slot === null)
        if (emptyIndex === -1) {
          addNotification("Inventory full!", "warning")
          return prev
        }
        newResources.plasteel -= recipe.plasteel
        newResources.rareMaterials -= recipe.rareMaterials
        newResources.melange -= recipe.melange
        const itemData = STATIC_DATA.ITEMS[recipeId as keyof typeof STATIC_DATA.ITEMS]
        newInventory[emptyIndex] = { ...itemData }
        applyXpGain(newPlayer, CONFIG.XP_GAIN_CRAFT)
        addNotification(`Crafted ${itemData.name}!`, "success")
        return { ...prev, resources: newResources, inventory: newInventory, player: newPlayer }
      })
    },
    [addNotification],
  )

  const handleOpenPrestigeModal = useCallback(() => {
    setGameState((prev) => {
      if (prev.player.level < 10) {
        addNotification("Reach level 10 to Prestige!", "warning")
        return prev
      }
      return { ...prev, isPrestigeModalOpen: true }
    })
  }, [addNotification])

  const handleClosePrestigeModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPrestigeModalOpen: false }))
  }, [])

  const handleCloseAbilitySelectionModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isAbilitySelectionModalOpen: false }))
  }, [])

  const handleOpenTradingModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isTradingModalOpen: true }))
  }, [])

  const handleCloseTradingModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isTradingModalOpen: false }))
  }, [])

  const handleCreateTradeOffer = useCallback(
    (inventoryIndex: number, resource: keyof Resources, price: number) => {
      setGameState((prev) => {
        const item = prev.inventory[inventoryIndex]
        if (!item) return prev
        const newInventory = [...prev.inventory]
        newInventory[inventoryIndex] = null
        const offer = {
          id: `offer_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          sellerId: prev.player.id,
          sellerName: prev.player.name,
          sellerColor: prev.player.color,
          item,
          price,
          resource,
        } as TradeOffer
        addNotification(`Listed ${item.name} for ${price} ${resource}.`, "success")
        return {
          ...prev,
          inventory: newInventory,
          tradeOffers: [...prev.tradeOffers, offer],
        }
      })
    },
    [addNotification],
  )

  const handleBuyTradeOffer = useCallback(
    (offerId: string) => {
      setGameState((prev) => {
        const index = prev.tradeOffers.findIndex((o) => o.id === offerId)
        if (index === -1) return prev
        const offer = prev.tradeOffers[index]
        if (offer.price > prev.resources[offer.resource]) {
          addNotification(`Not enough ${offer.resource} to purchase!`, "warning")
          return prev
        }
        const newInventory = [...prev.inventory]
        const empty = newInventory.findIndex((i) => i === null)
        if (empty === -1) {
          addNotification("Inventory full!", "warning")
          return prev
        }
        newInventory[empty] = offer.item
        const newResources = {
          ...prev.resources,
          [offer.resource]: prev.resources[offer.resource] - offer.price,
        }
        const newOffers = [...prev.tradeOffers]
        newOffers.splice(index, 1)
        addNotification(`Purchased ${offer.item.name}!`, "success")
        return { ...prev, inventory: newInventory, resources: newResources, tradeOffers: newOffers }
      })
    },
    [addNotification],
  )

  const handleEditTradeOffer = useCallback(
    (offerId: string, resource: keyof Resources, price: number) => {
      setGameState((prev) => {
        const index = prev.tradeOffers.findIndex((o) => o.id === offerId)
        if (index === -1) return prev
        const offer = prev.tradeOffers[index]
        if (offer.sellerId !== prev.player.id) return prev
        const newOffers = [...prev.tradeOffers]
        newOffers[index] = { ...offer, price, resource }
        addNotification(`Updated offer for ${offer.item.name}.`, "success")
        return { ...prev, tradeOffers: newOffers }
      })
    },
    [addNotification],
  )

  const handleRemoveTradeOffer = useCallback(
    (offerId: string) => {
      setGameState((prev) => {
        const index = prev.tradeOffers.findIndex((o) => o.id === offerId)
        if (index === -1) return prev
        const offer = prev.tradeOffers[index]
        if (offer.sellerId !== prev.player.id) return prev
        const newOffers = [...prev.tradeOffers]
        newOffers.splice(index, 1)
        const newInventory = [...prev.inventory]
        const empty = newInventory.findIndex((i) => i === null)
        if (empty !== -1) {
          newInventory[empty] = offer.item
        } else {
          addNotification("Inventory full!", "warning")
          return { ...prev, tradeOffers: newOffers }
        }
        addNotification("Offer removed from market.", "success")
        return { ...prev, tradeOffers: newOffers, inventory: newInventory }
      })
    },
    [addNotification],
  )

  const handleSandwormContinue = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      sandwormAttackTime: null,
      player: { ...prev.player, lastActive: Date.now() },
    }))
  }, [])

  // Conditional rendering starts here, after all hooks are declared
  if (!user) return <LoginForm />
  if (isLoading) return <LoadingScreen isVisible={true} />

  const selectedTerritory = gameState.selectedTerritoryCoords
    ? gameState.map.territories[`${gameState.selectedTerritoryCoords.x},${gameState.selectedTerritoryCoords.y}`]
    : null

  // --- RENDER LOGIC (JSX) ---
  // No major changes to JSX structure needed for these backend logic enhancements.
  // The existing components (MapGrid, Panels) should reflect the new state changes (AI territories, event icons, etc.)
  // if their props are correctly updated from gameState.
  // Ensure MapGrid correctly displays AI owned territories using their colors.
  // WorldEventsPanel should display the dynamically changing gameState.worldEvents.

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        player={gameState.player}
        isPaused={gameState.isPaused}
        onTogglePause={() =>
          setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
        }
        onlinePlayerCount={Object.keys(gameState.onlinePlayers).length + 1}
      />
      <Navigation currentTab={gameState.currentTab} onTabChange={handleTabChange} />
      <NotificationArea
        notifications={gameState.notifications}
        onClose={(id) =>
          setGameState((prev) => ({ ...prev, notifications: prev.notifications.filter((n) => n.id !== id) }))
        }
      />

      <main className="flex flex-1 flex-col lg:flex-row pt-[140px] h-[calc(100vh-88px)]">
        <aside className="w-full lg:w-80 bg-gradient-to-b from-stone-800 to-stone-900 border-r-2 border-amber-600 flex flex-col p-4 space-y-4 overflow-y-auto shadow-lg order-2 lg:order-1">
          <Sidebar player={gameState.player} resources={gameState.resources} />
          <ActionsPanel
            player={gameState.player}
            resources={gameState.resources}
            onGenerateSpice={handleGenerateSpice}
            onUpgradeSpiceClick={handleUpgradeSpiceClick}
            onSellSpice={handleSellSpice}
            onMinePlasteel={handleMinePlasteel}
            onCollectWater={handleCollectWater}
            onBuildBase={handleBuildBase}
          />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden order-1 lg:order-2">
          {gameState.currentTab === "game" && (
            <div className="flex-1 p-6 overflow-y-auto flex flex-col xl:flex-row">
              <div className="flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                  <h2 className="text-3xl font-orbitron text-amber-400 text-center sm:text-left mb-4 sm:mb-0">
                    🏜️ The Great Desert of Arrakis
                  </h2>
                  <div className="text-lg text-stone-300">
                    Position:
                    <span className="text-amber-300 font-bold">
                      {gameState.player.position.x},{gameState.player.position.y}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-stone-400 mb-4 p-3 bg-stone-800 rounded-lg border border-stone-600 text-center">
                  <span className="font-semibold text-amber-400">Controls:</span>
                  {isMobile ? " Tap a nearby tile to move • Tap cells to interact or purchase territory." : " WASD/Arrow Keys to move • Click cells to interact/purchase territory."}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-stone-300 text-sm">Zoom:</span>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[zoom]}
                    onValueChange={(v) => setZoom(v[0])}
                    className="w-40"
                  />
                </div>
                <MapGrid // Ensure MapGrid can take onlinePlayers to show AI positions/territories
                  player={gameState.player}
                  mapData={gameState.map}
                  onlinePlayers={gameState.onlinePlayers} // Pass AI players
                  worldEvents={gameState.worldEvents} // Pass dynamic world events
                  worm={gameState.worm}
                  onCellClick={handleMapCellClick}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  trackingTarget={
                    gameState.trackingTargetId && gameState.onlinePlayers[gameState.trackingTargetId]
                      ? gameState.onlinePlayers[gameState.trackingTargetId].position
                      : null
                  }
                  seekerLaunchTime={seekerLaunchVisualTime}
                />
                {isMobile && (
                  <MobileMovementControls
                    onMove={(dx, dy) => {
                      const { x, y } = gameState.player.position
                      const newX = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, x + dx))
                      const newY = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, y + dy))
                      attemptPlayerAction(newX, newY)
                    }}
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Leaderboard topPlayers={gameState.leaderboard} />
                  <HousesPanel
                    onlinePlayers={gameState.onlinePlayers}
                    territories={gameState.map.territories}
                    player={{ id: gameState.player.id, house: gameState.player.house }}
                  />
                  {/* World Events Summary - uses gameState.worldEvents which is now dynamic */}
                  <div className="bg-purple-800 p-4 rounded-lg border border-purple-500">
                    <h3 className="text-lg font-semibold text-purple-300 mb-3 font-orbitron">
                      🌟 World Events Summary
                    </h3>
                    <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                      {gameState.worldEvents.length === 0 ? (
                        <p className="text-stone-400 text-center">No active events</p>
                      ) : (
                        gameState.worldEvents.map(
                          (
                            event, // No index needed if event.id is reliable
                          ) => (
                            <div key={event.id} className="bg-purple-900/50 p-3 rounded-lg border border-purple-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-purple-200">
                                  {event.icon} {event.name}
                                </span>
                                {event.endTime && (
                                  <span className="text-xs text-purple-400">
                                    Ends in: {Math.max(0, Math.round((event.endTime - Date.now()) / 1000))}s
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-300">{event.description}</p>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <aside className="w-full xl:w-80 bg-gradient-to-b from-stone-800 to-stone-900 border-l-2 border-blue-600 flex flex-col p-4 space-y-4 overflow-y-auto shadow-lg mt-6 xl:mt-0 xl:ml-6 order-3">
                <PlayerStatsPanel player={gameState.player} />
                <QuestPanel quests={gameState.quests} />
              </aside>
            </div>
          )}
          {gameState.currentTab === "character" && (
            <CharacterTab
              player={gameState.player}
              equipment={gameState.equipment}
              inventory={gameState.inventory}
              resources={gameState.resources}
              onEquipItem={handleEquipItem}
              onSellItem={handleSellItem}
              onOpenPrestigeModal={handleOpenPrestigeModal}
              onActivateAbility={handleActivateAbility}
              abilityCooldowns={gameState.abilityCooldowns}
              onCraftItem={handleCraftItem}
            />
          )}
          {gameState.currentTab === "empire" && (
            <EmpireTab
              player={gameState.player}
              resources={gameState.resources}
              onInvest={handleInvestInVenture}
              onManualGather={handleManualGather}
              onHireManager={handleHireManager}
              onPurchaseRandomTerritory={handlePurchaseRandomTerritory}
              onLaunchSeeker={handleLaunchSeeker}
            />
          )}
          {gameState.currentTab === "multiplayer" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-3xl font-orbitron text-amber-400 mb-6">🌍 Multiplayer Hub</h2>
              <p className="text-center text-stone-400 mb-4">
                View other Great Houses, ongoing World Events, and engage in Trade!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-stone-800 p-6 rounded-lg border border-stone-600 col-span-full">
                  <h3 className="text-xl font-semibold mb-4 text-amber-300">World Chat</h3>
                  <WorldChat
                    messages={gameState.chatMessages}
                    onSendMessage={handleSendMessage}
                    playerName={gameState.player.name}
                    playerColor={gameState.player.color}
                  />
                </div>
                {/* HousesPanel now also tracks territory control */}
                <HousesPanel
                  onlinePlayers={gameState.onlinePlayers}
                  territories={gameState.map.territories}
                  player={{ id: gameState.player.id, house: gameState.player.house }}
                />
                {/* WorldEventsPanel should show dynamic events */}
                <WorldEventsPanel worldEvents={gameState.worldEvents} />
                <BountyBoard
                  onlinePlayers={gameState.onlinePlayers}
                  bounties={gameState.bounties}
                  resources={gameState.resources}
                  onAddBounty={handleAddBounty}
                  onTrack={handleTrackPlayer}
                  trackingTargetId={gameState.trackingTargetId}
                />
                <TradePanel
                  player={gameState.player}
                  resources={gameState.resources}
                  onOpenTrading={handleOpenTradingModal}
                />
                <div className="bg-stone-800 p-6 rounded-lg border border-stone-600 col-span-full">
                  {/* TerritoryChart needs to be aware of AI players for ownership */}
                  <TerritoryChart
                    territories={gameState.map.territories}
                    onlinePlayers={Object.values(gameState.onlinePlayers)}
                    player={gameState.player}
                  />
                </div>
              </div>
            </div>
          )}
          {gameState.currentTab === "updates" && <UpdatesTab />}
          {gameState.currentTab === "wishlist" && <WishlistTab />}
        </div>
      </main>

      <TerritoryModal
        isOpen={gameState.isTerritoryModalOpen}
        onClose={() =>
          setGameState((prev) => ({ ...prev, isTerritoryModalOpen: false, selectedTerritoryCoords: null }))
        }
        territory={selectedTerritory}
        playerResources={gameState.resources}
        onPurchase={handlePurchaseTerritory}
      />

      {gameState.isCombatModalOpen && gameState.combat.enemy && (
        <CombatModal
          isOpen={gameState.isCombatModalOpen}
          player={gameState.player}
          enemy={gameState.combat.enemy} // Ensure this is the scaled enemy from combat state
          combatState={gameState.combat}
          onPlayerAttack={handlePlayerAttack}
          onEnemyAttack={handleEnemyAttack}
          onFlee={handleFlee}
          onCombatEnd={(result) => {
            // This needs to properly set the game state with the result of handleCombatEnd
            const nextStatePartial = handleCombatEnd(
              result,
              gameStateRef.current.player,
              gameStateRef.current.combat.enemy!,
              gameStateRef.current.combat,
              gameStateRef.current.resources,
              gameStateRef.current.map,
            )
            setGameState((prevState) => ({ ...prevState, ...nextStatePartial }))
          }}
          addNotification={addNotification}
          onActivateAbility={handleActivateAbility}
          abilityCooldowns={gameState.abilityCooldowns}
          onDefend={handleDefend}
          enemyLevel={gameState.combat.enemy.level} // Pass the potentially scaled level
        />
      )}

      <NameSelectionModal isOpen={gameState.isNameModalOpen} onSubmit={handleNameSubmit} />
      <HouseSelectionModal isOpen={gameState.isHouseModalOpen} onSelect={handleHouseSelect} />
      <PrestigeModal
        isOpen={gameState.isPrestigeModalOpen}
        onClose={handleClosePrestigeModal}
        onPrestige={handlePrestige}
        playerSolari={gameState.resources.solari}
        prestigeLevel={gameState.player.prestigeLevel}
      />
      <AbilitySelectionModal
        isOpen={gameState.isAbilitySelectionModalOpen}
        onClose={handleCloseAbilitySelectionModal} // Add a close handler
        onSelect={handleSelectAbility}
        availableAbilities={availableAbilitiesForSelection}
      />
      <TradingModal
        isOpen={gameState.isTradingModalOpen}
        tradeOffers={gameState.tradeOffers}
        inventory={gameState.inventory}
        playerId={gameState.player.id}
        playerResources={gameState.resources}
        onClose={handleCloseTradingModal}
        onCreateOffer={handleCreateTradeOffer}
        onBuyOffer={handleBuyTradeOffer}
        onEditOffer={handleEditTradeOffer}
        onRemoveOffer={handleRemoveTradeOffer}
      />
      <PauseModal isOpen={gameState.isPaused} onResume={() => setGameState((prev) => ({ ...prev, isPaused: false }))} />
      <SandwormWarning
        timeLeft={gameState.sandwormAttackTime ? gameState.sandwormAttackTime - Date.now() : 0}
        onContinue={handleSandwormContinue}
      />
    </div>
  )
}
