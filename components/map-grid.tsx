"use client"

import type React from "react"

import type { GameState, Player } from "@/types/game"
import { CONFIG, HOUSE_COLORS } from "@/lib/constants"
import { isInBaseArea } from "@/lib/utils"

interface MapGridProps {
  player: Player
  mapData: GameState["map"]
  onlinePlayers: GameState["onlinePlayers"]
  worldEvents: GameState["worldEvents"]
  onCellClick: (x: number, y: number) => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  trackingTarget?: { x: number; y: number } | null
}

export function MapGrid({
  player,
  mapData,
  onlinePlayers,
  worldEvents,
  onCellClick,
  zoom = 1,
  onZoomChange,
  trackingTarget = null,
}: MapGridProps) {
  const { x: playerX, y: playerY } = player.position
  const radius = CONFIG.VIEW_RADIUS

  let arrow = ""
  if (trackingTarget) {
    const dx = trackingTarget.x - playerX
    const dy = trackingTarget.y - playerY
    if (Math.abs(dx) > Math.abs(dy)) {
      arrow = dx > 0 ? "→" : "←"
    } else if (Math.abs(dy) > Math.abs(dx)) {
      arrow = dy > 0 ? "↓" : "↑"
    } else if (dx > 0 && dy > 0) arrow = "↘"
    else if (dx > 0 && dy < 0) arrow = "↗"
    else if (dx < 0 && dy > 0) arrow = "↙"
    else if (dx < 0 && dy < 0) arrow = "↖"
  }

  const cells = []
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = playerX + dx
      const y = playerY + dy
      const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !(dx === 0 && dy === 0)
      const key = `${x},${y}`

      let cellClass = "map-cell"
      let cellContent = ""
      let cellTitle = `Desert (${x},${y})`
      let hasBackground = false
      let playerLabel: string | null = null
      let houseIndicatorClass: string | null = null

      // Player
      if (x === playerX && y === playerY) {
        cellClass += " map-cell-player"
        hasBackground = true
        cellContent = "👤"
        cellTitle = `${player.name} (P${player.prestigeLevel}) - Your Position`
        playerLabel = player.name
        if (player.house) {
          const hc = HOUSE_COLORS[player.house as keyof typeof HOUSE_COLORS]
          if (hc) houseIndicatorClass = `player-color-${hc}`
        }
      }
      // Other players
      else {
        const otherPlayerOnCell = Object.values(onlinePlayers).find(
          (op) => op.position?.x === x && op.position?.y === y,
        )
        if (otherPlayerOnCell) {
          cellClass += ` map-cell-other-player player-color-${otherPlayerOnCell.color || "gray"}`
          hasBackground = true
          cellContent = "👤"
          cellTitle = `${otherPlayerOnCell.name} (P${otherPlayerOnCell.prestigeLevel || 0})`
          playerLabel = otherPlayerOnCell.name
          if (otherPlayerOnCell.house) {
            const hc = HOUSE_COLORS[otherPlayerOnCell.house as keyof typeof HOUSE_COLORS]
            if (hc) houseIndicatorClass = `player-color-${hc}`
          }
        }
      }

      // Territories
      const territory = mapData.territories[key]
      if (territory) {
        cellClass += " map-cell-territory"
        if (territory.ownerId === player.id) {
          cellTitle = `Your Territory: ${territory.name || key}`
        } else if (territory.ownerId) {
          cellClass += ` player-color-${territory.ownerColor || "gray"}`
          cellTitle = `Territory of ${territory.ownerName || "Unknown"} (${key})`
        } else {
          cellTitle = `Unclaimed Territory (${key}) - Cost: ${territory.purchaseCost}`
        }
        if (territory.ownerId) hasBackground = true
      }

      // Player base cells
      if (isInBaseArea(player, x, y)) {
        cellClass += " map-cell-base"
        cellContent = "🏠"
        cellTitle = "Your Base"
        hasBackground = true
      }

      // Enemies
      const enemy = mapData.enemies[key]
      if (enemy && cellContent === "") {
        if (enemy.special) cellClass += " map-cell-special-enemy"
        else if (enemy.boss) cellClass += " map-cell-boss"
        else cellClass += " map-cell-enemy"
        cellContent = enemy.icon
        cellTitle = `${enemy.name} (Lv.${enemy.level})`
        hasBackground = true
      }

      // Seekers
      const seeker = mapData.seekers[key]
      if (seeker && cellContent === "") {
        cellClass += " map-cell-seeker"
        cellContent = "🛰️"
        cellTitle = `Seeker from ${seeker.ownerName}`
        hasBackground = true
      }

      // World Events Markers (can be an overlay on the cell)
      const eventOnCell = worldEvents.find((e) => e.position?.x === x && e.position?.y === y)
      if (eventOnCell && cellContent === "") {
        cellClass += " map-cell-world-event"
        cellContent = eventOnCell.icon
        cellTitle = `${eventOnCell.name}: ${eventOnCell.description}`
        hasBackground = true
      }

      if (isAdjacent) {
        cellClass += " map-cell-movable"
      }

      if (!hasBackground) {
        cellClass += " map-cell-desert"
      }

      cells.push(
        <div
          key={key}
          className={cellClass}
          title={cellTitle}
          onClick={() => onCellClick(x, y)}
          style={
            territory && territory.ownerId
              ? {
                  borderColor: `var(--player-color-${territory.ownerColor || "gray"})`,
                  backgroundColor: `var(--player-color-${territory.ownerColor || "gray"})`,
                }
              : {}
          }
        >
          {playerLabel && <span className="player-name-label">{playerLabel}</span>}
          {houseIndicatorClass && <span className={`house-indicator ${houseIndicatorClass}`} />}
          {seeker && (
            <span className="seeker-countdown">{Math.max(0, Math.ceil((seeker.claimTime - Date.now()) / 1000))}</span>
          )}
          {cellContent}
        </div>,
      )
    }
  }

  const gridStyle = {
    "--cell-size": `${32 * zoom}px`,
    "--map-columns": radius * 2 + 1,
  } as React.CSSProperties


  return (
    <div className="relative">
      {arrow && <div className="tracking-arrow">{arrow}</div>}
      <div className="map-grid mx-auto overflow-x-auto" style={gridStyle}>
        {cells}
      </div>
    </div>
  )
}
