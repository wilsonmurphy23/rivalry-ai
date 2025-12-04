// testVOR.js - Dynamic Bell Curve VOR Verification Script
// Usage: node testVOR.js

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';


async function runTest() {
    console.log("📊 STARTING VOR DISTRIBUTION TEST (DYNAMIC BELL CURVE)");

    // 1. Fetch Data
    const players = await fetchAllPlayers();
    console.log(`\n✅ Loaded ${players.length} players. Calculating Raw Scores...`);

    // 2. CALCULATE RAW SCORES (Pass 1)
    const scoredPlayers = players.map(p => {
        const group = getPositionGroup(p.sport, p.position);
        const raw = calculateRawScore(p.stats, p.sport, p.position);
        return { ...p, group, raw };
    });

    // 3. ANALYZE DISTRIBUTIONS (Pass 2)
    const distributions = {};
    const groups = [...new Set(scoredPlayers.map(p => p.group))];

    groups.forEach(groupName => {
        // Filter players who actually played (raw score > 1) to set a realistic average
        const groupScores = scoredPlayers
            .filter(p => p.group === groupName && p.raw > 1)
            .map(p => p.raw);

        if (groupScores.length > 0) {
            const mean = groupScores.reduce((a, b) => a + b, 0) / groupScores.length;
            const variance = groupScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / groupScores.length;
            distributions[groupName] = {
                mean: mean,
                stdDev: Math.sqrt(variance)
            };
        } else {
            distributions[groupName] = { mean: 10, stdDev: 1 }; // Fallback for very small groups
        }
    });

    // 4. APPLY Z-SCORE NORMALIZATION (Pass 3)
    console.log("\n📈 DISTRIBUTION REPORT (75 = Average)");
    console.log("═".repeat(60));

    Object.keys(distributions).forEach(groupName => {
        const dist = distributions[groupName];
        const groupPlayers = scoredPlayers.filter(p => p.group === groupName);

        const ratedPlayers = groupPlayers.map(p => {
            const zScore = (p.raw - dist.mean) / (dist.stdDev || 1);
            let rating = 75 + (zScore * 10); // 10 points per SD

            // Final Clamp (40 is the hard floor)
            rating = Math.min(99, Math.max(40, Math.round(rating)));

            // Ensure 0-stat players are bottomed out
            if (p.raw <= 0.1) rating = 40;

            return { name: p.name, raw: p.raw.toFixed(1), rating };
        }).sort((a, b) => b.rating - a.rating || b.raw - a.raw);

        // Print Report
        const elite = ratedPlayers.filter(p => p.rating >= 90).length;
        const topTier = ratedPlayers.filter(p => p.rating >= 80 && p.rating < 90).length;
        const totalCount = ratedPlayers.length;

        console.log(`\n📌 GROUP: ${groupName.padEnd(12)} (Total: ${totalCount})`);
        console.log(`   Avg Score: ${dist.mean.toFixed(1)} | StdDev: ${dist.stdDev.toFixed(1)}`);
        console.log(`   Distribution: 90+ [${elite}] | 80-89 [${topTier}] | <80 [${totalCount - elite - topTier}]`);

        // Print Top 3
        console.log(`   🏆 TOP 3:`);
        ratedPlayers.slice(0, 3).forEach(p => console.log(`      - VOR ${p.rating} | ${p.name.padEnd(25)} (Raw: ${p.raw})`));

        // Print Bottom 3
        if (ratedPlayers.length > 5) {
            console.log(`   🪑 BOTTOM 3:`);
            ratedPlayers.slice(-3).forEach(p => console.log(`      - VOR ${p.rating} | ${p.name.padEnd(25)} (Raw: ${p.raw})`));
        }
    });
}

