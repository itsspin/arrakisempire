"use client"

import type { Player } from "@/types/game"
import { STATIC_DATA } from "@/lib/game-data"

interface HeaderProps {
  player: Player
  onTradeClick: () => void
}

export function Header({ player, onTradeClick }: HeaderProps) {
  const house = player.house ? STATIC_DATA.HOUSES[player.house] : null

  return (
    <header className="bg-gradient-to-r from-stone-800 to-stone-700 border-b-2 border-amber-500 px-6 py-4 fixed top-0 left-0 right-0 z-100 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-4xl font-orbitron font-bold text-amber-400 prestige-glow">🏜️ Arrakis: Spice Empire</h1>
          <span className="text-lg text-amber-200 italic">"The Spice Must Flow"</span>
        </div>
        <div className="flex items-center space-x-8">
          <div className="text-sm">
            <span className="text-stone-400">Player:</span>
            <span className="font-bold text-amber-300 ml-1">{player.name || "Loading..."}</span>
          </div>
          <div className="text-sm">
            <span className="text-stone-400">House:</span>
            <span className="font-semibold ml-1">{house?.name || "None"}</span>
          </div>
          <div className="text-sm">
            <span className="text-stone-400">Prestige:</span>
            <span className="font-bold text-purple-400 prestige-glow ml-1">{player.prestigeLevel}</span>
          </div>
          <button onClick={onTradeClick} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold">
            🤝 Trade
          </button>
        </div>
      </div>
    </header>
  )
}
