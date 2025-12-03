// debug_db.js
const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg';

async function testConnection() {
    console.log("🔍 Testing Database Connection...");

    const testPlayer = {
        id: "test-debug-1",
        name: "Debug Player",
        sport: "NBA",
        position: "G",
        era: "2020s",
        primary_era: "2020s",
        years_active: "2024",
        teams: ["Test Team"],
        image: "🐛",
        bio: "Test",
        stats: { ppg: 10 }
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(testPlayer)
    });

    const data = await response.json();

    if (!response.ok) {
        console.log("\n❌ DATABASE ERROR:");
        console.log("Status:", response.status);
        console.log("Message:", JSON.stringify(data, null, 2));
    } else {
        console.log("\n✅ SUCCESS! Write access confirmed.");
        console.log("Inserted:", data);
    }
}

testConnection();