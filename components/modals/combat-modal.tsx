"use client"

import type { Player, Enemy, Combat, Ability } from "@/types/game"
import { useState, useEffect, useRef, useCallback } from "react"
import { CONFIG } from "@/lib/constants"

interface CombatModalProps {
  isOpen: boolean
  player: Player
  enemy: Enemy
  combatState: Combat
  onPlayerAttack: (damage: number, isCrit: boolean, miniGameSuccess: boolean) => void
  onEnemyAttack: (damage: number, isDodge: boolean) => void
  onFlee: (success: boolean) => void
  onCombatEnd: (result: "win" | "lose" | "flee") => void
  addNotification: (message: string, type?: "success" | "error" | "warning" | "info" | "legendary") => void
  onActivateAbility: (ability: Ability) => void // New prop for activating abilities
  abilityCooldowns: Record<string, number> // New prop for ability cooldowns
  onDefend: () => void // New prop for defend action
  enemyLevel: number // New prop for dynamic target zone
}

export function CombatModal({
  isOpen,
  player,
  enemy,
  combatState,
  onPlayerAttack,
  onEnemyAttack,
  onFlee,
  onCombatEnd,
  addNotification,
  onActivateAbility,
  abilityCooldowns,
  onDefend,
  enemyLevel, // This prop is no longer directly used for spar bar, but kept for potential future scaling logic
}: CombatModalProps) {
  const [currentLog, setCurrentLog] = useState<string[]>(combatState.log)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [combatAnimation, setCombatAnimation] = useState<"hit" | "crit" | "dodge" | "miss" | null>(null)

  // Effect to clear combat animation after a short delay
  useEffect(() => {
    if (combatAnimation) {
      const timer = setTimeout(() => {
        setCombatAnimation(null)
      }, 500) // Animation duration
      return () => clearTimeout(timer)
    }
  }, [combatAnimation])

  const playerHealthPercent = (player.health / player.maxHealth) * 100
  const enemyHealthPercent = (enemy.currentHealth / enemy.health) * 100

  // Scroll to bottom of combat log on new messages
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentLog])

  // Update log when combatState.log changes in parent
  useEffect(() => {
    setCurrentLog(combatState.log)
  }, [combatState.log])

  const handlePlayerAction = useCallback(
    (actionType: "attack" | "defend" | "flee") => {
      if (combatState.turn !== "player") return // Only allow action on player's turn

      if (actionType === "attack") {
        // Calculate player damage: base attack + weapon attack - enemy defense
        let playerDamage = Math.max(1, player.attack + (player.equipment?.weapon?.attack || 0) - enemy.defense)
        const isCrit = Math.random() * 100 < player.critChance

        if (isCrit) {
          playerDamage = Math.floor(playerDamage * 1.5) // 150% crit damage
        }
        onPlayerAttack(playerDamage, isCrit, false)
        setCombatAnimation(isCrit ? "crit" : "hit")
      } else if (actionType === "defend") {
        onDefend()
      } else if (actionType === "flee") {
        const success = Math.random() < CONFIG.FLEE_CHANCE
        onFlee(success)
      }
    },
    [combatState.turn, player, enemy, onPlayerAttack, onDefend, onFlee],
  )

  // This effect will trigger enemy's turn when combatState.turn becomes "enemy"
  useEffect(() => {
    if (combatState.active && combatState.turn === "enemy") {
      // Simulate enemy thinking/delay before attacking
      const enemyActionDelay = 1000 // 1 second delay for enemy to attack
      const timer = setTimeout(() => {
        // Calculate enemy damage: base attack - (player defense + armor defense + accessory defense)
        const enemyDamage = Math.max(
          1,
          enemy.attack -
            (player.defense + (player.equipment?.armor?.defense || 0) + (player.equipment?.accessory?.defense || 0)),
        )
        const isDodge = Math.random() * 100 < player.dodgeChance

        onEnemyAttack(enemyDamage, isDodge)
      }, enemyActionDelay)

      return () => clearTimeout(timer) // Cleanup timer if component unmounts or turn changes
    }
  }, [combatState.active, combatState.turn, enemy, player, onEnemyAttack])

  const getCooldownRemaining = (abilityId: string) => {
    const cooldownEnd = abilityCooldowns[abilityId]
    if (!cooldownEnd) return 0
    const remaining = cooldownEnd - Date.now()
    return Math.max(0, Math.ceil(remaining / 1000))
  }

  if (!isOpen) return null

  const isPlayerTurn = combatState.turn === "player" && combatState.active

  return (
    <div className="modal-overlay">
      <div className="combat-modal-content">
        <h3 className="text-2xl font-orbitron text-red-400 mb-4 text-center">
          ⚔️ Combat: {enemy.name} (Lv.{enemy.level})
        </h3>

        <div className="grid grid-cols-2 gap-4 items-center">
          {/* Player Info */}
          <div
            className={`bg-stone-800 p-4 rounded-lg border border-amber-500 ${combatAnimation === "dodge" ? "animate-dodge" : ""}`}
          >
            <h4 className="text-xl font-semibold text-amber-300">{player.name}</h4>
            <p className="text-sm text-stone-400">Level: {player.level}</p>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Health:</span>
                <span className="font-mono text-red-400">
                  {player.health}/{player.maxHealth}
                </span>
              </div>
              <div className="health-bar-container">
                <div className="health-bar-fill" style={{ width: `${playerHealthPercent}%` }}></div>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <p>Attack: {player.attack + (player.equipment?.weapon?.attack || 0)}</p>
              <p>
                Defense:{" "}
                {player.defense + (player.equipment?.armor?.defense || 0) + (player.equipment?.accessory?.defense || 0)}
              </p>
            </div>
          </div>

          {/* Enemy Info */}
          <div
            className={`bg-stone-800 p-4 rounded-lg border border-red-500 ${combatAnimation === "hit" ? "animate-hit" : combatAnimation === "crit" ? "animate-crit" : ""}`}
          >
            <h4 className="text-xl font-semibold text-red-300">
              {enemy.icon} {enemy.name}
            </h4>
            <p className="text-sm text-stone-400">Level: {enemy.level}</p>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Health:</span>
                <span className="font-mono text-red-400">
                  {enemy.currentHealth}/{enemy.health}
                </span>
              </div>
              <div className="health-bar-container">
                <div className="health-bar-fill" style={{ width: `${enemyHealthPercent}%` }}></div>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <p>Attack: {enemy.attack}</p>
              <p>Defense: {enemy.defense}</p>
            </div>
          </div>
        </div>

        {/* Combat Log */}
        <div className="combat-log">
          {currentLog.map((entry, index) => (
            <p key={index} dangerouslySetInnerHTML={{ __html: entry }}></p>
          ))}
          <div ref={logEndRef} /> {/* Scroll target */}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          {combatState.active && (
            <>
              <p className="text-center text-amber-300 font-semibold">
                {isPlayerTurn ? "Your Turn!" : "Enemy's Turn..."}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handlePlayerAction("attack")}
                  disabled={!isPlayerTurn}
                  className="action-button bg-green-600 hover:bg-green-700"
                >
                  Attack!
                </button>
                <button
                  onClick={() => handlePlayerAction("defend")}
                  disabled={!isPlayerTurn}
                  className="action-button bg-blue-600 hover:bg-blue-700"
                >
                  Defend
                </button>
                <button
                  onClick={() => handlePlayerAction("flee")}
                  disabled={!isPlayerTurn}
                  className="action-button bg-stone-600 hover:bg-stone-700"
                >
                  Flee
                </button>
              </div>

              {/* Abilities in Combat */}
              {player.unlockedAbilities.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-amber-300 mb-2 text-center">Combat Abilities</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {player.unlockedAbilities.map((ability) => {
                      const cooldownRemaining = getCooldownRemaining(ability.id)
                      const isActive = player.activeAbility?.id === ability.id
                      return (
                        <button
                          key={ability.id}
                          onClick={() => onActivateAbility(ability)}
                          disabled={cooldownRemaining > 0 || isActive || !isPlayerTurn}
                          className={`w-full py-2 px-1 rounded-md font-semibold text-xs transition duration-150 ease-in-out
                          ${isActive ? "bg-purple-800 text-white border border-purple-500 animate-pulse" : "bg-blue-600 hover:bg-blue-700 text-white"}
                          ${cooldownRemaining > 0 || !isPlayerTurn ? "disabled:bg-stone-500 disabled:cursor-not-allowed" : ""}
                        `}
                          title={
                            cooldownRemaining > 0
                              ? `Cooldown: ${cooldownRemaining}s`
                              : isActive
                                ? `Active for ${Math.ceil(Math.max(0, abilityCooldowns[ability.id] - ability.cooldown + ability.duration - Date.now()) / 1000)}s`
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
                </div>
              )}
            </>
          )}
          {!combatState.active && (
            <button onClick={() => onCombatEnd("flee")} className="action-button bg-stone-600 hover:bg-stone-700">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
