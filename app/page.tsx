"use client"

import { useState, useEffect, useCallback } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { Sidebar } from "@/components/sidebar"
import { MapGrid } from "@/components/map-grid"
import { CharacterTab } from "@/components/character-tab"
import { EmpireTab } from "@/components/empire-tab"
import { TerritoryModal } from "@/components/modals/territory-modal"
// Import other modals as needed: NameSelectionModal, HouseSelectionModal, CombatModal, TradingModal

import type { GameState, RankedPlayer, TerritoryDetails, Item, Investment } from "@/types/game"
import { CONFIG, PLAYER_COLORS } from "@/lib/constants"
import { STATIC_DATA } from "@/lib/game-data"
// import { db, auth } from "@/lib/firebase" // For actual Firebase integration
// import { signInAnonymously, onAuthStateChanged } from "firebase/auth"
// import { doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit, updateDoc, serverTimestamp, addDoc, where, getDocs } from "firebase/firestore"

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
  for (let i = 0; i < 5; i++) {
    const x = 100 + Math.floor(Math.random() * 5 - 2)
    const y = 100 + Math.floor(Math.random() * 5 - 2)
    if (x === 100 && y === 100) continue // Skip player start
    const key = `${x},${y}`
    if (territories[key]) continue
    territories[key] = {
      id: `terr_${x}_${y}`,
      x,
      y,
      ownerId: null,
      purchaseCost: 1000 + Math.floor(Math.random() * 1000),
      perks: [`+${Math.floor(Math.random() * 10 + 1)}% Spice Production`],
      resourceYield: { spice: Math.floor(Math.random() * 5 + 1) },
      name: `Sector ${String.fromCharCode(65 + i)}${i + 1}`,
    }
  }
  return territories
}

const initialGameState: GameState = {
  player: {
    id: "local_player",
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
  },
  resources: { spice: 100, water: 200, solari: 2500, plasteel: 150, rareMaterials: 10, melange: 5 },
  equipment: { weapon: null, armor: null, accessory: null },
  inventory: new Array(CONFIG.MAX_INVENTORY).fill(null),
  buildings: {},
  combat: { active: false, enemy: null, turn: "player", log: [] },
  currentTab: "game",
  gameInitialized: false,
  lastSaveTime: 0,
  lastEnergyRegen: Date.now(),
  onlinePlayers: {
    // Mock other players
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
    },
  ],
  tradeOffers: [],
  map: { enemies: {}, resources: {}, territories: generateMockTerritories() },
  leaderboard: generateMockLeaderboard(),
  isNameModalOpen: true,
  isHouseModalOpen: false,
  isCombatModalOpen: false,
  isTradingModalOpen: false,
  isTerritoryModalOpen: false,
  selectedTerritoryCoords: null,
}

