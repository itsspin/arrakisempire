import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isInBaseArea(
  player: { basePosition: { x: number; y: number }; baseBuilt?: boolean },
  x: number,
  y: number,
): boolean {
  if (!player.baseBuilt) return false
  const bx = player.basePosition.x
  const by = player.basePosition.y
  return x >= bx && x <= bx + 1 && y >= by && y <= by + 1
}
