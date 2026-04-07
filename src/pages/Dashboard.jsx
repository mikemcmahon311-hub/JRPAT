import { useState, useEffect } from 'react'
import { useYear } from '../lib/YearContext'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Loader } from 'lucide-react'
import { fetchRoster } from '../lib/database'
import { formatTime } from '../lib/utils'

export default function Dashboard() {
  const { currentYear, yearLoading } = useYear()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!currentYear) return
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
  }, [currentYear])

  if (loading || yearLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-ember" size={32} />
          <p className="text-muted">Loading dashboard...</p>
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

  // Compute KPI data
  const membersThisYear = roster.filter((m) => m.times[currentYear])
  const thisYearTimes = membersThisYear.map((m) => m.times[currentYear])
  const deptAvg = thisYearTimes.length
    ? Math.round(thisYearTimes.reduce((a, b) => a + b, 0) / thisYearTimes.length)
    : 0
  const fastestTime = thisYearTimes.length ? Math.min(...thisYearTimes) : 0
  const tshirtCount = roster.reduce((sum, m) => sum + (m.tshirtCount || 0), 0)
  const allTimeBest = roster.length
    ? Math.min(...roster.filter((m) => m.personalBest).map((m) => m.personalBest))
    : 0

  // Station Showdown data: group by station/shift, calculate avg
  const stationData = {}
  roster.forEach((member) => {
    if (!member.times[currentYear]) return
    const key = `${member.station || 'Unknown'}-${member.shift || 'Unknown'}`
    if (!stationData[key]) {
      stationData[key] = { times: [], station: member.station, shift: member.shift }
    }
    stationData[key].times.push(member.times[currentYear])
  })

  const stationChartData = Object.entries(stationData)
    .map(([key, data]) => ({
      name: key,
      avg: Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length),
      station: data.station,
      shift: data.shift,
    }))
    .sort((a, b) => a.avg - b.avg)

  // Year-over-year department avg
  const yearlyAvg = {}
  for (let year = 2020; year <= currentYear; year++) {
    const yearTimes = roster
      .filter((m) => m.times[year])
      .map((m) => m.times[year])
    if (yearTimes.length > 0) {
      yearlyAvg[year] = Math.round(yearTimes.reduce((a, b) => a + b, 0) / yearTimes.length)
    }
  }

  const yearlyChartData = Object.entries(yearlyAvg)
    .map(([year, avg]) => ({ year: parseInt(year), avg }))
    .sort((a, b) => a.year - b.year)

  // New personal bests this year — exclude injury placeholders
  const newPBs = roster
    .filter((m) =>
      m.times[currentYear] &&
      m.personalBest &&
      m.times[currentYear] === m.personalBest &&
      !m.placeholderYears.has(currentYear)
    )
    .sort((a, b) => a.personalBest - b.personalBest)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-txt md:text-4xl">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label={`${currentYear} Testers`} value={membersThisYear.length} />
        <KPICard label="Dept Avg" value={formatTime(deptAvg)} />
        <KPICard label="Fastest Time" value={formatTime(fastestTime)} color="text-gold" />
        <KPICard label="T-Shirts Earned" value={tshirtCount} color="text-green" />
        <KPICard label="All-Time Record" value={formatTime(allTimeBest)} color="text-ember" />
      </div>

      {/* Station Showdown */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">Station Showdown {currentYear}</h2>
        {stationChartData.length > 0 ? (
          <div className="w-full h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
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
                  formatter={(value) => formatTime(value)}
                />
                <Bar dataKey="avg" fill="var(--color-ember)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No data for {currentYear} yet</p>
        )}
      </div>

      {/* Year-over-Year Trend */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">Department Average Trend</h2>
        {yearlyChartData.length > 0 ? (
          <div className="w-full h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--color-muted)' }}
                />
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
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--color-gold)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-gold)', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No historical data yet</p>
        )}
      </div>

      {/* New Personal Bests */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-1">New Personal Bests — {currentYear}</h2>
        <p className="text-sm text-muted mb-4">Members who set a new all-time PR this year</p>
        {newPBs.length > 0 ? (
          <div className="space-y-2">
            {newPBs.map((member, idx) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-surface2 rounded-lg border border-border hover:border-ember transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="font-semibold text-txt">{member.name}</p>
                    <p className="text-xs text-muted">{member.station} · {member.shift}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gold">{formatTime(member.personalBest)}</p>
                  <p className="text-xs text-green font-semibold">New PB</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-center py-8">No new personal bests yet in {currentYear}</p>
        )}
      </div>
    </div>
  )
}

function KPICard({ label, value, color = 'text-ember' }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <p className="text-xs md:text-sm text-muted mb-1">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
