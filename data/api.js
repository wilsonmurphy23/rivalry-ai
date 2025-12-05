/* ====================================
   API INTEGRATION - CLAUDE AI (CONCISE MODE)
   ==================================== */

// Note: API Key is handled in server.py

// Get Claude AI analysis for a matchup
window.getClaudeAnalysis = async (player1, player2) => {
    try {
        console.log(`🤖 Getting Claude AI analysis: ${player1.name} vs ${player2.name}...`);

        // Format stats display (Includes Defense/Special Teams now)
        const formatStats = (player) => {
            const s = player.stats || {};
            if (player.sport === 'NBA') {
                return `2024 Stats: ${s.ppg} PPG, ${s.rpg} RPG, ${s.apg} APG, ${s.stl} STL, ${s.blk} BLK.`;
            } else {
                // NFL - Smart Stat String
                let parts = [];
                if (s.passingYards) parts.push(`${s.passingYards} pass yds, ${s.passingTouchdowns} TDs`);
                if (s.rushingYards) parts.push(`${s.rushingYards} rush yds, ${s.rushingTouchdowns} TDs`);
                if (s.receivingYards) parts.push(`${s.receivingYards} rec yds, ${s.receivingTouchdowns} TDs`);
                if (s.tackles) parts.push(`${s.tackles} tackles, ${s.sacks} sacks, ${s.defInterceptions} INTs`);
                if (s.fieldGoalsMade) parts.push(`${s.fieldGoalsMade} FGs made (Long: ${s.longFieldGoal})`);
                if (s.punts) parts.push(`${s.punts} punts (Avg: ${s.puntAvg})`);

                return `2024 Stats: ${parts.join(' | ') || 'No stats available'}`;
            }
        };

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{
                    role: 'user',
                    content: `Compare ${player1.name} (${player1.position}) and ${player2.name} (${player2.position}) based on these 2024 stats:

${player1.name}: ${formatStats(player1)}
${player2.name}: ${formatStats(player2)}

Instructions:
1. Be extremely concise (maximum 2-3 sentences).
2. No intro, no outro, no "folks", no "spicy matchup", no cheesy commentator style.
3. Directly compare their key stats and state who has the edge.
4. Keep it professional and direct.`
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Claude analysis received!', data);
        return data.content[0].text;

    } catch (error) {
        console.error('❌ Claude API error:', error);
        return `⚠️ Analysis unavailable: ${error.message}`;
    }
};

// Fallback analysis if API fails
const generateFallbackAnalysis = (player1, player2) => {
    return `${player1.name} vs ${player2.name} - Compare their 2025 stats above to see who has the edge.`;
};

console.log('Claude API module loaded (Concise Version)');