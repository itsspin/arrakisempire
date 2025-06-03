"use client"

import type { TerritoryDetails, Resources } from "@/types/game"

interface TerritoryModalProps {
  isOpen: boolean
  onClose: () => void
  territory: TerritoryDetails | null
  playerResources: Resources
  onPurchase: (territoryId: string, cost: number) => void
}

export function TerritoryModal({ isOpen, onClose, territory, playerResources, onPurchase }: TerritoryModalProps) {
  if (!isOpen || !territory) return null

  const canAfford = playerResources.solari >= territory.purchaseCost

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <h3 className="text-2xl font-orbitron text-amber-400 mb-4">
          Territory Details: {territory.name || `Sector (${territory.x}, ${territory.y})`}
        </h3>
        {territory.ownerId ? (
          <div>
            <p className="text-stone-300 mb-2">
              Owner:{" "}
              <span className={`font-bold player-color-${territory.ownerColor || "gray"}`}>
                {territory.ownerName || "Unknown"}
              </span>
            </p>
            <p className="text-stone-400 text-sm">This territory is already claimed.</p>
            {/* Could add options to attack/contest in the future */}
          </div>
        ) : (
          <div>
            <p className="text-stone-300 mb-2">
              Cost: <span className="font-bold text-yellow-400">{territory.purchaseCost.toLocaleString()} Solari</span>
            </p>
            <p className="text-stone-300 mb-1">Perks upon purchase:</p>
            <ul className="list-disc list-inside text-sm text-stone-400 mb-4">
              {territory.perks.map((perk, i) => (
                <li key={i}>{perk}</li>
              ))}
              {territory.resourceYield &&
                Object.entries(territory.resourceYield).map(([res, amount]) => (
                  <li key={res}>
                    +{amount} {res}/min (passive)
                  </li>
                ))}
            </ul>
            <button
              onClick={() =>
                onPurchase(
                  `${territory.x},${territory.y}`,
                  territory.purchaseCost,
                )
              }
              disabled={!canAfford}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded font-bold text-lg disabled:bg-stone-500 disabled:cursor-not-allowed"
            >
              {canAfford ? "Purchase Territory" : "Not Enough Solari"}
            </button>
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2 bg-stone-600 hover:bg-stone-700 rounded text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
