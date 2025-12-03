// verifyDetailed.js - Master Database Audit
// Usage: node verifyDetailed.js

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

async function verify() {
    console.log('🔍 Starting Deep Data Audit...\n');

    // 1. Fetch ALL Players
    const { data: players, error } = await fetch(`${SUPABASE_URL}/rest/v1/players?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }).then(res => res.json());

    if (!players || players.length === 0) {
        console.log('❌ Error: No players found in database.');
        return;
    }

    console.log(`✅ Loaded ${players.length} players from Supabase.\n`);

    // ====================================================
    // PART 1: STAR PLAYER CHECK (Are the big names correct?)
    // ====================================================
    console.log('⭐ SPECIFIC PLAYER AUDIT');
    console.log('═'.repeat(60));

    const targets = [
        { name: 'Drake Maye', role: 'QB (Passing/Rushing)' },
        { name: 'Derrick Henry', role: 'RB (Rushing)' },
        { name: 'Justin Jefferson', role: 'WR (Receiving)' },
        { name: 'T.J. Watt', role: 'Defense (Sacks)' },
        { name: 'Fred Warner', role: 'Defense (Tackles)' },
        { name: 'Cooper DeJean', role: 'Defense (Secondary)' },
        { name: 'Brandon Aubrey', role: 'Special Teams (Kicker)' },
        { name: 'Ryan Stonehouse', role: 'Special Teams (Punter)' }
    ];

    targets.forEach(t => {
        const p = players.find(player => player.name.toLowerCase().includes(t.name.toLowerCase()));
        if (p) {
            console.log(`✅ ${p.name} (${t.role})`);
            console.log(`   VOR: ${p.eraAdjustedVOR}`);
            // Print only non-zero stats
            const cleanStats = Object.entries(p.stats)
                .filter(([_, val]) => val != 0 && val != "0.0" && val != "0")
                .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
            console.log('   Stats:', JSON.stringify(cleanStats));
        } else {
            console.log(`❌ MISSING: ${t.name}`);
        }
        console.log('─'.repeat(60));
    });

    // ====================================================
    // PART 2: DATA COVERAGE CHECK (Is the database empty?)
    // ====================================================
    console.log('\n📊 DATABASE HEALTH CHECK');
    console.log('(Searching for at least ONE player with data in each category)');
    console.log('═'.repeat(60));

    const nflStatsToCheck = [
        // Offense
        'passingYards', 'passingTouchdowns', 'rushingYards', 'receivingYards', 'receptions',
        // Defense
        'tackles', 'soloTackles', 'sacks', 'tfl', 'qbHits',
        'defInterceptions', 'passesDefended', 'fumblesForced',
        // Special Teams
        'fieldGoalsMade', 'longFieldGoal', 'punts', 'puntAvg', 'puntsInside20',
        'kickReturnYards', 'puntReturnYards'
    ];

    const nbaStatsToCheck = [
        'ppg', 'rpg', 'apg', 'stl', 'blk', 'fg3m', 'oreb', 'turnovers'
    ];

    console.log('🏈 NFL STATS:');
    const nflPlayers = players.filter(p => p.sport === 'NFL');

    nflStatsToCheck.forEach(field => {
        const example = nflPlayers.find(p => parseFloat(p.stats[field]) > 0);
        if (example) {
            console.log(`✅ ${field.padEnd(20)} : Found ${example.stats[field]} (${example.name})`);
        } else {
            console.log(`⚠️ ${field.padEnd(20)} : ❌ NO DATA FOUND (Likely an import error)`);
        }
    });

    console.log('\n🏀 NBA STATS:');
    const nbaPlayers = players.filter(p => p.sport === 'NBA');

    nbaStatsToCheck.forEach(field => {
        const example = nbaPlayers.find(p => parseFloat(p.stats[field]) > 0);
        if (example) {
            console.log(`✅ ${field.padEnd(20)} : Found ${example.stats[field]} (${example.name})`);
        } else {
            console.log(`⚠️ ${field.padEnd(20)} : ❌ NO DATA FOUND`);
        }
    });
}

verify();