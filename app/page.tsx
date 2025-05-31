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
import { HousesPanel } from "@/components/houses-panel" // Changed from modal
import { WorldEventsPanel } from "@/components/world-events-panel" // Changed from modal
import { PrestigeModal } from "@/components/modals/prestige-modal"
import { WorldChat } from "@/components/world-chat"
import { TerritoryChart } from "@/components/territory-chart"
import { AbilitySelectionModal } from "@/components/modals/ability-selection-modal"
import { TradePanel } from "@/components/trade-panel" // New import

import type {
  GameState,
  RankedPlayer,
  TerritoryDetails,
  Item,
  Investment,
  Enemy,
  ResourceNode,
  Player,
  Combat,
  Resources,
  ChatMessage,
  Ability,
} from "@/types/game"
import { CONFIG, PLAYER_COLORS, RARITY_SCORES } from "@/lib/constants" // Import RARITY_SCORES
import { STATIC_DATA } from "@/lib/game-data"
import { auth, db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"

// Import initialVentures from EmpireTab for consistent initialization
import { initialVentures as empireInitialVentures } from "@/components/empire-tab"

// Helper to get a random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to get a random map coordinate across the entire map
const getRandomMapCoords = () => {
  const x = getRandomInt(0, CONFIG.MAP_SIZE - 1)
  const y = getRandomInt(0, CONFIG.MAP_SIZE - 1)
  return { x, y }
}

const generateMockLeaderboard = (): RankedPlayer[] => {
  const houses = Object.keys(STATIC_DATA.HOUSES)
  return Array.from({ length: 5 }, (_, i) => ({
    id: `player_mock_${i + 1}`,
    name: `Commander ${["Alpha", "Beta", "Gamma", "Delta", "Epsilon"][i]}`,
    rank: i + 1,
    rankName: ["Grand Patriarch", "Spice Baron", "Desert Warlord", "Guild Agent", "Sand Nomad"][i],
    house: houses[i % houses.length],
    prestigeLevel: Math.floor(Math.random() * 5) + i,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
  })).sort((a, b) => a.rank - b.rank)
}

// Generate a territory for every cell on the map
const generateMockTerritories = (): Record<string, TerritoryDetails> => {
  const territories: Record<string, TerritoryDetails> = {}
  for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
    for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
      const key = `${x},${y}`
      territories[key] = {
        id: `terr_${x}_${y}`,
        x,
        y,
        position: { x, y },
        ownerId: null,
        purchaseCost: 500 + Math.floor(Math.random() * 1500), // Adjusted cost for more territories
        perks: [`+${Math.floor(Math.random() * 5 + 1)}% Spice Production`], // Smaller perks for more territories
        resourceYield: { spice: Math.floor(Math.random() * 3 + 1) }, // Smaller yield
        name: `Sector ${String.fromCharCode(65 + x)}${y + 1}`,
      }
    }
  }
  return territories
}

const generateMockEnemies = (): Record<string, Enemy> => {
  const enemies: Record<string, Enemy> = {}
  const enemyTypes = Object.keys(STATIC_DATA.ENEMIES)
  // Generate more enemies to populate the map
  const numEnemies = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.01) // 1% of map cells have enemies
  for (let i = 0; i < numEnemies; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (enemies[key]) continue // Avoid overwriting existing enemy on same cell
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
    }
  }
  return enemies
}

const generateMockResources = (): Record<string, ResourceNode> => {
  const resources: Record<string, ResourceNode> = {}
  const resourceTypes = ["spice", "water", "plasteel"]
  // Generate more resource nodes
  const numResources = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.02) // 2% of map cells have resources
  for (let i = 0; i < numResources; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (resources[key]) continue // Avoid overwriting existing resource on same cell
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
  const items: Record<string, Item> = {}
  const itemKeys = Object.keys(STATIC_DATA.ITEMS) as Array<keyof typeof STATIC_DATA.ITEMS>
  // Generate more items
  const numItems = Math.floor(CONFIG.MAP_SIZE * CONFIG.MAP_SIZE * 0.005) // 0.5% of map cells have items
  for (let i = 0; i < numItems; i++) {
    const { x, y } = getRandomMapCoords()
    const key = `${x},${y}`
    if (items[key]) continue // Avoid overwriting existing item on same cell
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
  const initialPosition = getRandomMapCoords() // Player spawns randomly
  return {
    id: id,
    name: "Wanderer",
    color: PLAYER_COLORS[prestigeLevel % PLAYER_COLORS.length], // Cycle colors on prestige
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
    basePosition: initialPosition, // Base is also randomized
    house: null,
    rank: 100,
    rankName: "Sand Nomad",
    power: 0,
    prestigeLevel: prestigeLevel,
    globalGainMultiplier: 1 + prestigeLevel * 0.05, // Base 5% per prestige level
    territories: [], // Territories are preserved across prestige
    lifetimeSpice: 0,
    totalEnemiesDefeated: 0,
    energyProductionRate: CONFIG.ENERGY_REGEN_RATE,
    created: Date.now(),
    lastActive: Date.now(),
    investments: {
      ...empireInitialVentures, // Initialize investments with base values from EmpireTab
    },
    spicePerClick: 1,
    spiceClickUpgradeCost: 50,
    unlockedAbilities: [], // Initialize empty
    activeAbility: null, // Initialize null
    isDefending: false, // New: Initialize false
  }
}

const getInitialResourcesState = (): Resources => ({
  spice: 100,
  water: 200,
  solari: 2500,
  plasteel: 150,
  rareMaterials: 10,
  melange: 5,
})

// Generate initial map data once
const initialMapData = {
  enemies: generateMockEnemies(),
  resources: generateMockResources(),
  territories: generateMockTerritories(),
  items: generateMockItems(),
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
    player_2: {
      id: "player_2",
      name: "Rival Duke",
      color: PLAYER_COLORS[1],
      position: { x: 102, y: 101 },
      prestigeLevel: 2,
      house: "harkonnen",
    },
    player_3: {
      id: "player_3",
      name: "Fremen Sietch Leader",
      color: PLAYER_COLORS[2],
      position: { x: 98, y: 99 },
      prestigeLevel: 1,
      house: "fremen",
    },
  },
  worldEvents: [
    {
      id: "event1",
      name: "Minor Spice Bloom",
      icon: "✨",
      description: "Small spice deposit nearby.",
      position: { x: 103, y: 102 },
      endTime: Date.now() + 300000,
    },
  ],
  tradeOffers: [],
  map: initialMapData, // Use the pre-generated map data
  leaderboard: generateMockLeaderboard(),
  isNameModalOpen: true, // Start with name selection
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
}

