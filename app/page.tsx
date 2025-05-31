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
import { NameSelectionModal } from "@/components/modals/name-selection-modal" // New import
import { HouseSelectionModal } from "@/components/modals/house-selection-modal" // New import
import { ActionsPanel } from "@/components/actions-panel" // Moved from sidebar
import { Leaderboard } from "@/components/leaderboard" // Moved from sidebar

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
} from "@/types/game"
import { CONFIG, PLAYER_COLORS } from "@/lib/constants"
import { STATIC_DATA } from "@/lib/game-data"
import { auth, db } from "@/lib/firebase" // Import Firebase for conceptual integration
import { doc, getDoc, setDoc } from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"

// Helper to get a random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to get a random map coordinate within a reasonable range
const getRandomMapCoords = () => {
  const x = getRandomInt(CONFIG.MAP_SIZE / 2 - 10, CONFIG.MAP_SIZE / 2 + 10)
  const y = getRandomInt(CONFIG.MAP_SIZE / 2 - 10, CONFIG.MAP_SIZE / 2 + 10)
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

const generateMockTerritories = (): Record<string, TerritoryDetails> => {
  const territories: Record<string, TerritoryDetails> = {}
  for (let i = 0; i < 10; i++) {
    const { x, y } = getRandomMapCoords()
    if (x === 100 && y === 100) continue // Avoid player's starting cell
    const key = `${x},${y}`
    if (territories[key]) continue
    territories[key] = {
      id: `terr_${x}_${y}`,
      x,
      y,
      position: { x, y },
      ownerId: null,
      purchaseCost: 1000 + Math.floor(Math.random() * 2000),
      perks: [`+${Math.floor(Math.random() * 10 + 1)}% Spice Production`],
      resourceYield: { spice: Math.floor(Math.random() * 5 + 1) },
      name: `Sector ${String.fromCharCode(65 + i)}${i + 1}`,
    }
  }
  return territories
}

const generateMockEnemies = (): Record<string, Enemy> => {
  const enemies: Record<string, Enemy> = {}
  const enemyTypes = Object.keys(STATIC_DATA.ENEMIES)
  for (let i = 0; i < 5; i++) {
    const { x, y } = getRandomMapCoords()
    if (x === 100 && y === 100) continue
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
      boss: enemyData.boss,
      special: enemyData.special,
      legendary: enemyData.legendary,
    }
  }
  return enemies
}

const generateMockResources = (): Record<string, ResourceNode> => {
  const resources: Record<string, ResourceNode> = {}
  const resourceTypes = ["spice", "water", "plasteel"]
  for (let i = 0; i < 8; i++) {
    const { x, y } = getRandomMapCoords()
    if (x === 100 && y === 100) continue
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
  const items: Record<string, Item> = {}
  const itemKeys = Object.keys(STATIC_DATA.ITEMS) as Array<keyof typeof STATIC_DATA.ITEMS>
  for (let i = 0; i < 5; i++) {
    const { x, y } = getRandomMapCoords()
    if (x === 100 && y === 100) continue
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
      attack: itemData.attack,
      defense: itemData.defense,
      special: itemData.special,
    }
  }
  return items
}

