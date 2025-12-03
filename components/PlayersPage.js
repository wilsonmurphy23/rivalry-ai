/* ====================================
   PLAYERS PAGE (FIXED FILTERS)
   ==================================== */

const PlayersPage = ({ allPlayers }) => {
    const [sport, setSport] = React.useState('NBA');
    const [viewMode, setViewMode] = React.useState('list');
    const [selectedTeam, setSelectedTeam] = React.useState(null);
    const [search, setSearch] = React.useState('');
    const [sortBy, setSortBy] = React.useState('vor');
    const [positionFilter, setPositionFilter] = React.useState('all');
    const [selectedPlayer, setSelectedPlayer] = React.useState(null);
    const [displayLimit, setDisplayLimit] = React.useState(50);

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
            if (sortBy === 'vor') return b.eraAdjustedVOR - a.eraAdjustedVOR;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return 0;
        });
    }, [sportPlayers, selectedTeam, search, positionFilter, sortBy]);

    // ✅ FIXED: RESET FILTERS ON SPORT SWITCH
    const switchSport = (newSport) => {
        setSport(newSport);
        setSelectedTeam(null);
        setViewMode('list');
        setDisplayLimit(50);
        setPositionFilter('all'); // Reset position filter
    };

    const formatKey = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    return (
        <div className="pt-24 pb-24 px-4 sm:px-6 min-h-screen max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Player Database</h1>
                    <p className="text-gray-400 text-sm mt-1">{selectedTeam ? `Viewing ${selectedTeam} Roster` : `Browsing ${sportPlayers.length} Players`}</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => switchSport('NBA')} className={`flex-1 md:w-32 py-2 rounded-lg font-bold text-sm smooth ${sport === 'NBA' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>NBA</button>
                    <button onClick={() => switchSport('NFL')} className={`flex-1 md:w-32 py-2 rounded-lg font-bold text-sm smooth ${sport === 'NFL' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>NFL</button>
                </div>
            </div>

            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button onClick={() => setViewMode('list')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${viewMode === 'list' && !selectedTeam ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>All Players</button>
                <button onClick={() => { setViewMode('teams'); setSelectedTeam(null); }} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${viewMode === 'teams' || selectedTeam ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Browse by Team</button>
            </div>

            {viewMode === 'teams' && !selectedTeam && (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">{uniqueTeams.map(team => (<button key={team} onClick={() => { setSelectedTeam(team); setViewMode('list'); }} className="glass-strong p-6 rounded-2xl text-left hover:bg-white/10 smooth hover:scale-[1.02] group"><div className="text-2xl mb-2 group-hover:scale-110 smooth origin-left">{sport === 'NBA' ? '🏀' : '🏈'}</div><div className="font-bold text-white group-hover:text-purple-400 smooth">{team}</div><div className="text-xs text-gray-500 mt-1">View Roster →</div></button>))}</div>)}

            {(viewMode === 'list' || selectedTeam) && (<div className="animate-fade-in"><div className="flex flex-col md:flex-row gap-3 mb-6">{selectedTeam && (<button onClick={() => { setSelectedTeam(null); setViewMode('teams'); }} className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 smooth"><Icon name="chevronDown" className="rotate-90" size={16} />Back</button>)}<div className="relative flex-1"><Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder={`Search ${selectedTeam || 'players'}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full glass rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-purple-500 border border-transparent transition-all" /></div><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="glass rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer hover:bg-white/5"><option value="vor" className="text-black">Sort: Highest VOR</option><option value="name" className="text-black">Sort: Name</option></select><select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="glass rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer hover:bg-white/5"><option value="all" className="text-black">All Positions</option>{uniquePositions.map(pos => (<option key={pos} value={pos} className="text-black">{pos}</option>))}</select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredPlayers.slice(0, displayLimit).map(player => (<div key={player.id} onClick={() => setSelectedPlayer(player)} className="glass-strong rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 smooth border border-transparent hover:border-white/10 active:scale-[0.99]"><div className="flex items-center gap-4"><div className="w-12 h-12 flex items-center justify-center text-3xl">{player.image}</div><div><div className="text-white font-bold text-lg leading-tight">{player.name}</div><div className="text-gray-400 text-xs mt-1 flex items-center gap-2"><span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">{player.position}</span><span>{player.teams[0] || 'Free Agent'}</span></div></div></div><div className="text-right"><div className={`text-xl font-black ${player.eraAdjustedVOR >= 90 ? 'text-yellow-400' : player.eraAdjustedVOR >= 80 ? 'text-purple-400' : 'text-gray-500'}`}>{player.eraAdjustedVOR}</div><div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">VOR</div></div></div>))}</div>{filteredPlayers.length > displayLimit && (<button onClick={() => setDisplayLimit(prev => prev + 50)} className="w-full py-6 text-gray-500 font-bold hover:text-white smooth text-sm mt-4">Load More Players ({filteredPlayers.length - displayLimit} remaining)</button>)}</div>)}

            {selectedPlayer && (<div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 fade-in backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.8)' }} onClick={() => setSelectedPlayer(null)}><div className="glass-strong w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl p-0 h-[85vh] flex flex-col slide-up overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}><div className="p-6 bg-gradient-to-b from-white/5 to-transparent border-b border-white/10 text-center relative"><button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"><Icon name="x" size={24} /></button><div className="text-6xl mb-4 filter drop-shadow-lg transform hover:scale-110 transition-transform duration-300">{selectedPlayer.image}</div><h2 className="text-2xl font-black text-white mb-1">{selectedPlayer.name}</h2><div className="flex justify-center gap-2 text-sm text-gray-300 mb-4"><span>{selectedPlayer.teams[0]}</span><span className="text-gray-600">•</span><span className="font-bold">{selectedPlayer.position}</span></div><div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30"><span className="text-purple-300 font-bold text-sm">VOR Rating</span><span className="text-white font-black text-lg">{selectedPlayer.eraAdjustedVOR}</span></div></div><div className="flex-1 overflow-y-auto custom-scrollbar p-6"><h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">2025 Season Stats</h3><div className="grid grid-cols-2 gap-3">{Object.entries(selectedPlayer.stats).map(([key, value]) => { if (value == 0 || value == "0.0") return null; return (<div key={key} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors"><div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 truncate">{formatKey(key)}</div><div className="text-white font-mono font-bold text-lg">{value}</div></div>); })}</div></div></div></div>)}
        </div>
    );
};