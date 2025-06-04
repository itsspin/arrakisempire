"use client"

import React from "react"
interface SandwormWarningProps {
  timeLeft: number
  onContinue: () => void
}

export function SandwormWarning({ timeLeft, onContinue }: SandwormWarningProps) {
  if (timeLeft <= 0) return null
  return (
    <div
      className="fixed inset-0 bg-stone-950/80 text-amber-400 flex items-center justify-center z-[10000]"
      onClick={onContinue}
      onTouchStart={onContinue}
    >
      <div className="text-center space-y-4 px-4">
        <div className="text-4xl font-orbitron">🐛 Wormsign!</div>
        <div className="text-xl">Move or be eaten in {Math.ceil(timeLeft / 1000)}s</div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onContinue()
          }}
          className="action-button w-full max-w-xs mx-auto"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
