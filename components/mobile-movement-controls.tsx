"use client"

import React from "react"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"

interface MobileMovementControlsProps {
  onMove: (dx: number, dy: number) => void
}

export function MobileMovementControls({ onMove }: MobileMovementControlsProps) {
  return (
    <div className="mobile-controls grid grid-cols-3 gap-2">
      <button
        aria-label="Move up"
        className="mobile-arrow col-start-2 row-start-1"
        onClick={() => onMove(0, -1)}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      <button
        aria-label="Move left"
        className="mobile-arrow col-start-1 row-start-2"
        onClick={() => onMove(-1, 0)}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        aria-label="Move right"
        className="mobile-arrow col-start-3 row-start-2"
        onClick={() => onMove(1, 0)}
      >
        <ArrowRight className="w-5 h-5" />
      </button>
      <button
        aria-label="Move down"
        className="mobile-arrow col-start-2 row-start-3"
        onClick={() => onMove(0, 1)}
      >
        <ArrowDown className="w-5 h-5" />
      </button>
    </div>
  )
}

