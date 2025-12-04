/* ====================================
   AUTH PAGE COMPONENT (ACCESSIBILITY & UI OVERHAUL)
   ==================================== */

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = React.useState(true);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [successMsg, setSuccessMsg] = React.useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        if (loading) return; // Prevent double clicks

        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (isLogin) {
                // LOGIN
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                // Success! The app.js listener will handle the redirect.
                // We keep loading true so the UI doesn't flash back to the form.
            } else {
                // SIGN UP
                const { data, error } = await window.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username: username || email.split('@')[0] },
                        emailRedirectTo: window.location.origin
                    }
                });

                if (error) throw error;

                if (data.user && !data.session) {
                    setSuccessMsg('✅ Confirmation email sent! Please check your inbox.');
                    setLoading(false); // Stop loading so they can read the message
                }
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 gradient-animated">
            {/* UI/UX FIX: Changed from 'glass-strong' to a darker, more opaque background 
               (bg-black/80) to ensure high contrast against the animated background.
               Added shadow-2xl for depth.
            */}
            <div className="w-full max-w-md bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

                {/* Decorative top glow to maintain aesthetic without ruining contrast */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>

                <div className="text-center mb-8 mt-2">
                    <div className="text-6xl mb-4 filter drop-shadow-lg">🏆</div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Rivalry AI</h1>
                    <p className="text-gray-300 font-medium">The Ultimate Sports Debate Arena</p>
                </div>

                {/* ERROR MESSAGE - High Contrast Red */}
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-white p-4 rounded-xl mb-6 text-sm font-bold text-center shadow-lg">
                        ⚠️ {error}
                    </div>
                )}

                {/* SUCCESS MESSAGE - High Contrast Green */}
                {successMsg ? (
                    <div className="bg-green-900/50 border border-green-500 text-white p-6 rounded-xl mb-6 text-center fade-in shadow-lg">
                        <div className="text-4xl mb-2">📩</div>
                        <div className="font-bold text-lg">Check your Email</div>
                        <div className="text-sm mt-2 text-gray-200 leading-relaxed">{successMsg}</div>
                        <div className="text-xs mt-4 text-gray-400 font-semibold">
                            (Don't see it? Check spam. Click the link to finish!)
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleAuth} className="space-y-5">
                        {!isLogin && (
                            <div>
                                <label className="text-gray-300 text-xs font-bold ml-1 mb-1 block tracking-wider">USERNAME</label>
                                <div className="relative">
                                    <Icon name="user" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-black/70 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                                        placeholder="HoopsFan99"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-gray-300 text-xs font-bold ml-1 mb-1 block tracking-wider">EMAIL</label>
                            <div className="relative">
                                {/* SVG Mail Icon inline for better UX */}
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-black/70 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-gray-300 text-xs font-bold ml-1 mb-1 block tracking-wider">PASSWORD</label>
                            <div className="relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-black/70 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-xl font-black text-white text-lg shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale border border-white/10 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </span>
                            ) : (isLogin ? 'Enter Arena' : 'Join the Debate')}
                        </button>
                    </form>
                )}

                {!successMsg && (
                    <div className="mt-8 text-center pt-6 border-t border-white/10">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-gray-400 hover:text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 w-full group"
                        >
                            {isLogin ? (
                                <>
                                    <span>New here?</span>
                                    <span className="text-purple-400 group-hover:underline decoration-2 underline-offset-4">Create Account</span>
                                </>
                            ) : (
                                <>
                                    <span>Already have an account?</span>
                                    <span className="text-purple-400 group-hover:underline decoration-2 underline-offset-4">Sign In</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};