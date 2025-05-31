"use client"

import type { Player, Resources } from "@/types/game"
// Removed Leaderboard and ActionsPanel imports as they are moved

interface SidebarProps {
  player: Player
  resources: Resources
  // Removed worldEvents, leaderboard, onGenerateSpice, onUpgradeSpiceClick props
}

export function Sidebar({ player, resources }: SidebarProps) {
  return (
    <aside className="w-80 bg-gradient-to-b from-stone-800 to-stone-900 border-r-2 border-amber-600 flex flex-col p-4 space-y-4 overflow-y-auto shadow-lg">
      {/* Resources */}
      <div className="bg-stone-700 p-4 rounded-lg border border-amber-500">
        <h3 className="text-lg font-semibold text-amber-400 mb-3 font-orbitron">📦 Empire Resources</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-stone-600 rounded">
            <span className="flex items-center">
              <span className="text-amber-400 mr-2">✨</span>Spice:
            </span>
            <span className="font-mono text-amber-300 font-bold">{resources.spice.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-600 rounded">
            <span className="flex items-center">
              <span className="text-orange-400 mr-2">🔥</span>Melange:
            </span>
            <span className="font-mono text-orange-300 font-bold">{resources.melange.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-600 rounded">
            <span className="flex items-center">
              <span className="text-blue-400 mr-2">💧</span>Water:
            </span>
            <span className="font-mono text-blue-300 font-bold">{resources.water.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-600 rounded">
            <span className="flex items-center">
              <span className="text-yellow-400 mr-2">💰</span>Solari:
            </span>
            <span className="font-mono text-yellow-300 font-bold">{resources.solari.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-600 rounded">
            <span className="flex items-center">
              <span className="text-gray-400 mr-2">🔧</span>Plasteel:
            </span>
            <span className="font-mono text-gray-300 font-bold">{resources.plasteel.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-600 rounded">
            <span className="flex items-center">
              <span className="text-purple-400 mr-2">💎</span>Rare Materials:
            </span>
            <span className="font-mono text-purple-300 font-bold">{resources.rareMaterials.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Character Stats */}
      <div className="bg-stone-700 p-4 rounded-lg border border-blue-500">
        <h3 className="text-lg font-semibold text-blue-400 mb-3 font-orbitron">⚡ Vital Stats</h3>
        <div className="space-y-3 text-sm">
          <div className="p-2 bg-stone-600 rounded">
            <div className="flex justify-between mb-1">
              <span>Health:</span>
              <span className="font-mono">
                {player.health}/{player.maxHealth}
              </span>
            </div>
            <div className="progress-bar-bg rounded h-3">
              <div
                className="progress-bar-fill h-full rounded bg-red-500" // Added color
                style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="p-2 bg-stone-600 rounded">
            <div className="flex justify-between mb-1">
              <span>Energy:</span>
              <span className="font-mono">
                {player.energy}/{player.maxEnergy}
              </span>
            </div>
            <div className="progress-bar-bg rounded h-3">
              <div
                className="bg-blue-500 h-full rounded"
                style={{ width: `${(player.energy / player.maxEnergy) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="p-2 bg-stone-600 rounded">
            <div className="flex justify-between mb-1">
              <span>
                Level <span className="font-bold">{player.level}</span> (Rank: {player.rankName || player.rank}):
              </span>
              <span className="font-mono text-xs">
                {player.experience}/{player.experienceToNext}
              </span>
            </div>
            <div className="progress-bar-bg rounded h-3">
              <div
                className="bg-purple-500 h-full rounded"
                style={{ width: `${(player.experience / player.experienceToNext) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard and World Events are now moved to app/page.tsx below the map */}
      {/* ActionsPanel is now moved to app/page.tsx above the map */}
    </aside>
  )
}
