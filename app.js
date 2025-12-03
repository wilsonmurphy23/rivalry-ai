/* ====================================
   RIVALRY AI - MAIN APP (FINAL SCROLL FIX)
   ==================================== */

const { useState, useEffect, useRef, useMemo } = React;

const RivalryAI = () => {
    const [session, setSession] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    const [currentView, setCurrentView] = useState('feed');
    const [matchups, setMatchups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userVotes, setUserVotes] = useState({});
    const [userLikes, setUserLikes] = useState({});

    // Feed State
    const [feedFilter, setFeedFilter] = useState('all');
    const [feedSort, setFeedSort] = useState('new');

    // Create Page State
    const [selectedPlayer1, setSelectedPlayer1] = useState(null);
    const [selectedPlayer2, setSelectedPlayer2] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('nba');

    const feedRef = useRef(null);

    // ✅ FIXED: Auto-scroll to top when filters or view changes
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [feedFilter, feedSort, currentView]);

    // Initialization
    useEffect(() => {
        const initApp = async () => {
            console.log('🚀 Rivalry AI starting...');
            const { data: { session } } = await window.supabase.auth.getSession();
            setSession(session);

            if (session) {
                await loadUserProfile(session.user.id);
                await loadUserVotes(session.user.id);
                await loadUserLikes(session.user.id);
            }

            const { data: { subscription } } = window.supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                if (session) {
                    loadUserProfile(session.user.id);
                    loadUserVotes(session.user.id);
                    loadUserLikes(session.user.id);
                } else {
                    setCurrentUser(null);
                    setUserVotes({});
                    setUserLikes({});
                }
            });

            await window.loadRealPlayers();
            await loadRealMatchups();
            setLoading(false);
            return () => subscription.unsubscribe();
        };
        initApp();
    }, []);

    const loadUserProfile = async (userId) => {
        const { data } = await window.supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) setCurrentUser({ ...data, avatar: data.avatar_url || '👤', level: data.level || 1 });
    };

    const loadUserVotes = async (userId) => {
        const { data } = await window.supabase.from('votes').select('matchup_id, choice').eq('user_id', userId);
        if (data) {
            const votesMap = {};
            data.forEach(v => votesMap[v.matchup_id] = v.choice);
            setUserVotes(votesMap);
        }
    };

    const loadUserLikes = async (userId) => {
        const { data } = await window.supabase.from('likes').select('matchup_id').eq('user_id', userId);
        if (data) {
            const likesMap = {};
            data.forEach(l => likesMap[l.matchup_id] = true);
            setUserLikes(likesMap);
        }
    };

    const loadRealMatchups = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const sharedId = params.get('matchup');
            let query = window.supabase.from('matchups').select('*');

            if (sharedId) {
                console.log("🔗 Shared Link Detected!", sharedId);
                query = query.eq('id', sharedId);
            } else {
                query = query.order('created_at', { ascending: false }).limit(100);
            }

            const { data: dbMatchups, error } = await query;
            if (error) throw error;

            if (dbMatchups && window.allPlayers) {
                const enrichedMatchups = dbMatchups.map(m => {
                    const p1 = window.allPlayers.find(p => p.id === m.player1_id);
                    const p2 = window.allPlayers.find(p => p.id === m.player2_id);
                    if (!p1 || !p2) return null;
                    return {
                        ...m,
                        player1: p1,
                        player2: p2,
                        votes: { player1: m.votes_p1, player2: m.votes_p2 },
                        likes: m.likes || 0,
                        comments: m.comments_count || 0,
                        shares: m.shares || 0
                    };
                }).filter(Boolean);
                setMatchups(enrichedMatchups);
            }
        } catch (err) {
            console.error("Error loading matchups:", err);
        }
    };

    const processedMatchups = useMemo(() => {
        let result = [...matchups];
        if (feedFilter !== 'all') {
            result = result.filter(m => m.sport === feedFilter.toUpperCase());
        }
        result.sort((a, b) => {
            if (feedSort === 'hot') return b.likes - a.likes;
            if (feedSort === 'votes') return (b.votes.player1 + b.votes.player2) - (a.votes.player1 + a.votes.player2);
            return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
        });
        return result;
    }, [matchups, feedFilter, feedSort]);

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-black">
                <div className="loading-spinner text-purple-500"></div>
            </div>
        );
    }

    if (!session || !currentUser) {
        return <AuthPage onLogin={() => { }} />;
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 glass-strong z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg glow-purple">
                            <Icon name="trophy" size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black text-white">Rivalry AI</span>
                    </div>
                    <div
                        className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-lg cursor-pointer hover-scale smooth"
                        onClick={() => setCurrentView('profile')}
                    >
                        {currentUser.avatar}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {currentView === 'feed' && (
                <>
                    {!window.location.search.includes('matchup=') && (
                        <div className="fixed top-20 left-0 right-0 z-40 px-4 flex flex-col gap-3 pointer-events-none">
                            <div className="flex justify-between items-center w-full max-w-md mx-auto pointer-events-auto">
                                {/* Sport Filter */}
                                <div className="flex bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
                                    {['all', 'nba', 'nfl'].map(f => (
                                        <button key={f} onClick={() => setFeedFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold smooth ${feedFilter === f ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>{f === 'all' ? 'All' : f.toUpperCase()}</button>
                                    ))}
                                </div>
                                {/* Sort Filter */}
                                <div className="flex bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
                                    {[{ id: 'new', label: 'New' }, { id: 'hot', label: 'Hot 🔥' }, { id: 'votes', label: 'Top 🗳️' }].map(s => (
                                        <button key={s.id} onClick={() => setFeedSort(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold smooth ${feedSort === s.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>{s.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={feedRef} className="snap-container hide-scrollbar pt-32 pb-24 relative">
                        {/* Back Button */}
                        {window.location.search.includes('matchup=') && (
                            <div className="fixed top-28 left-0 right-0 z-[60] flex justify-center fade-in pointer-events-none">
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams(window.location.search);
                                        const isFromProfile = params.get('from') === 'profile';
                                        window.history.pushState({}, '', '/');
                                        if (isFromProfile) setCurrentView('profile');
                                        else window.location.reload();
                                    }}
                                    className="pointer-events-auto bg-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 smooth flex items-center gap-2 border border-purple-400/50"
                                >
                                    {new URLSearchParams(window.location.search).get('from') === 'profile' ? 'Back to Profile' : 'Back to Full Feed'}
                                </button>
                            </div>
                        )}

                        {processedMatchups.length === 0 ? (
                            <div className="h-screen flex flex-col items-center justify-center text-gray-500">
                                <p>No debates found.</p>
                                <button onClick={() => setCurrentView('create')} className="text-purple-400 font-bold mt-2">Create One!</button>
                            </div>
                        ) : (
                            processedMatchups.map((matchup) => (
                                <MatchupCard
                                    key={matchup.id}
                                    matchup={matchup}
                                    userVotes={userVotes}
                                    setUserVotes={setUserVotes}
                                    userLikes={userLikes}
                                    setUserLikes={setUserLikes}
                                    setMatchups={setMatchups}
                                    feedRef={feedRef}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {currentView === 'create' && (
                <CreatePage
                    allPlayers={window.allPlayers}
                    selectedPlayer1={selectedPlayer1}
                    setSelectedPlayer1={setSelectedPlayer1}
                    selectedPlayer2={selectedPlayer2}
                    setSelectedPlayer2={setSelectedPlayer2}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setMatchups={setMatchups}
                    setCurrentView={setCurrentView}
                />
            )}

            {currentView === 'players' && <PlayersPage allPlayers={window.allPlayers} />}
            {currentView === 'profile' && <ProfilePage currentUser={currentUser} userVotes={userVotes} matchups={matchups} />}
            <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RivalryAI />);