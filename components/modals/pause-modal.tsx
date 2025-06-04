"use client"

interface PauseModalProps {
  isOpen: boolean
  onResume: () => void
}

export function PauseModal({ isOpen, onResume }: PauseModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md text-center">
        <h3 className="text-2xl font-orbitron text-amber-400 mb-4">Game Paused</h3>
        <p className="text-stone-300 mb-6">Your progress is halted.</p>
        <button onClick={onResume} className="action-button px-4 py-2">Resume</button>
      </div>
    </div>
  )
}
