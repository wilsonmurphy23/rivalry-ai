/* ====================================
   MATCHUP CARD (FIXED: DEFENSE STATS PRIORITY)
   ==================================== */

const MatchupCard = ({ matchup, userVotes, setUserVotes, userLikes, setUserLikes, setMatchups, feedRef }) => {
    // Stats Handling
    const votesP1 = matchup.votes_p1 || (matchup.votes ? matchup.votes.player1 : 0);
    const votesP2 = matchup.votes_p2 || (matchup.votes ? matchup.votes.player2 : 0);
    const totalVotes = votesP1 + votesP2;

    // State
    const [voted, setVoted] = React.useState(!!userVotes[matchup.id]);
    const [selectedPlayer, setSelectedPlayer] = React.useState(userVotes[matchup.id]);
    const [liked, setLiked] = React.useState(!!userLikes[matchup.id]);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const [analysis, setAnalysis] = React.useState('');

    // ✅ NEW: State for share feedback
    const [isCopied, setIsCopied] = React.useState(false);

    // Safe Player Objects
    const p1 = matchup.player1 || { name: 'Loading...', stats: {}, teams: [] };
    const p2 = matchup.player2 || { name: 'Loading...', stats: {}, teams: [] };

    // --- LOGIC ---
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
        } catch (err) { console.error("Vote failed:", err); }
    };

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
        } catch (err) { console.error("Like failed:", err); }
    };

    const handleShare = async () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('matchup', matchup.id);
            await navigator.clipboard.writeText(url.toString());

            // Trigger feedback state
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);

            await window.supabase.from('matchups').update({ shares: (matchup.shares || 0) + 1 }).eq('id', matchup.id);
        } catch (err) { console.error("Share failed", err); }
    };

    const getAIAnalysis = async () => {
        setIsAnalyzing(true);
        setShowModal(true);
        setAnalysis('');
        try {
            const result = await window.getClaudeAnalysis(p1, p2);
            setAnalysis(result);
        } catch (error) { setAnalysis('Error getting analysis.'); } finally { setIsAnalyzing(false); }
    };

    // Stats Renderer
    const renderStats = (player) => {
        const s = player.stats || {};
        const pos = player.position ? player.position.toUpperCase() : '';

        const Stat = ({ l, v }) => (
            <div className="flex flex-col min-w-[50px] mb-2">
                <span className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">{l}</span>
                <span className="text-white font-mono font-bold text-sm md:text-lg">{v}</span>
            </div>
        );

        const StatRow = ({ children }) => <div className="flex flex-wrap gap-x-4 gap-y-2">{children}</div>;

        if (player.sport === 'NBA') {
            return <StatRow>
                <Stat l="PPG" v={s.ppg} /><Stat l="RPG" v={s.rpg} /><Stat l="APG" v={s.apg} />
                <Stat l="STL" v={s.stl} /><Stat l="BLK" v={s.blk} /><Stat l="FG%" v={`${s.fgPct}%`} />
            </StatRow>;
        }

        if (pos.includes('QB') || pos.includes('QUARTERBACK')) {
            return <StatRow>
                <Stat l="Pass Yds" v={s.passingYards} /><Stat l="TDs" v={s.passingTouchdowns} /><Stat l="Ints" v={s.passingInts} />
                {parseFloat(s.rushingYards) > 50 && <Stat l="Rush Yds" v={s.rushingYards} />}
            </StatRow>;
        }

        // ✅ FIXED: Defense Check moved ABOVE Offense Check
        // Also added 'CORNERBACK' and 'SAFETY' explicitly to prevent false positive match on "RB" inside "CORNERBACK"
        if (['DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'CB', 'S', 'FS', 'SS', 'DB', 'DEFENSIVE', 'CORNERBACK', 'SAFETY'].some(r => pos.includes(r))) {
            return <StatRow>
                <Stat l="Tackles" v={s.tackles} />
                <Stat l="Sacks" v={s.sacks} />
                <Stat l="Ints" v={s.defInterceptions || s.interceptions || 0} />
                {parseFloat(s.passesDefended) > 0 && <Stat l="PD" v={s.passesDefended} />}
            </StatRow>;
        }

        if (['RB', 'FB', 'HB', 'WR', 'TE', 'SE', 'FL'].some(r => pos.includes(r))) {
            return <StatRow>
                <Stat l="Rush Yds" v={s.rushingYards || 0} />
                <Stat l="Rec Yds" v={s.receivingYards || 0} />
                <Stat l="Total TDs" v={(parseFloat(s.rushingTouchdowns) || 0) + (parseFloat(s.receivingTouchdowns) || 0)} />
                <Stat l="Rec" v={s.receptions || 0} />
            </StatRow>;
        }

        if (pos.includes('KICKER') || pos === 'K') {
            return <StatRow><Stat l="FGs" v={s.fieldGoalsMade} /><Stat l="Long" v={s.longFieldGoal} /></StatRow>;
        }
        if (pos.includes('PUNTER') || pos === 'P') {
            return <StatRow><Stat l="Punts" v={s.punts} /><Stat l="Avg" v={s.puntAvg} /></StatRow>;
        }

        return <StatRow><Stat l="Games" v={s.gamesPlayed} /></StatRow>;
    };

    return (
        <div className="snap-item h-[100dvh] w-full relative overflow-hidden bg-black">

            {/* --- IMMERSIVE BACKGROUND SPLIT --- */}
            <div className="absolute inset-0 flex flex-col md:flex-row z-0">
                {/* PLAYER 1 (LEFT) */}
                <button onClick={() => handleVote('player1')} disabled={voted} className={`relative flex-1 h-1/2 md:h-full group transition-all duration-500 overflow-hidden ${voted && selectedPlayer !== 'player1' ? 'grayscale opacity-30' : 'hover:flex-[1.2]'}`}>
                    <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-purple-900 via-purple-900/50 to-black z-0"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8 pb-32 md:pb-8">
                        <div className="text-8xl md:text-[150px] filter drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 mb-4">{p1.image}</div>
                        <h2 className="text-3xl md:text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg text-center leading-tight">{p1.name}</h2>
                        <div className="bg-purple-500/30 border border-purple-500/50 px-4 py-1 rounded-full text-purple-200 text-xs md:text-sm font-bold uppercase tracking-widest backdrop-blur-md mt-2">
                            {p1.teams?.[0] || 'Free Agent'}
                        </div>
                        <div className="text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 opacity-80">
                            {p1.position}
                        </div>
                    </div>
                </button>

                {/* VS BADGE */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)]"><span className="font-black text-2xl md:text-4xl italic text-black">VS</span></div>
                </div>

                {/* PLAYER 2 (RIGHT) */}
                <button onClick={() => handleVote('player2')} disabled={voted} className={`relative flex-1 h-1/2 md:h-full group transition-all duration-500 overflow-hidden ${voted && selectedPlayer !== 'player2' ? 'grayscale opacity-30' : 'hover:flex-[1.2]'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-blue-900 via-blue-900/50 to-black z-0"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8 pt-32 md:pt-8">
                        <div className="text-8xl md:text-[150px] filter drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 mb-4">{p2.image}</div>
                        <h2 className="text-3xl md:text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg text-center leading-tight">{p2.name}</h2>
                        <div className="bg-blue-500/30 border border-blue-500/50 px-4 py-1 rounded-full text-blue-200 text-xs md:text-sm font-bold uppercase tracking-widest backdrop-blur-md mt-2">
                            {p2.teams?.[0] || 'Free Agent'}
                        </div>
                        <div className="text-blue-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 opacity-80">
                            {p2.position}
                        </div>
                    </div>
                </button>
            </div>

            {/* --- THE "ACTION DECK" --- */}
            <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-out ${voted ? 'translate-y-0' : 'translate-y-full'}`}>

                <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-48 md:p-6 md:pb-28">
                    <div className="max-w-7xl mx-auto">

                        {/* Vote Bar */}
                        <div className="flex items-center gap-4 mb-4 md:mb-6">
                            <div className="text-purple-400 font-black text-2xl min-w-[3ch] text-right">{window.getVotePercentage(votesP1, totalVotes)}%</div>
                            <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 flex">
                                    <div style={{ width: `${window.getVotePercentage(votesP1, totalVotes)}%` }} className="bg-purple-600 h-full transition-all duration-1000"></div>
                                    <div style={{ width: `${window.getVotePercentage(votesP2, totalVotes)}%` }} className="bg-blue-600 h-full transition-all duration-1000"></div>
                                </div>
                            </div>
                            <div className="text-blue-400 font-black text-2xl min-w-[3ch]">{window.getVotePercentage(votesP2, totalVotes)}%</div>
                        </div>

                        {/* DESKTOP LAYOUT (3 Columns) */}
                        <div className="hidden md:grid grid-cols-3 gap-6 items-end">
                            <div className="flex flex-col items-end text-right border-r border-white/10 pr-6">
                                <div className="text-xs text-purple-400 font-bold uppercase mb-2">VOR {p1.eraAdjustedVOR}</div>
                                {renderStats(p1)}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={getAIAnalysis} disabled={isAnalyzing} className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:scale-105 smooth flex items-center justify-center gap-2 shadow-lg">
                                    {isAnalyzing ? <div className="loading-spinner w-4 h-4 border-black"></div> : <Icon name="zap" size={18} />}
                                    <span>{isAnalyzing ? 'Thinking...' : 'AI Analysis'}</span>
                                </button>

                                <button onClick={handleLike} className={`px-4 py-3 rounded-xl border-2 font-bold smooth flex items-center gap-1.5 ${liked ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-gray-600 text-gray-400 hover:border-white hover:text-white'}`}>
                                    <Icon name="heart" size={20} className={liked ? 'fill-current' : ''} />
                                    <span className="text-xs">{window.formatNumber(matchup.likes || 0)}</span>
                                </button>

                                <button onClick={() => setShowComments(true)} className="px-4 py-3 rounded-xl border-2 border-gray-600 text-gray-400 font-bold smooth hover:border-white hover:text-white flex items-center gap-1.5">
                                    <Icon name="messageCircle" size={20} />
                                    <span className="text-xs">{window.formatNumber(matchup.comments_count || 0)}</span>
                                </button>

                                <button onClick={handleShare} className="px-4 py-3 rounded-xl border-2 border-gray-600 text-gray-400 font-bold smooth hover:border-white hover:text-white flex items-center gap-1.5">
                                    {isCopied ? (
                                        <span className="text-green-400 text-xs font-black animate-pulse">COPIED!</span>
                                    ) : (
                                        <>
                                            <Icon name="share" size={20} />
                                            <span className="text-xs">{window.formatNumber(matchup.shares || 0)}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex flex-col items-start text-left border-l border-white/10 pl-6">
                                <div className="text-xs text-blue-400 font-bold uppercase mb-2">VOR {p2.eraAdjustedVOR}</div>
                                {renderStats(p2)}
                            </div>
                        </div>

                        {/* MOBILE LAYOUT (Stack) */}
                        <div className="md:hidden mt-2 space-y-4">
                            <div className="bg-white/5 p-3 rounded-lg border-l-2 border-purple-500">
                                <div className="text-[10px] text-purple-400 uppercase font-bold mb-2 flex justify-between">
                                    <span>{p1.name}</span>
                                    <span>VOR {p1.eraAdjustedVOR}</span>
                                </div>
                                {renderStats(p1)}
                            </div>

                            <div className="bg-white/5 p-3 rounded-lg border-l-2 border-blue-500">
                                <div className="text-[10px] text-blue-400 uppercase font-bold mb-2 flex justify-between">
                                    <span>{p2.name}</span>
                                    <span>VOR {p2.eraAdjustedVOR}</span>
                                </div>
                                {renderStats(p2)}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={getAIAnalysis} disabled={isAnalyzing} className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:scale-105 smooth flex items-center justify-center gap-2 shadow-lg">
                                    {isAnalyzing ? <div className="loading-spinner w-4 h-4 border-black"></div> : <Icon name="zap" size={18} />}
                                    <span>AI Analysis</span>
                                </button>

                                <button onClick={handleLike} className={`px-4 py-3 rounded-xl border-2 font-bold smooth flex items-center gap-1.5 ${liked ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-gray-600 text-gray-400 hover:border-white hover:text-white'}`}>
                                    <Icon name="heart" size={20} className={liked ? 'fill-current' : ''} />
                                    <span className="text-xs">{window.formatNumber(matchup.likes || 0)}</span>
                                </button>

                                <button onClick={() => setShowComments(true)} className="px-4 py-3 rounded-xl border-2 border-gray-600 text-gray-400 font-bold smooth hover:border-white hover:text-white flex items-center gap-1.5">
                                    <Icon name="messageCircle" size={20} />
                                    <span className="text-xs">{window.formatNumber(matchup.comments_count || 0)}</span>
                                </button>

                                <button onClick={handleShare} className="px-4 py-3 rounded-xl border-2 border-gray-600 text-gray-400 font-bold smooth hover:border-white hover:text-white flex items-center gap-1.5">
                                    {isCopied ? (
                                        <span className="text-green-400 text-xs font-black animate-pulse">COPIED!</span>
                                    ) : (
                                        <>
                                            <Icon name="share" size={20} />
                                            <span className="text-xs">{window.formatNumber(matchup.shares || 0)}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="h-24 w-full"></div>
                        </div>

                    </div>
                </div>
            </div>

            {/* AI Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 fade-in backdrop-blur-md bg-black/50" onClick={() => setShowModal(false)}>
                    <div className="glass-strong rounded-3xl p-8 max-w-2xl w-full scale-in border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-2"><Icon name="zap" className="text-yellow-400" /> AI Analysis</h2>
                            <button onClick={() => setShowModal(false)}><Icon name="x" size={24} className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="text-gray-200 leading-relaxed whitespace-pre-wrap font-medium text-lg">
                            {isAnalyzing ? 'Generating insight...' : analysis}
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