const initialGameState: GameState = {
  player: {
    id: null, // Will be set by Firebase Auth
    name: "Wanderer",
    color: PLAYER_COLORS[0],
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
    position: { x: 100, y: 100 },
    basePosition: { x: 100, y: 100 },
    house: null,
    rank: 100,
    rankName: "Sand Nomad",
    power: 0,
    prestigeLevel: 0,
    territories: [],
    lifetimeSpice: 0,
    totalEnemiesDefeated: 0,
    energyProductionRate: CONFIG.ENERGY_REGEN_RATE,
    created: Date.now(),
    lastActive: Date.now(),
    investments: {
      harvester_fleet: {
        name: "Spice Harvester Fleet",
        description: "Deploy automated harvesters.",
        level: 0,
        costToUpgrade: 500,
        productionRate: 0,
      },
      processing_plant: {
        name: "Spice Processing Plant",
        description: "Refine raw Spice.",
        level: 0,
        costToUpgrade: 1000,
        productionRate: 0,
      },
      trade_routes: {
        name: "Interstellar Trade Routes",
        description: "Establish trade routes.",
        level: 0,
        costToUpgrade: 2000,
        productionRate: 0,
      },
    },
    spicePerClick: 1,
    spiceClickUpgradeCost: 50,
  },
  resources: { spice: 100, water: 200, solari: 2500, plasteel: 150, rareMaterials: 10, melange: 5 },
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
    miniGameActive: false,
    miniGameResult: null,
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
  map: {
    enemies: generateMockEnemies(),
    resources: generateMockResources(),
    territories: generateMockTerritories(),
    items: generateMockItems(),
  },
  leaderboard: generateMockLeaderboard(),
  isNameModalOpen: true, // Start with name selection
  isHouseModalOpen: false,
  isCombatModalOpen: false,
  isTradingModalOpen: false,
  isTerritoryModalOpen: false,
  selectedTerritoryCoords: null,
  notifications: [],
}

