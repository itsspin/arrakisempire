"use client"

import React from "react"
import type { Ability } from "@/types/game"

interface AbilitySelectionModalProps {
  isOpen: boolean
  onSelect: (abilityId: string) => void
  availableAbilities: Ability[]
}

export function AbilitySelectionModal({ isOpen, onSelect, availableAbilities }: AbilitySelectionModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl">
        <h3 className="text-3xl font-orbitron text-amber-400 mb-6 text-center">
          ✨ Choose Your Path: New Ability Unlocked! ✨
        </h3>
        <p className="text-stone-300 mb-8 text-center">
          You have reached a new level of mastery. Select one powerful ability to aid you on Arrakis.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableAbilities.map((ability) => (
            <div
              key={ability.id}
              className="p-6 rounded-lg border-2 border-purple-500 bg-stone-800 hover:bg-purple-900/20 cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={() => onSelect(ability.id)}
            >
              <div className="flex items-center mb-3">
                <span className="text-4xl mr-3">{ability.icon}</span>
                <h4 className="text-xl font-orbitron text-purple-300">{ability.name}</h4>
              </div>
              <p className="text-sm text-stone-400 mb-3">{ability.description}</p>
              <p className="text-xs text-amber-300 font-semibold">
                Effect: {ability.effectType.replace(/_/g, " ")} {ability.effectValue > 0 ? "+" : ""}
                {ability.effectValue}%
              </p>
              <p className="text-xs text-stone-300">Cooldown: {ability.cooldown / 1000}s</p>
              <p className="text-xs text-stone-300">Duration: {ability.duration / 1000}s</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
