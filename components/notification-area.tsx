"use client"

import type { GameState } from "@/types/game"
import { useEffect } from "react"

interface NotificationAreaProps {
  notifications: GameState["notifications"]
  onClose: (id: string) => void
}

export function NotificationArea({ notifications, onClose }: NotificationAreaProps) {
  useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        onClose(notification.id)
      }, 3000) // Auto-close after 3 seconds for all notification types
      return () => clearTimeout(timer)
    })
  }, [notifications, onClose])

  return (
    <div className="fixed top-20 right-5 z-[10001] space-y-2">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification show ${notification.type}`} role="alert">
          <p>{notification.message}</p>
          <button
            onClick={() => onClose(notification.id)}
            className="absolute top-1 right-2 text-lg font-bold leading-none hover:text-white/70"
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