// Helper to calculate equipment score based on rarity
const calculateEquipmentScore = (equipment: GameState["equipment"]): number => {
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

export default function ArrakisGamePage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [isLoading, setIsLoading] = useState(true)
  const [itemRespawnQueue, setItemRespawnQueue] = useState<Record<string, { item: Item; respawnTime: number }>>({})
  const [availableAbilitiesForSelection, setAvailableAbilitiesForSelection] = useState<Ability[]>([])

  // Ref to track the last time a general notification was shown
  const lastGeneralNotificationTime = useRef(0)
  const GENERAL_NOTIFICATION_COOLDOWN = 1000 // 1 second cooldown for general notifications

  // Ref to hold the latest gameState for intervals without re-triggering effects
  const gameStateRef = useRef(gameState)
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const addNotification = useCallback((message: string, type: GameState["notifications"][0]["type"] = "info") => {
    const now = Date.now()

    // Essential notifications bypass cooldown
    if (type === "legendary" || type === "error" || type === "warning") {
      setGameState((prev) => ({
        ...prev,
        notifications: [...prev.notifications, { id: now.toString(), message, type }],
      }))
      lastGeneralNotificationTime.current = now // Reset general cooldown even for essential
      return
    }

    // For other types (info, success), apply a cooldown
    if (now - lastGeneralNotificationTime.current < GENERAL_NOTIFICATION_COOLDOWN) {
      // Suppress notification if within cooldown period
      return
    }

    setGameState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, { id: now.toString(), message, type }],
    }))
    lastGeneralNotificationTime.current = now
  }, []) // Empty dependency array makes this function stable

  useEffect(() => {
    const initGame = async () => {
      console.log("Initializing game...")
      setIsLoading(true)
      try {
        console.log("Attempting Firebase anonymous sign-in...")
        const userCredential = await signInAnonymously(auth)
        const userId = userCredential.user.uid
        console.log("Firebase signed in anonymously. User ID:", userId)

        const playerDocRef = doc(db, "players", userId)
        console.log("Attempting to fetch player document...")
        const playerDocSnap = await getDoc(playerDocRef)

        if (playerDocSnap.exists()) {
          console.log("Player document found. Loading saved game state.")
          const savedState = playerDocSnap.data() as GameState

          // Reconstruct map territories based on saved player territories
          const newMapTerritories = { ...initialMapData.territories } // Start with a fresh map
          savedState.player.territories.forEach((ownedTerritory) => {
            const key = `${ownedTerritory.x},${ownedTerritory.y}`
            if (newMapTerritories[key]) {
              newMapTerritories[key] = { ...newMapTerritories[key], ...ownedTerritory } // Update ownership
            }
          })

          setGameState((prev) => ({
            ...prev,
            ...savedState, // Load all other saved state
            map: {
              ...initialMapData, // Use initial map data for enemies, resources, items
              territories: newMapTerritories, // Use the reconstructed territories
            },
            // Ensure these are initialized if they weren't saved in older versions
            unlockedAbilities: savedState.player.unlockedAbilities || [],
            activeAbility: savedState.player.activeAbility || null,
            isDefending: savedState.player.isDefending || false,
            abilityCooldowns: savedState.abilityCooldowns || {},
          }))
          addNotification(`Welcome back, ${savedState.player.name}!`, "legendary")
        } else {
          console.log("No player document found. Starting new game.")
          setGameState((prev) => ({
            ...prev,
            player: { ...prev.player, id: userId, unlockedAbilities: [], activeAbility: null, isDefending: false }, // Ensure abilities and isDefending are initialized
            isNameModalOpen: true,
            gameInitialized: false,
            abilityCooldowns: {}, // Initialize cooldowns
          }))
        }
        console.log("Game initialization complete.")
      } catch (error) {
        console.error("Error during game initialization:", error)
        if (error instanceof Error) {
          addNotification(`Failed to load game: ${error.message}. Please check console for details.`, "error")
        } else {
          addNotification("An unknown error occurred during game loading. Please try again.", "error")
        }
      } finally {
        console.log("Setting isLoading to false.")
        setIsLoading(false)
      }
    }
    initGame()
  }, []) // Empty dependency array ensures this runs only once on mount

  // --- Chat Logic ---
  useEffect(() => {
    const q = query(collection(db, "chatMessages"), orderBy("timestamp", "asc"), limit(50))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = []
      snapshot.forEach((doc) => {
        messages.push(doc.data() as ChatMessage)
      })
      setGameState((prev) => ({ ...prev, chatMessages: messages }))
    })

    return () => unsubscribe()
  }, [])

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!gameState.player.id || !gameState.player.name || message.trim() === "") {
        addNotification("Cannot send empty message or player not initialized.", "warning")
        return
      }
      try {
        await addDoc(collection(db, "chatMessages"), {
          senderId: gameState.player.id,
          senderName: gameState.player.name,
          senderColor: gameState.player.color,
          message: message.trim(),
          timestamp: serverTimestamp(),
        })
      } catch (error) {
        console.error("Error sending message:", error)
        addNotification("Failed to send message.", "error")
      }
    },
    [gameState.player.id, gameState.player.name, gameState.player.color, addNotification],
  )

  // --- Ability System Logic ---
  const handleSelectAbility = useCallback(
    (abilityId: string) => {
      setGameState((prev) => {
        const selectedAbility = Object.values(STATIC_DATA.ABILITIES).find((a) => a.id === abilityId)
        if (!selectedAbility) return prev

        const newUnlockedAbilities = [...prev.player.unlockedAbilities, selectedAbility]
        addNotification(`Ability Unlocked: ${selectedAbility.name}!`, "legendary")

        return {
          ...prev,
          player: { ...prev.player, unlockedAbilities: newUnlockedAbilities },
          isAbilitySelectionModalOpen: false,
        }
      })
    },
    [addNotification],
  )

  const handleActivateAbility = useCallback(
    (ability: Ability) => {
      setGameState((prev) => {
        const now = Date.now()
        if (prev.abilityCooldowns[ability.id] && prev.abilityCooldowns[ability.id] > now) {
          addNotification(`Ability ${ability.name} is on cooldown!`, "warning")
          return prev
        }

        const newPlayer = { ...prev.player }
        const newAbilityCooldowns = { ...prev.abilityCooldowns }
        let notificationMessage = ""

        // Apply temporary effects
        switch (ability.effectType) {
          case "attack_boost":
            newPlayer.attack += ability.effectValue
            notificationMessage = `Your attack increased by ${ability.effectValue}!`
            break
          case "defense_boost":
            newPlayer.defense += ability.effectValue
            notificationMessage = `Your defense increased by ${ability.effectValue}!`
            break
          case "crit_boost":
            newPlayer.critChance += ability.effectValue
            notificationMessage = `Your critical chance increased by ${ability.effectValue}%!`
            break
          case "dodge_boost":
            newPlayer.dodgeChance += ability.effectValue
            notificationMessage = `Your dodge chance increased by ${ability.effectValue}%!`
            break
          case "health_regen":
            // For health/energy regen, apply a continuous effect over duration
            // This will be handled in the gameTick
            notificationMessage = `You begin regenerating health and energy!`
            break
          case "energy_regen":
            // For water efficiency/movement, apply a continuous effect over duration
            notificationMessage = `Your water consumption is reduced!`
            break
          case "stun":
            // Stun effect would need to be handled in combat modal directly
            notificationMessage = `You attempt to stun your foe!`
            break
          default:
            break
        }

        newPlayer.activeAbility = ability
        newAbilityCooldowns[ability.id] = now + ability.cooldown

        addNotification(`Activated ${ability.name}! ${notificationMessage}`, "info")

        // Set a timeout to remove the effect
        setTimeout(() => {
          setGameState((currentPrev) => {
            if (currentPrev.player.activeAbility?.id !== ability.id) return currentPrev // Already replaced or removed

            const resetPlayer = { ...currentPrev.player }
            switch (ability.effectType) {
              case "attack_boost":
                resetPlayer.attack = Math.max(0, resetPlayer.attack - ability.effectValue)
                break
              case "defense_boost":
                resetPlayer.defense = Math.max(0, resetPlayer.defense - ability.effectValue)
                break
              case "crit_boost":
                resetPlayer.critChance = Math.max(0, resetPlayer.critChance - ability.effectValue)
                break
              case "dodge_boost":
                resetPlayer.dodgeChance = Math.max(0, resetPlayer.dodgeChance - ability.effectValue)
                break
              default:
                break
            }
            resetPlayer.activeAbility = null
            addNotification(`${ability.name} effect ended.`, "info")
            return { ...currentPrev, player: resetPlayer }
          })
        }, ability.duration)

        return { ...prev, player: newPlayer, abilityCooldowns: newAbilityCooldowns }
      })
    },
    [addNotification],
  )

  // --- Combat Logic ---
  // handleCombatEnd must be declared before handlePlayerAttack, handleEnemyAttack, handleFlee
  const handleCombatEnd = useCallback(
    (
      result: "win" | "lose" | "flee",
      playerState: Player,
      enemyInstance: Enemy,
      combatState: Combat,
      resourcesState: Resources,
      mapState: GameState["map"],
    ) => {
      const newPlayer = { ...playerState }
      const newResources = { ...resourcesState }
      const newMap = { ...mapState, enemies: { ...mapState.enemies } }
      const updatedInventory = [...gameState.inventory] // Correctly access top-level inventory from closure

      if (result === "win") {
        // Grant XP
        let xpGained = enemyInstance.xp
        // Apply global gain multiplier from prestige
        xpGained = Math.floor(xpGained * newPlayer.globalGainMultiplier)

        // Apply house bonus if Atreides
        if (newPlayer.house === "atreides") {
          xpGained = Math.floor(xpGained * 1.25) // +25% XP gain
        }

        newPlayer.experience += xpGained
        if (newPlayer.experience >= newPlayer.experienceToNext) {
          newPlayer.level++
          newPlayer.experience -= newPlayer.experienceToNext
          newPlayer.experienceToNext = Math.floor(newPlayer.experienceToNext * CONFIG.XP_FACTOR)
          newPlayer.maxHealth += 15
          newPlayer.health = newPlayer.maxHealth
          newPlayer.maxEnergy += 8
          newPlayer.energy = newPlayer.maxEnergy
          newPlayer.attack += 3
          newPlayer.defense += 2
          addNotification(`You leveled up to Level ${newPlayer.level}!`, "legendary")

          // Check for ability unlock
          if (newPlayer.level % 5 === 0 && newPlayer.level <= 25) {
            const allAbilities = Object.values(STATIC_DATA.ABILITIES)
            const unlearnedAbilities = allAbilities.filter(
              (ability) =>
                ability.levelRequired <= newPlayer.level &&
                !newPlayer.unlockedAbilities.some((ua) => ua.id === ability.id),
            )

            if (unlearnedAbilities.length > 0) {
              // Select 3 random unique abilities, or fewer if not enough
              const abilitiesToOffer: Ability[] = []
              const shuffled = [...unlearnedAbilities].sort(() => 0.5 - Math.random())
              for (let i = 0; i < Math.min(3, shuffled.length); i++) {
                abilitiesToOffer.push(shuffled[i])
              }
              setAvailableAbilitiesForSelection(abilitiesToOffer)
              setGameState((prev) => ({ ...prev, isAbilitySelectionModalOpen: true }))
            }
          }
        }

        // Grant Loot (resources)
        Object.entries(enemyInstance.loot).forEach(([resource, amount]) => {
          if (resource in newResources) (newResources as any)[resource] += amount
        })

        // Grant Loot (items)
        const availableItems = Object.values(STATIC_DATA.ITEMS)
        const droppedItems: Item[] = []
        availableItems.forEach((itemData) => {
          if (itemData.dropChance && Math.random() < itemData.dropChance) {
            droppedItems.push(itemData)
          }
        })

        if (droppedItems.length > 0) {
          droppedItems.forEach((droppedItem) => {
            const emptySlotIndex = updatedInventory.findIndex((slot) => slot === null)
            if (emptySlotIndex !== -1) {
              updatedInventory[emptySlotIndex] = droppedItem
              addNotification(`You found a ${droppedItem.icon} ${droppedItem.name}!`, "success")
            } else {
              addNotification(`Inventory full! Could not pick up ${droppedItem.name}.`, "warning")
            }
          })
        }

        // Put enemy on cooldown
        const enemyKey = `${enemyInstance.position.x},${enemyInstance.position.y}`
        newMap.enemies[enemyKey] = { ...enemyInstance, cooldownUntil: Date.now() + CONFIG.ENEMY_COOLDOWN }
      } else if (result === "lose") {
        // Player respawns at base with half health
        newPlayer.position = { ...newPlayer.basePosition }
        newPlayer.health = Math.floor(newPlayer.maxHealth / 2)
        addNotification("You respawned at your base.", "info")
      }

      // Reset combat state
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
        ...gameState, // Use gameState to ensure other parts of state are preserved
        player: newPlayer,
        resources: newResources,
        map: newMap,
        combat: resetCombat,
        isCombatModalOpen: false,
        inventory: updatedInventory, // Return updated inventory
      }
    },
    [addNotification, gameState], // Depend on gameState to access its full state
  )

  const handlePlayerAttack = useCallback(
    (damage: number, isCrit: boolean, miniGameSuccess: boolean) => {
      setGameState((prev) => {
        if (!prev.combat.active || !prev.combat.enemy || prev.combat.turn !== "player") return prev // Ensure it's player's turn

        const newCombat = { ...prev.combat }
        const newEnemy = { ...newCombat.enemy } // This creates a shallow copy of the enemy object
        const newPlayer = { ...prev.player, isDefending: false } // Reset defending state

        // Apply active ability effects to player's outgoing damage
        let finalDamage = damage
        if (newPlayer.activeAbility?.effectType === "attack_boost") {
          finalDamage = Math.floor(finalDamage * (1 + newPlayer.activeAbility.effectValue / 100))
        }
        // If "The Voice" is active, it debuffs the enemy's defense
        if (newPlayer.activeAbility?.effectType === "attack_boost" && newPlayer.activeAbility.id === "theVoice") {
          newEnemy.defense = Math.max(0, newEnemy.defense + STATIC_DATA.ABILITIES.theVoice.effectValue) // effectValue is negative for debuff
        }

        newEnemy.currentHealth = Math.max(0, newEnemy.currentHealth - finalDamage)
        console.log(`[DEBUG] Enemy health after player attack: ${newEnemy.currentHealth}`) // Debug log
        newCombat.enemy = newEnemy // Crucial: Update the enemy object in newCombat
        newCombat.log.push(
          `<p class="log-player">You attacked ${newEnemy.name} for <span class="${isCrit ? "log-crit" : ""}">${finalDamage}</span> damage!${isCrit ? " (Critical Hit!)" : ""}</p>`,
        )

        if (newEnemy.currentHealth <= 0) {
          // Enemy defeated
          newCombat.log.push(`<p class="log-info">${newEnemy.name} has been defeated!</p>`)
          addNotification(`${newEnemy.name} defeated!`, "success")
          return handleCombatEnd("win", newPlayer, newEnemy, newCombat, prev.resources, prev.map)
        } else {
          // Continue combat, switch to enemy turn
          newCombat.turn = "enemy"
          newCombat.combatRound++
          return { ...prev, combat: newCombat, player: newPlayer }
        }
      })
    },
    [addNotification, handleCombatEnd],
  )

  const handleDefend = useCallback(() => {
    setGameState((prev) => {
      if (!prev.combat.active || prev.combat.turn !== "player") return prev

      const newCombat = { ...prev.combat }
      const newPlayer = { ...prev.player, isDefending: true } // Set defending state
      newCombat.log.push(`<p class="log-player">You brace for impact, increasing your defense!</p>`)
      newCombat.turn = "enemy"
      newCombat.combatRound++
      addNotification("You chose to Defend!", "info")
      return { ...prev, combat: newCombat, player: newPlayer }
    })
  }, [addNotification])

  const handleEnemyAttack = useCallback(
    (damage: number, isDodge: boolean) => {
      setGameState((prev) => {
        if (!prev.combat.active || !prev.combat.enemy || prev.combat.turn !== "enemy") return prev // Ensure it's enemy's turn

        const newCombat = { ...prev.combat }
        const newPlayer = { ...prev.player, isDefending: false } // Reset defending state after enemy attacks
        const enemyInstance = newCombat.enemy! // Ensure enemy is not null

        // Apply active ability effects to player's incoming damage / dodge chance
        let finalDamage = damage
        let currentIsDodge = isDodge

        if (newPlayer.activeAbility?.effectType === "defense_boost") {
          finalDamage = Math.max(0, finalDamage - newPlayer.activeAbility.effectValue)
        }
        if (newPlayer.activeAbility?.effectType === "dodge_boost") {
          // Increase effective dodge chance
          currentIsDodge = currentIsDodge || Math.random() * 100 < newPlayer.activeAbility.effectValue
        }
        // If "The Voice" was active, enemy's attack might have been debuffed
        if (newPlayer.activeAbility?.effectType === "attack_boost" && newPlayer.activeAbility.id === "theVoice") {
          finalDamage = Math.max(
            0,
            finalDamage + (STATIC_DATA.ABILITIES.theVoice.effectValue / 100) * enemyInstance.attack,
          )
        }

        // Apply Defend action bonus
        let defenseBonus = 0
        if (prev.player.isDefending) {
          defenseBonus = Math.floor(newPlayer.defense * 0.5) // Example: +50% of player's defense
          newCombat.log.push(`<p class="log-info">Your defense held strong!</p>`)
        }
        finalDamage = Math.max(0, finalDamage - defenseBonus)

        if (currentIsDodge) {
          newCombat.log.push(
            `<p class="log-enemy">${enemyInstance.name} attacked, but you <span class="log-dodge">dodged</span> the attack!</p>`,
          )
        } else {
          newPlayer.health = Math.max(0, newPlayer.health - finalDamage)
          console.log(`[DEBUG] Player health after enemy attack: ${newPlayer.health}`) // Debug log
          newCombat.log.push(`<p class="log-enemy">${enemyInstance.name} attacked you for ${finalDamage} damage!</p>`)
        }

        if (newPlayer.health <= 0) {
          // Player defeated
          newCombat.log.push(`<p class="log-error">You have been defeated by ${newCombat.enemy!.name}!</p>`)
          addNotification("You have been defeated!", "error")
          return handleCombatEnd("lose", newPlayer, newCombat.enemy, newCombat, prev.resources, prev.map)
        } else {
          newCombat.turn = "player"
          newCombat.combatRound++
          return { ...prev, combat: newCombat, player: newPlayer }
        }
      })
    },
    [addNotification, handleCombatEnd],
  )

  const handleFlee = useCallback(
    (success: boolean) => {
      setGameState((prev) => {
        if (!prev.combat.active || !prev.combat.enemy || prev.combat.turn !== "player") return prev // Ensure it's player's turn

        const newCombat = { ...prev.combat }
        const newPlayer = { ...prev.player, isDefending: false } // Reset defending state

        if (success) {
          newCombat.log.push(`<p class="log-info">You successfully fled from ${newCombat.enemy.name}.</p>`)
          addNotification("Successfully fled from combat.", "info")
          return handleCombatEnd("flee", newPlayer, newCombat.enemy, newCombat, prev.resources, prev.map)
        } else {
          newCombat.log.push(`<p class="log-error">Failed to flee! ${newCombat.enemy.name} gets a free attack!</p>`)
          addNotification("Flee attempt failed!", "error")
          // Enemy gets a free attack
          let enemyDamage = Math.max(
            1,
            newCombat.enemy.attack -
              (newPlayer.equipment?.armor?.defense || 0) -
              (newPlayer.equipment?.accessory?.defense || 0),
          )
          // Apply active ability effects to player's incoming damage
          if (newPlayer.activeAbility?.effectType === "defense_boost") {
            enemyDamage = Math.max(0, enemyDamage - newPlayer.activeAbility.effectValue)
          }
          if (newPlayer.activeAbility?.effectType === "attack_boost" && newPlayer.activeAbility.id === "theVoice") {
            enemyDamage = Math.max(0, enemyDamage + (STATIC_DATA.ABILITIES.theVoice.effectValue / 100) * enemyDamage)
          }

          newPlayer.health = Math.max(0, newPlayer.health - enemyDamage)
          console.log(`[DEBUG] Player health after failed flee attack: ${newPlayer.health}`) // Debug log
          newCombat.log.push(`<p class="log-enemy">${newCombat.enemy.name} strikes you for ${enemyDamage} damage!</p>`)

          if (newPlayer.health <= 0) {
            newCombat.log.push(`<p class="log-error">You have been defeated by ${newCombat.enemy!.name}!</p>`)
            addNotification("You have been defeated!", "error")
            return handleCombatEnd("lose", newPlayer, newCombat.enemy, newCombat, prev.resources, prev.map)
          } else {
            newCombat.turn = "enemy" // After failed flee, it's enemy's turn
            newCombat.combatRound++
            return { ...prev, combat: newCombat, player: newPlayer }
          }
        }
      })
    },
    [addNotification, handleCombatEnd],
  )

  // --- Onboarding Logic ---
  const handleNameSubmit = useCallback((name: string) => {
    setGameState((prev) => ({
      ...prev,
      player: { ...prev.player, name },
      isNameModalOpen: false,
      isHouseModalOpen: true, // Open house selection next
    }))
  }, [])

  const handleHouseSelect = useCallback(
    (houseKey: string) => {
      const houseData = STATIC_DATA.HOUSES[houseKey as keyof typeof STATIC_DATA.HOUSES]
      const houseColor = houseData.color.replace("house-", "") as Player["color"] // Extract color string

      setGameState((prev) => {
        const newPlayer = {
          ...prev.player,
          house: houseKey,
          color: houseColor,
          // Apply starting bonuses to resources and player stats
          resources: {
            ...prev.resources,
            ...(houseData.startingBonus.solari && { solari: prev.resources.solari + houseData.startingBonus.solari }),
            ...(houseData.startingBonus.spice && { spice: prev.resources.spice + houseData.startingBonus.spice }),
            ...(houseData.startingBonus.water && { water: prev.resources.water + houseData.startingBonus.water }),
            ...(houseData.startingBonus.plasteel && {
              plasteel: prev.resources.plasteel + houseData.startingBonus.plasteel,
            }),
            ...(houseData.startingBonus.rareMaterials && {
              rareMaterials: prev.resources.rareMaterials + houseData.startingBonus.rareMaterials,
            }),
            ...(houseData.startingBonus.melange && {
              melange: prev.resources.melange + houseData.startingBonus.melange,
            }),
          },
          attack: prev.player.attack + (houseData.startingBonus.attack || 0),
          defense: prev.player.defense + (houseData.startingBonus.defense || 0),
          experience: prev.player.experience + (houseData.startingBonus.xp || 0),
        }

        // Send new player announcement to chat
        handleSendMessage(`${newPlayer.name} has joined House ${houseData.name}!`)

        return {
          ...prev,
          player: newPlayer,
          isHouseModalOpen: false,
          gameInitialized: true, // Game is fully initialized after house selection
        }
      })
      addNotification(`Welcome to Arrakis, ${gameStateRef.current.player.name}! The Spice must flow.`, "legendary")
    },
    [addNotification, handleSendMessage],
  )

  // --- Prestige Logic ---
  const handlePrestige = useCallback(() => {
    setGameState((prev) => {
      if (prev.player.level < 20) {
        addNotification("You must reach Level 20 to Prestige!", "warning")
        return prev
      }

      const currentSolari = prev.resources.solari
      // Calculate prestige bonus: 1% bonus for every 10,000 Solari, capped at 50%
      const solariBonus = Math.min(0.5, Math.floor(currentSolari / 10000) * 0.01)
      const newPrestigeLevel = prev.player.prestigeLevel + 1
      const cumulativeBasePrestigeBonus = newPrestigeLevel * 0.05 // Base 5% per prestige level
      const totalPrestigeMultiplier = 1 + solariBonus + cumulativeBasePrestigeBonus // This is the total multiplier for the *new* game cycle.

      const newPlayerId = prev.player.id // Preserve player ID

      // Reset player stats, resources, inventory, equipment, and map elements
      const resetPlayer = getInitialPlayerState(newPlayerId, newPrestigeLevel) // This will set base globalGainMultiplier
      resetPlayer.globalGainMultiplier = totalPrestigeMultiplier // Override with calculated total

      // Apply prestige bonus to new player stats and resources
      resetPlayer.attack = Math.floor(resetPlayer.attack * totalPrestigeMultiplier)
      resetPlayer.defense = Math.floor(resetPlayer.defense * totalPrestigeMultiplier)
      resetPlayer.maxHealth = Math.floor(resetPlayer.maxHealth * totalPrestigeMultiplier)
      resetPlayer.health = resetPlayer.maxHealth
      resetPlayer.maxEnergy = Math.floor(resetPlayer.maxEnergy * totalPrestigeMultiplier)
      resetPlayer.energy = resetPlayer.maxEnergy
      resetPlayer.spicePerClick = Math.floor(resetPlayer.spicePerClick * totalPrestigeMultiplier)
      resetPlayer.spiceClickUpgradeCost = Math.floor(resetPlayer.spiceClickUpgradeCost / totalPrestigeMultiplier) // Make upgrades cheaper

      const resetResources = getInitialResourcesState()
      resetResources.solari = Math.floor(resetResources.solari * totalPrestigeMultiplier)
      resetResources.spice = Math.floor(resetResources.spice * totalPrestigeMultiplier)
      resetResources.water = Math.floor(resetResources.water * totalPrestigeMultiplier)
      resetResources.plasteel = Math.floor(resetResources.plasteel * totalPrestigeMultiplier)
      resetResources.rareMaterials = Math.floor(resetResources.rareMaterials * totalPrestigeMultiplier)
      resetResources.melange = Math.floor(resetResources.melange * totalPrestigeMultiplier)

      // Preserve house and territories
      resetPlayer.house = prev.player.house
      resetPlayer.territories = prev.player.territories
      resetPlayer.unlockedAbilities = prev.player.unlockedAbilities // Preserve unlocked abilities
      resetPlayer.activeAbility = null // Reset active ability on prestige
      resetPlayer.isDefending = false // Reset defending state
      const resetAbilityCooldowns: Record<string, number> = {} // Reset cooldowns

      addNotification(
        `Prestige ${newPrestigeLevel} achieved! All progress reset for a ${((totalPrestigeMultiplier - 1) * 100).toFixed(1)}% overall bonus!`,
        "legendary",
      )

      const resetEquipment = { weapon: null, armor: null, accessory: null }
      const resetInventory = new Array(CONFIG.MAX_INVENTORY).fill(null)
      // When prestiging, regenerate the map elements (enemies, resources, items)
      const resetMap = {
        enemies: generateMockEnemies(),
        resources: generateMockResources(),
        territories: generateMockTerritories(), // Re-generate all territories
        items: generateMockItems(),
      }

      return {
        ...initialGameState, // Start with a clean slate for most things
        player: resetPlayer,
        resources: resetResources,
        equipment: resetEquipment,
        inventory: resetInventory,
        map: resetMap,
        isPrestigeModalOpen: false,
        gameInitialized: true, // Ensure game remains initialized
        abilityCooldowns: resetAbilityCooldowns,
      }
    })
  }, [addNotification])

  // Game Loop
  useEffect(() => {
    const gameTick = setInterval(() => {
      // Access latest state via ref for intervals
      const currentGameState = gameStateRef.current
      if (
        !currentGameState.gameInitialized ||
        isLoading ||
        currentGameState.isCombatModalOpen ||
        currentGameState.isAbilitySelectionModalOpen
      )
        return // Pause tick during modals

      setGameState((prev) => {
        const now = Date.now()
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }
        const newMap = {
          ...prev.map,
          enemies: { ...prev.map.enemies },
          resources: { ...prev.map.resources },
          items: { ...prev.map.items },
        }
        const newAbilityCooldowns = { ...prev.abilityCooldowns }

        // Energy Regen
        if (now - prev.lastEnergyRegen >= CONFIG.ENERGY_REGEN_INTERVAL) {
          let energyRegenRate = newPlayer.energyProductionRate
          if (newPlayer.activeAbility?.effectType === "energy_regen") {
            // Example: Sandwalk reduces water consumption, but for energy regen, let's say it boosts it
            energyRegenRate = Math.floor(energyRegenRate * (1 + newPlayer.activeAbility.effectValue / 100))
          }
          newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + energyRegenRate)
          // No direct mutation of prev.lastEnergyRegen here, it's handled in the return
        }

        // Health Regen from abilities
        if (newPlayer.activeAbility?.effectType === "health_regen") {
          const healthRegenAmount = Math.floor(newPlayer.maxHealth * (newPlayer.activeAbility.effectValue / 100))
          newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health + healthRegenAmount)
        }

        // Cooldowns & Respawns (simple version)
        Object.entries(newMap.enemies).forEach(([key, enemy]) => {
          if (enemy.cooldownUntil && now >= enemy.cooldownUntil) {
            const originalEnemyData = STATIC_DATA.ENEMIES[enemy.type as keyof typeof STATIC_DATA.ENEMIES]
            newMap.enemies[key] = { ...enemy, currentHealth: originalEnemyData.health, cooldownUntil: null } // Set to null
          }
        })
        Object.entries(newMap.resources).forEach(([key, resourceNode]) => {
          if (resourceNode.cooldownUntil && now >= resourceNode.cooldownUntil) {
            // Re-spawn logic for resource nodes
            const { x, y } = getRandomMapCoords() // Respawn at a new random location
            const newResourceKey = `${x},${y}`
            const resourceTypes = ["spice", "water", "plasteel"]
            const newType = resourceTypes[getRandomInt(0, resourceTypes.length - 1)]

            newMap.resources[newResourceKey] = {
              id: `res_${newResourceKey}`,
              type: newType,
              amount: Math.floor(Math.random() * 50) + 10,
              position: { x, y },
              icon: newType === "spice" ? "✨" : newType === "water" ? "💧" : "🔧",
              cooldownUntil: null,
            }
            delete newMap.resources[key] // Remove the old depleted node
            addNotification(`A new ${newType} node appeared at (${x},${y})!`, "info")
          }
        })

        // Item Respawn Logic
        const newRespawnQueue = { ...itemRespawnQueue } // Create a mutable copy
        Object.entries(newRespawnQueue).forEach(([itemId, { item, respawnTime }]) => {
          if (now >= respawnTime) {
            const { x, y } = getRandomMapCoords()
            const newKey = `${x},${y}`
            newMap.items[newKey] = { ...item, id: `item_${newKey}` } // Assign new ID based on new coords
            addNotification(`An item (${item.name}) has respawned at (${x},${y}).`, "info")
            delete newRespawnQueue[itemId] // Remove from the queue
          }
        })
        setItemRespawnQueue(newRespawnQueue)

        // Territory Income & Investment Income
        newPlayer.territories.forEach((t) => {
          if (t.resourceYield?.solari) newResources.solari += t.resourceYield.solari / (60000 / 1000)
          if (t.resourceYield?.spice) newResources.spice += t.resourceYield.spice / (60000 / 1000)
          if (t.resourceYield?.water) newResources.water += t.resourceYield.water / (60000 / 1000)
          if (t.resourceYield?.plasteel) newResources.plasteel += t.resourceYield.plasteel / (60000 / 1000)
          if (t.resourceYield?.rareMaterials)
            newResources.rareMaterials += t.resourceYield.rareMaterials / (60000 / 1000)
          if (t.resourceYield?.melange) newResources.melange += t.resourceYield.melange / (60000 / 1000)
        })
        if (newPlayer.investments) {
          Object.values(newPlayer.investments).forEach((inv) => {
            if (inv.level > 0) {
              // Apply production based on venture type
              if (inv.name.includes("Spice Harvester")) newResources.spice += inv.productionRate / (60000 / 1000)
              else if (inv.name.includes("Processing Plant"))
                newResources.melange += inv.productionRate / (60000 / 1000)
              else if (inv.name.includes("Trade Routes")) newResources.solari += inv.productionRate / (60000 / 1000)
            }
          })
        }

        // Update ability cooldowns
        for (const abilityId in newAbilityCooldowns) {
          if (newAbilityCooldowns[abilityId] <= now) {
            delete newAbilityCooldowns[abilityId]
          }
        }

        // Calculate new rank score
        const equipmentScore = calculateEquipmentScore(prev.equipment)
        const newRankScore =
          newResources.solari * 0.1 + // Solari contributes
          equipmentScore * 500 + // Equipment rarity contributes significantly
          newPlayer.prestigeLevel * 1000 + // Prestige contributes
          newPlayer.territories.length * 200 // Territories contribute

        newPlayer.rank = Math.max(1, 100 - Math.floor(newRankScore / 1000)) // Scale to 1-100
        newPlayer.rankName =
          newPlayer.rank < 10 ? "Spice Baron" : newPlayer.rank < 50 ? "Guild Associate" : "Sand Nomad"

        return {
          ...prev,
          player: newPlayer,
          resources: newResources,
          map: newMap,
          lastEnergyRegen: now, // Always update lastEnergyRegen to now
          leaderboard: prev.leaderboard
            .map((p) => (p.id === newPlayer.id ? { ...p, rank: newPlayer.rank, rankName: newPlayer.rankName } : p))
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 5),
          abilityCooldowns: newAbilityCooldowns,
        }
      })
    }, 1000)

    // Save game state to Firebase periodically
    const saveGameInterval = setInterval(async () => {
      const currentGameState = gameStateRef.current // Access latest state via ref
      if (currentGameState.player.id && currentGameState.gameInitialized) {
        try {
          // Create a stripped-down state object for saving
          const { map: _, ...stateToSave } = currentGameState // Exclude map from saving
          await setDoc(doc(db, "players", currentGameState.player.id), stateToSave)
          console.log("Game state saved to Firebase.")
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
      clearInterval(gameTick)
      clearInterval(saveGameInterval)
    }
  }, []) // Empty dependency array ensures this runs only once on mount

  const attemptPlayerAction = useCallback(
    (targetX: number, targetY: number) => {
      setGameState((prev) => {
        const { player, resources, map } = prev
        const dx = targetX - player.position.x
        const dy = targetY - player.position.y
        const key = `${targetX},${targetY}`
        const enemyOnCell = map.enemies[key]
        const resourceOnCell = map.resources[key]
        // const territoryOnCell = map.territories[key] // No longer directly handled here
        const itemOnCell = map.items[key] // New: Check for items

        // If combat is active, prevent any other actions
        if (prev.isCombatModalOpen || prev.isAbilitySelectionModalOpen) {
          addNotification("Cannot perform action during active modal!", "warning")
          return prev
        }

        // Movement cost
        let waterCost = 1
        if (player.activeAbility?.id === "sandwalk" && player.activeAbility.effectType === "energy_regen") {
          waterCost = Math.max(0, waterCost - (waterCost * player.activeAbility.effectValue) / 100)
        }

        // Only apply movement cost if actually moving
        const isMoving = dx !== 0 || dy !== 0
        if (resources.water < waterCost && isMoving) {
          addNotification("Not enough water to move!", "warning")
          return prev
        }

        const newPlayer = { ...player }
        const newResources = { ...resources }
        const newMap = { ...map, enemies: { ...map.enemies }, resources: { ...map.resources }, items: { ...map.items } }
        const updatedInventory = [...prev.inventory] // Access top-level inventory

        // Handle movement first
        if (isMoving) {
          newPlayer.position = { x: targetX, y: targetY }
          newResources.water -= waterCost
        }

        // Interaction logic for the target cell (whether moved or clicked on current cell)
        if (enemyOnCell && !enemyOnCell.cooldownUntil && (isMoving || (dx === 0 && dy === 0))) {
          // Scale enemy stats based on player level
          const originalEnemyData = STATIC_DATA.ENEMIES[enemyOnCell.type as keyof typeof STATIC_DATA.ENEMIES]
          let targetEnemyLevel = player.level // Default to player's level

          if (originalEnemyData.boss) {
            targetEnemyLevel = Math.max(1, player.level + getRandomInt(0, 2)) // Bosses can be player level + 0-2
          } else if (originalEnemyData.special) {
            targetEnemyLevel = Math.max(1, player.level + getRandomInt(0, 1)) // Special enemies can be player level + 0-1
          } else {
            targetEnemyLevel = Math.max(1, player.level - getRandomInt(0, 1)) // Regular enemies are player level or 1 lower
          }

          const levelDifference = targetEnemyLevel - originalEnemyData.level
          const scalingMultiplier = 1 + levelDifference * CONFIG.ENEMY_SCALING_FACTOR

          const scaledEnemy: Enemy = {
            ...enemyOnCell,
            level: targetEnemyLevel,
            health: Math.floor(originalEnemyData.health * scalingMultiplier),
            currentHealth: Math.floor(originalEnemyData.health * scalingMultiplier),
            attack: Math.floor(originalEnemyData.attack * scalingMultiplier),
            defense: Math.floor(originalEnemyData.defense * scalingMultiplier),
            xp: Math.floor(originalEnemyData.xp * scalingMultiplier),
            loot: Object.fromEntries(
              Object.entries(originalEnemyData.loot).map(([res, amount]) => [
                res,
                Math.floor(amount * scalingMultiplier),
              ]),
            ),
          }

          // Initiate combat
          addNotification(`Engaging ${scaledEnemy.name} (Lv.${scaledEnemy.level})!`, "info")
          return {
            ...prev,
            player: { ...newPlayer, isDefending: false }, // Reset defending state
            resources: newResources,
            isCombatModalOpen: true,
            combat: {
              active: true,
              enemy: scaledEnemy, // Use scaled enemy
              turn: "player", // Always start with player turn
              log: [`<p class="log-info">You encountered a ${scaledEnemy.name} (Lv.${scaledEnemy.level})!</p>`],
              playerHealthAtStart: newPlayer.health,
              enemyHealthAtStart: scaledEnemy.health,
              combatRound: 1,
            },
          }
        } else if (resourceOnCell && !resourceOnCell.cooldownUntil && (isMoving || (dx === 0 && dy === 0))) {
          let amountHarvested = Math.min(resourceOnCell.amount, 10)
          // Apply active ability effects to resource gathering
          if (player.activeAbility?.id === "spiceTrance" && player.activeAbility.effectType === "attack_boost") {
            amountHarvested = Math.floor(amountHarvested * (1 + player.activeAbility.effectValue / 100))
          }
          ;(newResources as any)[resourceOnCell.type] += amountHarvested
          addNotification(`Harvested ${amountHarvested} ${resourceOnCell.type}.`, "success")
          newMap.resources[key] = {
            ...resourceOnCell,
            amount: resourceOnCell.amount - amountHarvested,
            cooldownUntil:
              resourceOnCell.amount - amountHarvested <= 0 ? Date.now() + CONFIG.RESOURCE_DEPLETED_COOLDOWN : null, // Set to null if not depleted
          }
          if (newMap.resources[key].amount <= 0) {
            addNotification(`${resourceOnCell.type} node depleted.`, "info")
            newMap.resources[key].cooldownUntil = Date.now() + CONFIG.RESOURCE_DEPLETED_COOLDOWN
          }
        } else if (itemOnCell && (isMoving || (dx === 0 && dy === 0))) {
          // Pick up item
          const emptySlotIndex = updatedInventory.findIndex((slot) => slot === null)

          if (emptySlotIndex !== -1) {
            updatedInventory[emptySlotIndex] = itemOnCell
            delete newMap.items[key] // Remove item from map
            setItemRespawnQueue((prevQueue) => ({
              ...prevQueue,
              [itemOnCell.id!]: { item: itemOnCell, respawnTime: Date.now() + CONFIG.ITEM_RESPAWN_COOLDOWN },
            }))
            addNotification(`Picked up ${itemOnCell.icon} ${itemOnCell.name}.`, "success")
          } else {
            addNotification("Inventory is full! Could not pick up item.", "warning")
            return prev // Don't move if inventory is full and it's an item
          }
        }
        // Removed territory modal opening from here. It's now handled by handleMapCellClick.

        return { ...prev, player: newPlayer, resources: newResources, map: newMap, inventory: updatedInventory }
      })
    },
    [addNotification, itemRespawnQueue, handleCombatEnd],
  )

  // WASD Controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !gameState.gameInitialized ||
        isLoading ||
        gameState.isCombatModalOpen ||
        gameState.isNameModalOpen ||
        gameState.isHouseModalOpen ||
        gameState.isPrestigeModalOpen ||
        gameState.isAbilitySelectionModalOpen
      )
        return // Disable controls during modals
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return
      }

      let { x, y } = gameState.player.position
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
        // Ensure coordinates stay within map bounds
        const newX = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, x))
        const newY = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, y))
        attemptPlayerAction(newX, newY)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    gameState.gameInitialized,
    isLoading,
    gameState.player.position,
    gameState.isCombatModalOpen,
    gameState.isNameModalOpen,
    gameState.isHouseModalOpen,
    gameState.isPrestigeModalOpen,
    gameState.isAbilitySelectionModalOpen,
    attemptPlayerAction,
  ])

  const handleTabChange = useCallback((tab: string) => {
    setGameState((prev) => ({ ...prev, currentTab: tab }))
  }, [])

  const handleMapCellClick = useCallback(
    (x: number, y: number) => {
      setGameState((prev) => {
        const key = `${x},${y}`
        const territoryOnCell = prev.map.territories[key]

        if (territoryOnCell && !territoryOnCell.ownerId) {
          // If it's an unowned territory, open the modal
          return { ...prev, selectedTerritoryCoords: { x, y }, isTerritoryModalOpen: true }
        } else {
          // Otherwise, proceed with the general action logic (movement, combat, resource, item)
          // This will also handle clicking on an owned territory or an empty cell to move.
          attemptPlayerAction(x, y)
          return prev // Return previous state as attemptPlayerAction will handle state update
        }
      })
    },
    [attemptPlayerAction],
  )

  const handlePurchaseTerritory = useCallback(
    (territoryId: string, cost: number) => {
      setGameState((prev) => {
        const key = Object.keys(prev.map.territories).find((k) => prev.map.territories[k].id === territoryId)
        if (!key) {
          addNotification("Territory not found.", "error")
          return prev
        }
        const territoryToBuy = prev.map.territories[key]

        // Removed adjacency check for purchasing territories
        // const dx = Math.abs(territoryToBuy.position.x - prev.player.position.x)
        // const dy = Math.abs(territoryToBuy.position.y - prev.player.position.y)
        // if (dx > 1 || dy > 1) {
        //   addNotification("Territory is too far to purchase.", "warning")
        //   return prev
        // }

        if (prev.resources.solari < cost) {
          addNotification("Not enough Solari to purchase territory.", "error")
          return prev
        }

        const purchasedTerritory = {
          ...territoryToBuy,
          ownerId: prev.player.id,
          ownerName: prev.player.name,
          ownerColor: prev.player.color,
        }
        addNotification(`Territory ${purchasedTerritory.name || key} purchased!`, "success")
        return {
          ...prev,
          resources: { ...prev.resources, solari: prev.resources.solari - cost },
          player: { ...prev.player, territories: [...prev.player.territories, purchasedTerritory] },
          map: { ...prev.map, territories: { ...prev.map.territories, [key]: purchasedTerritory } },
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
        const newInventory = [...prev.inventory] // Correctly accessing top-level inventory
        const newEquipment = { ...prev.equipment }
        const equipSlot = item.type as keyof GameState["equipment"]

        if (!["weapon", "armor", "accessory"].includes(equipSlot)) {
          addNotification("This item is not equippable.", "warning")
          return prev
        }

        const currentEquipped = newEquipment[equipSlot]
        newEquipment[equipSlot] = item
        newInventory[inventoryIndex] = currentEquipped

        const newPlayerStats = { ...prev.player }
        if (currentEquipped?.attack) newPlayerStats.attack -= currentEquipped.attack
        if (currentEquipped?.defense) newPlayerStats.defense -= currentEquipped.defense
        if (item.attack) newPlayerStats.attack += item.attack
        if (item.defense) newPlayerStats.defense += item.defense

        addNotification(`${item.name} equipped.`, "success")
        return { ...prev, inventory: newInventory, equipment: newEquipment, player: newPlayerStats }
      })
    },
    [addNotification],
  )

  const handleInvestInVenture = useCallback(
    (ventureId: string) => {
      setGameState((prev) => {
        const venture = prev.player.investments?.[ventureId]
        if (!venture || prev.resources.solari < venture.costToUpgrade) {
          addNotification("Cannot afford upgrade or venture does not exist.", "error")
          return prev
        }

        const upgradedVenture: Investment = {
          ...venture,
          level: venture.level + 1,
          costToUpgrade: Math.floor(venture.costToUpgrade * 1.8),
          // Production rate now scales from its current value, which is initialized correctly
          productionRate: Math.floor(venture.productionRate * 1.5),
        }
        addNotification(`${venture.name} upgraded to Level ${upgradedVenture.level}!`, "success")
        return {
          ...prev,
          resources: { ...prev.resources, solari: prev.resources.solari - venture.costToUpgrade },
          player: { ...prev.player, investments: { ...(prev.player.investments || {}), [ventureId]: upgradedVenture } },
        }
      })
    },
    [addNotification],
  )

  const handleGenerateSpice = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      resources: { ...prev.resources, spice: prev.resources.spice + prev.player.spicePerClick },
    }))
    addNotification(`+${gameStateRef.current.player.spicePerClick} Spice gathered!`, "success")
  }, [addNotification])

  const handleUpgradeSpiceClick = useCallback(() => {
    setGameState((prev) => {
      if (prev.resources.solari < prev.player.spiceClickUpgradeCost) {
        addNotification("Not enough Solari to upgrade gatherer.", "warning")
        return prev
      }
      addNotification("Spice Gatherer upgraded!", "success")
      return {
        ...prev,
        resources: { ...prev.resources, solari: prev.resources.solari - prev.player.spiceClickUpgradeCost },
        player: {
          ...prev.player,
          spicePerClick: prev.player.spicePerClick + Math.max(1, Math.floor(prev.player.spicePerClick * 0.2)),
          spiceClickUpgradeCost: Math.floor(prev.player.spiceClickUpgradeCost * 1.75),
        },
      }
    })
  }, [addNotification])

  const handleSellSpice = useCallback(() => {
    setGameState((prev) => {
      if (prev.resources.spice < CONFIG.SPICE_SELL_COST) {
        addNotification(`Need at least ${CONFIG.SPICE_SELL_COST} Spice to sell.`, "warning")
        return prev
      }
      const spiceSold = CONFIG.SPICE_SELL_COST
      const solariGained = CONFIG.SPICE_SELL_YIELD
      addNotification(`Sold ${spiceSold} Spice for ${solariGained} Solari!`, "success")
      return {
        ...prev,
        resources: {
          ...prev.resources,
          spice: prev.resources.spice - spiceSold,
          solari: prev.resources.solari + solariGained,
        },
      }
    })
  }, [addNotification])

  const handleMinePlasteel = useCallback(() => {
    setGameState((prev) => {
      if (prev.resources.energy < CONFIG.MINE_PLASTEEL_ENERGY_COST) {
        addNotification("Not enough energy to mine Plasteel!", "warning")
        return prev
      }
      addNotification(`Mined ${CONFIG.MINE_PLASTEEL_YIELD} Plasteel!`, "success")
      return {
        ...prev,
        resources: {
          ...prev.resources,
          plasteel: prev.resources.plasteel + CONFIG.MINE_PLASTEEL_YIELD,
          energy: prev.resources.energy - CONFIG.MINE_PLASTEEL_ENERGY_COST,
        },
      }
    })
  }, [addNotification])

  const handleCollectWater = useCallback(() => {
    setGameState((prev) => {
      if (prev.resources.energy < CONFIG.COLLECT_WATER_ENERGY_COST) {
        addNotification("Not enough energy to collect Water!", "warning")
        return prev
      }
      addNotification(`Collected ${CONFIG.COLLECT_WATER_YIELD} Water!`, "success")
      return {
        ...prev,
        resources: {
          ...prev.resources,
          water: prev.resources.water + CONFIG.COLLECT_WATER_YIELD,
          energy: prev.resources.energy - CONFIG.COLLECT_WATER_ENERGY_COST,
        },
      }
    })
  }, [addNotification])

  // Modal handlers (only Prestige and Ability Selection remain as modals)
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
        {/* Left Sidebar: Resources & Manual Operations */}
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
              {/* Central Content: Map, Leaderboard, World Events */}
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
                <MapGrid
                  player={gameState.player}
                  mapData={gameState.map}
                  onlinePlayers={gameState.onlinePlayers}
                  worldEvents={gameState.worldEvents}
                  onCellClick={handleMapCellClick}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Leaderboard topPlayers={gameState.leaderboard} />
                  <div className="bg-purple-800 p-4 rounded-lg border border-purple-500">
                    <h3 className="text-lg font-semibold text-purple-300 mb-3 font-orbitron">
                      🌟 World Events Summary
                    </h3>
                    <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                      {gameState.worldEvents.length === 0 ? (
                        <p className="text-stone-400 text-center">No active events</p>
                      ) : (
                        gameState.worldEvents.map((event, index) => (
                          <div
                            key={event.id || index}
                            className="bg-purple-900/50 p-3 rounded-lg border border-purple-700"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-purple-200">
                                {event.icon} {event.name}
                              </span>
                            </div>
                            <p className="text-xs text-stone-300">{event.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Right Panel: Vital Stats */}
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
            <EmpireTab player={gameState.player} resources={gameState.resources} onInvest={handleInvestInVenture} />
          )}
          {gameState.currentTab === "multiplayer" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-3xl font-orbitron text-amber-400 mb-6">🌍 Multiplayer Hub</h2>
              <p className="text-center text-stone-400 mb-4">
                Connect with other players, trade resources, and dominate Arrakis!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* World Chat */}
                <div className="bg-stone-800 p-6 rounded-lg border border-stone-600 col-span-full">
                  <h3 className="text-xl font-semibold mb-4 text-amber-300">World Chat</h3>
                  <WorldChat
                    messages={gameState.chatMessages}
                    onSendMessage={handleSendMessage}
                    playerName={gameState.player.name}
                    playerColor={gameState.player.color}
                  />
                </div>

                {/* Houses Panel */}
                <HousesPanel onlinePlayers={gameState.onlinePlayers} />

                {/* World Events Panel */}
                <WorldEventsPanel worldEvents={gameState.worldEvents} />

                {/* Trade Panel */}
                <TradePanel player={gameState.player} resources={gameState.resources} />

                {/* Territory Gain Chart */}
                <div className="bg-stone-800 p-6 rounded-lg border border-stone-600 col-span-full">
                  <TerritoryChart territories={gameState.map.territories} onlinePlayers={gameState.onlinePlayers} />
                </div>
              </div>
            </div>
          )}
          {gameState.currentTab === "updates" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-3xl font-orbitron text-amber-400 mb-6">📰 Game Updates & Patch Notes</h2>
              <div className="bg-stone-800 p-6 rounded-lg border border-stone-600 space-y-6">
                <div className="border-b border-stone-700 pb-4">
                  <h3 className="text-xl font-semibold text-amber-300 mb-2">
                    Patch 1.0.1 - Combat Refinements (5/31/2025)
                  </h3>
                  <ul className="list-disc list-inside text-stone-300 text-sm space-y-1">
                    <li>Fixed an issue where enemy health bars would not update visually during combat.</li>
                    <li>
                      Resolved a bug causing enemy health to drop below zero, leading to unintended one-shot kills.
                    </li>
                    <li>Notifications now automatically disappear after 3 seconds.</li>
                  </ul>
                </div>
                <div className="border-b border-stone-700 pb-4">
                  <h3 className="text-xl font-semibold text-amber-300 mb-2">Upcoming: Guild System (Q3 2025)</h3>
                  <p className="text-stone-300 text-sm">
                    Prepare for the introduction of the Guild system! Form alliances with other players, share
                    resources, and conquer territories together. New guild-specific abilities and bonuses will be
                    available.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-amber-300 mb-2">Future Plans: Deep Desert Expeditions</h3>
                  <p className="text-stone-300 text-sm">
                    Venture into uncharted territories with new expedition mechanics. Discover rare resources, face
                    unique challenges, and uncover ancient Fremen secrets.
                  </p>
                </div>
              </div>
            </div>
          )}
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
          enemy={gameState.combat.enemy}
          combatState={gameState.combat}
          onPlayerAttack={handlePlayerAttack}
          onEnemyAttack={handleEnemyAttack}
          onFlee={handleFlee}
          onCombatEnd={(result) =>
            setGameState((prev) =>
              handleCombatEnd(result, prev.player, prev.combat.enemy!, prev.combat, prev.resources, prev.map),
            )
          }
          addNotification={addNotification}
          onActivateAbility={handleActivateAbility}
          abilityCooldowns={gameState.abilityCooldowns}
          onDefend={handleDefend}
          enemyLevel={gameState.combat.enemy.level}
        />
      )}

      {/* Onboarding Modals */}
      <NameSelectionModal isOpen={gameState.isNameModalOpen} onSubmit={handleNameSubmit} />
      <HouseSelectionModal isOpen={gameState.isHouseModalOpen} onSelect={handleHouseSelect} />

      {/* Remaining Game Info Modals */}
      <PrestigeModal
        isOpen={gameState.isPrestigeModalOpen}
        onClose={handleClosePrestigeModal}
        onPrestige={handlePrestige}
        playerSolari={gameState.resources.solari}
        prestigeLevel={gameState.player.prestigeLevel}
      />
      <AbilitySelectionModal
        isOpen={gameState.isAbilitySelectionModalOpen}
        onSelect={handleSelectAbility}
        availableAbilities={availableAbilitiesForSelection}
      />
    </div>
  )
}
