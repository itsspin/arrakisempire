"use client"

import React from "react"
interface SandwormWarningProps {
  timeLeft: number
}

export function SandwormWarning({ timeLeft }: SandwormWarningProps) {
  if (timeLeft <= 0) return null
  return (
    <div className="fixed inset-0 bg-stone-950/80 text-amber-400 flex items-center justify-center z-[10000]">
      <div className="text-center space-y-4">
        <div className="text-4xl font-orbitron">🐛 Wormsign!</div>
        <div className="text-xl">Move or be eaten in {Math.ceil(timeLeft / 1000)}s</div>
      </div>
    </div>
  )
}
