import type { Player } from "@/types/game"
import { CONFIG } from "@/lib/constants"

export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ")
}

export function isInBaseArea(player: Player, x: number, y: number): boolean {
  if (!player.baseBuilt) return false
  const { x: baseX, y: baseY } = player.basePosition
  const distance = Math.sqrt(Math.pow(x - baseX, 2) + Math.pow(y - baseY, 2))
  return distance <= CONFIG.BASE_RADIUS
}
