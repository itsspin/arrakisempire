"use client"

interface PrestigeModalProps {
  isOpen: boolean
  onClose: () => void
  onPrestige: () => void
  playerSolari: number
  prestigeLevel: number
}

export function PrestigeModal({ isOpen, onClose, onPrestige, playerSolari, prestigeLevel }: PrestigeModalProps) {
  if (!isOpen) return null

  // Calculate potential bonus for next prestige
  const solariBonus = Math.min(0.5, Math.floor(playerSolari / 10000) * 0.01) // 1% bonus for every 10,000 Solari, capped at 50%
  const basePrestigeBonus = (prestigeLevel + 1) * 0.05 // 5% per prestige level
  const totalNextPrestigeBonus = (1 + solariBonus + basePrestigeBonus) * 100 - 100 // Convert to percentage increase

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-3xl font-orbitron text-purple-400 mb-4 text-center">
          ✨ Ascend to Prestige {prestigeLevel + 1} ✨
        </h3>
        <p className="text-stone-300 mb-6 text-center">
          Are you ready to reset your current progress and gain a powerful bonus for your next journey?
        </p>
        <div className="bg-stone-800 p-4 rounded-lg border border-purple-600 mb-6">
          <p className="text-sm text-stone-300 mb-2">
            Current Solari: <span className="font-bold text-yellow-400">{playerSolari.toLocaleString()}</span>
          </p>
          <p className="text-sm text-stone-300 mb-2">
            Your next Prestige will grant approximately:{" "}
            <span className="font-bold text-green-400">{totalNextPrestigeBonus.toFixed(1)}% overall bonus</span>
          </p>
          <p className="text-xs text-stone-400 italic">
            (Bonus scales with your current Solari and previous Prestige levels. Territories and House affiliation are
            preserved.)
          </p>
        </div>
        <p className="text-red-400 text-sm text-center mb-6 font-semibold">
          Warning: This will reset your level, experience, resources, inventory, equipment, and map elements!
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onPrestige}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded font-bold text-lg disabled:bg-stone-500 disabled:cursor-not-allowed"
          >
            Confirm Prestige
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-stone-600 hover:bg-stone-700 rounded text-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
