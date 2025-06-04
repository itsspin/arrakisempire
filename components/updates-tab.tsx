"use client"

import React from "react"
export function UpdatesTab() {
  const updates = [
    {
      title: "Onboarding Flow",
      description: "A guided introduction helps new players get started quickly.",
    },
    {
      title: "Real-time Resource Generation",
      description: "Empire ventures now produce resources every second.",
    },
    {
      title: "Instant Combat",
      description: "Battles begin immediately when you engage an enemy.",
    },
    {
      title: "Prestige Enhancements",
      description: "Prestige tiers grant larger XP bonuses and new visuals.",
    },
    {
      title: "Multiplayer Hub",
      description: "Trade with others, chat globally, and track territory control.",
    },
    {
      title: "Improved Leaderboard",
      description: "Ranks now highlight player power and prestige level.",
    },
  ]

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-3xl font-orbitron text-amber-400 mb-6">📰 Latest Updates</h2>
      <ul className="space-y-4">
        {updates.map((u) => (
          <li key={u.title} className="bg-stone-800 p-4 rounded-lg border border-stone-600">
            <h3 className="text-lg font-semibold text-amber-300 mb-1">{u.title}</h3>
            <p className="text-sm text-stone-300">{u.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
