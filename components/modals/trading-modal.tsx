"use client"

import { useState } from "react"
import type { TradeOffer, Item, Resources } from "@/types/game"

interface TradingModalProps {
  isOpen: boolean
  tradeOffers: TradeOffer[]
  inventory: (Item | null)[]
  playerId: string | null
  playerResources: Resources
  onClose: () => void
  onCreateOffer: (
    inventoryIndex: number,
    resource: keyof Resources,
    price: number,
  ) => void
  onBuyOffer: (offerId: string) => void
  onEditOffer: (
    offerId: string,
    resource: keyof Resources,
    price: number,
  ) => void
  onRemoveOffer: (offerId: string) => void
}

export function TradingModal({
  isOpen,
  tradeOffers,
  inventory,
  playerId,
  playerResources,
  onClose,
  onCreateOffer,
  onBuyOffer,
  onEditOffer,
  onRemoveOffer,
}: TradingModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [price, setPrice] = useState(0)
  const [resource, setResource] = useState<keyof Resources>("solari")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState(0)
  const [editResource, setEditResource] = useState<keyof Resources>("solari")

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-2xl font-orbitron text-amber-400 mb-4 text-center">
          Trade Network
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-amber-300 mb-2">Create Offer</h4>
            {inventory.filter((i) => i).length === 0 ? (
              <p className="text-sm text-stone-400 mb-4">No items in inventory.</p>
            ) : (
              <div className="space-y-3">
                <select
                  className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-md text-stone-200"
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
                >
                  <option value={-1}>Select Item</option>
                  {inventory.map((item, idx) =>
                    item ? (
                      <option key={idx} value={idx}>
                        {item.icon} {item.name}
                      </option>
                    ) : null,
                  )}
                </select>
                <div className="flex gap-2">
                  <select
                    className="w-1/2 px-3 py-2 bg-stone-700 border border-stone-600 rounded-md text-stone-200"
                    value={resource}
                    onChange={(e) => setResource(e.target.value as keyof Resources)}
                  >
                    <option value="spice">Spice</option>
                    <option value="water">Water</option>
                    <option value="solari">Solari</option>
                    <option value="plasteel">Plasteel</option>
                    <option value="rareMaterials">Rare Materials</option>
                    <option value="melange">Melange</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-1/2 px-3 py-2 bg-stone-700 border border-stone-600 rounded-md text-stone-200"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value))}
                  />
                </div>
                <button
                  onClick={() => {
                    if (selectedIndex >= 0 && price > 0) {
                      onCreateOffer(selectedIndex, resource, price)
                      setSelectedIndex(-1)
                      setPrice(0)
                      setResource("solari")
                    }
                  }}
                  disabled={selectedIndex < 0 || price <= 0}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:bg-stone-500"
                >
                  List Item
                </button>
              </div>
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-amber-300 mb-2">Available Offers</h4>
            {tradeOffers.length === 0 ? (
              <p className="text-sm text-stone-400">No trade offers available.</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {tradeOffers.map((offer) => (
                  <li
                    key={offer.id}
                    className="p-3 border border-stone-600 rounded trading-item"
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        {offer.item.icon} {offer.item.name} - {offer.price} {offer.resource}
                      </span>
                      <span className={`player-color-${offer.sellerColor}`}>{offer.sellerName}</span>
                    </div>
                    {offer.sellerId !== playerId ? (
                      <button
                        className="mt-2 w-full py-1 bg-amber-600 hover:bg-amber-700 text-sm rounded disabled:bg-stone-500"
                        onClick={() => onBuyOffer(offer.id)}
                        disabled={playerResources[offer.resource] < offer.price}
                      >
                        Buy
                      </button>
                    ) : editingId === offer.id ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <select
                            className="w-1/2 px-2 py-1 bg-stone-700 border border-stone-600 rounded-md text-sm"
                            value={editResource}
                            onChange={(e) => setEditResource(e.target.value as keyof Resources)}
                          >
                            <option value="spice">Spice</option>
                            <option value="water">Water</option>
                            <option value="solari">Solari</option>
                            <option value="plasteel">Plasteel</option>
                            <option value="rareMaterials">Rare Materials</option>
                            <option value="melange">Melange</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            className="w-1/2 px-2 py-1 bg-stone-700 border border-stone-600 rounded-md text-sm"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseInt(e.target.value))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 py-1 bg-green-600 hover:bg-green-700 rounded"
                            onClick={() => {
                              onEditOffer(offer.id, editResource, editPrice)
                              setEditingId(null)
                            }}
                            disabled={editPrice <= 0}
                          >
                            Save
                          </button>
                          <button
                            className="flex-1 py-1 bg-stone-600 hover:bg-stone-700 rounded"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <button
                          className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-sm rounded"
                          onClick={() => {
                            setEditingId(offer.id)
                            setEditPrice(offer.price)
                            setEditResource(offer.resource)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-sm rounded"
                          onClick={() => onRemoveOffer(offer.id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
