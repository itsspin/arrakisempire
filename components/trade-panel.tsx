"use client"

import type { Player, Resources } from "@/types/game"

interface TradePanelProps {
  player: Player
  resources: Resources
  onOpenTrading: () => void
}

export function TradePanel({ player, resources, onOpenTrading }: TradePanelProps) {
  return (
    <div className="bg-stone-800 p-6 rounded-lg border border-stone-600">
      <h3 className="text-xl font-semibold mb-4 text-amber-300">🤝 Interstellar Trade Network</h3>
      <p className="text-stone-300 mb-6 text-sm">
        Engage in lucrative trade with other players and factions across the Imperium. Buy low, sell high, and corner
        the market on vital resources.
      </p>
      <div className="space-y-4">
        <div className="bg-stone-900 p-4 rounded-lg border border-blue-500">
          <h4 className="text-lg font-semibold text-blue-300 mb-2">Your Current Resources:</h4>
          <ul className="text-sm text-stone-300 list-disc list-inside">
            <li>Spice: {resources.spice.toLocaleString()} ✨</li>
            <li>Melange: {resources.melange.toLocaleString()} 🔥</li>
            <li>Solari: {resources.solari.toLocaleString()} 💰</li>
            <li>Water: {resources.water.toLocaleString()} 💧</li>
            <li>Plasteel: {resources.plasteel.toLocaleString()} 🔧</li>
            <li>Rare Materials: {resources.rareMaterials.toLocaleString()} 💎</li>
          </ul>
        </div>
        <div className="bg-stone-900 p-4 rounded-lg border border-yellow-500">
          <h4 className="text-lg font-semibold text-yellow-300 mb-2">Market Overview:</h4>
          <p className="text-sm text-stone-400">
            Current market prices fluctuate based on supply and demand.
            <br />
            (Trading functionality coming soon!)
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-300">
            <div>
              Spice Price: <span className="text-green-400">1.2 Solari/unit</span>
            </div>
            <div>
              Melange Price: <span className="text-green-400">50 Solari/unit</span>
            </div>
            <div>
              Water Price: <span className="text-red-400">0.8 Solari/unit</span>
            </div>
            <div>
              Plasteel Price: <span className="text-green-400">2.5 Solari/unit</span>
            </div>
          </div>
        </div>
      </div>
      <button
        className="w-full mt-6 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition duration-150 ease-in-out"
        onClick={onOpenTrading}
      >
        Browse Trade Offers
      </button>
    </div>
  )
}
