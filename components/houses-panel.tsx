"use client"

import React from "react"
import { STATIC_DATA } from "@/lib/game-data"
import type { GameState, TerritoryDetails, Player } from "@/types/game"

interface HousesPanelProps {
  onlinePlayers: GameState["onlinePlayers"]
  territories?: Record<string, TerritoryDetails>
  player: Pick<Player, "id" | "house">
}

export function HousesPanel({ onlinePlayers, territories = {}, player }: HousesPanelProps) {
  // Calculate player distribution per house
  const houseCounts: Record<string, number> = {}
  let totalPlayersWithHouse = 0
  Object.values(onlinePlayers).forEach((player) => {
    if (player.house) {
      houseCounts[player.house] = (houseCounts[player.house] || 0) + 1
      totalPlayersWithHouse++
    }
  })

  // Calculate territory control per house
  const territoryCounts: Record<string, number> = {
    atreides: 0,
    harkonnen: 0,
    fremen: 0,
    unclaimed: 0,
  }

  Object.values(territories).forEach((territory) => {
    if (territory.ownerId) {
      if (territory.ownerId === player.id && player.house) {
        territoryCounts[player.house] = (territoryCounts[player.house] || 0) + 1
      } else if (onlinePlayers[territory.ownerId] && onlinePlayers[territory.ownerId].house) {
        const houseKey = onlinePlayers[territory.ownerId].house!
        territoryCounts[houseKey] = (territoryCounts[houseKey] || 0) + 1
      } else {
        territoryCounts.unclaimed++
      }
    } else {
      territoryCounts.unclaimed++
    }
  })

  const totalTerritories = Object.keys(territories).length

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
          const territoryCount = territoryCounts[key] || 0
          const territoryPercent = totalTerritories > 0 ? (territoryCount / totalTerritories) * 100 : 0
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
              <p className="text-sm text-stone-300 font-semibold">
                Control: <span className="font-bold">{territoryCount}</span> (
                <span className="font-bold text-yellow-300">{territoryPercent.toFixed(1)}%</span>)
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
