import React, { useEffect } from 'react';
// import './Timer.css';

const Timer = ({ timeLeft, maxTime = 15, isPaused = false }) => {
    const percentage = (timeLeft / maxTime) * 100;
    const isWarning = timeLeft <= 3;
    const isCritical = timeLeft <= 1;
    const flooredTimeLeft = Math.floor(timeLeft);

    // Play warning sound
    useEffect(() => {
        if (isWarning && timeLeft > 0 && timeLeft <= 3 && flooredTimeLeft === timeLeft && !isPaused) {
            // Beep sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = isCritical ? 800 : 600;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        }
    }, [flooredTimeLeft, isWarning, isCritical, isPaused, timeLeft]);

    return (
        <div className={`relative flex items-center justify-center w-20 h-20 transition-all duration-300 ${isPaused ? 'opacity-50 scale-90' : ''}`}>
            {/* Background Glow */}
            <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-20 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-tg-button'}`} />

            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                    className="text-tg-secondary stroke-current"
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    strokeWidth="8"
                />
                {/* Progress Bar */}
                <circle
                    className={`stroke-current transition-all duration-1000 ease-linear ${isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-tg-button'}`}
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="276.46"
                    strokeDashoffset={276.46 * (1 - percentage / 100)}
                />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isPaused ? (
                    <span className="text-xl animate-pulse">⏸️</span>
                ) : (
                    <>
                        <span className={`text-2xl font-black leading-none tracking-tighter transition-colors ${isCritical ? 'text-red-500 animate-pulse' : 'text-tg-text'}`}>
                            {Math.ceil(timeLeft)}
                        </span>
                        <span className="text-[8px] uppercase font-bold text-tg-hint -mt-0.5">sec</span>
                    </>
                )}
            </div>

            {/* Warning Overlay for Critical State */}
            {isCritical && !isPaused && (
                <div className="absolute -inset-2 bg-red-500/10 rounded-full animate-ping pointer-events-none" />
            )}
        </div>
    );
};

export default Timer;
