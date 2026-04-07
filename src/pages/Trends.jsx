import { useState, useEffect } from 'react'
import { useYear } from '../lib/YearContext'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Loader } from 'lucide-react'
import { fetchRoster } from '../lib/database'
import { formatTime, YEARS, STATIONS, SHIFTS } from '../lib/utils'

export default function Trends() {
  const { currentYear } = useYear()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const rosterData = await fetchRoster()
        setRoster(rosterData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-ember" size={32} />
          <p className="text-muted">Loading trends...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6 text-center">
        <p className="text-fire">Error loading data: {error}</p>
      </div>
    )
  }

  // Department avg over time
  const deptTrendData = []
  for (let year of YEARS) {
    const yearTimes = roster
      .filter((m) => m.times[year])
      .map((m) => m.times[year])
    if (yearTimes.length > 0) {
      const avg = Math.round(yearTimes.reduce((a, b) => a + b, 0) / yearTimes.length)
      deptTrendData.push({ year, avg, count: yearTimes.length })
    }
  }

  // Distribution of current year times
  const ranges = {
    '<4:00': [0, 240],
    '4:00-4:59': [240, 300],
    '5:00-5:59': [300, 360],
    '6:00-6:59': [360, 420],
    '7:00-7:59': [420, 480],
    '8:00+': [480, Infinity],
  }

  const distribution = {}
  Object.keys(ranges).forEach((range) => {
    distribution[range] = 0
  })

  roster.forEach((member) => {
    if (!member.times[currentYear]) return
    for (const [range, [min, max]] of Object.entries(ranges)) {
      if (member.times[currentYear] >= min && member.times[currentYear] < max) {
        distribution[range]++
        break
      }
    }
  })

  const distributionData = Object.entries(distribution).map(([range, count]) => ({
    range,
    count,
  }))

  // Station comparison over years
  const stationTrend = {}
  STATIONS.forEach((station) => {
    stationTrend[station] = {}
  })

  roster.forEach((member) => {
    if (!member.station) return
    Object.keys(member.times).forEach((year) => {
      if (!stationTrend[member.station][year]) {
        stationTrend[member.station][year] = { times: [], count: 0 }
      }
      stationTrend[member.station][year].times.push(member.times[year])
      stationTrend[member.station][year].count++
    })
  })

  const stationTrendData = []
  for (let year of YEARS) {
    const yearData = { year }
    Object.entries(stationTrend).forEach(([station, data]) => {
      if (data[year]) {
        const avg = Math.round(data[year].times.reduce((a, b) => a + b, 0) / data[year].times.length)
        yearData[station] = avg
      }
    })
    stationTrendData.push(yearData)
  }

  // Shift comparison over years
  const shiftData = {}
  SHIFTS.forEach((shift) => {
    shiftData[shift] = {}
  })

  roster.forEach((member) => {
    if (!member.shift) return
    Object.keys(member.times).forEach((year) => {
      if (!shiftData[member.shift][year]) {
        shiftData[member.shift][year] = { times: [] }
      }
      shiftData[member.shift][year].times.push(member.times[year])
    })
  })

  const shiftTrendData = []
  for (let year of YEARS) {
    const yearData = { year }
    Object.entries(shiftData).forEach(([shift, data]) => {
      if (data[year]) {
        const avg = Math.round(data[year].times.reduce((a, b) => a + b, 0) / data[year].times.length)
        yearData[shift] = avg
      }
    })
    shiftTrendData.push(yearData)
  }

  // Improvement leaders: biggest time drops year-over-year
  const improvementLeaders = []
  roster.forEach((member) => {
    for (let i = 0; i < YEARS.length - 1; i++) {
      const year1 = YEARS[i]
      const year2 = YEARS[i + 1]
      if (member.times[year1] && member.times[year2]) {
        const delta = member.times[year1] - member.times[year2]
        if (delta > 0) {
          improvementLeaders.push({
            name: member.name,
            from: year1,
            to: year2,
            fromTime: member.times[year1],
            toTime: member.times[year2],
            improvement: delta,
          })
        }
      }
    }
  })

  improvementLeaders.sort((a, b) => b.improvement - a.improvement)

  const colors = {
    'A-Shift': 'var(--color-blue)',
    'B-Shift': 'var(--color-ember)',
    'C-Shift': 'var(--color-purple)',
  }

  const stationColors = {
    'Station 211': '#ff6b35',
    'Station 212': '#4dabf7',
    'Station 213': '#a78bfa',
    'Station 214': '#2ecc71',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-txt md:text-4xl">Trends & Analysis</h1>

      {/* Department Avg Trend */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">Department Average Over Time</h2>
        {deptTrendData.length > 0 ? (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deptTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-muted)' }} />
                <YAxis tick={{ fill: 'var(--color-muted)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-txt)',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) =>
                    name === 'avg' ? formatTime(value) : value
                  }
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--color-gold)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-gold)', r: 4 }}
                  name="Avg Time"
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-blue)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-blue)', r: 4 }}
                  yAxisId="right"
                  name="Testers"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No data</p>
        )}
      </div>

      {/* Distribution of Current Year Times */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">{currentYear} Time Distribution</h2>
        {distributionData.some((d) => d.count > 0) ? (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="range"
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: 'var(--color-muted)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-txt)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="var(--color-green)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No {currentYear} data yet</p>
        )}
      </div>

      {/* Station Comparison */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">Station Comparison Over Years</h2>
        {stationTrendData.some((d) => Object.keys(d).length > 1) ? (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-muted)' }} />
                <YAxis tick={{ fill: 'var(--color-muted)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-txt)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatTime(value)}
                />
                <Legend />
                {STATIONS.map((station) => (
                  <Line
                    key={station}
                    type="monotone"
                    dataKey={station}
                    stroke={stationColors[station] || 'var(--color-blue)'}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No station data</p>
        )}
      </div>

      {/* Shift Comparison */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">Shift Comparison Over Years</h2>
        {shiftTrendData.some((d) => Object.keys(d).length > 1) ? (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shiftTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-muted)' }} />
                <YAxis tick={{ fill: 'var(--color-muted)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-txt)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatTime(value)}
                />
                <Legend />
                {SHIFTS.map((shift) => (
                  <Line
                    key={shift}
                    type="monotone"
                    dataKey={shift}
                    stroke={colors[shift]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No shift data</p>
        )}
      </div>

      {/* Improvement Leaders */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">Top Improvement Year-over-Year</h2>
        {improvementLeaders.length > 0 ? (
          <div className="space-y-2">
            {improvementLeaders.slice(0, 10).map((leader, idx) => (
              <div
                key={`${leader.name}-${leader.from}-${leader.to}`}
                className="flex items-center justify-between p-3 bg-surface2 rounded-lg border border-border hover:border-green transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-txt truncate">{leader.name}</p>
                  <p className="text-xs text-muted">
                    {leader.from} → {leader.to}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gold">{formatTime(leader.fromTime)} → {formatTime(leader.toTime)}</p>
                  <p className="text-sm font-bold text-green">↑ {formatTime(leader.improvement)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-center py-8">No improvement data</p>
        )}
      </div>
    </div>
  )
}
