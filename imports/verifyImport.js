// verifyImport.js - Verify all players imported correctly with stats

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mjg0MTcsImV4cCI6MjA4MDIwNDQxN30.1N4lPvAnFKHN_rIlAPfBmx9m5D_3FFso9BQ74NIF6_0';

async function verifyImport() {
    console.log('🔍 Verifying player import...\n');

    try {
        // Fetch all players from Supabase
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/players?select=*&order=sport,name`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            console.log('❌ Failed to fetch players from Supabase');
            return;
        }

        const players = await response.json();

        console.log(`📦 Total players in database: ${players.length}\n`);

        // Separate by sport
        const nbaPlayers = players.filter(p => p.sport === 'NBA');
        const nflPlayers = players.filter(p => p.sport === 'NFL');

        console.log(`🏀 NBA Players: ${nbaPlayers.length}`);
        console.log(`🏈 NFL Players: ${nflPlayers.length}\n`);

        // Check NBA players
        console.log('═'.repeat(80));
        console.log('🏀 NBA PLAYERS VERIFICATION');
        console.log('═'.repeat(80));

        let nbaWithStats = 0;
        let nbaWithoutStats = 0;

        nbaPlayers.forEach(player => {
            const stats = player.stats || {};
            const hasStats = stats.ppg > 0 || stats.rpg > 0 || stats.apg > 0;

            if (hasStats) {
                nbaWithStats++;
                // console.log(`✅ ${player.name.padEnd(25)} | PPG: ${stats.ppg || 0} | RPG: ${stats.rpg || 0} | APG: ${stats.apg || 0}`);
            } else {
                nbaWithoutStats++;
                console.log(`❌ ${player.name.padEnd(25)} | NO STATS`);
            }
        });

        console.log('\n' + '─'.repeat(80));
        console.log(`NBA Summary: ${nbaWithStats} with stats, ${nbaWithoutStats} without stats\n`);

        // Check NFL players
        console.log('═'.repeat(80));
        console.log('🏈 NFL PLAYERS VERIFICATION');
        console.log('═'.repeat(80));

        let nflWithStats = 0;
        let nflWithoutStats = 0;

        nflPlayers.forEach(player => {
            const stats = player.stats || {};
            const hasStats = stats.passingYards > 0 || stats.rushingYards > 0 || stats.receivingYards > 0 || stats.receptions > 0;

            if (hasStats) {
                nflWithStats++;
                const statDisplay = [];
                if (stats.passingYards > 0) statDisplay.push(`Pass: ${stats.passingYards} yds`);
                if (stats.rushingYards > 0) statDisplay.push(`Rush: ${stats.rushingYards} yds`);
                if (stats.receivingYards > 0) statDisplay.push(`Rec: ${stats.receivingYards} yds`);

                // console.log(`✅ ${player.name.padEnd(25)} | ${statDisplay.join(' | ')}`);
            } else {
                nflWithoutStats++;
                console.log(`❌ ${player.name.padEnd(25)} | NO STATS`);
            }
        });

        console.log('\n' + '─'.repeat(80));
        console.log(`NFL Summary: ${nflWithStats} with stats, ${nflWithoutStats} without stats\n`);

        // Overall summary
        console.log('═'.repeat(80));
        console.log('📊 OVERALL SUMMARY');
        console.log('═'.repeat(80));
        console.log(`Total Players: ${players.length}`);
        console.log(`Players with Stats: ${nbaWithStats + nflWithStats}`);
        console.log(`Players without Stats: ${nbaWithoutStats + nflWithoutStats}`);

        if (nbaWithoutStats === 0 && nflWithoutStats === 0) {
            console.log('\n✅ SUCCESS! All players have stats! 🎉');
        } else {
            console.log(`\n⚠️  WARNING: ${nbaWithoutStats + nflWithoutStats} players are missing stats`);
        }

        // Check for required fields
        console.log('\n' + '═'.repeat(80));
        console.log('🔍 FIELD VALIDATION');
        console.log('═'.repeat(80));

        let missingFields = 0;

        players.forEach(player => {
            const issues = [];

            if (!player.name) issues.push('name');
            if (!player.sport) issues.push('sport');
            if (!player.position) issues.push('position');
            if (!player.teams || player.teams.length === 0) issues.push('teams');
            if (!player.bio) issues.push('bio');
            if (!player.stats || Object.keys(player.stats).length === 0) issues.push('stats');

            if (issues.length > 0) {
                missingFields++;
                console.log(`⚠️  ${player.name}: Missing ${issues.join(', ')}`);
            }
        });

        if (missingFields === 0) {
            console.log('✅ All players have required fields!');
        } else {
            console.log(`⚠️  ${missingFields} players have missing fields`);
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

verifyImport();