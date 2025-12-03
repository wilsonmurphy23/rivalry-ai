/* ====================================
   TRENDING PAGE COMPONENT
   ==================================== */

const TrendingPage = ({ matchups }) => {
    const [filter, setFilter] = React.useState('all');
    const [sortBy, setSortBy] = React.useState('hot');

    const filteredMatchups = matchups
        .filter(m => {
            if (filter === 'nba') return m.player1.sport === 'NBA';
            if (filter === 'nfl') return m.player1.sport === 'NFL';
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'hot') return b.likes - a.likes;
            if (sortBy === 'votes') return (b.votes.player1 + b.votes.player2) - (a.votes.player1 + a.votes.player2);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

    return (
        <div className="pt-20 pb-24 px-6">
            <h1 className="text-3xl font-black text-white mb-6">🔥 Trending Debates</h1>

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full font-bold smooth ${
                        filter === 'all' ? 'bg-purple-600 text-white' : 'glass text-gray-400'
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('nba')}
                    className={`px-4 py-2 rounded-full font-bold smooth ${
                        filter === 'nba' ? 'bg-purple-600 text-white' : 'glass text-gray-400'
                    }`}
                >
                    🏀 NBA
                </button>
                <button
                    onClick={() => setFilter('nfl')}
                    className={`px-4 py-2 rounded-full font-bold smooth ${
                        filter === 'nfl' ? 'bg-purple-600 text-white' : 'glass text-gray-400'
                    }`}
                >
                    🏈 NFL
                </button>
            </div>

            {/* Sort */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => setSortBy('hot')}
                    className={`px-4 py-2 rounded-full text-sm font-bold smooth ${
                        sortBy === 'hot' ? 'bg-red-600 text-white' : 'glass text-gray-400'
                    }`}
                >
                    Hot
                </button>
                <button
                    onClick={() => setSortBy('votes')}
                    className={`px-4 py-2 rounded-full text-sm font-bold smooth ${
                        sortBy === 'votes' ? 'bg-blue-600 text-white' : 'glass text-gray-400'
                    }`}
                >
                    Most Voted
                </button>
                <button
                    onClick={() => setSortBy('new')}
                    className={`px-4 py-2 rounded-full text-sm font-bold smooth ${
                        sortBy === 'new' ? 'bg-green-600 text-white' : 'glass text-gray-400'
                    }`}
                >
                    New
                </button>
            </div>

            {/* Matchup List */}
            <div className="space-y-4">
                {filteredMatchups.map((matchup) => {
                    const totalVotes = matchup.votes.player1 + matchup.votes.player2;
                    return (
                        <div key={matchup.id} className="glass-strong rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{matchup.player1.image}</div>
                                    <div>
                                        <div className="text-white font-bold">{matchup.player1.name}</div>
                                        <div className="text-gray-400 text-sm">{matchup.player1.position}</div>
                                    </div>
                                </div>
                                <div className="text-white font-black text-xl">VS</div>
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="text-white font-bold text-right">{matchup.player2.name}</div>
                                        <div className="text-gray-400 text-sm text-right">{matchup.player2.position}</div>
                                    </div>
                                    <div className="text-2xl">{matchup.player2.image}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-gray-400 text-sm">
                                <div className="flex items-center gap-1">
                                    <Icon name="fire" size={16} />
                                    {window.formatNumber(matchup.likes)}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Icon name="messageCircle" size={16} />
                                    {window.formatNumber(matchup.comments)}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Icon name="user" size={16} />
                                    {window.formatNumber(totalVotes)} votes
                                </div>
                                <div className="ml-auto text-xs">
                                    {window.getRelativeTime(matchup.createdAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

console.log('✅ TrendingPage component loaded');
