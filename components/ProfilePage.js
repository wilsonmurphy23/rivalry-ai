/* ====================================
   PROFILE PAGE (FINAL: SETTINGS + CLEAN UI)
   ==================================== */

const ProfilePage = ({ currentUser }) => {
    const [stats, setStats] = React.useState({ accuracy: 0, totalVotes: 0, totalDebates: 0 });
    const [recentVotes, setRecentVotes] = React.useState([]);
    const [myMatchups, setMyMatchups] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Settings State
    const [isEditing, setIsEditing] = React.useState(false);
    const [newUsername, setNewUsername] = React.useState(currentUser?.username || '');

    React.useEffect(() => {
        if (currentUser?.id) {
            loadProfileData();
        }
    }, [currentUser]);

    const loadProfileData = async () => {
        try {
            setLoading(true);
            const userId = currentUser.id;

            // 1. FETCH MY MATCHUPS
            const { data: created, error: createdError } = await window.supabase
                .from('matchups')
                .select('*')
                .eq('creator_id', userId)
                .order('created_at', { ascending: false });

            if (createdError) throw createdError;

            const enrichedCreated = created.map(m => enrichMatchup(m)).filter(Boolean);
            setMyMatchups(enrichedCreated);

            // 2. FETCH MY VOTES
            const { data: votes, error: votesError } = await window.supabase
                .from('votes')
                .select('*, matchups(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (votesError) throw votesError;

            let correctVotes = 0;
            votes.forEach(v => {
                const m = v.matchups;
                if (!m) return;
                const winner = m.votes_p1 >= m.votes_p2 ? 'player1' : 'player2';
                if (v.choice === winner) correctVotes++;
            });

            const accuracy = votes.length > 0 ? Math.round((correctVotes / votes.length) * 100) : 0;

            setStats({
                accuracy: accuracy,
                totalVotes: votes.length,
                totalDebates: created.length
            });

            const recent = votes.slice(0, 6).map(v => {
                const m = enrichMatchup(v.matchups);
                return m ? { ...m, myChoice: v.choice } : null;
            }).filter(Boolean);

            setRecentVotes(recent);

        } catch (err) {
            console.error("Profile load error:", err);
        } finally {
            setLoading(false);
        }
    };

    const enrichMatchup = (m) => {
        if (!m || !window.allPlayers) return null;
        const p1 = window.allPlayers.find(p => p.id === m.player1_id);
        const p2 = window.allPlayers.find(p => p.id === m.player2_id);
        if (!p1 || !p2) return null;
        return { ...m, player1: p1, player2: p2 };
    };

    // ✅ NEW: Add 'from=profile' so the app knows to show the "Back to Profile" button
    const goToMatchup = (id) => {
        window.location.href = `/?matchup=${id}&from=profile`;
    };

    // ✅ NEW: Logout Logic
    const handleLogout = async () => {
        await window.supabase.auth.signOut();
        window.location.reload();
    };

    // ✅ NEW: Update Username Logic
    const handleUpdateProfile = async () => {
        if (!newUsername.trim()) return;
        try {
            const { error } = await window.supabase
                .from('profiles')
                .update({ username: newUsername })
                .eq('id', currentUser.id);

            if (error) throw error;
            setIsEditing(false);
            window.location.reload(); // Reload to show changes
        } catch (err) {
            alert('Error updating profile');
        }
    };

    if (loading) {
        return (
            <div className="pt-32 flex justify-center">
                <div className="loading-spinner text-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="pt-24 pb-24 px-4 sm:px-6 min-h-screen max-w-4xl mx-auto">

            {/* 1. HEADER & SETTINGS */}
            <div className="text-center mb-8 relative">
                {/* Logout Button (Top Right) */}
                <button
                    onClick={handleLogout}
                    className="absolute top-0 right-0 text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full smooth"
                >
                    Log Out
                </button>

                <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-xl">
                    {currentUser.avatar || '👤'}
                </div>

                {isEditing ? (
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="bg-white/10 text-white px-3 py-1 rounded-lg outline-none border border-purple-500 w-40 text-center font-bold"
                        />
                        <button onClick={handleUpdateProfile} className="text-green-400"><Icon name="plus" size={20} /></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <h1 className="text-3xl font-black text-white">{currentUser.username}</h1>
                        <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-white"><Icon name="search" size={14} /></button>
                    </div>
                )}

                <div className="text-gray-400 text-sm font-bold tracking-wide">
                    RIVALRY ANALYST
                </div>
            </div>

            {/* 2. REAL STATS GRID */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="glass-strong rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-purple-400">{stats.accuracy}%</div>
                    <div className="text-gray-500 text-xs font-bold uppercase mt-1">Accuracy</div>
                </div>
                <div className="glass-strong rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-blue-400">{stats.totalDebates}</div>
                    <div className="text-gray-500 text-xs font-bold uppercase mt-1">Debates</div>
                </div>
                <div className="glass-strong rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-green-400">{stats.totalVotes}</div>
                    <div className="text-gray-500 text-xs font-bold uppercase mt-1">Votes</div>
                </div>
            </div>

            {/* 3. RECENT VOTES (2x3 Grid) */}
            {recentVotes.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-black text-white mb-4">Your Recent Votes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {recentVotes.map(m => (
                            <div
                                key={m.id}
                                onClick={() => goToMatchup(m.id)}
                                className="glass rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 smooth"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">
                                        {m.myChoice === 'player1' ? m.player1.image : m.player2.image}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">
                                            {m.myChoice === 'player1' ? m.player1.name : m.player2.name}
                                        </div>
                                        <div className="text-gray-500 text-[10px]">
                                            vs {m.myChoice === 'player1' ? m.player2.name : m.player1.name}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded ${(m.votes_p1 >= m.votes_p2 && m.myChoice === 'player1') ||
                                        (m.votes_p2 > m.votes_p1 && m.myChoice === 'player2')
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {(m.votes_p1 >= m.votes_p2 && m.myChoice === 'player1') ||
                                        (m.votes_p2 > m.votes_p1 && m.myChoice === 'player2')
                                        ? 'WINNING' : 'LOSING'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. MY RIVALS (Clean UI - No Rings) */}
            <div>
                <h2 className="text-xl font-black text-white mb-4">My Rivals</h2>
                {myMatchups.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                        <p className="text-gray-500 mb-4">You haven't created any debates yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {myMatchups.map(m => (
                            <div
                                key={m.id}
                                onClick={() => goToMatchup(m.id)}
                                className="glass-strong rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 smooth border border-transparent hover:border-purple-500/30"
                            >
                                <div className="flex items-center gap-4">
                                    {/* ✅ FIXED: Removed black rings/backgrounds */}
                                    <div className="flex items-center -space-x-2">
                                        <div className="text-2xl z-10">{m.player1.image}</div>
                                        <div className="text-2xl">{m.player2.image}</div>
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">
                                            {m.player1.name} <span className="text-gray-500 font-normal">vs</span> {m.player2.name}
                                        </div>
                                        <div className="text-gray-500 text-xs mt-0.5">
                                            {window.formatNumber(m.votes_p1 + m.votes_p2)} Votes • {window.getRelativeTime(m.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-400 hover:text-white">
                                    <Icon name="share" size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};