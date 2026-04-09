import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader, Plus, Edit2, Check, X, Timer, Square, RotateCcw, AlertTriangle } from 'lucide-react'
import { fetchRoster, fetchTimes, upsertTime, addMember, updateMember } from '../lib/database'
import { useYear } from '../lib/YearContext'
import { parseTime, formatTime, STATIONS, SHIFTS, YEARS } from '../lib/utils'

export default function Admin() {
  const { currentYear, advanceYear } = useYear()
  const [activeTab, setActiveTab] = useState('enter-times')
  const [roster, setRoster] = useState([])
  const [times, setTimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rosterData, timesData] = await Promise.all([
          fetchRoster(),
          fetchTimes(),
        ])
        setRoster(rosterData)
        setTimes(timesData)
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
          <p className="text-muted">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-txt md:text-4xl">Admin Panel</h1>

      {error && (
        <div className="p-4 bg-fire bg-opacity-10 border border-fire rounded-lg text-txt text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green bg-opacity-10 border border-green rounded-lg text-txt text-sm">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'enter-times', label: 'Enter Times' },
          { id: 'manage-members', label: 'Manage Members' },
          { id: 'recent-entries', label: 'Recent Entries' },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-semibold text-sm md:text-base whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-ember border-b-2 border-ember -mb-[2px]'
                : 'text-muted hover:text-txt'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enter Times Tab */}
      {activeTab === 'enter-times' && (
        <EnterTimesForm
          roster={roster}
          currentYear={currentYear}
          onSuccess={(msg) => {
            setSuccessMessage(msg)
            setTimeout(() => setSuccessMessage(null), 3000)
          }}
        />
      )}

      {/* Manage Members Tab */}
      {activeTab === 'manage-members' && (
        <ManageMembersForm
          roster={roster}
          onSuccess={(msg) => {
            setSuccessMessage(msg)
            setTimeout(() => setSuccessMessage(null), 3000)
          }}
        />
      )}

      {/* Recent Entries Tab */}
      {activeTab === 'recent-entries' && (
        <RecentEntriesTable roster={roster} times={times} onSuccess={(msg) => {
          setSuccessMessage(msg)
          setTimeout(() => setSuccessMessage(null), 3000)
        }} />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <AdvanceYearPanel
          currentYear={currentYear}
          advanceYear={advanceYear}
          onSuccess={(msg) => {
            setSuccessMessage(msg)
            setTimeout(() => setSuccessMessage(null), 4000)
          }}
        />
      )}
    </div>
  )
}

