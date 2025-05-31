"use client"

import type { Player, Resources } from "@/types/game"

interface SidebarProps {
  player: Player
  resources: Resources
}

export function Sidebar({ player, resources }: SidebarProps) {
  return (
    <div className="flex flex-col p-4 space-y-4 overflow-y-auto">
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
    </div>
  )
}
