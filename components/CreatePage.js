/* ====================================
   CREATE PAGE (DUPLICATE DETECTION & REVIVAL)
   ==================================== */

const CreatePage = ({
    allPlayers,
    selectedPlayer1,
    setSelectedPlayer1,
    selectedPlayer2,
    setSelectedPlayer2,
    setMatchups,
    setCurrentView
}) => {
    const [sport, setSport] = React.useState('NBA');
    const [viewMode, setViewMode] = React.useState('list');
    const [selectedTeam, setSelectedTeam] = React.useState(null);
    const [search, setSearch] = React.useState('');
    const [sortBy, setSortBy] = React.useState('name');
    const [positionFilter, setPositionFilter] = React.useState('all');
    const [displayLimit, setDisplayLimit] = React.useState(50);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // ✅ NEW: State for Duplicate Detection Modal
    const [existingMatchup, setExistingMatchup] = React.useState(null);

    const sportPlayers = React.useMemo(() => {
        return allPlayers.filter(p => p.sport === sport);
    }, [allPlayers, sport]);

    const { uniqueTeams, uniquePositions } = React.useMemo(() => {
        const teams = new Set();
        const positions = new Set();

        sportPlayers.forEach(p => {
            if (p.teams && p.teams[0]) teams.add(p.teams[0]);
            if (p.position) positions.add(p.position);
        });

        return {
            uniqueTeams: Array.from(teams).sort(),
            uniquePositions: Array.from(positions).sort()
        };
    }, [sportPlayers]);

    const filteredPlayers = React.useMemo(() => {
        let result = sportPlayers;
        if (selectedTeam) result = result.filter(p => p.teams.includes(selectedTeam));
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(q));
        }
        if (positionFilter !== 'all') result = result.filter(p => p.position === positionFilter);
        return result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'team') return (a.teams[0] || '').localeCompare(b.teams[0] || '');
            return 0;
        });
    }, [sportPlayers, selectedTeam, search, positionFilter, sortBy]);

    const switchSport = (newSport) => {
        setSport(newSport);
        setSelectedTeam(null);
        setViewMode('list');
        setDisplayLimit(50);
        setPositionFilter('all');
        setSelectedPlayer1(null);
        setSelectedPlayer2(null);
    };

    const handlePlayerClick = (player) => {
        if (selectedPlayer1?.id === player.id) {
            setSelectedPlayer1(null);
        } else if (selectedPlayer2?.id === player.id) {
            setSelectedPlayer2(null);
        } else if (!selectedPlayer1) {
            setSelectedPlayer1(player);
        } else {
            setSelectedPlayer2(player);
        }
    };

    // ✅ NEW: Smart Creation Logic
    const handleLaunchDebate = async () => {
        if (!selectedPlayer1 || !selectedPlayer2) return;
        setIsSubmitting(true);

        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in");

            // 1. CHECK FOR DUPLICATES
            // We fetch any matchup involving Player 1, then filter in JS to be safe/fast
            const { data: existingData, error: searchError } = await window.supabase
                .from('matchups')
                .select('*')
                .or(`player1_id.eq.${selectedPlayer1.id},player2_id.eq.${selectedPlayer1.id}`);

            if (searchError) throw searchError;

            // Find specific pair (Order doesn't matter: A vs B == B vs A)
            const duplicate = existingData.find(m =>
                (m.player1_id === selectedPlayer1.id && m.player2_id === selectedPlayer2.id) ||
                (m.player1_id === selectedPlayer2.id && m.player2_id === selectedPlayer1.id)
            );

            if (duplicate) {
                // DUPLICATE FOUND: Trigger Modal
                setExistingMatchup(duplicate);
                setIsSubmitting(false); // Stop spinner
                return;
            }

            // 2. NO DUPLICATE: Create New
            const newMatchup = {
                creator_id: user.id,
                player1_id: selectedPlayer1.id,
                player2_id: selectedPlayer2.id,
                sport: selectedPlayer1.sport,
                votes_p1: 0,
                votes_p2: 0
            };

            const { data, error } = await window.supabase.from('matchups').insert(newMatchup).select().single();
            if (error) throw error;

            const completeMatchup = enrichMatchup(data);
            setMatchups(prev => [completeMatchup, ...prev]);

            resetAndRedirect();

        } catch (err) {
            console.error("Error creating matchup:", err);
            alert("Failed to create debate: " + err.message);
            setIsSubmitting(false);
        }
    };

    // ✅ NEW: Revive Logic
    const reviveMatchup = async () => {
        if (!existingMatchup) return;
        setIsSubmitting(true);

        try {
            // 1. Update timestamp in DB to bring it to top of "New"
            const { data, error } = await window.supabase
                .from('matchups')
                .update({ created_at: new Date().toISOString() })
                .eq('id', existingMatchup.id)
                .select()
                .single();

            if (error) throw error;

            // 2. Update Local State (Remove old instance, add new to top)
            const completeMatchup = enrichMatchup(data);

            setMatchups(prev => {
                const filtered = prev.filter(m => m.id !== existingMatchup.id);
                return [completeMatchup, ...filtered];
            });

            resetAndRedirect();

        } catch (err) {
            console.error("Error reviving matchup:", err);
            alert("Failed to revive debate.");
            setIsSubmitting(false);
        }
    };

    // Helper to format matchup for local state
    const enrichMatchup = (data) => ({
        ...data,
        player1: selectedPlayer1.id === data.player1_id ? selectedPlayer1 : selectedPlayer2,
        player2: selectedPlayer2.id === data.player2_id ? selectedPlayer2 : selectedPlayer1,
        votes: { player1: data.votes_p1, player2: data.votes_p2 },
        comments: data.comments_count || 0,
        shares: data.shares || 0,
        likes: data.likes || 0
    });

    const resetAndRedirect = () => {
        setSelectedPlayer1(null);
        setSelectedPlayer2(null);
        setExistingMatchup(null);
        setIsSubmitting(false);
        setCurrentView('feed');
        // Scroll feed to top to see new item
        setTimeout(() => {
            const feed = document.querySelector('.snap-container');
            if (feed) feed.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="pt-24 pb-24 px-4 sm:px-6 min-h-screen max-w-7xl mx-auto relative">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Create Debate</h1>
                    <p className="text-gray-400 text-sm mt-1">Select two players to face off</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => switchSport('NBA')}
                        className={`flex-1 md:w-32 py-2 rounded-lg font-bold text-sm smooth ${sport === 'NBA' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        NBA
                    </button>
                    <button
                        onClick={() => switchSport('NFL')}
                        className={`flex-1 md:w-32 py-2 rounded-lg font-bold text-sm smooth ${sport === 'NFL' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        NFL
                    </button>
                </div>
            </div>

            {/* PREVIEW SLOTS */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div onClick={() => setSelectedPlayer1(null)} className={`relative rounded-2xl p-6 text-center smooth border-2 cursor-pointer ${selectedPlayer1 ? 'bg-purple-900/20 border-purple-500 shadow-purple' : 'bg-white/5 border-dashed border-white/10 hover:bg-white/10'}`}>
                    {selectedPlayer1 ? (<><div className="text-4xl mb-2">{selectedPlayer1.image}</div><div className="font-bold text-white">{selectedPlayer1.name}</div><div className="text-xs text-purple-300 font-bold mt-1">PLAYER 1</div></>) : (<div className="py-4 text-gray-500 font-bold text-sm">Select Player 1</div>)}
                </div>
                <div onClick={() => setSelectedPlayer2(null)} className={`relative rounded-2xl p-6 text-center smooth border-2 cursor-pointer ${selectedPlayer2 ? 'bg-blue-900/20 border-blue-500 shadow-blue' : 'bg-white/5 border-dashed border-white/10 hover:bg-white/10'}`}>
                    {selectedPlayer2 ? (<><div className="text-4xl mb-2">{selectedPlayer2.image}</div><div className="font-bold text-white">{selectedPlayer2.name}</div><div className="text-xs text-blue-300 font-bold mt-1">PLAYER 2</div></>) : (<div className="py-4 text-gray-500 font-bold text-sm">Select Player 2</div>)}
                </div>
            </div>

            {selectedPlayer1 && selectedPlayer2 && (
                <button
                    onClick={handleLaunchDebate}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl py-4 text-white font-black text-lg smooth hover-scale disabled:opacity-50 mb-8 shadow-lg"
                >
                    {isSubmitting ? 'Checking Arena...' : '⚔️ Launch Debate'}
                </button>
            )}

            {/* FILTERS */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button onClick={() => setViewMode('list')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${viewMode === 'list' && !selectedTeam ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>All Players</button>
                <button onClick={() => { setViewMode('teams'); setSelectedTeam(null); }} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${viewMode === 'teams' || selectedTeam ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Browse by Team</button>
            </div>

            {viewMode === 'teams' && !selectedTeam && (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">{uniqueTeams.map(team => (<button key={team} onClick={() => { setSelectedTeam(team); setViewMode('list'); }} className="glass-strong p-6 rounded-2xl text-left hover:bg-white/10 smooth hover:scale-[1.02] group"><div className="text-2xl mb-2 group-hover:scale-110 smooth origin-left">{sport === 'NBA' ? '🏀' : '🏈'}</div><div className="font-bold text-white group-hover:text-purple-400 smooth">{team}</div><div className="text-xs text-gray-500 mt-1">View Roster →</div></button>))}</div>)}

            {(viewMode === 'list' || selectedTeam) && (<div className="animate-fade-in"><div className="flex flex-col md:flex-row gap-3 mb-6">{selectedTeam && (<button onClick={() => { setSelectedTeam(null); setViewMode('teams'); }} className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 smooth"><Icon name="chevronDown" className="rotate-90" size={16} />Back</button>)}<div className="relative flex-1"><Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder={`Search ${selectedTeam || 'players'}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full glass rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-purple-500 border border-transparent transition-all" /></div><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="glass rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer hover:bg-white/5"><option value="name" className="text-black">Sort: Name</option><option value="team" className="text-black">Sort: Team</option></select><select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="glass rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer hover:bg-white/5"><option value="all" className="text-black">All Positions</option>{uniquePositions.map(pos => (<option key={pos} value={pos} className="text-black">{pos}</option>))}</select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredPlayers.slice(0, displayLimit).map(player => { const isP1 = selectedPlayer1?.id === player.id; const isP2 = selectedPlayer2?.id === player.id; return (<div key={player.id} onClick={() => handlePlayerClick(player)} className={`glass-strong rounded-xl p-4 flex items-center justify-between cursor-pointer smooth border ${isP1 ? 'border-purple-500 bg-purple-500/10' : isP2 ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-white/10'}`}><div className="flex items-center gap-4"><div className="w-12 h-12 flex items-center justify-center text-3xl">{player.image}</div><div><div className="text-white font-bold text-lg leading-tight">{player.name}</div><div className="text-gray-400 text-xs mt-1 flex items-center gap-2"><span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">{player.position}</span><span>{player.teams[0] || 'Free Agent'}</span></div></div></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isP1 || isP2 ? 'border-white bg-white text-black' : 'border-gray-600'}`}>{(isP1 || isP2) && <Icon name="plus" size={14} className="rotate-45" />}</div></div>); })}</div>{filteredPlayers.length > displayLimit && (<button onClick={() => setDisplayLimit(prev => prev + 50)} className="w-full py-6 text-gray-500 font-bold hover:text-white smooth text-sm mt-4">Load More Players ({filteredPlayers.length - displayLimit} remaining)</button>)}</div>)}

            {/* ✅ DUPLICATE MATCHUP MODAL */}
            {existingMatchup && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 fade-in backdrop-blur-md bg-black/60" onClick={() => setExistingMatchup(null)}>
                    <div className="glass-strong rounded-3xl p-8 max-w-md w-full scale-in text-center border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Icon name="zap" size={40} className="text-purple-400" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2">Rivalry Exists!</h2>
                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                            This debate is already raging in the arena. We'll bring it to the top of the feed for you.
                        </p>

                        <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/10">
                            <div className="flex items-center justify-center gap-4 text-xl font-bold text-white">
                                <span>{selectedPlayer1.name}</span>
                                <span className="text-gray-500 text-sm">VS</span>
                                <span>{selectedPlayer2.name}</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                                {window.formatNumber(existingMatchup.votes_p1 + existingMatchup.votes_p2)} Total Votes
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setExistingMatchup(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/10 smooth"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={reviveMatchup}
                                disabled={isSubmitting}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-xl font-black text-white shadow-lg hover:scale-105 smooth flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Reviving...' : '🔥 Revive Debate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};