export default function ArrakisGamePage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [isLoading, setIsLoading] = useState(true)
  const [itemRespawnQueue, setItemRespawnQueue] = useState<Record<string, { item: Item; respawnTime: number }>>({})

  // Ref to track the last time a general notification was shown
  const lastGeneralNotificationTime = useRef(0)
  const GENERAL_NOTIFICATION_COOLDOWN = 1000 // 1 second cooldown for general notifications

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
  }, [])

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
        newPlayer.experience += enemyInstance.xp
        if (newPlayer.experience >= newPlayer.experienceToNext) {
          newPlayer.level++
          newPlayer.experience -= newPlayer.experienceToNext
          newPlayer.experienceToNext = Math.floor(newPlayer.experienceToNext * CONFIG.XP_FACTOR)
          newPlayer.maxHealth += 10
          newPlayer.health = newPlayer.maxHealth
          newPlayer.maxEnergy += 5
          newPlayer.energy = newPlayer.maxEnergy
          newPlayer.attack += 2
          newPlayer.defense += 1
          addNotification(`You leveled up to Level ${newPlayer.level}!`, "legendary")
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
        miniGameActive: false,
        miniGameResult: null,
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
        if (!prev.combat.active || !prev.combat.enemy) return prev

        const newCombat = { ...prev.combat }
        const newEnemy = { ...newCombat.enemy }
        const newPlayer = { ...prev.player }

        newEnemy.currentHealth = Math.max(0, newEnemy.currentHealth - damage)
        newCombat.log.push(
          `<p class="log-player">You attacked ${newEnemy.name} for <span class="${isCrit ? "log-crit" : ""}">${damage}</span> damage!${isCrit ? " (Critical Hit!)" : ""}${!miniGameSuccess ? " (Mini-game Failed)" : ""}</p>`,
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
          newCombat.miniGameActive = false
          return { ...prev, combat: newCombat, player: newPlayer }
        }
      })
    },
    [addNotification, handleCombatEnd],
  )

  const handleEnemyAttack = useCallback(
    (damage: number, isDodge: boolean) => {
      setGameState((prev) => {
        if (!prev.combat.active || !prev.combat.enemy) return prev

        const newCombat = { ...prev.combat }
        const newPlayer = { ...prev.player }

        if (isDodge) {
          newCombat.log.push(
            `<p class="log-enemy">${newCombat.enemy!.name} attacked, but you <span class="log-dodge">dodged</span> the attack!</p>`,
          )
        } else {
          newPlayer.health = Math.max(0, newPlayer.health - damage)
          newCombat.log.push(`<p class="log-enemy">${newCombat.enemy!.name} attacked you for ${damage} damage!</p>`)
        }

        if (newPlayer.health <= 0) {
          // Player defeated
          newCombat.log.push(`<p class="log-error">You have been defeated by ${newCombat.enemy!.name}!</p>`)
          addNotification("You have been defeated!", "error")
          return handleCombatEnd("lose", newPlayer, newCombat.enemy, newCombat, prev.resources, prev.map)
        } else {
          // Continue combat, switch to player turn
          newCombat.turn = "player"
          newCombat.miniGameActive = true // Re-activate mini-game for player's next turn
          return { ...prev, combat: newCombat, player: newPlayer }
        }
      })
    },
    [addNotification, handleCombatEnd],
  )

  const handleFlee = useCallback(
    (success: boolean) => {
      setGameState((prev) => {
        if (!prev.combat.active || !prev.combat.enemy) return prev

        const newCombat = { ...prev.combat }
        const newPlayer = { ...prev.player }

        if (success) {
          newCombat.log.push(`<p class="log-info">You successfully fled from ${newCombat.enemy.name}.</p>`)
          addNotification("Successfully fled from combat.", "info")
          return handleCombatEnd("flee", newPlayer, newCombat.enemy, newCombat, prev.resources, prev.map)
        } else {
          newCombat.log.push(`<p class="log-error">Failed to flee! ${newCombat.enemy.name} gets a free attack!</p>`)
          addNotification("Flee attempt failed!", "error")
          // Enemy gets a free attack
          const enemyDamage = Math.max(
            1,
            newCombat.enemy.attack -
              (newPlayer.equipment.armor?.defense || 0) -
              (newPlayer.equipment.accessory?.defense || 0),
          )
          newPlayer.health = Math.max(0, newPlayer.health - enemyDamage)
          newCombat.log.push(`<p class="log-enemy">${newCombat.enemy.name} strikes you for ${enemyDamage} damage!</p>`)

          if (newPlayer.health <= 0) {
            newCombat.log.push(`<p class="log-error">You have been defeated by ${newCombat.enemy!.name}!</p>`)
            addNotification("You have been defeated!", "error")
            return handleCombatEnd("lose", newPlayer, newCombat.enemy, newCombat, prev.resources, prev.map)
          } else {
            newCombat.turn = "player" // Back to player's turn after failed flee
            newCombat.combatRound++
            newCombat.miniGameActive = true
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
          resources: { ...prev.resources, ...houseData.startingBonus }, // Apply starting bonuses
        }
        // Apply specific stat bonuses if any
        if (houseData.startingBonus.attack) newPlayer.attack += houseData.startingBonus.attack
        if (houseData.startingBonus.defense) newPlayer.defense += houseData.startingBonus.defense

        return {
          ...prev,
          player: newPlayer,
          isHouseModalOpen: false,
          gameInitialized: true, // Game is fully initialized after house selection
        }
      })
      addNotification(`Welcome to Arrakis, ${gameState.player.name}! The Spice must flow.`, "legendary")
    },
    [addNotification, gameState.player.name],
  ) // Added gameState.player.name to dependency array

  // Initialization and Game Loop
  useEffect(() => {
    const initGame = async () => {
      setIsLoading(true)
      try {
        // Anonymous Firebase Auth for unique user ID
        const userCredential = await signInAnonymously(auth)
        const userId = userCredential.user.uid
        const playerDocRef = doc(db, "players", userId)
        const playerDocSnap = await getDoc(playerDocRef)

        if (playerDocSnap.exists()) {
          // Load existing game state
          const savedState = playerDocSnap.data() as GameState
          setGameState(savedState)
          addNotification(`Welcome back, ${savedState.player.name}!`, "legendary")
        } else {
          // New player, set initial ID and open name modal
          setGameState((prev) => ({
            ...prev,
            player: { ...prev.player, id: userId },
            isNameModalOpen: true, // Ensure name modal is open for new players
            gameInitialized: false, // Not fully initialized until onboarding is done
          }))
        }
      } catch (error) {
        console.error("Error initializing game or signing in:", error)
        addNotification("Failed to load game. Please try again.", "error")
      } finally {
        setIsLoading(false)
      }
    }
    initGame()

    const gameTick = setInterval(() => {
      if (!gameState.gameInitialized || isLoading || gameState.isCombatModalOpen) return // Pause tick during combat

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

        // Energy Regen
        if (now - prev.lastEnergyRegen >= CONFIG.ENERGY_REGEN_INTERVAL) {
          newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + newPlayer.energyProductionRate)
          prev.lastEnergyRegen = now // Update last regen time
        }

        // Cooldowns & Respawns (simple version)
        Object.entries(newMap.enemies).forEach(([key, enemy]) => {
          if (enemy.cooldownUntil && now >= enemy.cooldownUntil) {
            const originalEnemyData = STATIC_DATA.ENEMIES[enemy.type as keyof typeof STATIC_DATA.ENEMIES]
            newMap.enemies[key] = { ...enemy, currentHealth: originalEnemyData.health, cooldownUntil: undefined }
          }
        })
        Object.entries(newMap.resources).forEach(([key, resourceNode]) => {
          if (resourceNode.cooldownUntil && now >= resourceNode.cooldownUntil) {
            if (resourceNode.type === "spice")
              newMap.resources[key] = {
                ...resourceNode,
                amount: Math.floor(Math.random() * 50) + 10,
                cooldownUntil: undefined,
              }
            else if (resourceNode.type === "water")
              newMap.resources[key] = {
                ...resourceNode,
                amount: Math.floor(Math.random() * 30) + 5,
                cooldownUntil: undefined,
              }
            else delete newMap.resources[key]
          }
        })

        // Item Respawn Logic
        const newRespawnQueue = { ...itemRespawnQueue }
        Object.entries(newRespawnQueue).forEach(([itemId, { item, respawnTime }]) => {
          if (now >= respawnTime) {
            const { x, y } = getRandomMapCoords()
            const newKey = `${x},${y}`
            newMap.items[newKey] = { ...item, id: `item_${newKey}` } // Assign new ID based on new coords
            addNotification(`An item (${item.name}) has respawned at (${x},${y}).`, "info")
            delete newRespawnQueue[itemId]
          }
        })
        setItemRespawnQueue(newRespawnQueue)

        // Territory Income & Investment Income
        newPlayer.territories.forEach((t) => {
          if (t.resourceYield?.solari) newResources.solari += t.resourceYield.solari / (60000 / 1000)
          if (t.resourceYield?.spice) newResources.spice += t.resourceYield.spice / (60000 / 1000)
        })
        if (newPlayer.investments) {
          Object.values(newPlayer.investments).forEach((inv) => {
            if (inv.level > 0) {
              if (inv.name.includes("Spice")) newResources.spice += inv.productionRate / (60000 / 1000)
              else if (inv.name.includes("Solari") || inv.name.includes("Trade"))
                newResources.solari += inv.productionRate / (60000 / 1000)
            }
          })
        }

        const newRankScore = newResources.solari + newResources.spice * 5 + newPlayer.territories.length * 1000
        newPlayer.rank = Math.max(1, 100 - Math.floor(newRankScore / 1000))
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
        }
      })
    }, 1000)

    // Save game state to Firebase periodically
    const saveGameInterval = setInterval(async () => {
      if (gameState.player.id && gameState.gameInitialized) {
        try {
          await setDoc(doc(db, "players", gameState.player.id), gameState)
          console.log("Game state saved to Firebase.")
        } catch (error) {
          console.error("Error saving game state:", error)
        }
      }
    }, CONFIG.SAVE_INTERVAL)

    return () => {
      clearInterval(gameTick)
      clearInterval(saveGameInterval)
    }
  }, [
    gameState.gameInitialized,
    isLoading,
    gameState.isCombatModalOpen,
    itemRespawnQueue,
    addNotification,
    gameState.player.id,
    gameState,
  ]) // Added gameState to dependencies for saveGameInterval

  const attemptPlayerAction = useCallback(
    (targetX: number, targetY: number) => {
      setGameState((prev) => {
        const { player, resources, map } = prev
        const dx = targetX - player.position.x
        const dy = targetY - player.position.y
        const key = `${targetX},${targetY}`
        const enemyOnCell = map.enemies[key]
        const resourceOnCell = map.resources[key]
        const territoryOnCell = map.territories[key]
        const itemOnCell = map.items[key] // New: Check for items

        // If combat is active, prevent any other actions
        if (prev.isCombatModalOpen) {
          addNotification("Combat is already active!", "warning")
          return prev
        }

        // Check if target cell is within 1-block radius for movement/interaction
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) {
          if (territoryOnCell && !territoryOnCell.ownerId) {
            // Allow opening territory modal even if not adjacent for purchase
            return { ...prev, selectedTerritoryCoords: { x: targetX, y: targetY }, isTerritoryModalOpen: true }
          } else {
            addNotification("Target is too far to interact directly.", "warning")
            return prev
          }
        }

        // Movement cost
        if (resources.water < 1 && (dx !== 0 || dy !== 0)) {
          addNotification("Not enough water to move!", "warning")
          return prev
        }

        const newPlayer = { ...player, position: { x: targetX, y: targetY } }
        const newResources = { ...resources }
        if (dx !== 0 || dy !== 0) {
          newResources.water -= 1
        }
        const newMap = { ...map, enemies: { ...map.enemies }, resources: { ...map.resources }, items: { ...map.items } }

        const updatedInventory = [...prev.inventory] // Access top-level inventory

        // Interaction logic
        if (enemyOnCell && !enemyOnCell.cooldownUntil) {
          // Initiate combat
          addNotification(`Engaging ${enemyOnCell.name}!`, "info")
          return {
            ...prev,
            player: newPlayer, // Player moves onto enemy cell
            resources: newResources,
            isCombatModalOpen: true,
            combat: {
              active: true,
              enemy: { ...enemyOnCell, currentHealth: enemyOnCell.health }, // Reset enemy health for combat
              turn: "player",
              log: [`<p class="log-info">You encountered a ${enemyOnCell.name}!</p>`],
              playerHealthAtStart: newPlayer.health,
              enemyHealthAtStart: enemyOnCell.health,
              combatRound: 1,
              miniGameActive: false, // Will be set to true by CombatModal's useEffect
              miniGameResult: null,
            },
          }
        } else if (resourceOnCell && !resourceOnCell.cooldownUntil) {
          const amountHarvested = Math.min(resourceOnCell.amount, 10)
          ;(newResources as any)[resourceOnCell.type] += amountHarvested
          addNotification(`Harvested ${amountHarvested} ${resourceOnCell.type}.`, "success")
          newMap.resources[key] = {
            ...resourceOnCell,
            amount: resourceOnCell.amount - amountHarvested,
            cooldownUntil:
              resourceOnCell.amount - amountHarvested <= 0 ? Date.now() + CONFIG.RESOURCE_COOLDOWN : undefined,
          }
          if (newMap.resources[key].amount <= 0) {
            addNotification(`${resourceOnCell.type} node depleted.`, "info")
            newMap.resources[key].cooldownUntil = Date.now() + CONFIG.RESOURCE_DEPLETED_COOLDOWN
          }
        } else if (itemOnCell) {
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
            addNotification("Inventory is full!", "warning")
            return prev // Don't move if inventory is full and it's an item
          }
        } else if (territoryOnCell && !territoryOnCell.ownerId) {
          return { ...prev, selectedTerritoryCoords: { x: targetX, y: targetY }, isTerritoryModalOpen: true }
        }

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
        gameState.isHouseModalOpen
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
        attemptPlayerAction(x, y)
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
    attemptPlayerAction,
  ])

  const handleTabChange = useCallback((tab: string) => {
    setGameState((prev) => ({ ...prev, currentTab: tab }))
  }, [])

  const handleTradeClick = useCallback(() => {
    addNotification("Trading system coming soon!", "info")
  }, [addNotification])

  const handleMapCellClick = useCallback(
    (x: number, y: number) => {
      attemptPlayerAction(x, y)
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

        const dx = Math.abs(territoryToBuy.position.x - prev.player.position.x)
        const dy = Math.abs(territoryToBuy.position.y - prev.player.position.y)
        if (dx > 1 || dy > 1) {
          addNotification("Territory is too far to purchase.", "warning")
          return prev
        }

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
          productionRate:
            venture.level === 0 ? STATIC_DATA.ITEMS.lasguns.attack || 10 : Math.floor(venture.productionRate * 1.5),
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
    addNotification(`+${gameState.player.spicePerClick} Spice gathered!`, "success")
  }, [addNotification, gameState.player.spicePerClick])

  const handleUpgradeSpiceClick = useCallback(() => {
    setGameState((prev) => {
      if (prev.resources.solari < prev.player.spiceClickUpgradeCost) {
        addNotification("Not enough Solari to upgrade gatherer.", "error")
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

  if (isLoading) return <LoadingScreen isVisible={true} />

  const selectedTerritory = gameState.selectedTerritoryCoords
    ? gameState.map.territories[`${gameState.selectedTerritoryCoords.x},${gameState.selectedTerritoryCoords.y}`]
    : null

  return (
    <div className="min-h-screen">
      <Header player={gameState.player} onTradeClick={handleTradeClick} />
      <Navigation currentTab={gameState.currentTab} onTabChange={handleTabChange} />
      <NotificationArea
        notifications={gameState.notifications}
        onClose={(id) =>
          setGameState((prev) => ({ ...prev, notifications: prev.notifications.filter((n) => n.id !== id) }))
        }
      />

      <main className="flex pt-[140px] h-[calc(100vh-88px)]">
        <Sidebar
          player={gameState.player}
          resources={gameState.resources}
          // leaderboard={gameState.leaderboard} // Moved
          // worldEvents={gameState.worldEvents} // Moved
          // onGenerateSpice={handleGenerateSpice} // Moved
          // onUpgradeSpiceClick={handleUpgradeSpiceClick} // Moved
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {gameState.currentTab === "game" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-orbitron text-amber-400">🏜️ The Great Desert of Arrakis</h2>
                <div className="text-lg text-stone-300">
                  Position:{" "}
                  <span className="text-amber-300 font-bold">
                    {gameState.player.position.x},{gameState.player.position.y}
                  </span>
                </div>
              </div>
              <div className="text-sm text-stone-400 mb-4 p-3 bg-stone-800 rounded-lg border border-stone-600 text-center">
                <span className="font-semibold text-amber-400">Controls:</span> WASD/Arrow Keys or Click adjacent cells
                to move/interact • Click cells to interact/purchase territory.
              </div>

              {/* Manual Operations (Moved above map) */}
              <ActionsPanel
                player={gameState.player}
                resources={gameState.resources}
                onGenerateSpice={handleGenerateSpice}
                onUpgradeSpiceClick={handleUpgradeSpiceClick}
                onSellSpice={handleSellSpice}
                onMinePlasteel={handleMinePlasteel}
                onCollectWater={handleCollectWater}
              />

              <MapGrid
                player={gameState.player}
                mapData={gameState.map}
                onlinePlayers={gameState.onlinePlayers}
                worldEvents={gameState.worldEvents}
                onCellClick={handleMapCellClick}
              />

              {/* Leaderboard and World Events (Moved below map) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Leaderboard topPlayers={gameState.leaderboard} />
                <div className="bg-purple-800 p-4 rounded-lg border border-purple-500">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3 font-orbitron">🌟 World Events</h3>
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
          )}
          {gameState.currentTab === "character" && (
            <CharacterTab
              player={gameState.player}
              equipment={gameState.equipment}
              inventory={gameState.inventory}
              onEquipItem={handleEquipItem}
            />
          )}
          {gameState.currentTab === "empire" && (
            <EmpireTab player={gameState.player} resources={gameState.resources} onInvest={handleInvestInVenture} />
          )}
          {gameState.currentTab === "multiplayer" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-3xl font-orbitron text-amber-400 mb-6">🌍 Multiplayer Hub</h2>
              <p className="text-center text-stone-400">
                Chat, detailed rankings, and direct player trading coming soon!
              </p>
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
        />
      )}

      {/* Onboarding Modals */}
      <NameSelectionModal isOpen={gameState.isNameModalOpen} onSubmit={handleNameSubmit} />
      <HouseSelectionModal isOpen={gameState.isHouseModalOpen} onSelect={handleHouseSelect} />
    </div>
  )
}
