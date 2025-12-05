/* ====================================
   PLAYERS DATA - FIXED VERSION
   - Security: Using anon key instead of service role
   - Fixed: Emoji encoding
   - Fixed: Added error handling
   - Fixed: Added null checks
   ==================================== */

// ⚠️ USE ANON KEY, NOT SERVICE ROLE KEY!
const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';
// Global state
window.allPlayers = [];
window.playersLoaded = false;

// Main function to load all players from database
window.loadRealPlayers = async () => {
    try {
        console.log('Loading complete player database...');

        let allData = [];
        let from = 0;
        const step = 1000;
        let more = true;

        // Fetch all players in batches
        while (more) {
            const { data, error } = await window.supabase
                .from('players')
                .select('*')
                .range(from, from + step - 1);

            if (error) {
                console.error('Error fetching players:', error);
                throw error;
            }

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                console.log(`   Fetched ${allData.length} players...`);
            } else {
                more = false;
            }
        }

        console.log(`✅ Loaded ${allData.length} players. Running Statistical Analysis...`);

        // Validate data
        if (allData.length === 0) {
            console.warn('No players loaded from database');
            return [];
        }

        // 2. CALCULATE RAW SCORES (PASS 1)
        const playersWithRawScores = allData.map(p => {
            if (!p) return null;

            const stats = p.stats || {};
            const posGroup = getPositionGroup(p.sport, p.position);
            return {
                ...p,
                stats: stats,
                rawScore: calculateRawScore(stats, p.sport, posGroup),
                posGroup: posGroup,
                // ✅ FIXED: Proper emoji encoding
                image: p.image && p.image !== 'undefined' ? p.image : (p.sport === 'NBA' ? '🏀' : '🏈')
            };
        }).filter(Boolean); // Remove any null entries

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
                // Fallback values for groups with no valid scores
                const FALLBACK_MEAN = 10;
                const FALLBACK_STD_DEV = 1;
                distributions[group] = { mean: FALLBACK_MEAN, stdDev: FALLBACK_STD_DEV };
            }
        });

        // 4. ASSIGN Z-SCORES (PASS 3)
        const MIN_RATING = 40;
        const MAX_RATING = 99;
        const AVG_RATING = 75;
        const STD_DEV_MULTIPLIER = 10;
        const FLOOR_THRESHOLD = 0.1;

        window.allPlayers = playersWithRawScores.map(p => {
            const dist = distributions[p.posGroup];
            if (!dist) {
                console.warn(`No distribution found for position group: ${p.posGroup}`);
                return { ...p, eraAdjustedVOR: MIN_RATING };
            }

            const stdDev = dist.stdDev || 1; // Prevent division by zero
            const zScore = (p.rawScore - dist.mean) / stdDev;

            // Standard Curve: 75 is average, +/- 10 per StdDev
            let finalRating = AVG_RATING + (zScore * STD_DEV_MULTIPLIER);

            // Hard caps and floors
            finalRating = Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(finalRating)));

            // If raw score is basically 0, force floor
            if (p.rawScore <= FLOOR_THRESHOLD) {
                finalRating = MIN_RATING;
            }

            return {
                ...p,
                eraAdjustedVOR: finalRating
            };
        });

        window.playersLoaded = true;
        console.log(`✅ Analysis complete. ${window.allPlayers.length} players ready.`);
        return window.allPlayers;

    } catch (error) {
        console.error('❌ Critical error loading players:', error);
        window.allPlayers = [];
        window.playersLoaded = false;
        return [];
    }
};

// ✅ FIXED: Consistent position normalization
const normalizePosition = (position) => {
    if (!position) return 'UNKNOWN';
    return position.toUpperCase().trim();
};

// ✅ UNIVERSAL POSITION GROUPING (Strict & Granular)
const getPositionGroup = (sport, position) => {
    if (sport === 'NBA') return 'NBA'; // All NBA players share the same logic

    // Normalize: Uppercase and trimmed
    const pos = normalizePosition(position);

    // 1. SPECIALISTS (Check First)
    if (pos === 'LONG SNAPPER' || pos === 'LS') return 'NFL_LS';
    if (pos === 'FULLBACK' || pos === 'FB') return 'NFL_FB';
    if (pos === 'PUNTER' || pos === 'P') return 'NFL_P';
    // ✅ FIXED: Catch all Kicker variations
    if (pos.includes('KICKER') || pos === 'K' || pos === 'PK' || pos === 'PLACE KICKER') return 'NFL_K';

    // 2. OFFENSIVE LINE (Check Second - Zero Stats Group)
    if (['OFFENSIVE TACKLE', 'TACKLE', 'GUARD', 'CENTER', 'OT', 'OG', 'C', 'OL', 'T', 'G'].includes(pos)) {
        return 'NFL_OL';
    }

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
    if (pos === 'TIGHT END' || pos === 'TE') return 'NFL_TE';

    return 'NFL_OTHER';
};

// ✅ FIXED: Added null checks and safe parsing
const safeParseFloat = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

