import React from 'react';
import PropTypes from 'prop-types';

const ProgressBar = ({ current, total, results }) => {
    const progress = (current / total) * 100;

    return (
        <div className="w-full space-y-2 mb-6 px-1">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-tg-hint">Progress</span>
                    <span className="text-sm font-black text-tg-text">
                        Question {current} <span className="text-tg-hint font-normal text-xs">of {total}</span>
                    </span>
                </div>
                <div className="flex gap-2 text-[10px] font-bold">
                    <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                        {results.filter(r => r.status === 'Correct').length}
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                        {results.filter(r => r.status === 'Wrong').length}
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-tg-secondary text-tg-hint border border-tg-hint/20">
                        {results.filter(r => r.status === 'Not Attempted').length}
                    </div>
                </div>
            </div>

            <div className="relative h-2 w-full bg-tg-secondary rounded-full overflow-hidden shadow-inner border border-white/5">
                <div
                    className="absolute top-0 left-0 h-full bg-tg-button transition-all duration-500 ease-out shadow-[0_0_8px_rgba(var(--tg-theme-button-color),0.5)]"
                    style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex">
                    {Array.from({ length: total }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-tg-bg/20 last:border-0" />
                    ))}
                </div>
            </div>
        </div>
    );
};

ProgressBar.propTypes = {
    current: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    results: PropTypes.arrayOf(PropTypes.shape({
        status: PropTypes.string.isRequired
    })).isRequired
};

export default ProgressBar;
