"use client"

import type { GameState, Resources } from "@/types/game"
import { CONFIG } from "@/lib/constants"

interface BountyBoardProps {
  onlinePlayers: GameState["onlinePlayers"]
  bounties: Record<string, number>
  resources: Resources
  onAddBounty: (playerId: string) => void
  onTrack: (playerId: string) => void
  trackingTargetId: string | null
}

export function BountyBoard({
  onlinePlayers,
  bounties,
  resources,
  onAddBounty,
  onTrack,
  trackingTargetId,
}: BountyBoardProps) {
  const players = Object.values(onlinePlayers)
  return (
    <div className="bg-stone-800 p-6 rounded-lg border border-red-600">
      <h3 className="text-xl font-semibold mb-4 text-red-300">🎯 Bounty Board</h3>
      {players.length === 0 ? (
        <p className="text-stone-400 text-sm">No targets available.</p>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-stone-900 p-2 rounded"
            >
              <span className={`font-semibold player-color-${p.color}`}>{p.name}</span>
              <span className="text-amber-400 text-sm mr-2">
                💰 {bounties[p.id] || p.bounty || 0}
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => onAddBounty(p.id)}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                  disabled={resources.solari < CONFIG.BOUNTY_INCREMENT}
                >
                  Add Bounty
                </button>
                <button
                  onClick={() => onTrack(p.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                  disabled={trackingTargetId === p.id}
                >
                  {trackingTargetId === p.id ? "Tracking" : "Track"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
