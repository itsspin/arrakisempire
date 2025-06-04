"use client"

import type { Player, Resources, Investment } from "@/types/game"
import { CONFIG } from "@/lib/constants"

interface EmpireTabProps {
  player: Player
  resources: Resources
  onInvest: (ventureId: string) => void // Function to handle investment
  onManualGather: (ventureId: string) => void // New: Function for manual gathering
  onHireManager: (ventureId: string) => void // New: Function to hire manager
  onPurchaseRandomTerritory: () => void // Buy a random territory
  onLaunchSeeker: () => void
}

// Export initialVentures so it can be used in app/page.tsx for consistent state initialization
export const initialVentures: Record<string, Investment> = {
  harvester_fleet: {
    name: "Spice Harvester Fleet",
    description: "Deploy automated harvesters to extract Spice. Risky but potentially high yield.",
    level: 0,
    costToUpgrade: 0, // Will be calculated from baseCost
    productionRate: 0, // Will be calculated from baseProduction
    productionResource: "spice",
    baseCost: 100, // Solari
    costMultiplier: 1.5,
    baseProduction: 1, // Spice per second
    productionMultiplier: 1.1,
    manualClickYield: 5, // Spice per click
    managerCost: 500, // Solari
    unlocked: false,
    hasManager: false,
    icon: "🚀",
  },
  water_condenser_network: {
    name: "Water Condenser Network",
    description: "Collect atmospheric water vapor, vital for survival and trade.",
    level: 0,
    costToUpgrade: 0,
    productionRate: 0,
    productionResource: "water",
    baseCost: 150, // Solari
    costMultiplier: 1.6,
    baseProduction: 2, // Water per second
    productionMultiplier: 1.12,
    manualClickYield: 8, // Water per click
    managerCost: 750,
    unlocked: false,
    hasManager: false,
    icon: "💧",
  },
  solari_exchange_hub: {
    name: "Solari Exchange Hub",
    description: "Facilitate trade and currency exchange to generate passive Solari income.",
    level: 0,
    costToUpgrade: 0,
    productionRate: 0,
    productionResource: "solari",
    baseCost: 200, // Solari
    costMultiplier: 1.7,
    baseProduction: 10, // Solari per second
    productionMultiplier: 1.15,
    manualClickYield: 25, // Solari per click
    managerCost: 1000,
    unlocked: false,
    hasManager: false,
    icon: "💰",
  },
  plasteel_refinery: {
    name: "Plasteel Refinery",
    description: "Process raw materials into durable plasteel, essential for advanced construction.",
    level: 0,
    costToUpgrade: 0,
    productionRate: 0,
    productionResource: "plasteel",
    baseCost: 300, // Solari
    costMultiplier: 1.8,
    baseProduction: 0.5, // Plasteel per second
    productionMultiplier: 1.18,
    manualClickYield: 2, // Plasteel per click
    managerCost: 1500,
    unlocked: false,
    hasManager: false,
    icon: "🔧",
  },
  melange_synthesis_lab: {
    name: "Melange Synthesis Lab",
    description: "Research and synthesize artificial Melange, a highly valuable and rare commodity.",
    level: 0,
    costToUpgrade: 0,
    productionRate: 0,
    productionResource: "melange",
    baseCost: 1000, // Solari
    costMultiplier: 2.0,
    baseProduction: 0.01, // Melange per second (1 every 100 seconds)
    productionMultiplier: 1.2,
    manualClickYield: 0.1, // Melange per click
    managerCost: 5000,
    unlocked: false,
    hasManager: false,
    icon: "🔥",
  },
  rare_materials_excavation: {
    name: "Rare Materials Excavation",
    description: "Deep-core mining operations to uncover rare and valuable minerals.",
    level: 0,
    costToUpgrade: 0,
    productionRate: 0,
    productionResource: "rareMaterials",
    baseCost: 800,
    costMultiplier: 1.85,
    baseProduction: 0.2,
    productionMultiplier: 1.15,
    manualClickYield: 1,
    managerCost: 2500,
    unlocked: false,
    hasManager: false,
    icon: "⛏️",
  },
  orbital_trade_station: {
    name: "Orbital Trade Station",
    description: "Establish a spaceport for lucrative off-world commerce.",
    level: 0,
    costToUpgrade: 0,
    productionRate: 0,
    productionResource: "solari",
    baseCost: 1500,
    costMultiplier: 1.9,
    baseProduction: 30,
    productionMultiplier: 1.2,
    manualClickYield: 60,
    managerCost: 5000,
    unlocked: false,
    hasManager: false,
    icon: "🏦",
  },
}

