"use client"

import { STATIC_DATA } from "@/lib/game-data"
import type { GameState } from "@/types/game"

interface HousesPanelProps {
  onlinePlayers: GameState["onlinePlayers"]
}

export function HousesPanel({ onlinePlayers }: HousesPanelProps) {
  // Calculate player distribution per house
  const houseCounts: Record<string, number> = {}
  let totalPlayersWithHouse = 0
  Object.values(onlinePlayers).forEach((player) => {
    if (player.house) {
      houseCounts[player.house] = (houseCounts[player.house] || 0) + 1
      totalPlayersWithHouse++
    }
  })

  return (
    <div className="bg-stone-800 p-6 rounded-lg border border-stone-600">
      <h3 className="text-xl font-semibold mb-4 text-amber-300">🏛️ Great Houses of Arrakis</h3>
      <p className="text-stone-300 mb-6 text-sm">
        Learn about the factions vying for control of the Spice. Each house offers unique advantages.
      </p>
      <div className="space-y-4">
        {Object.entries(STATIC_DATA.HOUSES).map(([key, house]) => {
          const playerCount = houseCounts[key] || 0
          const percentage = totalPlayersWithHouse > 0 ? (playerCount / totalPlayersWithHouse) * 100 : 0
          return (
            <div
              key={key}
              className={`p-4 rounded-lg border-2 ${
                house.color === "house-atreides"
                  ? "border-blue-500"
                  : house.color === "house-harkonnen"
                    ? "border-red-500"
                    : "border-green-500"
              } bg-stone-900`}
            >
              <h4 className={`text-lg font-orbitron mb-1 ${house.color}`}>{house.name}</h4>
              <p className="text-xs text-stone-400 mb-2">{house.description}</p>
              <p className="text-xs text-amber-300 font-semibold">Starting Bonus:</p>
              <ul className="text-xs text-stone-300 list-disc list-inside mb-2">
                {Object.entries(house.startingBonus).map(([res, val]) => (
                  <li key={res}>
                    +{val} {res.charAt(0).toUpperCase() + res.slice(1)}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-stone-300 font-semibold">
                Players: <span className="font-bold">{playerCount}</span> (
                <span className="font-bold text-yellow-300">{percentage.toFixed(1)}%</span>)
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