// =================================================================
// 🧠 RAW SCORE CALCULATOR (Uses the user's specific formulas)
// =================================================================
const calculateRawScore = (s, sport, position) => {
    if (!s) return 0;
    let score = 0;
    const pos = position ? position.toUpperCase() : 'UNKNOWN';

    // --- NBA ---
    if (sport === 'NBA') {
        const ppg = parseFloat(s.ppg) || 0;
        const rpg = parseFloat(s.rpg) || 0;
        const apg = parseFloat(s.apg) || 0;
        const stl = parseFloat(s.stl) || 0;
        const blk = parseFloat(s.blk) || 0;
        const tov = parseFloat(s.turnovers) || 0;
        const oreb = parseFloat(s.oreb) || 0;

        score = (ppg * 1.0) + (oreb * 1.2) + (rpg * 0.7) + (apg * 0.9) + (stl * 2.0) + (blk * 2.0) - (tov * 1.0);
        if (parseFloat(s.fgPct) > 50) score += 2;
        if (parseFloat(s.fg3Pct) > 40) score += 2;
        if (parseFloat(s.ftPct) > 90) score += 2;

    }
    // --- 🏈 NFL ---
    else {
        const fumbles = (parseFloat(s.rushingFumbles) || 0) + (parseFloat(s.receivingFumbles) || 0);

        // 1. QB
        if (pos.includes('QUARTERBACK') || pos === 'QB') {
            score = (parseFloat(s.passingYards) || 0) / 25 + (parseFloat(s.passingTouchdowns) || 0) * 4 - (parseFloat(s.passingInts) || 0) * 2 + (parseFloat(s.rushingYards) || 0) / 10 + (parseFloat(s.rushingTouchdowns) || 0) * 6 - fumbles * 2;
        }
        // 2. RB
        else if (['RB', 'FB', 'HB', 'RUNNING BACK', 'FULLBACK'].some(r => pos.includes(r))) {
            score = (parseFloat(s.rushingYards) || 0) / 10 + (parseFloat(s.rushingTouchdowns) || 0) * 6 + (parseFloat(s.receivingYards) || 0) / 10 + (parseFloat(s.receivingTouchdowns) || 0) * 6 + (parseFloat(s.receptions) || 0) * 0.5 - fumbles * 2;
        }
        // 3. WR/TE
        else if (['WR', 'TE', 'SE', 'FL', 'WIDE RECEIVER', 'TIGHT END'].some(r => pos.includes(r))) {
            score = (parseFloat(s.receivingYards) || 0) / 10 + (parseFloat(s.receivingTouchdowns) || 0) * 6 + (parseFloat(s.receptions) || 0) * 1.0 - fumbles * 2;
        }
        // 4. DEFENSE
        else if (['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'CB', 'S', 'FS', 'SS', 'DB'].some(r => pos.includes(r))) {
            score = (parseFloat(s.tackles) || 0) * 1.5 + (parseFloat(s.sacks) || 0) * 4 + (parseFloat(s.defInterceptions) || 0) * 5 + (parseFloat(s.passesDefended) || 0) * 2;
        }
        // 5. KICKERS
        else if (pos.includes('KICKER') || pos === 'K') {
            score = (parseFloat(s.fieldGoalsMade) || 0) * 3 + (parseFloat(s.longFieldGoal) || 0 > 50 ? 5 : 0);
        }
        // 6. PUNTERS
        else if (pos.includes('PUNTER') || pos === 'P') {
            score = (parseFloat(s.puntAvg) || 0) + (parseFloat(s.puntsInside20) || 0) * 2;
        }
        // 7. O-LINE / OTHER
        else {
            score = parseFloat(s.gamesPlayed) || 0 * 1.5;
        }
    }
    return score;
};

// Helper: Grouping (Handles Full Names)
const getPositionGroup = (sport, position) => {
    if (sport === 'NBA') return 'NBA';
    const pos = position ? position.toUpperCase() : 'UNKNOWN';
    if (pos.includes('QUARTERBACK') || pos === 'QB') return 'NFL_QB';
    if (['RB', 'FB', 'HB', 'RUNNING BACK'].some(r => pos.includes(r))) return 'NFL_RB';
    if (['WR', 'TE', 'SE', 'FL', 'WIDE RECEIVER'].some(r => pos.includes(r))) return 'NFL_WR';
    if (pos.includes('KICKER') || pos === 'K') return 'NFL_K';
    if (pos.includes('PUNTER') || pos === 'P') return 'NFL_P';
    if (['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'CB', 'S', 'FS', 'SS', 'DB', 'DEFENSIVE'].some(r => pos.includes(r))) return 'NFL_DEF';
    return 'NFL_OTHER';
};

// Helper: Fetch from Supabase with Pagination
async function fetchAllPlayers() {
    let allData = [];
    let from = 0;
    const step = 1000;
    let more = true;

    while (more) {
        // NOTE: This uses the SERVICE_ROLE KEY (SUPABASE_KEY) which bypasses RLS
        const { data, error } = await fetch(`${SUPABASE_URL}/rest/v1/players?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Range': `${from}-${from + step - 1}`
            }
        }).then(r => r.json().then(d => ({ data: d, error: r.ok ? null : d })));

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
        } else {
            more = false;
        }
    }
    return allData;
}

runTest();