// ✅ UNIVERSAL SCORE CALCULATION
const calculateRawScore = (s, sport, posGroup) => {
    if (!s) return 0;
    let rawScore = 0;

    // --- 🏀 NBA ---
    if (sport === 'NBA') {
        const ppg = safeParseFloat(s.ppg);
        const apg = safeParseFloat(s.apg);
        const rpg = safeParseFloat(s.rpg);
        const stl = safeParseFloat(s.stl);
        const blk = safeParseFloat(s.blk);
        const tov = safeParseFloat(s.turnovers);
        const fgPct = safeParseFloat(s.fgPct);

        // NBA Formula: Volume + Efficiency
        rawScore = (ppg * 1.0) + (rpg * 1.2) + (apg * 1.5) + (stl * 2.0) + (blk * 2.0) - (tov * 1.0);
        if (fgPct > 50) rawScore += 2;
    }

    // --- 🏈 NFL ---
    else {
        const games = safeParseFloat(s.gamesPlayed);
        const fumbles = safeParseFloat(s.rushingFumbles) + safeParseFloat(s.receivingFumbles);

        // GLOBAL BONUS: Return Yards (Applies to ANYONE who returns kicks)
        const retYds = safeParseFloat(s.kickReturnYards) + safeParseFloat(s.puntReturnYards);
        const retTDs = safeParseFloat(s.kickReturnTouchdowns) + safeParseFloat(s.puntReturnTouchdowns);
        const specialTeamsBonus = (retYds / 20) + (retTDs * 6);

        switch (posGroup) {
            case 'NFL_QB':
                const passYds = safeParseFloat(s.passingYards);
                const passTDs = safeParseFloat(s.passingTouchdowns);
                const passInts = safeParseFloat(s.passingInts);
                const rushYdsQB = safeParseFloat(s.rushingYards);
                const rushTDsQB = safeParseFloat(s.rushingTouchdowns);
                const sacksTaken = safeParseFloat(s.passingSacks);
                rawScore = (passYds / 25) + (passTDs * 4) - (passInts * 2) - (sacksTaken * 0.5) +
                    (rushYdsQB / 10) + (rushTDsQB * 6) - (fumbles * 2);
                break;

            case 'NFL_RB':
                const rushYds = safeParseFloat(s.rushingYards);
                const rushTDs = safeParseFloat(s.rushingTouchdowns);
                const recYdsRB = safeParseFloat(s.receivingYards);
                const recTDsRB = safeParseFloat(s.receivingTouchdowns);
                const recRB = safeParseFloat(s.receptions);
                rawScore = (rushYds / 10) + (rushTDs * 6) + (recYdsRB / 10) +
                    (recTDsRB * 6) + (recRB * 0.5) - (fumbles * 2);
                break;

            case 'NFL_WR':
            case 'NFL_TE':
                const recYds = safeParseFloat(s.receivingYards);
                const recTDs = safeParseFloat(s.receivingTouchdowns);
                const rec = safeParseFloat(s.receptions);
                rawScore = (recYds / 10) + (recTDs * 6) + (rec * 1.0) - (fumbles * 2);
                break;

            case 'NFL_LB':
                const tklLB = safeParseFloat(s.tackles);
                const sckLB = safeParseFloat(s.sacks);
                const intLB = safeParseFloat(s.defInterceptions);
                const ffLB = safeParseFloat(s.fumblesForced);
                rawScore = (tklLB * 1.5) + (sckLB * 4) + (intLB * 5) + (ffLB * 3);
                break;

            case 'NFL_CB':
                const tklCB = safeParseFloat(s.tackles);
                const intCB = safeParseFloat(s.defInterceptions);
                const pdCB = safeParseFloat(s.passesDefended);
                const intTDCB = safeParseFloat(s.intTouchdowns);
                rawScore = (tklCB * 1.0) + (intCB * 6) + (intTDCB * 6) + (pdCB * 3);
                break;

            case 'NFL_S':
                const tklS = safeParseFloat(s.tackles);
                const intS = safeParseFloat(s.defInterceptions);
                const sckS = safeParseFloat(s.sacks);
                rawScore = (tklS * 1.2) + (intS * 6) + (sckS * 3);
                break;

            case 'NFL_DE':
                const sckDE = safeParseFloat(s.sacks);
                const tklDE = safeParseFloat(s.tackles);
                const ffDE = safeParseFloat(s.fumblesForced);
                rawScore = (sckDE * 5) + (tklDE * 1.0) + (ffDE * 4);
                break;

            case 'NFL_DT':
                const sckDT = safeParseFloat(s.sacks);
                const tklDT = safeParseFloat(s.tackles);
                rawScore = (tklDT * 2.0) + (sckDT * 6);
                break;

            case 'NFL_OL':
                rawScore = (games * 10.0);
                break;

            case 'NFL_K':
                const fgs = safeParseFloat(s.fieldGoalsMade);
                const att = safeParseFloat(s.fieldGoalsAtt);
                const misses = Math.max(0, att - fgs);
                rawScore = (fgs * 3) - (misses * 1);
                break;

            case 'NFL_P':
                const punts = safeParseFloat(s.punts);
                rawScore = (punts * 1) + (games * 2);
                break;

            case 'NFL_FB':
                const ydsFB = safeParseFloat(s.rushingYards) + safeParseFloat(s.receivingYards);
                const tdsFB = safeParseFloat(s.rushingTouchdowns) + safeParseFloat(s.receivingTouchdowns);
                const recFB = safeParseFloat(s.receptions);
                rawScore = (games * 5) + (ydsFB * 1.0) + (recFB * 2.0) + (tdsFB * 10);
                break;

            case 'NFL_LS':
                const tklLS = safeParseFloat(s.tackles);
                rawScore = (games * 8) + (tklLS * 5);
                break;

            default:
                rawScore = games * 2.0;
        }

        // Add Special Teams Bonus to everyone
        rawScore += specialTeamsBonus;
    }

    return Math.max(0, rawScore); // Ensure non-negative
};

console.log('✅ Players data module loaded (Fixed version with security improvements)');