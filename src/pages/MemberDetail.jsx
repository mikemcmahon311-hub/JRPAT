import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Loader, ArrowLeft } from 'lucide-react'
import { fetchRoster } from '../lib/database'
import { formatTime, YEARS } from '../lib/utils'

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const rosterData = await fetchRoster()
        const found = rosterData.find((m) => m.id === id)
        if (!found) {
          setError('Member not found')
        } else {
          setMember(found)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-ember" size={32} />
          <p className="text-muted">Loading member...</p>
        </div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/roster')}
          className="flex items-center gap-2 text-ember hover:text-gold transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Roster
        </button>
        <div className="bg-surface border border-border rounded-lg p-6 text-center">
          <p className="text-fire">Error: {error}</p>
        </div>
      </div>
    )
  }

  // Time history chart data
  const chartData = YEARS.filter((year) => member.times[year]).map((year) => ({
    year,
    time: member.times[year],
  }))

  // All times table
  const allTimes = YEARS.filter((year) => member.times[year])
    .map((year, idx, arr) => {
      const time = member.times[year]
      let delta = null
      let improvement = false

      if (idx > 0) {
        const prevTime = member.times[arr[idx - 1]]
        delta = prevTime - time
        improvement = delta > 0
      }

      return { year, time, delta, improvement }
    })
    .reverse()

  const getRankBadge = () => {
    const time = member.times[2026]
    if (!time) return null

    // Would need all members data to compute actual rank
    // For now, return null; in production, fetch all and compute
    return null
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/roster')}
        className="flex items-center gap-2 text-ember hover:text-gold transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Roster
      </button>

      {/* Member Header */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h1 className="text-3xl md:text-4xl font-bold text-txt mb-4">{member.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted mb-1">Station</p>
            <p className="font-semibold text-txt">{member.station}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Shift</p>
            <p className="font-semibold text-txt">{member.shift}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Crew</p>
            <p className="font-semibold text-txt">{member.crew || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Rank</p>
            <p className="font-semibold text-txt">
              {member.times[2026] ? '—' : 'Not Yet Tested'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Personal Best" value={formatTime(member.personalBest)} color="text-blue" />
        <StatCard label="T-Shirts Earned" value={member.tshirtCount || 0} color="text-green" />
        <StatCard
          label="Years Active"
          value={Object.keys(member.times).length}
          color="text-purple"
        />
      </div>

      {/* Time History Chart */}
      {chartData.length > 0 ? (
        <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold text-txt mb-4">Time History</h2>
          <div className="w-full h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                  dataKey="time"
                  stroke="var(--color-gold)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-gold)', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-6 text-center">
          <p className="text-muted">No time data yet</p>
        </div>
      )}

      {/* All Times Table */}
      <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-txt mb-4">All Times</h2>
        {allTimes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface2 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">
                    Year
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted uppercase">
                    vs Previous
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allTimes.map((row) => (
                  <tr key={row.year} className="hover:bg-surface2 transition-colors">
                    <td className="px-4 py-3 font-semibold text-txt">{row.year}</td>
                    <td className="px-4 py-3 text-right font-bold text-gold">
                      {formatTime(row.time)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.delta !== null ? (
                        <span className={row.improvement ? 'text-green font-bold' : 'text-fire font-bold'}>
                          {row.improvement ? '↑' : '↓'} {formatTime(Math.abs(row.delta))}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-center py-8">No time data yet</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-ember' }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
