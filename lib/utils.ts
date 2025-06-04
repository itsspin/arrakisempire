import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Player } from "@/types/game" // Import Player type
import { CONFIG } from "@/lib/constants" // Import CONFIG for BASE_RADIUS

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isInBaseArea(player: Player, x: number, y: number): boolean {
  if (!player.baseBuilt) return false
  const { x: baseX, y: baseY } = player.basePosition
  const distance = Math.max(Math.abs(x - baseX), Math.abs(y - baseY))
  return distance <= CONFIG.BASE_RADIUS // Corrected from CONFIG.BASE_AREA_RADIUS
}
