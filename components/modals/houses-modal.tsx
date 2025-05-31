"use client"

import { STATIC_DATA } from "@/lib/game-data"
import type { GameState } from "@/types/game"

interface HousesModalProps {
  isOpen: boolean
  onClose: () => void
  onlinePlayers: GameState["onlinePlayers"] // New prop
}

export function HousesModal({ isOpen, onClose, onlinePlayers }: HousesModalProps) {
  if (!isOpen) return null

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
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-3xl font-orbitron text-amber-400 mb-6 text-center">🏛️ Great Houses of Arrakis</h3>
        <p className="text-stone-300 mb-8 text-center">
          Learn about the factions vying for control of the Spice. Each house offers unique advantages.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(STATIC_DATA.HOUSES).map(([key, house]) => {
            const playerCount = houseCounts[key] || 0
            const percentage = totalPlayersWithHouse > 0 ? (playerCount / totalPlayersWithHouse) * 100 : 0
            return (
              <div
                key={key}
                className={`p-6 rounded-lg border-2 ${
                  house.color === "house-atreides"
                    ? "border-blue-500"
                    : house.color === "house-harkonnen"
                      ? "border-red-500"
                      : "border-green-500"
                } bg-stone-800`}
              >
                <h4 className={`text-xl font-orbitron mb-2 ${house.color}`}>{house.name}</h4>
                <p className="text-sm text-stone-400 mb-3">{house.description}</p>
                <p className="text-xs text-amber-300 font-semibold">Starting Bonus:</p>
                <ul className="text-xs text-stone-300 list-disc list-inside mb-3">
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
        <button onClick={onClose} className="w-full mt-8 py-3 bg-stone-600 hover:bg-stone-700 rounded text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
