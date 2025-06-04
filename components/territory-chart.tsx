"use client"

import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { TerritoryDetails, GameState } from "@/types/game"
import { STATIC_DATA } from "@/lib/game-data"

interface TerritoryChartProps {
  territories?: Record<string, TerritoryDetails>
  onlinePlayers: GameState["onlinePlayers"]
}

const COLORS = {
  "house-atreides": "#3b82f6", // blue-500
  "house-harkonnen": "#ef4444", // red-500
  "house-fremen": "#10b981", // green-500
  unclaimed: "#6b7280", // gray-500
}

export function TerritoryChart({ territories = {}, onlinePlayers }: TerritoryChartProps) {
  const territoryData: { name: string; value: number; color: string }[] = []
  const houseTerritoryCounts: Record<string, number> = {
    atreides: 0,
    harkonnen: 0,
    fremen: 0,
    unclaimed: 0,
  }

  Object.values(territories).forEach((territory) => {
    if (territory.ownerId) {
      const ownerPlayer = onlinePlayers[territory.ownerId]
      if (ownerPlayer && ownerPlayer.house) {
        houseTerritoryCounts[ownerPlayer.house] = (houseTerritoryCounts[ownerPlayer.house] || 0) + 1
      } else {
        houseTerritoryCounts.unclaimed++ // Treat territories with unknown owners as unclaimed for chart purposes
      }
    } else {
      houseTerritoryCounts.unclaimed++
    }
  })

  Object.entries(houseTerritoryCounts).forEach(([houseKey, count]) => {
    if (count > 0) {
      const houseName = STATIC_DATA.HOUSES[houseKey as keyof typeof STATIC_DATA.HOUSES]?.name || "Unclaimed"
      const colorKey =
        houseKey === "unclaimed"
          ? "unclaimed"
          : STATIC_DATA.HOUSES[houseKey as keyof typeof STATIC_DATA.HOUSES]?.color || "unclaimed"
      territoryData.push({
        name: houseName,
        value: count,
        color: COLORS[colorKey as keyof typeof COLORS] || COLORS.unclaimed,
      })
    }
  })

  // Sort data to ensure consistent slice order (e.g., largest first)
  territoryData.sort((a, b) => b.value - a.value)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>House Territory Control</CardTitle>
        <CardDescription>Current territorial dominance of each Great House on Arrakis.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            atreides: { label: "House Atreides", color: COLORS["house-atreides"] },
            harkonnen: { label: "House Harkonnen", color: COLORS["house-harkonnen"] },
            fremen: { label: "Fremen", color: COLORS["house-fremen"] },
            unclaimed: { label: "Unclaimed", color: COLORS.unclaimed },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={territoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {territoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
