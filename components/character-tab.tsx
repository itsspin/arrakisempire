"use client"

import type { Player, Equipment, Item } from "@/types/game"
import { CONFIG } from "@/lib/constants" // For MAX_INVENTORY

interface CharacterTabProps {
  player: Player
  equipment: Equipment
  inventory: (Item | null)[]
  onEquipItem: (item: Item, inventoryIndex: number) => void
  // Add more props for character management actions if needed
}

export function CharacterTab({ player, equipment, inventory, onEquipItem }: CharacterTabProps) {
  const stats = [
    { label: "Attack Power", value: player.attack, color: "text-red-400" },
    { label: "Defense Rating", value: player.defense, color: "text-blue-400" },
    { label: "Critical Chance", value: `${player.critChance}%`, color: "text-yellow-400" },
    { label: "Dodge Chance", value: `${player.dodgeChance}%`, color: "text-green-400" },
    {
      label: "Spice Harvest Bonus",
      value: `${player.house === "fremen" ? "40%" : player.house === "harkonnen" ? "20%" : "0%"}`,
      color: "text-amber-400",
    },
    { label: "XP Gain Bonus", value: `${player.house === "atreides" ? "25%" : "0%"}`, color: "text-purple-400" },
  ]

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-3xl font-orbitron text-amber-400 mb-6">👤 Character Profile</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Equipment and Inventory */}
        <div className="bg-stone-800 p-6 rounded-lg border border-stone-600">
          <h3 className="text-xl font-semibold mb-4 text-amber-300">Equipment</h3>
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            {(Object.keys(equipment) as Array<keyof Equipment>).map((slot) => (
              <div key={slot}>
                <div title={equipment[slot]?.name || "Empty"} className="inventory-slot mx-auto mb-2 w-16 h-16">
                  {equipment[slot]?.icon || ""}
                </div>
                <span className="text-sm font-semibold capitalize">{slot}</span>
              </div>
            ))}
          </div>

          <h3 className="text-xl font-semibold mb-4 text-amber-300">
            Inventory ({inventory.filter((i) => i).length}/{CONFIG.MAX_INVENTORY})
          </h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
            {inventory.map((item, index) => (
              <div
                key={index}
                title={item ? `${item.name}\n${item.description}` : "Empty Slot"}
                className={`inventory-slot ${item ? "cursor-pointer hover:border-amber-500" : "opacity-50"}`}
                onClick={() => item && onEquipItem(item, index)}
              >
                {item?.icon || ""}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-3">Click an item in inventory to equip it.</p>
        </div>

        {/* Character Statistics */}
        <div className="bg-stone-800 p-6 rounded-lg border border-stone-600">
          <h3 className="text-xl font-semibold mb-4 text-amber-300">Character Statistics</h3>
          <div className="space-y-3 text-sm">
            {stats.map((stat) => (
              <p key={stat.label} className="flex justify-between p-2 bg-stone-700 rounded">
                <span>{stat.label}:</span>
                <span className={`${stat.color} font-bold`}>{stat.value}</span>
              </p>
            ))}
          </div>
          {/* Add skills, abilities, or other management options here */}
        </div>
      </div>
    </div>
  )
}
