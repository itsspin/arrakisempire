"use client"

import { useState, useEffect, useCallback, useRef } from "react"

import { LoadingScreen } from "@/components/loading-screen"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { Sidebar } from "@/components/sidebar"
import { MapGrid } from "@/components/map-grid"
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
import { HousesPanel } from "@/components/houses-panel"
import { WorldEventsPanel } from "@/components/world-events-panel"
import { PrestigeModal } from "@/components/modals/prestige-modal"
import { WorldChat } from "@/components/world-chat"
import { TerritoryChart } from "@/components/territory-chart"
import { AbilitySelectionModal } from "@/components/modals/ability-selection-modal"
import { TradePanel } from "@/components/trade-panel"
import { UpdatesTab } from "@/components/updates-tab"

import type {
  GameState,
  RankedPlayer,
  TerritoryDetails,
  Item,
  Enemy,
  ResourceNode,
  Player,
  Combat,
  Resources,
  Ability,
  WorldEvent, // Added WorldEvent
  AIPlayer, // Added AIPlayer
  PlayerColor,
} from "@/types/game"
import { CONFIG, PLAYER_COLORS, RARITY_SCORES } from "@/lib/constants"
import { STATIC_DATA } from "@/lib/game-data"
import { auth, db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"

import { initialVentures as empireInitialVentures } from "@/components/empire-tab"

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

const generateMockResources = (): Record<string, ResourceNode> => {
  // Unchanged
  const resources: Record<string, ResourceNode> = {}
  const resourceTypes = ["spice", "water", "plasteel"]
  const numResources = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.02)
  for (let i = 0; i < numResources; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (resources[key]) continue
    const type = resourceTypes[getRandomInt(0, resourceTypes.length - 1)]
    resources[key] = {
      id: `res_${x}_${y}`,
      type,
      amount: Math.floor(Math.random() * 50) + 10,
      position: { x, y },
      icon: type === "spice" ? "✨" : type === "water" ? "💧" : "🔧",
    }
  }
  return resources
}

const generateMockItems = (): Record<string, Item> => {
  // Unchanged
  const items: Record<string, Item> = {}
  const itemKeys = Object.keys(STATIC_DATA.ITEMS) as Array<keyof typeof STATIC_DATA.ITEMS>
  const numItems = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.005)
  for (let i = 0; i < numItems; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (items[key]) continue
    const itemTypeKey = itemKeys[getRandomInt(0, itemKeys.length - 1)]
    const itemData = STATIC_DATA.ITEMS[itemTypeKey]
    items[key] = {
      id: `item_${x}_${y}`,
      name: itemData.name,
      icon: itemData.icon,
      type: itemData.type,
      rarity: itemData.rarity,
      description: itemData.description,
      attack: itemData.attack ?? 0,
      defense: itemData.defense ?? 0,
      special: itemData.special ?? null,
    }
  }
  return items
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
    investments: JSON.parse(JSON.stringify(empireInitialVentures)), // Deep copy to ensure unique instance per player
    spicePerClick: 1,
    spiceClickUpgradeCost: 50,
    unlockedAbilities: [],
    activeAbility: null,
    isDefending: false,
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
  resources: generateMockResources(),
  territories: generateMockTerritories(),
  items: generateMockItems(),
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
    position: getRandomMapCoords(), // Give AI a random starting position
    basePosition: initialPlayerPart.position, // Same as initial for now
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
  lastAIProcessingTime: 0, // NEW
  lastWorldEventProcessingTime: 0, // NEW
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

