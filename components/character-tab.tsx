"use client"

import React from "react"
import type { Player, Equipment, Item, Ability, Resources } from "@/types/game"
import { CONFIG, CRAFTING_RECIPES } from "@/lib/constants" // For MAX_INVENTORY and crafting costs
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface CharacterTabProps {
  player: Player
  equipment: Equipment
  inventory: (Item | null)[]
  resources: Resources
  onEquipItem: (item: Item, inventoryIndex: number) => void
  onSellItem: (item: Item, inventoryIndex: number) => void
  onOpenPrestigeModal: () => void // New prop
  onActivateAbility: (ability: Ability) => void // New prop
  abilityCooldowns: Record<string, number> // New prop
  onCraftItem: (
    recipeId:
      | "healingStim"
      | "battleStim"
      | "xpPotion"
      | "healthPotion"
      | "bandage"
      | "attackPotion"
  ) => void
}

export function CharacterTab({
  player,
  equipment,
  inventory,
  resources,
  onEquipItem,
  onSellItem,
  onOpenPrestigeModal,
  onActivateAbility,
  abilityCooldowns,
  onCraftItem,
}: CharacterTabProps) {
  const xpBuff = player.xpBuffExpires && player.xpBuffExpires > Date.now() ? player.xpBuffMultiplier || 1 : 1
  const totalXPGainBonus =
    (player.globalGainMultiplier * xpBuff * (player.house === "atreides" ? 1.25 : 1) - 1) * 100

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

  const getItemTooltip = (item: Item) => {
    const lines = [item.name, item.description]
    if (item.attack) lines.push(`Attack: +${item.attack}`)
    if (item.defense) lines.push(`Defense: +${item.defense}`)
    if (item.special) lines.push(`Special: ${item.special}`)
    return lines.join("\n")
  }

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
          <TooltipProvider delayDuration={0}>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              {(Object.keys(equipment) as Array<keyof Equipment>).map((slot) => {
                const eqItem = equipment[slot]
                return (
                  <div key={slot}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`inventory-slot mx-auto mb-2 w-16 h-16 ${eqItem ? `rarity-${eqItem.rarity}` : ""}`}
                        >
                          {eqItem?.icon || ""}
                        </div>
                      </TooltipTrigger>
                      {eqItem && (
                        <TooltipContent>
                          <div className="whitespace-pre-line">{getItemTooltip(eqItem)}</div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <span className="text-sm font-semibold capitalize">{slot}</span>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>

          <h3 className="text-xl font-semibold mb-4 text-amber-300">
            Inventory ({inventory.filter((i) => i).length}/{CONFIG.MAX_INVENTORY})
          </h3>
          <TooltipProvider delayDuration={0}>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {inventory.map((item, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={`inventory-slot ${item ? `rarity-${item.rarity} cursor-pointer hover:border-amber-500` : "opacity-50"}`}
                      onClick={() => item && onEquipItem(item, index)}
                      onContextMenu={(e) => {
                        if (!item) return
                        e.preventDefault()
                        onSellItem(item, index)
                      }}
                    >
                      {item?.icon || ""}
                    </div>
                  </TooltipTrigger>
                  {item && (
                    <TooltipContent>
                      <div className="whitespace-pre-line">{getItemTooltip(item)}</div>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
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
            <h3 className="text-xl font-semibold mb-4 text-amber-300">Crafting</h3>
            <div className="space-y-2 text-sm">
              {(
                [
                  "healingStim",
                  "battleStim",
                  "xpPotion",
                  "healthPotion",
                  "bandage",
                  "attackPotion",
                ] as const
              ).map((id) => {
                const recipe = CRAFTING_RECIPES[id]
                const canCraft =
                  resources.plasteel >= recipe.plasteel &&
                  resources.rareMaterials >= recipe.rareMaterials &&
                  resources.melange >= recipe.melange
                return (
                  <button
                    key={id}
                    onClick={() => onCraftItem(id)}
                    disabled={!canCraft}
                    className="w-full py-2 px-3 rounded-md font-semibold bg-green-700 hover:bg-green-800 text-white disabled:bg-stone-500 disabled:cursor-not-allowed"
                    title={`Cost: ${recipe.plasteel} 🔧 ${recipe.rareMaterials} 💎 ${recipe.melange} 🔥`}
                  >
                    Craft {
                      id === "healingStim"
                        ? "Healing Stim"
                        : id === "battleStim"
                          ? "Battle Stim"
                          : id === "xpPotion"
                            ? "XP Potion"
                            : id === "healthPotion"
                              ? "Health Potion"
                              : id === "bandage"
                                ? "Bandage"
                                : "Attack Potion"
                    }
                  </button>
                )
              })}
            </div>
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
