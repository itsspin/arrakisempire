"use client"

import type React from "react"
import { useState, useCallback } from "react" // Import useCallback
import { Button } from "@/components/ui/button"

interface NameSelectionModalProps {
  isOpen: boolean
  onSubmit: (name: string) => void
}

export function NameSelectionModal({ isOpen, onSubmit }: NameSelectionModalProps) {
  const [playerName, setPlayerName] = useState("")

  // Use useCallback to ensure a stable function reference for handleSubmit
  const handleSubmit = useCallback(
    (e?: React.FormEvent | React.MouseEvent) => {
      e?.preventDefault() // Conditionally prevent default behavior if an event is provided

      if (playerName.trim().length > 2) {
        // Defensive check for onSubmit being a function
        if (typeof onSubmit === "function") {
          onSubmit(playerName.trim())
        } else {
          console.error("NameSelectionModal: onSubmit prop is not a function. Received:", onSubmit)
          alert("An internal error occurred. Please try again.")
        }
      } else {
        alert("Please enter a name with at least 3 characters.")
      }
    },
    [playerName, onSubmit],
  ) // Dependencies for useCallback

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <h3 className="text-2xl font-orbitron text-amber-400 mb-4 text-center">Welcome, Wanderer!</h3>
        <p className="text-stone-300 mb-6 text-center">
          Before you embark on your journey across Arrakis, what name shall the desert know you by?
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="sr-only">
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-md text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              required
              minLength={3}
            />
          </div>
          <Button
            type="submit"
            onClick={handleSubmit} // Explicitly assign the handleSubmit function to onClick
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded font-bold text-lg disabled:bg-stone-500 disabled:cursor-not-allowed"
            disabled={playerName.trim().length < 3}
          >
            Begin Your Journey
          </Button>
        </form>
      </div>
    </div>
  )
}