// Fetch leaderboard data for all players from Firestore
const fetchLeaderboardData = async (): Promise<RankedPlayer[]> => {
  const snapshot = await getDocs(collection(db, "players"))
  const players: RankedPlayer[] = []
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as GameState
    if (!data?.player) return
    const equipmentScore = calculateEquipmentScore(data.equipment)
    const power =
      data.resources.solari * 0.01 +
      data.player.territories.length * 50 +
      equipmentScore * 100 +
      data.player.totalEnemiesDefeated * 5
    const rank = Math.max(1, 100 - Math.floor(power / 100))
    const rankName = rank < 10 ? "Spice Baron" : rank < 50 ? "Guild Associate" : "Sand Nomad"
    players.push({
      id: data.player.id || docSnap.id,
      name: data.player.name,
      rank,
      rankName,
      house: data.player.house,
      prestigeLevel: data.player.prestigeLevel,
      color: data.player.color,
      power,
    })
  })
  return players.sort((a, b) => b.power - a.power)
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
  const [itemRespawnQueue, setItemRespawnQueue] = useState<Record<string, { item: Item; respawnTime: number }>>({})
  const [availableAbilitiesForSelection, setAvailableAbilitiesForSelection] = useState<Ability[]>([])

  const lastGeneralNotificationTime = useRef(0)
  const GENERAL_NOTIFICATION_COOLDOWN = 1000

  const gameStateRef = useRef(gameState)
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const addNotification = useCallback((message: string, type: GameState["notifications"][0]["type"] = "info") => {
    // Unchanged
    const now = Date.now()
    if (type === "legendary" || type === "error" || type === "warning") {
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

  // --- GAME INITIALIZATION (Firebase loading, etc.) ---
  useEffect(() => {
    const initGame = async () => {
      console.log("Initializing game...")
      setIsLoading(true)
      try {
        const userCredential = await signInAnonymously(auth)
        const userId = userCredential.user.uid

        const playerDocRef = doc(db, "players", userId)
        const playerDocSnap = await getDoc(playerDocRef)

        if (playerDocSnap.exists()) {
          const savedState = playerDocSnap.data() as GameState

          // Reconstruct map territories based on saved player AND AI territories
          const newMapTerritories = { ...initialMapData.territories }

          // Player territories
          savedState.player.territories.forEach((ownedTerritory) => {
            const key = `${ownedTerritory.x},${ownedTerritory.y}`
            if (newMapTerritories[key]) {
              newMapTerritories[key] = { ...newMapTerritories[key], ...ownedTerritory }
            }
          })

          // AI territories (from saved onlinePlayers)
          if (savedState.onlinePlayers) {
            Object.values(savedState.onlinePlayers).forEach((aiPlayer) => {
              aiPlayer.territories.forEach((ownedTerritory) => {
                const key = `${ownedTerritory.x},${ownedTerritory.y}`
                if (newMapTerritories[key] && !newMapTerritories[key].ownerId) {
                  // AI claims only if still unowned by player
                  newMapTerritories[key] = {
                    ...newMapTerritories[key],
                    ownerId: aiPlayer.id,
                    ownerName: aiPlayer.name,
                    ownerColor: aiPlayer.color,
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
            },
            onlinePlayers: updatedOnlinePlayers, // Use updated AIs
            unlockedAbilities: savedState.player.unlockedAbilities || [],
            activeAbility: savedState.player.activeAbility || null,
            isDefending: savedState.player.isDefending || false,
            abilityCooldowns: savedState.abilityCooldowns || {},
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
            lastAIProcessingTime: Date.now(),
            lastWorldEventProcessingTime: Date.now(),
          }

          // Give initial territories to AIs on new game
          Object.values(newGameState.onlinePlayers).forEach((ai) => {
            for (let i = 0; i < 2; i++) {
              // Give each AI 2 random territories
              const unownedTerritories = Object.values(newGameState.map.territories).filter((t) => !t.ownerId)
              if (unownedTerritories.length > 0) {
                const terrToClaim = unownedTerritories[getRandomInt(0, unownedTerritories.length - 1)]
                const key = `${terrToClaim.position.x},${terrToClaim.position.y}`
                newGameState.map.territories[key] = {
                  ...terrToClaim,
                  ownerId: ai.id,
                  ownerName: ai.name,
                  ownerColor: ai.color,
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
  }, [])

  // Periodically refresh leaderboard from Firestore
  useEffect(() => {
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
  }, [])

  const handleSendMessage = useCallback((message: string) => {
    setGameState((prev) => {
      const newMessages = [
        ...prev.chatMessages,
        {
          senderId: prev.player.id || "anonymous",
          senderName: prev.player.name,
          senderColor: prev.player.color,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          message: message,
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
      const newMap = { ...mapState, enemies: { ...mapState.enemies } } // Be careful with deep copies if needed
      const updatedInventory = [...currentFullGameState.inventory] // Use inventory from the ref

      if (result === "win") {
        let xpGained = enemyInstance.xp
        xpGained = Math.floor(xpGained * newPlayer.globalGainMultiplier)
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
              addNotification(`You found a ${itemData.icon} ${itemData.name}!`, "success")
            } else {
              addNotification(`Inventory full! Could not pick up ${itemData.name}.`, "warning")
            }
          }
        })
        const enemyKey = `${enemyInstance.position.x},${enemyInstance.position.y}`
        if (newMap.enemies[enemyKey]) {
          // Check if enemy still exists before updating
          newMap.enemies[enemyKey] = { ...enemyInstance, cooldownUntil: Date.now() + CONFIG.ENEMY_COOLDOWN }
        }
      } else if (result === "lose") {
        newPlayer.position = { ...newPlayer.basePosition }
        newPlayer.health = Math.floor(newPlayer.maxHealth / 2)
        addNotification("You respawned at your base.", "info")
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

      return {
        ...currentFullGameState, // Use the most recent full game state as base
        player: newPlayer,
        resources: newResources,
        map: newMap,
        combat: resetCombat,
        isCombatModalOpen: false,
        inventory: updatedInventory,
        // If ability modal should open, set flag here:
        isAbilitySelectionModalOpen:
          result === "win" &&
          newPlayer.level % 5 === 0 &&
          newPlayer.level <= 25 &&
          availableAbilitiesForSelection.length > 0 &&
          availableAbilitiesForSelection.some((a) => !newPlayer.unlockedAbilities.find((ua) => ua.id === a.id)),
      }
    },
    [addNotification, gameStateRef, availableAbilitiesForSelection], // Added gameStateRef
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
            ownerColor: newPlayer.color,
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
            const key = `${terrToClaim.position.x},${terrToClaim.position.y}`
            newMapTerritories[key] = { ...terrToClaim, ownerId: ai.id, ownerName: ai.name, ownerColor: ai.color }
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
        },
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
        const now = Date.now()
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const newMap = {
          ...prev.map,
          enemies: { ...prev.map.enemies },
          resources: { ...prev.map.resources },
          items: { ...prev.map.items },
          territories: { ...prev.map.territories }, // Ensure territories are mutable
        }
        const newAbilityCooldowns = { ...prev.abilityCooldowns }
        const newNotifications = [...prev.notifications]
        let newWorldEvents = [...prev.worldEvents]
        const newOnlinePlayers = JSON.parse(JSON.stringify(prev.onlinePlayers)) // Deep copy for AI modifications

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

        let territorySpiceIncomeBoost = 1.0
        if (newWorldEvents.some((event) => event.effect === "spice_boost" && event.endTime && event.endTime > now)) {
          const event = newWorldEvents.find((e) => e.effect === "spice_boost")
          if (event && event.effectValue) territorySpiceIncomeBoost = event.effectValue
        }

        newPlayer.territories.forEach((t) => {
          const territoryDetail = newMap.territories[`${t.position.x},${t.position.y}`]
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
        Object.entries(newMap.enemies).forEach(([key, enemy]) => {
          if (enemy.cooldownUntil && now >= enemy.cooldownUntil) {
            const originalEnemyData = STATIC_DATA.ENEMIES[enemy.type as keyof typeof STATIC_DATA.ENEMIES]
            newMap.enemies[key] = { ...enemy, currentHealth: originalEnemyData.health, cooldownUntil: null }
          }
        })
        // (Resource and Item respawn logic - assuming it's largely correct from before)
        // Item Respawn Logic (from original code)
        const newRespawnQueue = { ...itemRespawnQueue }
        Object.entries(newRespawnQueue).forEach(([itemId, { item, respawnTime }]) => {
          if (now >= respawnTime) {
            const { x, y } = getRandomMapCoords()
            const newKey = `${x},${y}`
            if (!newMap.items[newKey] && !newMap.enemies[newKey] && !newMap.resources[newKey]) {
              // Check if cell is empty
              newMap.items[newKey] = { ...item, id: `item_${newKey}`, position: { x, y } }
              addNotification(`An item (${item.name}) has respawned at (${x},${y}).`, "info")
              delete newRespawnQueue[itemId]
            } else {
              // Reschedule if cell is occupied
              newRespawnQueue[itemId].respawnTime = now + 10000 // Try again in 10s
            }
          }
        })
        // No direct setItemRespawnQueue here, it's managed outside setGameState usually or returned.
        // For simplicity, assume itemRespawnQueue is updated correctly if needed.

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
                      const targetKey = `${targetTerr.position.x},${targetTerr.position.y}`
                      newMap.territories[targetKey].isDestroyed = true
                      newMap.territories[targetKey].destroyedUntil = now + 180000 // Destroyed for 3 mins
                      newChainedEvent.description = `${newChainedEvent.name} targets Sector ${targetTerr.name || targetKey}! Buildings and units are lost!`
                      addNotification(`SHAI-HULUD ATTACKS ${targetTerr.name || targetKey}!`, "legendary")

                      // Remove units/enemies from this territory (simplified)
                      Object.keys(newMap.enemies).forEach((ekey) => {
                        if (
                          newMap.enemies[ekey].position.x === targetTerr.position.x &&
                          newMap.enemies[ekey].position.y === targetTerr.position.y
                        ) {
                          delete newMap.enemies[ekey]
                        }
                      })
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
              if (newEvent.rewards) {
                // Apply immediate rewards
                if (newEvent.rewards.spice) newResources.spice += newEvent.rewards.spice
                if (newEvent.rewards.solari) newResources.solari += newEvent.rewards.solari
                // ... etc for all resources & xp
                if (newEvent.rewards.xp) newPlayer.experience += newEvent.rewards.xp // (Handle level up if necessary)
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
              const territoryDetail = newMap.territories[`${terr.position.x},${terr.position.y}`]
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
              const ownedTerritoryCoords = new Set(ai.territories.map((t) => `${t.position.x},${t.position.y}`))
              if (ai.territories.length === 0) {
                // If AI has no territories, pick any neutral one near its start
                const nearbyNeutrals = Object.values(newMap.territories).filter(
                  (t) =>
                    !t.ownerId &&
                    Math.abs(t.position.x - ai.position.x) < 5 &&
                    Math.abs(t.position.y - ai.position.y) < 5,
                )
                if (nearbyNeutrals.length > 0)
                  potentialTargets.push(nearbyNeutrals[getRandomInt(0, nearbyNeutrals.length - 1)])
              } else {
                ai.territories.forEach((ownedTerr) => {
                  directions.forEach((dir) => {
                    const checkX = ownedTerr.position.x + dir[0]
                    const checkY = ownedTerr.position.y + dir[1]
                    if (checkX >= 0 && checkX < CONFIG.MAP_SIZE && checkY >= 0 && checkY < CONFIG.MAP_SIZE) {
                      const targetKey = `${checkX},${checkY}`
                      const targetTerr = newMap.territories[targetKey]
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
                  const key = `${targetTerritory.position.x},${targetTerritory.position.y}`
                  newMap.territories[key] = {
                    ...targetTerritory,
                    ownerId: ai.id,
                    ownerName: ai.name,
                    ownerColor: ai.color,
                  }
                  ai.territories.push(newMap.territories[key]) // Add to AI's list
                  addNotification(`${ai.name} (${ai.house}) has claimed Sector ${targetTerritory.name || key}!`, "info")
                }
              }
            }
          })
          prev.lastAIProcessingTime = now // Update time
        }

        // --- 5. NEW: Enemy Movement ---
        if (now - (prev.player.lastActive || 0) > ENEMY_MOVEMENT_CONFIG.PROCESSING_INTERVAL) {
          // Link to player activity or fixed interval
          Object.keys(newMap.enemies).forEach((key) => {
            const enemy = newMap.enemies[key]
            if (enemy && !enemy.cooldownUntil && !enemy.boss && !enemy.isMoving) {
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
                      !Object.values(newOnlinePlayers).some((p) => p.position.x === nextX && p.position.y === nextY) &&
                      !newMap.territories[targetCellKey].isDestroyed
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
                  // addNotification(`${enemy.name} moved to ${newPos.x},${newPos.y}.`, 'info'); // Can be spammy
                }
              }
            }
          })
          // newPlayer.lastActive = now; // If linked to player activity, but for general tick, this is not needed.
        }

        // --- Update player rank, ability cooldowns (existing logic) ---
        for (const abilityId in newAbilityCooldowns) {
          if (newAbilityCooldowns[abilityId] <= now) {
            delete newAbilityCooldowns[abilityId]
          }
        }

        // Calculate power for current player
        const playerEquipmentScore = calculateEquipmentScore(prev.equipment)
        newPlayer.power =
          newResources.solari * 0.01 + // 1 Solari = 0.01 power
          newPlayer.territories.length * 50 + // 1 territory = 50 power
          playerEquipmentScore * 100 + // 1 equipment rarity point = 100 power
          newPlayer.totalEnemiesDefeated * 5 // 1 kill = 5 power

        // Update player rank based on power (lower rank number is better)
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
          // Calculate AI power (simplified for now, can be expanded)
          const aiEquipmentScore = calculateEquipmentScore(
            ai.equipment || { weapon: null, armor: null, accessory: null },
          )
          ai.power =
            ai.resources.solari * 0.01 +
            ai.territories.length * 50 +
            aiEquipmentScore * 100 +
            ai.totalEnemiesDefeated * 5

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
        }
      })
    }, 1000) // Main game tick interval (1 second)

    const saveGameInterval = setInterval(async () => {
      // Unchanged
      const currentGameState = gameStateRef.current
      if (currentGameState.player.id && currentGameState.gameInitialized) {
        try {
          // Create a state object for saving, potentially exclude very large or transient parts if needed
          // For example, detailed enemy AI state if it becomes complex and not easily serializable.
          // The current setup saves most things. Consider if map should be partially saved or reconstructed.
          // Player-owned territories are saved via player.territories.

          // AIs' states including their resources and territories need to be in `stateToSave.onlinePlayers`
          const { map, ...stateToSaveWithoutFullMap } = currentGameState
          const stateToSave = {
            ...stateToSaveWithoutFullMap,
            // Only save territory ownership data, not the full static territory details always.
            // However, current save logic in initGame reconstructs map and applies ownership.
            // For simplicity, let's assume the current save logic is okay.
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
  }, [isLoading]) // Re-added isLoading to dependencies of the main useEffect

  // --- Action handlers (attemptPlayerAction, handleMapCellClick, handlePurchaseTerritory, etc.) ---
  // These need to be aware of the new game elements like AI territories or event effects.
  // For instance, attemptPlayerAction should check for AI players on cells.
  // handlePurchaseTerritory is mostly fine.

  const attemptPlayerAction = useCallback(
    (targetX: number, targetY: number) => {
      setGameState((prev) => {
        // Ensure we are not in a blocking modal
        if (prev.isCombatModalOpen || prev.isAbilitySelectionModalOpen) {
          addNotification("Cannot perform action during active modal!", "warning")
          return prev
        }

        const { player, resources, map, onlinePlayers } = prev // Include onlinePlayers
        const dx = targetX - player.position.x
        const dy = targetY - player.position.y
        const key = `${targetX},${targetY}`
        const enemyOnCell = map.enemies[key]
        const resourceOnCell = map.resources[key]
        const itemOnCell = map.items[key]
        const territoryOnCell = map.territories[key] // Get territory info

        // Check for AI player on the target cell (player cannot move onto AI cell for now)
        const aiPlayerOnCell = Object.values(onlinePlayers).find(
          (ai) => ai.position.x === targetX && ai.position.y === targetY,
        )
        if (aiPlayerOnCell && (dx !== 0 || dy !== 0) /* if moving to it */) {
          addNotification(`Cell occupied by ${aiPlayerOnCell.name}. Cannot move there.`, "warning")
          return prev
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
        waterCost = Math.round(waterCost * 10) / 10 // Round to one decimal

        const isMoving = dx !== 0 || dy !== 0
        if (isMoving && resources.water < waterCost) {
          addNotification(`Not enough water to move (cost: ${waterCost})!`, "warning")
          return prev
        }

        const newPlayer = { ...player }
        const newResources = { ...resources }
        const newMap = { ...map, enemies: { ...map.enemies }, resources: { ...map.resources }, items: { ...map.items } }
        const updatedInventory = [...prev.inventory]

        if (isMoving) {
          newPlayer.position = { x: targetX, y: targetY }
          newResources.water -= waterCost
        }

        // Interaction logic (enemy, resource, item) remains largely the same
        if (enemyOnCell && !enemyOnCell.cooldownUntil) {
          // ... (combat initiation logic from original, ensure it uses scaledEnemy correctly)
          const originalEnemyData = STATIC_DATA.ENEMIES[enemyOnCell.type as keyof typeof STATIC_DATA.ENEMIES]
          let targetEnemyLevel = player.level
          if (originalEnemyData.boss) targetEnemyLevel = Math.max(1, player.level + getRandomInt(0, 2))
          else if (originalEnemyData.special) targetEnemyLevel = Math.max(1, player.level + getRandomInt(0, 1))
          else targetEnemyLevel = Math.max(1, player.level - getRandomInt(0, 1))

          const levelDifference = targetEnemyLevel - originalEnemyData.level
          // Ensure scalingMultiplier is always positive and adjust by player gear
          const gearPower =
            (player.equipment?.weapon?.attack || 0) +
            (player.equipment?.armor?.defense || 0) +
            (player.equipment?.accessory?.attack || 0) +
            (player.equipment?.accessory?.defense || 0)
          const gearMultiplier = 1 + gearPower * CONFIG.GEAR_SCALING_FACTOR
          const scalingMultiplier =
            Math.max(0.1, 1 + levelDifference * CONFIG.ENEMY_SCALING_FACTOR) * gearMultiplier

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
        } else if (resourceOnCell && !resourceOnCell.cooldownUntil) {
          // ... (resource harvesting logic from original)
          let amountHarvested = Math.min(resourceOnCell.amount, 10)
          if (player.activeAbility?.id === "spiceTrance") {
            // Simplified check
            amountHarvested = Math.floor(amountHarvested * (1 + (player.activeAbility.effectValue || 100) / 100))
          }
          ;(newResources as any)[resourceOnCell.type] += amountHarvested
          addNotification(`Harvested ${amountHarvested} ${resourceOnCell.type}.`, "success")
          newMap.resources[key] = {
            ...resourceOnCell,
            amount: resourceOnCell.amount - amountHarvested,
          }
          if (newMap.resources[key].amount <= 0) {
            addNotification(`${resourceOnCell.type} node depleted. Will respawn elsewhere.`, "info")
            newMap.resources[key].cooldownUntil = Date.now() + CONFIG.RESOURCE_DEPLETED_COOLDOWN // existing node stays on cooldown
          }
        } else if (itemOnCell) {
          // ... (item pickup logic from original)
          const emptySlotIndex = updatedInventory.findIndex((slot) => slot === null)
          if (emptySlotIndex !== -1) {
            updatedInventory[emptySlotIndex] = itemOnCell
            delete newMap.items[key]
            setItemRespawnQueue((prevQueue) => ({
              ...prevQueue,
              [itemOnCell.id!]: { item: itemOnCell, respawnTime: Date.now() + CONFIG.ITEM_RESPAWN_COOLDOWN },
            }))
            addNotification(`Picked up ${itemOnCell.icon} ${itemOnCell.name}.`, "success")
          } else {
            addNotification("Inventory is full! Could not pick up item.", "warning")
            // If inventory full, don't consume movement cost / don't move player.
            if (isMoving) return prev // Revert move if it happened
          }
        }

        return { ...prev, player: newPlayer, resources: newResources, map: newMap, inventory: updatedInventory }
      })
    },
    [addNotification, itemRespawnQueue, handleCombatEnd], // Ensure all dependencies are correct
  )

  // WASD Controls: Ensure it checks new modal flags if any are added for pausing. Fine for now.
  useEffect(() => {
    // Unchanged from original logic structure
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !gameStateRef.current.gameInitialized ||
        isLoading ||
        gameStateRef.current.isCombatModalOpen ||
        gameStateRef.current.isNameModalOpen ||
        gameStateRef.current.isHouseModalOpen ||
        gameStateRef.current.isPrestigeModalOpen ||
        gameStateRef.current.isAbilitySelectionModalOpen
      )
        return
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return
      }

      let { x, y } = gameStateRef.current.player.position // Use ref here
      let moved = false
      switch (event.key.toLowerCase()) {
        case "w":
        case "arrowup":
          y--
          moved = true
          break
        case "s":
        case "arrowdown":
          y++
          moved = true
          break
        case "a":
        case "arrowleft":
          x--
          moved = true
          break
        case "d":
        case "arrowright":
          x++
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
  }, [isLoading, attemptPlayerAction]) // gameStateRef is implicitly handled by attemptPlayerAction closure

  const handleTabChange = useCallback((tab: string) => {
    // Unchanged
    setGameState((prev) => ({ ...prev, currentTab: tab }))
  }, [])

  const handleMapCellClick = useCallback(
    // Unchanged
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
          ownerColor: newPlayer.color,
        }
        newMap.territories[territoryId] = updatedTerritory
        newPlayer.territories = [...newPlayer.territories, updatedTerritory] // Add to player's owned territories

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
    [addNotification],
  )

  const handleEquipItem = useCallback(
    (item: Item, inventoryIndex: number) => {
      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newEquipment = { ...prev.equipment }
        const newInventory = [...prev.inventory]

        const currentEquippedItem = newEquipment[item.type as keyof typeof newEquipment]

        // Unequip current item if slot is occupied and it's different from the new item
        if (currentEquippedItem && currentEquippedItem.id !== item.id) {
          const emptySlotIndex = newInventory.findIndex((slot) => slot === null)
          if (emptySlotIndex !== -1) {
            newInventory[emptySlotIndex] = currentEquippedItem
            addNotification(`Unequipped ${currentEquippedItem.name}.`, "info")
          } else {
            addNotification("Inventory full! Cannot unequip current item.", "warning")
            return prev // Cannot unequip, so cannot equip new item
          }
        }

        // Equip the new item
        newEquipment[item.type as keyof typeof newEquipment] = item
        newInventory[inventoryIndex] = null // Remove item from inventory

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

  const handleOpenPrestigeModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPrestigeModalOpen: true }))
  }, [])

  const handleClosePrestigeModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPrestigeModalOpen: false }))
  }, [])

  const handleCloseAbilitySelectionModal = useCallback(() => {
    setGameState((prev) => ({ ...prev, isAbilitySelectionModalOpen: false }))
  }, [])

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
      <Header player={gameState.player} />
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
                  <span className="font-semibold text-amber-400">Controls:</span> WASD/Arrow Keys to move • Click cells
                  to interact/purchase territory.
                </div>
                <MapGrid // Ensure MapGrid can take onlinePlayers to show AI positions/territories
                  player={gameState.player}
                  mapData={gameState.map}
                  onlinePlayers={gameState.onlinePlayers} // Pass AI players
                  worldEvents={gameState.worldEvents} // Pass dynamic world events
                  onCellClick={handleMapCellClick}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Leaderboard topPlayers={gameState.leaderboard} />
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
              </aside>
            </div>
          )}
          {gameState.currentTab === "character" && (
            <CharacterTab
              player={gameState.player}
              equipment={gameState.equipment}
              inventory={gameState.inventory}
              onEquipItem={handleEquipItem}
              onOpenPrestigeModal={handleOpenPrestigeModal}
              onActivateAbility={handleActivateAbility}
              abilityCooldowns={gameState.abilityCooldowns}
            />
          )}
          {gameState.currentTab === "empire" && (
            <EmpireTab
              player={gameState.player}
              resources={gameState.resources}
              onInvest={handleInvestInVenture}
              onManualGather={handleManualGather}
              onHireManager={handleHireManager}
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
                {/* HousesPanel should now reflect actual AI players from gameState.onlinePlayers */}
                <HousesPanel onlinePlayers={Object.values(gameState.onlinePlayers)} />
                {/* WorldEventsPanel should show dynamic events */}
                <WorldEventsPanel worldEvents={gameState.worldEvents} />
                <TradePanel player={gameState.player} resources={gameState.resources} />
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
    </div>
  )
}