export default function ArrakisGamePage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [isLoading, setIsLoading] = useState(true)

  // Initialization and Game Loop
  useEffect(() => {
    const initGame = async () => {
      // Simulate loading and player setup (name/house selection)
      // For now, bypass modals for quicker testing if needed, or implement them fully
      // setGameState(prev => ({...prev, isNameModalOpen: false, isHouseModalOpen: false}));

      // If using Firebase:
      // onAuthStateChanged(auth, (user) => { if (user) loadPlayerData(user.uid); else signInAnonymously(auth);});

      // Mock player setup completion
      setGameState((prev) => ({
        ...prev,
        player: { ...prev.player, name: "Arrakis Tycoon", house: "atreides" }, // Mocked setup
        gameInitialized: true,
      }))
      setIsLoading(false)
    }
    initGame()

    // Game loop interval
    const gameTick = setInterval(() => {
      if (!gameState.gameInitialized || isLoading) return

      setGameState((prev) => {
        const newPlayer = { ...prev.player }
        const newResources = { ...prev.resources }

        // Energy Regen
        if (Date.now() - prev.lastEnergyRegen >= CONFIG.ENERGY_REGEN_INTERVAL) {
          newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + newPlayer.energyProductionRate)
        }

        // Territory Income & Investment Income
        newPlayer.territories.forEach((t) => {
          if (t.resourceYield?.solari) newResources.solari += t.resourceYield.solari / (60000 / 1000) // per second from per minute
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

        // Update rank (simple example: based on Solari + Spice value)
        const newRankScore = newResources.solari + newResources.spice * 5 + newPlayer.territories.length * 1000
        // This would be more complex, potentially involving comparison with other players in a real backend
        newPlayer.rank = Math.max(1, 100 - Math.floor(newRankScore / 1000))
        newPlayer.rankName =
          newPlayer.rank < 10 ? "Spice Baron" : newPlayer.rank < 50 ? "Guild Associate" : "Sand Nomad"

        return {
          ...prev,
          player: newPlayer,
          resources: newResources,
          lastEnergyRegen:
            Date.now() - prev.lastEnergyRegen >= CONFIG.ENERGY_REGEN_INTERVAL ? Date.now() : prev.lastEnergyRegen,
          leaderboard: prev.leaderboard
            .map((p) => (p.id === newPlayer.id ? { ...p, rank: newPlayer.rank, rankName: newPlayer.rankName } : p))
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 5), // Update self in mock leaderboard
        }
      })
    }, 1000) // 1-second tick

    return () => clearInterval(gameTick)
  }, [gameState.gameInitialized, isLoading])

  const handleTabChange = useCallback((tab: string) => {
    setGameState((prev) => ({ ...prev, currentTab: tab }))
  }, [])

  const handleTradeClick = useCallback(() => {
    setGameState((prev) => ({ ...prev, isTradingModalOpen: true }))
  }, [])

  const handleMapCellClick = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`
      const territory = gameState.map.territories[key]
      const enemy = gameState.map.enemies[key]
      // const resourceNode = gameState.map.resources[key]

      if (territory && !territory.ownerId) {
        setGameState((prev) => ({ ...prev, selectedTerritoryCoords: { x, y }, isTerritoryModalOpen: true }))
      } else if (territory && territory.ownerId === gameState.player.id) {
        alert(`You own ${territory.name || `Sector (${x},${y})`}. Perks: ${territory.perks.join(", ")}`)
      } else if (enemy) {
        // Start combat
        // setGameState(prev => ({ ...prev, combat: { ...prev.combat, active: true, enemy: enemy }, isCombatModalOpen: true }))
        alert(`Enemy encounter: ${enemy.name}! Combat system to be implemented.`)
      } else {
        // Move player if adjacent, or other interactions
        const dx = x - gameState.player.position.x
        const dy = y - gameState.player.position.y
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
          if (gameState.resources.water >= 1) {
            // Simple move cost
            setGameState((prev) => ({
              ...prev,
              player: { ...prev.player, position: { x, y } },
              resources: { ...prev.resources, water: prev.resources.water - 1 },
            }))
          } else {
            alert("Not enough water to move!")
          }
        }
      }
    },
    [gameState.map, gameState.player, gameState.resources.water],
  )

  const handlePurchaseTerritory = useCallback((territoryId: string, cost: number) => {
    setGameState((prev) => {
      const key = Object.keys(prev.map.territories).find((k) => prev.map.territories[k].id === territoryId)
      if (!key || prev.resources.solari < cost) return prev

      const purchasedTerritory = {
        ...prev.map.territories[key],
        ownerId: prev.player.id,
        ownerName: prev.player.name,
        ownerColor: prev.player.color,
      }
      return {
        ...prev,
        resources: { ...prev.resources, solari: prev.resources.solari - cost },
        player: { ...prev.player, territories: [...prev.player.territories, purchasedTerritory] },
        map: { ...prev.map, territories: { ...prev.map.territories, [key]: purchasedTerritory } },
        isTerritoryModalOpen: false,
        selectedTerritoryCoords: null,
      }
    })
  }, [])

  const handleEquipItem = useCallback((item: Item, inventoryIndex: number) => {
    setGameState((prev) => {
      const newInventory = [...prev.inventory]
      const newEquipment = { ...prev.equipment }
      const equipSlot = item.type as keyof GameState["equipment"]

      if (!["weapon", "armor", "accessory"].includes(equipSlot)) return prev // Not equippable type

      const currentEquipped = newEquipment[equipSlot]
      newEquipment[equipSlot] = item // Equip new item
      newInventory[inventoryIndex] = currentEquipped // Move previously equipped to inventory, or null if slot was empty

      // Update player stats based on item (simplified)
      const newPlayerStats = { ...prev.player }
      if (currentEquipped?.attack) newPlayerStats.attack -= currentEquipped.attack
      if (currentEquipped?.defense) newPlayerStats.defense -= currentEquipped.defense
      if (item.attack) newPlayerStats.attack += item.attack
      if (item.defense) newPlayerStats.defense += item.defense

      return { ...prev, inventory: newInventory, equipment: newEquipment, player: newPlayerStats }
    })
  }, [])

  const handleInvestInVenture = useCallback((ventureId: string) => {
    setGameState((prev) => {
      const venture = prev.player.investments?.[ventureId]
      if (!venture || prev.resources.solari < venture.costToUpgrade) {
        alert("Cannot afford upgrade or venture does not exist.")
        return prev
      }

      const upgradedVenture: Investment = {
        ...venture,
        level: venture.level + 1,
        costToUpgrade: Math.floor(venture.costToUpgrade * 1.8),
        productionRate:
          venture.level === 0 ? STATIC_DATA.ITEMS.lasguns.attack || 10 : Math.floor(venture.productionRate * 1.5), // Example: use some base rate for level 1
      }

      return {
        ...prev,
        resources: { ...prev.resources, solari: prev.resources.solari - venture.costToUpgrade },
        player: {
          ...prev.player,
          investments: {
            ...(prev.player.investments || {}),
            [ventureId]: upgradedVenture,
          },
        },
      }
    })
  }, [])

  if (isLoading) return <LoadingScreen isVisible={true} />
  // Add Name/House selection modals here if isNameModalOpen or isHouseModalOpen are true

  const selectedTerritory = gameState.selectedTerritoryCoords
    ? gameState.map.territories[`${gameState.selectedTerritoryCoords.x},${gameState.selectedTerritoryCoords.y}`]
    : null

  return (
    <div className="min-h-screen">
      <Header player={gameState.player} onTradeClick={handleTradeClick} />
      <Navigation currentTab={gameState.currentTab} onTabChange={handleTabChange} />

      <main className="flex pt-[140px] h-[calc(100vh-88px)]">
        {" "}
        {/* Adjusted height for fixed header/nav */}
        <Sidebar
          player={gameState.player}
          resources={gameState.resources}
          worldEvents={gameState.worldEvents}
          leaderboard={gameState.leaderboard}
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
                to move • Click cells to interact/purchase territory.
              </div>
              <MapGrid
                player={gameState.player}
                mapData={gameState.map}
                onlinePlayers={gameState.onlinePlayers}
                worldEvents={gameState.worldEvents}
                onCellClick={handleMapCellClick}
              />
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
      {/* Other Modals: Trading, Combat, Name/House Selection */}
    </div>
  )
}
