"use client"

import type React from "react"

import { useState } from "react"

interface NameSelectionModalProps {
  isOpen: boolean
  onSubmit: (name: string) => void
}

export function NameSelectionModal({ isOpen, onSubmit }: NameSelectionModalProps) {
  const [playerName, setPlayerName] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (playerName.trim().length > 2) {
      onSubmit(playerName.trim())
    } else {
      alert("Please enter a name with at least 3 characters.")
    }
  }

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
          <button
            type="submit"
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded font-bold text-lg disabled:bg-stone-500 disabled:cursor-not-allowed"
            disabled={playerName.trim().length < 3}
          >
            Begin Your Journey
          </button>
        </form>
      </div>
    </div>
  )
}
