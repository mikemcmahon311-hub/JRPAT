import * as XLSX from 'xlsx'
import { formatTime } from './utils'

export function exportRosterToExcel(roster, currentYear) {
  const wb = XLSX.utils.book_new()
  const years = []
  for (let y = 2020; y <= currentYear; y++) years.push(y)

  // ── SHEET 1: Master Roster ──────────────────────────────────────────────────
  const sorted = [...roster].sort((a, b) => {
    const st = (a.station || '').localeCompare(b.station || '')
    if (st !== 0) return st
    const sh = (a.shift || '').localeCompare(b.shift || '')
    if (sh !== 0) return sh
    return a.name.localeCompare(b.name)
  })

  const rosterHeaders = [
    'Name', 'Rank', 'Station', 'Shift', 'Crew',
    ...years.map(String),
    'Personal Best', 'T-Shirts',
  ]

  const rosterRows = sorted.map(m => [
    m.name,
    m.rank || '',
    m.station || '',
    m.shift || '',
    m.crew || '',
    ...years.map(y => {
      const t = m.times[y]
      if (!t) return ''
      return m.placeholderYears?.has(y) ? `${formatTime(t)}*` : formatTime(t)
    }),
    m.personalBest ? formatTime(m.personalBest) : '',
    m.tshirtCount || 0,
  ])

  const ws1 = XLSX.utils.aoa_to_sheet([rosterHeaders, ...rosterRows])
  ws1['!cols'] = [
    { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
    ...years.map(() => ({ wch: 7 })),
    { wch: 13 }, { wch: 9 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, 'Master Roster')

  // ── SHEET 2: Current Year Individual Rankings ───────────────────────────────
  const runners = roster
    .filter(m => m.times[currentYear] && !m.placeholderYears?.has(currentYear))
    .sort((a, b) => a.times[currentYear] - b.times[currentYear])

  const rankHeaders = [
    'Rank', 'Name', 'Crew', 'Station', 'Shift',
    `${currentYear} Time`, 'Personal Best', 'New PB?',
  ]

  let rankNum = 1
  const rankRows = runners.map((m, i) => {
    if (i > 0 && m.times[currentYear] !== runners[i - 1].times[currentYear]) {
      rankNum = i + 1
    }
    return [
      rankNum,
      m.name,
      m.crew || '',
      m.station || '',
      m.shift || '',
      formatTime(m.times[currentYear]),
      m.personalBest ? formatTime(m.personalBest) : '',
      m.times[currentYear] === m.personalBest ? 'YES ★' : '',
    ]
  })

  const ws2 = XLSX.utils.aoa_to_sheet([rankHeaders, ...rankRows])
  ws2['!cols'] = [
    { wch: 6 }, { wch: 26 }, { wch: 8 }, { wch: 14 }, { wch: 10 },
    { wch: 13 }, { wch: 13 }, { wch: 9 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, `${currentYear} Rankings`)

  // ── SHEET 3: Crew Averages ──────────────────────────────────────────────────
  const crewMap = {}
  roster.forEach(m => {
    if (!m.times[currentYear]) return
    const crew = m.crew || 'Unassigned'
    if (!crewMap[crew]) crewMap[crew] = []
    crewMap[crew].push({
      name: m.name,
      time: m.times[currentYear],
      isPlaceholder: m.placeholderYears?.has(currentYear),
    })
  })

  const crewRows = Object.entries(crewMap)
    .map(([crew, members]) => {
      const avg = Math.round(members.reduce((s, m) => s + m.time, 0) / members.length)
      return { crew, avg, count: members.length, members }
    })
    .sort((a, b) => a.avg - b.avg)

  const crewHeaders = ['Rank', 'Crew', 'Avg Time', '# Members', 'Members & Times']

  const crewDataRows = crewRows.map((c, i) => [
    i + 1,
    c.crew,
    formatTime(c.avg),
    c.count,
    c.members
      .sort((a, b) => a.time - b.time)
      .map(m => `${m.name}: ${formatTime(m.time)}${m.isPlaceholder ? '*' : ''}`)
      .join('  |  '),
  ])

  const ws3 = XLSX.utils.aoa_to_sheet([crewHeaders, ...crewDataRows])
  ws3['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 90 },
  ]
  XLSX.utils.book_append_sheet(wb, ws3, `${currentYear} Crew Averages`)

  // ── Download ────────────────────────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `JRPAT_${currentYear}_Export_${date}.xlsx`)
}
