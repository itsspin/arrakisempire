"use client"

import React from "react"
interface NavigationProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "game", label: "🏜️ Desert World" },
  { id: "character", label: "👤 Character" },
  { id: "empire", label: "🏗️ Empire" },
  { id: "multiplayer", label: "🌍 Multiplayer" },
  { id: "updates", label: "📰 Updates" }, // New tab
]

export function Navigation({ currentTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-stone-800 border-b border-stone-600 px-6 fixed top-[88px] left-0 right-0 z-100 overflow-x-auto">
      <div className="flex space-x-2 whitespace-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button px-6 py-3 text-sm font-medium border-b-2 border-transparent hover:text-amber-400 ${
              currentTab === tab.id ? "active" : ""
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
