import React, { useState } from 'react';
import { calculateAnalytics, detectWeakAreas } from '../utils/analytics';
import { generateReport, downloadReport } from '../utils/reportGenerator';
import { getTopicLog, extractKeywords } from '../utils/attemptLog';
// import './SessionSummary.css';
import { useTelegram } from '../hooks/useTelegram';

const SessionSummary = ({
    results,
    questions,
    topic,
    topicId,
    startTime,
    onRestart,
    onRetryWrong,
    onGoHome
}) => {
    const { showHaptic, tg } = useTelegram();

    const handleShare = () => {
        showHaptic('impact');
        const text = `🎯 I scored ${analytics.accuracy}% in ${topic} on ITI TO Quiz!\n✅ ${analytics.correct} Correct\n❌ ${analytics.wrong} Wrong\n⏱️ Avg time: ${analytics.avgTime}s\n\nTry it now on Telegram!`;

        if (tg) {
            tg.showPopup({
                title: 'Share Score',
                message: 'Do you want to share your achievement?',
                buttons: [
                    { id: 'share', type: 'default', text: 'Share to Chat' },
                    { id: 'close', type: 'destructive', text: 'Close' }
                ]
            }, (btnId) => {
                if (btnId === 'share') {
                    tg.switchInlineQuery(text, ['users', 'chats', 'groups', 'channels']);
                }
            });
        } else {
            // Fallback for browser
            navigator.share?.({ title: 'My Quiz Score', text }).catch(() => {
                navigator.clipboard.writeText(text);
                alert('Score copied to clipboard!');
            });
        }
    };

    const [copied, setCopied] = useState(false);
    const analytics = calculateAnalytics(results);
    const weakAreas = detectWeakAreas(results, questions);
    const endTime = Date.now();
    const topicLog = getTopicLog(topicId);
    const attemptNumber = topicLog ? topicLog.attempts : 1;

    const wrongQuestionIds = results.filter(r => r.status === 'Wrong' || r.status === 'Not Attempted').map(r => r.questionId);
    const wrongQuestions = questions.filter(q => wrongQuestionIds.includes(q.id));

    const revisionKeywords = [];
    const seenKw = new Set();
    for (const q of wrongQuestions) {
        const kws = extractKeywords(q.question);
        for (const kw of kws) {
            const lower = kw.toLowerCase();
            if (!seenKw.has(lower)) { seenKw.add(lower); revisionKeywords.push(kw); }
        }
    }

    const handleCopyKeywords = () => {
        navigator.clipboard.writeText(revisionKeywords.join(', ')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const getGrade = () => {
        if (analytics.accuracy >= 90) return { grade: 'A+', emoji: '🏆', color: 'green' };
        if (analytics.accuracy >= 80) return { grade: 'A', emoji: '🌟', color: 'green' };
        if (analytics.accuracy >= 70) return { grade: 'B', emoji: '👍', color: 'blue' };
        if (analytics.accuracy >= 60) return { grade: 'C', emoji: '📈', color: 'orange' };
        if (analytics.accuracy >= 50) return { grade: 'D', emoji: '💪', color: 'orange' };
        return { grade: 'F', emoji: '📚', color: 'red' };
    };

    const grade = getGrade();
    const wrongCount = results.filter(r => r.status === 'Wrong').length;
    const notAttemptedCount = results.filter(r => r.status === 'Not Attempted').length;

    return (
        <div className="flex flex-col gap-6 p-4 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <div className="flex flex-col items-center text-center py-6">
                <div className="w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center mb-4 shadow-xl shadow-tg-button/10 bg-tg-secondary/30 relative"
                    style={{ borderColor: `var(--tg-theme-button-color, #2481cc)` }}>
                    <span className="text-4xl font-black text-tg-button">{analytics.accuracy}%</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-tg-hint">Accuracy</span>
                    <div className="absolute -top-4 -right-2 w-12 h-12 bg-tg-bg rounded-full flex items-center justify-center text-2xl shadow-md border border-white/10">
                        {grade.emoji}
                    </div>
                </div>
                <h1 className="text-2xl font-black text-tg-text">{topic}</h1>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-tg-hint mt-2">Attempt #{attemptNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-tg-secondary/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-tg-hint uppercase block mb-1">Time Stats</span>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-tg-hint">Avg</span>
                            <span className="text-tg-text">{analytics.avgTime}s</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-tg-hint">Fastest</span>
                            <span className="text-green-500">{analytics.fastestTime}s</span>
                        </div>
                    </div>
                </div>
                <div className="bg-tg-secondary/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-tg-hint uppercase block mb-1">Results</span>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-tg-hint">Correct</span>
                            <span className="text-green-500">{analytics.correct}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-tg-hint">Wrong</span>
                            <span className="text-red-500">{analytics.wrong}</span>
                        </div>
                    </div>
                </div>
            </div>

            {revisionKeywords.length > 0 && (
                <div className="p-5 bg-tg-button/5 border border-tg-button/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black text-tg-hint uppercase tracking-widest">📝 Revision Deck</h3>
                        <button className="text-[10px] font-bold text-tg-button uppercase" onClick={handleCopyKeywords}>
                            {copied ? '✅ Done' : '📋 Copy'}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {revisionKeywords.map((kw, i) => (
                            <span key={i} className="px-3 py-1 bg-tg-bg/50 border border-white/5 rounded-full text-xs font-medium text-tg-text/80">
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button className="w-full py-4 bg-tg-button text-tg-button-text font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    onClick={handleShare}>
                    <span>🚀</span> Share Achievement
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button className="py-4 bg-tg-secondary font-bold rounded-2xl active:scale-[0.98] transition-all text-sm"
                        onClick={() => { showHaptic('selection'); onRestart(); }}>
                        🔁 Try Again
                    </button>
                    <button className="py-4 bg-tg-secondary font-bold rounded-2xl active:scale-[0.98] transition-all text-sm"
                        onClick={() => { showHaptic('light'); onGoHome(); }}>
                        🏠 Home
                    </button>
                </div>

                {wrongQuestions.length > 0 && (
                    <button className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-black rounded-2xl active:scale-[0.98] transition-all text-sm"
                        onClick={() => { showHaptic('impact'); onRetryWrong(); }}>
                        🔄 Focus Wrong Questions ({wrongQuestions.length})
                    </button>
                )}
            </div>

            {weakAreas.length > 0 && (
                <div className="mt-4 space-y-3">
                    <h3 className="px-2 text-[10px] font-black text-tg-hint uppercase tracking-widest">⚠️ Needs Focus</h3>
                    {weakAreas.map((area, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <span className="text-sm font-bold truncate pr-4">{area.topic}</span>
                            <span className="text-sm font-black text-red-500 shrink-0">{area.accuracy}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SessionSummary;
