// importAllActive.js - THE "COMPLETIONIST" IMPORTER
// Captures EVERY available stat for NBA & NFL players.
// Usage: node importAllActive.js

const BALLDONTLIE_API_KEY = '48f0f115-020e-4392-9a1e-67ffa6b426fc';
const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

const NBA_DELAY_MS = 3500;
const NFL_DELAY_MS = 2000;

function getCurrentSeason() {
    const date = new Date();
    // If it's Jan-Aug (months 0-7), use previous year. Sept-Dec (8-11), use current.
    return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- NBA IMPORTER ---
async function importNBA(season) {
    console.log(`\n🏀 Starting NBA Import (Season ${season})...`);
    let cursor = 0;
    let count = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `https://api.balldontlie.io/nba/v1/players/active?per_page=100&cursor=${cursor}`;
            const response = await fetch(url, { headers: { 'Authorization': BALLDONTLIE_API_KEY } });

            if (response.status === 429) { await sleep(60000); continue; }
            const data = await response.json();

            for (const p of data.data) {
                const stats = await fetchNBAStatsSafe(p.id, season);
                await saveToSupabase({
                    id: `nba-${p.id}`,
                    name: `${p.first_name} ${p.last_name}`,
                    sport: 'NBA',
                    position: p.position || 'Unknown',
                    era: '2020s',
                    primary_era: '2020s',
                    teams: [p.team ? p.team.full_name : 'Free Agent'],
                    image: '🏀',
                    bio: `Active NBA player. ${season} Season.`,
                    stats: stats
                });
                count++;
                if (count % 5 === 0) process.stdout.write('.');
                await sleep(NBA_DELAY_MS);
            }
            cursor = data.meta?.next_cursor;
            if (!cursor) hasMore = false;
        } catch (err) { console.error(err.message); await sleep(30000); }
    }
    console.log(`\n✅ NBA Complete: ${count}`);
}

async function fetchNBAStatsSafe(playerId, season) {
    try {
        const url = `https://api.balldontlie.io/nba/v1/season_averages?season=${season}&player_id=${playerId}`;
        const res = await fetch(url, { headers: { 'Authorization': BALLDONTLIE_API_KEY } });
        const json = await res.json();
        if (json.data?.[0]) {
            const s = json.data[0];
            return {
                // The Big 5
                ppg: s.pts.toFixed(1),
                rpg: s.reb.toFixed(1),
                apg: s.ast.toFixed(1),
                stl: s.stl.toFixed(1),
                blk: s.blk.toFixed(1),

                // Efficiency
                turnovers: s.turnover.toFixed(1),
                min: s.min,
                fgPct: (s.fg_pct * 100).toFixed(1),
                fg3Pct: (s.fg3_pct * 100).toFixed(1),
                ftPct: (s.ft_pct * 100).toFixed(1),

                // Volume
                fgm: s.fgm.toFixed(1), fga: s.fga.toFixed(1),
                fg3m: s.fg3m.toFixed(1), fg3a: s.fg3a.toFixed(1),
                ftm: s.ftm.toFixed(1), fta: s.fta.toFixed(1),

                // Detailed Rebounding
                oreb: s.oreb.toFixed(1),
                dreb: s.dreb.toFixed(1),

                gamesPlayed: s.games_played
            };
        }
    } catch (e) { }
    // Empty stats if missing
    return {
        ppg: 0, rpg: 0, apg: 0, stl: 0, blk: 0,
        turnovers: 0, min: "00:00", fgPct: 0, fg3Pct: 0, ftPct: 0,
        gamesPlayed: 0
    };
}

