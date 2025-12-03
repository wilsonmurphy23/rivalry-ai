/* ====================================
   COMMENTS MODAL COMPONENT
   ==================================== */

const CommentsModal = ({ matchupId, onClose, onCommentAdded }) => {
    const [comments, setComments] = React.useState([]);
    const [newComment, setNewComment] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);

    // Load comments on open
    React.useEffect(() => {
        loadComments();
    }, [matchupId]);

    const loadComments = async () => {
        try {
            // Join with profiles to get username/avatar
            const { data, error } = await window.supabase
                .from('comments')
                .select('*, profiles(username, avatar_url)')
                .eq('matchup_id', matchupId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComments(data || []);
        } catch (err) {
            console.error("Error loading comments:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmitting(true);

        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) throw new Error("Must be logged in");

            // 1. Insert Comment
            const { data, error } = await window.supabase
                .from('comments')
                .insert({
                    matchup_id: matchupId,
                    user_id: user.id,
                    content: newComment.trim()
                })
                .select('*, profiles(username, avatar_url)') // Return joined data immediately
                .single();

            if (error) throw error;

            // 2. Update UI
            setComments([data, ...comments]);
            setNewComment('');

            // 3. Update Parent Counter
            if (onCommentAdded) onCommentAdded();

            // 4. Update Matchup Counter in DB
            await window.supabase.rpc('increment_comments', { row_id: matchupId });
            // Fallback manual update if RPC missing
            await window.supabase
                .from('matchups')
                .update({ comments_count: comments.length + 1 })
                .eq('id', matchupId);

        } catch (err) {
            console.error("Comment failed:", err);
            alert("Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 fade-in"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={onClose}
        >
            <div
                className="glass-strong w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 h-[80vh] flex flex-col slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-white">Discussion</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
                        <Icon name="x" size={24} />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10">
                            <div className="loading-spinner mb-2"></div>
                            <div className="text-gray-500 text-sm">Loading thoughts...</div>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            No comments yet. Be the first!
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="glass rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs">
                                        {comment.profiles?.avatar_url || '👤'}
                                    </div>
                                    <span className="text-xs font-bold text-purple-300">
                                        {comment.profiles?.username || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {window.getRelativeTime(comment.created_at)}
                                    </span>
                                </div>
                                <p className="text-white text-sm leading-relaxed">{comment.content}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Share your take..."
                        className="w-full glass rounded-xl pl-4 pr-12 py-3 text-white outline-none focus:border-purple-500 border border-transparent transition-all"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-400 hover:text-white disabled:opacity-50"
                    >
                        <Icon name="zap" size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};