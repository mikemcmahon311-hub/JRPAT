import { supabase } from './supabase';

/**
 * Fetch all active members with their times
 */
export async function fetchMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('status', 'Active')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all JRPAT times
 */
export async function fetchTimes() {
  const { data, error } = await supabase
    .from('jrpat_times')
    .select('*');

  if (error) throw error;
  return data || [];
}

/**
 * Fetch combined member+times data with nested times object
 * Returns array of member objects with computed fields: times (year map), personalBest, tshirtCount, latestTime
 */
export async function fetchRoster() {
  const [members, times] = await Promise.all([
    fetchMembers(),
    fetchTimes(),
  ]);

  // Create a map of times for quick lookup
  const timesByMemberId = {};
  times.forEach((t) => {
    if (!timesByMemberId[t.member_id]) {
      timesByMemberId[t.member_id] = {};
    }
    timesByMemberId[t.member_id][t.year] = t.time_seconds;
  });

  // Enrich members with computed fields
  return members.map((member) => {
    const memberTimes = timesByMemberId[member.id] || {};
    const timeValues = Object.values(memberTimes).filter(
      (t) => typeof t === 'number' && t > 0
    );

    // Personal best (lowest time)
    const personalBest =
      timeValues.length > 0 ? Math.min(...timeValues) : null;

    // T-shirt count (years with time < 5:00 = 300 seconds)
    const tshirtCount = timeValues.filter((t) => t < 300).length;

    // Latest time (most recent year with a time)
    let latestTime = null;
    for (let year = 2026; year >= 2020; year--) {
      if (memberTimes[year]) {
        latestTime = year;
        break;
      }
    }

    return {
      ...member,
      times: memberTimes,
      personalBest,
      tshirtCount,
      latestTime,
    };
  });
}

/**
 * Upsert a time entry (insert or update)
 */
export async function upsertTime({
  memberId,
  year,
  timeSeconds,
  isPlaceholder = false,
  notes = null,
}) {
  const { data, error } = await supabase
    .from('jrpat_times')
    .upsert(
      {
        member_id: memberId,
        year,
        time_seconds: timeSeconds,
        is_placeholder: isPlaceholder,
        notes,
      },
      { onConflict: 'member_id,year' }
    )
    .select();

  if (error) throw error;
  return data;
}

/**
 * Add a new member
 */
export async function addMember(member) {
  // Map camelCase to snake_case for database
  const dbMember = {
    name: member.name,
    station: member.station,
    shift: member.shift,
    rank: member.rank,
    crew: member.crew,
    status: member.status,
    birth_date: member.birthDate,
    start_date: member.startDate,
  };

  const { data, error } = await supabase
    .from('members')
    .insert([dbMember])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Update a member
 */
export async function updateMember(id, updates) {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Fetch crew leaderboard data for a given year
 * Groups members by crew, calculates crew average, sorts ascending
 */
export async function fetchCrewLeaderboard(year) {
  const roster = await fetchRoster();

  // Filter members with times for the given year
  const membersWithTimes = roster.filter((member) => member.times[year]);

  // Group by crew
  const crewMap = {};
  membersWithTimes.forEach((member) => {
    const crew = member.crew || 'Unassigned';
    if (!crewMap[crew]) {
      crewMap[crew] = [];
    }
    crewMap[crew].push(member.times[year]);
  });

  // Calculate crew averages and sort
  const leaderboard = Object.entries(crewMap)
    .map(([crew, times]) => {
      const sum = times.reduce((acc, t) => acc + t, 0);
      const average = Math.round(sum / times.length);
      return {
        crew,
        average,
        count: times.length,
      };
    })
    .sort((a, b) => a.average - b.average);

  return leaderboard;
}
