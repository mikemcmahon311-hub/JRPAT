import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader } from 'lucide-react'
import { fetchRoster } from '../lib/database'
import { formatTime, STATIONS, SHIFTS } from '../lib/utils'

export default function Roster() {
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedStation, setSelectedStation] = useState('all')
  const [selectedShift, setSelectedShift] = useState('all')
  const navigate = useNavigate()

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
          <p className="text-muted">Loading roster...</p>
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

  // Filter roster
  let filtered = roster
  if (search) {
    const lowerSearch = search.toLowerCase()
    filtered = filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(lowerSearch) ||
        m.crew?.toLowerCase().includes(lowerSearch)
    )
  }
  if (selectedStation !== 'all') {
    filtered = filtered.filter((m) => m.station === selectedStation)
  }
  if (selectedShift !== 'all') {
    filtered = filtered.filter((m) => m.shift === selectedShift)
  }

  const getRankBadge = (member) => {
    const time = member.times[2026]
    if (!time) return null

    const all2026 = roster
      .filter((m) => m.times[2026])
      .map((m) => m.times[2026])
      .sort((a, b) => a - b)

    const rank = all2026.findIndex((t) => t === time) + 1
    if (rank > 3) return null

    const badges = {
      1: 'bg-gold text-bg',
      2: 'bg-surface2 text-txt border border-border',
      3: 'bg-orange-700 text-white',
    }
    return badges[rank]
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-txt md:text-4xl">Roster</h1>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-3 text-muted"
          />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg pl-10 pr-4 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-2">Station</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember"
            >
              <option value="all">All Stations</option>
              {STATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-2">Shift</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember"
            >
              <option value="all">All Shifts</option>
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-3">
        {filtered.length > 0 ? (
          filtered.map((member) => (
            <button
              key={member.id}
              onClick={() => navigate(`/member/${member.id}`)}
              className="w-full text-left p-4 bg-surface2 border border-border rounded-lg hover:border-ember transition-colors active:bg-surface"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-txt truncate">{member.name}</p>
                  <p className="text-xs text-muted">
                    {member.station} • {member.shift}
                  </p>
                </div>
                {getRankBadge(member) && (
                  <div className={`px-2 py-1 rounded text-xs font-bold ${getRankBadge(member)}`}>
                    #{roster.filter((m) => m.times[2026] && m.times[2026] < member.times[2026]).length + 1}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted">2026 Time</p>
                  <p className="font-bold text-gold">
                    {member.times[2026] ? formatTime(member.times[2026]) : 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">PB</p>
                  <p className="font-bold text-blue">
                    {member.personalBest ? formatTime(member.personalBest) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">T-Shirts</p>
                  <p className="font-bold text-green">{member.tshirtCount || 0}</p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className="text-muted text-center py-8">No members found</p>
        )}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length > 0 ? (
          <table className="w-full">
            <thead className="bg-surface2 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase">
                  Shift
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-muted uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-muted uppercase">
                  2026 Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-muted uppercase">
                  PB
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => navigate(`/member/${member.id}`)}
                  className="hover:bg-surface2 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-semibold text-txt">{member.name}</td>
                  <td className="px-6 py-4 text-muted text-sm">{member.station}</td>
                  <td className="px-6 py-4 text-muted text-sm">{member.shift}</td>
                  <td className="px-6 py-4 text-center">
                    {getRankBadge(member) ? (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getRankBadge(member)}`}>
                        #{roster.filter((m) => m.times[2026] && m.times[2026] < member.times[2026]).length + 1}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gold">
                    {member.times[2026] ? formatTime(member.times[2026]) : 'Pending'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-blue">
                    {member.personalBest ? formatTime(member.personalBest) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-center py-8">No members found</p>
        )}
      </div>
    </div>
  )
}
