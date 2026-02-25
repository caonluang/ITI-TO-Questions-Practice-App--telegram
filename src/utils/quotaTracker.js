// quotaTracker.js — Local API call counter (DeepSeek doesn't expose quota via API)
// Tracks calls per day, resets at midnight (IST/local time).

const QUOTA_KEY = 'geminiQuotaData';

// DeepSeek: adjust based on your plan's daily limit
// Lower this if you want to be more conservative
const DAILY_LIMIT = 1500;

const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const loadData = () => {
    try {
        const raw = localStorage.getItem(QUOTA_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const saveData = (data) => {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(data));
};

// Get current quota state — resets if day has changed
export const getQuotaState = () => {
    const today = getTodayKey();
    const data = loadData();

    if (!data || data.date !== today) {
        // New day — reset counter
        const fresh = { date: today, used: 0, limit: DAILY_LIMIT };
        saveData(fresh);
        return fresh;
    }
    return { ...data, limit: DAILY_LIMIT };
};

// Record one API call
export const recordApiCall = () => {
    const state = getQuotaState();
    state.used = (state.used || 0) + 1;
    saveData(state);
    return state;
};

// Returns ms until next midnight (local time)
export const getMsUntilReset = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight
    return midnight.getTime() - now.getTime();
};

// Format ms into human-readable "Xh Ym"
export const formatTimeUntilReset = (ms) => {
    if (ms <= 0) return '0m';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

// Percentage used (0-100)
export const getUsedPercent = (state) => {
    return Math.min(100, Math.round((state.used / state.limit) * 100));
};

// Percentage remaining (0-100)
export const getRemainingPercent = (state) => {
    return Math.max(0, 100 - getUsedPercent(state));
};
