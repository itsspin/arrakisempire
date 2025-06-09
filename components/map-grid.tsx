"use client"

import React from "react"
import { useIsMobile } from "@/hooks/use-mobile"

import type { GameState, Player } from "@/types/game"
import { CONFIG, HOUSE_COLORS } from "@/lib/constants"
import { isInBaseArea } from "@/lib/utils"

interface MapGridProps {
  player: Player
  mapData: GameState["map"]
  onlinePlayers: GameState["onlinePlayers"]
  worldEvents: GameState["worldEvents"]
  worm: GameState["worm"]
  onCellClick: (x: number, y: number) => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  trackingTarget?: { x: number; y: number } | null
  seekerLaunchTime?: number
}

export function MapGrid({
  player,
  mapData,
  onlinePlayers,
  worldEvents,
  worm,
  onCellClick,
  zoom = 1,
  onZoomChange,
  trackingTarget = null,
  seekerLaunchTime = 0,
}: MapGridProps) {
  const isMobile = useIsMobile()
  const gridRef = React.useRef<HTMLDivElement>(null)
  const playerCellRef = React.useRef<HTMLDivElement>(null)
  const [launchEffects, setLaunchEffects] = React.useState<{
    id: number
    left: number
    top: number
    dx: number
    dy: number
  }[]>([])
  const { x: playerX, y: playerY } = player.position
  const radius = CONFIG.VIEW_RADIUS

  React.useEffect(() => {
    if (!isMobile) return
    const grid = gridRef.current
    const playerCell = playerCellRef.current
    if (grid && playerCell) {
      const left = playerCell.offsetLeft - grid.clientWidth / 2 + playerCell.clientWidth / 2
      const top = playerCell.offsetTop - grid.clientHeight / 2 + playerCell.clientHeight / 2
      grid.scrollTo({ left, top })
    }
  }, [playerX, playerY, zoom, isMobile])

  React.useEffect(() => {
    if (!seekerLaunchTime) return
    const grid = gridRef.current
    const playerCell = playerCellRef.current
    if (!grid || !playerCell) return
    const gridRect = grid.getBoundingClientRect()
    const playerRect = playerCell.getBoundingClientRect()
    const left = playerRect.left - gridRect.left + playerRect.width / 2
    const top = playerRect.top - gridRect.top + playerRect.height / 2
    const newEffects = Array.from({ length: 3 }).map((_, i) => ({
      id: seekerLaunchTime + i,
      left,
      top,
      dx: (Math.random() - 0.5) * 120,
      dy: (Math.random() - 1.2) * 120,
    }))
    setLaunchEffects((prev) => [...prev, ...newEffects])
  }, [seekerLaunchTime])

  React.useEffect(() => {
    if (launchEffects.length === 0) return
    const timers = launchEffects.map((eff) =>
      setTimeout(() => {
        setLaunchEffects((prev) => prev.filter((e) => e.id !== eff.id))
      }, 1000),
    )
    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [launchEffects])

  const arrow = React.useMemo(() => {
    if (!trackingTarget) return ""
    const dx = trackingTarget.x - playerX
    const dy = trackingTarget.y - playerY
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "→" : "←"
    }
    if (Math.abs(dy) > Math.abs(dx)) {
      return dy > 0 ? "↓" : "↑"
    }
    if (dx > 0 && dy > 0) return "↘"
    if (dx > 0 && dy < 0) return "↗"
    if (dx < 0 && dy > 0) return "↙"
    if (dx < 0 && dy < 0) return "↖"
    return ""
  }, [trackingTarget, playerX, playerY])

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

      // Rock islands
      if (mapData.rocks[key] && cellContent === "") {
        cellClass += " map-cell-rock"
        cellContent = "🪨"
        cellTitle = "Rocky Outcrop"
        hasBackground = true
      }

      // Worm segments
      const wormSegment = worm.segments.find((s) => s.x === x && s.y === y)
      if (wormSegment && cellContent === "") {
        cellClass += " map-cell-sandworm"
        cellContent = "🐛"
        cellTitle = "Sandworm"
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
          ref={x === playerX && y === playerY ? playerCellRef : undefined}
          className={cellClass}
          title={cellTitle}
          onClick={() => onCellClick(x, y)}
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setAttribute('data-pointer-start', `${e.clientX},${e.clientY}`)
          }}
          onPointerUp={(e) => {
            const start = (e.target as HTMLElement).getAttribute('data-pointer-start')
            if (start) {
              const [sx, sy] = start.split(',').map(Number)
              const dx = e.clientX - sx
              const dy = e.clientY - sy
              if (Math.hypot(dx, dy) < 10) {
                onCellClick(x, y)
              }
            }
          }}
          onTouchStart={() => onCellClick(x, y)}
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
      {launchEffects.map((eff) => (
        <span
          key={eff.id}
          className="seeker-launch-effect"
          style={{
            left: eff.left,
            top: eff.top,
            ['--dx' as any]: `${eff.dx}px`,
            ['--dy' as any]: `${eff.dy}px`,
          }}
        >
          🛰️
        </span>
      ))}
      <div ref={gridRef} className="map-grid mx-auto overflow-x-auto" style={gridStyle}>
        {cells}
      </div>
    </div>
  )
}
