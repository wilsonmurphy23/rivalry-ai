/* ====================================
   BOTTOM NAVIGATION COMPONENT
   ==================================== */

const BottomNav = ({ currentView, setCurrentView }) => {
    const navItems = [
        { id: 'feed', icon: 'home', label: 'Feed' },
        { id: 'create', icon: 'plus', label: 'Create' },
        { id: 'players', icon: 'search', label: 'Players' }, // ✅ NEW ITEM
        { id: 'profile', icon: 'user', label: 'Profile' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 z-50">
            <div className="flex items-center justify-around px-6 py-3">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`flex flex-col items-center gap-1 smooth ${
                            currentView === item.id 
                                ? 'text-purple-500' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Icon 
                            name={item.icon} 
                            size={24} 
                            className={currentView === item.id ? 'drop-shadow-glow' : ''} 
                        />
                        <span className="text-xs font-bold">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

console.log('✅ BottomNav component loaded');
