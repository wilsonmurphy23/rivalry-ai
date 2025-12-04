/* ====================================
   PLAYERS DATA - DYNAMIC BELL CURVE (TRUE DISTRIBUTION) - FIXED
   ==================================== */

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

window.allPlayers = [];
window.playersLoaded = false;

window.loadRealPlayers = async () => {
    try {
        console.log('Loading complete player database...');

        // 1. FETCH ALL DATA
        let allData = [];
        let from = 0;
        const step = 1000;
        let more = true;

        while (more) {
            const { data, error } = await window.supabase
                .from('players')
                .select('*')
                .range(from, from + step - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                console.log(`   Fetched ${allData.length} players...`);
            } else {
                more = false;
            }
        }

        console.log(`✅ Loaded ${allData.length} players. Running Statistical Analysis...`);

        // 2. CALCULATE RAW SCORES (PASS 1)
        const playersWithRawScores = allData.map(p => {
            const stats = p.stats || {};
            const posGroup = getPositionGroup(p.sport, p.position);
            return {
                ...p,
                stats: stats,
                rawScore: calculateRawScore(stats, p.sport, p.position), // Get unscaled points
                posGroup: posGroup,
                image: p.image && p.image !== 'undefined' ? p.image : (p.sport === 'NBA' ? '🏀' : '🏈')
            };
        });

        // 3. ANALYZE DISTRIBUTIONS (PASS 2)
        // Calculate Mean and Standard Deviation for every position group
        const distributions = {};
        const groups = [...new Set(playersWithRawScores.map(p => p.posGroup))];

        groups.forEach(group => {
            // Filter out players with 0 stats so they don't drag the average down too much
            const groupScores = playersWithRawScores
                .filter(p => p.posGroup === group && p.rawScore > 1)
                .map(p => p.rawScore);

            if (groupScores.length > 0) {
                const mean = groupScores.reduce((a, b) => a + b, 0) / groupScores.length;
                const variance = groupScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / groupScores.length;
                distributions[group] = {
                    mean: mean,
                    stdDev: Math.sqrt(variance)
                };
            } else {
                distributions[group] = { mean: 10, stdDev: 1 }; // Fallback
            }
        });

        // 4. ASSIGN Z-SCORES (PASS 3)
        window.allPlayers = playersWithRawScores.map(p => {
            const dist = distributions[p.posGroup];

            // Z-Score = (Your Score - Average) / Variance
            const zScore = (p.rawScore - dist.mean) / (dist.stdDev || 1);

            // --- THE CURVE LOGIC ---
            // Each Standard Deviation = +/- 10 points (75 is average)
            let finalRating = 75 + (zScore * 10);

            // Cap at 99, but lower floor to 40
            finalRating = Math.min(99, Math.max(40, Math.round(finalRating)));

            // Hard override for players with literally 0 stats
            if (p.rawScore <= 0.1) finalRating = 40;

            return {
                ...p,
                eraAdjustedVOR: finalRating
            };
        });

        window.playersLoaded = true;
        return window.allPlayers;

    } catch (error) {
        console.error('Error loading players:', error);
        return [];
    }
};

