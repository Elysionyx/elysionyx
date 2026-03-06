'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TaskLogEntry {
  passed: boolean
  source: string | null
  recorded_at: string
}

interface ChartPoint {
  date: string
  score: number
  event: string
}

function buildScoreHistory(taskLog: TaskLogEntry[]): ChartPoint[] {
  // Build cumulative score over time
  const sorted = [...taskLog].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )

  let score = 0
  return sorted.map((entry) => {
    if (entry.source === 'gauntlet') {
      score += entry.passed ? 60 : 0 // gauntlet pass: +50 gauntlet + 10 task
    } else {
      score += entry.passed ? 10 : -15
      score = Math.max(0, score)
    }
    return {
      date: new Date(entry.recorded_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score,
      event: entry.passed ? (entry.source === 'gauntlet' ? 'Gauntlet pass' : 'Task pass') : 'Fail',
    }
  })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#D6E4FF] rounded px-3 py-2 text-xs shadow-sm">
      <p className="text-[#4A5568] mb-1">{label}</p>
      <p className="font-medium text-[#0A0A0A]">Score: {payload[0].value}</p>
      {payload[0].payload?.event && (
        <p className="text-[#4A5568]">{payload[0].payload.event}</p>
      )}
    </div>
  )
}

export default function ReputationChart({ taskLog }: { taskLog: TaskLogEntry[] }) {
  if (!taskLog || taskLog.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[#4A5568] border border-[#D6E4FF] rounded-lg bg-[#F5F8FF]">
        No task history recorded.
      </div>
    )
  }

  const data = buildScoreHistory(taskLog)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D6E4FF" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#4A5568' }}
          tickLine={false}
          axisLine={{ stroke: '#D6E4FF' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#4A5568' }}
          tickLine={false}
          axisLine={{ stroke: '#D6E4FF' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#0052FF"
          strokeWidth={2}
          dot={{ fill: '#0052FF', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: '#0052FF' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
