"use client"

import { STATIC_DATA } from "@/lib/game-data"

interface HouseSelectionModalProps {
  isOpen: boolean
  onSelect: (houseKey: string) => void
}

export function HouseSelectionModal({ isOpen, onSelect }: HouseSelectionModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <h3 className="text-2xl font-orbitron text-amber-400 mb-4 text-center">Choose Your House</h3>
        <p className="text-stone-300 mb-6 text-center">
          Align yourself with one of the Great Houses of the Imperium, or the resilient Fremen. Each offers unique
          advantages on Arrakis.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(STATIC_DATA.HOUSES).map(([key, house]) => (
            <div
              key={key}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                house.color === "house-atreides"
                  ? "border-blue-500 hover:bg-blue-900/20"
                  : house.color === "house-harkonnen"
                    ? "border-red-500 hover:bg-red-900/20"
                    : "border-green-500 hover:bg-green-900/20"
              } bg-stone-800 hover:scale-105`}
              onClick={() => onSelect(key)}
            >
              <h4 className={`text-xl font-orbitron mb-2 ${house.color}`}>{house.name}</h4>
              <p className="text-sm text-stone-400 mb-3">{house.description}</p>
              <p className="text-xs text-amber-300 font-semibold">Starting Bonus:</p>
              <ul className="text-xs text-stone-300 list-disc list-inside">
                {Object.entries(house.startingBonus).map(([res, val]) => (
                  <li key={res}>
                    +{val} {res.charAt(0).toUpperCase() + res.slice(1)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