// Helper: Grouping (Handles Full Names)
const getPositionGroup = (sport, position) => {
    if (sport === 'NBA') return 'NBA';

    const pos = position ? position.toUpperCase() : 'UNKNOWN';
    if (pos.includes('QUARTERBACK') || pos === 'QB') return 'NFL_QB';

    // ✅ FIXED: Defense Check First to prevent Cornerback matching RB
    if (['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'CB', 'S', 'FS', 'SS', 'DB', 'DEFENSIVE', 'CORNERBACK', 'SAFETY'].some(r => pos.includes(r))) return 'NFL_DEF';

    if (['RB', 'FB', 'HB'].some(r => pos.includes(r))) return 'NFL_RB';
    if (['WR', 'TE', 'SE', 'FL'].some(r => pos.includes(r))) return 'NFL_WR';
    if (pos.includes('KICKER') || pos === 'K') return 'NFL_K';
    if (pos.includes('PUNTER') || pos === 'P') return 'NFL_P';

    return 'NFL_OTHER';
};

// Helper: Calculate RAW production (Uncapped, Unscaled)
const calculateRawScore = (s, sport, position) => {
    if (!s) return 0;
    let rawScore = 0;
    const pos = position ? position.toUpperCase() : 'UNKNOWN';

    // --- 🏀 NBA (PER-Lite with Efficiency) ---
    if (sport === 'NBA') {
        const ppg = parseFloat(s.ppg) || 0;
        const apg = parseFloat(s.apg) || 0;
        const rpg = parseFloat(s.rpg) || 0; // Total Reb (fallback)
        const oreb = parseFloat(s.oreb) || (rpg * 0.3); // Est if missing
        const dreb = parseFloat(s.dreb) || (rpg * 0.7);
        const stl = parseFloat(s.stl) || 0;
        const blk = parseFloat(s.blk) || 0;
        const tov = parseFloat(s.turnovers) || 0;

        // Efficiency bonuses
        const fgPct = parseFloat(s.fgPct) || 0;
        const fg3Pct = parseFloat(s.fg3Pct) || 0;
        const ftPct = parseFloat(s.ftPct) || 0;

        // Base Score (Restored original calculation with OREB/DREB split)
        rawScore = (ppg * 1.0)
            + (oreb * 1.2)
            + (dreb * 0.8)
            + (apg * 0.9)
            + (stl * 2.0)
            + (blk * 2.0)
            - (tov * 1.0);

        // --- RESTORED EFFICIENCY BONUS ---
        if (fgPct > 50) rawScore += 2;
        if (fg3Pct > 40) rawScore += 2;
        if (ftPct > 90) rawScore += 2;
    }

    // --- 🏈 NFL (Position Specific with Penalties/Bonuses) ---
    else {
        // Common Negative Stats
        const fumbles = (parseFloat(s.rushingFumbles) || 0) + (parseFloat(s.receivingFumbles) || 0);

        // 1. QUARTERBACKS
        if (pos.includes('QUARTERBACK') || pos === 'QB') {
            const passYds = parseFloat(s.passingYards) || 0;
            const passTDs = parseFloat(s.passingTouchdowns) || 0;
            const ints = parseFloat(s.passingInts) || 0;
            const sacksTaken = parseFloat(s.passingSacks) || 0; // RESTORED Sacks Taken
            const rushYds = parseFloat(s.rushingYards) || 0;
            const rushTDs = parseFloat(s.rushingTouchdowns) || 0;

            rawScore = (passYds / 25)
                + (passTDs * 4)
                - (ints * 2)
                - (sacksTaken * 0.5) // RESTORED Sacks Taken Penalty
                + (rushYds / 10)
                + (rushTDs * 6)
                - (fumbles * 2);
        }

        // ✅ 2. DEFENSE (MOVED UP TO PREVENT "CORNERBACK" MATCHING "RB")
        else if (['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'CB', 'S', 'FS', 'SS', 'DB', 'DEFENSIVE', 'CORNERBACK', 'SAFETY'].some(r => pos.includes(r))) {
            const tackles = parseFloat(s.tackles) || 0;
            const sacks = parseFloat(s.sacks) || 0;
            const ints = parseFloat(s.defInterceptions) || 0;
            const pds = parseFloat(s.passesDefended) || 0;
            const tfl = parseFloat(s.tfl) || 0;
            const ff = parseFloat(s.fumblesForced) || 0;
            const fr = parseFloat(s.fumblesRecovered) || 0;
            const defTDs = (parseFloat(s.fumblesTouchdowns) || 0) + (parseFloat(s.intTouchdowns) || 0);

            rawScore = (tackles * 1.5)
                + (sacks * 4)
                + (ints * 5)
                + (pds * 2)
                + (tfl * 2)
                + (ff * 3)
                + (fr * 3)
                + (defTDs * 6);
        }

        // 3. RUNNING BACKS
        else if (['RB', 'FB', 'HB', 'RUNNING BACK'].some(r => pos.includes(r))) {
            const rushYds = parseFloat(s.rushingYards) || 0;
            const rushTDs = parseFloat(s.rushingTouchdowns) || 0;
            const recYds = parseFloat(s.receivingYards) || 0;
            const recTDs = parseFloat(s.receivingTouchdowns) || 0;
            const rec = parseFloat(s.receptions) || 0;

            rawScore = (rushYds / 10)
                + (rushTDs * 6)
                + (recYds / 10)
                + (recTDs * 6)
                + (rec * 0.5) // 0.5 PPR (Restored explicit half-PPR)
                - (fumbles * 2);
        }

        // 4. WIDE RECEIVERS / TIGHT ENDS
        else if (['WR', 'TE', 'SE', 'FL', 'WIDE RECEIVER'].some(r => pos.includes(r))) {
            const recYds = parseFloat(s.receivingYards) || 0;
            const recTDs = parseFloat(s.receivingTouchdowns) || 0;
            const rec = parseFloat(s.receptions) || 0;
            const targets = parseFloat(s.receivingTargets) || 0;

            // --- RESTORED CATCH RATE BONUS ---
            const catchRate = targets > 0 ? (rec / targets) : 0;
            const efficiencyBonus = catchRate > 0.70 ? 10 : 0;

            rawScore = (recYds / 10)
                + (recTDs * 6)
                + (rec * 1.0) // 1.0 PPR (Restored explicit full-PPR)
                + efficiencyBonus // RESTORED
                - (fumbles * 2);
        }

        // 5. KICKERS
        else if (pos.includes('KICKER') || pos === 'K') {
            const fgs = parseFloat(s.fieldGoalsMade) || 0;
            const att = parseFloat(s.fieldGoalsAtt) || 0;
            const long = parseFloat(s.longFieldGoal) || 0;
            const misses = att - fgs; // Calculated Misses

            rawScore = (fgs * 3)
                + (parseFloat(s.extraPointsMade) || 0) * 1 // Restored XP points
                - (misses * 1) // RESTORED Miss Penalty
                + (long > 50 ? 5 : 0); // Restored Long FG Bonus
        }

        // 6. PUNTERS
        else if (pos.includes('PUNTER') || pos === 'P') {
            const punts = parseFloat(s.punts) || 0;
            const avg = parseFloat(s.puntAvg) || 0;
            const in20 = parseFloat(s.puntsInside20) || 0;
            const long = parseFloat(s.longPunt) || 0;

            rawScore = (punts * 1) // Restored volume component
                + (avg * 2) // Increased weight on average
                + (in20 * 3) // Increased weight on inside 20
                + (long > 60 ? 5 : 0); // Restored Long Punt Bonus
        }

        // 7. O-LINE / UNKNOWN
        else {
            rawScore = (parseFloat(s.gamesPlayed) || 0) * 1.5;
        }
    }

    return rawScore;
};

console.log('Players data module loaded (True Bell Curve - FIXED PRIORITY)');