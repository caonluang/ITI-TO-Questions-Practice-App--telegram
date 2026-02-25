import React, { useState, useEffect } from 'react';
import {
    getQuotaState,
    getMsUntilReset,
    formatTimeUntilReset,
    getRemainingPercent,
    getUsedPercent,
} from '../utils/quotaTracker';

const QuotaWidget = () => {
    const [quota, setQuota] = useState(getQuotaState());
    const [resetIn, setResetIn] = useState(getMsUntilReset());
    const [expanded, setExpanded] = useState(false);

    // Refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setQuota(getQuotaState());
            setResetIn(getMsUntilReset());
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Also refresh on storage changes (when API call is made from another tab)
    useEffect(() => {
        const onStorage = () => setQuota(getQuotaState());
        globalThis.addEventListener('storage', onStorage);
        return () => globalThis.removeEventListener('storage', onStorage);
    }, []);

    const remainingPct = getRemainingPercent(quota);
    const usedPct = getUsedPercent(quota);
    const remaining = quota.limit - quota.used;

    // Color based on remaining
    let barColor = '#f44336';
    if (remainingPct > 50) barColor = '#4caf50';
    else if (remainingPct > 20) barColor = '#ff9800';

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            setExpanded(prev => !prev);
        }
    };

    return (
        <div
            className={`quota-widget ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded(prev => !prev)}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            title="Groq Instructor API Quota"
        >
            {/* Compact view — always visible */}
            <div className="quota-compact">
                <span className="quota-icon">🔑</span>
                <div className="quota-mini-bar-wrap">
                    <div
                        className="quota-mini-bar-fill"
                        style={{ width: `${remainingPct}%`, background: barColor }}
                    />
                </div>
                <span className="quota-pct" style={{ color: barColor }}>
                    {remainingPct}%
                </span>
            </div>

            {/* Expanded view */}
            {expanded && (
                <div className="quota-details" onClick={e => e.stopPropagation()}>
                    <div className="quota-title">🤖 Groq Instructor Quota</div>

                    <div className="quota-bar-wrap">
                        <div
                            className="quota-bar-fill"
                            style={{ width: `${remainingPct}%`, background: barColor }}
                        />
                        <div
                            className="quota-bar-used"
                            style={{ left: `${remainingPct}%`, width: `${usedPct}%` }}
                        />
                    </div>

                    <div className="quota-stats">
                        <div className="quota-stat">
                            <span className="quota-stat-label">Bache</span>
                            <span className="quota-stat-val" style={{ color: barColor }}>
                                {remaining.toLocaleString()}
                            </span>
                        </div>
                        <div className="quota-stat">
                            <span className="quota-stat-label">Use kiye</span>
                            <span className="quota-stat-val">{quota.used.toLocaleString()}</span>
                        </div>
                        <div className="quota-stat">
                            <span className="quota-stat-label">Total</span>
                            <span className="quota-stat-val">{quota.limit.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="quota-reset">
                        ⏰ Reset hoga: <strong>{formatTimeUntilReset(resetIn)}</strong> mein
                    </div>

                    <div className="quota-note">
                        * Local counter (Groq API live quota nahi deta)
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotaWidget;
