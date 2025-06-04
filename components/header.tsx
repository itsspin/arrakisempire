"use client"

import type { Player } from "@/types/game"
import { STATIC_DATA } from "@/lib/game-data"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface HeaderProps {
  player: Player
  isPaused: boolean
  onTogglePause: () => void
  // Removed onTradeClick, onOpenHousesModal, onOpenWorldEventsModal
}

export function Header({ player, isPaused, onTogglePause }: HeaderProps) {
  const house = player.house ? STATIC_DATA.HOUSES[player.house] : null

  return (
    <header className="bg-gradient-to-r from-stone-800 to-stone-700 border-b-2 border-amber-500 px-4 py-3 md:px-6 md:py-4 fixed top-0 left-0 right-0 z-100 shadow-lg">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-6 mb-2 md:mb-0">
          <h1 className="text-2xl md:text-4xl font-orbitron font-bold text-amber-400 prestige-glow text-center md:text-left">
            🏜️ Arrakis: Spice Empire
          </h1>
          <span className="text-sm md:text-lg text-amber-200 italic hidden md:block">"The Spice Must Flow"</span>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 md:space-x-8 text-sm md:text-base">
          <div className="text-sm">
            <span className="text-stone-400">Player:</span>
            <span className="font-bold text-amber-300 ml-1">{player.name || "Loading..."}</span>
          </div>
          <div className="text-sm hidden sm:block">
            <span className="text-stone-400">House:</span>
            <span className="font-semibold ml-1">{house?.name || "None"}</span>
          </div>
          <div className="text-sm">
            <span className="text-stone-400">Prestige:</span>
            <span className="font-bold text-purple-400 prestige-glow ml-1">{player.prestigeLevel}</span>
          </div>
          <button
            onClick={onTogglePause}
            className="action-button px-2 py-1 text-xs md:text-sm"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => signOut(auth)}
            className="action-button px-2 py-1 text-xs md:text-sm"
          >
            Logout
          </button>
          {/* Removed Trade, Houses, Events buttons - now in Multiplayer tab */}
        </div>
      </div>
    </header>
  )
}
