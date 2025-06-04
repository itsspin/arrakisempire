import type { Player } from "@/types/game"
import { CONFIG } from "@/lib/constants"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isInBaseArea(player: Player, x: number, y: number): boolean {
  if (!player.baseBuilt) return false
  const dx = Math.abs(player.basePosition.x - x)
  const dy = Math.abs(player.basePosition.y - y)
  return dx <= CONFIG.BASE_RADIUS && dy <= CONFIG.BASE_RADIUS
}
