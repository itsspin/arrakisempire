"use client"

import { useState } from "react"

export function WishlistTab() {
  const [wishlistItems, setWishlistItems] = useState<string[]>([])
  const [input, setInput] = useState("")

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setWishlistItems((prev) => [...prev, trimmed])
    setInput("")
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-3xl font-orbitron text-amber-400 mb-6">🌠 Wishlist</h2>
      <p className="text-stone-300 mb-4 text-sm">
        Share ideas for new gameplay features you'd like to see added.
      </p>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add your wish..."
          className="flex-1 px-3 py-2 bg-stone-700 border border-stone-600 rounded-md text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:bg-stone-500"
          disabled={!input.trim()}
        >
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {wishlistItems.length === 0 && (
          <li className="text-stone-400 text-sm">No requests yet.</li>
        )}
        {wishlistItems.map((wish, idx) => (
          <li
            key={idx}
            className="bg-stone-800 p-3 rounded border border-stone-600 text-stone-300"
          >
            {wish}
          </li>
        ))}
      </ul>
    </div>
  )
}
