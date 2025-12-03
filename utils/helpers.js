/* ====================================
   UTILITY HELPER FUNCTIONS
   ==================================== */

// Format relative time
window.getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
};

// Format large numbers
window.formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

// Calculate vote percentage
window.getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
};

console.log('✅ Helper functions loaded');
