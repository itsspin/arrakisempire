"use client"

interface LoadingScreenProps {
  isVisible: boolean
}

export function LoadingScreen({ isVisible }: LoadingScreenProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-stone-950 text-white flex items-center justify-center z-[10000]">
      <div className="text-center">
        <div className="text-6xl font-orbitron text-amber-400 mb-6 prestige-glow">🏜️ ARRAKIS</div>
        <div className="text-3xl mb-4">Multiplayer Spice Empire</div>
        <div className="text-lg text-amber-300 mb-6">Connecting to the desert world...</div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 bg-amber-400 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-4 h-4 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
        <div className="mt-8 text-stone-400 italic text-lg">"The spice must flow..."</div>
        <div className="mt-4 text-stone-500 text-sm">
          Join hundreds of players in the ultimate desert survival experience
        </div>
      </div>
    </div>
  )
}