// --- NFL IMPORTER ---
async function importNFL(season) {
    console.log(`\n\n🏈 Starting NFL Import (Season ${season})...`);
    let cursor = 0;
    let count = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `https://api.balldontlie.io/nfl/v1/season_stats?season=${season}&per_page=100&cursor=${cursor}`;
            const response = await fetch(url, { headers: { 'Authorization': BALLDONTLIE_API_KEY } });

            if (response.status === 429) { await sleep(60000); continue; }
            const data = await response.json();

            for (const record of data.data) {
                const p = record.player;
                if (!p) continue;

                await saveToSupabase({
                    id: `nfl-${p.id}`,
                    name: `${p.first_name} ${p.last_name}`,
                    sport: 'NFL',
                    position: p.position || p.position_abbreviation || 'Unknown',
                    era: '2020s',
                    primary_era: '2020s',
                    teams: [record.team ? record.team.full_name : 'Free Agent'],
                    image: '🏈',
                    bio: `Active NFL player. ${season} Season.`,
                    stats: {
                        // --- OFFENSE ---
                        // Passing
                        passingYards: record.passing_yards || 0,
                        passingTouchdowns: record.passing_touchdowns || 0,
                        passingInts: record.passing_interceptions || 0,
                        passingCompletions: record.passing_completions || 0,
                        passingAttempts: record.passing_attempts || 0,
                        passingSacks: record.passing_sacks || record.sacks || 0, // Sacks taken
                        qbRating: record.qb_rating || 0,
                        passing20Plus: record.passing_20_plus_yards || 0,

                        // Rushing
                        rushingYards: record.rushing_yards || 0,
                        rushingTouchdowns: record.rushing_touchdowns || 0,
                        rushingAttempts: record.rushing_attempts || 0,
                        rushingLong: record.long_rushing || 0,
                        rushingFumbles: record.rushing_fumbles || 0,

                        // Receiving
                        receivingYards: record.receiving_yards || 0,
                        receivingTouchdowns: record.receiving_touchdowns || 0,
                        receptions: record.receptions || 0,
                        receivingTargets: record.receiving_targets || 0,
                        receivingLong: record.long_reception || 0,
                        receivingFumbles: record.receiving_fumbles || 0,

                        // --- DEFENSE ---
                        tackles: record.total_tackles || 0,
                        soloTackles: record.solo_tackles || 0,
                        sacks: record.defensive_sacks || record.sacks || 0, // Sacks made
                        defInterceptions: record.defensive_interceptions || record.interceptions || 0,
                        intYards: record.interception_yards || 0,
                        intTouchdowns: record.interception_touchdowns || 0,
                        passesDefended: record.passes_defended || 0,
                        tfl: record.tackles_for_loss || 0,
                        qbHits: record.qb_hits || 0,
                        fumblesForced: record.fumbles_forced || 0,
                        fumblesRecovered: record.fumbles_recovered || 0,
                        fumblesTouchdowns: record.fumbles_touchdowns || 0,

                        // --- SPECIAL TEAMS ---
                        // Kicking
                        fieldGoalsMade: record.field_goals_made || 0,
                        fieldGoalsAtt: record.field_goal_attempts || 0,
                        longFieldGoal: record.long_field_goal_made || 0,
                        extraPointsMade: record.extra_points_made || 0,
                        totalPoints: record.total_points || 0,

                        // Punting
                        punts: record.punts || 0,
                        puntAvg: record.gross_avg_punt_yards || 0,
                        puntsInside20: record.punts_inside_20 || 0,
                        longPunt: record.long_punt || 0,
                        touchbacks: record.touchbacks || 0,

                        // Returns
                        kickReturns: record.kick_returns || 0,
                        kickReturnYards: record.kick_return_yards || 0,
                        kickReturnTDs: record.kick_return_touchdowns || 0,
                        puntReturns: record.punt_returns || 0,
                        puntReturnYards: record.punt_return_yards || 0,
                        puntReturnTDs: record.punt_return_touchdowns || 0,

                        gamesPlayed: record.games_played || 0
                    }
                });
                count++;
            }
            process.stdout.write(`+${data.data.length} `);
            cursor = data.meta?.next_cursor;
            if (!cursor) hasMore = false;
            await sleep(NFL_DELAY_MS);
        } catch (err) { console.error(err.message); await sleep(10000); }
    }
    console.log(`\n✅ NFL Complete: ${count}`);
}

async function saveToSupabase(playerObj) {
    await fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(playerObj)
    });
}

async function main() {
    const CURRENT_SEASON = getCurrentSeason();
    await importNFL(CURRENT_SEASON);
    await importNBA(CURRENT_SEASON);
    console.log('\n🎉 DONE! All 2025 Stats (Offense, Defense, Special Teams) Captured.');
}

main();