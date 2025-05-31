"use client"

import type { GameState } from "@/types/game" // Assuming Notification type is part of GameState or a separate import
import { useEffect } from "react"

interface NotificationAreaProps {
  notifications: GameState["notifications"]
  onClose: (id: string) => void
}

export function NotificationArea({ notifications, onClose }: NotificationAreaProps) {
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.type !== "error") {
        // Persistent errors might be desired
        const timer = setTimeout(() => {
          onClose(notification.id)
        }, 5000) // Auto-close after 5 seconds
        return () => clearTimeout(timer)
      }
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
