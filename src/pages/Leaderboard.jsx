import { useState, useEffect } from 'react'
import { Loader, ChevronRight, ChevronDown } from 'lucide-react'
import { fetchRoster, fetchCrewLeaderboard } from '../lib/database'
import { formatTime, getRankBadge, STATIONS, SHIFTS } from '../lib/utils'

export default function Leaderboard() {
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('individual')
  const [selectedStation, setSelectedStation] = useState('all')
  const [selectedShift, setSelectedShift] = useState('all')
  const [crewLeaderboard, setCrewLeaderboard] = useState([])
  const [expandedCrews, setExpandedCrews] = useState(new Set())

  useEffect(() => {
    const loadData = async () => {
      try {
        const rosterData = await fetchRoster()
        setRoster(rosterData)

        const crewData = await fetchCrewLeaderboard(2026)
        setCrewLeaderboard(crewData)
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
          <p className="text-muted">Loading leaderboard...</p>
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

  // Individual leaderboard filtered for 2026 — sorted, then ranked with tie support
  let individual = roster
    .filter((m) => m.times[2026])
    .map((m) => ({ ...m, time: m.times[2026] }))
    .sort((a, b) => a.time - b.time)

  if (selectedStation !== 'all') {
    individual = individual.filter((m) => m.station === selectedStation)
  }
  if (selectedShift !== 'all') {
    individual = individual.filter((m) => m.shift === selectedShift)
  }

  // Assign ranks with ties (same time = same rank; next rank skips accordingly)
  const ranked = []
  for (let i = 0; i < individual.length; i++) {
    if (i === 0) {
      ranked.push({ ...individual[i], rank: 1 })
    } else {
      const prev = ranked[i - 1]
      ranked.push({
        ...individual[i],
        rank: individual[i].time === individual[i - 1].time ? prev.rank : i + 1,
      })
    }
  }
  individual = ranked

  // Personal Best Leaders
  const pbLeaders = roster
    .filter((m) => m.personalBest)
    .map((m) => ({
      ...m,
      time: m.personalBest,
    }))
    .sort((a, b) => a.time - b.time)
    .slice(0, 50)

  // Global 2026 individual rankings (unfiltered) — used for crew member rank display
  const all2026 = roster
    .filter((m) => m.times[2026])
    .map((m) => ({ ...m, time: m.times[2026] }))
    .sort((a, b) => a.time - b.time)

  const allRanked2026 = []
  for (let i = 0; i < all2026.length; i++) {
    if (i === 0) {
      allRanked2026.push({ ...all2026[i], rank: 1 })
    } else {
      const prev = allRanked2026[i - 1]
      allRanked2026.push({
        ...all2026[i],
        rank: all2026[i].time === all2026[i - 1].time ? prev.rank : i + 1,
      })
    }
  }
  const rankById = {}
  allRanked2026.forEach((m) => { rankById[m.id] = m.rank })

  // Map crew name → members sorted by 2026 time
  const crewMembersMap = {}
  roster.forEach((member) => {
    if (!member.times[2026]) return
    const crew = member.crew || 'Unassigned'
    if (!crewMembersMap[crew]) crewMembersMap[crew] = []
    crewMembersMap[crew].push({
      ...member,
      time2026: member.times[2026],
      rank2026: rankById[member.id] ?? null,
    })
  })
  Object.keys(crewMembersMap).forEach((crew) => {
    crewMembersMap[crew].sort((a, b) => a.time2026 - b.time2026)
  })

  const toggleCrew = (crewName) => {
    setExpandedCrews((prev) => {
      const next = new Set(prev)
      if (next.has(crewName)) next.delete(crewName)
      else next.add(crewName)
      return next
    })
  }

  const shiftColors = {
    'A-Shift': 'bg-blue',
    'B-Shift': 'bg-ember',
    'C-Shift': 'bg-purple',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-txt md:text-4xl">Leaderboard</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {['individual', 'crew', 'pb'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-semibold text-sm md:text-base whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-ember border-b-2 border-ember -mb-[2px]'
                : 'text-muted hover:text-txt'
            }`}
          >
            {tab === 'individual'
              ? 'Individual (2026)'
              : tab === 'crew'
                ? 'Crew Average'
                : 'Personal Best'}
          </button>
        ))}
      </div>

      {/* Individual Tab */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {/* Filters */}
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

          {/* Individual Rankings */}
          {individual.length > 0 ? (
            <div className="space-y-2">
              {individual.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-surface2 border-border hover:border-ember transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {member.rank <= 3 ? (
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${getRankBadge(member.rank)}`}
                      >
                        {member.rank}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-muted">
                        {member.rank}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-txt truncate">{member.name}</p>
                      <p className="text-xs text-muted">
                        {member.station} • {member.shift}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gold">{formatTime(member.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No members found for selected filters</p>
          )}
        </div>
      )}

      {/* Crew Tab */}
      {activeTab === 'crew' && (
        <div className="space-y-2">
          {crewLeaderboard.length > 0 ? (
            crewLeaderboard.map((crew, idx) => {
              const isExpanded = expandedCrews.has(crew.crew)
              const members = crewMembersMap[crew.crew] || []
              return (
                <div
                  key={crew.crew}
                  className="rounded-lg bg-surface2 border border-border overflow-hidden transition-colors"
                >
                  {/* Crew Row — clickable */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:border-ember"
                    onClick={() => toggleCrew(crew.crew)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {idx < 3 ? (
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${getRankBadge(idx + 1)}`}
                        >
                          {idx + 1}
                        </div>
                      ) : (
                        <div className="w-8 text-center font-bold text-muted">#{idx + 1}</div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-txt">{crew.crew}</p>
                        <p className="text-xs text-muted">{crew.count} members</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gold">{formatTime(crew.average)}</p>
                        <p className="text-xs text-muted">avg</p>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="text-muted shrink-0" size={18} />
                        : <ChevronRight className="text-muted shrink-0" size={18} />
                      }
                    </div>
                  </div>

                  {/* Expanded Member List */}
                  {isExpanded && members.length > 0 && (
                    <div className="border-t border-border">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 bg-surface"
                        >
                          <div className="flex items-center gap-3">
                            {member.rank2026 !== null && member.rank2026 <= 3 ? (
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${getRankBadge(member.rank2026)}`}
                              >
                                {member.rank2026}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded flex items-center justify-center text-xs text-muted font-semibold">
                                {member.rank2026 !== null ? `#${member.rank2026}` : '—'}
                              </div>
                            )}
                            <p className="text-sm font-medium text-txt">{member.name}</p>
                          </div>
                          <p className="text-sm font-bold text-gold">{formatTime(member.time2026)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-muted text-center py-8">No crew data for 2026</p>
          )}
        </div>
      )}

      {/* Personal Best Tab */}
      {activeTab === 'pb' && (
        <div className="space-y-2">
          {pbLeaders.length > 0 ? (
            pbLeaders.map((member, idx) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface2 border border-border hover:border-ember transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {idx < 3 && (
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${getRankBadge(idx + 1)}`}
                    >
                      {idx + 1}
                    </div>
                  )}
                  {idx >= 3 && (
                    <div className="w-8 text-center font-bold text-muted">#{idx + 1}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-txt truncate">{member.name}</p>
                    <p className="text-xs text-muted">
                      {member.station} • {member.shift}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gold">{formatTime(member.personalBest)}</p>
                  <p className="text-xs text-muted">PB</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted text-center py-8">No personal best data</p>
          )}
        </div>
      )}
    </div>
  )
}
