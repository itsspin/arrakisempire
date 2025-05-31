"use client"

import type { Player, Enemy, Combat } from "@/types/game"
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
}: CombatModalProps) {
  const [currentLog, setCurrentLog] = useState<string[]>(combatState.log)
  const [miniGameBarPosition, setMiniGameBarPosition] = useState(0)
  const [miniGameRunning, setMiniGameRunning] = useState(false)
  const miniGameRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  const playerHealthPercent = (player.health / player.maxHealth) * 100
  const enemyHealthPercent = (enemy.currentHealth / enemy.health) * 100

  useEffect(() => {
    setCurrentLog(combatState.log)
    if (combatState.active && combatState.turn === "player" && !combatState.miniGameActive) {
      // Player's turn, prepare for mini-game
      setMiniGameRunning(true)
      startTimeRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(animateMiniGame)
    } else if (combatState.active && combatState.turn === "enemy") {
      // Enemy's turn, auto-attack after delay
      const timer = setTimeout(() => {
        handleEnemyTurn()
      }, CONFIG.COMBAT_TURN_DELAY)
      return () => clearTimeout(timer)
    }
  }, [combatState.active, combatState.turn, combatState.miniGameActive, combatState.log])

  const animateMiniGame = (time: DOMHighResTimeStamp) => {
    if (!startTimeRef.current) startTimeRef.current = time
    const elapsed = time - startTimeRef.current
    const progress = (elapsed / CONFIG.COMBAT_MINIGAME_DURATION) % 1
    setMiniGameBarPosition(progress * 90) // 90% because bar is 10% wide

    if (elapsed < CONFIG.COMBAT_MINIGAME_DURATION) {
      animationFrameRef.current = requestAnimationFrame(animateMiniGame)
    } else {
      // Mini-game timed out, treat as a miss
      handleMiniGameClick(false)
    }
  }

  const handleMiniGameClick = useCallback(
    (manualClick: boolean) => {
      if (!miniGameRunning) return

      cancelAnimationFrame(animationFrameRef.current!)
      setMiniGameRunning(false)

      const barElement = miniGameRef.current
      if (!barElement) return

      const barRect = barElement.getBoundingClientRect()
      const targetStart = barRect.width * 0.4 // 40% start
      const targetEnd = barRect.width * 0.6 // 60% end

      const currentBarLeft = (miniGameBarPosition / 90) * barRect.width // Convert percentage to pixels

      const miniGameSuccess = currentBarLeft >= targetStart && currentBarLeft <= targetEnd

      // Calculate player damage
      let playerDamage = Math.max(1, player.attack + (player.equipment.weapon?.attack || 0) - enemy.defense)
      const isCrit = Math.random() * 100 < player.critChance
      if (isCrit) {
        playerDamage = Math.floor(playerDamage * 1.5) // 150% crit damage
      }

      if (!miniGameSuccess) {
        playerDamage = Math.floor(playerDamage * 0.5) // Half damage on mini-game fail
        addNotification("Mini-game failed! Reduced damage.", "warning")
      }

      onPlayerAttack(playerDamage, isCrit, miniGameSuccess)
    },
    [miniGameRunning, miniGameBarPosition, player, enemy, onPlayerAttack, addNotification],
  )

  const handleEnemyTurn = useCallback(() => {
    let enemyDamage = Math.max(
      1,
      enemy.attack - (player.equipment.armor?.defense || 0) - (player.equipment.accessory?.defense || 0),
    )
    const isDodge = Math.random() * 100 < player.dodgeChance
    if (isDodge) {
      enemyDamage = 0 // No damage on dodge
    }
    onEnemyAttack(enemyDamage, isDodge)
  }, [enemy, player, onEnemyAttack])

  const handleFleeAttempt = useCallback(() => {
    const success = Math.random() < CONFIG.FLEE_CHANCE
    onFlee(success)
  }, [onFlee])

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="combat-modal-content">
        <h3 className="text-2xl font-orbitron text-red-400 mb-4 text-center">
          ⚔️ Combat: {enemy.name} (Lv.{enemy.level})
        </h3>

        <div className="grid grid-cols-2 gap-4 items-center">
          {/* Player Info */}
          <div className="bg-stone-800 p-4 rounded-lg border border-amber-500">
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
              <p>Attack: {player.attack + (player.equipment.weapon?.attack || 0)}</p>
              <p>
                Defense:{" "}
                {player.defense + (player.equipment.armor?.defense || 0) + (player.equipment.accessory?.defense || 0)}
              </p>
            </div>
          </div>

          {/* Enemy Info */}
          <div className="bg-stone-800 p-4 rounded-lg border border-red-500">
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
        </div>

        {/* Mini-game and Actions */}
        <div className="flex flex-col gap-4">
          {combatState.turn === "player" && combatState.active && (
            <>
              <p className="text-center text-amber-300 font-semibold">
                {miniGameRunning ? "Click the bar when it's in the green zone!" : "Prepare your attack..."}
              </p>
              <div
                className="mini-game-container"
                ref={miniGameRef}
                onClick={() => handleMiniGameClick(true)}
                style={{ pointerEvents: miniGameRunning ? "auto" : "none" }}
              >
                <div
                  className="mini-game-target"
                  style={{ left: "40%", width: "20%" }} // Green zone from 40% to 60%
                ></div>
                {miniGameRunning && (
                  <div
                    className="mini-game-bar"
                    style={{
                      left: `${miniGameBarPosition}%`,
                      animationDuration: `${CONFIG.COMBAT_MINIGAME_DURATION / 1000}s`,
                    }}
                  ></div>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleMiniGameClick(true)}
                  disabled={!miniGameRunning}
                  className="action-button bg-green-600 hover:bg-green-700"
                >
                  Attack!
                </button>
                <button
                  onClick={handleFleeAttempt}
                  disabled={!combatState.active || combatState.turn !== "player"}
                  className="action-button bg-stone-600 hover:bg-stone-700"
                >
                  Flee
                </button>
              </div>
            </>
          )}
          {combatState.turn === "enemy" && combatState.active && (
            <p className="text-center text-red-300 font-semibold">Enemy's turn...</p>
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
