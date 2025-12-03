/* ====================================
   AUTH PAGE COMPONENT (FIXED UI/UX)
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
            <div className="w-full max-w-md glass-strong rounded-3xl p-8">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🏆</div>
                    <h1 className="text-3xl font-black text-white mb-2">Rivalry AI</h1>
                    <p className="text-gray-400">The Ultimate Sports Debate Arena</p>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl mb-6 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                {/* SUCCESS MESSAGE (Fixed: No Bounce, Better Spacing) */}
                {successMsg ? (
                    <div className="bg-green-500/20 border border-green-500 text-green-200 p-6 rounded-xl mb-6 text-center fade-in">
                        <div className="text-4xl mb-2">📩</div>
                        <div className="font-bold text-lg">Check your Email</div>
                        <div className="text-sm mt-2 opacity-80 leading-relaxed">{successMsg}</div>
                        <div className="text-xs mt-4 text-gray-400">
                            (Don't see it? Check spam. Click the link to finish!)
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="text-gray-400 text-xs font-bold ml-4 mb-1 block">USERNAME</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 border-2 border-transparent transition-all"
                                    placeholder="HoopsFan99"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-gray-400 text-xs font-bold ml-4 mb-1 block">EMAIL</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full glass rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 border-2 border-transparent transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-gray-400 text-xs font-bold ml-4 mb-1 block">PASSWORD</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full glass rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 border-2 border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Enter Arena' : 'Join the Debate')}
                        </button>
                    </form>
                )}

                {!successMsg && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-gray-400 hover:text-white font-bold text-sm transition-colors"
                        >
                            {isLogin ? "New here? Create Account" : "Already have an account? Sign In"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};