export function EmpireTab({
  player,
  resources,
  onInvest,
  onManualGather,
  onHireManager,
  onPurchaseRandomTerritory,
  onLaunchSeeker,
}: EmpireTabProps) {
  // Use player.investments directly, as it's managed by the parent (app/page.tsx)
  const ventures = player.investments || initialVentures

  const handleInvestment = (ventureId: string) => {
    onInvest(ventureId) // Delegate to parent handler
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-3xl font-orbitron text-amber-400 mb-6">🏗️ Spice Empire Ventures</h2>
      <p className="text-stone-300 mb-8">
        Invest your Solari and resources into various Spice ventures to grow your empire. Higher levels yield greater
        returns but require more capital.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(ventures).map(([id, venture]) => (
          <div key={id} className="tycoon-building p-6 rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-orbitron text-amber-300 mb-2">
                {venture.icon} {venture.name}
              </h3>
              <p className="text-sm text-stone-300 mb-1">
                Level: <span className="font-bold text-white">{venture.level}</span>
              </p>
              <p className="text-sm text-stone-300 mb-3">{venture.description}</p>
              {venture.unlocked && (
                <>
                  <p className="text-sm text-stone-300 mb-1">
                    Manual Yield:{" "}
                    <span className="font-bold text-green-400">
                      {venture.manualClickYield.toFixed(2)} {venture.productionResource} / click
                    </span>
                  </p>
                  <p className="text-sm text-stone-300 mb-4">
                    Auto Production:{" "}
                    <span className="font-bold text-green-400">
                      {venture.productionRate.toFixed(2)} {venture.productionResource} / sec
                    </span>
                  </p>
                </>
              )}
              <p className="text-sm text-stone-300 mb-4">
                {venture.unlocked ? "Upgrade Cost" : "Unlock Cost"}:{" "}
                <span className="font-bold text-yellow-400">
                  {(venture.unlocked ? venture.costToUpgrade : venture.baseCost).toLocaleString()} Solari
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleInvestment(id)}
                disabled={resources.solari < (venture.unlocked ? venture.costToUpgrade : venture.baseCost)}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition duration-150 ease-in-out disabled:bg-stone-500 disabled:cursor-not-allowed"
              >
                {venture.unlocked ? "Upgrade Venture" : "Unlock Venture"}
              </button>
              {venture.unlocked && (
                <>
                  <button
                    onClick={() => onManualGather(id)}
                    className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition duration-150 ease-in-out disabled:bg-stone-500 disabled:cursor-not-allowed"
                  >
                    Manual Gather
                  </button>
                  {!venture.hasManager && (
                    <button
                      onClick={() => onHireManager(id)}
                      disabled={resources.solari < venture.managerCost}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition duration-150 ease-in-out disabled:bg-stone-500 disabled:cursor-not-allowed"
                      title={
                        resources.solari < venture.managerCost
                          ? `Need ${venture.managerCost.toLocaleString()} Solari`
                          : `Hire Manager for ${venture.managerCost.toLocaleString()} Solari`
                      }
                    >
                      Hire Manager
                    </button>
                  )}
                  {venture.hasManager && (
                    <button
                      disabled
                      className="w-full py-2 px-4 bg-stone-500 text-white font-semibold rounded-md cursor-not-allowed"
                    >
                      Manager Hired (Auto-Gathering)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 bg-stone-800 rounded-lg border border-stone-600">
        <h4 className="text-lg font-semibold text-amber-300 mb-2">Territory Perks</h4>
        {player.territories.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-stone-300 space-y-1">
            {Object.entries(
              player.territories
                .flatMap((t) => t.perks)
                .reduce((acc: Record<string, number>, perk) => {
                  acc[perk] = (acc[perk] || 0) + 1
                  return acc
                }, {}),
            ).map(([perk, count]) => (
              <li key={perk}>
                {perk}
                {count > 1 ? ` (x${count})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Acquire territories to gain passive bonuses to your empire.</p>
        )}
      </div>
      <div className="mt-6">
        <button
          onClick={onLaunchSeeker}
          disabled={
            resources.solari < CONFIG.SEEKER_COST ||
            player.level < CONFIG.SEEKER_LEVEL_REQUIRED
          }
          className="w-full py-3 bg-red-600 hover:bg-red-700 rounded font-bold mb-3 disabled:bg-stone-600"
          title={`Costs ${CONFIG.SEEKER_COST.toLocaleString()} Solari | Requires level ${CONFIG.SEEKER_LEVEL_REQUIRED}`}
        >
          Launch Seeker Drone
        </button>
        <button
          onClick={onPurchaseRandomTerritory}
          disabled={resources.solari < CONFIG.RANDOM_TERRITORY_PURCHASE_COST}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded font-bold disabled:bg-stone-600"
          title={`Costs at least ${CONFIG.RANDOM_TERRITORY_PURCHASE_COST.toLocaleString()} Solari`}
        >
          Buy Random Territory
        </button>
      </div>
    </div>
  )
}
