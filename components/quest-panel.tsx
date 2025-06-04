"use client"

import type { Quest } from "@/types/game"

interface QuestPanelProps {
  quests: Quest[]
}

export function QuestPanel({ quests }: QuestPanelProps) {
  return (
    <div className="bg-stone-700 p-4 rounded-lg border border-green-500">
      <h3 className="text-lg font-semibold text-green-400 mb-3 font-orbitron">📝 Quests</h3>
      <div className="space-y-2 text-sm">
        {quests.length === 0 && (
          <p className="text-stone-300 text-center">No quests</p>
        )}
        {quests.map((q) => (
          <div key={q.id} className="p-2 bg-stone-600 rounded">
            <div className="flex justify-between mb-1">
              <span>{q.description}</span>
              <span className="font-mono">
                {q.progress}/{q.goal}
              </span>
            </div>
            <div className="progress-bar-bg rounded h-2">
              <div
                className="bg-green-500 h-full rounded"
                style={{ width: `${(q.progress / q.goal) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
