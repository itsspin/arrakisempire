"use client"

import type { GameState, Player } from "@/types/game"
import { CONFIG } from "@/lib/constants"

interface MapGridProps {
  player: Player
  mapData: GameState["map"]
  onlinePlayers: GameState["onlinePlayers"]
  worldEvents: GameState["worldEvents"]
  onCellClick: (x: number, y: number) => void
}

export function MapGrid({ player, mapData, onlinePlayers, worldEvents, onCellClick }: MapGridProps) {
  const { x: playerX, y: playerY } = player.position
  const radius = CONFIG.VIEW_RADIUS

  const cells = []
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = playerX + dx
      const y = playerY + dy
      const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !(dx === 0 && dy === 0)
      const key = `${x},${y}`

      let cellClass = "map-cell map-cell-desert" // Default to desert
      let cellContent = "" // Default desert cells will be styled by map-cell-desert
      let cellTitle = `Desert (${x},${y})`

      // Player
      if (x === playerX && y === playerY) {
        cellClass += " map-cell-player"
        cellContent = "👤"
        cellTitle = `${player.name} (P${player.prestigeLevel}) - Your Position`
      }
      // Other players
      else {
        const otherPlayerOnCell = Object.values(onlinePlayers).find(
          (op) => op.position?.x === x && op.position?.y === y,
        )
        if (otherPlayerOnCell) {
          cellClass += ` map-cell-other-player player-color-${otherPlayerOnCell.color || "gray"}`
          cellContent = "👤"
          cellTitle = `${otherPlayerOnCell.name} (P${otherPlayerOnCell.prestigeLevel || 0})`
        }
      }

      // Territories
      const territory = mapData.territories[key]
      if (territory) {
        cellClass += " map-cell-territory"
        if (territory.ownerId === player.id) {
          cellClass += " territory-owned"
          cellTitle = `Your Territory: ${territory.name || key}`
        } else if (territory.ownerId) {
          cellClass += ` player-color-${territory.ownerColor || "gray"}` // Border color based on owner
          cellTitle = `Territory of ${territory.ownerName || "Unknown"} (${key})`
        } else {
          cellTitle = `Unclaimed Territory (${key}) - Cost: ${territory.purchaseCost}`
        }
      }

      // Items (New)
      const itemOnCell = mapData.items[key]
      if (itemOnCell && cellContent === "") {
        cellClass += " map-cell-item" // Add a specific class for items if needed
        cellContent = itemOnCell.icon
        cellTitle = `${itemOnCell.name} (${itemOnCell.rarity})`
      }

      // Enemies
      const enemy = mapData.enemies[key]
      if (enemy && cellContent === "") {
        // Prioritize player/other players over enemies for icon
        cellClass += enemy.boss ? " map-cell-boss" : enemy.special ? " map-cell-special-enemy" : " map-cell-enemy"
        cellContent = enemy.icon
        cellTitle = `${enemy.name} (Lv.${enemy.level})`
      }

      // Resources
      const resource = mapData.resources[key]
      if (resource && cellContent === "") {
        cellClass += ` map-cell-resource-${resource.type}`
        const icons = { spice: "✨", water: "💧", plasteel: "🔧", rareMaterials: "💎" }
        cellContent = icons[resource.type] || "📦"
        cellTitle = `${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)} (${resource.amount})`
      }

      // World Events Markers (can be an overlay on the cell)
      const eventOnCell = worldEvents.find((e) => e.position?.x === x && e.position?.y === y)
      if (eventOnCell && cellContent === "") {
        cellClass += " map-cell-world-event"
        cellContent = eventOnCell.icon
        cellTitle = `${eventOnCell.name}: ${eventOnCell.description}`
      }

      if (isAdjacent) {
        cellClass += " map-cell-movable"
      }

      cells.push(
        <div
          key={key}
          className={cellClass}
          title={cellTitle}
          onClick={() => onCellClick(x, y)}
          style={
            territory && territory.ownerId && territory.ownerId !== player.id
              ? { borderColor: `var(--player-color-${territory.ownerColor || "gray"})` }
              : {}
          }
        >
          {cellContent}
        </div>,
      )
    }
  }

  return <div className="map-grid mx-auto overflow-x-auto">{cells}</div>
}
