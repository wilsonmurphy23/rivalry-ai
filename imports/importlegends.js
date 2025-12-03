// importLegends.js - Imports Legends with PRIME stats (not 2024 stats)

const BALLDONTLIE_API_KEY = '48f0f115-020e-4392-9a1e-67ffa6b426fc';
const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

// 1. PASTE YOUR IDs FROM find.js HERE
const NBA_LEGENDS = [
    // Example format: { id: 123, name: "Michael Jordan" },
    // PASTE HERE...
];

const NFL_LEGENDS = [
    // PASTE HERE...
];

// 2. PRIME YEAR LOOKUP TABLE
// This maps players to their best statistical season
const PRIME_SEASONS = {
    // NBA
    'Michael Jordan': 1989, 'Kobe Bryant': 2005, 'Shaquille O\'Neal': 1999,
    'Magic Johnson': 1986, 'Larry Bird': 1984, 'Kareem Abdul-Jabbar': 1975,
    'Wilt Chamberlain': 1961, 'Bill Russell': 1961, 'Hakeem Olajuwon': 1993,
    'Tim Duncan': 2001, 'Kevin Garnett': 2003, 'Dirk Nowitzki': 2006,
    'Allen Iverson': 2000, 'Steve Nash': 2005, 'Dwyane Wade': 2008,
    'Charles Barkley': 1992, 'Karl Malone': 1996, 'John Stockton': 1990,
    // NFL
    'Tom Brady': 2007, 'Peyton Manning': 2013, 'Joe Montana': 1989,
    'Dan Marino': 1984, 'Brett Favre': 1996, 'Aaron Rodgers': 2011,
    'Jerry Rice': 1995, 'Randy Moss': 2007, 'Terrell Owens': 2001,
    'Barry Sanders': 1997, 'Walter Payton': 1977, 'LaDainian Tomlinson': 2006,
    'Lawrence Taylor': 1986, 'Ray Lewis': 2000, 'Adrian Peterson': 2012
};

async function importLegend(player, sport) {
    // Default to a generic "Prime" year if not in list
    // NBA data only goes back to ~1979 reliably in some APIs, but let's try
    let season = PRIME_SEASONS[player.name] || (sport === 'nba' ? 1995 : 2000);

    console.log(`Processing ${player.name} (Season ${season})...`);

    try {
        // 1. Get Player Profile
        const profileRes = await fetch(
            `https://api.balldontlie.io/${sport}/v1/players/${player.id}`,
            { headers: { 'Authorization': BALLDONTLIE_API_KEY } }
        );
        const profile = (await profileRes.json()).data;

        // 2. Get Prime Stats
        const statsRes = await fetch(
            `https://api.balldontlie.io/${sport}/v1/season_averages?season=${season}&player_id=${player.id}`,
            { headers: { 'Authorization': BALLDONTLIE_API_KEY } }
        );
        const statsData = await statsRes.json();
        const stats = statsData.data && statsData.data[0];

        if (!stats) {
            console.log(`⚠️ No stats found for ${player.name} in ${season}`);
            return;
        }

        // 3. Construct Object
        const playerObj = {
            id: `${sport}-legend-${player.id}`,
            name: player.name,
            nickname: '',
            sport: sport.toUpperCase(),
            position: profile.position || profile.position_abbreviation || 'Legend',
            era: 'Legend',
            primary_era: String(Math.floor(season / 10) * 10) + 's', // e.g. "1990s"
            years_active: 'Retired',
            teams: [profile.team ? profile.team.full_name : 'Legend'],
            image: sport === 'nba' ? '👑' : '🦅',
            bio: `${sport.toUpperCase()} Legend. Prime Season: ${season}.`,
            stats: sport === 'nba' ? {
                ppg: stats.pts.toFixed(1),
                rpg: stats.reb.toFixed(1),
                apg: stats.ast.toFixed(1),
                gamesPlayed: stats.games_played
            } : {
                passingYards: stats.passing_yards || 0,
                rushingYards: stats.rushing_yards || 0,
                receivingYards: stats.receiving_yards || 0,
                touchdowns: (stats.passing_touchdowns || 0) + (stats.rushing_touchdowns || 0)
            }
        };

        // 4. Save
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

        console.log(`✅ Saved ${player.name}`);

    } catch (e) {
        console.log(`❌ Error ${player.name}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 1100));
}

async function main() {
    console.log('👑 IMPORTING LEGENDS...\n');

    // Check if user pasted data
    if (NBA_LEGENDS.length === 0 && NFL_LEGENDS.length === 0) {
        console.log('⚠️  PLEASE PASTE IDs FROM find.js INTO THIS FILE FIRST!');
        return;
    }

    for (const p of NBA_LEGENDS) await importLegend(p, 'nba');
    for (const p of NFL_LEGENDS) await importLegend(p, 'nfl');

    console.log('\n✅ Legends Import Complete!');
}

main();