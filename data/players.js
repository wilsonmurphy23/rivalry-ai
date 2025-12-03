/* ====================================
   PLAYERS DATA - MASTER VOR CALCULATOR (FIXED POSITIONS)
   ==================================== */

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

window.allPlayers = [];
window.playersLoaded = false;

// 1. Load ALL players (Pagination Handling)
window.loadRealPlayers = async () => {
    try {
        console.log('🔄 Loading complete player database...');

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

        console.log(`✅ Loaded ${allData.length} total players.`);

        // 2. Process & Score Players
        window.allPlayers = allData.map(p => {
            const stats = p.stats || {};
            // Fallback emoji if image missing
            let image = p.image;
            if (!image || image === 'undefined') image = p.sport === 'NBA' ? '🏀' : '🏈';

            return {
                ...p,
                stats: stats,
                eraAdjustedVOR: calculateVOR(stats, p.sport, p.position),
                image: image
            };
        });

        window.playersLoaded = true;
        return window.allPlayers;

    } catch (error) {
        console.error('❌ Error loading players:', error);
        return [];
    }
};

// =================================================================
// 🧠 THE MASTER VOR FORMULA (Matches Database Strings)
// =================================================================
const calculateVOR = (s, sport, position) => {
    if (!s) return 60;

    let rawScore = 0;
    const pos = position ? position.toUpperCase() : 'UNKNOWN';

    // --- 🏀 NBA (PER-Lite Formula) ---
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

        // Base Score
        rawScore = (ppg * 1.0)
            + (oreb * 1.2) // Offensive boards are valuable
            + (dreb * 0.8)
            + (apg * 0.9)
            + (stl * 2.0)
            + (blk * 2.0)
            - (tov * 1.0);

        // Efficiency Multiplier (Reward 50/40/90 players)
        if (fgPct > 50) rawScore += 2;
        if (fg3Pct > 40) rawScore += 2;
        if (ftPct > 90) rawScore += 2;

        // Normalize (NBA PER usually ~15-30. We want 60-99 scale)
        // Avg player ~15 rawScore -> 75 rating
        return normalizeScore(rawScore, 2, 40);
    }

    // --- 🏈 NFL (Position Specific - Now with Full Names) ---
    else {
        // Common Negative Stats
        const fumbles = (parseFloat(s.rushingFumbles) || 0) + (parseFloat(s.receivingFumbles) || 0) + (parseFloat(s.fumblesRecovered) || 0 * -1);

        // 1. QUARTERBACKS
        if (pos === 'QB' || pos === 'QUARTERBACK') {
            const passYds = parseFloat(s.passingYards) || 0;
            const passTDs = parseFloat(s.passingTouchdowns) || 0;
            const ints = parseFloat(s.passingInts) || 0;
            const sacksTaken = parseFloat(s.passingSacks) || 0;
            const rushYds = parseFloat(s.rushingYards) || 0;
            const rushTDs = parseFloat(s.rushingTouchdowns) || 0;

            rawScore = (passYds / 25)
                + (passTDs * 4)
                - (ints * 2)
                - (sacksTaken * 0.5)
                + (rushYds / 10)
                + (rushTDs * 6)
                - (fumbles * 2);

            // Normalize (Elite QB ~400 pts, Avg ~150)
            return normalizeScore(rawScore, 100, 450);
        }

        // 2. RUNNING BACKS
        else if (['RB', 'FB', 'HB', 'RUNNING BACK', 'FULLBACK'].includes(pos)) {
            const rushYds = parseFloat(s.rushingYards) || 0;
            const rushTDs = parseFloat(s.rushingTouchdowns) || 0;
            const recYds = parseFloat(s.receivingYards) || 0;
            const recTDs = parseFloat(s.receivingTouchdowns) || 0;
            const rec = parseFloat(s.receptions) || 0;

            rawScore = (rushYds / 10)
                + (rushTDs * 6)
                + (recYds / 10)
                + (recTDs * 6)
                + (rec * 0.5) // 0.5 PPR
                - (fumbles * 2);

            // Normalize (Elite RB ~300 pts, Avg ~100)
            return normalizeScore(rawScore, 50, 350);
        }

        // 3. WIDE RECEIVERS / TIGHT ENDS
        else if (['WR', 'TE', 'SE', 'FL', 'WIDE RECEIVER', 'TIGHT END'].includes(pos)) {
            const recYds = parseFloat(s.receivingYards) || 0;
            const recTDs = parseFloat(s.receivingTouchdowns) || 0;
            const rec = parseFloat(s.receptions) || 0;
            const targets = parseFloat(s.receivingTargets) || 0;

            // Catch Rate Bonus
            const catchRate = targets > 0 ? (rec / targets) : 0;
            const efficiencyBonus = catchRate > 0.70 ? 10 : 0;

            rawScore = (recYds / 10)
                + (recTDs * 6)
                + (rec * 1.0) // 1.0 PPR
                + efficiencyBonus
                - (fumbles * 2);

            // Normalize (Elite WR ~350 pts, Avg ~120)
            return normalizeScore(rawScore, 60, 400);
        }

        // 4. DEFENSIVE FRONT (DL / LB)
        else if (['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB',
            'DEFENSIVE END', 'DEFENSIVE TACKLE', 'LINEBACKER'].includes(pos)) {

            const tackles = parseFloat(s.tackles) || 0;
            const sacks = parseFloat(s.sacks) || 0;
            const tfl = parseFloat(s.tfl) || 0;
            const hits = parseFloat(s.qbHits) || 0;
            const ff = parseFloat(s.fumblesForced) || 0;
            const fr = parseFloat(s.fumblesRecovered) || 0;
            const ints = parseFloat(s.defInterceptions) || 0;
            const defTDs = parseFloat(s.fumblesTouchdowns) || 0 + parseFloat(s.intTouchdowns) || 0;

            rawScore = (tackles * 1.5)
                + (sacks * 4)
                + (tfl * 2)
                + (hits * 1)
                + (ff * 3)
                + (fr * 3)
                + (ints * 5)
                + (defTDs * 6);

            // Normalize (Elite Defender ~150-200 pts, Avg ~50)
            return normalizeScore(rawScore, 30, 200);
        }

        // 5. SECONDARY (CB / S)
        else if (['CB', 'S', 'FS', 'SS', 'DB', 'CORNERBACK', 'SAFETY'].includes(pos)) {
            const tackles = parseFloat(s.tackles) || 0;
            const ints = parseFloat(s.defInterceptions) || 0;
            const pds = parseFloat(s.passesDefended) || 0;
            const defTDs = parseFloat(s.intTouchdowns) || 0;

            rawScore = (tackles * 1.0)
                + (ints * 6) // INTs worth more for DBs
                + (pds * 3)  // PDs are their main job
                + (defTDs * 6);

            // Normalize (Elite DB ~100-150 pts, Avg ~40)
            return normalizeScore(rawScore, 20, 150);
        }

        // 6. KICKERS
        else if (['K', 'KICKER', 'PLACE KICKER', 'PLACEKICKER'].includes(pos)) {
            const fgs = parseFloat(s.fieldGoalsMade) || 0;
            const att = parseFloat(s.fieldGoalsAtt) || 0;
            const long = parseFloat(s.longFieldGoal) || 0;
            const xps = parseFloat(s.extraPointsMade) || 0;

            const misses = att - fgs;

            rawScore = (fgs * 3)
                + (xps * 1)
                - (misses * 1)
                + (long > 50 ? 5 : 0); // Bonus for big leg

            // Normalize (Elite K ~150 pts, Avg ~80)
            return normalizeScore(rawScore, 50, 160);
        }

        // 7. PUNTERS
        else if (['P', 'PUNTER'].includes(pos)) {
            const punts = parseFloat(s.punts) || 0;
            const avg = parseFloat(s.puntAvg) || 0;
            const in20 = parseFloat(s.puntsInside20) || 0;
            const long = parseFloat(s.longPunt) || 0;

            // Rating based on quality, not just volume
            rawScore = (punts * 1) + (avg * 2) + (in20 * 3) + (long > 60 ? 5 : 0);

            // Normalize (Elite P ~200 pts)
            return normalizeScore(rawScore, 80, 250);
        }

        // 8. O-LINE / UNKNOWN
        else {
            const games = parseFloat(s.gamesPlayed) || 0;
            // Base score just for being active
            return Math.min(90, 60 + games);
        }
    }

    // Fallback
    return 60;
};

// Helper to map a raw stat score (e.g., 300 fantasy points) to a 60-99 rating
const normalizeScore = (val, minRange, maxRange) => {
    if (val <= minRange) return 60; // Benchwarmer floor
    if (val >= maxRange) return 99; // MVP ceiling

    // Linear interpolation between 60 and 99
    const percent = (val - minRange) / (maxRange - minRange);
    return Math.round(60 + (percent * 39));
};

console.log('✅ Players data module loaded (Completionist VOR)');