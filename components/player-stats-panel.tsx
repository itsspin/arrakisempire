"use client"

import type { Player } from "@/types/game"

interface PlayerStatsPanelProps {
  player: Player
}

export function PlayerStatsPanel({ player }: PlayerStatsPanelProps) {
  const playerHealthPercent = (player.health / player.maxHealth) * 100
  const playerEnergyPercent = (player.energy / player.maxEnergy) * 100
  const playerXPPercent = (player.experience / player.experienceToNext) * 100

  return (
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
              className="progress-bar-fill h-full rounded bg-red-500"
              style={{ width: `${playerHealthPercent}%` }}
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
            <div className="bg-blue-500 h-full rounded" style={{ width: `${playerEnergyPercent}%` }}></div>
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
            <div className="bg-purple-500 h-full rounded" style={{ width: `${playerXPPercent}%` }}></div>
          </div>
        </div>
        <div className="p-2 bg-stone-600 rounded">
          <div className="flex justify-between mb-1">
            <span>Prestige Level:</span>
            <span className="font-mono text-purple-400 font-bold prestige-glow">{player.prestigeLevel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
