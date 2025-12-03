/* ====================================
   CREATE PAGE (REDESIGNED: GRID + TEAMS - NO STATS)
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
    // Local State for Filters (Matches PlayersPage logic)
    const [sport, setSport] = React.useState('NBA');
    const [viewMode, setViewMode] = React.useState('list'); // 'list' or 'teams'
    const [selectedTeam, setSelectedTeam] = React.useState(null);

    const [search, setSearch] = React.useState('');
    const [sortBy, setSortBy] = React.useState('name'); // 'name' only (VOR hidden)
    const [positionFilter, setPositionFilter] = React.useState('all');
    const [displayLimit, setDisplayLimit] = React.useState(50);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // 1. Extract Data based on Sport
    const sportPlayers = React.useMemo(() => {
        return allPlayers.filter(p => p.sport === sport);
    }, [allPlayers, sport]);

    // 2. Extract Unique Teams & Positions
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

    // 3. Filter Logic
    const filteredPlayers = React.useMemo(() => {
        let result = sportPlayers;

        if (selectedTeam) {
            result = result.filter(p => p.teams.includes(selectedTeam));
        }

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(q));
        }

        if (positionFilter !== 'all') {
            result = result.filter(p => p.position === positionFilter);
        }

        return result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'team') return (a.teams[0] || '').localeCompare(b.teams[0] || '');
            return 0;
        });
    }, [sportPlayers, selectedTeam, search, positionFilter, sortBy]);

    // Helper to switch sports
    const switchSport = (newSport) => {
        setSport(newSport);
        setSelectedTeam(null);
        setViewMode('list');
        setDisplayLimit(50);
        // Optional: Clear selections when switching sports? 
        // Left commented out to allow Cross-Sport debates if desired
        // setSelectedPlayer1(null); 
        // setSelectedPlayer2(null);
    };

    // Handle Card Click
    const handlePlayerClick = (player) => {
        if (selectedPlayer1?.id === player.id) {
            setSelectedPlayer1(null); // Deselect P1
        } else if (selectedPlayer2?.id === player.id) {
            setSelectedPlayer2(null); // Deselect P2
        } else if (!selectedPlayer1) {
            setSelectedPlayer1(player); // Select P1
        } else {
            setSelectedPlayer2(player); // Select P2
        }
    };

    const createMatchup = async () => {
        if (!selectedPlayer1 || !selectedPlayer2) return;
        setIsSubmitting(true);

        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in");

            const newMatchup = {
                creator_id: user.id,
                player1_id: selectedPlayer1.id,
                player2_id: selectedPlayer2.id,
                sport: selectedPlayer1.sport, // Default to P1 sport
                votes_p1: 0,
                votes_p2: 0
            };

            const { data, error } = await window.supabase
                .from('matchups')
                .insert(newMatchup)
                .select()
                .single();

            if (error) throw error;

            const completeMatchup = {
                ...data,
                player1: selectedPlayer1,
                player2: selectedPlayer2,
                votes: { player1: 0, player2: 0 },
                comments: 0,
                shares: 0,
                likes: 0
            };

            setMatchups(prev => [completeMatchup, ...prev]);

            // Reset
            setSelectedPlayer1(null);
            setSelectedPlayer2(null);
            setCurrentView('feed');

        } catch (err) {
            console.error("Error creating matchup:", err);
            alert("Failed to create debate: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pt-24 pb-24 px-4 sm:px-6 min-h-screen max-w-7xl mx-auto">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Create Debate</h1>
                    <p className="text-gray-400 text-sm mt-1">Select two players to face off</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => switchSport('NBA')}
                        className={`flex-1 md:w-32 py-2 rounded-lg font-bold text-sm smooth ${sport === 'NBA' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        NBA
                    </button>
                    <button
                        onClick={() => switchSport('NFL')}
                        className={`flex-1 md:w-32 py-2 rounded-lg font-bold text-sm smooth ${sport === 'NFL' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        NFL
                    </button>
                </div>
            </div>

            {/* SELECTED PLAYERS PREVIEW (Sticky or prominent) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Slot 1 */}
                <div
                    onClick={() => setSelectedPlayer1(null)}
                    className={`relative rounded-2xl p-6 text-center smooth border-2 cursor-pointer ${selectedPlayer1
                        ? 'bg-purple-900/20 border-purple-500 shadow-purple'
                        : 'bg-white/5 border-dashed border-white/10 hover:bg-white/10'
                        }`}
                >
                    {selectedPlayer1 ? (
                        <>
                            <div className="text-4xl mb-2">{selectedPlayer1.image}</div>
                            <div className="font-bold text-white">{selectedPlayer1.name}</div>
                            <div className="text-xs text-purple-300 font-bold mt-1">PLAYER 1</div>
                        </>
                    ) : (
                        <div className="py-4 text-gray-500 font-bold text-sm">Select Player 1</div>
                    )}
                </div>

                {/* Slot 2 */}
                <div
                    onClick={() => setSelectedPlayer2(null)}
                    className={`relative rounded-2xl p-6 text-center smooth border-2 cursor-pointer ${selectedPlayer2
                        ? 'bg-blue-900/20 border-blue-500 shadow-blue'
                        : 'bg-white/5 border-dashed border-white/10 hover:bg-white/10'
                        }`}
                >
                    {selectedPlayer2 ? (
                        <>
                            <div className="text-4xl mb-2">{selectedPlayer2.image}</div>
                            <div className="font-bold text-white">{selectedPlayer2.name}</div>
                            <div className="text-xs text-blue-300 font-bold mt-1">PLAYER 2</div>
                        </>
                    ) : (
                        <div className="py-4 text-gray-500 font-bold text-sm">Select Player 2</div>
                    )}
                </div>
            </div>

            {/* CREATE BUTTON (Only shows when both selected) */}
            {selectedPlayer1 && selectedPlayer2 && (
                <button
                    onClick={createMatchup}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl py-4 text-white font-black text-lg smooth hover-scale disabled:opacity-50 mb-8 shadow-lg"
                >
                    {isSubmitting ? 'Creating Debate...' : '⚔️ Launch Debate'}
                </button>
            )}

            {/* NAVIGATION TABS */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button
                    onClick={() => setViewMode('list')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${viewMode === 'list' && !selectedTeam
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                >
                    All Players
                </button>
                <button
                    onClick={() => { setViewMode('teams'); setSelectedTeam(null); }}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${viewMode === 'teams' || selectedTeam
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                >
                    Browse by Team
                </button>
            </div>

            {/* VIEW 1: TEAMS GRID */}
            {viewMode === 'teams' && !selectedTeam && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                    {uniqueTeams.map(team => (
                        <button
                            key={team}
                            onClick={() => { setSelectedTeam(team); setViewMode('list'); }}
                            className="glass-strong p-6 rounded-2xl text-left hover:bg-white/10 smooth hover:scale-[1.02] group"
                        >
                            <div className="text-2xl mb-2 group-hover:scale-110 smooth origin-left">
                                {sport === 'NBA' ? '🏀' : '🏈'}
                            </div>
                            <div className="font-bold text-white group-hover:text-purple-400 smooth">
                                {team}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">View Roster →</div>
                        </button>
                    ))}
                </div>
            )}

            {/* VIEW 2: PLAYER SELECTION GRID */}
            {(viewMode === 'list' || selectedTeam) && (
                <div className="animate-fade-in">

                    {/* Filter Bar */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                        {selectedTeam && (
                            <button
                                onClick={() => { setSelectedTeam(null); setViewMode('teams'); }}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 smooth"
                            >
                                <Icon name="chevronDown" className="rotate-90" size={16} />
                                Back
                            </button>
                        )}

                        <div className="relative flex-1">
                            <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${selectedTeam || 'players'}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full glass rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-purple-500 border border-transparent transition-all"
                            />
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="glass rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer hover:bg-white/5"
                        >
                            <option value="name" className="text-black">Sort: Name</option>
                            <option value="team" className="text-black">Sort: Team</option>
                        </select>

                        <select
                            value={positionFilter}
                            onChange={(e) => setPositionFilter(e.target.value)}
                            className="glass rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer hover:bg-white/5"
                        >
                            <option value="all" className="text-black">All Positions</option>
                            {uniquePositions.map(pos => (
                                <option key={pos} value={pos} className="text-black">{pos}</option>
                            ))}
                        </select>
                    </div>

                    {/* PLAYERS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPlayers.slice(0, displayLimit).map(player => {
                            const isP1 = selectedPlayer1?.id === player.id;
                            const isP2 = selectedPlayer2?.id === player.id;

                            return (
                                <div
                                    key={player.id}
                                    onClick={() => handlePlayerClick(player)}
                                    className={`glass-strong rounded-xl p-4 flex items-center justify-between cursor-pointer smooth border ${isP1 ? 'border-purple-500 bg-purple-500/10' :
                                        isP2 ? 'border-blue-500 bg-blue-500/10' :
                                            'border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 flex items-center justify-center text-3xl">
                                            {player.image}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-lg leading-tight">{player.name}</div>
                                            <div className="text-gray-400 text-xs mt-1 flex items-center gap-2">
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">
                                                    {player.position}
                                                </span>
                                                <span>{player.teams[0] || 'Free Agent'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selection Checkbox */}
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isP1 || isP2 ? 'border-white bg-white text-black' : 'border-gray-600'
                                        }`}>
                                        {(isP1 || isP2) && <Icon name="plus" size={14} className="rotate-45" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load More */}
                    {filteredPlayers.length > displayLimit && (
                        <button
                            onClick={() => setDisplayLimit(prev => prev + 50)}
                            className="w-full py-6 text-gray-500 font-bold hover:text-white smooth text-sm mt-4"
                        >
                            Load More Players ({filteredPlayers.length - displayLimit} remaining)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};