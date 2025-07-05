"use client"

import { Chart, useChart }                from "@chakra-ui/charts"
import { Area, AreaChart, YAxis }         from "recharts"
import {
  Box, useToken,
} from "@chakra-ui/react"
import { ethers }                         from "ethers"
import React                              from "react"

export interface Snap1 { t: bigint; p: bigint }

interface PriceChartProps {
  snaps: Snap1[]
  color?: string  
  label?: string  
}

const PriceChart: React.FC<PriceChartProps> = ({
  snaps,
  color = "pink.solid",
  label = "MON",
}) => {
  const data = React.useMemo(
    () =>
      snaps.map((s) => ({
        date: new Date(Number(s.t) * 1_000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: Number(ethers.formatEther(s.p)),
      })),
    [snaps],
  )

  const chart = useChart({ data, series: [{ name: "value", color }] })
  const vals = data.map((d) => d.value)
  const lo   = Math.min(...vals)
  const hi   = Math.max(...vals)
  const pad  = Math.max((hi - lo) * 0.01, 0.001)
  const domain: [number, number] = [lo - pad, hi + pad]

  const opening = data[0]?.value ?? 0
  const closing = data.at(-1)?.value ?? 0
  const trend   = opening ? (closing - opening) / opening : 0

  const [base] = useToken("colors", [color])

  return (
    <Box w="100%">
      <Chart.Root width="100%" height="200px" chart={chart}>
        <AreaChart data={chart.data}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={base} stopOpacity={0.8} />
              <stop offset="100%" stopColor={base} stopOpacity={0.2} />
            </linearGradient>

            <pattern id="px-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="transparent" />
              <rect width="5" height="5" fill={base} fillOpacity={0.12} />
            </pattern>
          </defs>

          <YAxis hide domain={domain} />

          {chart.series.map((s) => (
            <Area
              key={s.name + "-grad"}
              type="monotone"
              isAnimationActive={false}
              dataKey={chart.key(s.name)}
              fill="url(#grad)"
              stroke={chart.color(s.color)}
              strokeWidth={2}
            />
          ))}

          {chart.series.map((s) => (
            <Area
              key={s.name + "-px"}
              type="monotone"
              isAnimationActive={false}
              dataKey={chart.key(s.name)}
              fill="url(#px-pattern)"
              stroke="none"
            />
          ))}
        </AreaChart>
      </Chart.Root>
    </Box>
  )
}

export default PriceChart
