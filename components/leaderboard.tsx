"use client"

import type { RankedPlayer } from "@/types/game"
import { STATIC_DATA } from "@/lib/game-data"

interface LeaderboardProps {
  topPlayers: RankedPlayer[]
}

export function Leaderboard({ topPlayers }: LeaderboardProps) {
  return (
    <div className="bg-stone-700 p-4 rounded-lg border border-yellow-500">
      <h3 className="text-lg font-semibold text-yellow-400 mb-3 font-orbitron">🏆 Top Houses</h3>
      <div className="space-y-2 text-sm">
        {topPlayers.length === 0 ? (
          <p className="text-stone-400 text-center">No rankings yet.</p>
        ) : (
          topPlayers.map((player, index) => (
            <div
              key={player.id || index}
              className="leaderboard-entry flex items-center justify-between p-2 bg-stone-600 rounded hover:bg-stone-500/50 transition-all"
            >
              <div className="flex items-center">
                <span className="font-bold mr-2 text-yellow-300">#{player.rank}</span>
                <span className={`font-semibold player-color-${player.color || "gray"}`}>{player.name}</span>
                {player.house && (
                  <span className="ml-2 text-xs text-stone-400">
                    ({STATIC_DATA.HOUSES[player.house]?.name || player.house})
                  </span>
                )}
              </div>
              <span className={`text-xs prestige-glow player-color-${player.color || "gray"}`}>
                P{player.prestigeLevel || 0}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
