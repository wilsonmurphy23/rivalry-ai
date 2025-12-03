/* ====================================
   MATCHUP CARD (FINAL: CLEAN UI + 2025)
   ==================================== */

const MatchupCard = ({ matchup, userVotes, setUserVotes, userLikes, setUserLikes, setMatchups, feedRef }) => {
    // Stats Handling
    const votesP1 = matchup.votes_p1 || (matchup.votes ? matchup.votes.player1 : 0);
    const votesP2 = matchup.votes_p2 || (matchup.votes ? matchup.votes.player2 : 0);
    const totalVotes = votesP1 + votesP2;

    // State
    const [voted, setVoted] = React.useState(!!userVotes[matchup.id]);
    const [selectedPlayer, setSelectedPlayer] = React.useState(userVotes[matchup.id]);
    const [showStats, setShowStats] = React.useState(false);
    const [liked, setLiked] = React.useState(!!userLikes[matchup.id]);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const [analysis, setAnalysis] = React.useState('');

    // Safe Player Objects
    const p1 = matchup.player1 || { name: 'Loading...', stats: {}, teams: [] };
    const p2 = matchup.player2 || { name: 'Loading...', stats: {}, teams: [] };

    // --- VOTING LOGIC ---
    const handleVote = async (choice) => {
        if (voted) return;

        setSelectedPlayer(choice);
        setVoted(true);
        setUserVotes({ ...userVotes, [matchup.id]: choice });

        const isP1 = choice === 'player1';
        setMatchups(prev => prev.map(m => m.id === matchup.id ? {
            ...m,
            votes_p1: votesP1 + (isP1 ? 1 : 0),
            votes_p2: votesP2 + (!isP1 ? 1 : 0)
        } : m));

        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            await window.supabase.from('votes').insert({ user_id: user.id, matchup_id: matchup.id, choice: choice });

            const updateField = isP1 ? 'votes_p1' : 'votes_p2';
            await window.supabase.from('matchups').update({ [updateField]: (isP1 ? votesP1 : votesP2) + 1 }).eq('id', matchup.id);
        } catch (err) {
            console.error("Vote failed:", err);
        }
    };

    // --- LIKE LOGIC ---
    const handleLike = async () => {
        const isLiking = !liked;
        setLiked(isLiking);
        setUserLikes({ ...userLikes, [matchup.id]: isLiking });

        setMatchups(prev => prev.map(m => m.id === matchup.id ? { ...m, likes: (m.likes || 0) + (isLiking ? 1 : -1) } : m));

        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;

            if (isLiking) {
                await window.supabase.from('likes').insert({ user_id: user.id, matchup_id: matchup.id });
                await window.supabase.from('matchups').update({ likes: (matchup.likes || 0) + 1 }).eq('id', matchup.id);
            } else {
                await window.supabase.from('likes').delete().eq('user_id', user.id).eq('matchup_id', matchup.id);
                await window.supabase.from('matchups').update({ likes: Math.max(0, (matchup.likes || 0) - 1) }).eq('id', matchup.id);
            }
        } catch (err) {
            console.error("Like failed:", err);
        }
    };

    // --- SHARE LOGIC ---
    const handleShare = async () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('matchup', matchup.id);

            // Clean Share Text (No Emojis)
            await navigator.clipboard.writeText(url.toString());

            const btn = document.getElementById(`share-${matchup.id}`);
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<span class="text-green-500 font-bold">Copied!</span>';
                setTimeout(() => btn.innerHTML = originalHTML, 2000);
            }

            await window.supabase.from('matchups').update({ shares: (matchup.shares || 0) + 1 }).eq('id', matchup.id);
        } catch (err) {
            console.error("Share failed", err);
        }
    };

    // --- AI ANALYSIS ---
    const getAIAnalysis = async () => {
        setIsAnalyzing(true);
        setShowModal(true);
        setAnalysis('');

        try {
            const result = await window.getClaudeAnalysis(p1, p2);
            setAnalysis(result);
        } catch (error) {
            setAnalysis('Error getting analysis.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ✅ FIXED: BRIGHTER, LARGER, ALWAYS VISIBLE STATS
    const renderStats = (player) => {
        const s = player.stats || {};
        const pos = player.position ? player.position.toUpperCase() : '';

        // --- NBA ---
        if (player.sport === 'NBA') {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.ppg} PPG</div>
                    <div className="text-gray-300 text-sm mb-1">{s.rpg} RPG / {s.apg} APG</div>
                    <div className="text-gray-300 text-sm mb-1">{s.stl} STL / {s.blk} BLK</div>
                    <div className="text-gray-400 text-sm">{s.fgPct}% FG</div>
                </>
            );
        }

        // --- NFL ---

        // 1. QUARTERBACKS
        if (pos.includes('QUARTERBACK') || pos === 'QB') {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.passingYards} Pass Yds</div>
                    <div className="text-gray-300 text-sm mb-1">{s.passingTouchdowns} TDs / {s.passingInts} INT</div>
                    {parseFloat(s.rushingYards) > 50 && <div className="text-gray-300 text-sm">{s.rushingYards} Rush Yds</div>}
                </>
            );
        }

        // 2. BALL CARRIERS
        if (pos.includes('RUNNING BACK') || pos.includes('FULLBACK') || ['RB', 'FB', 'HB'].includes(pos)) {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.rushingYards} Rush Yds</div>
                    <div className="text-gray-300 text-sm mb-1">{(parseFloat(s.rushingTouchdowns) || 0) + (parseFloat(s.receivingTouchdowns) || 0)} Total TDs</div>
                    {parseFloat(s.receivingYards) > 0 && <div className="text-gray-400 text-sm">{s.receivingYards} Rec Yds</div>}
                </>
            );
        }

        // 3. RECEIVERS
        if (pos.includes('WIDE RECEIVER') || pos.includes('TIGHT END') || ['WR', 'TE', 'SE', 'FL'].includes(pos)) {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.receivingYards} Rec Yds</div>
                    <div className="text-gray-300 text-sm mb-1">{s.receivingTouchdowns} TDs</div>
                    <div className="text-gray-400 text-sm">{s.receptions} Rec</div>
                </>
            );
        }

        // 4. DEFENSE
        if (pos.includes('DEFENSIVE') || pos.includes('LINEBACKER') || pos.includes('CORNERBACK') || pos.includes('SAFETY') ||
            ['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'CB', 'S', 'FS', 'SS', 'DB'].includes(pos)) {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.tackles} Tackles</div>
                    <div className="text-gray-300 text-sm mb-1">
                        {s.sacks} Sacks / {s.defInterceptions || s.interceptions} INTs
                    </div>
                    {parseFloat(s.passesDefended) > 0 && <div className="text-gray-400 text-sm">{s.passesDefended} PD</div>}
                </>
            );
        }

        // 5. KICKERS
        if (pos.includes('KICKER') || pos === 'K') {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.fieldGoalsMade} FGs</div>
                    <div className="text-gray-300 text-sm">Long: {s.longFieldGoal}</div>
                </>
            );
        }

        // 6. PUNTERS
        if (pos.includes('PUNTER') || pos === 'P') {
            return (
                <>
                    <div className="text-white text-sm font-bold mb-1">{s.punts} Punts</div>
                    <div className="text-gray-300 text-sm">Avg: {s.puntAvg}</div>
                </>
            );
        }

        // Default
        return (
            <>
                <div className="text-white text-sm font-bold mb-1">{s.gamesPlayed} Games</div>
                <div className="text-gray-400 text-xs uppercase">{player.position}</div>
            </>
        );
    };

    return (
        <div className="snap-item h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Player Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Player 1 */}
                    <button
                        onClick={() => handleVote('player1')}
                        disabled={voted}
                        className={`glass-strong rounded-3xl p-6 smooth flex flex-col items-center text-center ${voted ? selectedPlayer === 'player1' ? 'border-2 border-purple-500 glow-purple' : 'opacity-50' : 'hover:border-purple-500/50 hover-scale cursor-pointer'}`}
                    >
                        <div className="text-5xl mb-3">{p1.image}</div>
                        <div className="text-white font-bold text-lg leading-tight mb-1">{p1.name}</div>

                        <div className="text-gray-300 text-xs font-semibold mb-1">
                            {p1.teams && p1.teams[0] ? p1.teams[0] : 'Free Agent'}
                        </div>

                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-3">
                            {p1.position}
                        </div>

                        {/* VOR Badge */}
                        <div className={`glass rounded-full px-3 py-1 inline-block mb-2 smooth ${voted ? 'bg-purple-500/20' : 'bg-gray-700/50'}`}>
                            <div className={`text-xs font-bold ${voted ? 'text-purple-400' : 'text-gray-400'}`}>
                                {voted ? `VOR ${p1.eraAdjustedVOR || '??'}` : 'VOR 🔒'}
                            </div>
                        </div>

                        {voted && <div className="mt-2 text-2xl font-bold text-purple-400">{window.getVotePercentage(votesP1, totalVotes)}%</div>}
                    </button>

                    {/* Player 2 */}
                    <button
                        onClick={() => handleVote('player2')}
                        disabled={voted}
                        className={`glass-strong rounded-3xl p-6 smooth flex flex-col items-center text-center ${voted ? selectedPlayer === 'player2' ? 'border-2 border-blue-500 glow-blue' : 'opacity-50' : 'hover:border-blue-500/50 hover-scale cursor-pointer'}`}
                    >
                        <div className="text-5xl mb-3">{p2.image}</div>
                        <div className="text-white font-bold text-lg leading-tight mb-1">{p2.name}</div>

                        <div className="text-gray-300 text-xs font-semibold mb-1">
                            {p2.teams && p2.teams[0] ? p2.teams[0] : 'Free Agent'}
                        </div>

                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-3">
                            {p2.position}
                        </div>

                        {/* VOR Badge */}
                        <div className={`glass rounded-full px-3 py-1 inline-block mb-2 smooth ${voted ? 'bg-blue-500/20' : 'bg-gray-700/50'}`}>
                            <div className={`text-xs font-bold ${voted ? 'text-blue-400' : 'text-gray-400'}`}>
                                {voted ? `VOR ${p2.eraAdjustedVOR || '??'}` : 'VOR 🔒'}
                            </div>
                        </div>

                        {voted && <div className="mt-2 text-2xl font-bold text-blue-400">{window.getVotePercentage(votesP2, totalVotes)}%</div>}
                    </button>
                </div>

                {/* LOCKED CONTENT: Placeholder for Stats/AI */}
                {!voted ? (
                    <button disabled className="w-full glass-strong rounded-2xl p-4 mb-4 text-gray-500 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                        Stats 🔒
                    </button>
                ) : (
                    /* UNLOCKED CONTENT */
                    <div className="fade-in">
                        {/* Stats Toggle */}
                        <button onClick={() => setShowStats(!showStats)} className="w-full glass-strong rounded-2xl p-4 mb-4 text-white font-bold smooth hover:bg-white/10 flex items-center justify-center gap-2">
                            <Icon name="zap" size={20} /> {showStats ? 'Hide' : 'View'} 2025 Stats
                        </button>

                        {/* Stats Details */}
                        {showStats && (
                            <div className="slide-up glass-strong rounded-2xl p-6 mb-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="text-center">
                                        <div className="text-purple-400 font-bold mb-3">{p1.name}</div>
                                        {renderStats(p1)}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-blue-400 font-bold mb-3">{p2.name}</div>
                                        {renderStats(p2)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Analysis */}
                        <button onClick={getAIAnalysis} disabled={isAnalyzing} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 mb-4 text-white font-bold smooth hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 hover-scale">
                            <Icon name="zap" size={20} /> {isAnalyzing ? 'Analyzing...' : 'Get AI Analysis'}
                        </button>
                    </div>
                )}

                {/* Social Actions (Always Visible) */}
                <div className="flex items-center justify-around glass-strong rounded-2xl p-4">
                    <button onClick={handleLike} className={`flex items-center gap-2 smooth ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                        <Icon name="heart" size={24} /> <span className="font-bold">{window.formatNumber(matchup.likes || 0)}</span>
                    </button>

                    <button onClick={() => setShowComments(true)} className="flex items-center gap-2 text-gray-400 hover:text-blue-500 smooth">
                        <Icon name="messageCircle" size={24} /> <span className="font-bold">{window.formatNumber(matchup.comments_count || 0)}</span>
                    </button>

                    <button id={`share-${matchup.id}`} onClick={handleShare} className="flex items-center gap-2 text-gray-400 hover:text-green-500 smooth">
                        <Icon name="share" size={24} /> <span className="font-bold">{window.formatNumber(matchup.shares || 0)}</span>
                    </button>
                </div>

                {/* Info */}
                <div className="text-center mt-4">
                    <div className="text-gray-500 text-sm">{window.formatNumber(totalVotes)} votes • {window.getRelativeTime(matchup.created_at || matchup.createdAt)}</div>
                </div>
            </div>

            {/* AI Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0, 0, 0, 0.8)' }} onClick={() => setShowModal(false)}>
                    <div className="glass-strong rounded-3xl p-8 max-w-2xl w-full scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white">AI Analysis</h2>
                            <button onClick={() => setShowModal(false)}><Icon name="x" size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="glass rounded-2xl p-6 text-white leading-relaxed whitespace-pre-wrap">
                            {isAnalyzing ? 'Analyzing...' : analysis}
                        </div>
                    </div>
                </div>
            )}

            {/* Comments Modal */}
            {showComments && (
                <CommentsModal
                    matchupId={matchup.id}
                    onClose={() => setShowComments(false)}
                    onCommentAdded={() => {
                        setMatchups(prev => prev.map(m => m.id === matchup.id ? { ...m, comments_count: (m.comments_count || 0) + 1 } : m));
                    }}
                />
            )}
        </div>
    );
};