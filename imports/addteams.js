// fixNFLTeams.js - Updates ONLY the team names for NFL players
// Usage: node fixNFLTeams.js

const BALLDONTLIE_API_KEY = '48f0f115-020e-4392-9a1e-67ffa6b426fc';
const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

const DELAY_MS = 1500; // Safe rate limit (40 req/min)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fixTeams() {
    console.log('🏈 Starting NFL Team Name Fixer...');
    console.log('   (Fetching from /players/active endpoint which has correct teams)');

    let cursor = 0;
    let hasMore = true;
    let totalUpdated = 0;

    while (hasMore) {
        try {
            // 1. Fetch Active Players (The source of truth for Teams)
            const url = `https://api.balldontlie.io/nfl/v1/players/active?per_page=100&cursor=${cursor}`;
            const response = await fetch(url, { headers: { 'Authorization': BALLDONTLIE_API_KEY } });

            if (response.status === 429) {
                console.log('⚠️ Rate Limit. Waiting 60s...');
                await sleep(60000);
                continue;
            }

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();

            // 2. Update Supabase
            // We use a loop to update players one by one or in small batches
            // Since we are only updating one field (teams), this is safe

            const updates = data.data.map(p => {
                const teamName = p.team ? p.team.full_name : 'Free Agent';

                // Only update if we have a valid ID and Team
                return {
                    id: `nfl-${p.id}`, // Match your ID format
                    teams: [teamName]  // Update the teams array
                };
            });

            // Send updates to Supabase
            for (const update of updates) {
                const { error } = await window_supabase_update(update);
                if (!error) totalUpdated++;
            }

            process.stdout.write(`+${updates.length} `);

            // Pagination
            cursor = data.meta?.next_cursor;
            if (!cursor) hasMore = false;

            await sleep(DELAY_MS);

        } catch (err) {
            console.error(`\n❌ Error: ${err.message}`);
            await sleep(5000);
        }
    }

    console.log(`\n\n✅ Team Fix Complete! Updated ${totalUpdated} players.`);
}

// Helper to perform the update
async function window_supabase_update(updateObj) {
    // We strictly update ONLY the 'teams' column to avoid overwriting stats
    return await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${updateObj.id}`, {
        method: 'PATCH', // PATCH = Update specific fields
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            teams: updateObj.teams
        })
    });
}

fixTeams();