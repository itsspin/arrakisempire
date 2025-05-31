"use client"

import type { ChatMessage } from "@/types/game"
import type React from "react"
import { useState, useRef, useEffect } from "react"

interface WorldChatProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  playerName: string
  playerColor: string
}

export function WorldChat({ messages, onSendMessage, playerName, playerColor }: WorldChatProps) {
  const [inputMessage, setInputMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chatContainer = chatContainerRef.current
    if (chatContainer) {
      // Check if the user is already scrolled to the bottom or very close
      const isAtBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 1 // +1 for tolerance

      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [messages]) // Only re-run when messages change

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage(inputMessage)
      setInputMessage("")
    }
  }

  return (
    <div className="flex flex-col h-[400px] bg-stone-800 rounded-lg border border-stone-600">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 text-sm custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className="flex items-start">
            <span className={`font-bold mr-2 player-color-${msg.senderColor || "gray"}`}>{msg.senderName}:</span>
            <p className="flex-1 text-stone-300 break-words">{msg.message}</p>
            {msg.timestamp && (
              <span className="ml-auto text-xs text-stone-500">
                {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-stone-600 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 bg-stone-700 border border-stone-600 rounded-md text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition duration-150 ease-in-out disabled:bg-stone-500 disabled:cursor-not-allowed"
          disabled={!inputMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