function Stopwatch({ onCapture }) {
  const [elapsed, setElapsed] = useState(0)       // milliseconds
  const [running, setRunning] = useState(false)
  const [captured, setCaptured] = useState(null)  // captured ms
  const [penalty, setPenalty] = useState(0)        // penalty seconds added
  const intervalRef = useRef(null)
  const startRef = useRef(null)

  const buildTimeString = useCallback((totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const start = useCallback(() => {
    startRef.current = Date.now() - elapsed
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current)
    }, 10)
    setRunning(true)
    setCaptured(null)
    setPenalty(0)
  }, [elapsed])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)
    const finalMs = elapsed
    setCaptured(finalMs)
    const totalSeconds = Math.round(finalMs / 1000)
    onCapture(buildTimeString(totalSeconds))
  }, [elapsed, onCapture, buildTimeString])

  const addPenalty = useCallback((seconds) => {
    if (captured === null) return
    const newPenalty = penalty + seconds
    setPenalty(newPenalty)
    const baseSeconds = Math.round(captured / 1000)
    onCapture(buildTimeString(baseSeconds + newPenalty))
  }, [captured, penalty, onCapture, buildTimeString])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setElapsed(0)
    setCaptured(null)
    setPenalty(0)
    onCapture('')
  }, [onCapture])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const displayMs = captured ?? elapsed
  const baseSeconds = Math.floor(displayMs / 1000)
  const totalWithPenalty = baseSeconds + penalty
  const mins = Math.floor(totalWithPenalty / 60)
  const secs = totalWithPenalty % 60
  const ms = running ? Math.floor((displayMs % 1000) / 10) : null

  const timeColor = running
    ? 'text-ember'
    : captured !== null
    ? penalty > 0 ? 'text-fire' : 'text-green'
    : 'text-muted'

  return (
    <div className="bg-surface2 border border-border rounded-xl p-5 text-center space-y-4">
      <div className="flex items-center justify-center gap-2 text-muted text-sm font-semibold uppercase tracking-widest">
        <Timer size={14} />
        Live Stopwatch
      </div>

      {/* Time display */}
      <div className={`font-mono font-black tracking-tight ${timeColor}`} style={{ fontSize: '3.5rem', lineHeight: 1 }}>
        {mins}:{secs.toString().padStart(2, '0')}
        {ms !== null && <span className="text-3xl opacity-60">.{ms.toString().padStart(2, '0')}</span>}
      </div>

      {/* Penalty indicator */}
      {penalty > 0 && (
        <div className="inline-flex items-center gap-2 bg-fire border border-fire rounded-lg px-3 py-1">
          <span className="text-white text-sm font-bold">+{penalty}s penalty applied</span>
        </div>
      )}

      {captured !== null && penalty === 0 && (
        <p className="text-green text-sm font-semibold">
          ✓ Time captured — add penalties if needed, then hit Save
        </p>
      )}

      {/* Penalty buttons — only show after stopped */}
      {captured !== null && !running && (
        <div className="flex gap-2 justify-center">
          <span className="text-muted text-xs font-semibold self-center uppercase tracking-wide">Penalty:</span>
          <button
            type="button"
            onClick={() => addPenalty(5)}
            className="bg-fire hover:opacity-80 text-white font-black px-5 py-2 rounded-lg transition-all text-sm"
          >
            +5s
          </button>
          <button
            type="button"
            onClick={() => addPenalty(10)}
            className="bg-fire hover:opacity-80 text-white font-black px-5 py-2 rounded-lg transition-all text-sm"
          >
            +10s
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {!running && elapsed === 0 && (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-2 bg-green hover:opacity-90 text-bg font-bold px-6 py-3 rounded-lg transition-opacity text-sm"
          >
            <Timer size={16} />
            Start
          </button>
        )}

        {running && (
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-2 bg-fire hover:opacity-90 text-white font-bold px-6 py-3 rounded-lg transition-opacity text-sm"
          >
            <Square size={16} />
            Stop
          </button>
        )}

        {!running && elapsed > 0 && (
          <>
            {captured === null && (
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-2 bg-ember hover:opacity-90 text-bg font-bold px-6 py-3 rounded-lg transition-opacity text-sm"
              >
                <Timer size={16} />
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 bg-surface border border-border hover:border-muted text-muted font-bold px-6 py-3 rounded-lg transition-colors text-sm"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function EnterTimesForm({ roster, currentYear, onSuccess }) {
  const [memberId, setMemberId] = useState('')
  const [year, setYear] = useState(String(currentYear || new Date().getFullYear()))
  const [timeInput, setTimeInput] = useState('')
  const [isPlaceholder, setIsPlaceholder] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCapture = useCallback((t) => {
    setTimeInput(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!memberId) {
        throw new Error('Please select a member')
      }
      if (!timeInput && !isPlaceholder) {
        throw new Error('Please enter a time or mark as placeholder')
      }

      const timeSeconds = timeInput ? parseTime(timeInput) : 0
      if (timeInput && timeSeconds === null) {
        throw new Error('Invalid time format. Use M:SS (e.g., 4:21)')
      }

      await upsertTime({
        memberId,
        year: parseInt(year),
        timeSeconds,
        isPlaceholder,
        notes: notes || null,
      })

      onSuccess(`Time entry saved for ${roster.find((m) => m.id === memberId)?.name}`)
      setMemberId('')
      setTimeInput('')
      setIsPlaceholder(false)
      setNotes('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">

      {/* Stopwatch */}
      <Stopwatch onCapture={handleCapture} />

      {/* Form */}
      <div className="bg-surface border border-border rounded-lg p-6">
        {error && (
          <div className="mb-4 p-3 bg-fire bg-opacity-10 border border-fire rounded text-txt text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member" className="block text-sm font-semibold text-txt mb-2">
              Member
            </label>
            <select
              id="member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember"
            >
              <option value="">Select a member...</option>
              {roster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.crew || m.station})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-semibold text-txt mb-2">
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-semibold text-txt mb-2">
                Time (M:SS)
              </label>
              <input
                id="time"
                type="text"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="4:21 — or use stopwatch above"
                disabled={isPlaceholder}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="placeholder"
              type="checkbox"
              checked={isPlaceholder}
              onChange={(e) => {
                setIsPlaceholder(e.target.checked)
                if (e.target.checked) setTimeInput('')
              }}
              className="w-4 h-4 rounded border border-border bg-surface2 cursor-pointer"
            />
            <label htmlFor="placeholder" className="text-sm text-txt cursor-pointer">
              Mark as placeholder (injured, etc.)
            </label>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-txt mb-2">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this entry..."
              rows={2}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember hover:opacity-90 disabled:bg-muted text-bg font-semibold py-3 rounded-lg transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus size={18} />
                Save Time Entry
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function MemberFields({ station, setStation, shift, setShift, rank, setRank, crew, setCrew, birthDate, setBirthDate, startDate, setStartDate, status, setStatus, idPrefix = '' }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Station</label>
          <select value={station} onChange={(e) => setStation(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember">
            {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Shift</label>
          <select value={shift} onChange={(e) => setShift(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember">
            {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Rank</label>
          <select value={rank} onChange={(e) => setRank(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember">
            <option value="Firefighter">Firefighter</option>
            <option value="DRIVER-ENGINEER">Driver-Engineer</option>
            <option value="MEDICAL OPERATIONS TECHNICIAN">MOT</option>
            <option value="Captain">Captain</option>
            <option value="Assistant Chief">Assistant Chief</option>
            <option value="Battalion Chief">Battalion Chief</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Crew</label>
          <input type="text" value={crew} onChange={(e) => setCrew(e.target.value)}
            list="crew-options"
            placeholder="e.g., 211 A"
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember" />
          <datalist id="crew-options">
            <option value="211 A" /><option value="211 B" /><option value="211 C" />
            <option value="212 A" /><option value="212 B" /><option value="212 C" />
            <option value="213 A" /><option value="213 B" /><option value="213 C" />
            <option value="214 A" /><option value="214 B" /><option value="214 C" />
            <option value="Admin" /><option value="BC" />
          </datalist>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Birthday</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt mb-2">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-ember">
            <option value="Active">Active</option>
            <option value="Historical (No Longer Active)">Inactive / Retired</option>
          </select>
        </div>
      </div>
    </>
  )
}

function ManageMembersForm({ roster, onSuccess }) {
  // Add form state
  const [name, setName] = useState('')
  const [station, setStation] = useState(STATIONS[0])
  const [shift, setShift] = useState(SHIFTS[0])
  const [rank, setRank] = useState('Firefighter')
  const [crew, setCrew] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [status, setStatus] = useState('Active')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // Edit form state
  const [editMemberId, setEditMemberId] = useState('')
  const [editStation, setEditStation] = useState(STATIONS[0])
  const [editShift, setEditShift] = useState(SHIFTS[0])
  const [editRank, setEditRank] = useState('Firefighter')
  const [editCrew, setEditCrew] = useState('')
  const [editBirthDate, setEditBirthDate] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editStatus, setEditStatus] = useState('Active')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)

  // When a member is selected for editing, populate all fields from their data
  const handleSelectEditMember = (id) => {
    setEditMemberId(id)
    if (!id) return
    const m = roster.find((m) => m.id === id)
    if (!m) return
    setEditStation(m.station || STATIONS[0])
    setEditShift(m.shift || SHIFTS[0])
    setEditRank(m.rank || 'Firefighter')
    setEditCrew(m.crew || '')
    setEditBirthDate(m.birth_date ? m.birth_date.slice(0, 10) : '')
    setEditStartDate(m.start_date ? m.start_date.slice(0, 10) : '')
    setEditStatus(m.status || 'Active')
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError(null)
    setAddLoading(true)
    try {
      if (!name) throw new Error('Please enter member name')
      await addMember({ name, station, shift, rank, crew: crew || null, birthDate: birthDate || null, startDate: startDate || null, status })
      onSuccess(`"${name}" added successfully`)
      setName('')
      setRank('Firefighter')
      setCrew('')
      setBirthDate('')
      setStartDate('')
      setStatus('Active')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditError(null)
    setEditLoading(true)
    try {
      if (!editMemberId) throw new Error('Please select a member to edit')
      await updateMember(editMemberId, {
        station: editStation,
        shift: editShift,
        rank: editRank,
        crew: editCrew || null,
        birth_date: editBirthDate || null,
        start_date: editStartDate || null,
        status: editStatus,
      })
      const name = roster.find((m) => m.id === editMemberId)?.name
      onSuccess(`"${name}" updated successfully`)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── ADD NEW MEMBER ── */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold text-txt mb-4 flex items-center gap-2">
          <Plus size={18} className="text-ember" /> Add New Member
        </h3>
        {addError && (
          <div className="mb-4 p-3 bg-fire bg-opacity-10 border border-fire rounded text-txt text-sm">{addError}</div>
        )}
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-txt mb-2">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="John Smith" required
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt placeholder-muted focus:outline-none focus:border-ember" />
          </div>
          <MemberFields
            station={station} setStation={setStation}
            shift={shift} setShift={setShift}
            rank={rank} setRank={setRank}
            crew={crew} setCrew={setCrew}
            birthDate={birthDate} setBirthDate={setBirthDate}
            startDate={startDate} setStartDate={setStartDate}
            status={status} setStatus={setStatus}
          />
          <button type="submit" disabled={addLoading}
            className="w-full bg-ember hover:opacity-90 disabled:bg-muted text-bg font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2">
            {addLoading ? <><Loader size={18} className="animate-spin" />Adding...</> : <><Plus size={18} />Add Member</>}
          </button>
        </form>
      </div>

      {/* ── EDIT EXISTING MEMBER ── */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold text-txt mb-4 flex items-center gap-2">
          <Edit2 size={18} className="text-blue" /> Edit Existing Member
        </h3>
        {editError && (
          <div className="mb-4 p-3 bg-fire bg-opacity-10 border border-fire rounded text-txt text-sm">{editError}</div>
        )}
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-txt mb-2">Select Member</label>
            <select value={editMemberId} onChange={(e) => handleSelectEditMember(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-blue">
              <option value="">Select a member to edit...</option>
              {[...roster].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.crew || m.station} {m.status !== 'Active' ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          {editMemberId && (
            <>
              <MemberFields
                station={editStation} setStation={setEditStation}
                shift={editShift} setShift={setEditShift}
                rank={editRank} setRank={setEditRank}
                crew={editCrew} setCrew={setEditCrew}
                birthDate={editBirthDate} setBirthDate={setEditBirthDate}
                startDate={editStartDate} setStartDate={setEditStartDate}
                status={editStatus} setStatus={setEditStatus}
              />
              <button type="submit" disabled={editLoading}
                className="w-full bg-blue hover:opacity-90 disabled:bg-muted text-bg font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2">
                {editLoading ? <><Loader size={18} className="animate-spin" />Saving...</> : <><Check size={18} />Save Changes</>}
              </button>
            </>
          )}
        </form>
      </div>

    </div>
  )
}

function RecentEntriesTable({ roster, times, onSuccess }) {
  const [editingId, setEditingId] = useState(null)
  const [editTime, setEditTime] = useState('')
  const [editError, setEditError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Build full enriched list, sorted by most recent
  const allEntries = [...times]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((t) => {
      const member = roster.find((m) => m.id === t.member_id)
      return { ...t, memberName: member?.name || 'Unknown' }
    })

  // Apply search + year filter
  const recent = allEntries.filter((e) => {
    const matchName = e.memberName.toLowerCase().includes(search.toLowerCase())
    const matchYear = filterYear ? e.year === parseInt(filterYear) : true
    return matchName && matchYear
  })

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditTime(formatTime(entry.time_seconds))
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTime('')
    setEditError(null)
  }

  const saveEdit = async (entry) => {
    setEditError(null)
    setSaving(true)
    try {
      const seconds = parseTime(editTime)
      if (seconds === null) throw new Error('Invalid format — use M:SS (e.g. 4:21)')
      await upsertTime({
        memberId: entry.member_id,
        year: entry.year,
        timeSeconds: seconds,
        isPlaceholder: entry.is_placeholder,
        notes: entry.notes,
      })
      onSuccess(`Updated ${entry.memberName} ${entry.year} → ${editTime}`)
      setEditingId(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border space-y-3">
        <div>
          <h3 className="text-lg font-bold text-txt">All Time Entries</h3>
          <p className="text-muted text-sm mt-1">Search by name or filter by year. Click the edit icon on any row to correct a time.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[160px] bg-surface2 border border-border rounded-lg px-3 py-2 text-txt placeholder-muted text-sm focus:outline-none focus:border-ember"
          />
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-sm focus:outline-none focus:border-ember"
          >
            <option value="">All Years</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <p className="text-muted text-xs">{recent.length} {recent.length === 1 ? 'entry' : 'entries'} found</p>
      </div>

      {editError && (
        <div className="mx-6 mt-4 p-3 bg-fire bg-opacity-10 border border-fire rounded text-txt text-sm">{editError}</div>
      )}

      {recent.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface2 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Member</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase">Year</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase">Type</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((entry) => (
                <tr key={entry.id} className={`transition-colors ${editingId === entry.id ? 'bg-surface2' : 'hover:bg-surface2'}`}>
                  <td className="px-4 py-3 font-semibold text-txt text-sm">{entry.memberName}</td>
                  <td className="px-4 py-3 text-center text-muted text-sm">{entry.year}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 bg-green bg-opacity-20 text-white text-xs font-semibold rounded">
                      {entry.is_placeholder ? 'Placeholder' : 'Time'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === entry.id ? (
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-20 bg-bg border border-ember rounded px-2 py-1 text-txt text-sm text-center font-mono focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-bold font-mono text-gold">
                        {entry.is_placeholder ? '—' : formatTime(entry.time_seconds)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.is_placeholder ? (
                      <span className="inline-block px-2 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 text-xs font-semibold rounded">Placeholder</span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-green bg-opacity-20 text-white text-xs font-semibold rounded">Time</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{new Date(entry.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {editingId === entry.id ? (
                      <div className="flex gap-2 justify-center">
                        <button type="button" onClick={() => saveEdit(entry)} disabled={saving}
                          className="text-green hover:opacity-80 disabled:opacity-40">
                          {saving ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button type="button" onClick={cancelEdit}
                          className="text-muted hover:text-fire">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startEdit(entry)}
                        className="text-muted hover:text-ember transition-colors">
                        <Edit2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted text-center py-8">No entries yet</p>
      )}
    </div>
  )
}

function AdvanceYearPanel({ currentYear, advanceYear, onSuccess }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAdvance = async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await advanceYear()
      setConfirming(false)
      onSuccess(`✓ App advanced to ${next}. Leaderboards now show ${next} season.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-txt mb-1">Active Test Year</h2>
        <p className="text-sm text-muted mb-6">
          Controls which year's times appear on leaderboards, the dashboard, and the roster. Change this once per year when you're ready to start a new testing season.
        </p>

        <div className="flex items-center gap-4 mb-6">
          <div className="bg-surface2 border border-border rounded-lg px-6 py-4 text-center">
            <p className="text-xs text-muted mb-1">Current Year</p>
            <p className="text-4xl font-bold text-ember">{currentYear}</p>
          </div>
          <div className="text-muted text-2xl">→</div>
          <div className="bg-surface2 border border-border rounded-lg px-6 py-4 text-center opacity-50">
            <p className="text-xs text-muted mb-1">Next Year</p>
            <p className="text-4xl font-bold text-txt">{currentYear + 1}</p>
          </div>
        </div>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ember text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Advance to {currentYear + 1} Season
          </button>
        ) : (
          <div className="bg-fire bg-opacity-10 border border-fire rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-fire shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-txt">Are you sure?</p>
                <p className="text-sm text-muted mt-1">
                  This will flip the entire app to the <strong>{currentYear + 1}</strong> season. Leaderboards will show empty until {currentYear + 1} times are entered. All historical data is preserved.
                </p>
              </div>
            </div>
            {error && <p className="text-fire text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleAdvance}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-fire text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : null}
                Yes, advance to {currentYear + 1}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 bg-surface2 border border-border text-txt font-semibold rounded-lg hover:border-ember transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
