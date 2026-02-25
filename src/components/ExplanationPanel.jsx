import React, { useState, useEffect, useRef } from 'react';
import { validateQuestion } from '../utils/groqApi';
// import './ExplanationPanel.css';
import { useTelegram } from '../hooks/useTelegram';

const ExplanationPanel = ({
    question,
    selectedAnswer,
    status,
    timeTaken,
    onNext
}) => {
    const optionLabels = ['A', 'B', 'C', 'D'];

    const getStatusInfo = () => {
        switch (status) {
            case 'Correct':
                return { emoji: '🎉', color: '#4caf50', text: 'Correct Answer!' };
            case 'Wrong':
                return { emoji: '❌', color: '#f44336', text: 'Wrong Answer' };
            case 'Not Attempted':
                return { emoji: '⏰', color: '#ff9800', text: 'Time Out!' };
            default:
                return { emoji: '❓', color: '#9e9e9e', text: 'Unknown' };
        }
    };

    const statusInfo = getStatusInfo();

    const { showHaptic } = useTelegram();

    return (
        <div className="w-full bg-tg-bg/80 backdrop-blur-xl border-t border-white/10 rounded-t-[32px] p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500 ease-out pointer-events-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-${statusInfo.color}-500/20 text-${statusInfo.color}-500`}>
                        {statusInfo.emoji}
                    </div>
                    <div>
                        <h3 className={`text-lg font-black text-${statusInfo.color}-500 leading-none`}>{statusInfo.text}</h3>
                        {status !== 'Not Attempted' && (
                            <span className="text-[10px] text-tg-hint font-bold uppercase tracking-wider">Time: {timeTaken.toFixed(1)}s</span>
                        )}
                    </div>
                </div>
                <button
                    className="px-6 py-3 bg-tg-button text-tg-button-text font-black rounded-2xl active:scale-95 transition-all text-sm shadow-lg shadow-tg-button/20"
                    onClick={() => { showHaptic('medium'); onNext(); }}
                >
                    Continue →
                </button>
            </div>

            <div className="space-y-4 mb-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl">
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest block mb-2">Answer</span>
                    <p className="text-sm font-bold text-tg-text">
                        {optionLabels[question.correctIndex]}. {question.options[question.correctIndex]}
                    </p>
                </div>

                {status === 'Wrong' && (
                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Your Selection</span>
                        <p className="text-sm font-medium text-tg-text/80">
                            {optionLabels[selectedAnswer]}. {question.options[selectedAnswer]}
                        </p>
                    </div>
                )}

                <div className="p-6 bg-tg-secondary/50 rounded-2xl">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-tg-hint uppercase tracking-widest mb-3">
                        <span className="text-sm">📖</span> Insights
                    </h4>
                    <p className="text-sm leading-relaxed text-tg-text/90 italic">
                        {question.explanation}
                    </p>
                </div>
            </div>

            <div className="w-12 h-1.5 bg-tg-secondary rounded-full mx-auto mt-4" />
        </div>
    );
};

export default ExplanationPanel;
