"use client"

import type { Player, Resources } from "@/types/game"
import { CONFIG } from "@/lib/constants" // Import CONFIG for costs

interface ActionsPanelProps {
  player: Player
  resources: Resources
  onGenerateSpice: () => void
  onUpgradeSpiceClick: () => void
  onSellSpice: () => void
  onMinePlasteel: () => void
  onCollectWater: () => void
}

export function ActionsPanel({
  player,
  resources,
  onGenerateSpice,
  onUpgradeSpiceClick,
  onSellSpice,
  onMinePlasteel,
  onCollectWater,
}: ActionsPanelProps) {
  const canUpgradeSpiceClick = resources.solari >= player.spiceClickUpgradeCost
  const canSellSpice = resources.spice >= CONFIG.SPICE_SELL_COST
  const canMinePlasteel = resources.energy >= CONFIG.MINE_PLASTEEL_ENERGY_COST
  const canCollectWater = resources.energy >= CONFIG.COLLECT_WATER_ENERGY_COST

  return (
    <div className="bg-stone-700 p-4 rounded-lg border border-amber-500 mb-6">
      <h3 className="text-lg font-semibold text-amber-400 mb-3 font-orbitron">⛏️ Manual Operations</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button onClick={onGenerateSpice} className="action-button w-full text-sm">
          Gather Spice ({player.spicePerClick} ✨)
        </button>
        <button
          onClick={onUpgradeSpiceClick}
          disabled={!canUpgradeSpiceClick}
          className="action-button w-full text-sm"
          title={
            canUpgradeSpiceClick
              ? `Cost: ${player.spiceClickUpgradeCost.toLocaleString()} Solari`
              : `Need ${player.spiceClickUpgradeCost.toLocaleString()} Solari`
          }
        >
          Upgrade Gatherer ({player.spiceClickUpgradeCost.toLocaleString()} 💰)
        </button>
        <button
          onClick={onSellSpice}
          disabled={!canSellSpice}
          className="action-button w-full bg-yellow-600 hover:bg-yellow-700 text-sm"
          title={
            canSellSpice
              ? `Sell ${CONFIG.SPICE_SELL_COST} Spice for ${CONFIG.SPICE_SELL_YIELD} Solari`
              : `Need ${CONFIG.SPICE_SELL_COST} Spice`
          }
        >
          Sell Spice ({CONFIG.SPICE_SELL_COST} ✨ for {CONFIG.SPICE_SELL_YIELD} 💰)
        </button>
        <button
          onClick={onMinePlasteel}
          disabled={!canMinePlasteel}
          className="action-button w-full bg-gray-600 hover:bg-gray-700 text-sm"
          title={
            canMinePlasteel
              ? `Cost: ${CONFIG.MINE_PLASTEEL_ENERGY_COST} Energy`
              : `Need ${CONFIG.MINE_PLASTEEL_ENERGY_COST} Energy`
          }
        >
          Mine Plasteel ({CONFIG.MINE_PLASTEEL_YIELD} 🔧 / {CONFIG.MINE_PLASTEEL_ENERGY_COST} ⚡)
        </button>
        <button
          onClick={onCollectWater}
          disabled={!canCollectWater}
          className="action-button w-full bg-blue-600 hover:bg-blue-700 text-sm"
          title={
            canCollectWater
              ? `Cost: ${CONFIG.COLLECT_WATER_ENERGY_COST} Energy`
              : `Need ${CONFIG.COLLECT_WATER_ENERGY_COST} Energy`
          }
        >
          Collect Water ({CONFIG.COLLECT_WATER_YIELD} 💧 / {CONFIG.COLLECT_WATER_ENERGY_COST} ⚡)
        </button>
      </div>
    </div>
  )
}
