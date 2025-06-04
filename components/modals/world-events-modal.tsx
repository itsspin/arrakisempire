"use client"

import React from "react"
import type { WorldEvent } from "@/types/game"

interface WorldEventsModalProps {
  isOpen: boolean
  onClose: () => void
  worldEvents: WorldEvent[]
}

export function WorldEventsModal({ isOpen, onClose, worldEvents }: WorldEventsModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-3xl font-orbitron text-amber-400 mb-6 text-center">🌟 Active World Events</h3>
        {worldEvents.length === 0 ? (
          <p className="text-stone-400 text-center text-lg">No active events at this time.</p>
        ) : (
          <div className="space-y-4">
            {worldEvents.map((event) => (
              <div key={event.id} className="bg-stone-800 p-4 rounded-lg border border-purple-500">
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-3">{event.icon}</span>
                  <h4 className="text-xl font-semibold text-purple-300">{event.name}</h4>
                </div>
                <p className="text-sm text-stone-300 mb-2">{event.description}</p>
                {event.rewards && (
                  <p className="text-xs text-green-400">
                    Rewards:{" "}
                    {Object.entries(event.rewards)
                      .map(([res, val]) => `${val} ${res.charAt(0).toUpperCase() + res.slice(1)}`)
                      .join(", ")}
                  </p>
                )}
                {event.effect && <p className="text-xs text-red-400">Effect: {event.effect.replace(/_/g, " ")}</p>}
                {event.endTime && (
                  <p className="text-xs text-stone-400">
                    Time Remaining: {Math.ceil(Math.max(0, event.endTime - Date.now()) / 60000)} minutes
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-8 py-3 bg-stone-600 hover:bg-stone-700 rounded text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
