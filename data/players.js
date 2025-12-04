/* ====================================
   PLAYERS DATA - DYNAMIC BELL CURVE (TRUE DISTRIBUTION) - COMPREHENSIVE FIX
   ==================================== */

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

window.allPlayers = [];
window.playersLoaded = false;

window.loadRealPlayers = async () => {
    try {
        console.log('Loading complete player database...');

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
                rawScore: calculateRawScore(stats, p.sport, posGroup),
                posGroup: posGroup,
                image: p.image && p.image !== 'undefined' ? p.image : (p.sport === 'NBA' ? '🏀' : '🏈')
            };
        });

        // 3. ANALYZE DISTRIBUTIONS (PASS 2)
        const distributions = {};
        const groups = [...new Set(playersWithRawScores.map(p => p.posGroup))];

        groups.forEach(group => {
            // Filter out players with effectively 0 stats to avoid skewing the average
            const groupScores = playersWithRawScores
                .filter(p => p.posGroup === group && p.rawScore > 0.5)
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
            const zScore = (p.rawScore - dist.mean) / (dist.stdDev || 1);

            // Standard Curve: 75 is average, +/- 10 per StdDev
            let finalRating = 75 + (zScore * 10);

            // Hard caps and floors
            finalRating = Math.min(99, Math.max(40, Math.round(finalRating)));

            // If raw score is basically 0, force floor
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

// ✅ UNIVERSAL POSITION GROUPING (Strict & Granular based on DB Report)
const getPositionGroup = (sport, position) => {
    if (sport === 'NBA') return 'NBA'; // All NBA players share the same logic

    // Normalize: Uppercase and trimmed
    const pos = position ? position.toUpperCase().trim() : 'UNKNOWN';

    // 1. SPECIALISTS (Check First)
    if (pos === 'LONG SNAPPER' || pos === 'LS') return 'NFL_LS';
    if (pos === 'FULLBACK' || pos === 'FB') return 'NFL_FB';
    if (pos === 'PUNTER' || pos === 'P') return 'NFL_P';
    // ✅ FIXED: Catch all Kicker variations
    if (pos.includes('KICKER') || pos === 'K' || pos === 'PK' || pos === 'PLACE KICKER') return 'NFL_K';

    // 2. OFFENSIVE LINE (Check Second - Zero Stats Group)
    if (['OFFENSIVE TACKLE', 'TACKLE', 'GUARD', 'CENTER', 'OT', 'OG', 'C', 'OL', 'T', 'G'].includes(pos)) return 'NFL_OL';

    // 3. DEFENSE (Check Third - Priority over "Back")
    if (['LINEBACKER', 'LB', 'ILB', 'OLB', 'MLB'].includes(pos)) return 'NFL_LB';
    if (['DEFENSIVE TACKLE', 'DT', 'NT', 'NOSE TACKLE'].includes(pos)) return 'NFL_DT';
    if (['DEFENSIVE END', 'DE', 'EDGE', 'LEO', 'RUSH'].includes(pos)) return 'NFL_DE';
    if (['CORNERBACK', 'CB', 'DB', 'CORNER'].includes(pos)) return 'NFL_CB';
    if (['SAFETY', 'S', 'FS', 'SS', 'FREE SAFETY', 'STRONG SAFETY'].includes(pos)) return 'NFL_S';

    // 4. SKILL POSITIONS (Check Last)
    if (pos === 'QUARTERBACK' || pos === 'QB') return 'NFL_QB';
    if (pos === 'RUNNING BACK' || pos === 'RB' || pos === 'HB' || pos === 'HALFBACK') return 'NFL_RB';
    if (pos === 'WIDE RECEIVER' || pos === 'WR') return 'NFL_WR';
    if (pos === 'TIGHT END' || pos === 'TE') return 'NFL_TE'; // Scored like WRs but separate group

    return 'NFL_OTHER';
};

// ✅ UNIVERSAL SCORE CALCULATION
const calculateRawScore = (s, sport, posGroup) => {
    if (!s) return 0;
    let rawScore = 0;

    // --- 🏀 NBA ---
    if (sport === 'NBA') {
        const ppg = parseFloat(s.ppg) || 0;
        const apg = parseFloat(s.apg) || 0;
        const rpg = parseFloat(s.rpg) || 0;
        const stl = parseFloat(s.stl) || 0;
        const blk = parseFloat(s.blk) || 0;
        const tov = parseFloat(s.turnovers) || 0;
        const fgPct = parseFloat(s.fgPct) || 0;

        // NBA Formula: Volume + Efficiency
        rawScore = (ppg * 1.0) + (rpg * 1.2) + (apg * 1.5) + (stl * 2.0) + (blk * 2.0) - (tov * 1.0);
        if (fgPct > 50) rawScore += 2;
    }

    // --- 🏈 NFL ---
    else {
        const games = parseFloat(s.gamesPlayed) || 0;
        const fumbles = (parseFloat(s.rushingFumbles) || 0) + (parseFloat(s.receivingFumbles) || 0); // Negative stat

        // GLOBAL BONUS: Return Yards (Applies to ANYONE who returns kicks)
        const retYds = (parseFloat(s.kickReturnYards) || 0) + (parseFloat(s.puntReturnYards) || 0);
        const retTDs = (parseFloat(s.kickReturnTouchdowns) || 0) + (parseFloat(s.puntReturnTouchdowns) || 0);
        const specialTeamsBonus = (retYds / 20) + (retTDs * 6);

        switch (posGroup) {
            case 'NFL_QB':
                const passYds = parseFloat(s.passingYards) || 0;
                const passTDs = parseFloat(s.passingTouchdowns) || 0;
                const passInts = parseFloat(s.passingInts) || 0;
                const rushYdsQB = parseFloat(s.rushingYards) || 0;
                const rushTDsQB = parseFloat(s.rushingTouchdowns) || 0;
                const sacksTaken = parseFloat(s.passingSacks) || 0;
                rawScore = (passYds / 25) + (passTDs * 4) - (passInts * 2) - (sacksTaken * 0.5) + (rushYdsQB / 10) + (rushTDsQB * 6) - (fumbles * 2);
                break;

            case 'NFL_RB':
                const rushYds = parseFloat(s.rushingYards) || 0;
                const rushTDs = parseFloat(s.rushingTouchdowns) || 0;
                const recYdsRB = parseFloat(s.receivingYards) || 0;
                const recTDsRB = parseFloat(s.receivingTouchdowns) || 0;
                const recRB = parseFloat(s.receptions) || 0;
                rawScore = (rushYds / 10) + (rushTDs * 6) + (recYdsRB / 10) + (recTDsRB * 6) + (recRB * 0.5) - (fumbles * 2);
                break;

            case 'NFL_WR':
            case 'NFL_TE': // TEs scored same as WRs but in their own group for Z-score
                const recYds = parseFloat(s.receivingYards) || 0;
                const recTDs = parseFloat(s.receivingTouchdowns) || 0;
                const rec = parseFloat(s.receptions) || 0;
                rawScore = (recYds / 10) + (recTDs * 6) + (rec * 1.0) - (fumbles * 2);
                break;

            case 'NFL_LB': // Linebackers (High Tackles, Sacks, INTs)
                const tklLB = parseFloat(s.tackles) || 0;
                const sckLB = parseFloat(s.sacks) || 0;
                const intLB = parseFloat(s.defInterceptions) || 0;
                const ffLB = parseFloat(s.fumblesForced) || 0;
                rawScore = (tklLB * 1.5) + (sckLB * 4) + (intLB * 5) + (ffLB * 3);
                break;

            case 'NFL_CB': // Corners (PDs > Tackles)
                const tklCB = parseFloat(s.tackles) || 0;
                const intCB = parseFloat(s.defInterceptions) || 0;
                const pdCB = parseFloat(s.passesDefended) || 0; // Not explicitly in report but standard
                // Note: Report showed 'intTouchdowns', add that
                const intTDCB = parseFloat(s.intTouchdowns) || 0;
                rawScore = (tklCB * 1.0) + (intCB * 6) + (intTDCB * 6) + (pdCB * 3);
                break;

            case 'NFL_S': // Safeties (Hybrid)
                const tklS = parseFloat(s.tackles) || 0;
                const intS = parseFloat(s.defInterceptions) || 0;
                const sckS = parseFloat(s.sacks) || 0;
                rawScore = (tklS * 1.2) + (intS * 6) + (sckS * 3);
                break;

            case 'NFL_DE': // Edge Rushers
                const sckDE = parseFloat(s.sacks) || 0;
                const tklDE = parseFloat(s.tackles) || 0;
                const ffDE = parseFloat(s.fumblesForced) || 0;
                rawScore = (sckDE * 5) + (tklDE * 1.0) + (ffDE * 4);
                break;

            case 'NFL_DT': // Interior Linemen (Harder stats)
                const sckDT = parseFloat(s.sacks) || 0;
                const tklDT = parseFloat(s.tackles) || 0;
                rawScore = (tklDT * 2.0) + (sckDT * 6); // Boosted multipliers for scarcity
                break;

            case 'NFL_OL': // O-Line (Reliability)
                // Score strictly on Games Played (Reliability)
                // Report confirms they have basically 0 stats
                rawScore = (games * 10.0);
                break;

            case 'NFL_K':
                const fgs = parseFloat(s.fieldGoalsMade) || 0;
                const att = parseFloat(s.fieldGoalsAtt) || 0;
                const misses = att - fgs;
                // No 'longFieldGoal' found in report keys, using basic FGs
                rawScore = (fgs * 3) - (misses * 1);
                break;

            case 'NFL_P':
                const punts = parseFloat(s.punts) || 0;
                // Basic volume for punters based on report keys
                rawScore = (punts * 1) + (games * 2);
                break;

            case 'NFL_FB': // Fullbacks
                // Report says: gamesPlayed, receptions, rushingAttempts, etc.
                const ydsFB = (parseFloat(s.rushingYards) || 0) + (parseFloat(s.receivingYards) || 0);
                const tdsFB = (parseFloat(s.rushingTouchdowns) || 0) + (parseFloat(s.receivingTouchdowns) || 0);
                const recFB = parseFloat(s.receptions) || 0;
                // Heavy weight on Games + Efficiency (since volume is low)
                rawScore = (games * 5) + (ydsFB * 1.0) + (recFB * 2.0) + (tdsFB * 10);
                break;

            case 'NFL_LS': // Long Snappers
                // Report says: gamesPlayed, tackles
                const tklLS = parseFloat(s.tackles) || 0;
                // Pure reliability score
                rawScore = (games * 8) + (tklLS * 5);
                break;

            default:
                rawScore = games * 2.0;
        }

        // Add Special Teams Bonus to everyone
        rawScore += specialTeamsBonus;
    }

    return rawScore;
};

console.log('Players data module loaded (True Bell Curve - COMPREHENSIVE FIX)');