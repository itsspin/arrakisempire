"use client"

import type { Player, Resources, Investment } from "@/types/game"
import { useState } from "react"

interface EmpireTabProps {
  player: Player
  resources: Resources
  onInvest: (ventureId: string) => void // Function to handle investment
}

const initialVentures: Record<string, Investment> = {
  harvester_fleet: {
    name: "Spice Harvester Fleet",
    description: "Deploy automated harvesters to extract Spice. Risky but potentially high yield.",
    level: 0,
    costToUpgrade: 500, // Solari
    productionRate: 10, // Spice per minute at level 1
  },
  processing_plant: {
    name: "Spice Processing Plant",
    description: "Refine raw Spice into Melange, increasing its value. Requires Plasteel for upgrades.",
    level: 0,
    costToUpgrade: 1000, // Solari + Plasteel
    productionRate: 5, // Melange per minute at level 1
  },
  trade_routes: {
    name: "Interstellar Trade Routes",
    description: "Establish lucrative trade routes for consistent Solari income from Spice sales.",
    level: 0,
    costToUpgrade: 2000, // Solari
    productionRate: 100, // Solari per minute at level 1
  },
}

export function EmpireTab({ player, resources, onInvest }: EmpireTabProps) {
  const [ventures, setVentures] = useState<Record<string, Investment>>(player.investments || initialVentures)

  const handleInvestment = (ventureId: string) => {
    // In a real app, this would update global state and persist
    const venture = ventures[ventureId]
    if (resources.solari >= venture.costToUpgrade) {
      // Simplified cost check
      const updatedVenture = {
        ...venture,
        level: venture.level + 1,
        costToUpgrade: Math.floor(venture.costToUpgrade * 1.8), // Increase cost for next level
        productionRate: Math.floor(venture.productionRate * 1.5), // Increase production
      }
      setVentures((prev) => ({ ...prev, [ventureId]: updatedVenture }))
      onInvest(ventureId) // This should trigger global state update & resource deduction
      // Potentially update player.investments here or via onInvest callback
    } else {
      alert("Not enough Solari to upgrade this venture!")
    }
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
              <h3 className="text-xl font-orbitron text-amber-300 mb-2">{venture.name}</h3>
              <p className="text-sm text-stone-300 mb-1">
                Level: <span className="font-bold text-white">{venture.level}</span>
              </p>
              <p className="text-sm text-stone-300 mb-3">{venture.description}</p>
              <p className="text-sm text-stone-300 mb-1">
                Current Production: <span className="font-bold text-green-400">{venture.productionRate}</span> / min
              </p>
              <p className="text-sm text-stone-300 mb-4">
                Upgrade Cost:{" "}
                <span className="font-bold text-yellow-400">{venture.costToUpgrade.toLocaleString()} Solari</span>
                {/* Add other resource costs if applicable, e.g., Plasteel for processing_plant */}
              </p>
            </div>
            <button
              onClick={() => handleInvestment(id)}
              disabled={resources.solari < venture.costToUpgrade} // Basic disable
              className="w-full mt-auto py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition duration-150 ease-in-out disabled:bg-stone-500 disabled:cursor-not-allowed"
            >
              {venture.level === 0 ? "Invest" : "Upgrade Venture"}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 bg-stone-800 rounded-lg border border-stone-600">
        <h4 className="text-lg font-semibold text-amber-300 mb-2">Territory Perks</h4>
        {player.territories.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-stone-300 space-y-1">
            {player.territories
              .flatMap((t) => t.perks)
              .map((perk, i) => (
                <li key={i}>{perk}</li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Acquire territories to gain passive bonuses to your empire.</p>
        )}
      </div>
    </div>
  )
}
