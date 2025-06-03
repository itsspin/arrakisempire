"use client"

import type { Player, Equipment, Item, Ability } from "@/types/game"
import { CONFIG } from "@/lib/constants" // For MAX_INVENTORY

interface CharacterTabProps {
  player: Player
  equipment: Equipment
  inventory: (Item | null)[]
  onEquipItem: (item: Item, inventoryIndex: number) => void
  onSellItem: (item: Item, inventoryIndex: number) => void
  onOpenPrestigeModal: () => void // New prop
  onActivateAbility: (ability: Ability) => void // New prop
  abilityCooldowns: Record<string, number> // New prop
}

export function CharacterTab({
  player,
  equipment,
  inventory,
  onEquipItem,
  onSellItem,
  onOpenPrestigeModal,
  onActivateAbility,
  abilityCooldowns,
}: CharacterTabProps) {
  const totalXPGainBonus = (player.globalGainMultiplier - 1 + (player.house === "atreides" ? 0.25 : 0)) * 100

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
    { label: "XP Gain Bonus", value: `${totalXPGainBonus.toFixed(1)}%`, color: "text-purple-400" },
  ]

  const getCooldownRemaining = (abilityId: string) => {
    const cooldownEnd = abilityCooldowns[abilityId]
    if (!cooldownEnd) return 0
    const remaining = cooldownEnd - Date.now()
    return Math.max(0, Math.ceil(remaining / 1000))
  }

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
                onContextMenu={(e) => {
                  if (!item) return
                  e.preventDefault()
                  onSellItem(item, index)
                }}
              >
                {item?.icon || ""}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-3">Click an item to equip. Right-click to sell.</p>
        </div>

        {/* Character Statistics & Abilities */}
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

          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4 text-amber-300">Abilities</h3>
            {player.unlockedAbilities.length === 0 ? (
              <p className="text-sm text-stone-400 mb-4">Unlock powerful abilities as you level up!</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {player.unlockedAbilities.map((ability) => {
                  const cooldownRemaining = getCooldownRemaining(ability.id)
                  const isActive = player.activeAbility?.id === ability.id
                  return (
                    <button
                      key={ability.id}
                      onClick={() => onActivateAbility(ability)}
                      disabled={cooldownRemaining > 0 || isActive}
                      className={`w-full py-2 px-3 rounded-md font-semibold text-sm transition duration-150 ease-in-out
                        ${isActive ? "bg-purple-800 text-white border border-purple-500 animate-pulse" : "bg-blue-600 hover:bg-blue-700 text-white"}
                        ${cooldownRemaining > 0 ? "disabled:bg-stone-500 disabled:cursor-not-allowed" : ""}
                      `}
                      title={
                        cooldownRemaining > 0
                          ? `Cooldown: ${cooldownRemaining}s`
                          : isActive
                            ? `Active for ${Math.ceil((player.activeAbility!.duration - (Date.now() - (abilityCooldowns[ability.id] - ability.cooldown))) / 1000)}s`
                            : ability.description
                      }
                    >
                      {ability.icon} {ability.name}
                      {cooldownRemaining > 0 && ` (${cooldownRemaining}s)`}
                      {isActive && " (Active)"}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4 text-amber-300">Prestige</h3>
            <p className="text-sm text-stone-300 mb-4">
              Reach new heights of power by prestiging! Reset your progress for a significant bonus to future gains.
            </p>
            <button
              onClick={player.level >= 20 ? onOpenPrestigeModal : undefined}
              disabled={player.level < 20}
              className={`w-full py-2 px-4 font-semibold rounded-md transition duration-150 ease-in-out ${
                player.level >= 20
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-stone-500 text-white cursor-not-allowed"
              }`}
            >
              {player.level >= 20
                ? `Ascend to Prestige ${player.prestigeLevel + 1}`
                : "Reach Level 20 to Prestige"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
