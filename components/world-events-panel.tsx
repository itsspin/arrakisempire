"use client"

import React from "react"
import type { WorldEvent } from "@/types/game"

interface WorldEventsPanelProps {
  worldEvents: WorldEvent[]
}

export function WorldEventsPanel({ worldEvents }: WorldEventsPanelProps) {
  return (
    <div className="bg-stone-800 p-6 rounded-lg border border-stone-600">
      <h3 className="text-xl font-semibold mb-4 text-amber-300">🌟 Active World Events</h3>
      {worldEvents.length === 0 ? (
        <p className="text-stone-400 text-center text-sm">No active events at this time.</p>
      ) : (
        <div className="space-y-4">
          {worldEvents.map((event) => (
            <div key={event.id} className="bg-stone-900 p-4 rounded-lg border border-purple-500">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">{event.icon}</span>
                <h4 className="text-lg font-semibold text-purple-300">{event.name}</h4>
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
    </div>
  )
}
